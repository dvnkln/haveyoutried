import { describe, expect, it, vi } from 'vitest';
import { deserialize, EXP_REVALUED_FLAG, exportSave, importSave, serialize } from '../../src/core/save';
import { createInitialState } from '../../src/core/state';
import { prestigeGain } from '../../src/core/prestige';

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
    expect(s.prestige).toEqual({ experience: 0, jobs: 0, company: 'mueller' });
    expect(s.flags).toEqual({});
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

  it('alte Klang-IDs werden zu MX Blue, gültige Switches bleiben', () => {
    const load = (tapSound: string) => deserialize(JSON.stringify({ version: 1, settings: { tapSound } }), 0)!.settings.tapSound;
    expect(load('mx')).toBe('blue');
    expect(load('pop')).toBe('blue');
    expect(load('brown')).toBe('brown');
  });

  it('Spielstand v1: Berufserfahrung wird auf die neue Formel umgerechnet (keine Gratis-Punkte)', () => {
    // v1: 1 Punkt je 1 M Tickets (Wurzel) → 4 M Tickets = 2 Punkte; v2 (250 K) ergibt dafür 4
    const old = { version: 1, ticketsAllTime: 4_000_000, prestige: { experience: 2, jobs: 1, company: 'x' } };
    const s = deserialize(JSON.stringify(old), 0)!;
    expect(s.version).toBe(3);
    // v3 (Kubikwurzel ab 25 K): 4 M Tickets = ∛160 → 5
    expect(s.prestige.experience).toBe(5);
    expect(prestigeGain(s)).toBe(0);
  });

  it('Spielstand v2: Berufserfahrung auf die Kubikwurzel umgerechnet, ohne Gratis-Punkte', () => {
    const load = (experience: number, ticketsAllTime: number) =>
      deserialize(JSON.stringify({ version: 2, ticketsAllTime, prestige: { experience, jobs: 3, company: 'x' } }), 0)!;
    // 10 Punkte (25 M Tickets) bleiben 10
    expect(load(10, 25e6).prestige.experience).toBe(10);
    const big = load(100, 2.5e9); // alt 100, neu ∛100.000 = 46
    expect(big.prestige.experience).toBe(46);
    expect(prestigeGain(big)).toBe(0);
    expect(load(0, 0).prestige.experience).toBe(0);
    expect(load(-5, 0).prestige.experience).toBe(0); // negativ wird nicht zum Bonus
  });

  it('Spielstand v2: Verlust durch die Umrechnung wird für den Logeintrag gemerkt, Gewinn nicht', () => {
    const load = (experience: number) =>
      deserialize(JSON.stringify({ version: 2, flags: { solved: 7 }, prestige: { experience, jobs: 1, company: 'x' } }), 0)!;
    const lost = load(100);
    expect(lost.flags[EXP_REVALUED_FLAG]).toBe(100);
    expect(lost.flags.solved).toBe(7);
    expect(load(2).flags[EXP_REVALUED_FLAG]).toBeUndefined(); // 2 → 3
    expect(load(10).flags[EXP_REVALUED_FLAG]).toBeUndefined();
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

describe('Laden: Pager-Event und Lautstärke werden normalisiert', () => {
  const load = (extra: Record<string, unknown>) =>
    deserialize(JSON.stringify({ version: 1, stats: { playTimeMs: 100_000 }, ...extra }), 0)!;

  it('„Dialog offen“ aus dem Spielstand wird wieder ein normaler Pager mit Nachfrist', () => {
    const s = load({ events: { nextAt: 1, active: { id: 'dns', expiresAt: 90_000, opened: true } } });
    expect(s.events.active).toEqual({ id: 'dns', opened: false, expiresAt: 115_000 });
  });

  it('kaputtes Event bekommt einen gültigen Ablauf oder fliegt raus', () => {
    expect(load({ events: { active: { id: 'dns' } } }).events.active!.expiresAt).toBe(115_000);
    expect(load({ events: { active: { id: 'dns', expiresAt: 'bald', opened: 'ja' } } }).events.active!.opened).toBe(false);
    expect(load({ events: { active: { nope: 1 } } }).events.active).toBeNull();
    expect(load({ events: { active: 'dns' } }).events.active).toBeNull();
  });

  it('Lautstärke wird auf 0..1 begrenzt', () => {
    expect(load({ settings: { volume: 50 } }).settings.volume).toBe(1);
    expect(load({ settings: { volume: -3 } }).settings.volume).toBe(0);
    expect(load({ settings: { volume: 0.3 } }).settings.volume).toBe(0.3);
  });
});

describe('Saver', () => {
  const store = new Map<string, string>();
  let full = false;
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (full) throw new Error('QuotaExceededError');
      store.set(k, v);
    },
    removeItem: (k: string) => void store.delete(k),
  };

  it('fehlgeschlagener Import lässt das Autosave weiterlaufen', async () => {
    const { Saver } = await import('../../src/core/save');
    vi.stubGlobal('localStorage', mockStorage);
    const s = createInitialState(0);
    const saver = new Saver(() => s);
    full = true;
    expect(saver.replaceWith(createInitialState(1))).toBe(false);
    full = false;
    expect(saver.saveNow()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('dauerhafter Speicherfehler wird nur einmal gemeldet', async () => {
    const { Saver } = await import('../../src/core/save');
    vi.stubGlobal('localStorage', mockStorage);
    const errors: unknown[] = [];
    const saver = new Saver(() => createInitialState(0), (e) => errors.push(e));
    full = true;
    saver.saveNow();
    saver.saveNow();
    saver.saveNow();
    expect(errors).toHaveLength(1);
    full = false;
    saver.saveNow();
    full = true;
    saver.saveNow();
    expect(errors).toHaveLength(2); // nach Erholung wieder melden
    full = false;
    vi.unstubAllGlobals();
  });
});
