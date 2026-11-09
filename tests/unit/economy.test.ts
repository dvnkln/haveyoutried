import { describe, expect, it } from 'vitest';
import { CONFIG, SOLVE } from '../../src/config';
import { buyGenerator, pressKey } from '../../src/core/actions';
import { prod } from './helpers';
import { bus } from '../../src/core/bus';
import { bulkCost, isUnlocked, maxAffordable, priceFor, productionPerSec, unitCost } from '../../src/core/economy';
import { createInitialState } from '../../src/core/state';
import { tick } from '../../src/core/tick';

describe('Kosten', () => {
  it('wächst mit 1.15 und ist ganzzahlig', () => {
    expect(unitCost(15, 0)).toBe(15);
    expect(unitCost(15, 1)).toBe(Math.ceil(15 * 1.15));
    expect(unitCost(15, 10)).toBe(Math.ceil(15 * CONFIG.costGrowth ** 10));
  });

  it('bulkCost = Summe der Einzelkosten', () => {
    let sum = 0;
    for (let i = 5; i < 15; i++) sum += unitCost(100, 5 + (i - 5));
    expect(bulkCost(100, 5, 10)).toBe(sum);
  });

  it('maxAffordable: exakt passender Betrag kauft genau so viele', () => {
    for (const base of [15, 100, 1_100, 12_000, 130_000, 1_400_000, 20_000_000]) {
      for (const owned of [0, 7, 33, 120]) {
        for (const n of [1, 2, 10, 37, 100]) {
          expect(maxAffordable(base, owned, bulkCost(base, owned, n))).toBe(n);
        }
      }
    }
  });

    it('maxAffordable ist exakt (n leistbar, n+1 nicht)', () => {
    for (const money of [0, 14, 15, 16, 100, 1234, 1e6, 1e12, 1e30]) {
      for (const owned of [0, 3, 50]) {
        const n = maxAffordable(15, owned, money);
        expect(bulkCost(15, owned, n)).toBeLessThanOrEqual(money);
        expect(bulkCost(15, owned, n + 1)).toBeGreaterThan(money);
      }
    }
  });
});

describe('Aktionen', () => {
  it('Anschlag bringt Arbeit, aber noch keine Tickets, und meldet Ticketnummer', () => {
    const s = createInitialState(0);
    const seen: number[] = [];
    const off = bus.on('click', (e) => seen.push(e.ticketNo));
    expect(pressKey(s)).toBe(1);
    pressKey(s);
    off();
    expect(s.tickets).toBe(0);
    expect(s.clicks).toBe(2);
    expect(seen).toEqual([CONFIG.ticketNumberOffset + 1, CONFIG.ticketNumberOffset + 2]);
  });

  it('Kauf zieht Kosten ab, scheitert ohne Geld', () => {
    const s = createInitialState(0);
    expect(buyGenerator(s, 'intern', 1)).toBe(false);
    s.tickets = 100;
    expect(buyGenerator(s, 'intern', 1)).toBe(true);
    expect(s.tickets).toBe(85);
    expect(s.generators.intern.owned).toBe(1);
  });

  it('x10 nur wenn alle 10 bezahlbar', () => {
    const s = createInitialState(0);
    s.tickets = bulkCost(15, 0, 10) - 1;
    expect(buyGenerator(s, 'intern', 10)).toBe(false);
    s.tickets += 1;
    expect(buyGenerator(s, 'intern', 10)).toBe(true);
    expect(s.tickets).toBe(0);
  });

  it('max kauft so viele wie möglich und zeigt sonst Preis für 1', () => {
    const s = createInitialState(0);
    expect(priceFor(s, 'intern', 'max')).toEqual({ n: 1, cost: 15 });
    s.tickets = 1000;
    const n = maxAffordable(15, 0, 1000);
    expect(buyGenerator(s, 'intern', 'max')).toBe(true);
    expect(s.generators.intern.owned).toBe(n);
  });

  it('Meilensteine feuern beim Überschreiten, auch im Bulk', () => {
    const s = createInitialState(0);
    s.tickets = 1e9;
    const hits: number[] = [];
    const off = bus.on('milestone', (e) => hits.push(e.owned));
    buyGenerator(s, 'intern', 1);
    buyGenerator(s, 'intern', 100);
    off();
    expect(hits).toEqual([1, 10, 25, 50, 100]);
  });
});

describe('Produktion & Tick', () => {
  it('summiert Generatoren', () => {
    const s = createInitialState(0);
    s.generators.intern.owned = 10;
    s.generators.bash.owned = 2;
    s.generators.cron.owned = 1;
    expect(productionPerSec(s)).toBeCloseTo(10 * prod('intern') + 2 * prod('bash') + prod('cron'));
  });

  it('tick schreibt dt * Produktion gut', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 3;
    tick(s, 0.1, 100);
    expect(s.tickets).toBeCloseTo(0.3 * prod('bash'));
    expect(s.ticketsTotal).toBeCloseTo(0.3 * prod('bash'));
    expect(s.lastTick).toBe(100);
  });

  it('Freischaltung ab 50 % der Basiskosten', () => {
    const s = createInitialState(0);
    expect(isUnlocked(s, 'bash')).toBe(false);
    s.ticketsTotal = 50;
    expect(isUnlocked(s, 'bash')).toBe(true);
  });
});

describe('Tickets von Hand', () => {
  it('ein Ticket braucht SOLVE.work Anschläge, Tempo-Upgrades senken das, aber nie unter das Minimum', async () => {
    const { pressesPerTicket, ticketReward } = await import('../../src/core/economy');
    const s = createInitialState(0);
    expect(pressesPerTicket(s)).toBe(SOLVE.work);
    s.upgrades.coffee = true;
    expect(pressesPerTicket(s)).toBe(Math.ceil(SOLVE.work / 2));
    for (const id of ['mousepad', 'keyboard', 'answering']) s.upgrades[id] = true;
    expect(pressesPerTicket(s)).toBe(SOLVE.minPresses);
    // Tempo über das Minimum hinaus zählt als Wert (Tempo 12 → 12 × 3 / 25)
    expect(ticketReward(s)).toBeCloseTo((SOLVE.reward * 12 * SOLVE.minPresses) / SOLVE.work);
  });

  it('Berufserfahrung macht schneller', async () => {
    const { pressesPerTicket } = await import('../../src/core/economy');
    const s = createInitialState(0);
    s.prestige.experience = 20; // +100 % bei 5 % je Punkt
    expect(pressesPerTicket(s)).toBeLessThan(SOLVE.work);
  });
});
