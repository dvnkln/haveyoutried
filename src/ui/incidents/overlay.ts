import { INCIDENTS, type IncidentId } from '../../config';
import { DONE_LABELS, INCIDENT_TEXT, TAKE_LABELS } from '../../content/incidents';
import { bus } from '../../core/bus';
import { rates } from '../../core/economy';
import { endIncident, isSolved, resolveIncident } from '../../core/incidents';
import { pick } from '../../util';
import type { AppContext } from '../app';
import { h, setText } from '../dom';
import { describeEffect } from '../pager';
import { raidGame } from './raid';
import { servicesGame } from './services';
import { spamGame } from './spam';
import { logGrepGame } from './loggrep';
import { networkGame } from './network';
import { patchGame } from './patch';
import type { Minigame } from './types';

const GAMES: Record<IncidentId, () => Minigame> = {
  raid: raidGame,
  spam: spamGame,
  services: servicesGame,
  loggrep: logGrepGame,
  network: networkGame,
  patch: patchGame,
};

const p2 = (n: number) => String(n).padStart(2, '0');

type RowState = 'crit' | 'warn' | 'ok' | 'esc';
const STATE_LABEL: Record<RowState, string> = { crit: 'CRITICAL', warn: 'WARNING', ok: 'OK', esc: 'ESCALATED' };

/** Eine Zeile der Service-Liste: Status-Badge, Host/Service, Dauer, Plugin-Ausgabe */
const monRow = (state: RowState, host: string, service: string, output: string, since: string, main = false) =>
  h('div', { class: `mon-row s-${state}${main ? ' main' : ''}` }, [
    h('span', { class: 'mon-state' }, [h('b', { text: STATE_LABEL[state] }), h('small', { text: since })]),
    h('span', { class: 'mon-what' }, [
      h('span', { class: 'mon-svc' }, [h('b', { text: service }), ` auf ${host}`]),
      h('span', { class: 'mon-out', text: output }),
    ]),
  ]);

/** Zähler oben: so sehen Monitoring-Startseiten immer aus */
const summary = (crit: number, warn: number) =>
  h('div', { class: 'mon-summary' }, [
    h('span', { class: `mon-chip s-crit${crit ? '' : ' zero'}`, text: `${crit} Critical` }),
    h('span', { class: 'mon-chip s-warn', text: `${warn} Warning` }),
    h('span', { class: 'mon-chip s-ok', text: '147 OK' }),
    h('span', { class: 'mon-chip s-unk', text: '1 Unknown (seit 2019)' }),
  ]);

/**
 * Vollbild-Overlay für Incidents: Monitoring-Alarm (Vorwarnung) → Minispiel → RECOVERY.
 * Eigene rAF-Schleife: pausiert mit dem Tab, damit Hintergrundzeit nicht zählt.
 */
