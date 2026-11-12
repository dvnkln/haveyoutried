import { bus } from '../core/bus';
import { CONFIG } from '../config';
import { LOGIN, NEXT_TOOL_HINT, TOOL_HINT } from '../content/boot';
import { markLoggedIn, needsLogin, needsOsLogin, requireOsLogin } from '../core/login';
import { createLogin } from './login';
import { MELODIES, type Melody } from '../content/melodies';
import { HINT_DELAY_MS } from './power';
import { availableCallers, CALLBACK_LINES, situationalCalls, type Call, type Line } from '../content/callers';
import { topicPool } from '../content/topics';
import { URGENT_LABELS, URGENT_TEXT } from '../content/events';
import { VIP_TICKETS } from '../content/work';
import { advanceStory, dueStoryCall } from '../content/stories';
import { ALTF4_LINES, PANIC_LINES } from '../content/props';
import { incidentRunning } from '../core/incidents';
import { espressoActive, pressKey, solveTicket, startEspresso } from '../core/actions';
import { rates, ticketReward } from '../core/economy';
import { applyEffect, claimUrgent } from '../core/events';
import { addTickets, bumpFlag, type GameState } from '../core/state';
import { fill, pick, randInt } from '../util';
import type { AppContext } from './app';
import { h, juice, NUDGE, POP, SHAKE, setFlag, setText } from './dom';
import { formatNumber } from './format';
import type { Fx } from './juice';
import { describeEffect } from './pager';
import { nextTicketNo, ticketId } from './history';
import { createWork } from './work';
import { gameBlocked, gamePaused, hintShowing } from './blocked';
import { attentionBusy } from './toast';
import { quirkMods, scaledDelay } from '../core/quirks';

/** Bürotelefon in drei Modellen: Grundmodell, mit AB (has-am), VoIP mit Headset (has-headset) */
const PHONE_SVG = `<svg viewBox="0 0 64 58">
  <g class="ring" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"><path d="M3 4 q-3 5 0 10"/><path d="M-1 1 q-4 8 0 16"/><path d="M61 9 q3 5 0 10"/><path d="M65 6 q4 8 0 16"/></g>
  <g class="model m1"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#eadfc8" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#f7efdf" stroke-width="2.4" stroke-linecap="round"/><rect x="27" y="26" width="22" height="7" rx="1.5" fill="#bccaa2" stroke="var(--ink)" stroke-width="1.6"/><path d="M30 29.5 h7 M40 29.5 h4" stroke="#55604a" stroke-width="1.6" stroke-linecap="round"/><g fill="#fffaf0" stroke="var(--ink)" stroke-width="1"><rect x="28.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="36" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="40.4" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="44.8" width="5.4" height="3.4" rx="1.2"/><rect x="28.5" y="49.2" width="5.4" height="3.4" rx="1.2"/><rect x="35.5" y="49.2" width="5.4" height="3.4" rx="1.2"/><rect x="42.5" y="49.2" width="5.4" height="3.4" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#ddd0b3" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#f7efdf" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="model m2"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#d9dce6" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#f1f2f7" stroke-width="2.4" stroke-linecap="round"/><rect x="24.5" y="25.5" width="25" height="9" rx="1.5" fill="#bfe0c9" stroke="var(--ink)" stroke-width="1.6"/><path d="M27.5 28.5 h9 M27.5 31.5 h14" stroke="#4d6a57" stroke-width="1.4" stroke-linecap="round"/><circle class="am-led" cx="54" cy="28" r="2.3" fill="#ff5b5b" stroke="var(--ink)" stroke-width="1.2"/><g fill="#fffaf0" stroke="var(--ink)" stroke-width="1"><rect x="26" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="39" y="37.5" width="5" height="3.2" rx="1.2"/><rect x="26" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="39" y="41.6" width="5" height="3.2" rx="1.2"/><rect x="26" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="39" y="45.7" width="5" height="3.2" rx="1.2"/><rect x="26" y="49.8" width="5" height="3.2" rx="1.2"/><rect x="32.5" y="49.8" width="5" height="3.2" rx="1.2"/><rect x="39" y="49.8" width="5" height="3.2" rx="1.2"/></g><g fill="#b9bdcb" stroke="var(--ink)" stroke-width="1"><rect x="47" y="37.5" width="7.5" height="3.2" rx="1.2"/><rect x="47" y="41.6" width="7.5" height="3.2" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#c5c9d6" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#eceef4" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="model m3"><path class="cord" d="M8 50 c-5 0 -2 4 -5 5 c-3 1 -1 4 -3 5" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><path d="M11 20 h42 a4 4 0 0 1 4 3.4 l4.2 26.6 a4 4 0 0 1 -4 4.6 h-50.4 a4 4 0 0 1 -4 -4.6 l4.2 -26.6 a4 4 0 0 1 4 -3.4Z" fill="#565063" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 23.5 h28" stroke="#6f6880" stroke-width="2.4" stroke-linecap="round"/><rect x="23.5" y="25" width="27" height="11" rx="1.8" fill="#a0c4ff" stroke="var(--ink)" stroke-width="1.6"/><path d="M25 27.6 h24" stroke="#fffaf0" stroke-width="2.2"/><g fill="#fffaf0"><rect x="26" y="30.5" width="6" height="3.6" rx="1"/><rect x="34" y="30.5" width="6" height="3.6" rx="1"/><rect x="42" y="30.5" width="6" height="3.6" rx="1"/></g><g fill="var(--mint)" stroke="var(--ink)" stroke-width=".9"><circle cx="54.3" cy="27" r="1.4"/><circle cx="54.6" cy="31" r="1.4"/><circle cx="55" cy="35" r="1.4"/></g><g fill="#ece8f2" stroke="var(--ink)" stroke-width="1"><rect x="26" y="38.5" width="5" height="3" rx="1.2"/><rect x="32.5" y="38.5" width="5" height="3" rx="1.2"/><rect x="39" y="38.5" width="5" height="3" rx="1.2"/><rect x="26" y="42.4" width="5" height="3" rx="1.2"/><rect x="32.5" y="42.4" width="5" height="3" rx="1.2"/><rect x="39" y="42.4" width="5" height="3" rx="1.2"/><rect x="26" y="46.3" width="5" height="3" rx="1.2"/><rect x="32.5" y="46.3" width="5" height="3" rx="1.2"/><rect x="39" y="46.3" width="5" height="3" rx="1.2"/><rect x="26" y="50.2" width="5" height="3" rx="1.2"/><rect x="32.5" y="50.2" width="5" height="3" rx="1.2"/><rect x="39" y="50.2" width="5" height="3" rx="1.2"/></g><g fill="#7a7390" stroke="var(--ink)" stroke-width="1"><rect x="47" y="38.5" width="7.5" height="3" rx="1.2"/><rect x="47" y="42.4" width="7.5" height="3" rx="1.2"/><rect x="47" y="46.3" width="7.5" height="3" rx="1.2"/></g><g class="handset"><rect x="6" y="13" width="14" height="40" rx="6.5" fill="#423c4d" stroke="var(--ink)" stroke-width="2.3"/><path d="M10 19 v10" stroke="#6f6880" stroke-width="2.2" stroke-linecap="round"/><g fill="var(--ink)" opacity=".55"><circle cx="13" cy="17.5" r="1"/><circle cx="13" cy="48.5" r="1"/></g></g></g>
  <g class="headset"><path d="M27 20 c0 -19 30 -19 30 0" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/><path d="M27 20 c0 -19 30 -19 30 0" fill="none" stroke="#7fa6e6" stroke-width="2.4" stroke-linecap="round"/><rect x="22" y="13" width="9" height="11" rx="3.5" fill="#a0c4ff" stroke="var(--ink)" stroke-width="2"/><rect x="53" y="13" width="9" height="11" rx="3.5" fill="#a0c4ff" stroke="var(--ink)" stroke-width="2"/><path d="M24 22 c-2 3 -2 6 -1 8" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/><circle cx="23.2" cy="30.5" r="2" fill="var(--mint)" stroke="var(--ink)" stroke-width="1.4"/></g>
</svg>`;

