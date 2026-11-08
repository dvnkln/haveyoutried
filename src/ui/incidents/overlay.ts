import { INCIDENTS, type IncidentId } from '../../config';
import { DONE_LABELS, INCIDENT_TEXT, TAKE_LABELS } from '../../content/incidents';
import { bus } from '../../core/bus';
import { rates } from '../../core/economy';
import { isIncidentId, resolveIncident } from '../../core/incidents';
import { pick } from '../../util';
import type { AppContext } from '../app';
import { h, setText } from '../dom';
import { describeEffect } from '../pager';
import { raidGame } from './raid';
import { servicesGame } from './services';
import { spamGame } from './spam';
import type { Minigame } from './types';

const GAMES: Record<IncidentId, () => Minigame> = {
  raid: raidGame,
  spam: spamGame,
  services: servicesGame,
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** Datum wie in Nagios/Icinga-Mails: „Sun Nov 8 09:41:03 CET 2026“ */
function nagiosDate(d = new Date()): string {
  const tz = d.getTimezoneOffset() === -60 ? 'CET' : d.getTimezoneOffset() === -120 ? 'CEST' : 'UTC';
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${tz} ${d.getFullYear()}`;
}

const line = (label: string, value: string, cls = '') =>
  h('div', { class: `nag-line ${cls}`.trim() }, [h('span', { class: 'nag-key', text: `${label}:` }), ` ${value}`]);

/**
 * Vollbild-Overlay für Incidents: Monitoring-Alarm (Vorwarnung) → Minispiel → RECOVERY.
 * Eigene rAF-Schleife: pausiert mit dem Tab, damit Hintergrundzeit nicht zählt.
 */
export function mountIncidentOverlay(ctx: AppContext): void {
  const root = h('div', { class: 'incident', hidden: '', role: 'alertdialog', 'aria-modal': 'true' });
  document.body.append(root);

  const run = (id: IncidentId) => {
    const text = INCIDENT_TEXT[id];
    const game = GAMES[id]();
    const duration = INCIDENTS.games[id].durationMs;

    // --- Phase 1: Monitoring-Alarm, wartet auf manuelles Übernehmen ---
    const take = h('button', { class: 'btn btn-danger nag-ack nag-take', type: 'button', text: pick(TAKE_LABELS), disabled: '' });
    const alert = h('div', { class: 'nag-card nag-problem' }, [
      h('div', { class: 'nag-title', text: `** PROBLEM Service Alert: ${text.host}/${text.service} is CRITICAL **` }),
      line('Notification Type', 'PROBLEM'),
      line('Host', text.host),
      line('Service', text.service),
      line('State', 'CRITICAL', 'nag-crit'),
      line('Info', text.info),
      line('Date/Time', nagiosDate()),
      h('div', { class: 'nag-assign', text: 'Assigned to: you' }),
      h('div', { class: 'nag-task' }, [h('span', { class: 'nag-key', text: 'Aufgabe: ' }), text.goal]),
      take,
    ]);
    root.classList.remove('playing');
    root.replaceChildren(alert);
    root.hidden = false;
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
    const startGame = () => {
      clearInterval(nag);
      elapsed = 0;
      // erst Countdown: Spielfeld sichtbar, aber eingefroren
      phase = 'ready';
      readyLeft = INCIDENTS.readyMs;
      root.classList.add('playing');
      root.replaceChildren(
        h('div', { class: 'inc-game' }, [
          h('div', { class: 'inc-head' }, [
            h('span', { class: 'inc-tag', text: 'CRITICAL' }),
            h('span', { class: 'inc-name', text: `${text.host}/${text.service}` }),
          ]),
          bar,
          status,
          h('div', { class: 'inc-goal', text: text.goal }),
          stage,
        ]),
      );
      stage.append(readyEl);
      game.mount(stage, {
        finish: () => (finished = true),
        penalize: (ms) => (penalty += ms),
        sfx: ctx.sfx,
        haptic: ctx.haptic,
      });
    };

    // --- Phase 3: RECOVERY ---
    const finish = () => {
      phase = 'done';
      root.classList.remove('playing');
      const score = game.score();
      const results = resolveIncident(ctx.state, id, score, rates(ctx.state));
      const good = score >= 0.4;
      const ack = h('button', { class: 'btn btn-primary nag-ack nag-close', type: 'button', text: pick(good ? DONE_LABELS.good : DONE_LABELS.bad), disabled: '' });
      setTimeout(() => (ack.disabled = false), 600);
      ack.addEventListener('click', () => {
        ctx.sfx.tick();
        root.hidden = true;
        root.replaceChildren();
      });
      root.replaceChildren(
        h('div', { class: `nag-card ${good ? 'nag-recovery' : 'nag-problem'}` }, [
          h('div', {
            class: 'nag-title',
            text: good
              ? `** RECOVERY Service Alert: ${text.host}/${text.service} is OK **`
              : `** ESCALATION: ${text.host}/${text.service} – assigned to: Kollege **`,
          }),
          line('Notification Type', good ? 'RECOVERY' : 'ESCALATION'),
          line('State', good ? 'OK' : 'CRITICAL (Kollege kümmert sich)', good ? 'nag-ok' : 'nag-crit'),
          line('Info', good ? text.okInfo : text.info),
          line('Leistung', `${Math.round(score * 100)} %`),
          h('p', { class: 'nag-comment', text: pick(good ? text.good : text.bad) }),
          ...results.map((r) => h('div', { class: `effect-line mood-${r.mood}`, text: describeEffect(r) })),
          ack,
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
    });
    requestAnimationFrame(frame);
  };

  bus.on('incidentStart', ({ id }) => {
    if (!isIncidentId(id)) return;
    // nicht über einen offenen Dialog legen: warten, bis er zu ist
    const tryStart = () => {
      if (document.querySelector('dialog[open]')) setTimeout(tryStart, 500);
      else run(id);
    };
    tryStart();
  });
}
