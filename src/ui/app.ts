import type { Saver } from '../core/save';
import type { GameState } from '../core/state';
import { productionPerSec } from '../core/economy';
import type { Sfx } from './audio';
import { h, juice, POP, setFlag, setText } from './dom';
import { formatNumber, formatRate } from './format';
import type { HapticKind } from './haptics';
import type { SysLog } from './log';
import { createPager } from './pager';
import { createToaster } from './toast';
import { BUFF_LABELS } from '../content/events';
import { companyOf } from '../content/companies';

export interface AppContext {
  state: GameState;
  log: SysLog;
  saver: Saver;
  sfx: Sfx;
  haptic: (kind: HapticKind) => void;
}

/** Ein Tab der Bottom-Nav. Phase 2: Achievements = ein Eintrag mehr. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
  mount(ctx: AppContext): HTMLElement;
  render(): void;
  onShow?(): void;
  /** Punkt an der Nav, z. B. „hier gibt es was zu kaufen“ */
  badge?(): boolean;
}

export interface App {
  render(): void;
  popCounter(): void;
  toast(title: string, text: string): void;
}

export function mountApp(root: HTMLElement, ctx: AppContext, tabs: Tab[]): App {
  const tickets = h('span', { class: 'counter-value', text: '0' });
  const rate = h('span', { class: 'rate', text: '+0.0/s' });
  const buffsEl = h('span', { class: 'buffs', 'aria-live': 'polite' });
  // Hostname der aktuellen Firma (wechselt beim Kündigen)
  const promptUser = h('span', { class: 'prompt-user' });
  let buffSig = '';
  let buffChips: HTMLElement[] = [];

  const header = h('header', { class: 'top' }, [
    h('div', { class: 'top-text' }, [
      h('div', { class: 'prompt' }, [
        promptUser,
        h('span', { text: ':~# ' }),
        h('span', { class: 'prompt-title', text: 'Have You Tried…' }),
      ]),
      h('div', { class: 'counter' }, [tickets, h('span', { class: 'counter-unit', text: ' Tickets' })]),
      h('div', { class: 'rate-row' }, [rate, buffsEl]),
    ]),
  ]);

  const main = h('main', { class: 'panels' });
  const pager = createPager(ctx);
  const toaster = createToaster();
  main.append(pager.el, toaster.el);
  const nav = h('nav', { class: 'bottom-nav', 'aria-label': 'Navigation' });

  const mounted = tabs.map((tab) => {
    const panel = h('section', { class: `panel panel-${tab.id}`, id: `panel-${tab.id}`, role: 'tabpanel' });
    panel.append(tab.mount(ctx));
    const btn = h('button', { class: 'nav-btn', type: 'button', role: 'tab', 'aria-controls': panel.id }, [
      h('span', { class: 'nav-icon', text: tab.icon }),
      h('span', { class: 'nav-label', text: tab.label }),
      h('span', { class: 'nav-badge', 'aria-hidden': 'true' }),
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
      if (active !== m) {
        ctx.haptic('tap');
        ctx.sfx.tick();
      }
      select(m.tab.id);
    });
  }

  root.replaceChildren(header, main, nav);
  if (active) select(active.tab.id);

  return {
    render() {
      setText(tickets, formatNumber(ctx.state.tickets));
      setText(promptUser, `root@${companyOf(ctx.state.prestige.company).host}`);
      setText(rate, `+${formatRate(productionPerSec(ctx.state))}/s`);
      for (const m of mounted) setFlag(m.btn, 'has-badge', m.tab.badge?.() ?? false);
      pager.render();

      // Boost-Chips: nur neu bauen, wenn sich die Menge ändert
      const buffs = ctx.state.buffs;
      const sig = buffs.map((b) => b.id).join();
      if (sig !== buffSig) {
        buffSig = sig;
        buffChips = buffs.map((b) => h('span', { class: `buff ${b.mult >= 1 ? 'buff-good' : 'buff-bad'}` }));
        buffsEl.replaceChildren(...buffChips);
      }
      buffs.forEach((b, i) => {
        const chip = buffChips[i];
        if (chip) setText(chip, `${BUFF_LABELS[b.id] ?? b.id} ×${b.mult} ${Math.ceil(b.remainingMs / 1_000)}s`);
      });
      active?.tab.render();
    },
    popCounter() {
      juice(tickets, POP, 320);
    },
    toast: toaster.show,
  };
}
