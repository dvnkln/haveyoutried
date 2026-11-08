import { CONFIG } from '../config';
import { CALLBACK_LINES, CALLERS, situationalCalls, type Call } from '../content/callers';
import { URGENT_LABELS, URGENT_TEXT } from '../content/events';
import { ALTF4_LINES, COMBO_LINES, PANIC_LINES, REPLIES_CMD, REPLIES_TEXT, TICKET_PRIOS } from '../content/props';
import { CLOSE_REASONS } from '../content/syslog';
import { clickTicket } from '../core/actions';
import { rates } from '../core/economy';
import { claimUrgent } from '../core/events';
import { incidentRunning } from '../core/incidents';
import { bumpFlag, type GameState } from '../core/state';
import { pick, randInt } from '../util';
import type { AppContext } from './app';
import { h, juice, NUDGE, setFlag, setText } from './dom';
import { formatNumber } from './format';
import type { Fx } from './juice';
import { describeEffect } from './pager';

const PHONE_SVG = `<svg viewBox="0 0 64 58">
  <g class="ring" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round">
    <path d="M5 9 q-3 5 0 10"/><path d="M1 6 q-4 8 0 16"/><path d="M59 9 q3 5 0 10"/><path d="M63 6 q4 8 0 16"/>
  </g>
  <path class="cord" d="M12 22 c-6 2 -2 6 -6 8 c-4 2 0 6 -4 8 c-3 2 1 6 2 8 c1 2 4 3 8 2" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 26 h40 l6 24 a4 4 0 0 1 -4 5 h-44 a4 4 0 0 1 -4 -5Z" fill="#ff9aa2" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M15 30 h34" stroke="#ffc2c8" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="41" r="10" fill="#fffaf0" stroke="var(--ink)" stroke-width="2.2"/>
  <g fill="var(--ink)" opacity=".75">
    <circle cx="32" cy="34.5" r="1.6"/><circle cx="37.6" cy="37.7" r="1.6"/><circle cx="37.6" cy="44.3" r="1.6"/>
    <circle cx="32" cy="47.5" r="1.6"/><circle cx="26.4" cy="44.3" r="1.6"/><circle cx="26.4" cy="37.7" r="1.6"/>
  </g>
  <circle cx="32" cy="41" r="3" fill="#ff9aa2" stroke="var(--ink)" stroke-width="1.6"/>
  <path d="M19 26 v-4 h6 v4 M39 26 v-4 h6 v4" fill="#ff8a94" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
  <g class="handset">
    <path d="M9 18 c0 -9 6 -13 12 -13 h22 c6 0 12 4 12 13 c0 3 -2 5 -5 5 h-5 c-3 0 -4 -2 -4 -4 v-3 h-16 v3 c0 2 -1 4 -4 4 h-5 c-3 0 -5 -2 -5 -5Z" fill="#ff8a94" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 9 h20" stroke="#ffc2c8" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`;

const ticketId = (no: number) => `#INC-${String(no).padStart(6, '0')}`;

/** Ab so vielen Anschlägen in Folge zeigt sich die Combo-Anzeige. */
const COMBO_SHOW = 10;
/** Pause, nach der eine Serie endet. */
const COMBO_GAP_MS = 700;
/** Abstand zwischen zwei Log-Sprüchen derselben Sondertaste */
const GAG_COOLDOWN_MS = 20_000;
/** Bis zu so vielen Klicks erscheint der Tipp-Hinweis bei längerer Pause wieder */
const HINT_UNTIL_CLICKS = 60;
const HINT_IDLE_MS = 20_000;
/** So viele Zeichen der getippten Zeile passen sichtbar ins Terminal */
const TYPED_VISIBLE = 44;

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
 * Der Schreibtisch unter dem Monitor: Anrufer, Tastatur (jede Taste schließt ein Ticket
 * und tippt eine Support-Antwort weiter), Dringend-Tickets als Post-its und die Eingabezeile.
 */
