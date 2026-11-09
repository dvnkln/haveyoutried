import { h } from './dom';

const VISIBLE_MS = 3_200;
/** mehr warten nicht: der Rest wäre ohnehin veraltet */
const MAX_QUEUED = 4;

/**
 * Kurze Meldungen unten im Inhaltsbereich (z. B. Achievements), blockieren nichts.
 * Immer nur eine zur Zeit; weitere stellen sich hinten an, statt sich zu stapeln.
 */
export function createToaster(): { el: HTMLElement; show(title: string, text: string): void } {
  const el = h('div', { class: 'toasts', 'aria-live': 'polite' });
  const queue: { title: string; text: string }[] = [];
  let showing = false;

  const next = () => {
    const item = queue.shift();
    if (!item) {
      showing = false;
      return;
    }
    showing = true;
    const t = h('div', { class: 'toast' }, [h('div', { class: 'toast-title', text: item.title }), h('div', { class: 'toast-text', text: item.text })]);
    el.append(t);
    setTimeout(() => t.classList.add('out'), VISIBLE_MS - 400);
    setTimeout(() => {
      t.remove();
      next();
    }, VISIBLE_MS);
  };

  return {
    el,
    show(title, text) {
      if (queue.length >= MAX_QUEUED) queue.shift();
      queue.push({ title, text });
      if (!showing) next();
    },
  };
}

/** Gerade läuft etwas, das Aufmerksamkeit will (Meldung, VIP-Zettel, Kaffeetasse, Hinweis vom Vorgänger)? */
export function attentionBusy(ignore: string[] = []): boolean {
  const sel = ['.toast', '.urgent-note', '.espresso-cup', '.tut-note:not([hidden])'].filter((x) => !ignore.includes(x));
  return sel.some((x) => document.querySelector(x));
}
