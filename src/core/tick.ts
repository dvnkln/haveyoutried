import { productionPerSec, rates } from './economy';
import { updateEvents } from './events';
import { addTickets, type GameState } from './state';

export { addTickets };

/**
 * Ein Logik-Schritt. `dtSec` darf beliebig groß sein (Offline-Progress),
 * solange die Produktion innerhalb des Schritts konstant ist.
 * Events und Boosts laufen nur online (Spielzeit).
 */
export function tick(state: GameState, dtSec: number, now: number, online = true): number {
  const gained = productionPerSec(state) * dtSec;
  if (gained > 0) addTickets(state, gained);
  if (online) {
    state.stats.playTimeMs += dtSec * 1_000;
    updateEvents(state, dtSec * 1_000, () => rates(state));
  }
  state.lastTick = now;
  return gained;
}
