import { CONFIG } from '../config';
import { CALENDAR_LINES, DUCK_LINES, INCIDENT_SIGN, MOUSE_LINES, MOUSE_NEW_LINES, MOUSE_OLD_LINES, MUG_DESIGNS, POSTITS, type MugGen } from '../content/props';
import { bus } from '../core/bus';
import { incidentRunning, isSolved } from '../core/incidents';
import type { GameState } from '../core/state';
import { pick } from '../util';
import type { AppContext } from './app';
import { SQUEAK_PRESS_S } from './audio';
import { h, juice, POP, quip, setFlag, setText, SHAKE } from './dom';

const svg = (markup: string, cls: string, tag: 'div' | 'button' = 'div'): HTMLElement => {
  const el = h(tag, { class: cls, 'aria-hidden': tag === 'div' ? 'true' : undefined });
  el.innerHTML = markup;
  return el;
};

// Kleine Comic-Zeichnungen: dunkle Kontur, runde Enden, Pastellflächen.
const INK = 'stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"';

/** Topfpflanze ganz rechts auf dem Tisch, neben dem Pager; Blätter kommen mit dem Fortschritt dazu */
const PLANT = `<svg viewBox="0 0 90 140">
  <g class="leaves" ${INK}>
    <path class="leaf l4" d="M44 88 C30 72 17 52 19 28 C34 38 44 60 44 88Z" fill="#6cc57f"/>
    <path class="leaf l5" d="M46 88 C60 72 73 52 71 28 C56 38 46 60 46 88Z" fill="#7ccf8e"/>
    <path class="leaf l3" d="M45 92 C37 66 37 34 46 6 C56 34 54 66 45 92Z" fill="#8edb9f"/>
    <path class="leaf l1" d="M45 94 C30 90 13 82 8 66 C24 61 40 74 45 94Z" fill="#7ccf8e"/>
    <path class="leaf l2" d="M45 94 C60 90 77 82 82 66 C66 61 50 74 45 94Z" fill="#8edb9f"/>
  </g>
  <path d="M15 98 h60 l-6 38 a3 3 0 0 1 -3 3 h-42 a3 3 0 0 1 -3 -3Z" fill="#e8956b" ${INK}/>
  <path d="M19 112 h52" stroke="#c97a54" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="11" y="92" width="68" height="10" rx="3" fill="#f0a77e" ${INK}/>
</svg>`;

/** nutzbare Breite für den Aufdruck (Becher ist 37 breit, abzüglich Rand und Rundung) */
const MUG_PRINT_WIDTH = 28;
let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Breite eines Textes in Fredoka fett pro 1 px Schriftgröße; ohne Canvas grob geschätzt */
const textWidthPerPx = (t: string): number => {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return Math.max(3.6, t.length * 0.62);
  measureCtx.font = '700 100px Fredoka, sans-serif';
  return measureCtx.measureText(t).width / 100;
};

/** Becher: schlicht (nur Kaffeemaschine) oder mit Design der zuletzt verbesserten Infrastruktur */
const mugSvg = (body: string, print: [string, string] | null, ink: string) => {
  // Aufdruck so groß wie möglich, aber mit Rand auf der Becherfläche (echte Textbreite statt Zeichenzahl)
  const size = (t: string, max: number) => Math.min(max, MUG_PRINT_WIDTH / textWidthPerPx(t)).toFixed(2);
  const text = print
    ? `<text x="25.5" y="35" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="${size(print[0], 7.5)}" font-weight="700" fill="var(--ink)">${print[0]}</text>
  <text x="25.5" y="45" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="${size(print[1], 8.5)}" font-weight="700" fill="${ink}">${print[1]}</text>`
    : '';
  return `<svg viewBox="0 0 56 60">
  <defs><linearGradient id="mug-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#f2c14e"/><stop offset="1" stop-color="#c9902a"/></linearGradient></defs>
  <g class="steam" fill="none" stroke="var(--ink-soft)" stroke-width="2.2" stroke-linecap="round">
    <path d="M17 16 c-3 -4 3 -6 0 -11"/><path d="M26 16 c-3 -4 3 -6 0 -11"/><path d="M35 16 c-3 -4 3 -6 0 -11"/>
  </g>
  <path d="M43 28 h4 a8 8 0 0 1 0 16 h-4" fill="none" stroke="var(--ink)" stroke-width="3.5"/>
  <path d="M7 20 h37 v30 a8 8 0 0 1 -8 8 h-21 a8 8 0 0 1 -8 -8Z" fill="${body}" ${INK}/>
  <ellipse cx="25.5" cy="20" rx="18.5" ry="3" fill="#8a5a3c" ${INK}/>
  ${text}
</svg>`;
};

