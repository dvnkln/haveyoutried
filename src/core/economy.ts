import { CONFIG, GENERATORS, SOLVE, UPGRADES, type GeneratorDef, type GeneratorId, type UpgradeDef } from '../config';
import { achievementMultiplier } from './achievements';
import { buffMultiplier } from './events';
import { prestigeMultiplier } from './prestige';
import type { BuyAmount, GameState } from './state';

const g = CONFIG.costGrowth;

export function generatorDef(id: GeneratorId): GeneratorDef {
  const def = GENERATORS.find((d) => d.id === id);
  if (!def) throw new Error(`unknown generator: ${id}`);
  return def;
}

/** Kosten des nächsten Exemplars bei `owned` vorhandenen. Ganzzahlig, damit Anzeige und Kaufbarkeit übereinstimmen. */
export function unitCost(baseCost: number, owned: number): number {
  return Math.ceil(baseCost * g ** owned);
}

/** Summe der Kosten für `n` weitere Exemplare. */
export function bulkCost(baseCost: number, owned: number, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += unitCost(baseCost, owned + i);
  return sum;
}

/** Wie viele Exemplare man sich mit `money` leisten kann. */
export function maxAffordable(baseCost: number, owned: number, money: number): number {
  if (money < unitCost(baseCost, owned)) return 0;
  // Geschlossene Formel (ohne Aufrunden) als Obergrenze, dann exakt korrigieren.
  const first = baseCost * g ** owned;
  let n = Math.floor(Math.log((money * (g - 1)) / first + 1) / Math.log(g));
  while (n > 0 && bulkCost(baseCost, owned, n) > money) n--;
  // Rundung kann die Formel knapp unter die echte Grenze drücken
  while (bulkCost(baseCost, owned, n + 1) <= money) n++;
  return n;
}

/** Konkrete Kaufmenge für die gewählte Einstellung (bei 'max' mindestens 1, damit Kosten angezeigt werden können). */
export function resolveAmount(state: GameState, id: GeneratorId, amount: BuyAmount): number {
  if (amount !== 'max') return amount;
  const def = generatorDef(id);
  return Math.max(1, maxAffordable(def.baseCost, state.generators[id].owned, state.tickets));
}

export function priceFor(state: GameState, id: GeneratorId, amount: BuyAmount): { n: number; cost: number } {
  const n = resolveAmount(state, id, amount);
  const def = generatorDef(id);
  return { n, cost: bulkCost(def.baseCost, state.generators[id].owned, n) };
}

// --- Upgrades ---

export function upgradeDef(id: string): UpgradeDef {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) throw new Error(`unknown upgrade: ${id}`);
  return def;
}

// Gekaufte Upgrades zwischenspeichern: die Multiplikatoren werden pro Frame oft abgefragt.
// Upgrades kommen nur hinzu, darum reicht als Schlüssel Objekt + Anzahl.
let ownsCache: { ref: Record<string, true>; count: number; list: UpgradeDef[] } | null = null;
function owns(state: GameState): UpgradeDef[] {
  const count = Object.keys(state.upgrades).length;
  if (!ownsCache || ownsCache.ref !== state.upgrades || ownsCache.count !== count) {
    ownsCache = { ref: state.upgrades, count, list: UPGRADES.filter((u) => state.upgrades[u.id]) };
  }
  return ownsCache.list;
}

export function isUpgradeUnlocked(state: GameState, def: UpgradeDef): boolean {
  const u = def.unlock;
  switch (u.kind) {
    case 'owned':
      return state.generators[u.gen].owned >= u.n;
    case 'clicks':
      return state.clicks >= u.n;
    case 'total':
      return state.ticketsTotal >= u.n;
  }
}

/** Freigeschaltet und noch nicht gekauft, nach Preis sortiert. */
export function availableUpgrades(state: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => !state.upgrades[u.id] && isUpgradeUnlocked(state, u)).sort(
    (a, b) => a.cost - b.cost,
  );
}

// --- Modifier-Pipeline ---

export function generatorMultiplier(state: GameState, id: GeneratorId): number {
  let m = 1;
  for (const u of owns(state)) if (u.effect.kind === 'gen' && u.effect.gen === id) m *= u.effect.mult;
  return m;
}

export function globalMultiplier(state: GameState): number {
  let m = 1;
  for (const u of owns(state)) if (u.effect.kind === 'global') m *= u.effect.mult;
  // Berufserfahrung (Prestige) und Achievements
  return m * prestigeMultiplier(state) * achievementMultiplier(state);
}

// --- Tickets von Hand ---

/** Tempo beim Tippen: Klick-Upgrades × Berufserfahrung (Routine) × Überstunden & Co. */
export function tempo(state: GameState): number {
  let mult = 1;
  for (const u of owns(state)) if (u.effect.kind === 'click') mult *= u.effect.mult;
  return mult * prestigeMultiplier(state) * buffMultiplier(state, 'click');
}

/** Arbeit für das nächste Ticket (in Anschlägen bei Tempo 1) */
export function ticketWork(state: GameState): number {
  void state;
  return SOLVE.work;
}

/** So viele Anschläge braucht ein Ticket gerade (mindestens SOLVE.minPresses) */
export function pressesPerTicket(state: GameState): number {
  return Math.max(SOLVE.minPresses, Math.ceil(ticketWork(state) / tempo(state) - 1e-9));
}

/** Anteil der Produktion, den jeder Anschlag zusätzlich bringt (Zweitmonitor, Gummiente) */
export function pressPpsFraction(state: GameState): number {
  let f = 0;
  for (const u of owns(state)) if (u.effect.kind === 'clickPps') f += u.effect.fraction;
  return f;
}

/** Tickets für eine Lösung ohne Serie: Grundwert, Tempo-Überschuss zählt als Wert. Berufserfahrung steckt im Tempo. */
export function ticketReward(state: GameState): number {
  const surplus = Math.max(1, (tempo(state) * SOLVE.minPresses) / ticketWork(state));
  return SOLVE.reward * surplus * (globalMultiplier(state) / prestigeMultiplier(state));
}

/** Wert eines Anschlags im Schnitt (für Ereignisse, die in „Klicks“ rechnen) */
export function clickValue(state: GameState): number {
  const pps = productionPerSec(state);
  return ticketReward(state) / pressesPerTicket(state) + pps * (pressPpsFraction(state) + SOLVE.ppsSec / pressesPerTicket(state));
}

export function generatorProduction(state: GameState, id: GeneratorId): number {
  const def = generatorDef(id);
  return state.generators[id].owned * def.baseProd * generatorMultiplier(state, id);
}

export function productionPerSec(state: GameState): number {
  let sum = 0;
  for (const def of GENERATORS) sum += generatorProduction(state, def.id);
  return sum * globalMultiplier(state) * buffMultiplier(state, 'prod');
}

export function isUnlocked(state: GameState, id: GeneratorId): boolean {
  return (
    state.generators[id].owned > 0 ||
    state.ticketsTotal >= generatorDef(id).baseCost * CONFIG.unlockAtFraction
  );
}

/** Aktuelle Produktion und Klickwert, z. B. für Event-Effekte. */
export function rates(state: GameState): { pps: number; click: number } {
  return { pps: productionPerSec(state), click: clickValue(state) };
}
