import { CONFIG, GENERATORS } from '../config';
import { DUCK_LINES, INCIDENT_SIGN, MOUSE_LINES, POSTITS } from '../content/props';
import { bus } from '../core/bus';
import { incidentRunning, isSolved } from '../core/incidents';
import type { GameState } from '../core/state';
import { pick } from '../util';
import type { AppContext } from './app';
import { h, juice, POP, setFlag, setText, SHAKE } from './dom';

const svg = (markup: string, cls: string, tag: 'div' | 'button' = 'div'): HTMLElement => {
  const el = h(tag, { class: cls, 'aria-hidden': tag === 'div' ? 'true' : undefined });
  el.innerHTML = markup;
  return el;
};

// Kleine Comic-Zeichnungen: dunkle Kontur, runde Enden, Pastellflächen.
const INK = 'stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"';

const PLANT = `<svg viewBox="0 0 44 56">
  <g class="leaves" ${INK}>
    <path class="leaf l1" d="M22 30 C14 26 10 18 12 12 C20 14 23 22 22 30Z" fill="#7ccf8e"/>
    <path class="leaf l2" d="M22 30 C30 26 34 18 32 12 C24 14 21 22 22 30Z" fill="#8edb9f"/>
    <path class="leaf l3" d="M22 28 C20 20 21 10 24 4 C28 12 26 22 22 28Z" fill="#6cc57f"/>
    <path class="leaf l4" d="M21 32 C12 32 5 28 3 22 C11 20 18 25 21 32Z" fill="#8edb9f"/>
    <path class="leaf l5" d="M23 32 C32 32 39 28 41 22 C33 20 26 25 23 32Z" fill="#7ccf8e"/>
  </g>
  <path d="M11 32 h22 l-3 20 a2 2 0 0 1 -2 2 h-12 a2 2 0 0 1 -2 -2Z" fill="#e8956b" ${INK}/>
  <rect x="9" y="30" width="26" height="6" rx="2" fill="#f0a77e" ${INK}/>
</svg>`;

const MUG = `<svg viewBox="0 0 44 48">
  <g class="steam" fill="none" stroke="var(--ink-soft)" stroke-width="2" stroke-linecap="round">
    <path d="M14 14 c-3 -4 3 -6 0 -11"/><path d="M21 14 c-3 -4 3 -6 0 -11"/><path d="M28 14 c-3 -4 3 -6 0 -11"/>
  </g>
  <path d="M32 24 h4 a6 6 0 0 1 0 12 h-4" fill="none" stroke="var(--ink)" stroke-width="3"/>
  <path d="M8 18 h26 v22 a6 6 0 0 1 -6 6 h-14 a6 6 0 0 1 -6 -6Z" fill="#fffaf0" ${INK}/>
  <path d="M15 28 c0 -3 4 -3 4 0 c0 -3 4 -3 4 0 c0 3 -4 5 -4 6 c0 -1 -4 -3 -4 -6Z" fill="#ff8fa3"/>
  <ellipse cx="21" cy="18" rx="13" ry="2.5" fill="#8a5a3c" ${INK}/>
</svg>`;

const DUCK = `<svg viewBox="0 0 48 42">
  <path d="M6 26 c0 -8 8 -11 16 -9 c2 -9 16 -10 18 0 c1 6 -3 9 -6 10 c6 1 8 4 6 8 c-3 5 -14 6 -22 5 c-8 -1 -12 -6 -12 -14Z" fill="#ffd84d" ${INK}/>
  <path d="M39 17 c4 -1 8 0 8 2 c0 2 -4 3 -8 2Z" fill="#ff9b42" ${INK}/>
  <circle cx="33" cy="14" r="2" fill="var(--ink)"/>
  <circle cx="33.6" cy="13.4" r=".6" fill="#fff"/>
  <path d="M14 27 c4 4 10 4 14 0" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** Anrufbeantworter mit Kassette und blinkender LED */
const ANSWERING = `<svg viewBox="0 0 52 34">
  <rect x="2" y="8" width="48" height="24" rx="5" fill="#d9d0e8" ${INK}/>
  <rect x="8" y="13" width="20" height="12" rx="2" fill="#4b4453" ${INK}/>
  <circle cx="14" cy="19" r="2.5" fill="#d9d0e8"/><circle cx="22" cy="19" r="2.5" fill="#d9d0e8"/>
  <circle class="am-led" cx="40" cy="15" r="3" fill="#ff5b5b" ${INK}/>
  <rect x="34" y="22" width="12" height="4" rx="2" fill="#fffaf0" ${INK}/>
  <path d="M10 8 c0 -6 32 -6 32 0" fill="none" stroke="var(--ink)" stroke-width="3"/>
