import { CONFIG, GENERATORS, type GeneratorId } from '../../config';
import { GENERATOR_TEXT, LOCKED_TEXT } from '../../content/generators';
import { buyGenerator } from '../../core/actions';
import { generatorDef, generatorProduction, isUnlocked, priceFor } from '../../core/economy';
import { BUY_AMOUNTS, type BuyAmount } from '../../core/state';
import type { AppContext, Tab } from '../app';
import { h, juice, setDisabled, setFlag, setText, SHAKE } from '../dom';
import { formatNumber, formatRate } from '../format';

interface Row {
  id: GeneratorId;
  el: HTMLElement;
  owned: HTMLElement;
  prod: HTMLElement;
  buy: HTMLButtonElement;
  buyAmount: HTMLElement;
  buyCost: HTMLElement;
}

const amountLabel = (a: BuyAmount) => (a === 'max' ? 'max' : `×${a}`);

export function infraTab(): Tab {
  let ctx: AppContext;
  const rows: Row[] = [];
  const segButtons: { amount: BuyAmount; el: HTMLButtonElement }[] = [];

  const teaserCost = h('span', { class: 'gen-cost' });
  const teaser = h('li', { class: 'gen gen-locked' }, [
    h('div', { class: 'gen-main' }, [
      h('div', { class: 'gen-name', text: LOCKED_TEXT.name }),
      h('div', { class: 'gen-desc', text: LOCKED_TEXT.desc }),
      h('div', { class: 'gen-prod' }, ['Sichtbar ab ', teaserCost, ' Tickets']),
    ]),
  ]);

  const buildRow = (id: GeneratorId): Row => {
    const text = GENERATOR_TEXT[id];
    const owned = h('span', { class: 'gen-owned' });
    const prod = h('div', { class: 'gen-prod' });
    const buyAmount = h('span', { class: 'buy-amount' });
    const buyCost = h('span', { class: 'buy-cost' });
    const buy = h('button', { class: 'buy', type: 'button', 'data-gen': id }, [buyAmount, buyCost]);
    const el = h('li', { class: 'gen', 'data-gen': id }, [
      h('div', { class: 'gen-main' }, [
        h('div', { class: 'gen-head' }, [
          h('span', { class: 'gen-icon', text: text.icon, 'aria-hidden': 'true' }),
          h('span', { class: 'gen-name', text: text.name }),
          owned,
        ]),
        h('div', { class: 'gen-desc', text: text.desc }),
        prod,
      ]),
      buy,
    ]);
    buy.addEventListener('click', () => {
      if (buyGenerator(ctx.state, id, ctx.state.settings.buyAmount)) {
        ctx.haptic('buy');
        juice(el, SHAKE, 260);
      } else {
        ctx.haptic('error');
      }
    });
    return { id, el, owned, prod, buy, buyAmount, buyCost };
  };

  return {
    id: 'infra',
    label: 'Infra',
    icon: '[≡]',
    mount(c) {
      ctx = c;
      const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Kaufmenge' });
      for (const amount of BUY_AMOUNTS) {
        const el = h('button', { class: 'seg-btn', type: 'button', role: 'radio', text: amountLabel(amount) });
        el.addEventListener('click', () => {
          ctx.state.settings.buyAmount = amount;
          ctx.haptic('tap');
        });
        seg.append(el);
        segButtons.push({ amount, el });
      }

      const list = h('ul', { class: 'gens' });
      for (const def of GENERATORS) {
        const row = buildRow(def.id);
        rows.push(row);
        list.append(row.el);
      }
      list.append(teaser);

      return h('div', { class: 'infra' }, [
        h('div', { class: 'section-title', text: '# Infrastruktur' }),
        seg,
        list,
        h('p', {
          class: 'hint',
          text: 'Ansible, Kubernetes & „der Server unterm Tisch“: warten auf das nächste Wartungsfenster.',
        }),
      ]);
    },
    render() {
      const s = ctx.state;
      for (const { amount, el } of segButtons) {
        const on = s.settings.buyAmount === amount;
        setFlag(el, 'active', on);
        el.setAttribute('aria-checked', String(on));
      }

      let firstLocked: GeneratorId | null = null;
      for (const row of rows) {
        const unlocked = isUnlocked(s, row.id);
        if (row.el.hidden === unlocked) row.el.hidden = !unlocked;
        if (!unlocked) {
          firstLocked ??= row.id;
          continue;
        }
        const def = generatorDef(row.id);
        const g = s.generators[row.id];
        const { n, cost } = priceFor(s, row.id, s.settings.buyAmount);
        setText(row.owned, g.owned > 0 ? `×${g.owned}` : '');
        setText(
          row.prod,
          g.owned > 0
            ? `${formatRate(def.baseProd)}/s je Stück · gesamt ${formatRate(generatorProduction(s, row.id))}/s`
            : `${formatRate(def.baseProd)}/s je Stück`,
        );
        setText(row.buyAmount, `+${n}`);
        setText(row.buyCost, formatNumber(cost));
        setDisabled(row.buy, cost > s.tickets);
      }

      const showTeaser = firstLocked !== null;
      if (teaser.hidden === showTeaser) teaser.hidden = !showTeaser;
      if (firstLocked) setText(teaserCost, formatNumber(generatorDef(firstLocked).baseCost * CONFIG.unlockAtFraction));
    },
  };
}
