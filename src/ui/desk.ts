import { CONFIG } from '../config';
import { CALLBACK_LINES, CALLERS, situationalCalls, type Call, type Line } from '../content/callers';
import { topicPool } from '../content/topics';
import { URGENT_LABELS, URGENT_TEXT } from '../content/events';
import { VIP_TICKETS } from '../content/work';
import { ALTF4_LINES, COMBO_LINES, PANIC_LINES } from '../content/props';
import { pressKey, solveTicket } from '../core/actions';
import { rates } from '../core/economy';
import { claimUrgent } from '../core/events';
import { incidentRunning } from '../core/incidents';
import { bumpFlag, type GameState } from '../core/state';
import { fill, pick, randInt } from '../util';
import type { AppContext } from './app';
import { h, juice, NUDGE, quip, setFlag, setText } from './dom';
import { formatNumber } from './format';
import type { Fx } from './juice';
import { describeEffect } from './pager';
import { nextTicketNo, ticketId } from './history';
import { createWork } from './work';

/** Bürotelefon in drei Modellen: Grundmodell, mit AB (has-am), VoIP mit Headset (has-headset) */
const PHONE_SVG = `<svg viewBox="0 0 64 58">
  <g class="ring" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"><path d="M3 4 q-3 5 0 10"/><path d="M-1 1 q-4 8 0 16"/><path d="M61 9 q3 5 0 10"/><path d="M65 6 q4 8 0 16"/></g>
  <g class="model m1"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#eadfc8" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#f7efdf" stroke-width="2.4" stroke-linecap="round"/><rect x="27" y="26" width="22" height="7" rx="1.5" fill="#bccaa2" stroke="var(--ink)" stroke-width="1.6"/><path d="M30 29.5 h7 M40 29.5 h4" stroke="#55604a" stroke-width="1.6" stroke-linecap="round"/><g fill="#fffaf0" stroke="var(--ink)" stroke-width="1"><rect x="28.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="49.2" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="49.2" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="49.2" width="5.4" height="3.4" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#ddd0b3" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#f7efdf" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="model m2"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#d9dce6" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#f1f2f7" stroke-width="2.4" stroke-linecap="round"/><rect x="24.5" y="25.5" width="25" height="9" rx="1.5" fill="#bfe0c9" stroke="var(--ink)" stroke-width="1.6"/><path d="M27.5 28.5 h9 M27.5 31.5 h14" stroke="#4d6a57" stroke-width="1.4" stroke-linecap="round"/><circle class="am-led" cx="54" cy="28" r="2.3" fill="#ff5b5b" stroke="var(--ink)" stroke-width="1.2"/><g fill="#fffaf0" stroke="var(--ink)" stroke-width="1"><rect x="26" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="39" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="26" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="39" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="26" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="39" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="26" y="49.8" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="49.8" width="5" height="3.2" rx="1.2"/><rect x="39" y="49.8" width="5" height="3.2" rx="1.2"/></g><g fill="#b9bdcb" stroke="var(--ink)" stroke-width="1"><rect x="47" y="37.5" width="7.5" height="3.2" rx="1.2"/><rect x="47" y="41.6" width="7.5" height="3.2" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#c5c9d6" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#eceef4" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="model m3"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#565063" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#6f6880" stroke-width="2.4" stroke-linecap="round"/><rect x="23.5" y="25" width="27" height="11" rx="1.8" fill="#a0c4ff" stroke="var(--ink)" stroke-width="1.6"/><path d="M25 27.6 h24" stroke="#fffaf0" stroke-width="2.2"/><g fill="#fffaf0"><rect x="26" y="30.5" width="6" height="3.6" rx="1"/><rect x="34" y="30.5" width="6" height="3.6" rx="1"/><rect x="42" y="30.5" width="6" height="3.6" rx="1"/></g><g fill="var(--mint)" stroke="var(--ink)" stroke-width=".9"><circle cx="54.3" cy="27" r="1.4"/><circle cx="54.6" cy="31" r="1.4"/><circle cx="55" cy="35" r="1.4"/></g><g fill="#ece8f2" stroke="var(--ink)" stroke-width="1"><rect x="26" y="38.5" width="5" height="3" rx="1.2"/><rect x="32.5" y="38.5" width="5" height="3" rx="1.2"/><rect x="39" y="38.5" width="5" height="3" rx="1.2"/><rect x="26" y="42.4" width="5" height="3" rx="1.2"/><rect x="32.5" y="42.4" width="5" height="3" rx="1.2"/><rect x="39" y="42.4" width="5" height="3" rx="1.2"/><rect x="26" y="46.3" width="5" height="3" rx="1.2"/><rect x="32.5" y="46.3" width="5" height="3" rx="1.2"/><rect x="39" y="46.3" width="5" height="3" rx="1.2"/><rect x="26" y="50.2" width="5" height="3" rx="1.2"/><rect x="32.5" y="50.2" width="5" height="3" rx="1.2"/><rect x="39" y="50.2" width="5" height="3" rx="1.2"/></g><g fill="#7a7390" stroke="var(--ink)" stroke-width="1"><rect x="47" y="38.5" width="7.5" height="3" rx="1.2"/><rect x="47" y="42.4" width="7.5" height="3" rx="1.2"/><rect x="47" y="46.3" width="7.5" height="3" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#423c4d" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#6f6880" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="headset"><path d="M27 20 c0 -19 30 -19 30 0" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/><path d="M27 20 c0 -19 30 -19 30 0" fill="none" stroke="#7fa6e6" stroke-width="2.4" stroke-linecap="round"/><rect x="22" y="13" width="9" height="11" rx="3.5" fill="#a0c4ff" stroke="var(--ink)" stroke-width="2"/><rect x="53" y="13" width="9" height="11" rx="3.5" fill="#a0c4ff" stroke="var(--ink)" stroke-width="2"/><path d="M24 22 c-2 3 -2 6 -1 8" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><circle cx="23.2" cy="30.5" r="2" fill="var(--mint)" stroke="var(--ink)" stroke-width="1.4"/></g>
</svg>`;

