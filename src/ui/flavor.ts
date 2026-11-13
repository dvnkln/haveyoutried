import { CONFIG, GENERATORS } from '../config';
import { fresh } from '../core/deck';
import { GENERATOR_TEXT } from '../content/generators';
import {
  AMBIENT,
  BOFH_EXCUSES,
  GENERATOR_UNLOCK_LINE,
  MILESTONE_FALLBACK,
  UPGRADE_AVAILABLE_LINE,
  UPGRADE_BUY_LINES,
} from '../content/syslog';
import { UPGRADE_TEXT } from '../content/upgrades';
import { BUFF_LABELS } from '../content/events';
import { eventDef } from '../core/events';
import { INCIDENT_TEXT } from '../content/incidents';
import { isSolved } from '../core/incidents';
import { ACHIEVEMENTS } from '../content/achievements';
import { checkAchievements } from '../core/achievements';
import { companyOf } from '../content/companies';
import { osOf } from '../content/systems';
import { activeOs, markAnnounced, unannouncedOs } from '../core/os';
import type { OsId } from '../content/systems';
import { ACHIEVEMENTS_CFG } from '../config';
import { bus } from '../core/bus';
import { BOSS_DONE, BOSS_FAILED } from '../content/boss';
import { formatNumber } from './format';
import { availableUpgrades, isUnlocked } from '../core/economy';
import type { GameState } from '../core/state';
import { randInt, weightedPick } from '../util';
import type { App, AppContext } from './app';
import { nextAlarmId } from './history';
import { describeEffect } from './pager';

/** Ab so vielen gleichzeitig freigeschalteten Achievements gibt es nur eine Sammelmeldung. */
const BULK_ACHIEVEMENTS = 3;

