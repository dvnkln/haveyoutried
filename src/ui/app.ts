import type { Saver } from '../core/save';
import type { GameState } from '../core/state';
import { productionPerSec } from '../core/economy';
import { h, juice, POP, setFlag, setText } from './dom';
import { formatNumber, formatRate } from './format';
import type { HapticKind } from './haptics';
import type { SysLog } from './log';

export interface AppContext {
  state: GameState;
  log: SysLog;
  saver: Saver;
  haptic: (kind: HapticKind) => void;
}

/** Ein Tab der Bottom-Nav. Phase 2: Upgrades/Achievements = ein Eintrag mehr. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
  mount(ctx: AppContext): HTMLElement;
  render(): void;
  onShow?(): void;
}

export interface App {
  render(): void;
  popCounter(): void;
}

export function mountApp(root: HTMLElement, ctx: AppContext, tabs: Tab[]): App {
  const tickets = h('span', { class: 'counter-value', text: '0' });
  const rate = h('span', { class: 'rate', text: '+0.0/s' });
  const header = h('header', { class: 'top' }, [
    h('div', { class: 'prompt' }, [
      h('span', { class: 'prompt-user', text: 'root@helpdesk' }),
      h('span', { text: ':~# ' }),
      h('span', { class: 'prompt-title', text: 'Have You Tried…' }),
    ]),
    h('div', { class: 'counter' }, [tickets, h('span', { class: 'counter-unit', text: ' Tickets' })]),
    rate,
  ]);

  const main = h('main', { class: 'panels' });
  const nav = h('nav', { class: 'bottom-nav', 'aria-label': 'Navigation' });

  const mounted = tabs.map((tab) => {
    const panel = h('section', { class: `panel panel-${tab.id}`, id: `panel-${tab.id}`, role: 'tabpanel' });
    panel.append(tab.mount(ctx));
    const btn = h('button', { class: 'nav-btn', type: 'button', role: 'tab', 'aria-controls': panel.id }, [
      h('span', { class: 'nav-icon', text: tab.icon }),
      h('span', { class: 'nav-label', text: tab.label }),
    ]);
    main.append(panel);
    nav.append(btn);
    return { tab, panel, btn };
  });

  let active = mounted[0];
  const select = (id: string) => {
    for (const m of mounted) {
      const on = m.tab.id === id;
      m.panel.hidden = !on;
      setFlag(m.btn, 'active', on);
      m.btn.setAttribute('aria-selected', String(on));
      if (on) active = m;
    }
    active?.tab.onShow?.();
    active?.tab.render();
  };
  for (const m of mounted) {
    m.btn.addEventListener('click', () => {
      if (active !== m) ctx.haptic('tap');
      select(m.tab.id);
    });
  }

  root.replaceChildren(header, main, nav);
  if (active) select(active.tab.id);

  return {
    render() {
      setText(tickets, formatNumber(ctx.state.tickets));
      setText(rate, `+${formatRate(productionPerSec(ctx.state))}/s`);
      active?.tab.render();
    },
    popCounter() {
      juice(tickets, POP, 320);
    },
  };
}
