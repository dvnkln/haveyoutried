import { describe, expect, it } from 'vitest';
import { availableCallers } from '../../src/content/callers';
import { EVENTS } from '../../src/content/events';
import { HERRK_RETIRED_STEP, storyKey } from '../../src/content/gates';
import { STORIES } from '../../src/content/stories';
import { createInitialState } from '../../src/core/state';

const HERR_K = 'Herr K. (seit 1987 dabei)';
const who = (s: ReturnType<typeof createInitialState>) => availableCallers(s).map((c) => c.who);

describe('Anrufer passen zur Firma', () => {
  it('Herr K. nur bei der Spedition', () => {
    const s = createInitialState(0);
    expect(who(s)).toContain(HERR_K);
    // andere Firma, Geschichte noch nicht weit: trotzdem kein Herr K.
    s.prestige.company = 'startup';
    expect(who(s)).not.toContain(HERR_K);
  });

  it('Herr K. ruft nach seiner Rente nicht mehr an', () => {
    const s = createInitialState(0);
    s.flags[storyKey('mueller', 'herrk')] = HERRK_RETIRED_STEP - 1;
    expect(who(s)).toContain(HERR_K);
    s.flags[storyKey('mueller', 'herrk')] = HERRK_RETIRED_STEP;
    expect(who(s)).not.toContain(HERR_K);
  });

  it('Rente beginnt nach seinem letzten Arbeitstag', () => {
    const story = STORIES.find((x) => x.id === 'herrk')!;
    expect(story.episodes[HERRK_RETIRED_STEP - 1]!.who).toContain('letzter Tag');
    expect(story.episodes[HERRK_RETIRED_STEP]!.who).toContain('in Rente');
  });

  it('Gründer nur in Start-ups, Prüfungsamt nur an der Uni', () => {
    const s = createInitialState(0);
    expect(who(s)).not.toContain('Gründer (aus Lissabon)');
    expect(who(s)).not.toContain('Prüfungsamt');
    for (const id of ['startup', 'middleout', 'unicorn']) {
      s.prestige.company = id;
      expect(who(s), id).toContain('Gründer (aus Lissabon)');
    }
    s.prestige.company = 'uni';
    expect(who(s)).toContain('Prüfungsamt');
    expect(who(s)).not.toContain('Gründer (aus Lissabon)');
  });

  it('Bobby Tables nur in Kita und Uni', () => {
    const bobby = EVENTS.find((e) => e.id === 'bobby')!;
    const s = createInitialState(0);
    expect(bobby.when!(s)).toBe(false);
    for (const id of ['kita', 'uni']) {
      s.prestige.company = id;
      expect(bobby.when!(s), id).toBe(true);
    }
  });
});