const DUCK = `<svg viewBox="0 0 48 42">
  <path d="M6 26 c0 -8 8 -11 16 -9 c2 -9 16 -10 18 0 c1 6 -3 9 -6 10 c6 1 8 4 6 8 c-3 5 -14 6 -22 5 c-8 -1 -12 -6 -12 -14Z" fill="#ffd84d" ${INK}/>
  <path d="M39 17 c4 -1 8 0 8 2 c0 2 -4 3 -8 2Z" fill="#ff9b42" ${INK}/>
  <circle cx="33" cy="14" r="2" fill="var(--ink)"/>
  <circle cx="33.6" cy="13.4" r=".6" fill="#fff"/>
  <path d="M14 27 c4 4 10 4 14 0" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** RTFM: dickes Handbuch, nie aufgeschlagen */
const BOOK = `<svg viewBox="0 0 52 22">
  <rect x="2" y="3" width="48" height="16" rx="3" fill="#a0c4ff" ${INK}/>
  <rect x="6" y="6" width="40" height="10" rx="2" fill="#fffaf0" ${INK}/>
  <text x="26" y="14.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="8" font-weight="700" fill="var(--ink)">RTFM</text>
</svg>`;

/** Kanban-Board: „Todo“, „Doing“, „Brennt“ – alles in „Brennt“ */
/** Monitoring-Rundumleuchte: grün, bei Incident rot */
const BEACON = `<svg viewBox="0 0 30 30">
  <path class="beacon-dome" d="M6 22 v-8 a9 9 0 0 1 18 0 v8Z" ${INK}/>
  <path d="M10 12 a5 5 0 0 1 4 -4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  <rect x="3" y="22" width="24" height="6" rx="2" fill="#4b4453" ${INK}/>
</svg>`;

const CABLE_COLORS = ['#ff9aa2', '#a0c4ff', '#ffd166', '#9be3c1', '#cdb4db', '#f4a261', '#90e0ef'];
/**
 * Steckdosenleiste vor dem Monitorfuß, erst mit dem Server unterm Tisch: pro Server steckt ein farbiger Stecker,
 * sein Kabel verschwindet wild durcheinander hinter dem Monitor. Aufgeräumt (nach gutem Patch-Spiel):
 * gerade nach oben, mit Kabelbinder gebündelt.
 */
const CABLE_SOCKET_X = CABLE_COLORS.map((_, i) => 26 + i * 21);
const CABLES = `<svg viewBox="0 12 200 22" preserveAspectRatio="xMidYMax meet">
  <rect x="10" y="20" width="180" height="12" rx="3" fill="#f4f1ea" ${INK}/>
  <path d="M13 29.5 h174" stroke="#d9d2c4" stroke-width="1.5" stroke-linecap="round"/>
  ${CABLE_SOCKET_X.map((x) => `<circle cx="${x}" cy="26" r="4" fill="#e3ddd1" stroke="var(--ink)" stroke-width="1.2"/><circle cx="${x - 1.5}" cy="26" r=".8" fill="var(--ink)"/><circle cx="${x + 1.5}" cy="26" r=".8" fill="var(--ink)"/>`).join('')}
  <rect x="174" y="22.5" width="11" height="7" rx="1.5" fill="#ff7b7b" stroke="var(--ink)" stroke-width="1.4"/>
  <path d="M177.3 24 v4" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
  <circle cx="181.7" cy="26" r="1.5" fill="none" stroke="#fff" stroke-width="1"/>
  <g class="cords">
  ${CABLE_COLORS.map((c, i) => {
    const x = CABLE_SOCKET_X[i]!;
    // sichtbar sind nur ein paar Pixel über dem Stecker, dann verschwinden die Kabel hinter dem Monitor:
    // wild = Schlenker zur Seite über die Nachbarn, ordentlich = gerade hoch, mit Kabelbinder quer drüber
    const swing = (i % 2 ? 1 : -1) * (12 + ((i * 7) % 10));
    const messy = `M${x} 20 C${x} 15 ${x + swing} 18 ${x + swing} 11`;
    const tidy = `M${x} 20 V11`;
    const cord = (d: string, cls: string) =>
      `<path class="${cls}" d="${d}" fill="none" stroke="var(--ink)" stroke-width="5.2" stroke-linecap="round"/><path class="${cls}" d="${d}" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>`;
    return `<g class="cable c${i + 1}">${cord(messy, 'cord-messy')}${cord(tidy, 'cord-tidy')}<rect x="${x - 5}" y="18.5" width="10" height="9.5" rx="2" fill="${c}" ${INK}/><path d="M${x - 2.5} 21.5 h5" stroke="var(--ink)" stroke-width="1" stroke-linecap="round" opacity=".45"/><rect class="cable-tie" x="${x - 10.5}" y="13.2" width="21" height="2.8" fill="#3b3540"/></g>`;
  }).join('')}
  </g>
