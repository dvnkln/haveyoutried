import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config';
import { afkTick, applyOfflineProgress, awayRate, creditedAwayMs } from '../../src/core/offline';
import { createInitialState } from '../../src/core/state';
import { prod } from './helpers';

const HOUR = 3600_000;

describe('Offline-Progress', () => {
  it('schreibt Abwesenheit gut', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 2;
    const r = applyOfflineProgress(s, HOUR);
    expect(s.tickets).toBeCloseTo(7200 * prod('bash'));
    expect(r?.capped).toBe(false);
    expect(s.stats.offlineTickets).toBeCloseTo(7200 * prod('bash'));
    expect(s.stats.playTimeMs).toBe(0);
    expect(s.lastTick).toBe(HOUR);
  });

  it('erste Stunde voll, danach ein Fünftel, nach 8 h nichts mehr', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    const r = applyOfflineProgress(s, 48 * HOUR);
    expect(r?.capped).toBe(true);
    expect(r?.reduced).toBe(true);
    // 1 h + 7 h × 0,2 = 2,4 h
    expect(r?.creditedMs).toBeCloseTo(2.4 * HOUR);
    expect(s.tickets).toBeCloseTo(2.4 * 3600 * prod('bash'));
    expect(creditedAwayMs(30 * 60_000)).toBe(30 * 60_000);
    expect(creditedAwayMs(3 * HOUR)).toBeCloseTo(1.4 * HOUR);
  });

  it('war vorher schon niemand da, geht die Abwesenheit nahtlos weiter (keine neue volle Stunde)', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    // 3 h Licht aus, dann 1 h Display aus: die Stunde zählt nur noch ein Fünftel
    const r = applyOfflineProgress(s, HOUR, 3 * HOUR);
    expect(r?.creditedMs).toBeCloseTo(0.2 * HOUR);
    expect(s.tickets).toBeCloseTo(0.2 * 3600 * prod('bash'));
  });

  it('Seite offen, niemand da: gekürzte Produktion, Boosts zählen nicht', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    s.buffs = [{ id: 'flow', target: 'prod', mult: 3, remainingMs: 45_000 }] as typeof s.buffs;
    afkTick(s, 10, 1_000, 20 * 60_000);
    expect(s.tickets).toBeCloseTo(10 * prod('bash'));
    afkTick(s, 10, 2_000, 2 * HOUR);
    expect(s.tickets).toBeCloseTo(12 * prod('bash'));
    afkTick(s, 10, 3_000, 9 * HOUR);
    expect(s.tickets).toBeCloseTo(12 * prod('bash'));
    expect(s.buffs).toHaveLength(1);
    expect(s.stats.playTimeMs).toBe(0);
    expect(awayRate(0)).toBe(1);
    expect(CONFIG.offlineRestShare).toBe(0.2);
  });

  it('kurze Pausen: gutschreiben, aber kein Bericht', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    expect(applyOfflineProgress(s, 5_000)).toBeNull();
    expect(s.tickets).toBeCloseTo(5 * prod('bash'));
  });

  it('Uhr zurückgestellt: nichts passiert', () => {
    const s = createInitialState(10_000);
    s.generators.bash.owned = 1;
    expect(applyOfflineProgress(s, 0)).toBeNull();
    expect(s.tickets).toBe(0);
    expect(s.lastTick).toBe(0);
  });
});