/** Fliegende Espressotasse: klein, weißes Porzellan, Crema, Untertasse, Flügelchen und Dampf */
const CUP_SVG = `<svg viewBox="0 0 64 52" aria-hidden="true">
  <g class="cup-steam" fill="none" stroke="#fffaf0" stroke-width="2.5" stroke-linecap="round" opacity=".9">
    <path d="M27 17c-3-3 3-5 0-9"/><path d="M35 17c-3-3 3-5 0-9"/>
  </g>
  <path class="cup-wing cup-wing-l" d="M19 29c-8-6-13-2-12 3 4 0 7 1 12 2z" fill="#d6e6ff" stroke="#3d2c2e" stroke-width="2" stroke-linejoin="round"/>
  <path class="cup-wing cup-wing-r" d="M44 29c8-6 13-2 12 3-4 0-7 1-12 2z" fill="#d6e6ff" stroke="#3d2c2e" stroke-width="2" stroke-linejoin="round"/>
  <path d="M42 26h2a4.5 4.5 0 0 1 0 9h-3" fill="none" stroke="#3d2c2e" stroke-width="2.5"/>
  <path d="M20 22h23l-2 14a5 5 0 0 1-5 4h-9a5 5 0 0 1-5-4z" fill="#fffaf0" stroke="#3d2c2e" stroke-width="2.5" stroke-linejoin="round"/>
  <ellipse cx="31.5" cy="22" rx="11.5" ry="2.6" fill="#c98a4b" stroke="#3d2c2e" stroke-width="2"/>
  <path d="M22 30h19" stroke="#f4a261" stroke-width="2"/>
  <ellipse cx="31.5" cy="43" rx="16" ry="3.6" fill="#fffaf0" stroke="#3d2c2e" stroke-width="2.5"/>
</svg>`;
const ESPRESSO_LINES = [
  'coffee[{pid}]: doppelter Espresso gefangen. Puls: ja. Finger: auf Autopilot.',
  'coffee[{pid}]: Koffein im System. Tastatur meldet Übertaktung.',
  'coffee[{pid}]: Tasse erwischt. Die Kollegen hören dich jetzt tippen. Alle.',
];