</svg>`;

/**
 * Maus im Tastatur-Stil: dicke Kontur, Tastenkappen-Kante unten.
 * Ohne Upgrade die alte kastige Büromaus (grau wie die Gummitastatur),
 * mit Upgrade die runde ergonomische (cremefarben, Mint wie die Enter-Taste).
 */
const MOUSE = `<svg viewBox="0 -21 40 84">
  <g class="pad">
    <rect x="1.5" y="-10" width="60" height="70" rx="7" fill="#7fa6e6"/>
    <rect x="1.5" y="-10" width="60" height="67.5" rx="7" fill="#a0c4ff"/>
    <rect x="1.5" y="-10" width="60" height="70" rx="7" fill="none" stroke="var(--ink)" stroke-width="2"/>
    <path d="M6 53 h10" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  </g>
  <!-- Mauskörper im Maßstab der Tastatur (1,75-fach); Mauspad ragt rechts aus dem Bild; Konturen per CSS nicht mitskaliert -->
  <g class="m-body" transform="translate(21 25) scale(1.75) translate(-20 -26.5)">
  <path class="m-cable" d="M20 14 c0 -6 -2 -9 4 -12" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
  <g class="m-old">
    <rect x="10.5" y="14" width="19" height="26" rx="3.5" fill="#cfc7b8"/>
    <rect x="10.5" y="14" width="19" height="23.5" rx="3.5" fill="#f1ede6"/>
    <path class="mbtn mbtn-l" d="M10.5 24 v-6.5 a3.5 3.5 0 0 1 3.5 -3.5 h6 v10Z"/>
    <path class="mbtn mbtn-r" d="M20 14 h6 a3.5 3.5 0 0 1 3.5 3.5 v6.5 h-9.5Z"/>
    <path d="M10.5 24 h19 M20 14 v10" stroke="var(--ink)" stroke-width="2.1"/>
    <rect x="10.5" y="14" width="19" height="26" rx="3.5" fill="none" stroke="var(--ink)" stroke-width="3"/>
  </g>
  <g class="m-ergo">
    <path d="M20 12.5 c6.5 0 9.5 4.5 9.5 10.5 v8 c0 6 -4 9.5 -9.5 9.5 c-5.5 0 -9.5 -3.5 -9.5 -9.5 v-8 c0 -6 3 -10.5 9.5 -10.5Z" fill="var(--key-edge)"/>
    <path d="M20 12.5 c6.5 0 9.5 4.5 9.5 10.5 v6 c0 6 -4 9 -9.5 9 c-5.5 0 -9.5 -3 -9.5 -9 v-6 c0 -6 3 -10.5 9.5 -10.5Z" fill="var(--key)"/>
    <path class="mbtn mbtn-l" d="M10.5 23.5 c0 -6 3 -10.5 9.5 -10.5 v10.5Z"/>
    <path class="mbtn mbtn-r" d="M20 13 c6.5 0 9.5 4.5 9.5 10.5 h-9.5Z"/>
    <path d="M10.5 31 c-2 -1 -2.5 -6 0 -7" fill="var(--mint)" stroke="var(--ink)" stroke-width="2.1"/>
    <path d="M10.5 23.5 h19 M20 12.5 v11" stroke="var(--ink)" stroke-width="2.1"/>
    <path d="M20 12.5 c6.5 0 9.5 4.5 9.5 10.5 v8 c0 6 -4 9.5 -9.5 9.5 c-5.5 0 -9.5 -3.5 -9.5 -9.5 v-8 c0 -6 3 -10.5 9.5 -10.5Z" fill="none" stroke="var(--ink)" stroke-width="3"/>
  </g>
  <rect class="wheel" x="18.4" y="16" width="3.2" height="5" rx="1.2" stroke="var(--ink)" stroke-width="1.8"/>
  </g>
