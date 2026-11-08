import { describe, expect, it } from 'vitest';
import { SOLVE } from '../../src/config';
import { solveTicket } from '../../src/core/actions';
import { rates } from '../../src/core/economy';
import { createInitialState } from '../../src/core/state';

describe('Gelöste Tickets', () => {
  it('Bonus wächst mit der Serie, gedeckelt', () => {
    const s = createInitialState(0);
    const base = Math.max(rates(s).pps * SOLVE.bonusSec, rates(s).click * SOLVE.bonusClicks);
    expect(solveTicket(s, 1).bonus).toBeCloseTo(base);
    expect(solveTicket(s, 3).bonus).toBeCloseTo(base * 1.2);
    expect(solveTicket(s, 99).bonus).toBeCloseTo(base * SOLVE.maxStreakMult);
  });

  it('Meilenstein gibt extra und merkt sich die beste Serie', () => {
    const s = createInitialState(0);
    const plain = solveTicket(s, 4);
    const ms = solveTicket(s, 5);
    expect(plain.milestone).toBe(false);
    expect(ms.milestone).toBe(true);
    expect(ms.bonus).toBeGreaterThan(plain.bonus * 2);
    solveTicket(s, 2);
    expect(s.flags.bestStreak).toBe(5);
    expect(s.flags.solved).toBe(3);
  });

  it('Bonus landet auf dem Konto', () => {
    const s = createInitialState(0);
    const before = s.tickets;
    const { bonus } = solveTicket(s, 1);
    expect(s.tickets).toBeCloseTo(before + bonus);
  });
});
