import { describe, expect, it } from 'vitest';
import { GENERATORS, SOLVE, UPGRADES } from '../../src/config';
import { CALLERS, situationalCalls } from '../../src/content/callers';
import { GENERATOR_TEXT } from '../../src/content/generators';
import { UPGRADE_TEXT } from '../../src/content/upgrades';
import { buyUpgrade, pressKey, solveTicket } from '../../src/core/actions';
import { pressPpsFraction, solvePpsSec, tempo, ticketReward } from '../../src/core/economy';
import { prod } from './helpers';
import { availableUpgrades, productionPerSec } from '../../src/core/economy';
import { createInitialState } from '../../src/core/state';

describe('Upgrades', () => {
  it('Kaffeemaschine: erst nach 25 Anschlägen, dann doppeltes Tipptempo', () => {
    const s = createInitialState(0);
    s.tickets = 1000;
    expect(buyUpgrade(s, 'coffee')).toBe(false);
    for (let i = 0; i < 25; i++) pressKey(s);
    expect(availableUpgrades(s).map((u) => u.id)).toContain('coffee');
    expect(buyUpgrade(s, 'coffee')).toBe(true);
    expect(tempo(s)).toBe(2);
    expect(buyUpgrade(s, 'coffee')).toBe(false); // nur einmal
  });

  it('Generator-Upgrade verdoppelt nur diesen Generator', () => {
    const s = createInitialState(0);
    s.generators.intern.owned = 10;
    s.generators.bash.owned = 1;
    s.tickets = 1e6;
    expect(productionPerSec(s)).toBeCloseTo(10 * prod('intern') + prod('bash'));
    expect(buyUpgrade(s, 'intern-1')).toBe(true);
    expect(productionPerSec(s)).toBeCloseTo(20 * prod('intern') + prod('bash'));
  });

  it('Global-Upgrade wirkt auf Produktion und Klick', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 10;
    s.ticketsTotal = 25_000;
    s.tickets = 1e6;
    expect(buyUpgrade(s, 'rtfm')).toBe(true);
    expect(productionPerSec(s)).toBeCloseTo(11 * prod('bash'));
    expect(ticketReward(s)).toBeCloseTo(1.1);
  });

  it('Zweiter Monitor: jeder Anschlag bringt beim Lösen 1 % der Produktion', () => {
    const s = createInitialState(0);
    s.generators.cron.owned = 100;
    s.ticketsTotal = 5_000;
    s.tickets = 1e6;
    buyUpgrade(s, 'monitor2');
    expect(pressPpsFraction(s)).toBeCloseTo(0.01);
    const before = s.tickets;
    const pps = productionPerSec(s);
    solveTicket(s, 1, 25);
    expect(s.tickets - before).toBeGreaterThan(pps * 0.01 * 25);
  });

  it('Maus, Headset, Textbaustein: jedes gelöste Ticket bringt mehr Sekunden Produktion', () => {
    const s = createInitialState(0);
    s.generators.cron.owned = 100;
    const pps = productionPerSec(s);
    const payout = () => {
      const c = structuredClone(s);
      c.tickets = 0;
      solveTicket(c, 1, 3);
      return c.tickets;
    };
    const before = payout();
    expect(solvePpsSec(s)).toBeCloseTo(SOLVE.ppsSec);
    for (const id of ['mouse', 'headset', 'macro']) s.upgrades[id] = true;
    expect(solvePpsSec(s)).toBeCloseTo(SOLVE.ppsSec + 0.4);
    expect(payout() - before).toBeCloseTo(pps * 0.4);
    expect(tempo(s)).toBe(1); // kein Tempo-Effekt mehr
  });

  it('kosten nur bei genug Tickets', () => {
    const s = createInitialState(0);
    s.clicks = 25;
    s.tickets = UPGRADES.find((u) => u.id === 'coffee')!.cost - 1;
    expect(buyUpgrade(s, 'coffee')).toBe(false);
    expect(s.upgrades).toEqual({});
  });
});

describe('Inhalte vollständig', () => {
  it('jedes Upgrade hat Name und Beschreibung, IDs eindeutig', () => {
    for (const u of UPGRADES) {
      expect(UPGRADE_TEXT[u.id]?.name, u.id).toBeTruthy();
      expect(UPGRADE_TEXT[u.id]?.desc, u.id).toBeTruthy();
    }
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
  });

  it('jeder Generator hat Texte für alle Listen', () => {
    for (const g of GENERATORS) {
      const t = GENERATOR_TEXT[g.id];
      expect(t.buyLog.length && t.ambient.length && t.desc).toBeTruthy();
    }
  });

  it('Anrufer: genug Auswahl, situative Anrufe hängen an Zustand und Uhrzeit', () => {
    expect(CALLERS.flatMap((c) => c.lines).length).toBeGreaterThan(50);
    const s = createInitialState(0);
    const tuesdayNoonish = new Date(2026, 10, 10, 10, 0);
    expect(situationalCalls(s, tuesdayNoonish)).toEqual([]);
    s.generators.undertable.owned = 1;
    expect(situationalCalls(s, tuesdayNoonish).some((c) => c.reply?.text === 'admin[1]: NEIN.')).toBe(true);
    const friday = new Date(2026, 10, 13, 16, 55);
    expect(situationalCalls(createInitialState(0), friday).length).toBeGreaterThan(0);
  });
});

describe('weightedPick', () => {
  it('respektiert Gewichte und ignoriert Gewicht 0', async () => {
    const { weightedPick } = await import('../../src/util');
    const items = ['a', 'b', 'c'];
    const w = (x: string) => (x === 'a' ? 3 : x === 'b' ? 1 : 0);
    expect(weightedPick(items, w, () => 0)).toBe('a');
    expect(weightedPick(items, w, () => 0.74)).toBe('a');
    expect(weightedPick(items, w, () => 0.76)).toBe('b');
    expect(weightedPick(items, w, () => 0.9999)).toBe('b');
    expect(() => weightedPick([], w)).toThrow();
  });
});