/** Abstand zwischen zwei Log-Sprüchen derselben Sondertaste */
const GAG_COOLDOWN_MS = 20_000;
/** Bis zu so vielen Klicks erscheint der Tipp-Hinweis bei längerer Pause wieder */
const HINT_UNTIL_CLICKS = 60;
const HINT_IDLE_MS = 20_000;
const TAP_HINT = 'Tipp drauf! Jede Taste tippt am Ticket weiter';

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
    mod('META', 'Cmd', 5),
    mod('ALT', 'Alt', 5),
    { key: ' ', label: 'Leertaste (beheizt)', w: 25, cls: 'key-space' },
    mod('ALTGRAPH', 'AltGr', 5),
    mod('ANY', 'Any', 5, 'key-any'),
    mod('F4', 'Alt+F4', 5, 'key-altf4'),
    mod('CONTROLR', 'Strg', 5),
  ],
];

/**
 * Wie setTimeout, aber die Zeit steht, solange das Spiel pausiert (Hinweis vom Vorgänger, Dialog);
 * el bekommt dann .paused, das CSS hält seine Animationen an. early() = sofort fertig.
 */
function pausableTimeout(ms: number, el: Element, done: () => void, early?: () => boolean): void {
  let left = ms;
  let last = performance.now();
  const timer = window.setInterval(() => {
    const now = performance.now();
    // auch während eines Incidents: der verdeckt den Monitor (main.css blendet VIP-Mail und Tasse dann aus)
    const paused = gamePaused() || !!incidentRunning();
    el.classList.toggle('paused', paused);
    if (!paused) left -= now - last;
    last = now;
    if (left <= 0 || early?.()) {
      clearInterval(timer);
      done();
    }
  }, 100);
}

/**
 * Der Schreibtisch unter dem Monitor: Anrufer, Tastatur (jede Taste tippt die Support-Antwort weiter,
 * fertig = gelöst), Dringend-Tickets als Post-its und die Eingabezeile.
 */
/** Espresso-Melodie läuft beim Daumenwechsel weiter: erst nach so langer Pause ohne Taste anhalten */
const MELODY_GRACE_MS = 150;

/** Abstand der verbreiterten Anrufer-Blase zum rechten Tischrand */
const BUBBLE_EDGE_PX = 10;
/** kleinste Schrift in der Anrufer-Blase, wenn auch die volle Breite nicht reicht */
const BUBBLE_MIN_FONT_PX = 10;

