import { CONFIG } from '../config';
import type { GameState } from './state';
import { tick } from './tick';

export interface OfflineReport {
  elapsedMs: number;
  creditedMs: number;
  gained: number;
  capped: boolean;
}

/**
 * Schreibt die Zeit seit `lastTick` gut (gedeckelt). Wird beim Start und
 * beim Zurückkehren in den Tab aufgerufen. Gibt einen Bericht zurück,
 * wenn die Abwesenheit lang genug für eine Meldung war.
 */
export function applyOfflineProgress(state: GameState, now: number): OfflineReport | null {
  const elapsedMs = now - state.lastTick;
  if (!(elapsedMs > 0)) {
    // Uhr zurückgestellt oder kaputter Wert: einfach neu ansetzen.
    state.lastTick = now;
    return null;
  }
  const creditedMs = Math.min(elapsedMs, CONFIG.offlineCapMs);
  // Boosts pausieren offline (sonst wäre ein ×3 über 8 h ein Exploit)
  const buffs = state.buffs;
  state.buffs = [];
  const gained = tick(state, creditedMs / 1_000, now, false);
  state.buffs = buffs;
  state.stats.offlineTickets += gained;

  if (elapsedMs < CONFIG.offlineReportMinMs) return null;
  return { elapsedMs, creditedMs, gained, capped: elapsedMs > CONFIG.offlineCapMs };
}
