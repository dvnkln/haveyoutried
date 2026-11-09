import { CONFIG, INCIDENTS } from '../config';
import { bumpFlag, type GameState } from './state';
import { tick } from './tick';

export interface OfflineReport {
  elapsedMs: number;
  /** angerechnete Zeit (erste Stunde voll, danach ein Fünftel, höchstens 8 h Abwesenheit) */
  creditedMs: number;
  gained: number;
  capped: boolean;
  /** länger als die volle Stunde weg: es wurde gekürzt */
  reduced: boolean;
}

/** Wie viel Abwesenheit zählt: erste Stunde voll, danach ein Fünftel, nach 8 h nichts mehr */
export function creditedAwayMs(elapsedMs: number): number {
  const e = Math.min(Math.max(0, elapsedMs), CONFIG.offlineCapMs);
  return Math.min(e, CONFIG.offlineFullMs) + CONFIG.offlineRestShare * Math.max(0, e - CONFIG.offlineFullMs);
}

/** Produktionsfaktor nach so langer Zeit ohne Spieler (für die offene, aber verlassene Seite) */
export function awayRate(idleMs: number): number {
  if (idleMs < CONFIG.offlineFullMs) return 1;
  return idleMs < CONFIG.offlineCapMs ? CONFIG.offlineRestShare : 0;
}

/** Bericht für eine Abwesenheit, die schon gutgeschrieben ist (z. B. Seite offen, Licht aus) */
export function awayReport(elapsedMs: number, gained: number): OfflineReport {
  return {
    elapsedMs,
    creditedMs: creditedAwayMs(elapsedMs),
    gained,
    capped: elapsedMs > CONFIG.offlineCapMs,
    reduced: elapsedMs > CONFIG.offlineFullMs,
  };
}

/**
 * Schreibt die Zeit seit `lastTick` gut (gedeckelt). Wird beim Start und
 * beim Zurückkehren in den Tab aufgerufen. Gibt einen Bericht zurück,
 * wenn die Abwesenheit lang genug für eine Meldung war.
 */
export function applyOfflineProgress(state: GameState, now: number, priorAwayMs = 0): OfflineReport | null {
  const elapsedMs = now - state.lastTick;
  if (!(elapsedMs > 0)) {
    // Uhr zurückgestellt oder kaputter Wert: einfach neu ansetzen.
    state.lastTick = now;
    return null;
  }
  // war schon vorher niemand da (Seite offen, Licht aus): die Abwesenheit geht dort weiter, wo sie war
  const prior = Math.max(0, priorAwayMs);
  const creditedMs = creditedAwayMs(prior + elapsedMs) - creditedAwayMs(prior);
  const gained = tickAway(state, creditedMs / 1_000, now);
  advanceTimers(state, Math.min(elapsedMs, CONFIG.offlineCapMs));

  if (prior + elapsedMs > CONFIG.offlineCapMs) bumpFlag(state, 'offline:capped');
  if (elapsedMs < CONFIG.offlineReportMinMs) return null;
  return { ...awayReport(elapsedMs, gained), creditedMs, capped: prior + elapsedMs > CONFIG.offlineCapMs, reduced: prior + elapsedMs > CONFIG.offlineFullMs };
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

/**
 * Seite offen, aber niemand da: nur Produktion (gekürzt wie bei Abwesenheit), keine Boosts,
 * keine Spielzeit, keine Events. Gibt die gutgeschriebenen Tickets zurück.
 */
export function afkTick(state: GameState, dtSec: number, now: number, idleMs: number): number {
  return tickAway(state, dtSec * awayRate(idleMs), now);
}

/** Produktion ohne Spieler: Boosts pausieren (sonst wäre ein ×3 über Stunden ein Exploit), keine Spielzeit, zählt als „nachts erledigt“ */
function tickAway(state: GameState, creditedSec: number, now: number): number {
  const buffs = state.buffs;
  state.buffs = [];
  const gained = tick(state, creditedSec, now, false);
  state.buffs = buffs;
  state.stats.offlineTickets += gained;
  return gained;
}
