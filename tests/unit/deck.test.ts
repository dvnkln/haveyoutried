import { describe, expect, it } from 'vitest';
import { INCIDENT_IDS } from '../../src/config';
import { EVENTS } from '../../src/content/events';
import { draw } from '../../src/core/deck';
import { rates } from '../../src/core/economy';
import { resolveEvent, updateEvents } from '../../src/core/events';
import { nextIncidentId } from '../../src/core/incidents';
import { createInitialState } from '../../src/core/state';
import { deserialize, serialize } from '../../src/core/save';

const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('Kartenstapel für Texte', () => {
  it('erst jeder Eintrag einmal, dann neue Runde ohne direkte Wiederholung', () => {
    const s = createInitialState(0);
    let prev = '';
    for (let round = 0; round < 20; round++) {
      const got = ITEMS.map(() => {
        const x = draw(s, 'test', ITEMS);
        expect(x).not.toBe(prev);
        prev = x;
        return x;
      });
      // pro Runde (ab der zweiten um eins versetzt, weil der letzte nicht sofort wieder darf) nie doppelt
      if (round === 0) expect(new Set(got).size).toBe(ITEMS.length);
    }
  });

  it('übersteht Speichern und Laden', () => {
    const s = createInitialState(0);
    const first = [draw(s, 'test', ITEMS), draw(s, 'test', ITEMS), draw(s, 'test', ITEMS)];
    const loaded = deserialize(serialize(s), 0)!;
    const rest = ITEMS.slice(3).map(() => draw(loaded, 'test', ITEMS));
    expect(new Set([...first, ...rest]).size).toBe(ITEMS.length);
  });

  it('kaputte Daten im Spielstand stören nicht', () => {
    const s = createInitialState(0);
    (s.decks as Record<string, unknown>).test = 'quatsch';
    expect(ITEMS).toContain(draw(s, 'test', ITEMS));
  });
});

describe('Pager-Ereignisse reihum', () => {
  it('kein Ereignis zum zweiten Mal, bevor alle möglichen einmal dran waren', () => {
    const s = createInitialState(0);
    s.generators.intern.owned = 1;
    s.generators.agent.owned = 1;
    s.stats.playTimeMs = 10;
    const ids: string[] = [];
    for (let i = 0; i < 80; i++) {
      s.events.nextAt = 1;
      updateEvents(s, 0, () => rates(s), new Date(2026, 10, 11, 10)); // Mittwoch, nichts mit Sondergewicht
      ids.push(s.events.active!.id);
      resolveEvent(s, -1, rates(s));
    }
    const possible = EVENTS.filter((e) => e.when?.(s) ?? true).length;
    // die ersten (Einstieg) zählen mit; in jeder vollen Runde jedes Ereignis genau einmal
    expect(new Set(ids.slice(0, possible)).size).toBe(possible);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });
});

describe('Minispiele reihum', () => {
  it('jedes einmal pro Runde, nie zweimal hintereinander, Kabelspiele nicht direkt nacheinander', () => {
    const s = createInitialState(0);
    const ids: string[] = [];
    for (let i = 0; i < 3000; i++) {
      const id = nextIncidentId(s);
      ids.push(id);
      s.incidents.lastId = id;
      s.incidents.seen[id] = (s.incidents.seen[id] ?? 0) + 1;
    }
    expect(new Set(ids.slice(0, INCIDENT_IDS.length)).size).toBe(INCIDENT_IDS.length);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).not.toBe(ids[i - 1]);
      expect([ids[i - 1], ids[i]].sort().join()).not.toBe('patch,untangle');
    }
    // gleichmäßig: auch nach 3000 Runden höchstens zwei Spiele Unterschied (Lückenfüller am Rundenende)
    const counts = INCIDENT_IDS.map((id) => s.incidents.seen[id] ?? 0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
});

describe('Mail vom Chef reihum', () => {
  it('keine Frage doppelt, bis alle passenden einmal dran waren', async () => {
    const { bossReport, REPORT_ITEMS } = await import('../../src/content/report');
    const s = createInitialState(0);
    s.generators.cron.owned = 1;
    s.generators.intern.owned = 1;
    const plain = REPORT_ITEMS.filter((i) => !i.when).map((i) => i.text(180, s, 1e6));
    const special = REPORT_ITEMS.filter((i) => i.when?.(s)).length;
    const seen: string[] = [];
    const mails = Math.floor(plain.length / 2);
    for (let i = 0; i < mails; i++) {
      const items = bossReport(s, 3 * 3_600_000, false).items;
      // immer genau eine Frage zur Infrastruktur vorweg, reihum
      expect(plain).not.toContain(items[0]);
      seen.push(...items.slice(1));
    }
    expect(special).toBeGreaterThan(1);
    expect(seen.filter((t) => plain.includes(t)).length).toBe(new Set(seen.filter((t) => plain.includes(t))).size);
  });
});

describe('alter Spielstand mit hohen Zählern', () => {
  it('neue Ereignisse und Minispiele kommen nicht jedes zweite Mal', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 10;
    s.flags['ev:dns:0:win'] = 1; // Einstieg schon gesehen
    for (const e of EVENTS) s.events.seen[e.id] = 50;
    s.events.seen.miles500 = 0;
    for (const id of INCIDENT_IDS) s.incidents.seen[id] = 30;
    s.incidents.seen.lb = 0;
    const ev: string[] = [];
    const inc: string[] = [];
    for (let i = 0; i < 20; i++) {
      s.events.nextAt = 1;
      updateEvents(s, 0, () => rates(s), new Date(2026, 10, 11, 10));
      ev.push(s.events.active!.id);
      resolveEvent(s, -1, rates(s));
      const id = nextIncidentId(s);
      inc.push(id);
      s.incidents.lastId = id;
    }
    expect(ev.filter((id) => id === 'miles500').length).toBeLessThanOrEqual(1);
    expect(inc.filter((id) => id === 'lb').length).toBeLessThanOrEqual(2);
  });
});
