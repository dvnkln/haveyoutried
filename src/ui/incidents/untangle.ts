import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { TANGLE_DEVICES, type TangleDevice } from '../../content/incidents';
import { shuffle } from '../../util';
import { h, juice, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.untangle;
type Cfg = typeof CFG;

export interface Pt {
  x: number;
  y: number;
}

export interface TangleNode extends Pt {
  dev: TangleDevice;
}

export interface Cable {
  a: number;
  b: number;
  color: number;
}

/** Spielfeld: 100 × 100 */
export const SIZE = 100;

const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** echte Kreuzung zweier Strecken (Berühren an einem gemeinsamen Endpunkt zählt nicht) */
export function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Schnittpunkt (für die roten Punkte) */
function intersection(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/** Läuft die Strecke durch das Rechteck (Mitte c, halbe Breite/Höhe)? Clipping nach Liang–Barsky */
export function segmentHitsBox(a: Pt, b: Pt, c: Pt, hw: number, hh: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - (c.x - hw)],
    [dx, c.x + hw - a.x],
    [-dy, a.y - (c.y - hh)],
    [dy, c.y + hh - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** Spiellogik ohne DOM. */
export class UntangleSim {
  nodes: TangleNode[];
  cables: Cable[];
  /** Lösung: so lagen die Geräte, als noch alles ordentlich war (für Tests) */
  solution: Pt[];
  startCrossings: number;
  /** so wenige Kreuzungen gab es zwischendurch schon (Wertung zählt den besten Stand) */
  private best: number;

  constructor(
    private cfg: Cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    const devs = shuffle(TANGLE_DEVICES, rnd).slice(0, cfg.devices);
    let solution: Pt[] = [];
    let cables: Cable[] | null = null;
    for (let i = 0; i < 200 && !cables; i++) {
      solution = this.layout(cfg.devices);
      cables = solution.length === cfg.devices ? this.planarCables(solution) : null;
    }
    // praktisch nie: Geräte im Kreis (konvex, Nachbarn verbunden) – Kreisbogen-Kabel kreuzen sich nie
    if (!cables) {
      solution = this.circle(cfg.devices);
      cables = this.planarCables(solution) ?? solution.map((_, i) => ({ a: i, b: (i + 1) % solution.length, color: 0 }));
    }
    const colors = shuffle(
      Array.from({ length: cables.length }, (_, i) => i % 6),
      rnd,
    );
    this.cables = cables.map((c, i) => ({ ...c, color: colors[i]! }));
    this.solution = solution;

    // durcheinanderwerfen, bis es ordentlich verknotet ist (aber nicht hoffnungslos);
    // passt nie etwas genau, gilt die Lage, die dem Bereich am nächsten kam (nie eine schon gelöste)
    let start: Pt[] = [];
    let miss = Infinity;
    for (let i = 0; i < 300 && miss > 0; i++) {
      const pts = this.layout(cfg.devices);
      if (pts.length !== cfg.devices) continue;
      const n = this.countFor(pts);
      const m = n === 0 ? Infinity : Math.max(0, cfg.startCrossMin - n, n - cfg.startCrossMax);
      if (m < miss || !start.length) {
        start = pts;
        miss = m;
      }
    }
    if (start.length !== cfg.devices) start = shuffle(this.circle(cfg.devices), rnd);
    this.nodes = start.map((p, i) => ({ ...p, dev: devs[i]! }));
    this.count = this.countFor(this.nodes);
    this.startCrossings = this.count;
    this.best = this.count;
  }

  /** aktuelle Zahl der Probleme (nach jedem Ziehen neu gezählt) */
  private count = 0;

  /** Notlage: Geräte gleichmäßig im Kreis (passt immer aufs Feld) */
  private circle(n: number): Pt[] {
    return Array.from({ length: n }, (_, i) => this.clampPt({ x: 50 + 38 * Math.cos((i / n) * Math.PI * 2), y: 50 + 40 * Math.sin((i / n) * Math.PI * 2) }));
  }

  /** zwei Geräte überlappen sich (mit etwas Luft) */
  overlaps(a: Pt, b: Pt): boolean {
    return Math.abs(a.x - b.x) < this.cfg.boxW + 1 && Math.abs(a.y - b.y) < this.cfg.boxH + 1;
  }

  /** Mitte so begrenzen, dass das Gerät ganz auf dem Feld liegt */
  clampPt(p: Pt): Pt {
    const hw = this.cfg.boxW / 2 + 1;
    const hh = this.cfg.boxH / 2 + 1;
    return { x: Math.max(hw, Math.min(SIZE - hw, p.x)), y: Math.max(hh, Math.min(SIZE - hh, p.y)) };
  }

  /** zufällige Lage ohne Überlappung */
  private layout(n: number): Pt[] {
    const pts: Pt[] = [];
    for (let guard = 0; pts.length < n && guard < 5_000; guard++) {
      const p = this.clampPt({ x: this.rnd() * SIZE, y: this.rnd() * SIZE });
      // etwas mehr Luft als nötig, damit die Kabel dazwischen sichtbar bleiben
      if (pts.every((q) => Math.abs(p.x - q.x) > this.cfg.boxW + 4 || Math.abs(p.y - q.y) > this.cfg.boxH + 6)) pts.push(p);
    }
    return pts;
  }

  /**
   * Kabel für eine ordentliche Lage: erst ein Baum (alles hängt zusammen), dann kürzeste weitere Kabel,
   * solange keins ein anderes kreuzt oder über ein fremdes Gerät läuft.
   */
  private planarCables(pts: Pt[]): Cable[] | null {
    const n = pts.length;
    const out: Cable[] = [];
    const deg = Array<number>(n).fill(0);
    const ok = (a: number, b: number) =>
      deg[a]! < this.cfg.maxDegree &&
      deg[b]! < this.cfg.maxDegree &&
      !out.some((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)) &&
      !out.some((c) => c.a !== a && c.a !== b && c.b !== a && c.b !== b && segmentsCross(pts[a]!, pts[b]!, pts[c.a]!, pts[c.b]!)) &&
      pts.every((p, k) => k === a || k === b || !this.under(pts[a]!, pts[b]!, p, this.cfg.clearance));
    const add = (a: number, b: number) => {
      out.push({ a, b, color: 0 });
      deg[a]!++;
      deg[b]!++;
    };
    const pairs: [number, number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b, Math.hypot(pts[a]!.x - pts[b]!.x, pts[a]!.y - pts[b]!.y)]);
    pairs.sort((p, q) => p[2] - q[2]);

    // Baum (Kruskal): jedes Gerät hängt am Netz
    const root = Array.from({ length: n }, (_, i) => i);
    const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i]!)));
    for (const [a, b] of pairs) {
      if (find(a) !== find(b) && ok(a, b)) {
        root[find(a)] = find(b);
        add(a, b);
      }
    }
    if (out.length !== n - 1) return null;
    // jedes Gerät mindestens zwei Kabel (sonst liegt es trivial irgendwo außen)
    for (let k = 0; k < n; k++) {
      if (deg[k]! >= 2) continue;
      const pair = pairs.find(([a, b]) => (a === k || b === k) && ok(a, b));
      if (!pair) return null;
      add(pair[0], pair[1]);
    }
    for (const [a, b] of pairs) {
      if (out.length >= this.cfg.cables) break;
      if (ok(a, b)) add(a, b);
    }
    return out.length >= this.cfg.cables - 1 ? out : null;
  }

  /** Kabel a–b läuft unter dem Gerät bei p durch (margin: zusätzlicher Rand) */
  private under(a: Pt, b: Pt, p: Pt, margin = 0): boolean {
    return segmentHitsBox(a, b, p, this.cfg.boxW / 2 + margin, this.cfg.boxH / 2 + margin);
  }

  /** Kabel, die unter fremden Geräten durchlaufen (sieht aus wie angeschlossen, ist es aber nicht) */
  private coveredFor(pts: Pt[]): { cable: number; node: number }[] {
    const out: { cable: number; node: number }[] = [];
    this.cables.forEach((c, i) => {
      pts.forEach((p, k) => {
        if (k !== c.a && k !== c.b && this.under(pts[c.a]!, pts[c.b]!, p)) out.push({ cable: i, node: k });
      });
    });
    return out;
  }

  covered(): { cable: number; node: number }[] {
    return this.coveredFor(this.nodes);
  }

  /** sich kreuzende Kabelpaare (Kabel am selben Gerät berühren sich nur) */
  private crossPairsFor(pts: Pt[]): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < this.cables.length; i++) {
      for (let j = i + 1; j < this.cables.length; j++) {
        const c = this.cables[i]!;
        const d = this.cables[j]!;
        if (c.a === d.a || c.a === d.b || c.b === d.a || c.b === d.b) continue;
        if (segmentsCross(pts[c.a]!, pts[c.b]!, pts[d.a]!, pts[d.b]!)) out.push([i, j]);
      }
    }
    return out;
  }

  /** Probleme insgesamt: Kreuzungen plus Kabel unter fremden Geräten */
  private countFor(pts: Pt[]): number {
    return this.crossPairsFor(pts).length + this.coveredFor(pts).length;
  }

  /** Kreuzungen inkl. Kabel unter fremden Geräten (das, was entwirrt werden muss) */
  crossings(): number {
    return this.count;
  }

  /** alle Kreuzungen: Kabel-Indizes und Ort */
  crossingPoints(): { i: number; j: number; at: Pt }[] {
    const p = this.nodes;
    return this.crossPairsFor(p).map(([i, j]) => {
      const c = this.cables[i]!;
      const d = this.cables[j]!;
      return { i, j, at: intersection(p[c.a]!, p[c.b]!, p[d.a]!, p[d.b]!) };
    });
  }

  /** Gerät während des Ziehens verschieben (darf andere kurz überdecken) */
  drag(i: number, p: Pt): void {
    const n = this.nodes[i];
    if (!n) return;
    const q = this.clampPt(p);
    n.x = q.x;
    n.y = q.y;
    this.count = this.countFor(this.nodes);
  }

  /**
   * Loslassen: liegt es auf einem anderen Gerät, rutscht es zur nächsten freien Stelle.
   * Gibt die Kreuzungen danach zurück.
   */
  drop(i: number): number {
    const n = this.nodes[i];
    if (!n) return this.count;
    const free = (p: Pt) => this.nodes.every((o, k) => k === i || !this.overlaps(p, o));
    if (!free(n)) {
      let best: Pt | null = null;
      for (let r = 2; r <= SIZE && !best; r += 2) {
        for (let a = 0; a < 16; a++) {
          const q = this.clampPt({ x: n.x + Math.cos((a / 16) * Math.PI * 2) * r, y: n.y + Math.sin((a / 16) * Math.PI * 2) * r });
          if (free(q)) {
            best = q;
            break;
          }
        }
      }
      if (best) {
        n.x = best.x;
        n.y = best.y;
      }
    }
    this.count = this.countFor(this.nodes);
    this.best = Math.min(this.best, this.count);
    return this.count;
  }

  get done(): boolean {
    return this.count === 0;
  }

  score(): number {
    // bester Stand zählt (auch der, den man gerade noch festhält, wenn die Zeit abläuft)
    if (this.startCrossings <= 0) return 1;
    const best = Math.min(this.best, this.count);
    return progressScore(this.startCrossings - best, this.startCrossings, 0);
  }
}