</svg>`;

/** Zweiter Monitor: kleiner Flachbildschirm, Stack Overflow offen */
const MONITOR2 = `<svg viewBox="0 0 56 44">
  <rect x="2" y="2" width="52" height="32" rx="4" fill="#3a3f4b" ${INK}/>
  <rect x="7" y="7" width="42" height="22" rx="2" fill="#fff6ea"/>
  <rect x="10" y="10" width="14" height="3" rx="1" fill="#f48024"/>
  <rect x="10" y="16" width="34" height="2" rx="1" fill="#c9c1b6"/>
  <rect x="10" y="20" width="28" height="2" rx="1" fill="#c9c1b6"/>
  <rect x="10" y="24" width="18" height="2" rx="1" fill="#9be3c1"/>
  <path d="M24 34 h8 l3 8 h-14Z" fill="#3a3f4b" ${INK}/>
</svg>`;

/** RTFM: dickes Handbuch, nie aufgeschlagen */
const BOOK = `<svg viewBox="0 0 52 22">
  <rect x="2" y="3" width="48" height="16" rx="3" fill="#a0c4ff" ${INK}/>
  <rect x="6" y="6" width="40" height="10" rx="2" fill="#fffaf0" ${INK}/>
  <text x="26" y="14.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="8" font-weight="700" fill="var(--ink)">RTFM</text>
</svg>`;

/** Kanban-Board: „Todo“, „Doing“, „Brennt“ – alles in „Brennt“ */
const KANBAN = `<svg viewBox="0 0 60 44">
  <rect x="2" y="2" width="56" height="40" rx="4" fill="#fffaf0" ${INK}/>
  <path d="M20 6 v32 M40 6 v32" stroke="var(--ink-soft)" stroke-width="1.5" stroke-dasharray="2 2"/>
  <rect x="6" y="9" width="10" height="8" fill="#ffd166" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="25" y="9" width="10" height="8" fill="#a0c4ff" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="44" y="7" width="10" height="8" fill="#ff9aa2" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="45" y="17" width="10" height="8" fill="#ff9aa2" stroke="var(--ink)" stroke-width="1.2" transform="rotate(6 50 21)"/>
  <rect x="43" y="27" width="10" height="8" fill="#ff9aa2" stroke="var(--ink)" stroke-width="1.2" transform="rotate(-5 48 31)"/>
  <path d="M47 39 c1 -3 3 -3 2 -6 c3 2 3 4 2 6Z" fill="#ff9b42"/>
</svg>`;

/** Monitoring-Rundumleuchte: grün, bei Incident rot */
const BEACON = `<svg viewBox="0 0 30 30">
  <path class="beacon-dome" d="M6 22 v-8 a9 9 0 0 1 18 0 v8Z" ${INK}/>
  <path d="M10 12 a5 5 0 0 1 4 -4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  <rect x="3" y="22" width="24" height="6" rx="2" fill="#4b4453" ${INK}/>
