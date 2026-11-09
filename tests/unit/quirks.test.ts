import { describe, expect, it } from 'vitest';
import { COMPANIES } from '../../src/content/companies';
import { pressesPerTicket, productionPerSec, priceFor, ticketWork } from '../../src/core/economy';
import { describeQuirk, NEVER, quirkMods } from '../../src/core/quirks';
import { createInitialState } from '../../src/core/state';
import { scheduleNext } from '../../src/core/events';

describe('Firmen-Eigenheiten', () => {
  it('erste Firma ohne Eigenheit, alle anderen mit Titel, Spruch und Wirkung', () => {
    expect(COMPANIES[0]!.quirk).toBeUndefined();
    for (const c of COMPANIES.slice(1)) {
      expect(c.quirk?.title, c.id).toBeTruthy();
      expect(c.quirk?.flavor.length, c.id).toBeGreaterThan(10);
      expect(describeQuirk(c.quirk!.mods).length, c.id).toBeGreaterThan(3);
    }
  });

  it('wirkt auf Produktion, Tempo, Preise und Pager', () => {
    const base = createInitialState(0);
    base.generators.bash.owned = 2;
    const s = structuredClone(base);
    s.prestige.company = 'stadtwerke'; // Infrastruktur +30 %, Preise +30 %
    expect(productionPerSec(s)).toBeCloseTo(productionPerSec(base) * 1.3);
    // Preise werden gerundet: auf 1 % genau
    expect(priceFor(s, 'bash', 1).cost / priceFor(base, 'bash', 1).cost).toBeCloseTo(1.3, 1);
    s.prestige.company = 'amt'; // Tippen −50 %: doppelt so viele Anschläge je Ticket, auch im späten Spiel
    expect(ticketWork(s)).toBeCloseTo(ticketWork(base) * 2);
    const late = structuredClone(s);
    late.upgrades = { coffee: true, keyboard: true, macro: true };
    late.prestige.experience = 500;
    const lateBase = structuredClone(late);
    lateBase.prestige.company = 'mueller';
    expect(pressesPerTicket(late)).toBe(pressesPerTicket(lateBase) * 2);
    s.prestige.company = 'kirche'; // kein Pager
    expect(quirkMods(s).events).toBe(0);
    scheduleNext(s);
    expect(s.events.nextAt).toBeGreaterThanOrEqual(NEVER);
  });

  it('Wirkung in Worten', () => {
    expect(describeQuirk({ prod: 1.3, costs: 1.3 })).toBe('Infrastruktur +30 % · Preise +30 %');
    expect(describeQuirk({ events: 0, reward: 1.1 })).toBe('kein Pager · Wert je Ticket +10 %');
    expect(describeQuirk({ urgent: 2 })).toBe('VIP-Zettel ×2');
  });
});
