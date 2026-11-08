import { CONFIG, SOLVE, type GeneratorId } from '../config';
import { bus } from './bus';
import { isUpgradeUnlocked, pressPpsFraction, priceFor, productionPerSec, tempo, ticketReward, upgradeDef } from './economy';
import type { BuyAmount, GameState } from './state';
import { addTickets } from './tick';

/** Ein Anschlag: bringt Arbeit am aktuellen Ticket, Tickets gibt es erst beim Lösen. */
export function pressKey(state: GameState): number {
  // höchstens so viel, dass ein Ticket die Mindest-Anschläge braucht (Rest zählt beim Lösen als Wert)
  const work = Math.min(tempo(state), SOLVE.work / SOLVE.minPresses);
  state.clicks += 1;
  bus.emit('click', { value: work, ticketNo: CONFIG.ticketNumberOffset + state.clicks });
  return work;
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
 * Ticket im Arbeitsfenster gelöst: Grundwert plus etwas Produktion, wächst mit der Serie;
 * an Meilensteinen gibt es extra. `presses` = Anschläge für dieses Ticket (Zweitmonitor & Co. zahlen pro Anschlag).
 * Merkt sich die längste Serie (Flag „bestStreak“, für Achievements).
 */
export function solveTicket(state: GameState, streak: number, presses = 0): { bonus: number; milestone: boolean } {
  const pps = productionPerSec(state);
  const reward = ticketReward(state) + pps * (SOLVE.ppsSec + pressPpsFraction(state) * presses);
  const mult = Math.min(SOLVE.maxStreakMult, 1 + SOLVE.perStreak * Math.max(0, streak - 1));
  const milestone = (STREAK_MILESTONES as readonly number[]).includes(streak);
  let bonus = reward * mult;
  if (milestone) bonus += Math.max(pps * SOLVE.milestoneSec, reward * SOLVE.milestoneTickets);
  addTickets(state, bonus);
  state.flags.solved = (state.flags.solved ?? 0) + 1;
  state.flags.bestStreak = Math.max(state.flags.bestStreak ?? 0, streak);
  return { bonus, milestone };
}
