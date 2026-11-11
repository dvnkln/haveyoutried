import { incidentRunning } from '../core/incidents';
import { hintShowing } from './blocked';
import { h } from './dom';

const VISIBLE_MS = 3_200;
/** mehr warten nicht: der Rest wäre ohnehin veraltet */
const MAX_QUEUED = 4;

/**
 * Art der Meldung, bestimmt Farbe und Zeichen vor dem Titel:
 * Achievement (★, Glanz), Chef (gelber Zettel: neue Aufgabe ☑︎, erledigt ✔︎, verpasst ✗), Fehler (⚠).
 */
export type ToastKind = 'achievement' | 'boss' | 'boss-done' | 'boss-failed' | 'error' | 'os';

/**
 * Kurze Meldungen unten im Inhaltsbereich (z. B. Achievements), blockieren nichts.
 * Immer nur eine zur Zeit; weitere stellen sich hinten an, statt sich zu stapeln.
 */
export function createToaster(): { el: HTMLElement; show(title: string, text: string, kind?: ToastKind, onShow?: () => void): void } {
  const el = h('div', { class: 'toasts', 'aria-live': 'polite' });
  /** onShow: läuft erst, wenn die Meldung wirklich erscheint (volle Schlange wirft alte raus) */
  const queue: { title: string; text: string; kind: ToastKind; onShow?: () => void }[] = [];
  let showing = false;

  const next = () => {
    // ein Hinweis vom Vorgänger hängt oder ein Incident läuft (blendet die Meldungen aus): warten
    if (queue.length && (hintShowing() || incidentRunning())) {
      showing = true;
      setTimeout(next, 300);
      return;
    }
    const item = queue.shift();
    if (!item) {
      showing = false;
      return;
    }
    showing = true;
    // Chef-Varianten teilen sich die Grundklasse toast-boss; Fehler werden sofort vorgelesen
    const cls = item.kind.startsWith('boss-') ? `toast toast-boss toast-${item.kind}` : `toast toast-${item.kind}`;
    const t = h('div', { class: cls, ...(item.kind === 'error' ? { role: 'alert' } : {}) }, [h('div', { class: 'toast-title', text: item.title }), h('div', { class: 'toast-text', text: item.text })]);
    el.append(t);
    item.onShow?.();
    setTimeout(() => t.classList.add('out'), VISIBLE_MS - 400);
    setTimeout(() => {
      t.remove();
      next();
    }, VISIBLE_MS);
  };

  return {
    el,
    show(title, text, kind = 'achievement', onShow) {
      // volle Schlange: älteste Meldung fällt weg, Fehler aber nie (kommen nur einmal)
      if (queue.length >= MAX_QUEUED) {
        const i = queue.findIndex((q) => q.kind !== 'error');
        if (i >= 0) queue.splice(i, 1);
      }
      queue.push({ title, text, kind, onShow });
      if (!showing) next();
    },
  };
}

/** Gerade läuft etwas, das Aufmerksamkeit will (Meldung, VIP-Mails, Kaffeetasse, Hinweis vom Vorgänger)? */
export function attentionBusy(ignore: string[] = []): boolean {
  const sel = ['.toast', '.urgent-note', '.espresso-cup', '.tut-note:not([hidden])'].filter((x) => !ignore.includes(x));
  return sel.some((x) => document.querySelector(x));
}
