import type { Tab } from '../app';
import { h } from '../dom';

/** App „Tickets“: Verlauf der erledigten Fenster, VIP-Post-its, Pager-Einsätze und Incidents, neueste oben. */
export function logTab(): Tab {
  return {
    id: 'log',
    label: 'Tickets',
    icon: '#',
    mount(ctx) {
      return h('div', { class: 'histapp' }, [ctx.history.el]);
    },
    render() {
      /* ereignisgetrieben; neueste Karte oben, das Fenster öffnet immer ganz oben */
    },
  };
}