/** Verbindet Spielereignisse mit Syslog, Ticketverlauf, Sound und Haptik und streut Ambient-Rauschen ein. */
export function startFlavor(ctx: AppContext, app: App): void {
  const { state, log, history, sfx, haptic } = ctx;

  bus.on('buy', ({ id, owned }) => {
    log.write('info', fresh(`buyLog:${id}`, GENERATOR_TEXT[id].buyLog), { n: owned });
    sfx.buy();
  });

  bus.on('upgrade', ({ id }) => {
    log.template(fresh('UPGRADE_BUY_LINES', UPGRADE_BUY_LINES), { name: UPGRADE_TEXT[id]?.name ?? id });
    sfx.upgrade();
    app.popCounter();
  });

  bus.on('milestone', ({ id, owned }) => {
    const text = GENERATOR_TEXT[id];
    const line = text.milestones[owned];
    if (line) log.write('ok', line);
    else log.template(MILESTONE_FALLBACK(text.name, owned));
    if (owned > 1) {
      app.popCounter();
      sfx.register();
      haptic('milestone');
    }
  });

  bus.on('eventIncoming', ({ id }) => {
    log.write('crit', `pager[911]: ALERT: ${eventDef(id)?.title ?? id}`);
    sfx.pager();
    haptic('unlock');
  });

  bus.on('eventResolved', (res) => {
    if (res.option < 0) log.write('warn', `pager[911]: no ack within ${CONFIG.eventExpireMs / 1_000}s. escalated to: nobody.`);
    log.write(res.mood === 'bad' ? 'warn' : 'info', `pager[911]: ${res.outcome.text}`);
    if (res.outcome.log) log.template(res.outcome.log);
    const def = eventDef(res.eventId);
    const ignored = res.option < 0;
    history.add({
      id: nextAlarmId(),
      subject: def?.title ?? res.eventId,
      who: 'Pager',
      channel: 'Piepen, Vibrieren, Panik',
      prio: ignored ? 'war mal hoch' : 'sofort',
      status: ignored ? 'Eskaliert an: niemand' : res.mood === 'good' ? 'Gelöst' : res.mood === 'bad' ? 'Gelöst (irgendwie)' : 'Geschlossen',
      reply: ignored ? undefined : def?.options[res.option]?.label,
      replyLabel: 'Entscheidung',
      note: ignored ? `Kein ACK innerhalb von ${CONFIG.eventExpireMs / 1_000} s. Ich war „kurz Kaffee holen“.` : res.outcome.text,
      solution: describeEffect(res),
    });
    if (res.mood === 'good') sfx.pagerAck();
    else if (res.mood === 'bad') sfx.error();
  });

  // Incidents: Log im Icinga-Format (host;service;state;type;attempt;output)
  bus.on('incidentStart', ({ id }) => {
    const t = INCIDENT_TEXT[id];
    log.write('crit', `icinga2[2342]: SERVICE ALERT: ${t.host};${t.service};CRITICAL;HARD;3;${t.info}`);
  });
  bus.on('incidentResolved', ({ id, score, results, abandoned, comment }) => {
    const t = INCIDENT_TEXT[id];
    const solved = !abandoned && isSolved(score);
    const effects = results.map(describeEffect).join(', ');
    history.add({
      id: nextAlarmId(),
      subject: `${t.host}/${t.service}: ${t.info}`,
      who: 'nagmon',
      channel: 'Monitoring',
      prio: 'CRITICAL',
      status: abandoned ? 'Eskaliert (Admin weg)' : solved ? 'Gelöst' : 'Eskaliert an: Kollege',
      note: abandoned ? 'Mitten im Incident weg gewesen. Der Kollege hat übernommen und erzählt es allen.' : comment ?? (solved ? fresh(`INCIDENT_TEXT:${id}:good`, t.good) : fresh(`INCIDENT_TEXT:${id}:bad`, t.bad)),
      solution: `${solved ? `RECOVERY: ${t.okInfo}` : 'Kollege hat übernommen. Und den Ruhm.'} (Leistung ${Math.round(score * 100)} %${effects ? `; ${effects}` : ''})`,
    });
    if (abandoned) {
      log.write('warn', `icinga2[2342]: SERVICE NOTIFICATION: kollege;${t.host};${t.service};CRITICAL;escalated (admin disconnected)`);
      log.write('info', 'helpdesk[1337]: du warst plötzlich weg. Der Kollege hat übernommen und erzählt es allen.');
    } else if (isSolved(score)) {
      log.write('ok', `icinga2[2342]: SERVICE ALERT: ${t.host};${t.service};OK;HARD;1;${t.okInfo}`);
    } else {
      log.write('warn', `icinga2[2342]: SERVICE NOTIFICATION: kollege;${t.host};${t.service};CRITICAL;escalated`);
    }
  });

  // Viele auf einmal (alter Spielstand, Kündigen): eine Sammelmeldung statt 30 Sounds und Toasts.
  const bulk: string[] = [];
  bus.on('achievement', ({ id, batch }) => {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (batch <= BULK_ACHIEVEMENTS) {
      if (!def) return;
      log.write('ok', `achievementd[777]: unlocked "${def.name}"`);
      app.toast(`Achievement: ${def.name}`, def.desc);
      sfx.achievement();
      haptic('milestone');
      return;
    }
    bulk.push(def?.name ?? id);
    if (bulk.length < batch) return;
    log.write('ok', `achievementd[777]: ${batch} achievements unlocked (backlog import): ${bulk.join(', ')}`);
    app.toast(`${batch} Achievements auf einmal`, 'Nachgetragen aus der Personalakte. Details im Karriere-Tab.');
    sfx.achievement();
    haptic('milestone');
    bulk.length = 0;
  });
  // Neue Betriebssysteme melden: nach dem Kündigen und beim Start (Look kam mit einem Update, alter Spielstand).
  // Als gemeldet gilt eins erst, wenn die Meldung wirklich erschienen ist (volle Schlange wirft alte raus)
  const queuedOs = new Set<OsId>();
  const announceOs = () => {
    for (const id of unannouncedOs(state)) {
      if (queuedOs.has(id)) continue;
      queuedOs.add(id);
      const name = osOf(id).name;
      const running = activeOs(state) === id;
      log.write('ok', `setup[1]: ${name} eingerichtet. Treiber: 3 von 11 gefunden, der Rest heißt „Standard-VGA“.`);
      app.toast(
        `Neues Betriebssystem: ${name}`,
        running ? 'Läuft hier schon. Bleibt dir für immer, umstellen unter System → Optik.' : 'Liegt für dich bereit. Umstellen unter System → Optik.',
        'os',
        () => {
          queuedOs.delete(id);
          markAnnounced(state, id);
        },
      );
    }
  };
  bus.on('jobQuit', ({ gained, company }) => {
    const c = companyOf(company);
    log.write('warn', `hr[201]: Kündigung eingegangen. Resturlaub: 0 Tage. Berufserfahrung +${gained}.`);
    log.write('info', `login[1]: welcome to ${c.host}. ${c.welcome}`);
    announceOs();
  });
  announceOs();
  // Uhrzeit-Achievements nur, wenn kürzlich geklickt wurde (nicht bei offenem Tab über Nacht)
  let lastClickAt = -Infinity;
  bus.on('click', () => {
    lastClickAt = performance.now();
  });
  setInterval(
    () => checkAchievements(state, new Date(), performance.now() - lastClickAt < ACHIEVEMENTS_CFG.activeWindowMs),
    ACHIEVEMENTS_CFG.checkMs,
  );

  // Aufgaben vom Chef: neue Aufgabe, geschafft, verpasst
  bus.on('bossTask', ({ text }) => {
    app.toast('Aufgabe vom Chef', text, 'boss');
    log.write('warn', `chef[1]: ${text}`);
    sfx.unlockPing();
  });
  bus.on('bossDone', ({ reward }) => {
    const line = fresh('BOSS_DONE', BOSS_DONE);
    app.toast(`Aufgabe erledigt: +${formatNumber(reward)} Tickets`, line, 'boss-done');
    log.write('ok', `chef[1]: Aufgabe erledigt. ${line}`);
    sfx.bossDone();
    haptic('milestone');
    app.popCounter();
  });
  bus.on('bossFailed', () => {
    const line = fresh('BOSS_FAILED', BOSS_FAILED);
    app.toast('Frist verpasst', line, 'boss-failed');
    log.write('info', `chef[1]: ${line}`);
  });

  bus.on('buffEnded', ({ id }) => {
    log.write('info', `helpdesk[1337]: ${BUFF_LABELS[id] ?? id} vorbei. Zurück zum Normalbetrieb.`);
  });

  watchUnlocks(state, (kind, name) => {
    log.template(kind === 'generator' ? GENERATOR_UNLOCK_LINE(name) : UPGRADE_AVAILABLE_LINE(name));
  }, () => {
    sfx.unlockPing();
    haptic('unlock');
  });

  const ambient = () => {
    const running = GENERATORS.filter((g) => state.generators[g.id].owned > 0);
    const r = Math.random();
    if (running.length > 0 && r < 0.4) {
      // gewichtet nach Bestand
      const g = weightedPick(running, (g) => state.generators[g.id].owned);
      log.write('info', fresh(`ambient:${g.id}`, GENERATOR_TEXT[g.id].ambient));
    } else if (r < 0.52) {
      log.write('info', `bofh[666]: excuse of the day: ${fresh('BOFH_EXCUSES', BOFH_EXCUSES)}`);
    } else {
      log.template(fresh('AMBIENT', AMBIENT));
    }
    setTimeout(ambient, randInt(CONFIG.ambientLogMinMs, CONFIG.ambientLogMaxMs));
  };
  setTimeout(ambient, randInt(CONFIG.ambientLogMinMs, CONFIG.ambientLogMaxMs));
}

