import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENTS_CFG, PRESTIGE } from '../../src/config';
import { ACHIEVEMENTS } from '../../src/content/achievements';
import { COMPANIES } from '../../src/content/companies';
import { checkAchievements } from '../../src/core/achievements';
import { bus } from '../../src/core/bus';
import { applyOfflineProgress } from '../../src/core/offline';
import { clickValue, productionPerSec, rates, tempo, ticketReward } from '../../src/core/economy';
import { prod } from './helpers';
import { resolveEvent } from '../../src/core/events';
import { _resetIncidentRuntime, startIncident } from '../../src/core/incidents';
import { canQuit, experienceFor, prestigeGain, quitJob, ticketsForNextPoint } from '../../src/core/prestige';
import { createInitialState } from '../../src/core/state';

afterEach(() => _resetIncidentRuntime());

describe('Berufserfahrung', () => {
  it('Wurzelformel: 1 Punkt-Schwelle → 1, 100× → 10, 10.000× → 100', () => {
    const P = PRESTIGE.ticketsPerPoint;
    expect(experienceFor(P - 1)).toBe(0);
    expect(experienceFor(P)).toBe(1);
    expect(experienceFor(100 * P)).toBe(10);
    expect(experienceFor(10_000 * P)).toBe(100);
  });

  it('nächster Punkt: genau dort springt die Erfahrung', () => {
    const s = createInitialState(0);
    s.ticketsAllTime = 5e6;
    const at = ticketsForNextPoint(s);
    expect(experienceFor(at)).toBe(experienceFor(5e6) + 1);
    expect(experienceFor(at - 1)).toBe(experienceFor(5e6));
  });

  it('Kündigen: Erfahrung gutschreiben, Job zurücksetzen, Lebenslanges behalten', () => {
    const s = createInitialState(0);
    const P = PRESTIGE.ticketsPerPoint;
    s.tickets = 50 * P;
    s.ticketsTotal = 100 * P;
    s.ticketsAllTime = 100 * P;
    s.clicks = 1234;
    s.generators.cron.owned = 40;
    s.upgrades = { coffee: true };
    s.buffs = [{ id: 'flow', target: 'prod', mult: 3, remainingMs: 1000 }];
    s.achievements = { first: 1 };
    s.settings.sound = false;
    const quit: number[] = [];
    const off = bus.on('jobQuit', (e) => quit.push(e.gained));

    expect(quitJob(s, () => 0)).toBe(10);
    off();
    expect(quit).toEqual([10]);
    expect(s.prestige).toMatchObject({ experience: 10, jobs: 1 });
    expect(s.prestige.company).not.toBe('mueller');
    expect(s.tickets).toBe(0);
    expect(s.ticketsTotal).toBe(0);
    expect(s.generators.cron.owned).toBe(0);
    expect(s.upgrades).toEqual({});
    expect(s.buffs).toEqual([]);
    // bleibt
    expect(s.ticketsAllTime).toBe(100 * P);
    expect(s.clicks).toBe(1234);
    expect(s.achievements).toEqual({ first: 1 });
    expect(s.settings.sound).toBe(false);
    // sofort nochmal kündigen bringt nichts
    expect(prestigeGain(s)).toBe(0);
    expect(quitJob(s)).toBe(0);
  });

  it('nicht während eines Incidents', () => {
    const s = createInitialState(0);
    s.ticketsAllTime = 1e8;
    startIncident(s, 'raid');
    expect(canQuit(s)).toBe(false);
  });

  it('Bonus je Punkt auf Produktion und Tipptempo', () => {
    const s = createInitialState(0);
    s.generators.bash.owned = 10;
    s.prestige.experience = 10;
    expect(productionPerSec(s)).toBeCloseTo(10 * prod('bash') * (1 + 10 * PRESTIGE.bonusPerPoint));
    expect(tempo(s)).toBeCloseTo(1 + 10 * PRESTIGE.bonusPerPoint);
  });

  it('jede Firma hat Name, Host und Begrüßung; IDs eindeutig', () => {
    for (const c of COMPANIES) expect(c.name && c.host && c.welcome).toBeTruthy();
    expect(new Set(COMPANIES.map((c) => c.id)).size).toBe(COMPANIES.length);
    expect(COMPANIES.map((c) => c.host).every((h) => /^[a-z0-9-]+$/.test(h))).toBe(true);
  });
});

