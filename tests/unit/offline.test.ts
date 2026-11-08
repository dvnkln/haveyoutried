import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/config';
import { applyOfflineProgress } from '../../src/core/offline';
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

  it('deckelt auf 8 h', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    const r = applyOfflineProgress(s, 48 * HOUR);
    expect(r?.capped).toBe(true);
    expect(r?.creditedMs).toBe(CONFIG.offlineCapMs);
    expect(s.tickets).toBeCloseTo(8 * 3600 * prod('bash'));
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
