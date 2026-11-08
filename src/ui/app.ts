import type { Saver } from '../core/save';
import type { GameState } from '../core/state';
import { bus } from '../core/bus';
import { productionPerSec, rates } from '../core/economy';
import { addTickets } from '../core/state';
import type { Sfx } from './audio';
import { createDesk } from './desk';
import { h, juice, POP, quip, setFlag, setText } from './dom';
import { formatNumber, formatRate } from './format';
import type { HapticKind } from './haptics';
import { Fx } from './juice';
import type { SysLog } from './log';
import type { TicketHistory } from './history';
import { createPager } from './pager';
import { createProps } from './props';
import { createToaster } from './toast';
import { BUFF_LABELS } from '../content/events';
import { companyOf } from '../content/companies';
import { TRASH_LINES } from '../content/props';
import { pick } from '../util';

export interface AppContext {
  state: GameState;
  log: SysLog;
  /** App „Tickets“: erledigte Fenster, Pager, Incidents */
  history: TicketHistory;
  saver: Saver;
  sfx: Sfx;
  haptic: (kind: HapticKind) => void;
}

/** Eine App auf dem Desktop: Icon antippen öffnet sie als großes Fenster. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
  mount(ctx: AppContext): HTMLElement;
  render(): void;
  onShow?(): void;
  /** Punkt am Icon, z. B. „hier gibt es was zu kaufen“ */
  badge?(): boolean;
}

export interface App {
  render(): void;
  popCounter(): void;
  toast(title: string, text: string): void;
}

