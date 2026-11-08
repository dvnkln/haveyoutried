import { CONFIG } from '../../config';
import { CALLERS, type Caller } from '../../content/callers';
import { CLOSE_REASONS } from '../../content/syslog';
import { clickTicket } from '../../core/actions';
import { pick, randInt } from '../../util';
import type { AppContext, Tab } from '../app';
import { h, juice, POP, setText, SQUASH } from '../dom';
import { formatNumber } from '../format';

const MAX_FLOATERS = 24;

const ticketId = (no: number) => `#INC-${String(no).padStart(6, '0')}`;

/** Haupt-Tab: Syslog oben, Anrufer + großer Button in der Daumenzone. */
export function queueTab(): Tab {
  let ctx: AppContext;
  let caller: Caller = pick(CALLERS);
  let callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
  let lastClickLog = 0;
  /** Frühester Zeitpunkt für den nächsten Anrufer (Lesezeit) */
  let callerUntil = 0;

  const face = h('div', { class: 'caller-face', 'aria-hidden': 'true' });
  const who = h('div', { class: 'caller-who' });
  const says = h('p', { class: 'caller-says' });
  const bubble = h('div', { class: 'bubble' }, [who, says]);
  const callerEl = h('div', { class: 'caller' }, [bubble, face]);

  const btnSub = h('span', { class: 'close-sub' });
  const button = h('button', { class: 'close-btn', type: 'button' }, [
    h('span', { class: 'close-label', text: 'Ticket schließen' }),
    btnSub,
  ]);
  const last = h('div', { class: 'last-closed', 'aria-live': 'polite' });
  const floaters = h('div', { class: 'floaters', 'aria-hidden': 'true' });
  const desk = h('div', { class: 'desk' }, [callerEl, button, last, floaters]);

  const showCaller = (c: Caller) => {
    caller = c;
    setText(face, c.face);
    setText(who, c.who);
    const line = pick(c.lines);
    setText(says, line);
    callerUntil = performance.now() + CONFIG.callerMinShowMs + line.length * CONFIG.callerShowMsPerChar;
    juice(callerEl, POP, 260);
  };

  const nextCaller = () => {
    let next = pick(CALLERS);
    while (CALLERS.length > 1 && next === caller) next = pick(CALLERS);
    callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
    showCaller(next);
  };

  const spawnFloater = (x: number, y: number, value: number) => {
    if (floaters.childElementCount >= MAX_FLOATERS) floaters.firstElementChild?.remove();
    const f = h('span', { class: 'floater', text: `+${formatNumber(value)}` });
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.setProperty('--drift', `${randInt(-24, 24)}px`);
    f.addEventListener('animationend', () => f.remove());
    floaters.append(f);
  };

  const close = (x: number, y: number) => {
    const value = clickTicket(ctx.state);
    const no = CONFIG.ticketNumberOffset + ctx.state.clicks;
    const reason = pick(CLOSE_REASONS);
    setText(last, `${ticketId(no)} → ${reason}`);
    setText(btnSub, ticketId(no + 1));
    juice(button, SQUASH, 160);
    spawnFloater(x, y, value);
    ctx.haptic('tap');

    const now = performance.now();
    if (now - lastClickLog > CONFIG.clickLogMinMs) {
      lastClickLog = now;
      ctx.log.write('info', `helpdesk[1337]: ${ticketId(no)} closed (${reason})`);
    }
    // Wechsel erst nach genug Tickets UND genug Lesezeit
    if (--callerLeft <= 0 && now >= callerUntil) nextCaller();
  };

  return {
    id: 'queue',
    label: 'Queue',
    icon: '>_',
    mount(c) {
      ctx = c;
      showCaller(caller);
      setText(btnSub, ticketId(CONFIG.ticketNumberOffset + ctx.state.clicks + 1));
      setText(last, 'Warteschlange: voll. Wie immer.');

      // pointerdown statt click: schneller und jeder Finger zählt
      button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = desk.getBoundingClientRect();
        close(e.clientX - r.left, e.clientY - r.top);
      });
      // Tastatur (Enter/Space) erzeugt click mit detail 0
      button.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        const r = button.getBoundingClientRect();
        const d = desk.getBoundingClientRect();
        close(r.left - d.left + r.width / 2, r.top - d.top + r.height / 2);
      });
      button.addEventListener('contextmenu', (e) => e.preventDefault());

      return h('div', { class: 'queue' }, [ctx.log.el, desk]);
    },
    render() {
      /* Zähler steht im Header; hier ist alles ereignisgetrieben */
    },
    onShow() {
      ctx.log.scrollToEnd();
    },
  };
}
