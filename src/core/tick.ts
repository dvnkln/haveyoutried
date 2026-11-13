import { productionPerSec, rates } from './economy';
import { updateEvents } from './events';
import { incidentRunning, updateIncidents } from './incidents';
import { addTickets, type GameState } from './state';
import { updateBoss } from './boss';

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
    const inIncident = incidentRunning() !== null;
    updateEvents(state, dtSec * 1_000, () => rates(state), new Date(), inIncident);
    updateIncidents(state);
    updateBoss(state, () => rates(state), Math.random, inIncident ? dtSec * 1_000 : 0);
  }
  state.lastTick = now;
  return gained;
}
