import { CONFIG, type GeneratorId } from '../config';
import { bus } from './bus';
import { clickValue, priceFor } from './economy';
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
