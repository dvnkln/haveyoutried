import { CONFIG } from '../config';
import { randInt } from '../util';
import { h } from './dom';

/** Wie viele Tickets der Verlauf behält (nur Anzeige, nicht im Spielstand) */
const MAX_ENTRIES = 60;

/** Ein erledigtes Ticket im klassischen Aufbau */
export interface TicketCard {
  /** z. B. „#INC-004777“ */
  id: string;
  subject: string;
  /** Melder:in */
  who: string;
  /** Kanal, z. B. „Mail“, „Fernwartung PC-LAGER-1“ */
  channel: string;
  prio: string;
  status: string;
  /** das Getippte: Antwort, Befehl, Suche … */
  reply?: string;
  /** Überschrift dazu, Standard „Antwort“ */
  replyLabel?: string;
  /** woran es lag */
  cause?: string;
  /** interne Notiz des Bearbeiters: hier steht, was wirklich passiert ist */
  note: string;
  /** Lösung / Abschluss mit Pointe */
  solution: string;
  /** VIP-Ticket (wichtige Mail vom Chef) */
  vip?: boolean;
}

export const ticketId = (no: number) => `#INC-${String(no).padStart(6, '0')}`;

let lastNo = 0;
/**
 * Nächste Ticketnummer für Fenster und VIP-Mails: wächst grob mit den Klicks
 * (die Warteschlange arbeitet ja mit), ist aber nie kleiner als die letzte, also eindeutig.
 */
export function nextTicketNo(clicks: number): number {
  lastNo = Math.max(lastNo + randInt(1, 3), CONFIG.ticketNumberOffset + clicks + randInt(3, 40));
  return lastNo;
}

let lastAlarm = randInt(100, 900);
/** Pager und Incidents sind keine Tickets aus der Warteschlange: eigene Nummernreihe */
export const nextAlarmId = () => `#ALARM-${String(++lastAlarm).padStart(4, '0')}`;

const clock = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const field = (label: string, value: string, cls = '') =>
  h('div', { class: `tk-field ${cls}`.trim() }, [h('span', { class: 'tk-label', text: label }), h('span', { class: 'tk-value', text: value })]);

/** App „Tickets“: jedes erledigte Ticket als Karte, neueste oben. */
export class TicketHistory {
  readonly el: HTMLElement;
  private list: HTMLElement;
  private empty: HTMLElement;

  constructor() {
    this.list = h('div', { class: 'hist-list' });
    this.empty = h('p', { class: 'hist-empty', text: 'Noch nichts erledigt. Die Warteschlange wartet. Geduldig. Noch.' });
    this.el = h('div', { class: 'history', role: 'log', 'aria-label': 'Ticketverlauf' }, [this.empty, this.list]);
  }

  add(t: TicketCard): void {
    const card = h('article', { class: `hist${t.vip ? ' hist-vip' : ''}` }, [
      h('div', { class: 'hist-head' }, [
        h('span', { class: 'hist-id', text: t.id }),
        ...(t.vip ? [h('span', { class: 'hist-badge vip', text: 'VIP' })] : []),
        h('span', { class: 'hist-badge', text: t.status }),
        h('span', { class: 'hist-time', text: clock() }),
      ]),
      h('div', { class: 'hist-subject', text: t.subject }),
      h('div', { class: 'hist-meta' }, [
        field('Von', t.who),
        field('Per', t.channel),
        field('Prio', t.prio),
        ...(t.cause ? [field('Ursache', t.cause, 'hist-cause')] : []),
      ]),
      ...(t.reply ? [h('div', { class: 'hist-block hist-reply' }, [h('span', { class: 'tk-label', text: t.replyLabel ?? 'Antwort' }), h('p', { text: t.reply })])] : []),
      h('div', { class: 'hist-block hist-note' }, [h('span', { class: 'tk-label', text: 'Interne Notiz' }), h('p', { text: t.note })]),
      h('div', { class: 'hist-block hist-solution' }, [h('span', { class: 'tk-label', text: 'Lösung' }), h('p', { text: t.solution })]),
    ]);
    this.empty.hidden = true;
    this.list.prepend(card);
    while (this.list.childElementCount > MAX_ENTRIES) this.list.lastElementChild?.remove();
  }
}
