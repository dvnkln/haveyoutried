import { CONFIG, INCIDENTS } from '../config';
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
  advanceTimers(state, creditedMs);

  if (elapsedMs < CONFIG.offlineReportMinMs) return null;
  return { elapsedMs, creditedMs, gained, capped: elapsedMs > CONFIG.offlineCapMs };
}

/**
 * Abwesenheit zählt für die Event- und Incident-Uhren mit: Wer zurückkommt,
 * findet bald etwas vor. Es stapelt sich aber nichts, höchstens je eins wartet.
 */
function advanceTimers(state: GameState, ms: number): void {
  const t = state.stats.playTimeMs;
  const ev = state.events;
  if (ev.nextAt && !ev.active) ev.nextAt = Math.min(ev.nextAt, Math.max(t + CONFIG.eventReturnDelayMs, ev.nextAt - ms));
  const inc = state.incidents;
  if (inc.nextAt) inc.nextAt = Math.min(inc.nextAt, Math.max(t + INCIDENTS.returnDelayMs, inc.nextAt - ms));
}
