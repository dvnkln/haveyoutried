import type { GameState } from './state';

/** Anmeldung am Rechner: beim ersten Start und nach jedem Jobwechsel (neue Firma, neuer Account) */
const LOGIN_FLAG = 'login';

/** Flag = für wie viele Jobs schon angemeldet (Job 1 = vor der ersten Kündigung) */
export const needsLogin = (s: GameState) => (s.flags[LOGIN_FLAG] ?? 0) < s.prestige.jobs + 1;

export function markLoggedIn(s: GameState): void {
  s.flags[LOGIN_FLAG] = s.prestige.jobs + 1;
}

/** Spielstände von vor dem Anmeldebildschirm: wer schon gespielt hat, gilt im aktuellen Job als angemeldet */
export function migrateLogin(s: GameState): void {
  if (s.flags[LOGIN_FLAG] === undefined && s.clicks > 0) markLoggedIn(s);
}
