import { productionPerSec } from './economy';
import type { GameState } from './state';

export function addTickets(state: GameState, amount: number): void {
  state.tickets += amount;
  state.ticketsTotal += amount;
  state.ticketsAllTime += amount;
}

/**
 * Ein Logik-Schritt. `dtSec` darf beliebig groß sein (Offline-Progress),
 * solange die Produktion innerhalb des Schritts konstant ist.
 * Phase 2: Event-Scheduler und Achievement-Checks kommen hier dazu.
 */
export function tick(state: GameState, dtSec: number, now: number, online = true): number {
  const gained = productionPerSec(state) * dtSec;
  if (gained > 0) addTickets(state, gained);
  if (online) state.stats.playTimeMs += dtSec * 1_000;
  state.lastTick = now;
  return gained;
}
