import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { PRINT_JOBS } from '../../content/incidents';
import { randInt, shuffle } from '../../util';
import { cssZoom, h, juice, onTap, SHAKE, setFlag, setText, TAP_PX } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.jam;
type Cfg = typeof CFG;

/** A vordere Klappe (Toner), B hintere Klappe (Fixiereinheit), C Fach 2, D Ausgabefach */
export type JamArea = 'A' | 'B' | 'C' | 'D';
export type Dir = 'left' | 'right' | 'up' | 'down';
export const AREAS: JamArea[] = ['A', 'B', 'C', 'D'];

/** In welche Richtung das Blatt je Bereich herauskommen kann (je nachdem, wie weit es gekommen ist) */
export const JAM_DIRS: Record<JamArea, Dir[]> = {
  A: ['left', 'right'],
  B: ['up', 'down'],
  C: ['up'],
  D: ['left'],
};

const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

export interface Jam {
  area: JamArea;
  /** Pfeilrichtung: nur so kommt es heil heraus */
  dir: Dir;
  /** schon einmal gerissen: nur noch ein Fetzen steckt drin */
  torn: boolean;
  cleared: boolean;
}

export type JamPhase = 'jam' | 'print' | 'done';
export type PullResult = 'ok' | 'torn' | 'held' | 'sideways' | 'hidden' | 'none';
export type ToggleResult = 'open' | 'closed' | 'toner' | 'lever' | 'locked';

/** Was der Drucker als Nächstes verlangt (das Display übersetzt es) */
export type Step =
  | { k: 'open'; area: 'A' | 'B' | 'C' }
  | { k: 'toner-out' }
  | { k: 'lever' }
  | { k: 'pull'; area: JamArea }
  | { k: 'toner-in' }
  | { k: 'lever-in' }
  | { k: 'close'; area: 'A' | 'B' | 'C' }
  | { k: 'print' }
  | { k: 'done' };

/**
 * Spiellogik ohne DOM: Drucker von der Seite. Hinter Klappen steckt Papier, manches ist verbaut
 * (Tonerkassette vor A, Andruckhebel der Fixiereinheit hinter B). Blatt in Pfeilrichtung ziehen,
 * alles wieder einsetzen und schließen, dann druckt er weiter, bis es wieder klemmt.
 */
export class JamSim {
  round = 0;
  phase: JamPhase = 'jam';
  jams: Jam[] = [];
  /** offen: vordere Klappe, hintere Klappe, Fach 2 */
  open = { A: false, B: false, C: false };
  tonerIn = true;
  /** grüner Hebel an der Fixiereinheit gelöst */
  lever = false;
  /** offene Bereiche in der Reihenfolge, in der sie geöffnet wurden */
  opened: ('A' | 'B' | 'C')[] = [];
  cleared = 0;
  /** Runden, in denen alles wieder drin und zu war (zählt mit: auch in der letzten Runde muss zugemacht werden) */
  resumed = 0;
  wrong = 0;
  /** Fehlercode im Display, je Runde neu */
  code = '';
  private printLeft = 0;
  private events = { roundDone: false, printed: false };

  constructor(
    private cfg: Cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    this.startRound();
  }

  get rounds(): number {
    return this.cfg.rounds.length;
  }

