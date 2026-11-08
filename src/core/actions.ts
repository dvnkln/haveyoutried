import { CONFIG, SOLVE, type GeneratorId } from '../config';
import { bus } from './bus';
import { clickValue, isUpgradeUnlocked, priceFor, rates, upgradeDef } from './economy';
import type { BuyAmount, GameState } from './state';
import { addTickets } from './tick';

export function clickTicket(state: GameState): number {
  const value = clickValue(state);
  addTickets(state, value);
  state.clicks += 1;
  bus.emit('click', { value, ticketNo: CONFIG.ticketNumberOffset + state.clicks });
  return value;
}

export function buyGenerator(state: GameState, id: GeneratorId, amount: BuyAmount): boolean {
  const { n, cost } = priceFor(state, id, amount);
  if (n <= 0 || cost > state.tickets) return false;

  const before = state.generators[id].owned;
  state.tickets -= cost;
  state.generators[id].owned = before + n;
  const owned = before + n;
  bus.emit('buy', { id, amount: n, owned });

  for (const m of CONFIG.milestones) {
    if (before < m && owned >= m) bus.emit('milestone', { id, owned: m });
  }
  return true;
}

export function buyUpgrade(state: GameState, id: string): boolean {
  const def = upgradeDef(id);
  if (state.upgrades[id] || !isUpgradeUnlocked(state, def) || def.cost > state.tickets) return false;
  state.tickets -= def.cost;
  state.upgrades[id] = true;
  bus.emit('upgrade', { id });
  return true;
}

/** Meilensteine einer Serie gelöster Tickets */
export const STREAK_MILESTONES = [5, 10, 20, 42, 100] as const;

/**
 * Ticket im Arbeitsfenster gelöst: Bonus wächst mit der Serie, an Meilensteinen gibt es extra.
 * Merkt sich die längste Serie (Flag „bestStreak“, für Achievements).
 */
export function solveTicket(state: GameState, streak: number): { bonus: number; milestone: boolean } {
  const r = rates(state);
  const mult = Math.min(SOLVE.maxStreakMult, 1 + SOLVE.perStreak * Math.max(0, streak - 1));
  const milestone = (STREAK_MILESTONES as readonly number[]).includes(streak);
  let bonus = Math.max(r.pps * SOLVE.bonusSec, r.click * SOLVE.bonusClicks) * mult;
  if (milestone) bonus += Math.max(r.pps * SOLVE.milestoneSec, r.click * SOLVE.milestoneClicks);
  addTickets(state, bonus);
  state.flags.solved = (state.flags.solved ?? 0) + 1;
  state.flags.bestStreak = Math.max(state.flags.bestStreak ?? 0, streak);
  return { bonus, milestone };
}
