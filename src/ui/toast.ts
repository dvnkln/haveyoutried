import { h } from './dom';

const VISIBLE_MS = 3_200;
const MAX_VISIBLE = 3;

/**
 * Kurze Meldungen unten im Inhaltsbereich (z. B. Achievements), blockieren nichts.
 * Bis zu drei gleichzeitig; kommen mehr, verschwindet die älteste sofort.
 */
export function createToaster(): { el: HTMLElement; show(title: string, text: string): void } {
  const el = h('div', { class: 'toasts', 'aria-live': 'polite' });

  return {
    el,
    show(title, text) {
      while (el.childElementCount >= MAX_VISIBLE) el.firstElementChild?.remove();
      const t = h('div', { class: 'toast' }, [h('div', { class: 'toast-title', text: title }), h('div', { class: 'toast-text', text })]);
      el.append(t);
      setTimeout(() => t.classList.add('out'), VISIBLE_MS - 400);
      setTimeout(() => t.remove(), VISIBLE_MS);
    },
  };
}