const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>`;
const svgTile = (markup: string) => {
  const el = h('span', { class: 'app-tile tile-trash', 'aria-hidden': 'true' });
  el.innerHTML = markup;
  return el;
};
/** „[≡]“ → „≡“: Klammern passen nicht auf die Kachel */
const glyph = (icon: string) => icon.replace(/[[\]()]/g, '');

/** Papierkorb: so viele Tickets bis „voll“, Bonus wie ein kleines Dringend-Ticket */
const TRASH_FULL = 150;
const TRASH_BONUS_SEC = 30;
const TRASH_BONUS_CLICKS = 15;

const WOBBLE: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-1deg) scale(1.01)' },
  { transform: 'rotate(.8deg)' },
  { transform: 'rotate(-.3deg)' },
  { transform: 'rotate(0)' },
];

/**
 * Schreibtisch-Layout: Wand mit Zähler oben, Röhrenmonitor mit Desktop (App-Icons und Arbeitsfenster),
 * Anrufer, Tastatur unten. Apps öffnen als großes Fenster über allem; × oder Zurück schließt es.
 */
export function mountApp(root: HTMLElement, ctx: AppContext, tabs: Tab[]): App {
  const fx = new Fx();
  const props = createProps(ctx);

  // --- Wand ---
  const tickets = h('span', { class: 'counter-value', text: '0' });
  const rate = h('span', { class: 'rate', text: '+0.0/s' });
  const buffsEl = h('span', { class: 'buffs', 'aria-live': 'polite' });
  let buffSig = '';
  let buffChips: HTMLElement[] = [];
  const header = h('header', { class: 'wall' }, [
    h('div', { class: 'sign counter-sign' }, [
      h('div', { class: 'counter' }, [tickets, h('span', { class: 'counter-unit', text: ' Tickets' })]),
      h('div', { class: 'rate-row' }, [rate, buffsEl]),
    ]),
    props.kanban,
    props.incidentSign,
  ]);

  // --- Monitor mit Desktop ---
  const promptUser = h('span', { class: 'prompt-user' });
  const icons = h('nav', { class: 'desk-icons', 'aria-label': 'Programme' });
  const screen = h('div', { class: 'screen' });
  const desk = createDesk(ctx, fx, () => root, () => screen);
  desk.promptSlot.replaceChildren(promptUser, ':~$ ');
  screen.append(h('div', { class: 'desktop' }, [icons, desk.work, desk.lastClosed]), h('div', { class: 'scanlines', 'aria-hidden': 'true' }));

  const led = h('span', { class: 'led', 'aria-hidden': 'true' });
  // Monitor-Upgrade: neues Modell statt zweitem Bildschirm
  const brand = h('span', { class: 'brand', text: 'HYT-2000' });
  const monitor = h('div', { class: 'monitor' }, [
    screen,
    h('div', { class: 'chin' }, [h('span', { class: 'vents', 'aria-hidden': 'true' }), brand, led]),
    h('div', { class: 'frost', 'aria-hidden': 'true' }),
  ]);
  const monitorArea = h('section', { class: 'monitor-area' }, [
    props.cables,
    props.dust,
    props.kNote,
    props.beacon,
    props.poster,
    monitor,
    desk.phone,
    ...props.notes,
    props.duck,
  ]);

  // --- Schreibtisch ---
  const pager = createPager(ctx);
  const deskbar = h('div', { class: 'deskbar' }, [
    desk.callerEl,
    props.plant,
    h('div', { class: 'mug-spot' }, [props.mug, props.book]),
    props.mate,
    pager.device,
  ]);
  // Maus rechts neben der Tastatur
  desk.keyboard.append(props.mouse);

  // --- App-Fenster (Sheet) ---
  const sheetIcon = h('span', { class: 'app-tile', 'aria-hidden': 'true' });
  const sheetTitle = h('h2', { class: 'sheet-title', id: 'sheet-title' });
  const sheetClose = h('button', { class: 'sheet-close', type: 'button', 'aria-label': 'Fenster schließen', text: '×' });
  const sheetBody = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title', hidden: '' }, [
    h('div', { class: 'sheet-bar' }, [sheetIcon, sheetTitle, sheetClose]),
    sheetBody,
  ]);

  const toaster = createToaster();

  const mounted = tabs.map((tab) => {
    const panel = h('section', { class: `panel panel-${tab.id}`, id: `panel-${tab.id}`, hidden: '' });
    panel.append(tab.mount(ctx));
    sheetBody.append(panel);
    const btn = h('button', { class: `app-icon app-${tab.id}`, type: 'button', 'aria-haspopup': 'dialog' }, [
      h('span', { class: `app-tile tile-${tab.id}`, 'aria-hidden': 'true', text: glyph(tab.icon) }),
      h('span', { class: 'app-label', text: tab.label }),
      h('span', { class: 'nav-badge', 'aria-hidden': 'true' }),
    ]);
    icons.append(btn);
    return { tab, panel, btn };
  });
  // Papierkorb: reiner Gag
  const trash = h('button', { class: 'app-icon app-trash', type: 'button' }, [
    svgTile(TRASH_SVG),
    h('span', { class: 'app-label', text: 'Papierkorb' }),
    h('span', { class: 'nav-badge', 'aria-hidden': 'true' }),
  ]);
  // Papierkorb füllt sich mit erledigten Tickets; voll geleert gibt es Altpapier-Pfand
  let trashCount = 0;
  bus.on('click', () => trashCount++);
  trash.addEventListener('click', () => {
    juice(trash, POP, 240);
    const fill = Math.min(1, trashCount / TRASH_FULL);
    if (fill < 1) {
      ctx.sfx.tick();
      const msg = `${Math.round(fill * 100)} % voll. Erst leeren, wenn er überquillt. So steht es in der Hausordnung.`;
      ctx.log.write('info', `trash[99]: ${msg}`);
      quip(trash, msg);
      return;
    }
    const r = rates(ctx.state);
    const bonus = Math.max(r.pps * TRASH_BONUS_SEC, r.click * TRASH_BONUS_CLICKS);
    addTickets(ctx.state, bonus);
    trashCount = 0;
    const line = pick(TRASH_LINES);
    ctx.log.write('info', line);
    quip(trash, `${line} Altpapier-Pfand: +${formatNumber(bonus)} Tickets.`);
    ctx.log.write('ok', `trash[99]: Altpapier-Pfand eingelöst: +${formatNumber(bonus)} Tickets.`);
    const p = fx.rel(trash);
    fx.floater(p.x + p.w / 2, p.y + p.h / 2, `+${formatNumber(bonus)}`, true);
    ctx.sfx.milestone();
    ctx.haptic('milestone');
    juice(tickets, POP, 320);
  });
  icons.append(trash);

  let active: (typeof mounted)[number] | null = null;
  const showSheet = (m: (typeof mounted)[number]) => {
    for (const x of mounted) x.panel.hidden = x !== m;
    active = m;
    setText(sheetIcon, glyph(m.tab.icon));
    sheetIcon.className = `app-tile tile-${m.tab.id}`;
    setText(sheetTitle, m.tab.label);
    sheet.hidden = false;
    root.classList.add('sheet-open');
    // Hintergrund für Tastatur und Screenreader stilllegen, Fokus ins Fenster
    for (const el of background) el.inert = true;
    m.tab.onShow?.();
    m.tab.render();
    sheetBody.scrollTop = 0;
    sheetClose.focus({ preventScroll: true });
  };
  const hideSheet = () => {
    if (!active) return;
    sheet.hidden = true;
    root.classList.remove('sheet-open');
    for (const el of background) el.inert = false;
    active.btn.focus({ preventScroll: true });
    active = null;
  };
  // Android-Zurück schließt das Fenster: beim Öffnen einen Verlaufseintrag anlegen
  const closeSheet = () => {
    if (active && history.state?.sheet === active.tab.id) history.back();
    else hideSheet();
  };
  // Nach Neuladen kann noch ein alter Fenster-Eintrag im Verlauf stehen: neutralisieren
  if (history.state?.sheet) history.replaceState(null, '');
  window.addEventListener('popstate', hideSheet);
  for (const m of mounted) {
    m.btn.addEventListener('click', () => {
      ctx.haptic('tap');
      ctx.sfx.tick();
      if (!active) history.pushState({ sheet: m.tab.id }, '');
      showSheet(m);
    });
  }
  sheetClose.addEventListener('click', closeSheet);
  // Esc schließt das Fenster, bevor die Panik-Taste es abfängt
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && active && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        closeSheet();
      }
    },
    { capture: true },
  );

  root.replaceChildren(header, monitorArea, deskbar, desk.keyboard, sheet, pager.el, toaster.el, fx.el);
  const background = [header, monitorArea, deskbar, desk.keyboard];
  desk.start();

  // Toasts enden über der Tastatur
  const kbHeight = () => root.style.setProperty('--kb-h', `${desk.keyboard.offsetHeight}px`);
  kbHeight();
  if (typeof ResizeObserver === 'function') new ResizeObserver(kbHeight).observe(desk.keyboard);

  // --- Bildschirm-Effekte über Spielereignisse ---
  const blink = () => {
    led.classList.remove('blink');
    void led.offsetWidth;
    led.classList.add('blink');
  };
  const wobble = () => {
    juice(monitor, WOBBLE, 420);
    blink();
  };
  bus.on('milestone', ({ owned }) => owned > 1 && wobble());
  bus.on('upgrade', wobble);
  bus.on('eventIncoming', blink);

  let lastConfetti = 0;
  const confettiAt = (n: number) => {
    const s = fx.rel(screen);
    fx.confetti(s.x + s.w / 2, s.y + s.h * 0.55, n);
  };
  bus.on('achievement', () => {
    // mehrere auf einmal: einmal Konfetti reicht
    const now = performance.now();
    if (now - lastConfetti < 800) return;
    lastConfetti = now;
    confettiAt(12);
  });
  bus.on('jobQuit', () => {
    // „Have you tried turning it off and on again?“
    if (active) closeSheet();
    screen.classList.remove('crt-restart');
    void screen.offsetWidth;
    screen.classList.add('crt-restart');
    setTimeout(() => confettiAt(20), 900);
  });
  screen.addEventListener('animationend', (e) => {
    if (e.animationName === 'crt-restart') screen.classList.remove('crt-restart');
  });

  return {
    render() {
      const s = ctx.state;
      setText(tickets, formatNumber(s.tickets));
      const host = companyOf(s.prestige.company).host;
      setText(promptUser, `root@${host}`);
      setText(rate, `+${formatRate(productionPerSec(s))}/s`);
      for (const m of mounted) setFlag(m.btn, 'has-badge', m.tab.badge?.() ?? false);
      const fill = Math.min(1, trashCount / TRASH_FULL);
      trash.style.setProperty('--fill', fill.toFixed(2));
      setFlag(trash, 'has-badge', fill >= 1);
      pager.render();
      props.render();
      desk.render(s);
      setFlag(root, 'basement', !!s.upgrades.basement);
      setFlag(monitor, 'frozen', !!s.upgrades.freeze);
      setFlag(monitor, 'pro', !!s.upgrades.monitor2);
      setText(brand, s.upgrades.monitor2 ? 'HYT-3000 PRO' : 'HYT-2000');

      // Boost-Chips: nur neu bauen, wenn sich die Menge ändert
      const buffs = s.buffs;
      const sig = buffs.map((b) => b.id).join();
      if (sig !== buffSig) {
        buffSig = sig;
        buffChips = buffs.map((b) => h('span', { class: `buff ${b.mult >= 1 ? 'buff-good' : 'buff-bad'}` }));
        buffsEl.replaceChildren(...buffChips);
        setFlag(screen, 'brake', buffs.some((b) => b.mult < 1));
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
