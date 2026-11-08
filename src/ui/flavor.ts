import { CONFIG, GENERATORS } from '../config';
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
import { bus } from '../core/bus';
import { availableUpgrades, isUnlocked } from '../core/economy';
import type { GameState } from '../core/state';
import { pick, randInt } from '../util';
import type { App, AppContext } from './app';

/** Verbindet Spielereignisse mit Syslog, Sound und Haptik und streut Ambient-Rauschen ein. */
export function startFlavor(ctx: AppContext, app: App): void {
  const { state, log, sfx, haptic } = ctx;

  bus.on('buy', ({ id, owned }) => {
    log.write('info', pick(GENERATOR_TEXT[id].buyLog), { n: owned });
    sfx.buy();
  });

  bus.on('upgrade', ({ id }) => {
    log.template(pick(UPGRADE_BUY_LINES), { name: UPGRADE_TEXT[id]?.name ?? id });
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
      sfx.milestone();
      haptic('milestone');
    }
  });

  bus.on('eventIncoming', ({ id }) => {
    log.write('crit', `pager[911]: ALERT: ${eventDef(id)?.title ?? id}`);
    sfx.pager();
    haptic('unlock');
  });

  bus.on('eventResolved', (res) => {
    if (res.option < 0) log.write('warn', 'pager[911]: no ack within 45s. escalated to: nobody.');
    log.write(res.mood === 'bad' ? 'warn' : 'info', `pager[911]: ${res.outcome.text}`);
    if (res.outcome.log) log.template(res.outcome.log);
    if (res.mood === 'good') sfx.good();
    else if (res.mood === 'bad') sfx.error();
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
      const total = running.reduce((sum, g) => sum + state.generators[g.id].owned, 0);
      let x = Math.random() * total;
      const g = running.find((g) => (x -= state.generators[g.id].owned) < 0) ?? running[0]!;
      log.write('info', pick(GENERATOR_TEXT[g.id].ambient));
    } else if (r < 0.52) {
      log.write('info', `bofh[666]: excuse of the day: ${pick(BOFH_EXCUSES)}`);
    } else {
      log.template(pick(AMBIENT));
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
  const seenGen = new Set(GENERATORS.filter((g) => isUnlocked(state, g.id)).map((g) => g.id));
  const seenUpg = new Set(availableUpgrades(state).map((u) => u.id));
  for (const id of Object.keys(state.upgrades)) seenUpg.add(id);

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
