type Attrs = {
  class?: string;
  text?: string;
  [attr: string]: string | undefined;
};

/** Kleiner Element-Builder. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

/** DOM nur anfassen, wenn sich etwas geändert hat. */
export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setFlag(el: Element, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

/**
 * Knopf kurz sperren (gegen Fehlgriffe beim Dauertippen): sichtbar grau, unten füllt sich ein Balken
 * genau so lange, wie gesperrt ist (eine Zahl für Balken und Freigabe). War er schon gesperrt, bleibt er es.
 */
export function armButton(btn: HTMLButtonElement, ms: number): void {
  if (btn.disabled || ms <= 0) return;
  btn.disabled = true;
  btn.classList.add('arming');
  btn.style.setProperty('--arm', `${ms}ms`);
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('arming');
  }, ms);
}

const reduceMotionQuery =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const reducedMotion = () => reduceMotionQuery?.matches ?? false;

/** Kurze Effekt-Animation, entfällt bei reduced motion. */
export function juice(el: Element, keyframes: Keyframe[], ms = 220, additive = false): void {
  if (reducedMotion() || typeof el.animate !== 'function') return;
  // additive: auf das bestehende CSS-transform aufsetzen (z. B. gedrehte Post-its) statt es zu ersetzen
  el.animate(keyframes, { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1.4)', composite: additive ? 'add' : 'replace' });
}

export const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.18)' },
  { transform: 'scale(1)' },
];
/** Dezent, für breite Elemente (darf nicht über den Rand wachsen) */
export const NUDGE: Keyframe[] = [
  { transform: 'scale(.97)', opacity: 0.4 },
  { transform: 'scale(1.03)', opacity: 1 },
  { transform: 'scale(1)' },
];
export const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-4px) rotate(-.6deg)' },
  { transform: 'translateX(4px) rotate(.6deg)' },
  { transform: 'translateX(-2px)' },
  { transform: 'translateX(0)' },
];

const quips = new WeakMap<Element, HTMLElement>();
/** Kleine Sprechblase über einem Gegenstand (Ente, Maus, Papierkorb); verschwindet von selbst. */
export function quip(anchor: Element, text: string, ms = 3_400): void {
  quips.get(anchor)?.remove();
  // „duckd[42]: quack“ → „quack“: in der Blase braucht es keinen Prozessnamen
  const el = h('div', { class: 'quip', role: 'status', text: text.replace(/^[\w-]+\[[^\]]*\]: /, '') });
  document.body.append(el);
  quips.set(anchor, el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
  el.style.top = `${Math.max(8, r.top - el.offsetHeight - 8)}px`;
  el.style.setProperty('--tail', `${Math.min(w - 14, Math.max(14, r.left + r.width / 2 - parseFloat(el.style.left)))}px`);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, ms);
}

/**
 * Effektiver CSS-Zoom eines Elements (z. B. verkleinertes Minispiel). Bildschirm-Pixel
 * (clientX, getBoundingClientRect) durch diesen Wert teilen, bevor sie als Länge im Element landen.
 */
export function cssZoom(el: Element): number {
  return (el as Element & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
}
