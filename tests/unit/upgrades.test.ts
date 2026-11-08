import { describe, expect, it } from 'vitest';
import { GENERATORS, UPGRADES } from '../../src/config';
import { CALLERS, situationalCalls } from '../../src/content/callers';
import { GENERATOR_TEXT } from '../../src/content/generators';
import { UPGRADE_TEXT } from '../../src/content/upgrades';
import { buyUpgrade, clickTicket } from '../../src/core/actions';
import { availableUpgrades, clickValue, productionPerSec } from '../../src/core/economy';
import { createInitialState } from '../../src/core/state';

describe('Upgrades', () => {
  it('Kaffeemaschine: erst nach 25 Klicks, dann Klick ×2', () => {
    const s = createInitialState(0);
    s.tickets = 1000;
    expect(buyUpgrade(s, 'coffee')).toBe(false);
    for (let i = 0; i < 25; i++) clickTicket(s);
    expect(availableUpgrades(s).map((u) => u.id)).toContain('coffee');
    expect(buyUpgrade(s, 'coffee')).toBe(true);
    expect(clickValue(s)).toBe(2);
    expect(buyUpgrade(s, 'coffee')).toBe(false); // nur einmal
  });

  it('Generator-Upgrade verdoppelt nur diesen Generator', () => {
    const s = createInitialState(0);
    s.generators.intern.owned = 10;
    s.generators.bash.owned = 1;
    s.tickets = 1e6;
    expect(productionPerSec(s)).toBeCloseTo(2);
    expect(buyUpgrade(s, 'intern-1')).toBe(true);
    expect(productionPerSec(s)).toBeCloseTo(3);
  });

  it('Global-Upgrade wirkt auf Produktion und Klick', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 10;
    s.ticketsTotal = 25_000;
    s.tickets = 1e6;
    expect(buyUpgrade(s, 'rtfm')).toBe(true);
    expect(productionPerSec(s)).toBeCloseTo(11);
    expect(clickValue(s)).toBeCloseTo(1.1);
  });

  it('Zweiter Monitor: Klick bringt 1 % der Produktion', () => {
    const s = createInitialState(0);
    s.generators.cron.owned = 100; // 800/s
    s.ticketsTotal = 5_000;
    s.tickets = 1e6;
    buyUpgrade(s, 'monitor2');
    expect(clickValue(s)).toBeCloseTo(1 + 8);
  });

  it('kosten nur bei genug Tickets', () => {
    const s = createInitialState(0);
    s.clicks = 25;
    s.tickets = 99;
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