export function mountIncidentOverlay(ctx: AppContext): void {
  // Läuft direkt im Röhrenmonitor auf dem Tisch: Monitoring-Oberfläche füllt den Bildschirm, der Rest wird dunkel
  const clock = h('span', { class: 'mon-clock' });
  const body = h('div', { class: 'mon-body' });
  const root = h('div', { class: 'incident', hidden: '', role: 'alertdialog', 'aria-modal': 'true' }, [
    h('div', { class: 'mon-top' }, [
      h('span', { class: 'mon-logo', text: 'nag' }),
      h('span', { class: 'mon-logo-2', text: 'mon' }),
      h('span', { class: 'mon-nav', text: 'Probleme' }),
      clock,
      h('span', { class: 'mon-user', text: 'you' }),
    ]),
    body,
  ]);
  const tickClock = () => {
    const d = new Date();
    setText(clock, `${p2(d.getHours())}:${p2(d.getMinutes())}`);
  };
  /** Inhalt im Monitor tauschen (Alarm → Spiel → Ergebnis) */
  const screen = (state: 'crit' | 'ok' | 'esc', ...children: HTMLElement[]) => {
    root.dataset.state = state;
    body.replaceChildren(...children);
    body.scrollTop = 0;
  };
  const app = document.getElementById('app');
  const spot = h('div', { class: 'inc-spot', 'aria-hidden': 'true' });
  /** Alarm und Ergebnis im Monitor (Rest abgedunkelt), das Spiel selbst bildschirmfüllend */
  const inMonitor = (on: boolean) => {
    const screenEl = document.querySelector<HTMLElement>('#app .screen');
    if (on && screenEl) {
      // wie ein Programm, das auf Vollbild geht: wächst aus dem offenen Fenster heraus
      const from = screenEl.querySelector<HTMLElement>('.work')?.getBoundingClientRect();
      const to = screenEl.getBoundingClientRect();
      if (from && to.width && to.height) {
        root.style.setProperty('--max-x', `${from.left - to.left}px`);
        root.style.setProperty('--max-y', `${from.top - to.top}px`);
        root.style.setProperty('--max-sx', (from.width / to.width).toFixed(3));
        root.style.setProperty('--max-sy', (from.height / to.height).toFixed(3));
      }
      if (root.parentElement !== screenEl) screenEl.append(root);
      document.body.append(spot);
      placeSpot();
    } else {
      if (root.parentElement !== document.body) document.body.append(root);
      spot.remove();
    }
  };
  /** ausgespart wird der ganze Monitor samt Gehäuse: der Bildschirm bleibt Teil des Geräts */
  const placeSpot = () => {
    const r = root.parentElement?.closest('.monitor')?.getBoundingClientRect();
    if (!r || root.hidden) return;
    Object.assign(spot.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  };
  window.addEventListener('resize', placeSpot);
  /** alles außer dem Monitor-Bildschirm stilllegen */
  let frozen: HTMLElement[] = [];
  // Uhr läuft mit, solange der Monitor nagmon zeigt
  let clockTimer = 0;
  const show = () => {
    tickClock();
    clearInterval(clockTimer);
    clockTimer = window.setInterval(tickClock, 5_000);
    // offenes App-Fenster zu, sonst verdeckt es den Monitor
    const sheet = document.querySelector<HTMLElement>('.sheet');
    if (sheet && !sheet.hidden) document.querySelector<HTMLElement>('.sheet-close')?.click();
    inMonitor(true);
    root.hidden = false;
    frozen = [];
    // vom Bildschirm aus nach oben: jeweils die Geschwister stilllegen
    for (let el: HTMLElement | null = root; el && el !== app && el.parentElement; el = el.parentElement) {
      for (const sib of el.parentElement.children) {
        if (sib !== el && sib instanceof HTMLElement && !sib.inert) {
          sib.inert = true;
          frozen.push(sib);
        }
      }
    }
    app?.classList.add('incident-on');
    placeSpot();
  };
  const hide = () => {
    clearInterval(clockTimer);
    root.hidden = true;
    body.replaceChildren();
    for (const el of frozen) el.inert = false;
    frozen = [];
    app?.classList.remove('incident-on');
    spot.remove();
  };

  const run = (id: IncidentId) => {
    const text = INCIDENT_TEXT[id];
    const game = GAMES[id]();
    const duration = INCIDENTS.games[id].durationMs;

    // --- Phase 1: Monitoring-Alarm, wartet auf manuelles Übernehmen ---
    const take = h('button', { class: 'btn btn-danger nag-ack nag-take', type: 'button', text: pick(TAKE_LABELS), disabled: '' });
    const alert = h('div', { class: 'mon-page mon-compact' }, [
      summary(1, 2),
      h('div', { class: 'mon-table' }, [monRow('crit', text.host, text.service, text.info, '0m 03s', true)]),
      h('div', { class: 'mon-detail' }, [
        h('div', { class: 'nag-title', text: `** PROBLEM: ${text.host}/${text.service} is CRITICAL **` }),
        h('div', { class: 'nag-assign', text: 'Assigned to: you' }),
        h('div', { class: 'nag-task' }, [h('span', { class: 'nag-key', text: 'Aufgabe: ' }), text.goal]),
        take,
      ]),
    ]);
    root.classList.remove('playing');
    screen('crit', alert);
    show();
    ctx.sfx.alarm();
    ctx.haptic('milestone');
    // Button erst nach kurzer Sperre aktiv (gegen Fehlgriffe beim Dauertippen)
    setTimeout(() => (take.disabled = false), INCIDENTS.ackArmMs);
    // Alarm wiederholen, bis jemand übernimmt
    const nag = setInterval(() => {
      if (!document.hidden) ctx.sfx.alarm();
    }, INCIDENTS.alarmRepeatMs);

    let phase: 'warn' | 'ready' | 'play' | 'done' = 'warn';
    let readyLeft = 0;
    let lastCount = -1;
    const readyEl = h('div', { class: 'inc-ready', 'aria-live': 'assertive' });
    let elapsed = 0;
    let penalty = 0;
    let finished = false;
    let last = performance.now();

    // --- Phase 2: Spiel ---
    const bar = h('div', { class: 'inc-bar' }, [h('div', { class: 'inc-bar-fill' })]);
    const status = h('div', { class: 'inc-status' });
    const stage = h('div', { class: 'inc-stage' });
    const gameRoot = h('div', { class: 'inc-game-root' });
    stage.append(gameRoot);
    /** Spielfeld passt sich dem Monitor an: zu hohe Spiele werden verkleinert statt den Monitor zu strecken */
    const fit = () => {
      if (!gameRoot.isConnected) return;
      gameRoot.style.zoom = '';
      // mehrfach messen: gestreckte Flex-Inhalte ändern ihre Höhe mit dem Zoom
      let z = 1;
      for (let i = 0; i < 4; i++) {
        const need = gameRoot.scrollHeight;
        const avail = gameRoot.clientHeight;
        if (need <= avail + 1) break;
        z = Math.max(0.45, z * (avail / need) * 0.99);
        gameRoot.style.zoom = String(z);
      }
    };
    window.addEventListener('resize', fit);
    const startGame = () => {
      clearInterval(nag);
      elapsed = 0;
      // erst Countdown: Spielfeld sichtbar, aber eingefroren
      phase = 'ready';
      readyLeft = INCIDENTS.readyMs;
      root.classList.add('playing');
      inMonitor(false);
      screen(
        'crit',
        h('div', { class: 'inc-game' }, [
          h('div', { class: 'inc-head' }, [
            h('span', { class: 'inc-tag', text: 'CRITICAL' }),
            h('span', { class: 'inc-name', text: `${text.host}/${text.service}` }),
            h('span', { class: 'inc-ack', text: 'ACK' }),
          ]),
          bar,
          status,
          h('div', { class: 'inc-goal', text: text.goal }),
          stage,
        ]),
      );
      stage.append(readyEl);
      // eingefroren: auch Tastatur sperren, nicht nur Touch
      gameRoot.inert = true;
      game.mount(gameRoot, {
        finish: () => (finished = true),
        penalize: (ms) => (penalty += ms),
        sfx: ctx.sfx,
        haptic: ctx.haptic,
      });
      requestAnimationFrame(fit);
      // nach Schriftladen und Countdown noch einmal
      setTimeout(fit, 400);
      setTimeout(fit, INCIDENTS.readyMs + 100);
    };

    // --- Phase 3: RECOVERY ---
    const finish = () => {
      phase = 'done';
      root.classList.remove('playing');
      inMonitor(true);
      const score = game.score();
      const results = resolveIncident(ctx.state, id, score, rates(ctx.state));
      const good = isSolved(score);
      const ack = h('button', { class: 'btn btn-primary nag-ack nag-close', type: 'button', text: pick(good ? DONE_LABELS.good : DONE_LABELS.bad), disabled: '' });
      setTimeout(() => (ack.disabled = false), 600);
      ack.addEventListener('click', () => {
        window.removeEventListener('resize', fit);
        ctx.sfx.tick();
        hide();
        endIncident();
      });
      const pct = Math.round(score * 100);
      screen(
        good ? 'ok' : 'esc',
        h('div', { class: 'mon-page mon-compact' }, [
          summary(good ? 0 : 1, 2),
          h('div', { class: 'mon-table' }, [
            monRow(good ? 'ok' : 'esc', text.host, text.service, good ? text.okInfo : 'eskaliert an: Kollege', good ? '0m 01s' : '0m 00s', true),
          ]),
          h('div', { class: `mon-detail ${good ? 'nag-recovery' : 'nag-problem'}` }, [
            h('div', {
              class: 'nag-title',
              text: good
                ? `** RECOVERY: ${text.host}/${text.service} is OK **`
                : `** ESCALATION: ${text.host}/${text.service} → Kollege **`,
            }),
            h('div', { class: 'mon-perf' }, [
              h('span', { class: 'nag-key', text: 'Leistung' }),
              h('span', { class: 'mon-perf-bar' }, [h('span', { class: 'mon-perf-fill', style: `width:${pct}%` })]),
              h('b', { text: `${pct} %` }),
            ]),
            h('p', { class: 'nag-comment', text: pick(good ? text.good : text.bad) }),
            ...results.map((r) => h('div', { class: `effect-line mood-${r.mood}`, text: describeEffect(r) })),
            ack,
          ]),
        ]),
      );
      if (good) ctx.sfx.good();
      else ctx.sfx.error();
    };

    const frame = (t: number) => {
      // Hintergrund-Tab: rAF pausiert, große Sprünge nicht mitzählen
      const dt = Math.min(100, Math.max(0, t - last));
      last = t;
      if (phase === 'warn') {
        /* wartet auf „Übernehmen“ */
      } else if (phase === 'ready') {
        readyLeft -= dt;
        const n = Math.ceil(readyLeft / 1_000);
        if (n !== lastCount) {
          lastCount = n;
          setText(readyEl, n > 0 ? String(n) : 'Los!');
          if (n > 0) ctx.sfx.tick();
          else ctx.sfx.unlockPing();
        }
        setText(status, game.status());
        if (readyLeft <= 0) {
          phase = 'play';
          gameRoot.inert = false;
          setTimeout(() => readyEl.remove(), 350);
          readyEl.classList.add('go');
        }
      } else if (phase === 'play') {
        elapsed += dt;
        game.update(dt);
        const used = elapsed + penalty;
        (bar.firstElementChild as HTMLElement).style.transform = `scaleX(${Math.max(0, 1 - used / duration)})`;
        setText(status, game.status());
        if (finished || used >= duration) finish();
      }
      if (phase !== 'done') requestAnimationFrame(frame);
    };
    take.addEventListener('click', () => {
      ctx.sfx.tick();
      startGame();
      last = performance.now();
      requestAnimationFrame(frame);
    });
  };

  bus.on('incidentStart', ({ id }) => {
    // nicht über einen offenen Dialog legen: warten, bis er zu ist
    const tryStart = () => {
      if (document.querySelector('dialog[open]')) setTimeout(tryStart, 500);
      else run(id);
    };
    tryStart();
  });
}
