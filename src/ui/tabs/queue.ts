import { CONFIG } from '../../config';
import { CALLBACK_LINES, CALLERS, situationalCalls, type Call } from '../../content/callers';
import { CLOSE_REASONS } from '../../content/syslog';
import { clickTicket } from '../../core/actions';
import { pick, randInt } from '../../util';
import type { AppContext, Tab } from '../app';
import { h, juice, NUDGE, setText, SQUASH } from '../dom';
import { formatNumber } from '../format';

const MAX_FLOATERS = 24;

const ticketId = (no: number) => `#INC-${String(no).padStart(6, '0')}`;

/** Haupt-Tab: Syslog oben, Anrufer + großer Button in der Daumenzone. */
export function queueTab(): Tab {
  let ctx: AppContext;
  let call: Call | null = null;
  let callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
  let lastClickLog = 0;
  /** Frühester Zeitpunkt für den nächsten Anrufer (Lesezeit) */
  let callerUntil = 0;
  /** Zuletzt gezeigte Zeilen, damit sich nichts zu schnell wiederholt */
  const recent: string[] = [];

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

  const fresh = (lines: string[]) => {
    const unused = lines.filter((l) => !recent.includes(l));
    return pick(unused.length > 0 ? unused : lines);
  };

  const chooseCall = (): Call => {
    // Rückruf: gleiche Person, neues Leid
    if (call && Math.random() < CONFIG.callerCallbackChance) {
      return { face: call.face, who: `${call.who.replace(/ \(Rückruf\)$/, '')} (Rückruf)`, line: pick(CALLBACK_LINES) };
    }
    const situational = situationalCalls(ctx.state, new Date()).filter((c) => !recent.includes(c.line));
    if (situational.length > 0 && Math.random() < CONFIG.callerSituationalChance) return pick(situational);

    let caller = pick(CALLERS);
    while (CALLERS.length > 1 && caller.who === call?.who) caller = pick(CALLERS);
    return { face: caller.face, who: caller.who, line: fresh(caller.lines) };
  };

  const showCall = (c: Call, sound = true) => {
    call = c;
    recent.push(c.line);
    if (recent.length > 30) recent.shift();
    setText(face, c.face);
    setText(who, c.who);
    setText(says, c.line);
    callerUntil = performance.now() + CONFIG.callerMinShowMs + c.line.length * CONFIG.callerShowMsPerChar;
    callerLeft = randInt(CONFIG.callerTicketsMin, CONFIG.callerTicketsMax);
    if (c.reply) ctx.log.template(c.reply);
    juice(bubble, NUDGE, 260);
    if (sound) ctx.sfx.ring();
  };

  const spawnFloater = (x: number, y: number, value: number) => {
    if (floaters.childElementCount >= MAX_FLOATERS) floaters.firstElementChild?.remove();
    const f = h('span', { class: 'floater', text: `+${formatNumber(value, value < 10 && value % 1 !== 0 ? 1 : 0)}` });
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.setProperty('--drift', `${randInt(-24, 24)}px`);
    f.addEventListener('animationend', () => f.remove());
    floaters.append(f);
  };

  const close = (x: number, y: number) => {
    ctx.sfx.unlock();
    const value = clickTicket(ctx.state);
    const no = CONFIG.ticketNumberOffset + ctx.state.clicks;
    const reason = pick(CLOSE_REASONS);
    setText(last, `${ticketId(no)} → ${reason}`);
    setText(btnSub, ticketId(no + 1));
    juice(button, SQUASH, 160);
    spawnFloater(x, y, value);
    ctx.sfx.tap();
    ctx.haptic('tap');

    const now = performance.now();
    if (now - lastClickLog > CONFIG.clickLogMinMs) {
      lastClickLog = now;
      ctx.log.write('info', `helpdesk[1337]: ${ticketId(no)} closed (${reason})`);
    }
    // Wechsel erst nach genug Tickets UND genug Lesezeit
    if (--callerLeft <= 0 && now >= callerUntil) showCall(chooseCall());
  };

  return {
    id: 'queue',
    label: 'Queue',
    icon: '>_',
    mount(c) {
      ctx = c;
      showCall(chooseCall(), false);
      setText(btnSub, ticketId(CONFIG.ticketNumberOffset + ctx.state.clicks + 1));
      setText(last, 'Warteschlange: voll. Wie immer.');

      // pointerdown statt click: schneller und jeder Finger zählt
      button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const r = desk.getBoundingClientRect();
        close(e.clientX - r.left, e.clientY - r.top);
      });
      // Loslassen: zweiter Teil des Tastenklicks
      button.addEventListener('pointerup', () => ctx.sfx.release());
      // Tastatur (Enter/Space) erzeugt click mit detail 0
      button.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        const r = button.getBoundingClientRect();
        const d = desk.getBoundingClientRect();
        close(r.left - d.left + r.width / 2, r.top - d.top + r.height / 2);
        setTimeout(() => ctx.sfx.release(), 80);
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
