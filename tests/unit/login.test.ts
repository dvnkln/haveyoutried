import { describe, expect, it } from 'vitest';
import { markLoggedIn, needsLogin, needsOsLogin, requireOsLogin } from '../../src/core/login';
import { serialize } from '../../src/core/save';
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

  it('Systemwechsel: neue Anmeldung übersteht Neuladen, Anmelden erledigt sie', () => {
    const s = createInitialState(0);
    markLoggedIn(s);
    requireOsLogin(s);
    const back = deserialize(serialize(s), 0)!;
    expect(needsOsLogin(back)).toBe(true);
    expect(needsLogin(back)).toBe(false);
    markLoggedIn(back);
    expect(needsOsLogin(back)).toBe(false);
  });
});