</svg>`;

/** Club-Mate-artige Flasche: der übernommene Praktikant hat sich eingerichtet */
/** 0,5-l-Flasche Mate: gut doppelt so hoch wie der Becher */
/**
 * Mate, 0,5 l: klares Glas mit kupferfarbenem Inhalt (oben im Hals Luft), blauer Kronkorken,
 * Halsetikett und gelbes Bauchetikett mit blauem Band und rotem Schriftzug; Glanzlicht auf dem Glas.
 */
const MATE_SHAPE = 'M8 5 h4 v12 c0 3.2 5.5 5 5.5 10 v24.5 a2.5 2.5 0 0 1 -2.5 2.5 h-10 a2.5 2.5 0 0 1 -2.5 -2.5 v-24.5 c0 -5 5.5 -6.8 5.5 -10Z';
const MATE = `<svg viewBox="0 0 20 56">
  <defs><clipPath id="mate-glass"><path d="${MATE_SHAPE}"/></clipPath></defs>
  <path d="${MATE_SHAPE}" fill="#eef3ea"/>
  <g clip-path="url(#mate-glass)">
    <rect x="0" y="15" width="20" height="41" fill="#d98a3d"/>
    <rect x="0" y="15" width="20" height="1.6" fill="#f2c27a"/>
    <circle cx="6" cy="49" r=".7" fill="#f6d39a"/><circle cx="13.5" cy="47" r=".55" fill="#f6d39a"/><circle cx="11" cy="51" r=".5" fill="#f6d39a"/>
  </g>
  <path d="M5.2 27 c-.4 6 -.4 18 0 23" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>
  <rect x="7.6" y="9" width="4.8" height="4.6" rx=".6" fill="#ffd84d" stroke="var(--ink)" stroke-width="1"/>
  <rect x="7.6" y="10.6" width="4.8" height="1.4" fill="#3a6fd8"/>
  <rect x="2.5" y="31" width="15" height="15" fill="#ffd84d" stroke="var(--ink)" stroke-width="1.2"/>
  <rect x="2.5" y="31" width="15" height="3.4" fill="#3a6fd8" stroke="var(--ink)" stroke-width="1.2"/>
  <path d="M5 39.5 c1 -1.6 2 1.6 3 0 s2 1.6 3 0 s2 1.6 3 0" fill="none" stroke="#e04848" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M6 43 h8" stroke="var(--ink)" stroke-width=".9" stroke-linecap="round" opacity=".6"/>
  <path d="${MATE_SHAPE}" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
  <rect x="7.2" y="2" width="5.6" height="3.4" rx=".8" fill="#3a6fd8" stroke="var(--ink)" stroke-width="1.4"/>
  <path d="M8.4 5.4 v-1 M10 5.4 v-1 M11.6 5.4 v-1" stroke="var(--ink)" stroke-width=".7"/>
</svg>`;

/** Staubmaus unterm Tisch, bis der Staubsauger kommt */
const DUST = `<svg viewBox="0 0 30 18">
  <path d="M3 16 c-2 -6 2 -10 6 -10 c1 -5 9 -5 11 -1 c5 -1 9 4 7 11Z" fill="#cfc7bd" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="12" cy="11" r="1.4" fill="var(--ink)"/><circle cx="18" cy="11" r="1.4" fill="var(--ink)"/>
