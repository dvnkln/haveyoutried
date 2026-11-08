import type { AppContext, Tab } from '../app';
import { h } from '../dom';

/** App „Log“: das Syslog zum Nachlesen. Läuft im Hintergrund immer mit. */
export function logTab(): Tab {
  let ctx: AppContext;
  return {
    id: 'log',
    label: 'Log',
    icon: '>_',
    mount(c) {
      ctx = c;
      return h('div', { class: 'logapp' }, [ctx.log.el]);
    },
    render() {
      /* ereignisgetrieben */
    },
    onShow() {
      ctx.log.scrollToEnd();
    },
  };
}
