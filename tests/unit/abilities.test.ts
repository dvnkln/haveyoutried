import { afterEach, describe, expect, it } from 'vitest';
import { ABILITIES } from '../../src/content/upgrades';
import { UPGRADES } from '../../src/config';
import { applyEffect } from '../../src/core/events';
import { progressScore, setForgivenMistakes } from '../../src/core/incidents';
import { applyOfflineProgress } from '../../src/core/offline';
import { createInitialState } from '../../src/core/state';

const HOUR = 3_600_000;

describe('Stufe-3-Fähigkeiten', () => {
  afterEach(() => setForgivenMistakes(0));

  it('jede Fähigkeit gehört zu einem Upgrade', () => {
    for (const id of Object.keys(ABILITIES)) expect(UPGRADES.some((u) => u.id === id), id).toBe(true);
  });

  it('systemd-Timer: Abwesenheit nach der ersten Stunde 40 % statt 20 %', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 1;
    s.upgrades['cron-3'] = true;
    const r = applyOfflineProgress(s, 3 * HOUR);
    expect(r?.creditedMs).toBeCloseTo(HOUR + 0.4 * 2 * HOUR);
  });

  it('Echte Idempotenz: Verluste und Bremsen halb so schlimm', () => {
    const a = createInitialState(0);
    a.tickets = 1e9;
    const b = structuredClone(a);
    b.upgrades['ansible-3'] = true;
    const rates = { pps: 100, click: 10 };
    const lossA = -applyEffect(a, 'loss', rates).tickets;
    const lossB = -applyEffect(b, 'loss', rates).tickets;
    expect(lossB).toBeCloseTo(lossA / 2);
    applyEffect(a, 'fire', rates);
    applyEffect(b, 'fire', rates);
    expect(b.buffs[0]!.remainingMs).toBeCloseTo(a.buffs[0]!.remainingMs / 2);
  });

  it('Doku gefunden: ein Fehlgriff wird verziehen', () => {
    const withMistake = progressScore(5, 5, 1);
    setForgivenMistakes(1);
    expect(progressScore(5, 5, 1)).toBe(1);
    expect(progressScore(5, 5, 1)).toBeGreaterThan(withMistake);
    expect(progressScore(5, 5, 2)).toBeCloseTo(withMistake);
  });
});
