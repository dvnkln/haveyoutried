import { INCIDENT_IDS, INCIDENTS, type IncidentId } from '../config';
import { draw, fingerprint } from './deck';
import { bus } from './bus';
import { quirkMods, scaledDelay } from './quirks';
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

/** Gemeinsame Wertung der Minispiele: Fortschritt, abgezogen für Fehlgriffe (mit Untergrenze). */
export function progressScore(done: number, total: number, wrong: number): number {
  const { mistakePenalty, floor } = INCIDENTS.scoring;
  return total > 0 ? (done / total) * Math.max(floor, 1 - countedMistakes(wrong) * mistakePenalty) : 0;
}

/** Doku gefunden (Server unterm Tisch Stufe 3): so viele Fehlgriffe pro Incident werden verziehen */
let forgiven = 0;
export const setForgivenMistakes = (n: number) => (forgiven = Math.max(0, n));
export const countedMistakes = (wrong: number) => Math.max(0, wrong - forgiven);

/** Gilt dieser Score als gelöst? (eine Quelle für Karte, Log und Belohnung) */
export const isSolved = (score: number): boolean => score >= INCIDENTS.goodMin;

/** Nächsten Incident planen; Eigenheit der Firma: öfter, seltener oder nie */
export function scheduleNextIncident(state: GameState): void {
  state.incidents.nextAt = state.stats.playTimeMs + scaledDelay(INCIDENTS.minMs + Math.random() * (INCIDENTS.maxMs - INCIDENTS.minMs), quirkMods(state).incidents);
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
  startIncident(state, nextIncidentId(state));
}

/** Spiele, die sich zu ähnlich anfühlen (Kabel stecken): nie direkt nacheinander */
const ALIKE: readonly (readonly IncidentId[])[] = [['patch', 'untangle']];

/**
 * Reihum über den Kartenstapel (core/deck.ts): erst jedes Minispiel einmal, dann das nächste Mal.
 * (Eigener Stapel statt incidents.seen: alte Spielstände mit hohen Zählern würden sonst neue Spiele jedes zweite Mal bringen.)
 * Nie dasselbe oder ein sehr ähnliches direkt nacheinander, auch nicht an der Rundengrenze.
 */
export function nextIncidentId(state: GameState, rnd: () => number = Math.random): IncidentId {
  const last = state.incidents.lastId;
  const blocked = new Set<string>([last, ...(ALIKE.find((g) => g.includes(last as IncidentId)) ?? [])]);
  const allowed = INCIDENT_IDS.filter((id) => !blocked.has(id));
  const raw = state.decks.incidents;
  const used = Array.isArray(raw) ? raw : [];
  const open = INCIDENT_IDS.filter((id) => !used.includes(fingerprint(id)));
  // Runde fast durch, übrig ist nur ein gerade gesperrtes Spiel: Lückenfüller (am längsten nicht gespielt),
  // ohne neue Runde. Sonst holt das gesperrte nie auf.
  if (open.length > 0 && !open.some((id) => allowed.includes(id))) {
    const age = (id: IncidentId) => used.lastIndexOf(fingerprint(id));
    const filler = allowed.reduce((a, b) => (age(b) < age(a) ? b : a));
    state.decks.incidents = [...used.filter((p) => p !== fingerprint(filler)), fingerprint(filler)];
    return filler;
  }
  // Runde komplett: alle wieder offen, auch die gerade gesperrten (die sonst als „schon gespielt“ eine Runde aussetzen)
  if (open.length === 0) state.decks.incidents = [];
  return draw(state, 'incidents', allowed, { rnd });
}

/** Startet einen bestimmten Incident (auch für den Test-Parameter ?incident=…). */
export function startIncident(state: GameState, id: IncidentId): boolean {
  if (running) return false;
  running = id;
  // sofort festhalten und neu planen: Reload startet nicht direkt den nächsten
  state.incidents.active = id;
  state.incidents.lastId = id;
  scheduleNextIncident(state);
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
  comment?: string,
): EffectResult[] {
  const s = Math.max(0, Math.min(1, score));
  const results = rewardFor(s).effects.map((e) => applyEffect(state, e, rates));
  state.incidents.active = '';
  state.incidents.seen[id] = (state.incidents.seen[id] ?? 0) + 1;
  state.incidents.best[id] = Math.max(state.incidents.best[id] ?? 0, s);
  bus.emit('incidentResolved', { id, score: s, results, abandoned, comment });
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
  /** Kommentar der Ergebniskarte: landet so auch wörtlich im Ticketverlauf */
  comment?: string,
): EffectResult[] {
  return settle(state, id, score, rates, false, comment);
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
