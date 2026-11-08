import { UPGRADES } from '../../config';
import { effectLabel, UPGRADE_TEXT } from '../../content/upgrades';
import { buyUpgrade } from '../../core/actions';
import { availableUpgrades } from '../../core/economy';
import type { AppContext, Tab } from '../app';
import { h, juice, setDisabled, setText, SHAKE } from '../dom';
import { formatNumber } from '../format';

const text = (id: string) => UPGRADE_TEXT[id] ?? { name: id, desc: '' };

export function upgradesTab(): Tab {
  let ctx: AppContext;
  const list = h('ul', { class: 'upgrades' });
  const doneTitle = h('div', { class: 'section-title' });
  const doneList = h('ul', { class: 'upgrades-done' });
  const empty = h('p', { class: 'hint', text: 'Keine offenen Anträge. Weiter Tickets schließen, dann fällt dem Management schon was ein.' });
  const pendingHint = h('p', { class: 'hint' });
  let buttons: { cost: number; el: HTMLButtonElement }[] = [];
  let signature = '';

  const rebuild = () => {
    const s = ctx.state;
    const avail = availableUpgrades(s);
    buttons = [];
    list.replaceChildren(
      ...avail.map((u) => {
        const t = text(u.id);
        const btn = h('button', { class: 'buy', type: 'button', 'data-upgrade': u.id }, [
          h('span', { class: 'buy-amount', text: 'kaufen' }),
          h('span', { class: 'buy-cost', text: formatNumber(u.cost) }),
        ]);
        const li = h('li', { class: 'gen upgrade' }, [
          h('div', { class: 'gen-main' }, [
            h('div', { class: 'gen-name', text: t.name }),
            h('div', { class: 'gen-desc', text: t.desc }),
            h('div', { class: 'upgrade-effect', text: effectLabel(u.effect) }),
          ]),
          btn,
        ]);
        btn.addEventListener('click', () => {
          if (buyUpgrade(ctx.state, u.id)) {
            ctx.haptic('buy');
          } else {
            ctx.sfx.error();
            ctx.haptic('error');
            juice(li, SHAKE, 260);
          }
        });
        buttons.push({ cost: u.cost, el: btn });
        return li;
      }),
    );
    empty.hidden = avail.length > 0;

    const done = UPGRADES.filter((u) => s.upgrades[u.id]);
    doneTitle.hidden = done.length === 0;
    setText(doneTitle, `# erledigt (${done.length})`);
    doneList.replaceChildren(
      ...done.map((u) => h('li', {}, [h('span', { text: '✓ ' }), text(u.id).name, h('span', { class: 'dim', text: ` · ${effectLabel(u.effect)}` })])),
    );

    const locked = UPGRADES.length - avail.length - done.length;
    setText(pendingHint, locked > 0 ? `${locked} weitere Anträge liegen beim Change Advisory Board.` : 'Alle Anträge bewilligt. Unheimlich.');
  };

  return {
    id: 'upgrades',
    label: 'Upgrades',
    icon: '[+]',
    mount(c) {
      ctx = c;
      return h('div', { class: 'infra' }, [
        h('div', { class: 'section-title', text: '# offene Beschaffungsanträge' }),
        list,
        empty,
        pendingHint,
        doneTitle,
        doneList,
      ]);
    },
    render() {
      const s = ctx.state;
      // Nur neu bauen, wenn sich die Menge geändert hat
      const sig = availableUpgrades(s).map((u) => u.id).join() + '|' + Object.keys(s.upgrades).length;
      if (sig !== signature) {
        signature = sig;
        rebuild();
      }
      for (const b of buttons) setDisabled(b.el, b.cost > s.tickets);
    },
    badge() {
      return availableUpgrades(ctx.state).some((u) => u.cost <= ctx.state.tickets);
    },
  };
}