</svg>`;

/** Upgrade → Gegenstand, der beim Kauf auftaucht */
type UpgradeProp = { upgrade: string; el: HTMLElement };

/** so lange pfeift das Zusammendrücken der Gummiente */
const SQUEAK_PRESS_MS = SQUEAK_PRESS_S * 1_000;

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
    h('span', { class: 'wb-kanban', 'aria-hidden': 'true' }, [h('span', { class: 'kb-todo' }), h('span', { class: 'kb-doing' }), h('span', { class: 'kb-fire' })]),
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
  // durchgestrichene Zahl nach dem Ausblenden ganz weg, sonst schiebt sie die neue Zahl zur Seite
  signOld.addEventListener('animationend', () => incidentSign.classList.remove('reset'));

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
  const mug = svg(mugSvg('#fffaf0', null, ''), 'prop mug', 'button');
  mug.setAttribute('type', 'button');
  mug.setAttribute('aria-label', 'Kaffeebecher');
  const duck = svg(DUCK, 'prop duck', 'button');
  duck.setAttribute('type', 'button');
  duck.setAttribute('aria-label', 'Gummiente');
  // Quietschen wie echt: Drücken pfeift, Loslassen saugt die Luft zurück (zweites, kürzeres Quietschen)
  // ein Finger (Hauptzeiger, linke Taste) drückt; ein schneller zweiter Tipp verwirft das noch ausstehende Zurücksaugen
  let squeezed = false;
  let squeezedAt = 0;
  let releaseTimer = 0;
  const squeakRelease = (wait: number) => {
    clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => ctx.sfx.squeak('release'), wait);
  };
  duck.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    clearTimeout(releaseTimer);
    squeezed = true;
    squeezedAt = performance.now();
    ctx.sfx.squeak('press');
  });
  // kurz angetippt: das Zurücksaugen erst nach dem Pfeifen, sonst klingen beide übereinander
  const letGo = (e: PointerEvent) => {
    if (!squeezed || !e.isPrimary) return;
    squeezed = false;
    squeakRelease(Math.max(0, SQUEAK_PRESS_MS - (performance.now() - squeezedAt)));
  };
  duck.addEventListener('pointerup', letGo);
  duck.addEventListener('pointercancel', letGo);
  duck.addEventListener('pointerleave', letGo);
  duck.addEventListener('click', (e) => {
    // Tastatur (Enter/Leertaste): beides hintereinander
    if (e.detail === 0) {
      ctx.sfx.squeak('press');
      squeakRelease(SQUEAK_PRESS_MS);
    }
    ctx.haptic('tap');
    juice(duck, [{ transform: 'scale(1)' }, { transform: 'scale(1.2, .8)' }, { transform: 'scale(1)' }], 260);
    const line = pick(DUCK_LINES);
    ctx.log.write('info', line);
    quip(duck, line);
  });
  const mouse = svg(MOUSE, 'prop mouse', 'button');
  mouse.setAttribute('type', 'button');
  mouse.setAttribute('aria-label', 'Maus');
  // Antippen zählt als Ticket (das macht die Tastatur-Tippfläche); hier nur Klick-Optik und ab und zu ein Spruch
  let lastMouseLine = -Infinity;
  // Antippen drückt die Maustaste auf der getroffenen Seite
  let clickTimer = 0;
  mouse.addEventListener('pointerdown', (e) => {
    const r = mouse.getBoundingClientRect();
    const side = e.clientX < r.left + r.width / 2 ? 'click-l' : 'click-r';
    mouse.classList.remove('click-l', 'click-r');
    mouse.classList.add(side);
    clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => mouse.classList.remove(side), 110);
    const now = performance.now();
    if (now - lastMouseLine > 30_000) {
      lastMouseLine = now;
      // Kugel nur bei der alten Maus, Akku nur bei der ergonomischen (Funk-)Maus
      const line = pick([...MOUSE_LINES, ...(ctx.state.upgrades.mouse ? MOUSE_NEW_LINES : MOUSE_OLD_LINES)]);
      ctx.log.write('info', line);
      quip(mouse, line);
    }
  });
  // Mauspad und ergonomische Maus: Upgrades, die man am Tisch sieht
  bus.on('upgrade', ({ id }) => {
    if (id === 'mouse' || id === 'mousepad') requestAnimationFrame(() => juice(mouse, POP, 420, true));
  });
  // Becher-Design: die zuletzt verbesserte Infrastruktur bestimmt den Becher (Stufe 1 weiß, 2 farbig, 3 golden)
  const MUG_GENS = Object.keys(MUG_DESIGNS) as MugGen[];
  const tierOf = (gen: MugGen) => [3, 2, 1].find((t) => state.upgrades[`${gen}-${t}`]) ?? 0;
  // nach dem Laden: die am weitesten verbesserte (bei Gleichstand die spätere Infrastruktur)
  let mugGen: MugGen | null = null;
  const pickMugGen = () => MUG_GENS.filter((g) => tierOf(g) > 0).sort((a, b) => tierOf(a) - tierOf(b)).pop() ?? null;
  let mugSig = '';
  const drawMug = () => {
    if (mugGen && tierOf(mugGen) === 0) mugGen = null;
    mugGen ??= pickMugGen();
    const tier = mugGen ? tierOf(mugGen) : 0;
    const sig = `${mugGen}-${tier}`;
    if (sig === mugSig) return;
    mugSig = sig;
    if (!mugGen) return void (mug.innerHTML = mugSvg('#fffaf0', null, ''));
    const d = MUG_DESIGNS[mugGen];
    const body = tier === 3 ? 'url(#mug-gold)' : tier === 2 ? d.color : '#fffaf0';
    mug.innerHTML = mugSvg(body, d.prints[tier - 1]!, tier === 1 ? '#d64545' : 'var(--ink)');
  };
  // Aufdruck erst mit geladener Schrift richtig vermessen: danach einmal neu zeichnen
  void document.fonts?.ready.then(() => {
    mugSig = '';
    drawMug();
  });
  const mugQuip = () => {
    if (!mugGen) return quip(mug, 'Kaffee. Schwarz. Wie das Monitoring um 3 Uhr.');
    const d = MUG_DESIGNS[mugGen];
    quip(mug, `${d.title}. ${d.lines[tierOf(mugGen) - 1]}`);
  };
  mug.addEventListener('click', () => {
    mugQuip();
    juice(mug, SHAKE, 300, true);
    ctx.sfx.tick();
  });
  bus.on('upgrade', ({ id }) => {
    const gen = id.split('-')[0] as MugGen;
    if (!MUG_GENS.includes(gen)) return;
    mugGen = gen;
    drawMug();
    if (!state.upgrades.coffee) return;
    requestAnimationFrame(() => {
      juice(mug, POP, 420, true);
      mugQuip();
    });
  });

  // --- Abreißkalender: Antippen reißt das Blatt ab, der nächste Tag (und Spruch) kommt ---
  const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const CAL_AUTO_LINES = [
    'kalender[7]: Blatt fällt von allein ab. Gefühlt war das gerade ein ganzer Tag.',
    'kalender[7]: Ein Tag weniger bis zur Rente. Der Kalender hat es selbst gemerkt.',
    'kalender[7]: Blatt abgefallen. Ursache: Erschöpfung. Des Blatts.',
  ];
  let calOffset = 0;
  let calLine = Math.floor(Math.random() * CALENDAR_LINES.length);
  const calPage = () => {
    const d = new Date(Date.now() + calOffset * 86_400_000);
    return h('span', { class: 'cal-page' }, [
      h('span', { class: 'cal-head' }, [h('b', { text: String(d.getDate()) }), ` ${DAYS[d.getDay()]}`]),
      h('span', { class: 'cal-text', text: CALENDAR_LINES[calLine % CALENDAR_LINES.length]! }),
    ]);
  };
  const calendar = h('button', { class: 'tear-cal', type: 'button', 'aria-label': 'Abreißkalender, Spruch des Tages: nächstes Blatt' }, [calPage()]);
  /** auto = Blatt fällt von selbst (Incident überstanden, Chef-Aufgabe erledigt): so ein Tag fühlt sich wie zwei an */
  const tear = (auto = false) => {
    // das oberste noch hängende Blatt ist das, was man sieht (fallende Blätter sind schon „torn“)
    const hanging = [...calendar.querySelectorAll('.cal-page:not(.torn)')];
    const old = hanging.pop();
    for (const extra of hanging) extra.remove();
    calOffset++;
    calLine++;
    // neues Blatt kommt unter das alte: das alte liegt beim Abreißen obenauf
    if (old) old.before(calPage());
    else calendar.append(calPage());
    if (old) {
      // altes Blatt reißt ab und segelt davon
      old.classList.add('torn');
      setTimeout(() => old.remove(), 600);
    }
    ctx.sfx.tick();
    if (auto) ctx.log.write('info', pick(CAL_AUTO_LINES));
    else ctx.haptic('tap');
    if (calOffset % 7 === 0) ctx.log.write('info', 'kalender[7]: Eine Woche abgerissen. Die Tickets sind trotzdem von heute.');
  };
  calendar.addEventListener('click', () => tear());
  bus.on('incidentResolved', ({ abandoned, score }) => {
    if (!abandoned && isSolved(score)) setTimeout(() => tear(true), 1_500);
  });
  bus.on('bossDone', () => setTimeout(() => tear(true), 1_500));

  const mate = svg(MATE, 'prop mate');
  const dust = svg(DUST, 'prop dust');
  const kNote = h('span', { class: 'k-note', 'aria-hidden': 'true', text: 'Nicht neu starten. —K.' });
  const book = svg(BOOK, 'prop book');
  const beacon = svg(BEACON, 'prop beacon');

  const owned: UpgradeProp[] = [
    { upgrade: 'coffee', el: mug },
    { upgrade: 'duck', el: duck },
    { upgrade: 'rtfm', el: book },
    { upgrade: 'monitoring', el: beacon },
    { upgrade: 'undertable-1', el: cableTag },
    // eigener Schreibtisch für den Praktikanten: endlich eine Pflanze
    { upgrade: 'intern-1', el: plant },
    // Admin-Rechte (temporär): das Passwort klebt jetzt am Monitor
    ...notes.map((el) => ({ upgrade: 'intern-2', el })),
    // Übernahmeangebot: der Praktikant bleibt – und mit ihm die Mate
    { upgrade: 'intern-3', el: mate },
    // Doku gefunden: ein Zettel am Kabel
    { upgrade: 'undertable-3', el: kNote },
  ];
  // Kauf: Gegenstand hüpft auf den Tisch
  bus.on('upgrade', ({ id }) => {
    const p = owned.find((o) => o.upgrade === id);
    if (p) requestAnimationFrame(() => juice(p.el, POP, 420, true));
    if (id === 'kanban') requestAnimationFrame(() => juice(incidentSign, POP, 420, true));
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
    // Kanban-Board: kein eigenes Brett mehr, die Zettel kleben oben am Whiteboard (oben an der Wand ist wenig Platz)
    setFlag(incidentSign, 'has-kanban', !!s.upgrades.kanban);
    setFlag(mouse, 'has-pad', !!s.upgrades.mousepad);
    drawMug();
    // Staubmaus wohnt unterm Tisch, bis der Staubsauger kommt
    setFlag(dust, 'owned', s.generators.undertable.owned > 0 && !s.upgrades['undertable-2']);
    setFlag(mouse, 'ergo', !!s.upgrades.mouse);

    // Pflanze wächst mit dem Fortschritt in diesem Job (1–5 Blätter)
    const stage = Math.max(1, Math.min(5, Math.floor(Math.log10(Math.max(1, s.ticketsTotal)) / 2) + 1));
    if (plant.dataset.stage !== String(stage)) plant.dataset.stage = String(stage);
    setFlag(plant, 'droop', s.buffs.some((b) => b.mult < 1));

    // Kaffee dampft, solange getippt wird
    const idle = (now - lastClick) / 1_000;
    mug.style.setProperty('--steam', Math.max(0.15, 1 - idle / 60).toFixed(2));

    // Monitoring-Leuchte: rot und drehend während eines Incidents
    setFlag(beacon, 'alarm', !!incidentRunning());

    // Steckdosenleiste erst mit dem Server unterm Tisch (der braucht Strom): pro Server ein Stecker, höchstens alle Dosen
    const n = Math.min(CABLE_COLORS.length, s.generators.undertable.owned);
    if (cables.dataset.n !== String(n)) cables.dataset.n = String(n);
    setFlag(cables, 'tidy', now < tidyUntil);
  };

  return { incidentSign, calendar, notes, plant, cables, mug, duck, mouse, mate, dust, kNote, book, beacon, render };
}
