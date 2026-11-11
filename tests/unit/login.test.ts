import { describe, expect, it } from 'vitest';
import { markLoggedIn, needsLogin } from '../../src/core/login';
import { deserialize } from '../../src/core/save';
import { createInitialState } from '../../src/core/state';

describe('Anmeldebildschirm', () => {
  it('neuer Spielstand: Anmeldung nötig, danach nicht mehr', () => {
    const s = createInitialState(0);
    expect(needsLogin(s)).toBe(true);
    markLoggedIn(s);
    expect(needsLogin(s)).toBe(false);
  });

  it('nach einem Jobwechsel wieder nötig', () => {
    const s = createInitialState(0);
    markLoggedIn(s);
    s.prestige.jobs = 1;
    expect(needsLogin(s)).toBe(true);
    markLoggedIn(s);
    expect(needsLogin(s)).toBe(false);
  });

  it('alte Spielstände mit gespielten Anschlägen gelten als angemeldet, frische nicht', () => {
    const old = deserialize(JSON.stringify({ version: 1, clicks: 50, prestige: { experience: 3, jobs: 2, company: 'kita' } }), 1)!;
    expect(needsLogin(old)).toBe(false);
    const fresh = deserialize(JSON.stringify({ version: 1, clicks: 0 }), 1)!;
    expect(needsLogin(fresh)).toBe(true);
  });
});
