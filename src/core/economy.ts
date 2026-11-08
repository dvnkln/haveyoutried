import { CONFIG, GENERATORS, type GeneratorDef, type GeneratorId } from '../config';
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

// --- Modifier-Pipeline. Phase 2: Upgrades und Berufserfahrung hängen sich hier ein. ---

export function generatorMultiplier(_state: GameState, _id: GeneratorId): number {
  return 1;
}

export function globalMultiplier(_state: GameState): number {
  return 1;
}

export function clickValue(state: GameState): number {
  return CONFIG.clickValue * globalMultiplier(state);
}

export function generatorProduction(state: GameState, id: GeneratorId): number {
  const def = generatorDef(id);
  return state.generators[id].owned * def.baseProd * generatorMultiplier(state, id);
}

export function productionPerSec(state: GameState): number {
  let sum = 0;
  for (const def of GENERATORS) sum += generatorProduction(state, def.id);
  return sum * globalMultiplier(state);
}

export function isUnlocked(state: GameState, id: GeneratorId): boolean {
  return (
    state.generators[id].owned > 0 ||
    state.ticketsTotal >= generatorDef(id).baseCost * CONFIG.unlockAtFraction
  );
}