/** Meldet neu sichtbare Generatoren und Upgrades (einmal pro Sitzung, nicht beim Start). */
function watchUnlocks(
  state: GameState,
  onItem: (kind: 'generator' | 'upgrade', name: string) => void,
  onAny: () => void,
): void {
  const seenGen = new Set<string>();
  const seenUpg = new Set<string>();
  const seed = () => {
    seenGen.clear();
    seenUpg.clear();
    for (const g of GENERATORS) if (isUnlocked(state, g.id)) seenGen.add(g.id);
    for (const u of availableUpgrades(state)) seenUpg.add(u.id);
    for (const id of Object.keys(state.upgrades)) seenUpg.add(id);
  };
  seed();
  // Nach dem Kündigen ist alles wieder gesperrt: neu freischalten soll wieder gemeldet werden
  bus.on('jobQuit', seed);

  setInterval(() => {
    let any = false;
    for (const g of GENERATORS) {
      if (!seenGen.has(g.id) && isUnlocked(state, g.id)) {
        seenGen.add(g.id);
        onItem('generator', GENERATOR_TEXT[g.id].name);
        any = true;
      }
    }
    for (const u of availableUpgrades(state)) {
      if (!seenUpg.has(u.id)) {
        seenUpg.add(u.id);
        onItem('upgrade', UPGRADE_TEXT[u.id]?.name ?? u.id);
        any = true;
      }
    }
    if (any) onAny();
  }, 500);
}
