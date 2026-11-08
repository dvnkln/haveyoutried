import { EVENT_EFFECTS } from '../config';
import { BUFF_LABELS } from '../content/events';
import { rates } from '../core/economy';
import { eventDef, resolveEvent, type EffectResult } from '../core/events';
import type { AppContext } from './app';
import { h, setFlag, setText } from './dom';
import { formatNumber } from './format';
import { showModal } from './modal';

/** Kurzbeschreibung eines Effekts, z. B. „+1.2 K Tickets“ oder „Flow: Produktion ×3 für 45 s“. */
export function describeEffect(r: EffectResult): string {
  const e = EVENT_EFFECTS[r.effect];
  switch (e.kind) {
    case 'none':
      return 'Keine Auswirkung. Immerhin.';
    case 'tickets':
      return `+${formatNumber(r.tickets)} Tickets`;
    case 'lose':
      return `−${formatNumber(-r.tickets)} Tickets`;
    case 'buff':
      return `${BUFF_LABELS[r.effect] ?? r.effect}: ${e.target === 'prod' ? 'Produktion' : 'Klicks'} ×${e.mult} für ${e.sec} s`;
  }
}

/**
 * Pager-Leiste oben über dem Inhalt. Erscheint bei einem Event, Tippen öffnet
 * den Entscheidungsdialog. Liegt als Overlay über den Panels, damit nichts springt.
 */
export function createPager(ctx: AppContext): { el: HTMLElement; render(): void } {
  const title = h('span', { class: 'pager-title' });
  const countdown = h('span', { class: 'pager-count' });
  const el = h('button', { class: 'pager', type: 'button', hidden: '' }, [
    h('span', { class: 'pager-tag', text: 'PAGER' }),
    title,
    countdown,
  ]);

  const showResult = (res: NonNullable<ReturnType<typeof resolveEvent>>, eventTitle: string) => {
    showModal({
      title: eventTitle,
      className: `modal-result mood-${res.mood}`,
      body: [res.outcome.text, h('p', { class: 'effect-line', text: describeEffect(res) })],
      actions: [{ label: res.mood === 'bad' ? 'Seufz.' : 'Weiter im Text', primary: true }],
      armDelayMs: 300,
    });
  };

  const open = () => {
    const active = ctx.state.events.active;
    const def = active && eventDef(active.id);
    if (!active || !def) return;
    active.opened = true;
    ctx.sfx.tick();
    showModal({
      title: `PAGER: ${def.title}`,
      className: 'modal-event',
      body: [def.text],
      stacked: true,
      armDelayMs: 450,
      actions: def.options.map((opt, i) => ({
        label: opt.label,
        onClick: () => {
          const res = resolveEvent(ctx.state, i, rates(ctx.state));
          if (res) showResult(res, def.title);
        },
      })),
      onDismiss: () => {
        // ohne Entscheidung zu: Pager piept weiter, mit etwas Nachfrist
        const a = ctx.state.events.active;
        if (!a) return;
        a.opened = false;
        a.expiresAt = Math.max(a.expiresAt, ctx.state.stats.playTimeMs + 15_000);
      },
    });
  };
  el.addEventListener('click', open);

  return {
    el,
    render() {
      const a = ctx.state.events.active;
      const show = !!a && !a.opened;
      if (el.hidden === show) el.hidden = !show;
      if (!a || !show) return;
      setText(title, eventDef(a.id)?.title ?? a.id);
      const left = Math.max(0, Math.ceil((a.expiresAt - ctx.state.stats.playTimeMs) / 1_000));
      setText(countdown, `${left}s`);
      setFlag(el, 'urgent', left <= 10);
    },
  };
}
