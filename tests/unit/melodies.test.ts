import { describe, expect, it } from 'vitest';
import { MELODIES, noteFreq } from '../../src/content/melodies';

describe('Espresso-Melodien', () => {
  it('jede Note gültig, Längen positiv, Bass gültig', () => {
    for (const m of MELODIES) {
      expect(m.notes.length, m.id).toBeGreaterThan(8);
      for (const [n, l] of m.notes) {
        expect(l, m.id).toBeGreaterThan(0);
        if (n) expect(noteFreq(n), `${m.id} ${n}`).toBeGreaterThan(20);
      }
      for (const b of m.bass ?? []) expect(noteFreq(b), `${m.id} Bass ${b}`).toBeGreaterThan(20);
    }
    expect(new Set(MELODIES.map((m) => m.id)).size).toBe(MELODIES.length);
  });

  it('A4 = 440 Hz', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('A5')).toBeCloseTo(880);
    expect(noteFreq('X9')).toBeNaN();
  });
});
