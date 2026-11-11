import { h } from '../dom';

/** Titelleiste eines Terminalfensters (Log-Grep, Ping): Titel links, Fensterknöpfe rechts */
export function termBar(title: string): HTMLElement {
  return h('div', { class: 'term-bar', 'aria-hidden': 'true' }, [
    h('span', { class: 'term-title', text: title }),
    h('span', { class: 'term-btns' }, [h('span'), h('span'), h('span')]),
  ]);
}