/** Kabelfarben wie echte Patchkabel (kein Rot: das ist für die Kreuzungen) */
const CABLE_COLORS = ['#3b82d6', '#f2c230', '#3fae5a', '#9b6ad6', '#f08a2c', '#e8e8e8'];

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

/**
 * Geräte von vorn, im Seitenverhältnis der Trefferfläche (76 × 40). Unten klebt das Etikett (HTML),
 * deshalb sitzt das Wichtige oben. Antennen, Papier und Stempelkarte ragen über den Rand (overflow sichtbar).
 */
const INK = '#3d2c2e';
const box = (x: number, y: number, w: number, hh: number, fill: string, rx = 3, sw = 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const led = (x: number, y: number, c = '#5cdd8b', r = 1.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const port = (x: number, y: number) => `<rect x="${x}" y="${y}" width="6" height="5" rx="0.8" fill="#15181e"/>`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const ART: Record<TangleDevice['look'], string> = {
  // 1-HE-Switch: Portreihe mit Link-LEDs, Ohren zum Festschrauben
  switch:
    box(0, 7, 4, 12, '#9aa0ad', 1, 1.5) + box(72, 7, 4, 12, '#9aa0ad', 1, 1.5) + box(3, 4, 70, 32, '#4f6a8a') +
    range(8).map((i) => led(10 + i * 8, 9, i === 5 ? '#f2c230' : '#5cdd8b', 1.1) + port(7 + i * 8, 12)).join(''),
  // Router: zwei Antennen, vorne Statuslämpchen
  router:
    box(12, -11, 4, 17, '#22262e', 2, 1.5) + box(60, -11, 4, 17, '#22262e', 2, 1.5) + box(1, 4, 74, 32, '#2b2f38', 7) +
    led(26, 13, '#5cdd8b', 1.8) + led(34, 13, '#5cdd8b', 1.8) + led(42, 13, '#f2c230', 1.8) + led(50, 13, '#5cdd8b', 1.8),
  // Firewall: Mauer-Symbol, Ports, ein rotes Lämpchen (laut Handbuch: alles in Ordnung)
  firewall:
    box(1, 3, 74, 34, '#2f333d') +
    `<rect x="6" y="7" width="20" height="15" fill="#e8833a" stroke="${INK}" stroke-width="1.2"/>` +
    `<path d="M6 12h20M6 17h20M13 7v5M20 12v5M13 17v5" stroke="#fdf3e3" stroke-width="1.1"/>` +
    range(4).map((i) => port(33 + i * 9, 13)).join('') + led(36, 9, '#ff4d4d', 1.4) + led(45, 9) + led(54, 9) + led(63, 9),
  // NAS: vier Plattenschächte mit Lämpchen
  nas: box(1, 2, 74, 36, '#1f232a', 4) + range(4).map((i) => `<rect x="${7 + i * 16.5}" y="6" width="13" height="18" rx="1.5" fill="#4a505c" stroke="#15181e" stroke-width="1"/>` + led(13.5 + i * 16.5, 9.5, i === 2 ? '#3b82d6' : '#5cdd8b', 1.2)).join(''),
  // Server, Baujahr 2009: beige, Lüftungsschlitze, zwei Laufwerksschächte, Einschaltknopf
  server:
    box(1, 2, 74, 36, '#d8d0bf', 2) +
    range(5).map((i) => `<rect x="6" y="${6 + i * 3.6}" width="20" height="1.8" rx="0.9" fill="#8a8170"/>`).join('') +
    box(32, 6, 34, 7, '#c3b9a5', 1, 1.2) + box(32, 15, 34, 7, '#c3b9a5', 1, 1.2) +
    `<rect x="36" y="9" width="14" height="1.4" fill="#8a8170"/><rect x="36" y="18" width="14" height="1.4" fill="#8a8170"/>` +
    `<circle cx="70" cy="10" r="2.4" fill="#e9e3d6" stroke="${INK}" stroke-width="1"/>` + led(70, 18, '#5cdd8b', 1.2),
  // Access Point: runde weiße Scheibe mit blauem Leuchtring
  ap: `<rect x="2" y="1" width="72" height="38" rx="19" fill="#f4f1ea" stroke="${INK}" stroke-width="2"/><circle cx="38" cy="13" r="5" fill="none" stroke="#3b82d6" stroke-width="2.2"/>`,
  // Drucker: Papier steckt oben, Ausgabeschlitz, kleines Display
  printer:
    `<rect x="18" y="-10" width="40" height="16" fill="#fff" stroke="${INK}" stroke-width="1.5"/><path d="M23 -5h26M23 -1h20" stroke="#c9cdd6" stroke-width="1.2"/>` +
    box(1, 3, 74, 34, '#ece6da', 5) + `<rect x="3" y="5" width="70" height="7" fill="#d9d0bf"/>` +
    `<rect x="12" y="15" width="38" height="3" rx="1.5" fill="#3a3f4b"/>` + box(56, 14, 13, 7, '#9fdc9a', 1, 1) + led(66, 9, '#5cdd8b', 1.1),
  // TK-Anlage als Tischtelefon: Hörer links, Display, Tasten
  phone:
    box(1, 4, 74, 32, '#5a5560', 6) +
    `<path d="M7 5h12a3 3 0 0 1 3 3v2h-5v6h5v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z" fill="#2b2830" stroke="${INK}" stroke-width="1.4"/>` +
    box(27, 7, 16, 8, '#b8d4a8', 1, 1) +
    range(9).map((i) => `<rect x="${48 + (i % 3) * 7}" y="${7 + Math.floor(i / 3) * 5.5}" width="5" height="4" rx="1" fill="#e9e3d6"/>`).join(''),
  // Bullet-Kamera: Sonnendach, Gehäuse, Objektiv vorne, Halterung (füllt die Fläche, damit „liegt auf Kabel“ stimmt)
  cam:
    `<rect x="56" y="20" width="9" height="14" fill="#c9cdd6" stroke="${INK}" stroke-width="1.5"/>` + box(42, 31, 33, 7, '#c9cdd6', 1.5, 1.5) +
    box(8, 7, 64, 19, '#f4f1ea', 9) + box(10, 2, 64, 7, '#e2ddd2', 3, 1.5) +
    box(1, 8, 13, 17, '#1f232a', 3) + `<circle cx="7.5" cy="16.5" r="4" fill="#3b82d6"/><circle cx="6.3" cy="15.2" r="1.2" fill="#cfe6ff"/>` + led(66, 17, '#ff4d4d', 1),
  // Stempeluhr: Stempelkarte steckt oben, grünes Display mit Uhrzeit
  clock:
    `<rect x="48" y="-11" width="14" height="17" fill="#f7e9b8" stroke="${INK}" stroke-width="1.4"/><path d="M51 -7h8M51 -4h8M51 -1h6" stroke="#c9a85a" stroke-width="1"/>` +
    box(1, 3, 74, 34, '#e2d9c6', 5) + `<rect x="45" y="5" width="20" height="3" rx="1" fill="#3a3f4b"/>` +
    box(6, 7, 34, 14, '#1d3b2a', 2, 1.4) + `<text x="23" y="17.6" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#7dff9a">08:00</text>`,
  // Medienkonverter: kleines Blechkästchen, Glasfaser (orange) oben raus, daneben RJ45
  media:
    `<path d="M28 9V-10" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M28 9V-10" stroke="#f08a2c" stroke-width="3" stroke-linecap="round"/>` +
    box(4, 5, 68, 31, '#c9cdd6', 3) + `<path d="M8 30h60M8 33h60" stroke="#9aa0ad" stroke-width="1"/>` +
    box(23, 8, 10, 9, '#3b82d6', 1, 1.2) + port(42, 10) + led(54, 10) + led(54, 15, '#f2c230'),
  // unbekannte Kiste: grau, vier Schrauben, ein Lämpchen
  box:
    box(4, 3, 68, 34, '#a7a196', 3) + [8, 68].flatMap((x) => [7, 33].map((y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#7a746a"/>`)).join('') + led(62, 12, '#5cdd8b', 2),
};

export function untangleGame(): Minigame {
  const sim = new UntangleSim();
  let api: GameApi | null = null;
  let finished = false;
  const board = h('div', { class: 'tg-board' });
  const lines = svg('svg', { class: 'tg-lines', viewBox: `0 0 ${SIZE} ${SIZE}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const marks = svg('svg', { class: 'tg-marks', viewBox: `0 0 ${SIZE} ${SIZE}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  const info = h('div', { class: 'tg-info', 'aria-live': 'polite' });
  const boxes: HTMLButtonElement[] = [];
  const cableEls: { under: SVGLineElement; over: SVGLineElement }[] = [];

  const tell = (kind: '' | 'ok', text: string) => {
    setText(info, text);
    info.dataset.kind = kind;
  };

  const render = () => {
    sim.nodes.forEach((n, i) => {
      const b = boxes[i]!;
      b.style.left = `${n.x}%`;
      b.style.top = `${n.y}%`;
    });
    const hits = sim.crossingPoints();
    const cov = sim.covered();
    const bad = new Set([...hits.flatMap((x) => [x.i, x.j]), ...cov.map((x) => x.cable)]);
    const onCable = new Set(cov.map((x) => x.node));
    boxes.forEach((b, i) => b.classList.toggle('on-cable', onCable.has(i)));
    sim.cables.forEach((c, i) => {
      const a = sim.nodes[c.a]!;
      const b = sim.nodes[c.b]!;
      for (const el of [cableEls[i]!.under, cableEls[i]!.over]) {
        el.setAttribute('x1', String(a.x));
        el.setAttribute('y1', String(a.y));
        el.setAttribute('x2', String(b.x));
        el.setAttribute('y2', String(b.y));
      }
      // Problemkabel bekommen eine rote Kontur (auch wenn sie nur unter einem Gerät durchlaufen)
      cableEls[i]!.under.classList.toggle('tangled', bad.has(i));
    });
    // Kreuzungen als rote Knoten
    marks.replaceChildren(...hits.map((x) => svg('circle', { class: 'tg-x', cx: x.at.x, cy: x.at.y, r: 2.3 })));
  };

  const settle = (i: number, before: number) => {
    if (!api) return;
    const after = sim.drop(i);
    render();
    if (after === 0) {
      if (finished) return;
      finished = true;
      tell('ok', 'Entwirrt. Jetzt sieht man, welches Kabel wackelt.');
      api.sfx.good();
      api.haptic('tap');
      // kurz stehen lassen, damit man das ordentliche Bild sieht
      setTimeout(() => api?.finish(), 600);
      return;
    }
    if (after < before) {
      api.sfx.tap();
      setTimeout(() => api?.sfx.release(), 70);
      api.haptic('tap');
    } else {
      api.sfx.tick();
    }
  };

  /** Gerät ziehen (Finger oder Maus); Pfeiltasten verschieben es mit der Tastatur */
  const bindDrag = (b: HTMLButtonElement, i: number) => {
    let grab: { dx: number; dy: number; before: number } | null = null;
    const toBoard = (e: PointerEvent) => {
      const r = board.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
    };
    b.addEventListener('pointerdown', (e) => {
      if (finished || grab) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      const p = toBoard(e);
      const n = sim.nodes[i]!;
      grab = { dx: n.x - p.x, dy: n.y - p.y, before: sim.crossings() };
      b.classList.add('dragging');
      api?.sfx.tick();
      tell('', `${n.dev.name.replace('\u00ad', '')}: ${n.dev.desc}`);
    });
    b.addEventListener('pointermove', (e) => {
      if (!grab || !b.hasPointerCapture(e.pointerId)) return;
      const p = toBoard(e);
      sim.drag(i, { x: p.x + grab.dx, y: p.y + grab.dy });
      render();
    });
    const end = () => {
      if (!grab) return;
      const before = grab.before;
      grab = null;
      b.classList.remove('dragging');
      settle(i, before);
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    // Android verliert die Erfassung manchmal ohne pointercancel (Systemgeste, Tab-Wechsel)
    b.addEventListener('lostpointercapture', end);
    // Tastatur: Pfeile schieben wie ein Finger, Loslassen der Taste legt das Gerät ab
    let keyBefore: number | null = null;
    const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
    b.addEventListener('keydown', (e) => {
      const d = ARROWS[e.key];
      if (!d || finished || grab) return;
      e.preventDefault();
      const n = sim.nodes[i]!;
      if (keyBefore === null) {
        keyBefore = sim.crossings();
        b.classList.add('dragging');
        tell('', `${n.dev.name.replace('\u00ad', '')}: ${n.dev.desc}`);
      }
      sim.drag(i, { x: n.x + d[0], y: n.y + d[1] });
      render();
    });
    b.addEventListener('keyup', (e) => {
      if (!ARROWS[e.key] || keyBefore === null) return;
      const before = keyBefore;
      keyBefore = null;
      b.classList.remove('dragging');
      settle(i, before);
    });
    b.addEventListener('blur', () => {
      if (keyBefore === null) return;
      const before = keyBefore;
      keyBefore = null;
      b.classList.remove('dragging');
      settle(i, before);
    });
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      sim.cables.forEach((c) => {
        const color = CABLE_COLORS[c.color % CABLE_COLORS.length]!;
        const under = svg('line', { class: 'tg-cable-under' });
        const over = svg('line', { class: 'tg-cable', stroke: color });
        lines.append(under, over);
        cableEls.push({ under, over });
      });
      sim.nodes.forEach((n, i) => {
        const art = h('span', { class: 'tg-art', 'aria-hidden': 'true' });
        art.innerHTML = `<svg viewBox="0 0 76 40" preserveAspectRatio="none">${ART[n.dev.look]}</svg>`;
        // Name wie mit dem Beschriftungsgerät aufgeklebt
        const b = h('button', { class: 'tg-dev', type: 'button', 'aria-label': `${n.dev.name.replace('\u00ad', '')} verschieben (Pfeiltasten)` }, [
          art,
          h('b', { text: n.dev.name }),
        ]);
        b.style.width = `${CFG.boxW}%`;
        b.style.height = `${CFG.boxH}%`;
        bindDrag(b, i);
        boxes.push(b);
      });
      board.append(lines, marks, ...boxes);
      tell('', 'Gerät ziehen. Rote Punkte: Kabel kreuzen sich. Roter Rand: Gerät liegt auf einem fremden Kabel.');
      root.append(
        h('div', { class: 'tg' }, [
          h('div', { class: 'tg-win' }, [
            h('div', { class: 'tg-head', 'aria-hidden': 'true' }, [h('b', { text: 'Technikraum EG' }), h('span', { text: ' · Bodenplatte offen, Doku: keine' })]),
            board,
          ]),
          info,
        ]),
      );
      render();
      juice(board, [{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }], 200);
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `Kreuzungen: ${sim.crossings()} (am Anfang ${sim.startCrossings})`,
  };
}
