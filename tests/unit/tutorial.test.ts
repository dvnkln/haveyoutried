import { describe, expect, it } from 'vitest';
import { HINTS } from '../../src/content/tutorial';
import { createInitialState } from '../../src/core/state';

const hint = (id: string) => HINTS.find((x) => x.id === id)!;

describe('Übergabe vom Vorgänger', () => {
  it('Hinweise nur, solange die Sache neu ist', () => {
    const s = createInitialState(0);
    // Praktikant: erst, wenn man ihn bezahlen kann, und nur, solange noch keine Infrastruktur da ist
    expect(hint('infra').when(s)).toBe(false);
    s.tickets = 1e6;
    expect(hint('infra').when(s)).toBe(true);
    s.generators.intern.owned = 1;
    expect(hint('infra').when(s)).toBe(false);
    // VIP-Mail: wer schon einen erwischt hat, braucht keinen Hinweis
    expect(hint('urgent').when(s)).toBe(true);
    s.flags.urgent = 1;
    expect(hint('urgent').when(s)).toBe(false);
    // Kündigen: nur vor dem ersten Jobwechsel
    s.prestige.jobs = 1;
    expect(hint('career').when(s)).toBe(false);
  });

  it('nach dem Kündigen keine Anfänger-Hinweise, auch ohne alte Flags', () => {
    const s = createInitialState(0);
    s.prestige.jobs = 3;
    s.tickets = 1e9;
    for (const id of ['infra', 'upgrades', 'career']) {
      expect(hint(id).when(s), id).toBe(false);
      expect(hint(id).expired(s), id).toBe(true);
    }
  });

  it('jeder Hinweis hat ein Ziel und einen Text', () => {
    for (const x of HINTS) {
      expect(x.target.length).toBeGreaterThan(1);
      expect(x.text.length).toBeGreaterThan(20);
    }
    expect(new Set(HINTS.map((x) => x.id)).size).toBe(HINTS.length);
  });
});
