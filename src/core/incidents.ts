import { INCIDENT_IDS, INCIDENTS, type IncidentId } from '../config';
import { pick } from '../util';
import { bus } from './bus';
import { applyEffect, type EffectResult } from './events';
import type { GameState } from './state';

/**
 * Laufzeit-Flag: Overlay ist offen (Alarm, Spiel oder Ergebniskarte).
 * Solange es gesetzt ist, pausieren Pager-Events. Im Spielstand steht
 * zusätzlich `incidents.active`, damit ein Reload nicht als Ausweg taugt.
 */
let running: IncidentId | null = null;

export const incidentRunning = (): IncidentId | null => running;

export const isIncidentId = (id: string): id is IncidentId => (INCIDENT_IDS as readonly string[]).includes(id);

/** Gilt dieser Score als gelöst? (eine Quelle für Karte, Log und Belohnung) */
export const isSolved = (score: number): boolean => score >= INCIDENTS.goodMin;

function scheduleNext(state: GameState): void {
  state.incidents.nextAt =
    state.stats.playTimeMs + INCIDENTS.minMs + Math.random() * (INCIDENTS.maxMs - INCIDENTS.minMs);
}

/** Pro Online-Tick: Incident planen und auslösen. */
export function updateIncidents(state: GameState): void {
  if (running) return;
  const inc = state.incidents;
  const t = state.stats.playTimeMs;
  if (!inc.nextAt) inc.nextAt = t + INCIDENTS.firstMs;
  if (t < inc.nextAt) return;
  // nicht parallel zu einem laufenden Pager-Event
  if (state.events.active) {
    inc.nextAt = t + INCIDENTS.retryMs;
    return;
  }
  const pool = INCIDENT_IDS.filter((id) => id !== inc.lastId);
  startIncident(state, pick(pool.length > 0 ? pool : INCIDENT_IDS));
}

/** Startet einen bestimmten Incident (auch für den Test-Parameter ?incident=…). */
export function startIncident(state: GameState, id: IncidentId): boolean {
  if (running) return false;
  running = id;
  // sofort festhalten und neu planen: Reload startet nicht direkt den nächsten
  state.incidents.active = id;
  state.incidents.lastId = id;
  scheduleNext(state);
  bus.emit('incidentStart', { id });
  return true;
}

/** Score (0..1) → Effekte laut INCIDENTS.rewards */
export function rewardFor(score: number) {
  return INCIDENTS.rewards.find((r) => score >= r.min) ?? INCIDENTS.rewards[INCIDENTS.rewards.length - 1]!;
}

function settle(
  state: GameState,
  id: IncidentId,
  score: number,
  rates: { pps: number; click: number },
  abandoned: boolean,
): EffectResult[] {
  const s = Math.max(0, Math.min(1, score));
  const results = rewardFor(s).effects.map((e) => applyEffect(state, e, rates));
  state.incidents.active = '';
  state.incidents.seen[id] = (state.incidents.seen[id] ?? 0) + 1;
  state.incidents.best[id] = Math.max(state.incidents.best[id] ?? 0, s);
  bus.emit('incidentResolved', { id, score: s, results, abandoned });
  return results;
}

/**
 * Spiel gewertet. Das Overlay bleibt offen (Ergebniskarte), darum bleibt
 * `running` gesetzt, bis endIncident() aufgerufen wird.
 */
export function resolveIncident(
  state: GameState,
  id: IncidentId,
  score: number,
  rates: { pps: number; click: number },
): EffectResult[] {
  return settle(state, id, score, rates, false);
}

/** Ergebniskarte geschlossen: Pager-Events dürfen wieder. */
export function endIncident(): void {
  running = null;
}

/**
 * Beim Laden: Wurde die Seite während eines Incidents geschlossen, gilt er
 * als eskaliert (Score 0). Kein Ausweg per Reload, aber auch keine Extra-Strafe.
 */
export function settleAbandoned(state: GameState, rates: { pps: number; click: number }): EffectResult[] | null {
  const id = state.incidents.active;
  if (!id) return null;
  if (!isIncidentId(id)) {
    state.incidents.active = '';
    return null;
  }
  return settle(state, id, 0, rates, true);
}

/** Nur für Tests: Laufzeitzustand zurücksetzen. */
export function _resetIncidentRuntime(): void {
  running = null;
}
