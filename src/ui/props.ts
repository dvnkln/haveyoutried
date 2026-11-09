import { CONFIG, GENERATORS } from '../config';
import { CALENDAR_LINES, DUCK_LINES, INCIDENT_SIGN, MOUSE_LINES, MUG_DESIGNS, POSTITS, type MugGen } from '../content/props';
import { bus } from '../core/bus';
import { incidentRunning, isSolved } from '../core/incidents';
import type { GameState } from '../core/state';
import { pick } from '../util';
import type { AppContext } from './app';
import { h, juice, POP, quip, setFlag, setText, SHAKE } from './dom';

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

/** Becher: schlicht (nur Kaffeemaschine) oder mit Design der zuletzt verbesserten Infrastruktur */
const mugSvg = (body: string, print: [string, string] | null, ink: string) => {
  // lange Aufdrucke etwas kleiner, damit sie auf den Becher passen
  const size = (t: string, max: number) => Math.min(max, 64 / Math.max(6, t.length)).toFixed(1);
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
const CABLES = `<svg viewBox="0 0 300 60" preserveAspectRatio="none">
  ${CABLE_COLORS.map((c, i) => {
    const x = 40 + i * 32;
    const sag = 20 + ((i * 17) % 30);
    return `<path class="cable c${i + 1}" d="M${x} 0 C${x - 30} ${sag} ${x + 40} ${sag + 10} ${x + (i % 2 ? 25 : -25)} 60" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  }).join('')}
</svg>`;

/**
 * Maus im Tastatur-Stil: dicke Kontur, Tastenkappen-Kante unten.
 * Ohne Upgrade die alte kastige Büromaus (grau wie die Gummitastatur),
 * mit Upgrade die runde ergonomische (cremefarben, Mint wie die Enter-Taste).
 */
const MOUSE = `<svg viewBox="0 -10 40 64">
  <g class="pad">
    <rect x="1.5" y="3" width="37" height="49.5" rx="7" fill="#7fa6e6"/>
    <rect x="1.5" y="3" width="37" height="47" rx="7" fill="#a0c4ff"/>
    <rect x="1.5" y="3" width="37" height="49.5" rx="7" fill="none" stroke="var(--ink)" stroke-width="2"/>
    <path d="M6 46 h10" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  </g>
  <!-- Mauskörper 1,45-fach (neben der Tastatur sonst zu winzig); Konturen per CSS nicht mitskaliert, daher in Bildschirm-Pixeln -->
  <g class="m-body" transform="translate(20 26.5) scale(1.45) translate(-20 -26.5)">
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
const MATE = `<svg viewBox="0 0 16 44">
  <path d="M6 2 h4 v8 c0 3 4 5 4 10 v20 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 v-20 c0 -5 4 -7 4 -10Z" fill="#f2b84b" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
  <rect x="5.5" y="1" width="5" height="3" rx="1" fill="#4b4453"/>
  <rect x="2.5" y="22" width="11" height="10" rx="1.5" fill="#fffaf0" stroke="var(--ink)" stroke-width="1.4"/>
  <path d="M5 27 h6" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

/** Staubmaus unterm Tisch, bis der Staubsauger kommt */
const DUST = `<svg viewBox="0 0 30 18">
  <path d="M3 16 c-2 -6 2 -10 6 -10 c1 -5 9 -5 11 -1 c5 -1 9 4 7 11Z" fill="#cfc7bd" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="12" cy="11" r="1.4" fill="var(--ink)"/><circle cx="18" cy="11" r="1.4" fill="var(--ink)"/>
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
  const mug = svg(mugSvg('#fffaf0', null, ''), 'prop mug', 'button');
  mug.setAttribute('type', 'button');
  mug.setAttribute('aria-label', 'Kaffeebecher');
  const duck = svg(DUCK, 'prop duck', 'button');
  duck.setAttribute('type', 'button');
  duck.setAttribute('aria-label', 'Gummiente');
  duck.addEventListener('click', () => {
    ctx.sfx.squeak();
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
      const line = pick(MOUSE_LINES);
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
  let calOffset = 0;
  let calLine = Math.floor(Math.random() * CALENDAR_LINES.length);
  const calPage = () => {
    const d = new Date(Date.now() + calOffset * 86_400_000);
    return h('span', { class: 'cal-page' }, [
      h('span', { class: 'cal-head' }, [h('b', { text: String(d.getDate()) }), ` ${DAYS[d.getDay()]}`]),
      h('span', { class: 'cal-text', text: CALENDAR_LINES[calLine % CALENDAR_LINES.length]! }),
    ]);
  };
  const calendar = h('button', { class: 'tear-cal', type: 'button', 'aria-label': 'Abreißkalender: nächstes Blatt' }, [calPage()]);
  calendar.addEventListener('click', () => {
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
    ctx.haptic('tap');
    if (calOffset % 7 === 0) ctx.log.write('info', 'kalender[7]: Eine Woche abgerissen. Die Tickets sind trotzdem von heute.');
  });

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

    // Kabelsalat: ein Kabel pro Generator-Typ im Bestand
    const n = GENERATORS.filter((g) => s.generators[g.id].owned > 0).length;
    if (cables.dataset.n !== String(n)) cables.dataset.n = String(n);
    setFlag(cables, 'tidy', now < tidyUntil);
  };

  return { incidentSign, calendar, notes, plant, cables, mug, duck, mouse, mate, dust, kNote, book, beacon, render };
}
