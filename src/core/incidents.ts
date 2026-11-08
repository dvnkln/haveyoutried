import { INCIDENT_IDS, INCIDENTS, type IncidentId } from '../config';
import { bus } from './bus';
import { applyEffect, type EffectResult } from './events';
import type { GameState } from './state';

/** Laufender Incident – nur zur Laufzeit, nicht im Spielstand (Reload = abgebrochen). */
let running: IncidentId | null = null;

export const incidentRunning = (): IncidentId | null => running;

export const isIncidentId = (id: string): id is IncidentId => (INCIDENT_IDS as readonly string[]).includes(id);

function scheduleNext(state: GameState): void {
  state.incidents.nextAt =
    state.stats.playTimeMs + INCIDENTS.minMs + Math.random() * (INCIDENTS.maxMs - INCIDENTS.minMs);
}

function pick(state: GameState): IncidentId {
  const pool = INCIDENT_IDS.filter((id) => id !== state.incidents.lastId);
  return pool[Math.floor(Math.random() * pool.length)] ?? INCIDENT_IDS[0];
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
  startIncident(pick(state));
}

/** Startet einen bestimmten Incident (auch für den Test-Parameter ?incident=…). */
export function startIncident(id: IncidentId): boolean {
  if (running) return false;
  running = id;
  bus.emit('incidentStart', { id });
  return true;
}

/** Score (0..1) → Effekte laut INCIDENTS.rewards */
export function rewardFor(score: number) {
  return INCIDENTS.rewards.find((r) => score >= r.min) ?? INCIDENTS.rewards[INCIDENTS.rewards.length - 1]!;
}

export function resolveIncident(
  state: GameState,
  id: IncidentId,
  score: number,
  rates: { pps: number; click: number },
): EffectResult[] {
  const s = Math.max(0, Math.min(1, score));
  const results = rewardFor(s).effects.map((e) => applyEffect(state, e, rates));
  running = null;
  state.incidents.lastId = id;
  state.incidents.seen[id] = (state.incidents.seen[id] ?? 0) + 1;
  state.incidents.best[id] = Math.max(state.incidents.best[id] ?? 0, s);
  scheduleNext(state);
  bus.emit('incidentResolved', { id, score: s, results });
  return results;
}

/** Nur für Tests: Laufzeitzustand zurücksetzen. */
export function _resetIncidentRuntime(): void {
  running = null;
}