describe('Achievements', () => {
  it('Definitionen: eindeutige IDs, Texte vorhanden', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.name && a.desc).toBeTruthy();
  });

  it('frischer Spielstand schaltet nichts frei (außer zeitabhängigen)', () => {
    const s = createInitialState(0);
    const tuesdayNoon = new Date(2026, 10, 10, 12, 0);
    expect(checkAchievements(s, tuesdayNoon)).toEqual([]);
  });

  it('freischalten: gespeichert, gemeldet, nur einmal, mit Bonus', () => {
    const s = createInitialState(0);
    s.flags.solved = 1;
    const seen: string[] = [];
    const off = bus.on('achievement', (e) => seen.push(e.id));
    const d = new Date(2026, 10, 10, 12, 0);
    expect(checkAchievements(s, d)).toEqual(['first']);
    expect(checkAchievements(s, d)).toEqual([]);
    off();
    expect(seen).toEqual(['first']);
    expect(s.achievements.first).toBe(d.getTime());
    expect(ticketReward(s)).toBeCloseTo(1 + ACHIEVEMENTS_CFG.bonusPerAchievement);
  });

  it('Event-Ausgänge zählen: „Es war DNS.“ und „Nicht mein Problem“', () => {
    const s = createInitialState(0);
    s.events.active = { id: 'dns', expiresAt: 1e9, opened: true };
    resolveEvent(s, 0, rates(s)); // Logs lesen → win
    for (let i = 0; i < 5; i++) {
      s.events.active = { id: 'coffee', expiresAt: 0, opened: false };
      resolveEvent(s, -1, rates(s));
    }
    const ids = checkAchievements(s, new Date(2026, 10, 10, 12, 0));
    expect(ids).toContain('dns');
    expect(ids).toContain('ignore5');
  });

  it('Wochenende: 8 h Abwesenheit', () => {
    const s = createInitialState(0);
    applyOfflineProgress(s, 9 * 3600_000);
    expect(checkAchievements(s, new Date(2026, 10, 10, 12, 0))).toContain('weekend');
  });

  it('Uhrzeit-Geheimnisse: Nachtschicht und Freitag 16:55', () => {
    const s = createInitialState(0);
    expect(checkAchievements(s, new Date(2026, 10, 13, 16, 57))).toEqual(['fridayLate']);
    expect(checkAchievements(s, new Date(2026, 10, 10, 3, 0))).toEqual(['night']);
  });
});

describe('Neue Achievements und Zähler', () => {
  it('Firmen werden beim Kündigen mitgezählt', () => {
    const s = createInitialState(0);
    for (let i = 1; i <= 5; i++) {
      s.ticketsAllTime = 1e6 * (i * 3) ** 2;
      quitJob(s);
    }
    const companies = Object.keys(s.flags).filter((k) => k.startsWith('company:'));
    expect(companies.length).toBeGreaterThanOrEqual(5);
    expect(checkAchievements(s, new Date(2026, 10, 10, 12, 0))).toContain('companies5');
  });

  it('Uhrzeit- und Einstellungs-Geheimnisse', () => {
    const s = createInitialState(0);
    expect(checkAchievements(s, new Date(2026, 10, 10, 13, 37))).toEqual(['leet']);
    s.settings.volume = 1;
    expect(checkAchievements(s, new Date(2026, 10, 10, 12, 0))).toEqual(['loud']);
    s.buffs = [
      { id: 'flow', target: 'prod', mult: 3, remainingMs: 1 },
      { id: 'rush', target: 'prod', mult: 2, remainingMs: 1 },
      { id: 'overtime', target: 'click', mult: 7, remainingMs: 1 },
    ];
    expect(checkAchievements(s, new Date(2026, 10, 10, 12, 0))).toEqual(['chaos']);
  });

  it('Anrufer-Zähler', () => {
    const s = createInitialState(0);
    s.flags.callers = 100;
    s.flags.callbacks = 10;
    const ids = checkAchievements(s, new Date(2026, 10, 10, 12, 0));
    expect(ids).toEqual(expect.arrayContaining(['callers100', 'callbacks10']));
  });
});

describe('Review-Fixes Karriere', () => {
  it('nach dem Kündigen piept der Pager nicht sofort', () => {
    const s = createInitialState(0);
    s.ticketsAllTime = 1e8;
    s.stats.playTimeMs = 500_000;
    s.events.nextAt = 0; // überfällig
    quitJob(s, () => 0);
    expect(s.events.nextAt).toBeGreaterThan(s.stats.playTimeMs);
  });

  it('Uhrzeit-Achievements brauchen Aktivität', () => {
    const s = createInitialState(0);
    const night = new Date(2026, 10, 9, 3, 14);
    expect(checkAchievements(s, night, false)).not.toContain('pi');
    expect(s.achievements.pi).toBeUndefined();
    const got = checkAchievements(s, night, true);
    expect(got).toContain('pi');
    expect(got).toContain('night');
  });

  it('Achievement-Bonus folgt neuen Freischaltungen trotz Zwischenspeicher', () => {
    const s = createInitialState(0);
    const before = clickValue(s);
    s.flags.solved = 1;
    checkAchievements(s, new Date(2026, 10, 10, 12, 0), false);
    expect(s.achievements.first).toBeDefined();
    expect(clickValue(s)).toBeGreaterThan(before);
  });

  it('meldet die Größe des Durchgangs mit (für die Sammelmeldung)', () => {
    const s = createInitialState(0);
    s.clicks = 10_000;
    const seen: number[] = [];
    const off = bus.on('achievement', (e) => seen.push(e.batch));
    const got = checkAchievements(s, new Date(2026, 10, 10, 12, 0), false);
    off();
    expect(got.length).toBeGreaterThan(1);
    expect(seen).toEqual(got.map(() => got.length));
  });
});
