import { describe, expect, it } from 'vitest';
import { deserialize, exportSave, importSave, serialize } from '../../src/core/save';
import { createInitialState } from '../../src/core/state';

describe('Spielstand', () => {
  it('Roundtrip', () => {
    const s = createInitialState(123);
    s.tickets = 42.5;
    s.generators.cron.owned = 3;
    s.settings.buyAmount = 'max';
    s.upgrades = { coffee: true };
    expect(deserialize(serialize(s), 999)).toEqual(s);
  });

  it('alte/teilweise Saves bekommen Defaults für neue Felder', () => {
    const old = JSON.stringify({ version: 1, tickets: 10, generators: { intern: { owned: 4 } } });
    const s = deserialize(old, 5)!;
    expect(s.tickets).toBe(10);
    expect(s.generators.intern.owned).toBe(4);
    expect(s.generators.cron.owned).toBe(0);
    expect(s.settings.haptics).toBe(true);
    expect(s.prestige).toEqual({ experience: 0, jobs: 0 });
  });

  it('verwirft kaputte Werte', () => {
    const s = deserialize(
      JSON.stringify({ version: 1, tickets: 'viel', clicks: null, settings: { buyAmount: 7 } }),
      0,
    )!;
    expect(s.tickets).toBe(0);
    expect(s.clicks).toBe(0);
    expect(s.settings.buyAmount).toBe(1);
  });

  it('ungültiges JSON → null', () => {
    expect(deserialize('{nope', 0)).toBeNull();
    expect(deserialize('[]', 0)).toBeNull();
    expect(importSave('!!!kein base64', 0)).toBeNull();
  });

  it('Export/Import inkl. Umlaute', () => {
    const s = createInitialState(1);
    s.upgrades = { 'kaffeemaschine-ü': true };
    expect(importSave(exportSave(s), 2)).toEqual(s);
  });
});
