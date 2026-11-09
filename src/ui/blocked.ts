import { incidentRunning } from '../core/incidents';

/**
 * Spiel gerade nicht ansprechbar: Dialog offen, App-Fenster offen, Incident läuft, Licht aus.
 * hidden = auch eine verdeckte Seite zählt (für Dinge, die man sehen soll).
 */
export function gameBlocked(opts: { hidden?: boolean } = {}): boolean {
  const app = document.getElementById('app');
  return (
    (!!opts.hidden && document.hidden) ||
    !!document.querySelector('dialog[open]') ||
    !!incidentRunning() ||
    !!app?.classList.contains('sheet-open') ||
    !!app?.classList.contains('afk')
  );
}
