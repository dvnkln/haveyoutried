import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMPANIES } from '../../src/content/companies';
import { OS_IDS, SYSTEMS } from '../../src/content/systems';
import { activeOs, chooseOs, nextCompany, osAvailable, OS_NOTICE_FLAG } from '../../src/core/os';
import { bus } from '../../src/core/bus';
import { quitJob, ticketsForNextPoint } from '../../src/core/prestige';
import { deserialize, serialize } from '../../src/core/save';
import { createInitialState } from '../../src/core/state';

/** Regeln unabhängig davon prüfen, welche Looks schon fertig sind: alle (oder die genannten) gelten als fertig */
const realReady = SYSTEMS.map((o) => o.ready);
const setReady = (on: (id: string) => boolean) => SYSTEMS.forEach((o) => ((o as { ready: boolean }).ready = on(o.id)));
const restoreReady = () => SYSTEMS.forEach((o, i) => ((o as { ready: boolean }).ready = realReady[i]!));

describe('Betriebssysteme', () => {
  beforeEach(() => setReady(() => true));
  afterEach(restoreReady);

  it('jedes System wird von mindestens einer Firma benutzt, die erste Firma hat 98', () => {
    for (const id of OS_IDS) expect(COMPANIES.map((c) => c.os), id).toContain(id);
    const s = createInitialState(0);
    expect(activeOs(s)).toBe('win98');
    expect(s.os.unlocked).toEqual({ win98: true });
  });

  it('Kündigen schaltet das System der neuen Firma für immer frei, die Firma startet mit ihrem System', () => {
    const s = createInitialState(0);
    s.ticketsAllTime = ticketsForNextPoint(s);
    quitJob(s, () => 0.999);
    const company = COMPANIES.find((c) => c.id === s.prestige.company)!;
    expect(s.os.unlocked[company.os]).toBe(true);
    expect(s.os.unlocked.win98).toBe(true);
    expect(activeOs(s)).toBe(company.os);
  });

  it('eigene Wahl gilt je Firma und nur für freigeschaltete Systeme', () => {
    const s = createInitialState(0);
    expect(chooseOs(s, 'mac')).toBe(false);
    s.os.unlocked.mac = true;
    expect(chooseOs(s, 'mac')).toBe(true);
    expect(activeOs(s)).toBe('mac');
    s.prestige.company = 'amt';
    s.os.unlocked.xp = true;
    expect(activeOs(s)).toBe('xp');
  });

  it('Firmen mit fehlendem System bekommen zusammen mindestens die Hälfte der Chance', () => {
    const s = createInitialState(0);
    // alles außer Ubuntu (nur Middle-Out) freigeschaltet
    for (const id of OS_IDS) if (id !== 'ubuntu') s.os.unlocked[id] = true;
    let hits = 0;
    for (let i = 0; i < 1000; i++) if (nextCompany(s, () => (i + 0.5) / 1000).os === 'ubuntu') hits++;
    expect(hits).toBeGreaterThanOrEqual(495);
    expect(hits).toBeLessThanOrEqual(505);
    // nie die aktuelle Firma
    for (let i = 0; i < 100; i++) expect(nextCompany(s, () => i / 100).id).not.toBe(s.prestige.company);
  });

  it('ohne fehlende Systeme rein zufällig, bei vielen fehlenden nie seltener als ohne Bevorzugung', () => {
    const s = createInitialState(0);
    let fresh = 0;
    for (let i = 0; i < 1000; i++) if (!s.os.unlocked[nextCompany(s, () => (i + 0.5) / 1000).os]) fresh++;
    const natural = COMPANIES.filter((c) => c.id !== 'mueller' && c.os !== 'win98').length / (COMPANIES.length - 1);
    expect(fresh / 1000).toBeCloseTo(natural, 2);
  });

  it('Spielstand: Systeme bleiben erhalten, Unsinn fliegt raus', () => {
    const s = createInitialState(0);
    s.os.unlocked.xp = true;
    s.os.unlocked.mac = true;
    s.os.pick.mueller = 'mac';
    const raw = JSON.parse(serialize(s));
    raw.os.unlocked.amiga = true;
    raw.os.pick.amt = 'beos';
    const back = deserialize(JSON.stringify(raw), 0)!;
    expect(back.os.unlocked).toEqual({ win98: true, xp: true, mac: true });
    expect(back.os.pick).toEqual({ mueller: 'mac' });
    expect(activeOs(back)).toBe('mac');
  });

  it('alte Spielstände behalten XP und bekommen das Firmen-System dazu (mit Hinweis)', () => {
    const old = { version: 3, clicks: 500, prestige: { experience: 3, jobs: 2, company: 'konzern' } };
    const s = deserialize(JSON.stringify(old), 0)!;
    expect(s.os.unlocked).toEqual({ xp: true, win11: true });
    expect(activeOs(s)).toBe('xp');
    expect(s.flags[OS_NOTICE_FLAG]).toBe(1);
    // Firma mit XP: nichts Neues, kein Hinweis
    const amt = deserialize(JSON.stringify({ ...old, prestige: { ...old.prestige, company: 'amt' } }), 0)!;
    expect(amt.os.unlocked).toEqual({ xp: true });
    expect(amt.flags[OS_NOTICE_FLAG]).toBeUndefined();
  });
});

describe('Systeme ohne fertigen Look', () => {
  // nur 98 und XP fertig
  beforeEach(() => setReady((id) => id === 'win98' || id === 'xp'));
  afterEach(restoreReady);

  it('werden still freigeschaltet, aber nicht gezeigt, gemeldet oder angeboten', () => {
    const s = createInitialState(0);
    s.ticketsAllTime = ticketsForNextPoint(s);
    // letzte Firma in der Liste: SynergyHub.ai (Mac)
    let newOs: unknown = 'unset';
    const off = bus.on('jobQuit', (e) => (newOs = e.newOs));
    quitJob(s, () => 0.999);
    off();
    expect(s.prestige.company).toBe('unicorn');
    expect(s.os.unlocked.mac).toBe(true);
    expect(newOs).toBeNull();
    expect(activeOs(s)).toBe('xp');
    expect(osAvailable(s, 'mac')).toBe(false);
    expect(chooseOs(s, 'mac')).toBe(false);
  });

  it('alter Stand bei einer Firma mit unfertigem System: kein Hinweis', () => {
    const s = deserialize(JSON.stringify({ version: 3, clicks: 5, prestige: { experience: 0, jobs: 1, company: 'konzern' } }), 0)!;
    expect(s.os.unlocked.win11).toBe(true);
    expect(activeOs(s)).toBe('xp');
    expect(s.flags[OS_NOTICE_FLAG]).toBeUndefined();
  });

  it('Bevorzugung zählt nur fertige Systeme', () => {
    const s = createInitialState(0);
    s.os.unlocked.xp = true;
    // nichts Fertiges fehlt: rein zufällig, also landen Firmen mit unfertigem System nicht bevorzugt
    let unready = 0;
    for (let i = 0; i < 1000; i++) if (!['win98', 'xp'].includes(nextCompany(s, () => (i + 0.5) / 1000).os)) unready++;
    const natural = COMPANIES.filter((c) => c.id !== 'mueller' && !['win98', 'xp'].includes(c.os)).length / (COMPANIES.length - 1);
    expect(unready / 1000).toBeCloseTo(natural, 2);
  });
});