export function createDesk(ctx: AppContext, fx: Fx, root: () => HTMLElement, screen: () => HTMLElement) {
  let call: Call | null = null;
  let callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
  let callerUntil = 0;
  const recent: string[] = [];
  /** Zeit des letzten Anschlags (Kaffeetasse nur für Leute, die gerade tippen) */
  let lastHit = 0;
  /**
   * Zuletzt anderweitig beschäftigt (Incident, Dialog, App-Fenster, Hinweis, Monitor aus, App im Hintergrund,
   * Werkzeug gerade auf/zu). Leerlauf für Memes, Serie und Tipp-Hinweis zählt erst ab dem späteren der beiden Zeitpunkte.
   */
  let lastBusy = 0;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) lastBusy = performance.now();
  });
  /** Espresso-Dauerfeuer: angesammelte Anschläge und letzter Frame */
  let autoAcc = 0;
  let autoLast = performance.now();
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
  // bis der Monitor an ist, ruft niemand an
  const callerEl = h('div', { class: 'caller quiet' }, [bubble]);

  // --- Arbeitsfenster auf dem Desktop (Mail, Ticket, Shell, Chat, Call, RDP, Web, Suche) ---
  // Gelöst: Bonus steigt aus dem Stempel auf, an Meilensteinen der Serie Konfetti und Fanfare.
  // Unter Espresso „+Tickets“ höchstens alle CONFIG.espresso.celebrateGapMs; was dazwischen gelöst wird, kommt als eine Summe.
  let floatSum = 0;
  let floatTimer = 0;
  let lastFloat = -Infinity;
  const flushFloat = (stamp: HTMLElement) => {
    floatTimer = 0;
    lastFloat = performance.now();
    const p = fx.rel(stamp);
    fx.floater(p.x + p.w / 2, p.y, `+${formatNumber(floatSum)}`, true);
    floatSum = 0;
  };
  // nach einem Jobwechsel keine Summe aus dem alten Job mehr anzeigen
  bus.on('jobQuit', () => {
    clearTimeout(floatTimer);
    floatTimer = 0;
    floatSum = 0;
  });
  const work = createWork(
    ctx,
    () => call,
    (streak, stamp, presses) => {
      const { bonus, milestone } = solveTicket(ctx.state, streak, presses);
      callerLeft--;
      solvedNow = true;
      floatSum += bonus;
      if (!floatTimer) {
        const gap = espressoActive(ctx.state) ? CONFIG.espresso.celebrateGapMs : 0;
        const wait = gap - (performance.now() - lastFloat);
        if (wait <= 0) flushFloat(stamp);
        else floatTimer = window.setTimeout(() => flushFloat(stamp), wait);
      }
      if (milestone) {
        const p = fx.rel(stamp);
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
  const hint = h('div', { class: 'tap-hint', hidden: '', text: TAP_HINT });
  let i = 0;
  for (const el of keyboard.querySelectorAll<HTMLElement>('.key')) el.style.setProperty('--i', String(i++ % 14));
  const espressoHint = h('div', { class: 'tap-hint espresso-hint', hidden: '', text: '☕︎ Taste halten, der Espresso tippt. Zwei Daumen: doppelt.' });
  const keyboardWrap = h('div', { class: 'keyboard-wrap' }, [hint, espressoHint, keyboard]);

  const fresh = (lines: Line[]) => {
    const unused = lines.filter((l) => !recent.includes(l.text));
    return pick(unused.length > 0 ? unused : lines);
  };


  /** story = false beim Anrufer zum Seitenstart: der zählt nicht als angehört, also auch keine Folge verbrauchen */
  const chooseCall = (story = true): Call => {
    // Rückruf: gleiche Person, neues Leid
    if (call && Math.random() < CONFIG.callerCallbackChance) {
      // Übernahmeangebot (Praktikant Stufe 3): der Praktikant nimmt den Rückruf ab, du hörst ihn gar nicht erst
      if (ctx.state.upgrades['intern-3']) {
        const bonus = ticketReward(ctx.state);
        addTickets(ctx.state, bonus);
        ctx.log.write('ok', `praktikant[${randInt(100, 999)}]: Rückruf von ${call.who.replace(/ \(Rückruf\)$/, '')} übernommen. „Haben Sie es schon aus- und wieder eingeschaltet?“ (+${formatNumber(bonus)})`);
      } else {
        // gleiches Anliegen wie vorher, nur genervter
        return {
          ...call,
          who: `${call.who.replace(/ \(Rückruf\)$/, '')} (Rückruf)`,
          text: pick(CALLBACK_LINES),
          about: call.about ?? call.text,
          reply: undefined,
        };
      }
    }
    // Geschichte geht weiter: selten, und frühestens eine Weile nach der letzten Folge
    // der dritte Anruf überhaupt beginnt eine Geschichte (früh etwas Erzählenswertes), danach nur ab und zu
    const thirdCall = (ctx.state.flags.callers ?? 0) === 2 && !Object.keys(ctx.state.flags).some((k) => k.startsWith('story:'));
    const due = story && (thirdCall || Math.random() < CONFIG.callerStoryChance) ? dueStoryCall(ctx.state, Date.now()) : null;
    if (due) {
      advanceStory(ctx.state, due.id, Date.now());
      return due.call;
    }
    const situational = situationalCalls(ctx.state, new Date()).filter((c) => !recent.includes(c.text));
    if (situational.length > 0 && Math.random() < CONFIG.callerSituationalChance) return pick(situational);

    // nur Anrufer, die es in dieser Firma (gerade) gibt
    const callers = availableCallers(ctx.state);
    let caller = pick(callers);
    while (callers.length > 1 && caller.who === call?.who) caller = pick(callers);
    return { face: caller.face, who: caller.who, ...fresh(caller.lines) };
  };

  /**
   * Blase so breit, dass der ganze Spruch hineinpasst: mit vielen Upgrades auf dem Tisch bleibt ihr wenig Platz,
   * dann ragt sie nach rechts über Becher, Mate & Co. (höchstens bis zum Tischrand), statt den Text abzuschneiden.
   */
  const fitBubble = () => {
    bubble.style.width = '';
    says.style.fontSize = '';
    says.style.webkitLineClamp = '';
    callerEl.classList.remove('wide');
    const fits = () => says.scrollHeight <= says.clientHeight + 1;
    if (fits()) return;
    const bar = callerEl.parentElement?.getBoundingClientRect();
    const r = bubble.getBoundingClientRect();
    if (!bar || r.width === 0) return;
    const max = Math.floor(bar.right - BUBBLE_EDGE_PX - r.left);
    callerEl.classList.add('wide');
    for (let w = Math.ceil(r.width) + 16; w < max; w += 16) {
      bubble.style.width = `${w}px`;
      if (fits()) return;
    }
    bubble.style.width = `${max}px`;
    // niedrige Displays (nur zwei Zeilen): notfalls etwas kleinere Schrift
    for (let px = 12; px >= BUBBLE_MIN_FONT_PX && !fits(); px -= 0.5) says.style.fontSize = `${px}px`;
    // die längsten Sprüche: mit kleiner Schrift passt eine dritte Zeile in die gleiche Höhe
    if (!fits()) says.style.webkitLineClamp = '3';
  };
  window.addEventListener('resize', fitBubble);
  // erst mit geladener Schrift stimmt die Messung
  void document.fonts?.ready.then(fitBubble);

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
    fitBubble();
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

  // --- VIP-Tickets: Benachrichtigung vom Mailprogramm oben rechts im Monitor, kurz antippbar ---
  let urgentEl: HTMLButtonElement | null = null;
  // Eigenheit der Firma: mehr oder weniger VIP-Mails (0 = keine; dann nur ab und zu nachschauen)
  const scheduleUrgent = (delay = Math.min(scaledDelay(randInt(CONFIG.urgentMinMs, CONFIG.urgentMaxMs), quirkMods(ctx.state).urgent), 600_000)) => {
    setTimeout(spawnUrgent, delay);
  };

  /** wer noch nie eine VIP-Mail hatte, bekommt die erste früh (nach 45–75 s) */
  const firstUrgentDelay = () => (ctx.state.flags.urgent ? undefined : randInt(45_000, 75_000));
  const spawnUrgent = () => {
    // Firma ohne VIP-Mails: nur später wieder nachschauen (nach dem nächsten Jobwechsel kann es anders sein)
    if (quirkMods(ctx.state).urgent === 0) return scheduleUrgent();
    // nicht zusammen mit einer Meldung, der Kaffeetasse oder einem Hinweis: kurz danach nochmal versuchen
    if (attentionBusy()) return scheduleUrgent(5_000);
    const visible = !gameBlocked({ hidden: true });
    if (!visible || urgentEl) return scheduleUrgent(10_000);

    const vip = pick(VIP_TICKETS);
    const prio = pick(URGENT_LABELS).replace(/!/g, '').trim();
    const el = h('button', { class: 'urgent-note', type: 'button', 'aria-label': `Wichtige Mail von ${vip.who}: ${vip.subject}` }, [
      h('span', { class: 'un-app' }, [h('span', { text: '✉︎ Posteingang' }), h('span', { text: 'jetzt' })]),
      h('span', { class: 'un-from' }, [h('b', { text: vip.who }), h('span', { class: 'un-flag', text: `! ${prio}` })]),
      h('span', { class: 'un-subject', text: vip.subject }),
      h('span', { class: 'un-time', 'aria-hidden': 'true' }),
    ]);
    const s = fx.rel(screen());
    const width = Math.min(250, s.w - 12);
    el.style.width = `${width}px`;
    el.style.left = `${s.x + s.w - width - 6}px`;
    el.style.top = `${s.y + 6}px`;
    el.style.setProperty('--visible', `${CONFIG.urgentVisibleMs}ms`);
    let claimed = false;
    const claim = () => {
      if (claimed) return;
      claimed = true;
      const res = claimUrgent(ctx.state, rates(ctx.state));
      const p = fx.rel(el);
      fx.floater(p.x + p.w / 2, p.y + p.h, describeEffect(res), true);
      ctx.history.add({
        id: ticketId(nextTicketNo(ctx.state.clicks)),
        subject: vip.subject,
        who: vip.who,
        channel: 'Mail (Wichtigkeit: hoch)',
        prio,
        status: 'Sofort gelöst (natürlich)',
        cause: vip.cause,
        note: fill(pick(topicPool(vip.topic, 'notes')), { who: vip.who }),
        solution: `${pick(URGENT_TEXT[res.effect] ?? ['VIP-Ticket gelöst.'])} (${describeEffect(res)})`,
        vip: true,
      });
      ctx.sfx.unlock();
      ctx.sfx.vipSent();
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

    // Countdown steht, solange das Spiel pausiert (Hinweis vom Vorgänger, Dialog); erwischt = gleich fertig, sobald weggeklebt
    pausableTimeout(CONFIG.urgentVisibleMs, el, () => finish(), () => claimed && !el.isConnected);
    const finish = () => {
      if (!claimed) {
        // abgelaufen: beim Ausblenden nicht mehr antippbar (sonst doppelt kassiert)
        claimed = true;
        el.classList.add('gone');
        setTimeout(() => el.remove(), 300);
        // Halluzinationsfilter (KI-Agent Stufe 3): der Agent nimmt verpasste VIP-Mails an, mit halber Belohnung
        if (ctx.state.upgrades['agent-3']) {
          // nur Tickets (halb so viele), keine Boosts, und es zählt nicht als selbst erwischt (Aufgaben, Achievements)
          const r = rates(ctx.state);
          const res = applyEffect(ctx.state, 'win', { pps: r.pps / 2, click: r.click / 2 });
          ctx.log.write('ok', `agent[${randInt(100, 999)}]: VIP-Ticket übernommen. „Ich verstehe die Dringlichkeit.“ (${describeEffect(res)})`);
        } else ctx.log.write('info', 'helpdesk[1337]: VIP-Ticket unbeantwortet. An den Chef eskaliert. Der hat es gelöscht.');
      }
      urgentEl = null;
      scheduleUrgent();
    };
  };

  /** Power-up eingesammelt: groß und kurz in der Mitte des Monitors, was es ist und was es tut */
  const powerupBanner = (title: string, text: string) => {
    const s = fx.rel(screen());
    const el = h('div', { class: 'powerup-banner', role: 'status' }, [h('b', { text: title }), h('span', { text })]);
    el.style.left = `${s.x + s.w / 2}px`;
    el.style.top = `${s.y + s.h * 0.42}px`;
    root().append(el);
    setTimeout(() => el.remove(), 2_600);
  };

  // --- Fliegende Kaffeetasse: erwischt = Doppelter Espresso (Taste halten tippt von selbst) ---
  /** Melodie der aktuellen Tasse (nach Neuladen mitten im Espresso: beim ersten Halten gewürfelt) */
  let espressoMelody: Melody | null = null;
  /** zuletzt gehalten (performance.now): für die Pause beim Daumenwechsel */
  let lastMelodyAt = 0;
  const scheduleCup = () => setTimeout(spawnCup, randInt(CONFIG.espresso.minMs, CONFIG.espresso.maxMs));
  const spawnCup = () => {
    const r = root();
    const calm = !gameBlocked({ hidden: true });
    // nur für Leute, die gerade tippen (sonst fliegt sie ungesehen vorbei), und nicht doppelt
    const active = performance.now() - lastHit < 10_000;
    if (!ctx.state.upgrades.coffee || !calm || !active || espressoActive(ctx.state) || attentionBusy()) {
      setTimeout(spawnCup, 20_000);
      return;
    }
    const cup = h('button', { class: 'espresso-cup', type: 'button', 'aria-label': 'Kaffeetasse fangen' });
    cup.innerHTML = CUP_SVG;
    const s = fx.rel(screen());
    // fliegt in der oberen Hälfte des Monitors quer durchs Bild, mal von links, mal von rechts
    cup.style.top = `${s.y + randInt(Math.round(s.h * 0.15), Math.round(s.h * 0.55))}px`;
    cup.style.setProperty('--fly', `${CONFIG.espresso.flightMs}ms`);
    cup.style.setProperty('--w', `${r.clientWidth}px`);
    if (Math.random() < 0.5) cup.classList.add('from-right');
    let caught = false;
    const catchCup = () => {
      if (caught) return;
      caught = true;
      startEspresso(ctx.state);
      // je Tasse eine Melodie, die beim Halten läuft
      espressoMelody = pick(MELODIES);
      const p = fx.rel(cup);
      fx.floater(p.x + p.w / 2, p.y, 'Espresso!', true);
      powerupBanner('☕︎ Doppelter Espresso', `${Math.round(CONFIG.espresso.durationMs / 1_000)} Sekunden: Taste halten, es tippt von selbst. Zwei Daumen: doppelt.`);
      ctx.log.write('ok', pick(ESPRESSO_LINES));
      ctx.sfx.unlock();
      ctx.sfx.espresso();
      ctx.haptic('milestone');
      espressoHint.hidden = false;
      cup.classList.add('caught');
      setTimeout(() => cup.remove(), 400);
    };
    cup.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      catchCup();
    });
    cup.addEventListener('click', catchCup); // Tastatur und Screenreader
    r.append(cup);
    ctx.sfx.cup();
    // Flug steht, solange das Spiel pausiert (z. B. der Hinweis zur Tasse hängt)
    pausableTimeout(CONFIG.espresso.flightMs, cup, () => {
      if (!caught) {
        cup.remove();
        ctx.log.write('info', 'coffee[{pid}]: Tasse ist vorbeigeflogen. Jetzt trinkt sie der Praktikant.');
      }
      scheduleCup();
    });
  };

  // --- Anschlag ---
  const lastGag: Record<string, number> = {};
  /** Sondertaste (Alt+F4, Panik): Spruch nur im Log, keine Sprechblase (die stört beim Tippen) */
  const gag = (key: string, level: 'info' | 'warn', lines: string[], now: number) => {
    if (now - (lastGag[key] ?? -Infinity) < GAG_COOLDOWN_MS) return;
    lastGag[key] = now;
    ctx.log.write(level, pick(lines));
  };

  /** auto = Dauerfeuer beim Espresso (gehaltene Taste): ohne Vibration, seltener Schnipsel */
  let lastAutoSound = 0;
  let lastAutoScrap = 0;
  /** Espresso: Tasten, die nur zum Schein kurz runtergehen (.ghost), und wann sie wieder hochkommen */
  const ghosts: [HTMLButtonElement, number][] = [];
  let lastGhost = 0;
  const clearGhosts = (until = Infinity) => {
    while (ghosts.length && ghosts[0]![1] <= until) ghosts.shift()![0].classList.remove('ghost');
  };
  /** Erstes Werkzeug offen? Nach dem Einschalten steht erst nur der Desktop da */
  let ready = false;
  let toolOpen = false;
  /** Anrufe und Dringend-Tickets laufen erst nach dem ersten offenen Werkzeug */
  let opened = false;
  const openTool = () => {
    toolOpen = true;
    lastBusy = performance.now();
    work.el.parentElement?.classList.remove('no-tool');
    juice(work.el, POP, 260);
    work.newTask();
    if (opened) return;
    opened = true;
    if (ctx.state.clicks >= CONFIG.onboardingClicks) {
      started = true;
      callerEl.classList.remove('quiet');
      fitBubble();
      showCall(chooseCall(false), true);
      scheduleUrgent(firstUrgentDelay());
      scheduleCup();
    }
  };
  /** Alt+F4: Fenster zu, Ticket weg; der nächste Anschlag öffnet das nächste */
  const closeTool = () => {
    toolOpen = false;
    lastBusy = performance.now();
    work.el.parentElement?.classList.add('no-tool');
  };
  // Anmeldebildschirm: erster Start und jeder Jobwechsel; danach Desktop, nächster Anschlag öffnet das Werkzeug
  const login = createLogin(ctx, () => {
    lastBusy = performance.now();
  });
  bus.on('jobQuit', () => {
    if (!needsLogin(ctx.state)) return;
    // sofort (die Neustart-Animation des Monitors läuft darüber), damit kein Anschlag vorher ein Werkzeug öffnet
    closeTool();
    login.show('job');
  });
  // anderes System gewählt (Einstellungen zu): Neustart, neu anmelden
  bus.on('osChanged', () => {
    requireOsLogin(ctx.state);
    closeTool();
    login.show('os');
  });

  const hit = (keyEl: HTMLElement, auto = false) => {
    // Anmeldung: jeder Anschlag ein Punkt im Kennwortfeld (zählt nicht als Anschlag)
    if (login.active()) {
      // blind (Monitor aus) zählt nicht; nach dem letzten Zeichen („Willkommen“) auch kein Klick mehr
      if (auto || keyEl.closest('#app')?.classList.contains('screen-off')) return;
      lastHit = performance.now();
      // iOS nach Anruf/Sperrbildschirm: Audio wecken, sonst bleibt die Anmeldung stumm
      void ctx.sfx.unlock();
      // letztes Zeichen hat seinen eigenen Ton („Willkommen“): dann kein Klick dazu
      if (login.type() === 'dot') ctx.sfx.tick();
      return;
    }
    // erster Anschlag auf dem leeren Desktop öffnet das Werkzeug, getippt wird ab dem nächsten
    if (!toolOpen) {
      if (ready && !auto) {
        ctx.sfx.tick();
        openTool();
      }
      return;
    }
    const def = keyEl.dataset.key ?? '';
    ctx.sfx.unlock();
    solvedNow = false;
    const progress = pressKey(ctx.state);

    const now = performance.now();
    // Klick zuerst, vor dem Neuzeichnen des Fensters: sonst kommt er bei schnellem Tippen auf langsamen Handys spürbar später.
    // Espresso tippt schneller, als man Tastenklicks einzeln hört: Ton höchstens alle CONFIG.espresso.soundGapMs
    if (!auto || now - lastAutoSound >= CONFIG.espresso.soundGapMs) {
      ctx.sfx.tap();
      if (auto) lastAutoSound = now;
    }

    // Eingabezeile: jede Taste (auch Enter) tippt weiter, Alt+F4 verwirft das Ticket; gezeichnet wird einmal am Ende
    work.batch(() => {
      if (def === 'F4') {
        closeTool(); // Fenster zu, Ticket weg
        gag('F4', 'warn', ALTF4_LINES, now);
      } else {
        if (def === 'CAPSLOCK') gag('CAPSLOCK', 'info', PANIC_LINES, now);
        work.typeMore(progress);
      }
      work.afterKey();
    });

    // Effekte: Tickets gibt es erst beim Lösen; pro Taste nur ab und zu ein Schnipsel
    // Espresso: höchstens alle CONFIG.espresso.scrapGapMs einer, egal wie schnell er tippt
    if (auto ? now - lastAutoScrap >= CONFIG.espresso.scrapGapMs && Math.random() < 0.5 : Math.random() < 0.25) {
      if (auto) lastAutoScrap = now;
      const k = fx.rel(keyEl, true);
      fx.scrap(k.x + k.w / 2, k.y + 6);
    }
    lastHit = now;
    if (!solvedNow && !auto) ctx.haptic('tap');
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
    fitBubble();
    showCall(chooseCall());
    scheduleUrgent(firstUrgentDelay());
    scheduleCup();
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
    clearGhosts();
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
  /** Hinweis vom Vorgänger hängt: Tastatur tippt nicht, das Post-it wackelt (erst lesen und bestätigen) */
  const heldByHint = () => {
    const note = hintShowing();
    // nur wackeln (additiv: die Schräglage bleibt), nicht blinken
    if (note) juice(note, SHAKE, 300, true);
    return !!note;
  };
  keyboardWrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (heldByHint()) {
      e.preventDefault();
      return;
    }
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
    if (typing(e) || gameBlocked({ ignoreLogin: true })) return;
    if (heldByHint()) return;
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
    /** Monitor ist an: Desktop mit Apps; open = Werkzeug gleich öffnen, sonst mit dem ersten Anschlag */
    start(open: boolean) {
      ready = true;
      lastBusy = performance.now();
      if (open) {
        // ohne Anmeldung gestartet (Testumgebung): dann gilt sie als erledigt
        markLoggedIn(ctx.state);
        openTool();
      } else if (needsLogin(ctx.state)) login.show(ctx.state.prestige.jobs === 0 ? 'first' : 'job');
      else if (needsOsLogin(ctx.state)) login.show('os');
    },
    /** neue Minute: Uhr auf dem Anmeldebildschirm */
    clockTick: () => login.tick(),
    /** Optik ist umgesprungen (Neustart): offene Anmeldung neu beschriften */
    osShown() {
      if (login.active()) login.relabel();
    },
    /** Anmeldebildschirm (liegt im Monitor über dem Desktop) */
    loginEl: login.el,
    /** Upgrades an der Tastatur sichtbar machen */
    render(s: GameState) {
      setFlag(keyboardWrap, 'mech', !!s.upgrades.keyboard);
      // Telefon-Upgrades: eingebauter Anrufbeantworter, Headset statt Hörer
      setFlag(phone, 'has-am', !!s.upgrades.answering);
      setFlag(phone, 'has-headset', !!s.upgrades.headset);
      // Hinweis, wo getippt wird: erst, wenn niemand von selbst draufkommt (HINT_DELAY_MS ohne Anschlag),
      // für Neulinge auch nach längerer Pause; bei aus-Monitor nie (dann zeigt power.ts auf den Knopf)
      // Incident, Dialog (Pager, Bericht), App-Fenster oder Hinweis: man arbeitet ja gerade, nur nicht an der Tastatur.
      // So lange zählt die Zeit ohne Anschlag nicht (sonst kommen danach sofort Memes und die Serie reißt)
      if (gameBlocked({ ignoreLogin: true }) || hintShowing()) lastBusy = performance.now();
      const idle = performance.now() - Math.max(lastHit, lastBusy);
      const app = keyboardWrap.parentElement;
      const on = !app?.classList.contains('screen-off');
      const awaitTool = on && ready && !toolOpen;
      const invite =
        on && ready && (awaitTool ? idle > HINT_DELAY_MS : s.clicks < HINT_UNTIL_CLICKS && idle > (s.clicks < 3 ? HINT_DELAY_MS : HINT_IDLE_MS));
      setText(hint, login.active() ? LOGIN.keyHint : awaitTool ? (opened ? NEXT_TOOL_HINT : TOOL_HINT) : TAP_HINT);
      if (hint.hidden === invite) hint.hidden = !invite;
      setFlag(keyboardWrap, 'inviting', invite);
      // während der Anmeldung keine Memes (sonst öffnet danach das erste Ticket mit Memes)
      if (started && !login.active()) work.idle(idle);
      // Espresso: solange eine Taste gehalten wird, tippt es von selbst (Takt aus CONFIG.espresso.rate)
      const espresso = espressoActive(s);
      const now = performance.now();
      // Alt+F4 verwirft Tickets, das tippt nicht von selbst; zwei Daumen (auch auf einer Taste) tippen doppelt so schnell
      const holding = espresso && held.size ? [...held.keys()].filter((k) => k.dataset.key !== 'F4').slice(-2) : [];
      // gleiche Sperren wie beim Tippen mit der echten Tastatur
      if (holding.length && !gameBlocked() && !hintShowing()) {
        const thumbs = Math.min(2, holding.reduce((n, k) => n + (held.get(k) ?? 1), 0));
        // Melodie im Takt: ein Daumen mit Bass, zwei Daumen schneller mit zweiter Stimme und Schlagzeug
        // nur, wenn wirklich getippt wird (nach Alt+F4 ist das Werkzeug zu, dann schweigt sie)
        if (toolOpen) {
          espressoMelody ??= pick(MELODIES);
          ctx.sfx.melody(espressoMelody, thumbs >= 2 ? 2 : 1);
          lastMelodyAt = now;
        } else ctx.sfx.stopMelody();
        autoAcc += Math.min(0.25, (now - autoLast) / 1_000) * CONFIG.espresso.rate * thumbs;
        // alle Anschläge dieses Bilds zählen, gezeichnet wird einmal
        if (autoAcc >= 1)
          work.batch(() => {
            for (; autoAcc >= 1; autoAcc--) hit(holding[Math.floor(autoAcc) % holding.length]!, true);
          });
        // man sieht, wie schnell er tippt: laufend geht eine andere Taste kurz runter
        // (eigene Klasse nur mit transform/Farbe: .down ändert das Padding und würde die Tastatur neu vermessen)
        if (now - lastGhost >= CONFIG.espresso.ghostEveryMs) {
          lastGhost = now;
          const k = allKeys[Math.floor(Math.random() * allKeys.length)]!;
          if (!held.has(k) && !k.classList.contains('ghost')) {
            k.classList.add('ghost');
            ghosts.push([k, now + CONFIG.espresso.ghostDownMs]);
          }
        }
        espressoHint.hidden = true;
      } else {
        autoAcc = 0;
        // kurz loslassen (Daumen wechseln) hält die Melodie nicht an, erst eine echte Pause
        if (now - lastMelodyAt > MELODY_GRACE_MS) ctx.sfx.stopMelody();
        if (!espresso) espressoHint.hidden = true;
      }
      autoLast = now;
      clearGhosts(now);
      if (anyKey) {
        setText(anyKey, s.upgrades.macro ? 'Makro' : 'Any');
        setFlag(anyKey, 'key-macro', !!s.upgrades.macro);
      }
    },
  };
}
