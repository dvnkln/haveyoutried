import { h, reducedMotion } from './dom';
import { randInt } from '../util';

/** Obergrenze für gleichzeitig sichtbare Effekt-Elemente (Leistung auf dem Handy). */
const MAX_PARTICLES = 20;
const CONFETTI_COLORS = ['#ffd166', '#ff9aa2', '#9be3c1', '#a0c4ff', '#fffaf0'];
/** So lange bleibt ein Combo-Spruch stehen, auch wenn weitergetippt wird. */
const COMBO_LINE_MS = 2_400;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Effekt-Ebene über dem ganzen Schreibtisch. Dosiert: ständige Effekte klein,
 * seltene Ereignisse dürfen größer sein. Bei reduced motion fast nichts.
 */
export class Fx {
  readonly el: HTMLElement;
  private comboEl: HTMLElement;
  private comboTimer = 0;
  private comboLine = '';
  private comboLineUntil = 0;
  /** Positionen ändern sich nur bei Größenänderung: zwischenspeichern statt pro Anschlag messen */
  private rects = new Map<Element, Rect>();

  constructor() {
    this.comboEl = h('div', { class: 'combo', 'aria-hidden': 'true', hidden: '' });
    this.el = h('div', { class: 'floaters fx', 'aria-hidden': 'true' }, [this.comboEl]);
    const clear = () => this.rects.clear();
    window.addEventListener('resize', clear);
    if (typeof ResizeObserver === 'function') new ResizeObserver(clear).observe(this.el);
  }

  /** Bildschirmkoordinaten (z. B. eines Fingers) in Koordinaten der Effekt-Ebene */
  toLocal(clientX: number, clientY: number): { x: number; y: number } {
    let o = this.rects.get(this.el);
    if (!o) {
      const r = this.el.getBoundingClientRect();
      o = { x: r.left, y: r.top, w: r.width, h: r.height };
      this.rects.set(this.el, o);
    }
    return { x: clientX - o.x, y: clientY - o.y };
  }

  /** Position eines Elements relativ zur Effekt-Ebene. cached = für Dinge, die sich nicht bewegen (Tasten). */
  rel(el: Element, cached = false): Rect {
    const hit = cached ? this.rects.get(el) : undefined;
    if (hit) return hit;
    const r = el.getBoundingClientRect();
    const o = this.el.getBoundingClientRect();
    const rect = { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    if (cached && rect.w > 0) this.rects.set(el, rect);
    return rect;
  }

  private add(el: HTMLElement): void {
    // älteste Partikel zuerst weg (Combo-Anzeige bleibt)
    while (this.el.childElementCount > MAX_PARTICLES) {
      const old = this.el.querySelector('.particle');
      if (!old) break;
      old.remove();
    }
    el.classList.add('particle');
    el.addEventListener('animationend', () => el.remove());
    this.el.append(el);
  }

  /** Aufsteigende Zahl bzw. Text (x/y relativ zur Effekt-Ebene). */
  floater(x: number, y: number, text: string, big = false): void {
    const f = h('span', { class: big ? 'floater floater-big' : 'floater', text });
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.setProperty('--drift', `${randInt(-20, 20)}px`);
    this.add(f);
  }

  /** Kleiner Haken bzw. Papierschnipsel, der von der Taste wegfliegt. */
  scrap(x: number, y: number): void {
    if (reducedMotion()) return;
    const s = h('span', { class: 'scrap', text: Math.random() < 0.5 ? '✓' : '' });
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${randInt(-50, 50)}px`);
    s.style.setProperty('--rot', `${randInt(-200, 200)}deg`);
    this.add(s);
  }

  /** Locher-Konfetti: kleine runde Papierpunkte, die herabrieseln. */
  confetti(x: number, y: number, n: number): void {
    if (reducedMotion()) return;
    for (let i = 0; i < Math.min(n, MAX_PARTICLES); i++) {
      const c = h('span', { class: 'confetti' });
      c.style.left = `${x + randInt(-30, 30)}px`;
      c.style.top = `${y + randInt(-10, 10)}px`;
      c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? '#fff';
      c.style.setProperty('--dx', `${randInt(-120, 120)}px`);
      c.style.setProperty('--dy', `${randInt(120, 320)}px`);
      c.style.animationDelay = `${randInt(0, 120)}ms`;
      this.add(c);
    }
  }

  /** Combo-Anzeige „×23“; ein Spruch bleibt eine Weile stehen, die Zahl zählt weiter. */
  combo(n: number, line?: string): void {
    const now = performance.now();
    if (line) {
      this.comboLine = line;
      this.comboLineUntil = now + COMBO_LINE_MS;
    }
    const showLine = now < this.comboLineUntil;
    this.comboEl.hidden = false;
    this.comboEl.textContent = showLine ? `×${n} · ${this.comboLine}` : `×${n}`;
    this.comboEl.style.setProperty('--size', String(Math.min(1.15, 1 + n / 800)));
    if (line) {
      // nur bei neuem Spruch hüpfen: kein Reflow pro Anschlag
      this.comboEl.classList.remove('bump');
      void this.comboEl.offsetWidth;
      this.comboEl.classList.add('bump');
    }
    clearTimeout(this.comboTimer);
    this.comboTimer = window.setTimeout(() => (this.comboEl.hidden = true), showLine ? this.comboLineUntil - now : 1_200);
  }
}
