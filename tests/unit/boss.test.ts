import { afterEach, describe, expect, it } from 'vitest';
import { BOSS, bossProgress, updateBoss } from '../../src/core/boss';
import { bus } from '../../src/core/bus';
import { createInitialState } from '../../src/core/state';

const rates = () => ({ pps: 10, click: 2 });

describe('Aufgaben vom Chef', () => {
  const off: (() => void)[] = [];
  afterEach(() => off.splice(0).forEach((f) => f()));

  it('erste Aufgabe nach der Einarbeitung, Erfolg gibt Tickets und eine Pause', () => {
    const s = createInitialState(0);
    updateBoss(s, rates, () => 0); // plant die erste
    expect(s.boss.kind).toBe('');
    s.stats.playTimeMs = BOSS.firstMs;
    updateBoss(s, rates, () => 0); // rnd 0 → erste Art: Tickets schließen
    expect(s.boss.kind).toBe('solve');
    expect(s.boss.text).toContain(String(s.boss.target));
    let reward = 0;
    off.push(bus.on('bossDone', (e) => (reward = e.reward)));
    s.flags.solved = s.boss.target;
    expect(bossProgress(s)).toBe(s.boss.target);
    updateBoss(s, rates, () => 0);
    expect(reward).toBeGreaterThan(0);
    expect(s.tickets).toBeCloseTo(reward);
    expect(s.boss.kind).toBe('');
    expect(s.boss.done).toBe(1);
    expect(s.boss.nextAt).toBeGreaterThan(s.stats.playTimeMs);
  });

  it('Frist verpasst: keine Belohnung, nächste kommt später; nicht zweimal dieselbe Art', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 1;
    s.boss.nextAt = 1;
    updateBoss(s, rates, () => 0);
    const first = s.boss.kind;
    let failed = false;
    off.push(bus.on('bossFailed', () => (failed = true)));
    s.stats.playTimeMs = s.boss.until;
    updateBoss(s, rates, () => 0);
    expect(failed).toBe(true);
    expect(s.tickets).toBe(0);
    s.stats.playTimeMs = s.boss.nextAt;
    updateBoss(s, rates, () => 0);
    expect(s.boss.kind).not.toBe(first);
  });
});
