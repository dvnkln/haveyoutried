import { describe, expect, it } from 'vitest';
import { PRESTIGE } from '../../src/config';
import { CALENDAR_LINES } from '../../src/content/props';
import { BOSS_DONE, BOSS_FAILED, BOSS_TASKS } from '../../src/content/boss';
import { ACH_SEEN_FLAG, isUnread, markAllRead, markRead } from '../../src/core/achievements';
import { experienceFor, quitWorth } from '../../src/core/prestige';
import { quirkEffects } from '../../src/core/quirks';
import { deserialize, serialize } from '../../src/core/save';
import { createInitialState, DEFAULT_VOLUME } from '../../src/core/state';

/** so viele Tickets (über alle Jobs), dass es genau n Punkte gibt */
const ticketsFor = (n: number) => {
  let t = PRESTIGE.ticketsPerPoint;
  while (experienceFor(t) < n) t *= 1.01;
  return t;
};

describe('Punkt an „Karriere“: nur fürs Kündigen', () => {
  it('0 ohne Gewinn, 1 sobald es geht, 2 wenn der Bonus um mindestens 25 % wächst', () => {
    const s = createInitialState(0);
    expect(quitWorth(s)).toBe(0);
    s.ticketsAllTime = ticketsFor(1);
    expect(quitWorth(s)).toBe(1);
    s.ticketsAllTime = ticketsFor(5); // 1,00 → 1,25
    expect(quitWorth(s)).toBe(2);
  });

  it('mit viel Erfahrung reicht ein Punkt nicht mehr für den kräftigen Punkt', () => {
    const s = createInitialState(0);
    s.prestige.experience = 20; // Faktor 2,0
    s.ticketsAllTime = ticketsFor(24); // +4 → 2,2 (×1,1)
    expect(quitWorth(s)).toBe(1);
    s.ticketsAllTime = ticketsFor(30); // +10 → 2,5 (×1,25)
    expect(quitWorth(s)).toBe(2);
  });

  it('neue Achievements machen keinen Punkt', () => {
    const s = createInitialState(0);
    s.achievements = { first: Date.now() };
    expect(quitWorth(s)).toBe(0);
  });
});

describe('neue Achievements: gelesen', () => {
  it('neu bis gelesen, alte Spielstände gelten bis zur Grenze als gelesen', () => {
    const s = createInitialState(0);
    s.flags[ACH_SEEN_FLAG] = 1000;
    s.achievements = { alt: 500, a: 2000, b: 3000 };
    expect(isUnread(s, 'alt')).toBe(false);
    expect(isUnread(s, 'a')).toBe(true);
    expect(isUnread(s, 'offen')).toBe(false);
    markRead(s, 'a', 4000);
    expect(isUnread(s, 'a')).toBe(false);
    expect(isUnread(s, 'b')).toBe(true);
    // letztes gelesen: Einzelmarken werden zur Grenze zusammengefasst
    markRead(s, 'b', 4000);
    expect(s.flags[ACH_SEEN_FLAG]).toBe(4000);
    expect(Object.keys(s.flags).filter((k) => k.startsWith('ach:read:'))).toEqual([]);
  });

  it('„Alle gelesen“', () => {
    const s = createInitialState(0);
    s.flags[ACH_SEEN_FLAG] = 0;
    s.achievements = { a: 10, b: 20 };
    markAllRead(s, 15);
    expect(isUnread(s, 'a')).toBe(false);
    expect(isUnread(s, 'b')).toBe(false);
  });
});

describe('Einstellungen', () => {
  it('Taskleiste: unbekannte Position wird „unten“, gültige bleibt', () => {
    const s = createInitialState(0);
    s.settings.taskbar = 'left';
    expect(deserialize(serialize(s), 1)!.settings.taskbar).toBe('left');
    const bad = JSON.parse(serialize(s));
    bad.settings.taskbar = 'diagonal';
    expect(deserialize(JSON.stringify(bad), 1)!.settings.taskbar).toBe('bottom');
    expect(deserialize(JSON.stringify({ version: 1, tickets: 1 }), 1)!.settings.taskbar).toBe('bottom');
  });

  it('Standard-Lautstärken stehen im neuen Spielstand', () => {
    const s = createInitialState(0);
    expect(s.settings.volume).toBe(DEFAULT_VOLUME.volume);
    expect(s.settings.ambienceVolume).toBe(DEFAULT_VOLUME.ambienceVolume);
  });
});

describe('Texte', () => {
  it('kein Chef-Spruch am Abreißkalender (der Spieler ist nicht der Chef)', () => {
    for (const l of CALENDAR_LINES) expect(l, l).not.toMatch(/\bChef\b|\bIch\b|\bmein/i);
  });

  it('jeder Chef-Spruch nur an einer Stelle', () => {
    const all = [...CALENDAR_LINES, ...BOSS_DONE, ...BOSS_FAILED, ...Object.values(BOSS_TASKS).flat()];
    expect(new Set(all).size).toBe(all.length);
  });

  it('Eigenheiten der Firma: Vor- und Nachteile richtig eingefärbt', () => {
    expect(quirkEffects({ prod: 1.3, costs: 1.3 })).toEqual([
      { text: 'Infrastruktur +30 %', tone: 'good' },
      { text: 'Preise +30 %', tone: 'bad' },
    ]);
    expect(quirkEffects({ tempo: 0.8, costs: 0.8 }).map((e) => e.tone)).toEqual(['bad', 'good']);
    expect(quirkEffects({ incidents: 2 })[0]).toEqual({ text: 'Incidents ×2', tone: 'mixed' });
  });
});

