import { CONFIG, EVENT_EFFECTS } from '../config';
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
      return `${BUFF_LABELS[r.effect] ?? r.effect}: ${e.target === 'prod' ? 'Produktion' : 'Tipptempo'} ×${e.mult} für ${e.sec} s`;
  }
}

/**
 * Pager-Leiste oben über dem Inhalt. Erscheint bei einem Event, Tippen öffnet
 * den Entscheidungsdialog. Liegt als Overlay über den Panels, damit nichts springt.
 */
export function createPager(ctx: AppContext): { el: HTMLElement; device: HTMLElement; render(): void } {
  const title = h('span', { class: 'pager-title' });
  const countdown = h('span', { class: 'pager-count' });
  // Füllung läuft leer = verbleibende Zeit
  const fill = h('span', { class: 'pager-fill', 'aria-hidden': 'true' });
  const el = h('button', { class: 'pager', type: 'button', hidden: '' }, [
    fill,
    h('span', { class: 'pager-tag', text: 'PAGER' }),
    title,
    countdown,
  ]);

  const showResult = (res: NonNullable<ReturnType<typeof resolveEvent>>, eventTitle: string) => {
    showModal({
      title: eventTitle,
      className: `modal-result modal-pager mood-${res.mood}`,
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
      title: def.title,
      className: 'modal-event modal-pager',
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

  // Der Pager als Gerät auf dem Schreibtisch: Ruhe = Uhrzeit, Alarm = Titel + Countdown, Antippen öffnet
  const lcdTitle = h('span', { class: 'pd-title' });
  const lcdCount = h('span', { class: 'pd-count' });
  // Restzeit als LCD-Balken, der leerläuft
  const lcdFill = h('span', { class: 'pd-fill' });
  const device = h('button', { class: 'pager-device', type: 'button', 'aria-label': 'Pager' }, [
    h('span', { class: 'pd-lcd' }, [lcdTitle, h('span', { class: 'pd-row' }, [h('span', { class: 'pd-bar' }, [lcdFill]), lcdCount])]),
    h('span', { class: 'pd-led', 'aria-hidden': 'true' }),
  ]);
  // Eskalation: 1 = piept, 2 = nervt, 3 = brennt (Pager hüpft, Becher klirrt, Dauerpiepen)
  let level = 0;
  let lastBeep = 0;
  const setLevel = (next: number) => {
    if (next === level) return;
    const up = next > level;
    level = next;
    device.dataset.level = String(level);
    el.dataset.level = String(level);
    document.getElementById('app')?.classList.toggle('pager-panic', level >= 3);
    if (up && level >= 2) {
      lastBeep = performance.now();
      ctx.sfx.pager();
      ctx.haptic(level >= 3 ? 'error' : 'unlock');
    }
  };
  device.addEventListener('click', () => {
    const a = ctx.state.events.active;
    if (a && !a.opened) open();
  });

  return {
    el,
    device,
    render() {
      const a = ctx.state.events.active;
      const show = !!a && !a.opened;
      if (el.hidden === show) el.hidden = !show;
      setFlag(device, 'alert', show);
      device.setAttribute('aria-label', show ? `Pager: ${eventDef(a!.id)?.title ?? ''}` : 'Pager');
      if (!a || !show) {
        setLevel(0);
        const d = new Date();
        setText(lcdTitle, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
        setText(lcdCount, '');
        return;
      }
      setText(lcdTitle, eventDef(a.id)?.title ?? a.id);
      setText(title, eventDef(a.id)?.title ?? a.id);
      const leftMs = Math.max(0, a.expiresAt - ctx.state.stats.playTimeMs);
      const left = Math.ceil(leftMs / 1_000);
      setText(countdown, `${left}s`);
      setText(lcdCount, `${left}s`);
      const frac = Math.min(1, leftMs / CONFIG.eventExpireMs);
      fill.style.transform = `scaleX(${frac})`;
      lcdFill.style.transform = `scaleX(${frac})`;
      setFlag(el, 'urgent', left <= 10);
      setFlag(device, 'urgent', left <= 10);
      setLevel(frac > 0.6 ? 1 : frac > 0.3 ? 2 : 3);
      // in der letzten Phase alle paar Sekunden nachpiepen
      const now = performance.now();
      if (level >= 3 && now - lastBeep > 3_500 && !document.hidden) {
        lastBeep = now;
        ctx.sfx.pager();
        ctx.haptic('unlock');
      }
    },
  };
}