</svg>`;

const CABLE_COLORS = ['#ff9aa2', '#a0c4ff', '#ffd166', '#9be3c1', '#cdb4db', '#f4a261', '#90e0ef'];
const CABLES = `<svg viewBox="0 0 300 60" preserveAspectRatio="none">
  ${CABLE_COLORS.map((c, i) => {
    const x = 40 + i * 32;
    const sag = 20 + ((i * 17) % 30);
    return `<path class="cable c${i + 1}" d="M${x} 0 C${x - 30} ${sag} ${x + 40} ${sag + 10} ${x + (i % 2 ? 25 : -25)} 60" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  }).join('')}
</svg>`;

/** Maus auf Mauspad, Kabel läuft nach oben zum Monitor */
const MOUSE = `<svg viewBox="0 0 40 46">
  <path d="M20 14 c0 -6 -2 -9 4 -12" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
  <rect x="2" y="16" width="36" height="28" rx="6" fill="#a0c4ff" stroke="var(--ink)" stroke-width="2"/>
  <path d="M12 26 a8 8 0 0 1 16 0 v8 a8 8 0 0 1 -16 0Z" fill="#fffaf0" stroke="var(--ink)" stroke-width="2.2"/>
  <path d="M20 18 v8 M12 27 h16" stroke="var(--ink)" stroke-width="1.6"/>
  <rect class="wheel" x="18.6" y="20" width="2.8" height="4.5" rx="1.4" fill="var(--ink)"/>
</svg>`;

/** Upgrade → Gegenstand, der beim Kauf auftaucht */
type UpgradeProp = { upgrade: string; el: HTMLElement };

/** Requisiten am Schreibtisch: kleine Gags, Upgrades zum Anfassen, Spielstand im Bild. */
export function createProps(ctx: AppContext) {
  const { state } = ctx;

  // --- Schild an der Wand: Minuten ohne Incident ---
  let lastIncident = performance.now();
  // Kleines Whiteboard: Zahl in rotem Marker, darunter die Ablage mit Stift
  const signValue = h('span', { class: 'sign-value', text: '0' });
  const signOld = h('span', { class: 'sign-old', 'aria-hidden': 'true' });
  const incidentSign = h('div', { class: 'whiteboard incident-sign', title: INCIDENT_SIGN }, [
    h('span', { class: 'sign-row' }, [signOld, signValue]),
    h('span', { class: 'sign-label', text: INCIDENT_SIGN }),
    h('span', { class: 'wb-tray', 'aria-hidden': 'true' }, [h('span', { class: 'wb-marker' })]),
  ]);
  bus.on('incidentStart', () => {
    // alte Zahl durchstreichen, neu bei 0 anfangen
    signOld.textContent = signValue.textContent;
    incidentSign.classList.remove('reset');
    void incidentSign.offsetWidth;
    incidentSign.classList.add('reset');
    lastIncident = performance.now();
    juice(incidentSign, SHAKE, 400, true);
  });

  // --- Post-its ---
  const notes = [0].map((i) => {
    const el = h('button', { class: `postit postit-${i + 1}`, type: 'button', 'aria-label': 'Post-it umblättern' });
    el.textContent = pick(POSTITS);
    el.addEventListener('click', () => {
      let next = pick(POSTITS);
      while (next === el.textContent || notes.some((n) => n !== el && n.textContent === next)) next = pick(POSTITS);
      el.textContent = next;
      juice(el, SHAKE, 300, true);
      ctx.sfx.tick();
    });
    return el;
  });

  // --- Fortschritt: Pflanze, Kabel ---
  const plant = svg(PLANT, 'prop plant');
  const cables = svg(CABLES, 'prop cables');
  const cableTag = h('span', { class: 'cable-tag', text: 'NICHT AUSSTECKEN' });
  cables.append(cableTag);

  // --- Upgrades zum Anfassen ---
  const mug = svg(MUG, 'prop mug');
  const duck = svg(DUCK, 'prop duck', 'button');
  duck.setAttribute('type', 'button');
  duck.setAttribute('aria-label', 'Gummiente');
  duck.addEventListener('click', () => {
    ctx.sfx.squeak();
    ctx.haptic('tap');
    juice(duck, [{ transform: 'scale(1)' }, { transform: 'scale(1.2, .8)' }, { transform: 'scale(1)' }], 260);
    ctx.log.write('info', pick(DUCK_LINES));
  });
  const answering = svg(ANSWERING, 'prop answering');
  const mouse = svg(MOUSE, 'prop mouse', 'button');
  mouse.setAttribute('type', 'button');
  mouse.setAttribute('aria-label', 'Maus');
  mouse.addEventListener('click', () => {
    ctx.sfx.tick();
    juice(mouse, [{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scale(.96)' }, { transform: 'translateY(0)' }], 160, true);
    ctx.log.write('info', pick(MOUSE_LINES));
  });
  const monitor2 = svg(MONITOR2, 'prop monitor2');
  const book = svg(BOOK, 'prop book');
  const kanban = svg(KANBAN, 'prop kanban');
  const beacon = svg(BEACON, 'prop beacon');

  const owned: UpgradeProp[] = [
    { upgrade: 'coffee', el: mug },
    { upgrade: 'duck', el: duck },
    { upgrade: 'answering', el: answering },
    { upgrade: 'monitor2', el: monitor2 },
    { upgrade: 'rtfm', el: book },
    { upgrade: 'kanban', el: kanban },
    { upgrade: 'monitoring', el: beacon },
    { upgrade: 'undertable-1', el: cableTag },
    // eigener Schreibtisch für den Praktikanten: endlich eine Pflanze
    { upgrade: 'intern-1', el: plant },
    // Admin-Rechte (temporär): das Passwort klebt jetzt am Monitor
    ...notes.map((el) => ({ upgrade: 'intern-2', el })),
  ];
  // Kauf: Gegenstand hüpft auf den Tisch
  bus.on('upgrade', ({ id }) => {
    const p = owned.find((o) => o.upgrade === id);
    if (p) requestAnimationFrame(() => juice(p.el, POP, 420, true));
  });

  let tidyUntil = 0;
  bus.on('incidentResolved', ({ id, score, abandoned }) => {
    if (id === 'patch' && !abandoned && isSolved(score)) tidyUntil = performance.now() + 60_000;
  });

  let lastClick = performance.now();
  bus.on('click', () => (lastClick = performance.now()));

  const render = (s: GameState = state) => {
    const now = performance.now();
    // Schild zählt erst nach dem ruhigen Start
    if (s.clicks < CONFIG.onboardingClicks) {
      lastIncident = now;
      setText(signValue, '–');
    } else setText(signValue, String(Math.floor((now - lastIncident) / 60_000)));

    for (const p of owned) setFlag(p.el, 'owned', !!s.upgrades[p.upgrade]);

    // Pflanze wächst mit dem Fortschritt in diesem Job (1–5 Blätter)
    const stage = Math.max(1, Math.min(5, Math.floor(Math.log10(Math.max(1, s.ticketsTotal)) / 2) + 1));
    if (plant.dataset.stage !== String(stage)) plant.dataset.stage = String(stage);
    setFlag(plant, 'droop', s.buffs.some((b) => b.mult < 1));

    // Kaffee dampft, solange getippt wird
    const idle = (now - lastClick) / 1_000;
    mug.style.setProperty('--steam', Math.max(0.15, 1 - idle / 60).toFixed(2));

    // Monitoring-Leuchte: rot und drehend während eines Incidents
    setFlag(beacon, 'alarm', !!incidentRunning());

    // Kabelsalat: ein Kabel pro Generator-Typ im Bestand
    const n = GENERATORS.filter((g) => s.generators[g.id].owned > 0).length;
    if (cables.dataset.n !== String(n)) cables.dataset.n = String(n);
    setFlag(cables, 'tidy', now < tidyUntil);
  };

  return { incidentSign, notes, plant, cables, mug, duck, mouse, answering, monitor2, book, kanban, beacon, render };
}