/** Pause, nach der das Tippen am Stück endet (für die Combo-Sprüche) */
const COMBO_GAP_MS = 700;
/** Abstand zwischen zwei Log-Sprüchen derselben Sondertaste */
const GAG_COOLDOWN_MS = 20_000;
/** Bis zu so vielen Klicks erscheint der Tipp-Hinweis bei längerer Pause wieder */
const HINT_UNTIL_CLICKS = 60;
const HINT_IDLE_MS = 20_000;

interface KeyDef {
  /** Taste auf der physischen Tastatur (KeyboardEvent.key in Großbuchstaben) */
  key: string;
  label: string;
  /** Breite in Viertel-Tasten (1u = 4); Standard 1u */
  w?: number;
  cls?: string;
}

const letters = (s: string): KeyDef[] => [...s].map((c) => ({ key: c, label: c }));
const mod = (key: string, label: string, w: number, cls = ''): KeyDef => ({ key, label, w, cls: `key-mod ${cls}`.trim() });

/**
 * 60 % ISO-DE, angelehnt an kleine Keychron-Boards: 15u breit, Raster aus 60 Viertel-Spalten.
 * Die hohe ISO-Enter-Taste belegt rechts die Reihen 2–3 (wird separat gesetzt).
 */
const ROWS: KeyDef[][] = [
  [mod('ESCAPE', 'Esc', 4), ...letters('1234567890ß'), { key: '´', label: '´' }, mod('BACKSPACE', '⌫', 8)],
  [mod('TAB', '⇥', 7), ...letters('QWERTZUIOPÜ+')],
  [mod('CAPSLOCK', 'PANIK', 7, 'key-panic'), ...letters('ASDFGHJKLÖÄ#')],
  [
    mod('SHIFT', '⇧', 5),
    { key: '<', label: '<' },
    ...letters('YXCV'),
    { key: 'B', label: '', cls: 'key-gum' },
    ...letters('NM,.-'),
    mod('SHIFTR', '⇧', 11),
  ],
  [
    mod('CONTROL', 'Strg', 5),
    mod('META', 'sudo', 5),
    mod('ALT', 'Alt', 5),
    { key: ' ', label: 'Leertaste (beheizt)', w: 25, cls: 'key-space' },
    mod('ALTGRAPH', 'AltGr', 5),
    mod('ANY', 'Any', 5, 'key-any'),
    mod('F4', 'Alt+F4', 5, 'key-altf4'),
    mod('CONTROLR', 'Strg', 5),
  ],
];

/**
 * Der Schreibtisch unter dem Monitor: Anrufer, Tastatur (jede Taste tippt die Support-Antwort weiter,
 * fertig = gelöst), Dringend-Tickets als Post-its und die Eingabezeile.
 */