  get total(): number {
    return this.cfg.rounds.reduce((s, n) => s + n, 0);
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  jam(area: JamArea): Jam | undefined {
    return this.jams.find((j) => j.area === area && !j.cleared);
  }

  /** Kann man das Blatt gerade ziehen? (Klappe offen, nichts davor, Hebel gelöst) */
  reachable(area: JamArea): boolean {
    if (this.phase !== 'jam') return false;
    if (area === 'A') return this.open.A && !this.tonerIn;
    if (area === 'B') return this.open.B && this.lever;
    if (area === 'C') return this.open.C;
    return true;
  }

  private startRound(): void {
    const n = this.cfg.rounds[this.round] ?? 1;
    const prev = this.jams.map((j) => j.area);
    let areas: JamArea[];
    // erst Stellen, die in der vorigen Runde nicht dran waren, dann (falls nötig) die übrigen;
    // erste Runde nie nur das Ausgabefach: da gäbe es nichts zu öffnen
    do {
      const fresh = shuffle(AREAS.filter((a) => !prev.includes(a)), this.rnd);
      areas = [...fresh, ...shuffle(prev, this.rnd)].slice(0, n);
    } while (n === 1 && areas[0] === 'D');
    // Reihenfolge wie auf dem Papierweg (Fach → Toner → Fixierer → Ausgabe), so steht es auch im Code
    const order: JamArea[] = ['C', 'A', 'B', 'D'];
    areas.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    this.jams = areas.map((area) => {
      const dirs = JAM_DIRS[area];
      return { area, dir: dirs[randInt(0, dirs.length - 1, this.rnd)]!, torn: false, cleared: false };
    });
    this.code = `13.${areas.map((a) => `${a}${randInt(1, 9, this.rnd)}`).join('.')}`;
    this.phase = 'jam';
  }

  /** Klappe A/B oder Fach 2 auf- bzw. zumachen */
  toggle(part: 'A' | 'B' | 'C'): ToggleResult {
    if (this.phase !== 'jam') return 'locked';
    // was man herausgenommen bzw. gelöst hat, muss erst wieder zurück
    if (part === 'A' && this.open.A && !this.tonerIn) return 'toner';
    if (part === 'B' && this.open.B && this.lever) return 'lever';
    this.open[part] = !this.open[part];
    this.opened = this.opened.filter((p) => p !== part);
    if (this.open[part]) this.opened.push(part);
    if (!this.open[part]) this.checkResume();
    return this.open[part] ? 'open' : 'closed';
  }

  /** Tonerkassette heraus/hinein (nur bei offener Klappe A) */
  toner(): ToggleResult {
    if (this.phase !== 'jam') return 'locked';
    if (!this.open.A) return 'locked';
    this.tonerIn = !this.tonerIn;
    return this.tonerIn ? 'closed' : 'open';
  }

  /** Andruckhebel der Fixiereinheit lösen/andrücken (nur bei offener Klappe B) */
  toggleLever(): ToggleResult {
    if (this.phase !== 'jam') return 'locked';
    if (!this.open.B) return 'locked';
    this.lever = !this.lever;
    return this.lever ? 'open' : 'closed';
  }

  pull(area: JamArea, dir: Dir): PullResult {
    const j = this.jam(area);
    if (!j) return 'none';
    // der Hebel drückt das Blatt sichtbar fest: es bewegt sich nicht, reißt aber auch nicht
    if (area === 'B' && this.open.B && !this.lever && this.phase === 'jam') return 'held';
    if (!this.reachable(area)) return 'hidden';
    if (dir !== j.dir && dir !== OPPOSITE[j.dir]) return 'sideways';
    if (dir !== j.dir) {
      j.torn = true;
      this.wrong++;
      return 'torn';
    }
    j.cleared = true;
    this.cleared++;
    this.checkResume();
    return 'ok';
  }

  /** alles frei, alles drin, alles zu: weiterdrucken (oder fertig) */
  private checkResume(): void {
    if (this.phase !== 'jam' || this.jams.some((j) => !j.cleared)) return;
    if (!this.tonerIn || this.open.A || this.open.B || this.open.C) return;
    this.events.roundDone = true;
    this.resumed++;
    if (this.round + 1 >= this.rounds) {
      this.phase = 'done';
      return;
    }
    this.phase = 'print';
    this.printLeft = this.cfg.printMs;
  }

  /** Was als Nächstes zu tun ist: zuerst das, was gerade offen ist, dann der Papierweg entlang */
  next(): Step {
    if (this.phase === 'done') return { k: 'done' };
    if (this.phase === 'print') return { k: 'print' };
    // erst den zuletzt geöffneten Bereich ganz fertig machen (Blatt raus, zurückbauen, zu), dann den nächsten
    for (const p of [...this.opened].reverse()) {
      const jam = !!this.jam(p);
      if (p === 'A') {
        if (jam) return this.tonerIn ? { k: 'toner-out' } : { k: 'pull', area: 'A' };
        return this.tonerIn ? { k: 'close', area: 'A' } : { k: 'toner-in' };
      }
      if (p === 'B') {
        if (jam) return this.lever ? { k: 'pull', area: 'B' } : { k: 'lever' };
        return this.lever ? { k: 'lever-in' } : { k: 'close', area: 'B' };
      }
      return jam ? { k: 'pull', area: 'C' } : { k: 'close', area: 'C' };
    }
    const left = this.jams.find((j) => !j.cleared);
    if (left) return left.area === 'D' ? { k: 'pull', area: 'D' } : { k: 'open', area: left.area };
    return { k: 'print' };
  }

  update(dt: number): void {
    if (this.phase !== 'print') return;
    this.printLeft -= dt;
    if (this.printLeft > 0) return;
    this.events.printed = true;
    this.round++;
    this.startRound();
  }

  drain(): { roundDone: boolean; printed: boolean } {
    const out = this.events;
    this.events = { roundDone: false, printed: false };
    return out;
  }

  score(): number {
    // je Blatt ein Schritt, je Runde einer fürs Zurückbauen und Schließen
    return progressScore(this.cleared + this.resumed, this.total + this.rounds, this.wrong);
  }
}

// --- Ansicht: Drucker von der Seite, Koordinaten wie im SVG (320 × 200) ---

const VW = 320;
const VH = 200;
const box = (x: number, y: number, w: number, hh: number) =>
  `left:${(x / VW) * 100}%;top:${(y / VH) * 100}%;width:${(w / VW) * 100}%;height:${(hh / VH) * 100}%`;

/** Lage der Blätter je Bereich und Richtung (das freie Ende zeigt in Pfeilrichtung) */
const SHEET_BOX: Record<JamArea, Partial<Record<Dir, [number, number, number, number]>>> = {
  A: { left: [46, 76, 100, 9], right: [52, 76, 100, 9] },
  B: { up: [246, 50, 10, 64], down: [246, 62, 10, 64] },
  C: { up: [100, 150, 120, 8] },
  D: { left: [150, 25, 92, 8] },
};

/** Gehäuse, Innenräume, Papierweg: alles, was man nicht anfasst */
const BODY_SVG = `<svg class="dj-art" viewBox="0 0 ${VW} ${VH}" aria-hidden="true">
  <rect x="38" y="34" width="244" height="150" rx="9" class="dj-shell"/>
  <path d="M70 34 L76 26 H238 L242 34" class="dj-outtray"/>
  <rect x="236" y="30" width="10" height="7" rx="2" class="dj-slot"/>
  <rect x="42" y="46" width="110" height="80" rx="4" class="dj-cave"/>
  <rect x="168" y="46" width="110" height="80" rx="4" class="dj-cave"/>
  <path d="M48 80 H150 M260 120 V48" class="dj-path"/>
  <rect x="180" y="58" width="56" height="54" rx="5" class="dj-fuser"/>
  <circle cx="240" cy="88" r="5" class="dj-roll"/><circle cx="262" cy="88" r="5" class="dj-roll"/>
  <circle cx="152" cy="74" r="5" class="dj-roll"/><circle cx="152" cy="86" r="5" class="dj-roll"/>
  <text x="208" y="90" class="dj-hot">HEISS</text>
  <rect x="38" y="128" width="244" height="8" class="dj-seam"/>
  <rect x="44" y="184" width="22" height="5" rx="2" class="dj-foot"/><rect x="254" y="184" width="22" height="5" rx="2" class="dj-foot"/>
</svg>`;

const VEC: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

/** Ausschnitt je Bereich beim Heranzoomen (x, y, Breite, Höhe); A mit dem hochgezogenen Toner */
const VIEW: Record<'A' | 'B' | 'C', [number, number, number, number]> = {
  A: [32, 20, 132, 110],
  B: [156, 40, 132, 94],
  C: [2, 126, 252, 62],
};
/** so skalieren und schieben, dass der Ausschnitt mittig die Bühne füllt */
const zoomOf = ([x, y, w, hh]: [number, number, number, number]) => {
  const k = Math.min(VW / w, VH / hh);
  const tx = (VW - w * k) / 2 - x * k;
  const ty = (VH - hh * k) / 2 - y * k;
  return { k, transform: `translate(${(tx / VW) * 100}%, ${(ty / VH) * 100}%) scale(${k})` };
};

/** Fach 2 im Gehäuse */
const TRAY: [number, number, number, number] = [38, 136, 244, 48];

// Ein Schnipser beim Loslassen braucht deutlich mehr Weg entlang des Blatts (CFG.flickPx) als ein Tipp (TAP_PX);
// dazwischen passiert nichts, damit ein verrutschter Tipp nie zieht oder reißt.

const ARROW: Record<Dir, string> = { left: '←', right: '→', up: '↑', down: '↓' };

/** Pfeile beim Display: so heißt die Richtung im Text */
const DIR_WORD: Record<Dir, string> = { left: 'nach links', right: 'nach rechts', up: 'nach oben', down: 'nach unten' };

const STEP_TEXT = (s: Step, sim: JamSim): string => {
  switch (s.k) {
    case 'open':
      return s.area === 'C' ? 'Fach 2 herausziehen' : `Klappe ${s.area} öffnen`;
    case 'toner-out':
      return 'Tonerkassette herausnehmen';
    case 'lever':
      return 'Grünen Hebel vom Blatt lösen';
    case 'pull':
      return `${s.area === 'D' ? 'Ausgabe' : s.area === 'C' ? 'Fach 2' : s.area}: Blatt ${DIR_WORD[sim.jam(s.area)!.dir]} ziehen`;
    case 'lever-in':
      return 'Grünen Hebel wieder runter';
    case 'toner-in':
      return 'Tonerkassette einsetzen';
    case 'close':
      return s.area === 'C' ? 'Fach 2 einschieben' : `Klappe ${s.area} schließen`;
    case 'print':
      return 'Druckt …';
    case 'done':
      return 'Bereit.';
  }
};

export function jamGame(): Minigame {
  const sim = new JamSim();
  let api: GameApi | null = null;
  let over = false;
  let running = false;
  let shownRound = -1;
  let zoomed: 'A' | 'B' | 'C' | undefined;
  let zoomK = 1;
  const jobs = shuffle(PRINT_JOBS);
  let printed = 0;

  const lcd1 = h('span', { class: 'dj-lcd-1' });
  const lcd2 = h('span', { class: 'dj-lcd-2' });
  const led = h('span', { class: 'dj-led', 'aria-hidden': 'true' });
  const jobFile = h('b', { class: 'dj-file' });
  const jobNote = h('span', { class: 'dj-note' });
  const reply = h('div', { class: 'dj-reply' });
  /** Bühne mit allem drauf: fährt auf den geöffneten Bereich heran (größer zum Tippen und Wischen) */
  const stage = h('div', { class: 'dj-stage' });
  stage.innerHTML = BODY_SVG;
  const printer = h('div', { class: 'dj-printer' }, [stage]);

  const badge = (a: JamArea) => h('span', { class: 'dj-badge', text: a });
  const doorA = h('button', { class: 'dj-door dj-door-a', type: 'button', style: box(38, 46, 118, 82), 'aria-label': 'Klappe A (vorne)' }, [
    badge('A'),
    h('span', { class: 'dj-grip', 'aria-hidden': 'true' }),
  ]);
  const doorB = h('button', { class: 'dj-door dj-door-b', type: 'button', style: box(164, 46, 118, 82), 'aria-label': 'Klappe B (hinten)' }, [
    badge('B'),
    h('span', { class: 'dj-grip', 'aria-hidden': 'true' }),
  ]);
  const trayPaper = h('span', { class: 'dj-stack', 'aria-hidden': 'true' });
  // Fach als div: Blatt und Wischbereich liegen darin (in einem button wäre das ungültig); bedienbar über den Griff
  const trayFront = h('button', { class: 'dj-tray-front', type: 'button', 'aria-label': 'Fach 2' }, [h('span', { class: 'dj-tray-handle', 'aria-hidden': 'true' })]);
  const trayC = h('div', { class: 'dj-tray', style: box(...TRAY) }, [trayPaper, trayFront, badge('C')]);
  const toner = h('button', { class: 'dj-toner', type: 'button', style: box(58, 54, 90, 46), 'aria-label': 'Tonerkassette' }, [
    h('span', { class: 'dj-toner-grip', 'aria-hidden': 'true' }),
    h('span', { class: 'dj-toner-label', text: 'LJ 404X', 'aria-hidden': 'true' }),
  ]);
  const lever = h('button', { class: 'dj-lever', type: 'button', style: box(230, 84, 38, 9), 'aria-label': 'Grüner Andruckhebel (drückt das Blatt fest)' }, [
    h('span', { class: 'dj-lever-pin', 'aria-hidden': 'true' }),
  ]);
  const badgeD = h('span', { class: 'dj-badge dj-badge-d', text: 'D', style: box(250, 12, 14, 14) });
  const out = h('span', { class: 'dj-out', style: box(84, 18, 90, 10), 'aria-hidden': 'true' });

  const sheets: Partial<Record<JamArea, HTMLElement>> = {};
  /** Lage des Blatts; gerissen bleibt nur die Hälfte am eingeklemmten Ende. Fach 2: relativ zum Fach (es fährt mit) */
  const sheetStyle = (j: Jam) => {
    let [x, y, w, hh] = SHEET_BOX[j.area][j.dir]!;
    if (j.torn) {
      if (j.dir === 'left') x += w / 2;
      if (j.dir === 'up') y += hh / 2;
      if (j.dir === 'left' || j.dir === 'right') w /= 2;
      else hh /= 2;
    }
    if (j.area !== 'C') return box(x, y, w, hh);
    const [tx, ty, tw, th] = TRAY;
    return `left:${((x - tx) / tw) * 100}%;top:${((y - ty) / th) * 100}%;width:${(w / tw) * 100}%;height:${(hh / th) * 100}%`;
  };
  /** Blätter werden je Runde neu angelegt (Lage hängt an der Richtung) */
  const placeSheets = () => {
    for (const a of AREAS) {
      sheets[a]?.remove();
      delete sheets[a];
    }
    for (const j of sim.jams) {
      const el = h('div', { class: `dj-sheet dj-sheet-${j.area} to-${j.dir}`, style: sheetStyle(j), role: 'button', tabindex: '0', 'aria-label': `Blatt in Bereich ${j.area}, ${DIR_WORD[j.dir]} ziehen` }, [
        h('span', { class: 'dj-paper', 'aria-hidden': 'true' }),
        h('span', { class: 'dj-arrow', text: ARROW[j.dir], 'aria-hidden': 'true' }),
      ]);
      bindKeys(el, j.area);
      sheets[j.area] = el;
      // unter Toner und Klappen, über dem Innenraum; das Blatt in Fach 2 fährt mit dem Fach
      if (j.area === 'C') trayC.insertBefore(el, zones.C);
      else if (j.area === 'D') stage.insertBefore(el, zones.D);
      else stage.insertBefore(el, zones.A);
    }
  };

  const say = (t: string) => setText(reply, t);

  const onPull = (area: JamArea, dir: Dir) => {
    if (!api || !running) return;
    const res = sim.pull(area, dir);
    const el = sheets[area];
    if (!el) return;
    el.style.translate = '';
    if (res === 'ok') {
      api.sfx.paperPull();
      api.haptic('tap');
      const [dx, dy] = VEC[dir];
      el.classList.add('gone');
      el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx * 60}px, ${dy * 60}px) rotate(${dx ? 6 : -6}deg)`, opacity: 0 }], { duration: 320, easing: 'ease-in' });
      say(pullText(area));
    } else if (res === 'held') {
      api.sfx.tick();
      juice(lever, SHAKE, 240);
      juice(el, SHAKE, 160);
      say('Geht nicht: Der grüne Hebel drückt das Blatt fest. Erst den Hebel antippen, dann ziehen.');
    } else if (res === 'hidden' && area === 'A' && sim.open.A) {
      juice(toner, SHAKE, 200);
      say('Die Tonerkassette liegt auf dem Blatt. Erst antippen und herausnehmen.');
    } else if (res === 'hidden') {
      say(area === 'C' ? 'Da kommst du nicht ran: erst Fach 2 herausziehen.' : `Da kommst du nicht ran: erst Klappe ${area} öffnen.`);
    } else if (res === 'torn') {
      api.sfx.paperTear();
      api.haptic('error');
      api.penalize(CFG.tearPenaltyMs);
      el.classList.add('torn');
      el.setAttribute('style', sheetStyle(sim.jam(area)!));
      juice(el, SHAKE, 240);
      say(`Gerissen: falsche Richtung. Der Rest kommt nur ${DIR_WORD[sim.jam(area)!.dir]} raus.`);
    } else if (res === 'sideways') {
      say(`Seitlich geht nichts. In Pfeilrichtung ziehen: ${ARROW[sim.jam(area)!.dir]}`);
    }
    render();
  };

  const pullText = (area: JamArea): string => {
    const rest = sim.jams.filter((j) => !j.cleared).length;
    const what = area === 'D' ? 'Ausgabefach' : area === 'C' ? 'Fach 2' : `Bereich ${area}`;
    return rest ? `${what} ist frei. Noch ${rest} Stau.` : `${what} ist frei. Jetzt alles wieder rein und zu.`;
  };

  /**
   * Wischzonen: der ganze offene Bereich, nicht nur das dünne Blatt (das ist nur 7–11 px dick).
   * Zählt, sobald weit genug gewischt oder beim Loslassen nach einem kurzen Schnippen.
   * Leicht schräg ist in Ordnung: entscheidend ist, ob die Bewegung eher entlang des Blatts geht.
   */
  const zones: Record<JamArea, HTMLElement> = {
    A: h('div', { class: 'dj-zone dj-zone-A', style: box(42, 46, 110, 80), 'aria-hidden': 'true' }),
    B: h('div', { class: 'dj-zone dj-zone-B', style: box(168, 46, 110, 80), 'aria-hidden': 'true' }),
    C: h('div', { class: 'dj-zone dj-zone-C', style: 'left:9%;top:0;width:91%;height:100%', 'aria-hidden': 'true' }),
    D: h('div', { class: 'dj-zone dj-zone-D', style: box(130, 4, 150, 36), 'aria-hidden': 'true' }),
  };
  /** offene Bereiche nehmen immer Tippen/Wischen an (auch zum Zurückbauen und Schließen); D nur mit Blatt */
  const zoneOn = (a: JamArea) => {
    if (sim.phase !== 'jam') return false;
    return a === 'D' ? !!sim.jam('D') : sim.open[a];
  };
  /**
   * In einen offenen Bereich getippt: mit Blatt drin erklären, was fehlt;
   * ist er frei, Schritt für Schritt zurück (Toner rein bzw. Hebel runter, dann zu).
   */
  const areaTap = (area: JamArea) => {
    const j = sim.jam(area);
    if (j) {
      if (sim.reachable(area)) say(`Wischen, nicht tippen: ${ARROW[j.dir]}`);
      else onPull(area, j.dir);
      return;
    }
    if (area === 'A' && !sim.tonerIn) onToner();
    else if (area === 'B' && sim.lever) onLever();
    else if (area !== 'D') onToggle(area);
  };
  /**
   * Richtung eines Wischs: zählt, sobald der Weg entlang des Blatts weit genug ist (Bogen oder schräger Anfang
   * stören nicht); nur wer deutlich quer wischt, bekommt „seitlich“. null = noch nicht entschieden.
   */
  const dirOf = (area: JamArea, dx: number, dy: number, need: number): Dir | null => {
    const j = sim.jam(area);
    const horiz = j ? j.dir === 'left' || j.dir === 'right' : Math.abs(dx) >= Math.abs(dy);
    const along = horiz ? dx : dy;
    const across = horiz ? dy : dx;
    if (Math.abs(along) >= need) return horiz ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    if (Math.abs(across) >= need * 2.5) return horiz ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right';
    return null;
  };
  /** Wischen/Tippen auf einer Fläche; areaOf entscheidet beim Aufsetzen, welcher Bereich gemeint ist */
  function bindSwipe(el: HTMLElement, areaOf: (e: PointerEvent) => JamArea | null) {
    let start: { x: number; y: number; id: number; area: JamArea } | null = null;
    const follow = (area: JamArea, dx: number, dy: number) => {
      const sh = sheets[area];
      const j = sim.jam(area);
      if (!sh || !j || !sim.reachable(area)) return;
      const horiz = j.dir === 'left' || j.dir === 'right';
      // das Blatt gibt ein Stück nach (höchstens 8 px auf dem Bildschirm), entlang seiner Achse;
      // die Bühne ist gezoomt und das Spiel evtl. verkleinert, also zurückrechnen
      const scale = zoomK * cssZoom(printer);
      const give = (v: number) => Math.max(-8, Math.min(8, v / 2)) / scale;
      sh.style.translate = horiz ? `${give(dx)}px 0` : `0 ${give(dy)}px`;
    };
    el.addEventListener('pointerdown', (e) => {
      if (!running || start) return;
      const area = areaOf(e);
      if (!area) return;
      e.preventDefault();
      start = { x: e.clientX, y: e.clientY, id: e.pointerId, area };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const { area } = start;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      follow(area, dx, dy);
      const dir = dirOf(area, dx, dy, CFG.swipePx);
      if (!dir) return;
      start = null;
      onPull(area, dir);
    });
    el.addEventListener('pointerup', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const { area } = start;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      const dir = dirOf(area, dx, dy, CFG.flickPx);
      start = null;
      if (dir) onPull(area, dir);
      else if (dist < TAP_PX) areaTap(area);
      sheets[area]?.style.removeProperty('translate');
    });
    el.addEventListener('pointercancel', () => {
      if (start) sheets[start.area]?.style.removeProperty('translate');
      start = null;
    });
  }
  for (const a of AREAS) bindSwipe(zones[a], () => a);
  // im Zoom ist die ganze Fläche Wischfläche des gezoomten Bereichs (auch neben dem Fach, auch während der Fahrt);
  // Knöpfe und Bereiche regeln ihre Berührungen selbst
  bindSwipe(printer, (e) => (zoomed && !(e.target as Element).closest('button, .dj-zone') ? zoomed : null));

  /** Tastatur: Enter auf dem Blatt zieht in Pfeilrichtung */
  function bindKeys(el: HTMLElement, area: JamArea) {
    el.addEventListener('keydown', (e) => {
      const j = sim.jam(area);
      if ((e.key === 'Enter' || e.key === ' ') && j) {
        e.preventDefault();
        onPull(area, j.dir);
      }
    });
  }

  const onToggle = (part: 'A' | 'B' | 'C') => {
    if (!api || !running) return;
    const res = sim.toggle(part);
    if (res === 'toner') {
      api.sfx.tick();
      juice(doorA, SHAKE, 200);
      say('Die Klappe geht nicht zu: Die Tonerkassette fehlt noch.');
      return;
    }
    if (res === 'lever') {
      api.sfx.tick();
      juice(lever, SHAKE, 200);
      say('Die Klappe geht nicht zu: Erst den grünen Hebel wieder runterdrücken.');
      return;
    }
    if (res === 'locked') return;
    api.sfx.latch(res === 'open');
    api.haptic('tap');
    if (res === 'open' && !sim.jam(part)) say(part === 'C' ? 'In Fach 2 ist nur Papier. So soll es sein.' : `Hinter ${part} klemmt nichts.`);
    else say('');
    render();
  };

  function onToner() {
    if (!api || !running) return;
    const res = sim.toner();
    if (res === 'locked') return;
    api.sfx.tap();
    api.haptic('tap');
    say('');
    render();
  }
  function onLever() {
    if (!api || !running) return;
    if (sim.toggleLever() === 'locked') return;
    api.sfx.tick();
    api.haptic('tap');
    say('');
    render();
  }
  // Bereich schon frei: Toner/Hebel sind dann nur „im Bereich getippt“ (zurückbauen bzw. zumachen), nie wieder ausbauen
  onTap(toner, () => (sim.open.A && sim.tonerIn && !sim.jam('A') ? onToggle('A') : onToner()));
  onTap(lever, () => (sim.open.B && !sim.lever && !sim.jam('B') ? onToggle('B') : onLever()));
  onTap(doorA, () => onToggle('A'));
  onTap(doorB, () => onToggle('B'));
  onTap(trayC, () => onToggle('C'), '.dj-zone');
  trayFront.addEventListener('click', (e) => {
    if (e.detail === 0) onToggle('C');
  });

  /** so viele Seiten schafft er in einer Runde, bevor es wieder klemmt (höchstens der ganze Auftrag) */
  const pagesFor = (round: number) => Math.min(jobs[round % jobs.length]!.pages, 3 + round * 4);

  const render = () => {
    if (shownRound !== sim.round) {
      shownRound = sim.round;
      const job = jobs[sim.round % jobs.length]!;
      setText(jobFile, job.file);
      setText(jobNote, `${job.who} · ${job.pages} ${job.pages === 1 ? 'Seite' : 'Seiten'}. ${job.note}`);
      placeSheets();
    }
    printer.classList.toggle('a-open', sim.open.A);
    doorA.classList.toggle('open-side', sim.open.A);
    doorB.classList.toggle('open-side', sim.open.B);
    printer.classList.toggle('b-open', sim.open.B);
    printer.classList.toggle('c-open', sim.open.C);
    printer.classList.toggle('toner-out', !sim.tonerIn);
    printer.classList.toggle('lever-up', sim.lever);
    printer.classList.toggle('printing', sim.phase === 'print' || sim.phase === 'done');
    doorA.classList.toggle('jam', !!sim.jam('A'));
    doorB.classList.toggle('jam', !!sim.jam('B'));
    trayC.classList.toggle('jam', !!sim.jam('C'));
    badgeD.classList.toggle('jam', !!sim.jam('D'));
    for (const a of AREAS) zones[a].classList.toggle('on', running && zoneOn(a));
    // Zoom auf den zuletzt geöffneten Bereich (der ist laut Hinweis gerade dran)
    const focus = sim.phase === 'jam' ? sim.opened[sim.opened.length - 1] : undefined;
    if (focus !== zoomed) {
      zoomed = focus;
      const z = focus ? zoomOf(VIEW[focus]) : null;
      zoomK = z?.k ?? 1;
      stage.style.transform = z?.transform ?? '';
      printer.classList.toggle('zoomed', !!focus);
    }
    // gelöster Hebel steht im Wischbereich: solange das Blatt drin ist, gehen Berührungen ans Blatt
    lever.classList.toggle('pass', sim.lever && !!sim.jam('B'));
    // genauso der hochgezogene Toner: liegt über dem Wischbereich von A
    toner.classList.toggle('pass', !sim.tonerIn && !!sim.jam('A'));
    // ruhiger grüner Rahmen um das, was als Nächstes dran ist (das Blatt zeigt dafür seinen Pfeil)
    const next = sim.next();
    const target = !running
      ? null
      : next.k === 'open' || next.k === 'close'
        ? { A: doorA, B: doorB, C: trayC }[next.area]
        : next.k === 'toner-out' || next.k === 'toner-in'
          ? toner
          : next.k === 'lever' || next.k === 'lever-in'
            ? lever
            : null;
    for (const el of [doorA, doorB, trayC, toner, lever]) el.classList.toggle('next', el === target);
    for (const j of sim.jams) {
      const el = sheets[j.area];
      if (!el) continue;
      el.classList.toggle('torn', j.torn && !j.cleared);
      el.classList.toggle('reach', sim.reachable(j.area));
    }
    setFlag(led, 'warn', sim.phase === 'jam');
    setFlag(led, 'ok', sim.phase !== 'jam');
    const job = jobs[sim.round % jobs.length]!;
    if (!running) {
      setText(lcd1, `${sim.code} Papierstau`);
      setText(lcd2, 'Initialisiere …');
    } else if (sim.phase === 'jam') {
      const left = sim.jams.filter((j) => !j.cleared).map((j) => j.area);
      setText(lcd1, left.length ? `${sim.code} Stau: ${left.join(', ')}` : `${sim.code} Stau beseitigt`);
      setText(lcd2, STEP_TEXT(next, sim));
    } else {
      setText(lcd1, sim.phase === 'done' ? 'Bereit' : `Druckt: ${job.file}`);
      setText(lcd2, sim.phase === 'done' ? `${printed} Seiten gedruckt` : `Seite ${pagesFor(sim.round)} von ${job.pages} …`);
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      stage.append(zones.A, zones.B, toner, lever, out, doorA, doorB, trayC, zones.D, badgeD);
      trayC.insertBefore(zones.C, trayC.lastChild);
      render();
      root.append(
        h('div', { class: 'dj' }, [
          h('div', { class: 'dj-panel' }, [
            h('div', { class: 'dj-brand', 'aria-hidden': 'true' }, [h('b', { text: 'LaserJam' }), ' Pro 404 · „Dieter“, 3. OG']),
            h('div', { class: 'dj-front' }, [h('div', { class: 'dj-lcd', role: 'status' }, [lcd1, lcd2]), led]),
          ]),
          h('div', { class: 'dj-job' }, [jobFile, jobNote]),
          printer,
          reply,
        ]),
      );
    },
    update(dt) {
      // gezeichnet wird bei Eingaben (die Handler rufen render) und hier nur, wenn die Uhr etwas bewegt hat
      const first = !running;
      if (first) {
        running = true;
        api?.sfx.paperTear();
      }
      sim.update(dt);
      const ev = sim.drain();
      if (ev.roundDone) {
        // sim.round ist noch die gerade fertige Runde (weiter geht es erst nach dem Drucken)
        printed += pagesFor(sim.round);
        api?.sfx.printRun(sim.done ? 0.9 : CFG.printMs / 1000);
        say(sim.done ? '' : 'Läuft wieder …');
      }
      if (ev.printed) {
        // es klemmt wieder: neues Blatt, neuer Code
        api?.sfx.paperTear();
        api?.haptic('error');
        juice(printer, SHAKE, 260);
        say('… und klemmt wieder. Natürlich.');
      }
      if (first || ev.roundDone || ev.printed) render();
      if (!over && sim.done) {
        over = true;
        say('Frei, zu, druckt. Dieter tut, als wäre nichts gewesen.');
        setTimeout(() => api?.finish(), 1_000);
      }
    },
    score: () => sim.score(),
    status: () => `frei: ${sim.cleared}/${sim.total} · gerissen: ${sim.wrong}`,
  };
}
