import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG, EVENT_EFFECTS } from '../../src/config';
import { EVENTS } from '../../src/content/events';
import { clickValue, productionPerSec, rates } from '../../src/core/economy';
import { applyEffect, claimUrgent, resolveEvent, updateEvents } from '../../src/core/events';
import { applyOfflineProgress } from '../../src/core/offline';
import { createInitialState, type GameState } from '../../src/core/state';
import { tick } from '../../src/core/tick';

/** Spielzeit vorspulen (online) */
function play(s: GameState, ms: number, step = 1_000) {
  for (let t = 0; t < ms; t += step) tick(s, step / 1_000, s.lastTick + step);
}

afterEach(() => vi.restoreAllMocks());

describe('Event-Planung', () => {
  it('erstes Event nach eventFirstMs Spielzeit, Pager läuft nach eventExpireMs ab', () => {
    const s = createInitialState(0);
    play(s, CONFIG.eventFirstMs - 2_000);
    expect(s.events.active).toBeNull();
    play(s, 3_000);
    expect(s.events.active).not.toBeNull();
    const id = s.events.active!.id;
    play(s, CONFIG.eventExpireMs + 1_000);
    expect(s.events.active).toBeNull();
    expect(s.events.seen[id]).toBe(1);
    expect(s.events.lastId).toBe(id);
    expect(s.events.nextAt).toBeGreaterThan(s.stats.playTimeMs + CONFIG.eventMinMs - 2_000);
  });

  it('geöffneter Dialog läuft nicht ab', () => {
    const s = createInitialState(0);
    play(s, CONFIG.eventFirstMs + 1_000);
    s.events.active!.opened = true;
    play(s, CONFIG.eventExpireMs * 3);
    expect(s.events.active).not.toBeNull();
  });

  it('offline läuft weder Event-Uhr noch Pager-Countdown', () => {
    const s = createInitialState(0);
    applyOfflineProgress(s, 8 * 3600_000);
    expect(s.stats.playTimeMs).toBe(0);
    expect(s.events.active).toBeNull();
  });

  it('gleiches Event nicht zweimal hintereinander', () => {
    const s = createInitialState(0);
    s.generators.intern.owned = 1;
    s.stats.playTimeMs = 10;
    for (let i = 0; i < 30; i++) {
      s.events.nextAt = 1;
      updateEvents(s, 0, () => rates(s));
      const id = s.events.active!.id;
      resolveEvent(s, 0, rates(s));
      expect(s.events.lastId).toBe(id);
      s.events.nextAt = 1;
      updateEvents(s, 0, () => rates(s));
      expect(s.events.active!.id).not.toBe(id);
      resolveEvent(s, 0, rates(s));
    }
  });
});

describe('Effekte', () => {
  it('tickets: mindestens Klickwert × clicks', () => {
    const s = createInitialState(0);
    const r = applyEffect(s, 'win', rates(s));
    expect(r.tickets).toBe(40);
    expect(s.tickets).toBe(40);
  });

  it('tickets: sonst Produktion × sec', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 10; // 10/s
    applyEffect(s, 'tip', rates(s));
    expect(s.tickets).toBeCloseTo(600);
  });

  it('lose: Anteil vom Konto, gedeckelt, nie negativ', () => {
    const s = createInitialState(0);
    s.tickets = 1e9;
    s.generators.bash.owned = 1;
    const r = applyEffect(s, 'loss', rates(s));
    expect(r.tickets).toBeCloseTo(-300); // Deckel: 1/s × 300 s
    const poor = createInitialState(0);
    poor.tickets = 5;
    applyEffect(poor, 'loss', rates(poor));
    expect(poor.tickets).toBeGreaterThanOrEqual(0);
  });

  it('buff wirkt auf Produktion bzw. Klicks und läuft ab', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 10;
    applyEffect(s, 'flow', rates(s));
    expect(productionPerSec(s)).toBeCloseTo(30);
    applyEffect(s, 'overtime', rates(s));
    expect(clickValue(s)).toBeCloseTo(7);
    play(s, 46_000);
    expect(productionPerSec(s)).toBeCloseTo(10);
    expect(s.buffs).toEqual([]);
  });

  it('gleicher Buff stapelt nicht, frischt nur auf', () => {
    const s = createInitialState(0);
    applyEffect(s, 'rush', rates(s));
    applyEffect(s, 'rush', rates(s));
    expect(s.buffs).toHaveLength(1);
  });

  it('Boosts pausieren offline', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    applyEffect(s, 'flow', rates(s));
    applyOfflineProgress(s, 3600_000);
    expect(s.tickets).toBeCloseTo(3600); // ohne ×3
    expect(s.buffs[0]!.remainingMs).toBe(45_000);
  });

  it('Dringend-Ticket gibt immer etwas Gutes', () => {
    for (let i = 0; i < 50; i++) {
      const s = createInitialState(0);
      expect(claimUrgent(s, rates(s)).mood).toBe('good');
    }
  });

  it('Entscheidung wendet den Ausgang an (Zufall fixiert)', () => {
    const s = createInitialState(0);
    s.events.active = { id: 'friday', expiresAt: 1e9, opened: true };
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.4 → Jackpot
    const res = resolveEvent(s, 0, rates(s))!;
    expect(res.effect).toBe('jackpot');
    expect(s.tickets).toBe(100);
  });
});

describe('Event-Inhalte', () => {
  it.each(EVENTS.map((e) => [e.id, e] as const))('%s: gültige Effekte, Chancen = 100 %%', (_id, e) => {
    expect(e.options.length).toBeGreaterThanOrEqual(2);
    for (const opt of e.options) {
      const sum = opt.outcomes.reduce((a, o) => a + (o.chance ?? 1), 0);
      expect(sum).toBeCloseTo(1);
      for (const o of opt.outcomes) expect(EVENT_EFFECTS[o.effect]).toBeDefined();
    }
    expect(EVENT_EFFECTS[e.ignore.effect]).toBeDefined();
  });
  it('IDs eindeutig', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });
});