export function createDesk(ctx: AppContext, fx: Fx, root: () => HTMLElement, screen: () => HTMLElement) {
  let call: Call | null = null;
  let callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
  let lastClickLog = 0;
  let callerUntil = 0;
  const recent: string[] = [];
  let combo = 0;
  let lastHit = 0;

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

  // --- Arbeitsfenster: mal Mail, mal Ticketsystem, mal Terminal. Tippen schreibt die Antwort. ---
  type WorkKind = 'mail' | 'ticket' | 'term';
  const KINDS: WorkKind[] = ['mail', 'ticket', 'term'];
  let kind: WorkKind = 'ticket';
  let reply = '';
  let typedLen = 0;
  let taskWho = '';
  let taskSubject = '';
  let taskNo = 0;
  const workTitle = h('span', { class: 'work-title' });
  const workHead = h('div', { class: 'work-head' });
  const promptSlot = h('span', { class: 'typed-prompt', text: '$ ' });
  const typedEl = h('span', { class: 'typed' });
  const last = h('div', { class: 'last-closed', 'aria-live': 'polite' });
  const work = h('div', { class: 'work' }, [
    h('div', { class: 'work-bar' }, [h('span', { class: 'term-dots', 'aria-hidden': 'true' }), workTitle]),
    workHead,
    h('div', { class: 'work-body' }, [promptSlot, typedEl, h('span', { class: 'cursor', text: '▌' })]),
    last,
  ]);
  const showTyped = () => {
    const t = reply.slice(0, typedLen);
    setText(typedEl, t.length > TYPED_VISIBLE * 2 ? `…${t.slice(-TYPED_VISIBLE * 2)}` : t);
  };
  const row = (label: string, value: string, cls = '') =>
    h('div', { class: `work-row ${cls}`.trim() }, [h('span', { class: 'work-key', text: label }), h('span', { class: 'work-val', text: value })]);

  /** Nächste Aufgabe: anderes Programm, Antwort an den aktuellen Anrufer */
  const newTask = () => {
    let next = pick(KINDS);
    if (next === kind && Math.random() < 0.7) next = pick(KINDS.filter((k) => k !== kind));
    kind = next;
    reply = pick(kind === 'term' ? REPLIES_CMD : REPLIES_TEXT);
    typedLen = 0;
    // vor dem ersten Anruf: der Chef wundert sich über die volle Warteschlange
    taskWho = call?.who.replace(/ \(Rückruf\)$/, '') ?? 'Chef';
    const line = call?.line ?? 'Warum ist die Warteschlange so voll?';
    taskSubject = line.length > 42 ? `${line.slice(0, 40)}…` : line;
    taskNo = CONFIG.ticketNumberOffset + ctx.state.clicks + randInt(3, 40);
    work.dataset.kind = kind;
    if (kind === 'mail') {
      setText(workTitle, 'Posteingang (4.812 ungelesen)');
      workHead.replaceChildren(row('An:', taskWho), row('Betreff:', `Re: ${taskSubject}`));
    } else if (kind === 'ticket') {
      setText(workTitle, 'Ticketsystem 3.1 (Legacy)');
      workHead.replaceChildren(
        row(ticketId(taskNo), `Prio: ${pick(TICKET_PRIOS)}`, 'work-ticket'),
        row('Kunde:', taskWho),
        row('Problem:', taskSubject),
      );
    } else {
      setText(workTitle, 'Terminal — bash');
      workHead.replaceChildren(h('div', { class: 'work-comment', text: `# ${taskWho}: ${taskSubject}` }));
    }
    showTyped();
  };

  const sendReply = () => {
    if (typedLen > 0) {
      if (kind === 'mail') ctx.log.write('ok', `mail[25]: Re: ${taskSubject} → ${taskWho}: „${reply}“`);
      else if (kind === 'ticket') ctx.log.write('ok', `ticket[8080]: ${ticketId(taskNo)} kommentiert: „${reply}“`);
      else ctx.log.write('ok', `you@helpdesk:~$ ${reply}`);
    }
    newTask();
  };
  /** Ein Anschlag tippt ein paar Zeichen; mit Textbaustein ganze Wörter. Ende = abschicken. */
  const typeMore = () => {
    if (typedLen >= reply.length) return sendReply();
    const step = ctx.state.upgrades.macro ? randInt(6, 10) : randInt(2, 4);
    typedLen = Math.min(reply.length, typedLen + step);
  };

  // --- Tastatur ---
  const keys = new Map<string, HTMLButtonElement>();
  const keyboard = h('div', { class: 'keyboard', role: 'group', 'aria-label': 'Tastatur: jede Taste schließt ein Ticket' });
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
      'aria-label': 'Ticket schließen',
      style: 'grid-row:2 / span 2;grid-column:56 / span 5',
    },
    [h('span', { class: 'enter-arrow', text: '⏎' }), h('span', { class: 'key-small', text: 'Fix' })],
  );
  enter.dataset.key = 'ENTER';
  keys.set('ENTER', enter);
  keyboard.append(enter);
  const anyKey = keys.get('ANY');
  // Einstieg: Hinweis, dass hier getippt wird (verschwindet nach den ersten Anschlägen)
  const hint = h('div', { class: 'tap-hint', hidden: '', text: 'Tipp drauf! Jede Taste schließt ein Ticket' });
  let i = 0;
  for (const el of keyboard.querySelectorAll<HTMLElement>('.key')) el.style.setProperty('--i', String(i++ % 14));
  const keyboardWrap = h('div', { class: 'keyboard-wrap' }, [hint, keyboard]);

  const fresh = (lines: string[]) => {
    const unused = lines.filter((l) => !recent.includes(l));
    return pick(unused.length > 0 ? unused : lines);
  };

  const chooseCall = (): Call => {
    // Rückruf: gleiche Person, neues Leid
    if (call && Math.random() < CONFIG.callerCallbackChance) {
      return { face: call.face, who: `${call.who.replace(/ \(Rückruf\)$/, '')} (Rückruf)`, line: pick(CALLBACK_LINES) };
    }
    const situational = situationalCalls(ctx.state, new Date()).filter((c) => !recent.includes(c.line));
    if (situational.length > 0 && Math.random() < CONFIG.callerSituationalChance) return pick(situational);

    let caller = pick(CALLERS);
    while (CALLERS.length > 1 && caller.who === call?.who) caller = pick(CALLERS);
    return { face: caller.face, who: caller.who, line: fresh(caller.lines) };
  };

  /** initial = Anrufer beim Seitenstart: kein Klingeln, zählt nicht als angehört */
  const showCall = (c: Call, initial = false) => {
    call = c;
    if (!initial) {
      bumpFlag(ctx.state, 'callers');
      if (c.who.endsWith('(Rückruf)')) bumpFlag(ctx.state, 'callbacks');
    }
    recent.push(c.line);
    if (recent.length > 30) recent.shift();
    setText(face, c.face);
    setText(who, c.who);
    setText(says, c.line);
    callerUntil = performance.now() + CONFIG.callerMinShowMs + c.line.length * CONFIG.callerShowMsPerChar;
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
      ctx.log.write('ok', `helpdesk[1337]: ${URGENT_TEXT[res.effect] ?? 'VIP-Ticket gelöst.'}`);
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
  const gag = (key: string, level: 'info' | 'warn', lines: string[], now: number) => {
    if (now - (lastGag[key] ?? -Infinity) < GAG_COOLDOWN_MS) return;
    lastGag[key] = now;
    ctx.log.write(level, pick(lines));
  };

  const hit = (keyEl: HTMLButtonElement) => {
    const def = keyEl.dataset.key ?? '';
    ctx.sfx.unlock();
    const value = clickTicket(ctx.state);
    const no = CONFIG.ticketNumberOffset + ctx.state.clicks;
    const reason = pick(CLOSE_REASONS);
    setText(last, `${ticketId(no)} → ${reason}`);

    // Eingabezeile: Enter schickt ab, Alt+F4 verwirft, alles andere tippt weiter
    const now = performance.now();
    if (def === 'ENTER') sendReply();
    else if (def === 'F4') {
      newTask(); // Fenster zu, nächste Aufgabe
      gag('F4', 'warn', ALTF4_LINES, now);
    } else {
      if (def === 'CAPSLOCK') gag('CAPSLOCK', 'info', PANIC_LINES, now);
      typeMore();
    }
    showTyped();

    // Effekte: Zahl steigt von der Taste auf, ab und zu ein Schnipsel
    const k = fx.rel(keyEl, true);
    const x = k.x + k.w / 2;
    fx.floater(x, k.y, `+${formatNumber(value, value < 10 && value % 1 !== 0 ? 1 : 0)}`);
    if (Math.random() < 0.18) fx.scrap(x, k.y + 6);

    combo = now - lastHit < COMBO_GAP_MS ? combo + 1 : 1;
    lastHit = now;
    if (combo >= COMBO_SHOW) fx.combo(combo, COMBO_LINES[combo]);

    ctx.sfx.tap();
    ctx.haptic('tap');
    if (now - lastClickLog > CONFIG.clickLogMinMs) {
      lastClickLog = now;
      ctx.log.write('info', `helpdesk[1337]: ${ticketId(no)} closed (${reason})`);
    }
    // Ruhiger Start: erst ein bisschen tippen, dann klingelt zum ersten Mal das Telefon
    if (!started) {
      if (ctx.state.clicks >= CONFIG.onboardingClicks) begin();
      return;
    }
    // Wechsel erst nach genug Tickets UND genug Lesezeit
    if (--callerLeft <= 0 && now >= callerUntil) showCall(chooseCall());
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
    work,
    /** Platz für den Prompt (root@firma:~$) vor dem Getippten im Terminal */
    promptSlot,
    start() {
      newTask();
      setText(last, 'Warteschlange: voll. Wie immer.');
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
      // Neulinge: am Anfang und nach längerer Pause zeigen, wo getippt wird
      const idle = performance.now() - lastHit;
      const invite = s.clicks < HINT_UNTIL_CLICKS && (s.clicks < 3 || idle > HINT_IDLE_MS);
      if (hint.hidden === invite) hint.hidden = !invite;
      setFlag(keyboardWrap, 'inviting', invite);
      if (anyKey) {
        setText(anyKey, s.upgrades.macro ? 'Makro' : 'Any');
        setFlag(anyKey, 'key-macro', !!s.upgrades.macro);
      }
    },
  };
}
