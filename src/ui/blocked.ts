import { incidentRunning } from '../core/incidents';

/** Anmeldebildschirm steht (erster Start, nach einem Jobwechsel); wie hintShowing über das DOM */
export const LOGIN_SELECTOR = '.login:not([hidden])';
export const loginShowing = () => !!document.querySelector(LOGIN_SELECTOR);

/**
 * Spiel gerade nicht ansprechbar: Dialog offen, App-Fenster offen, Incident läuft, Anmeldung, Licht oder Monitor aus.
 * hidden = auch eine verdeckte Seite zählt (für Dinge, die man sehen soll).
 * ignoreLogin = die Anmeldung zählt nicht (die Tastatur tippt dort ja das Kennwort).
 */
export function gameBlocked(opts: { hidden?: boolean; ignoreLogin?: boolean } = {}): boolean {
  const app = document.getElementById('app');
  return (
    (!!opts.hidden && document.hidden) ||
    (!opts.ignoreLogin && loginShowing()) ||
    !!document.querySelector('dialog[open]') ||
    !!incidentRunning() ||
    !!app?.classList.contains('sheet-open') ||
    !!app?.classList.contains('afk') ||
    !!app?.classList.contains('screen-off')
  );
}

/** Ein Hinweis vom Vorgänger hängt gerade */
export const HINT_SELECTOR = '.tut-note:not([hidden])';
export function hintShowing(): HTMLElement | null {
  return document.querySelector<HTMLElement>(HINT_SELECTOR);
}

/**
 * Spiel pausiert: ein Hinweis vom Vorgänger hängt, ein Dialog ist offen oder der Monitor ist aus.
 * Dann stehen Countdowns wie VIP-Mail und Kaffeetasse; bei Hinweis oder Dialog auch die Spielzeit
 * (Chef-Aufgabe, Boosts, Ereignisse), damit man in Ruhe liest.
 */
export function gamePaused(): boolean {
  return (
    !!hintShowing() || !!document.querySelector('dialog[open]') || loginShowing() || !!document.getElementById('app')?.classList.contains('screen-off')
  );
}