export function createDesk(ctx: AppContext, fx: Fx, root: () => HTMLElement, screen: () => HTMLElement) {
  let call: Call | null = null;
  let callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
  let callerUntil = 0;
  const recent: string[] = [];
  let combo = 0;
  let lastHit = 0;
  /** dieser Anschlag hat ein Ticket gelöst (dann kein Tipp-Vibrieren, das die Meilenstein-Vibration abschneiden würde) */
  let solvedNow = false;

  // --- Anrufer (Sprechblase über dem Schreibtisch) ---
  const face = h('span', { class: 'caller-face', 'aria-hidden': 'true' });
  const who = h('span', { class: 'caller-who' });
  const says = h('p', { class: 'caller-says' });
  const bubble = h('div', { class: 'bubble' }, [h('div', { class: 'caller-head' }, [who, face]), says]);
  // Tischtelefon: die Sprechblase kommt aus dem Hörer
  const phone = h('div', { class: 'phone', 'aria-hidden': 'true' });
  phone.innerHTML = PHONE_SVG;
  phone.addEventListener('animationend', (e) => {
    if (e.animationName === 'phone-ring') phone.classList.remove('ringing');
  });
  const callerEl = h('div', { class: 'caller' }, [bubble]);

  // --- Arbeitsfenster auf dem Desktop (Mail, Ticket, Shell, Chat, Call, RDP, Web, Suche) ---
  // Gelöst: Bonus steigt aus dem Stempel auf, an Meilensteinen der Serie Konfetti und Fanfare
  const work = createWork(
    ctx,
    () => call,
    (streak, stamp, presses) => {
      const { bonus, milestone } = solveTicket(ctx.state, streak, presses);
      callerLeft--;
      solvedNow = true;
      const p = fx.rel(stamp);
      fx.floater(p.x + p.w / 2, p.y, `+${formatNumber(bonus)}`, true);
      if (milestone) {
        fx.confetti(p.x + p.w / 2, p.y + p.h / 2, 26);
        ctx.sfx.milestone();
        ctx.haptic('milestone');
      }
    },
  );

  // --- Tastatur ---
  const keys = new Map<string, HTMLButtonElement>();
  const keyboard = h('div', { class: 'keyboard', role: 'group', 'aria-label': 'Tastatur: jede Taste tippt am Ticket weiter' });
  ROWS.forEach((row, r) => {
    for (const def of row) {
      const el = h('button', {
        class: `key${def.cls ? ` ${def.cls}` : ''}`,
        type: 'button',
        tabindex: '-1',
        'aria-hidden': 'true',
        style: `grid-row:${r + 1};grid-column:span ${def.w ?? 4}`,
      });
      if (def.cls?.includes('key-space')) el.append(h('span', { class: 'key-small', text: def.label }));
      else el.textContent = def.label;
      el.dataset.key = def.key;
      keys.set(def.key, el);
      keyboard.append(el);
    }
  });
  // Enter: zwei Reihen hoch, einzige fokussierbare Taste (Barrierefreiheit, Tests)
  const enter = h(
    'button',
    {
      class: 'key key-enter close-btn',
      type: 'button',
      'aria-label': 'Am Ticket weitertippen',
      style: 'grid-row:2 / span 2;grid-column:56 / span 5',
    },
    [h('span', { class: 'enter-arrow', text: '⏎' }), h('span', { class: 'key-small', text: 'Fix' })],
  );
  enter.dataset.key = 'ENTER';
  keys.set('ENTER', enter);
  keyboard.append(enter);
  const anyKey = keys.get('ANY');
  // Einstieg: Hinweis, dass hier getippt wird (verschwindet nach den ersten Anschlägen)
  const hint = h('div', { class: 'tap-hint', hidden: '', text: 'Tipp drauf! Jede Taste tippt am Ticket weiter' });
  let i = 0;
  for (const el of keyboard.querySelectorAll<HTMLElement>('.key')) el.style.setProperty('--i', String(i++ % 14));
  const keyboardWrap = h('div', { class: 'keyboard-wrap' }, [hint, keyboard]);

  const fresh = (lines: Line[]) => {
    const unused = lines.filter((l) => !recent.includes(l.text));
    return pick(unused.length > 0 ? unused : lines);
  };


  const chooseCall = (): Call => {
    // Rückruf: gleiche Person, neues Leid
    if (call && Math.random() < CONFIG.callerCallbackChance) {
      // gleiches Anliegen wie vorher, nur genervter
      return {
        ...call,
        who: `${call.who.replace(/ \(Rückruf\)$/, '')} (Rückruf)`,
        text: pick(CALLBACK_LINES),
        about: call.about ?? call.text,
        reply: undefined,
      };
    }
    const situational = situationalCalls(ctx.state, new Date()).filter((c) => !recent.includes(c.text));
    if (situational.length > 0 && Math.random() < CONFIG.callerSituationalChance) return pick(situational);

    let caller = pick(CALLERS);
    while (CALLERS.length > 1 && caller.who === call?.who) caller = pick(CALLERS);
    return { face: caller.face, who: caller.who, ...fresh(caller.lines) };
  };

  /** initial = Anrufer beim Seitenstart: kein Klingeln, zählt nicht als angehört */
  const showCall = (c: Call, initial = false) => {
    call = c;
    if (!initial) {
      bumpFlag(ctx.state, 'callers');
      if (c.who.endsWith('(Rückruf)')) bumpFlag(ctx.state, 'callbacks');
    }
    recent.push(c.text);
    if (recent.length > 30) recent.shift();
    setText(face, c.face);
    setText(who, c.who);
    setText(says, c.text);
    callerUntil = performance.now() + CONFIG.callerMinShowMs + c.text.length * CONFIG.callerShowMsPerChar;
    callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
    if (c.reply) ctx.log.template(c.reply);
    juice(bubble, NUDGE, 260);
    if (!initial) {
      ctx.sfx.ring();
      phone.classList.remove('ringing');
      void phone.offsetWidth;
      phone.classList.add('ringing');
    }
  };

  // --- „!! DRINGEND !!“-Tickets: Post-it klebt kurz auf dem Monitor ---
  let urgentEl: HTMLButtonElement | null = null;
  const scheduleUrgent = (delay = randInt(CONFIG.urgentMinMs, CONFIG.urgentMaxMs)) => {
    setTimeout(spawnUrgent, delay);
  };

  const spawnUrgent = () => {
    const visible =
      !document.hidden && !document.querySelector('dialog[open]') && !incidentRunning() && !root().classList.contains('sheet-open');
    if (!visible || urgentEl) return scheduleUrgent(10_000);

    const el = h('button', { class: 'urgent-note', type: 'button', text: pick(URGENT_LABELS) });
    const s = fx.rel(screen());
    el.style.left = `${s.x + randInt(8, Math.max(8, s.w - 160))}px`;
    el.style.top = `${s.y + randInt(Math.min(60, s.h / 3), Math.max(60, s.h - 60))}px`;
    el.style.setProperty('--tilt', `${randInt(-6, 6)}deg`);
    let claimed = false;
    const claim = () => {
      if (claimed) return;
      claimed = true;
      const res = claimUrgent(ctx.state, rates(ctx.state));
      const p = fx.rel(el);
      fx.floater(p.x + p.w / 2, p.y, describeEffect(res), true);
      const vip = pick(VIP_TICKETS);
      ctx.history.add({
        id: ticketId(nextTicketNo(ctx.state.clicks)),
        subject: vip.subject,
        who: vip.who,
        channel: 'Post-it am Monitor',
        prio: el.textContent?.replace(/!/g, '').trim() || 'DRINGEND',
        status: 'Sofort gelöst (natürlich)',
        cause: vip.cause,
        note: fill(pick(topicPool(vip.topic, 'notes')), { who: vip.who }),
        solution: `${URGENT_TEXT[res.effect] ?? 'VIP-Ticket gelöst.'} (${describeEffect(res)})`,
        vip: true,
      });
      ctx.sfx.unlock();
      ctx.sfx.milestone();
      ctx.haptic('milestone');
      el.classList.add('peel');
      setTimeout(() => el.remove(), 500);
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      claim();
    });
    el.addEventListener('click', claim); // Tastatur und Screenreader
    root().append(el);
    urgentEl = el;
    ctx.sfx.unlockPing();

    setTimeout(() => {
      if (!claimed) {
        el.remove();
        ctx.log.write('info', 'helpdesk[1337]: VIP-Ticket unbeantwortet. An den Chef eskaliert. Der hat es gelöscht.');
      }
      urgentEl = null;
      scheduleUrgent();
    }, CONFIG.urgentVisibleMs);
  };

  // --- Anschlag ---
  const lastGag: Record<string, number> = {};
  const gag = (key: string, level: 'info' | 'warn', lines: string[], now: number, anchor: Element) => {
    if (now - (lastGag[key] ?? -Infinity) < GAG_COOLDOWN_MS) return;
    lastGag[key] = now;
    const line = pick(lines);
    ctx.log.write(level, line);
    quip(anchor, line);
  };

  const hit = (keyEl: HTMLElement) => {
    const def = keyEl.dataset.key ?? '';
    ctx.sfx.unlock();
    solvedNow = false;
    const progress = pressKey(ctx.state);

    // Eingabezeile: jede Taste (auch Enter) tippt weiter, Alt+F4 verwirft das Ticket
    const now = performance.now();
    if (def === 'F4') {
      work.newTask(); // Fenster zu, nächste Aufgabe
      gag('F4', 'warn', ALTF4_LINES, now, keyEl);
    } else {
      if (def === 'CAPSLOCK') gag('CAPSLOCK', 'info', PANIC_LINES, now, keyEl);
      work.typeMore(progress);
    }
    work.afterKey();

    // Effekte: Tickets gibt es erst beim Lösen; pro Taste nur ab und zu ein Schnipsel
    const k = fx.rel(keyEl, true);
    if (Math.random() < 0.25) fx.scrap(k.x + k.w / 2, k.y + 6);

    combo = now - lastHit < COMBO_GAP_MS ? combo + 1 : 1;
    lastHit = now;
    // langes Tippen am Stück: ab und zu ein Spruch an der Tastatur (gezählt wird nur die Serie gelöster Tickets)
    const comboLine = COMBO_LINES[combo];
    if (comboLine) quip(keyboard, comboLine);

    ctx.sfx.tap();
    if (!solvedNow) ctx.haptic('tap');
    // Ruhiger Start: erst ein bisschen tippen, dann klingelt zum ersten Mal das Telefon
    if (!started) {
      if (ctx.state.clicks >= CONFIG.onboardingClicks) begin();
      return;
    }
    // Wechsel erst nach genug gelösten Tickets UND genug Lesezeit;
    // nächster Anruf erst, wenn der aktuelle seine Antwort hat (sonst geht er verloren)
    if (callerLeft <= 0 && now >= callerUntil && work.isAnswered(call)) showCall(chooseCall());
  };

  /** Nach dem ruhigen Start: erster Anruf (klingelt), Dringend-Tickets ab jetzt */
  let started = false;
  const begin = () => {
    started = true;
    callerEl.classList.remove('quiet');
    showCall(chooseCall());
    scheduleUrgent();
  };

  // Gedrückt-Zustand pro Taste: zählt Finger bzw. physische Tasten, damit nichts zu früh hochspringt
  const held = new Map<HTMLButtonElement, number>();
  const pointerKeys = new Map<number, HTMLButtonElement>();
  const physical = new Map<string, HTMLButtonElement>();
  const press = (el: HTMLButtonElement) => {
    held.set(el, (held.get(el) ?? 0) + 1);
    el.classList.add('down');
  };
  const releaseKey = (el: HTMLButtonElement) => {
    const n = held.get(el);
    if (n === undefined) return;
    if (n > 1) return void held.set(el, n - 1);
    held.delete(el);
    el.classList.remove('down');
    ctx.sfx.release();
  };
  /** Fenster verloren o. Ä.: alles loslassen, sonst bleiben Tasten optisch hängen */
  const releaseAll = () => {
    for (const el of held.keys()) el.classList.remove('down');
    held.clear();
    pointerKeys.clear();
    physical.clear();
  };

  /** Taste, die dem Finger am nächsten liegt (Treffer zwischen den Tasten oder auf dem Rahmen) */
  const allKeys = [...keys.values()];
  const nearestKey = (clientX: number, clientY: number): HTMLButtonElement => {
    const p = fx.toLocal(clientX, clientY);
    let best = enter;
    let bestD = Infinity;
    for (const k of allKeys) {
      const r = fx.rel(k, true);
      const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
      const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  };

  // Die ganze Tastatur ist Tippfläche: jeder Treffer zählt, optisch geht die nächste Taste runter.
  // pointerdown statt click: schneller, und jeder Finger zählt.
  keyboardWrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    // Maus antippen zählt auch: dann klickt die Maus, keine Taste geht runter
    const mouse = (e.target as Element).closest<HTMLElement>('.mouse');
    if (mouse) {
      e.preventDefault();
      hit(mouse);
      return;
    }
    const el = (e.target as Element).closest<HTMLButtonElement>('.key') ?? nearestKey(e.clientX, e.clientY);
    e.preventDefault();
    pointerKeys.set(e.pointerId, el);
    press(el);
    hit(el);
  });
  const up = (e: PointerEvent) => {
    const el = pointerKeys.get(e.pointerId);
    if (!el) return;
    pointerKeys.delete(e.pointerId);
    releaseKey(el);
  };
  for (const type of ['pointerup', 'pointercancel'] as const) window.addEventListener(type, up);
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => document.hidden && releaseAll());
  keyboardWrap.addEventListener('contextmenu', (e) => e.preventDefault());
  // Screenreader/Switch Access lösen nur „click“ aus (ohne Zeiger, detail 0)
  enter.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    hit(enter);
  });

  // Physische Tastatur (Desktop): passende Taste drücken
  // In Eingabefeldern nie; auf fokussierten Knöpfen (Apps, Einstellungen) gehören Enter/Leertaste dem Knopf
  const typing = (e: KeyboardEvent) => {
    const t = e.target;
    if (!(t instanceof Element)) return false;
    if (t.closest('input, textarea, select, [contenteditable]')) return true;
    return (e.key === 'Enter' || e.key === ' ') && !!t.closest('button:not(.key), a');
  };
  const keyFor = (e: KeyboardEvent): HTMLButtonElement | undefined => {
    if (e.key === 'Tab') return undefined; // Tab bleibt für die Fokus-Navigation
    // rechte Shift/Strg haben eigene Tasten; Akzent-Taste ist eine Tottaste
    if (e.code === 'ShiftRight') return keys.get('SHIFTR');
    if (e.code === 'ControlRight') return keys.get('CONTROLR');
    if (e.key === 'Dead') return keys.get('´');
    // erst exakt (ß wird groß zu „SS“), dann in Großbuchstaben, sonst die Any-Taste
    return keys.get(e.key) ?? keys.get(e.key.toUpperCase()) ?? (e.key.length === 1 ? anyKey : undefined);
  };
  const MODIFIERS = ['Control', 'Alt', 'AltGraph', 'Meta', 'Shift'];
  /** Tastenkürzel (Strg+C …) gehören dem Browser; die Modifier selbst und AltGr-Zeichen (@, €) zählen */
  const shortcut = (e: KeyboardEvent) =>
    (e.ctrlKey || e.metaKey || e.altKey) && !MODIFIERS.includes(e.key) && !e.getModifierState?.('AltGraph');
  window.addEventListener('keydown', (e) => {
    if (e.repeat || shortcut(e) || e.defaultPrevented) return;
    // offenes App-Fenster verdeckt die Tastatur: dann zählt auch die echte nicht
    if (typing(e) || document.querySelector('dialog[open]') || incidentRunning() || root().classList.contains('sheet-open')) return;
    const el = keyFor(e);
    if (!el) return;
    e.preventDefault();
    physical.set(e.code || e.key, el);
    press(el);
    hit(el);
  });
  window.addEventListener('keyup', (e) => {
    const el = physical.get(e.code || e.key);
    if (!el) return;
    physical.delete(e.code || e.key);
    releaseKey(el);
  });

  return {
    callerEl,
    /** Tischtelefon links neben dem Monitor */
    phone,
    keyboard: keyboardWrap,
    work: work.el,
    lastClosed: work.last,
    /** Platz für den Prompt (root@firma:~$) vor dem Getippten im Terminal */
    promptSlot: work.promptSlot,
    start() {
      work.newTask();
      if (ctx.state.clicks >= CONFIG.onboardingClicks) {
        started = true;
        showCall(chooseCall(), true);
        scheduleUrgent();
      } else {
        callerEl.classList.add('quiet');
      }
    },
    /** Upgrades an der Tastatur sichtbar machen */
    render(s: GameState) {
      setFlag(keyboardWrap, 'mech', !!s.upgrades.keyboard);
      // Telefon-Upgrades: eingebauter Anrufbeantworter, Headset statt Hörer
      setFlag(phone, 'has-am', !!s.upgrades.answering);
      setFlag(phone, 'has-headset', !!s.upgrades.headset);
      // Neulinge: am Anfang und nach längerer Pause zeigen, wo getippt wird
      const idle = performance.now() - lastHit;
      const invite = s.clicks < HINT_UNTIL_CLICKS && (s.clicks < 3 || idle > HINT_IDLE_MS);
      if (hint.hidden === invite) hint.hidden = !invite;
      setFlag(keyboardWrap, 'inviting', invite);
      if (started) work.idle(idle);
      if (anyKey) {
        setText(anyKey, s.upgrades.macro ? 'Makro' : 'Any');
        setFlag(anyKey, 'key-macro', !!s.upgrades.macro);
      }
    },
  };
}
