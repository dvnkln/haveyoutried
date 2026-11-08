import { afterEach, describe, expect, it } from 'vitest';
import { INCIDENT_IDS, INCIDENTS } from '../../src/config';
import { INCIDENT_TEXT, MAILS, ROOT_CAUSES, SERVICES } from '../../src/content/incidents';
import { bus } from '../../src/core/bus';
import { rates } from '../../src/core/economy';
import {
  _resetIncidentRuntime,
  endIncident,
  incidentRunning,
  isSolved,
  resolveIncident,
  rewardFor,
  settleAbandoned,
  startIncident,
  updateIncidents,
} from '../../src/core/incidents';
import { createInitialState } from '../../src/core/state';
import { CONFIG } from '../../src/config';
import { applyOfflineProgress } from '../../src/core/offline';
import { tick } from '../../src/core/tick';
import { RaidSim } from '../../src/ui/incidents/raid';
import { affectedBy, ServicesSim } from '../../src/ui/incidents/services';
import { SpamSim } from '../../src/ui/incidents/spam';

afterEach(() => _resetIncidentRuntime());

describe('Incident-Planung', () => {
  it('erster Incident nach firstMs Spielzeit', () => {
    const s = createInitialState(0);
    const started: string[] = [];
    const off = bus.on('incidentStart', (e) => started.push(e.id));
    s.stats.playTimeMs = 1;
    updateIncidents(s);
    expect(s.incidents.nextAt).toBe(1 + INCIDENTS.firstMs);
    s.stats.playTimeMs = INCIDENTS.firstMs + 1;
    s.events.nextAt = 1e12; // Pager fern halten
    updateIncidents(s);
    off();
    expect(started).toHaveLength(1);
    expect(incidentRunning()).toBe(started[0]);
  });

  it('nicht parallel zu einem Pager-Event', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 100;
    s.incidents.nextAt = 50;
    s.events.active = { id: 'dns', expiresAt: 1e9, opened: false };
    updateIncidents(s);
    expect(incidentRunning()).toBeNull();
    expect(s.incidents.nextAt).toBe(100 + INCIDENTS.retryMs);
  });

  it('während eines Incidents: kein neues Pager-Event, Pager-Countdown steht', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 10_000;
    s.events.nextAt = 1e12;
    s.incidents.nextAt = 1e12;
    s.events.active = { id: 'dns', expiresAt: 20_000, opened: false };
    startIncident(s, 'raid');
    tick(s, 5, 5_000);
    expect(s.events.active!.expiresAt).toBe(25_000);
  });

  it('Start: sofort festgehalten und neu geplant', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 1_000;
    startIncident(s, 'spam');
    expect(s.incidents.active).toBe('spam');
    expect(s.incidents.lastId).toBe('spam');
    expect(s.incidents.nextAt).toBeGreaterThanOrEqual(1_000 + INCIDENTS.minMs);
  });

  it('Auflösung: Effekte nach Score, Statistik; Overlay bleibt aktiv bis endIncident', () => {
    const s = createInitialState(0);
    startIncident(s, 'spam');
    const res = resolveIncident(s, 'spam', 1, rates(s));
    expect(res.map((r) => r.effect)).toEqual(['win', 'flow']);
    expect(s.incidents.active).toBe('');
    expect(s.incidents.seen.spam).toBe(1);
    expect(s.incidents.best.spam).toBe(1);
    // Ergebniskarte noch offen: Pager weiter pausiert
    expect(incidentRunning()).toBe('spam');
    endIncident();
    expect(incidentRunning()).toBeNull();
  });

  it('kein Pager-Event hinter der offenen Ergebniskarte', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 10_000;
    s.events.nextAt = 10_500;
    s.incidents.nextAt = 1e12;
    startIncident(s, 'raid');
    resolveIncident(s, 'raid', 1, rates(s));
    tick(s, 5, 5_000);
    expect(s.events.active).toBeNull();
    endIncident();
    tick(s, 2, 7_000);
    expect(s.events.active).not.toBeNull();
  });

  it('Reload während eines Incidents: wird beim Laden als eskaliert gewertet', () => {
    const s = createInitialState(0);
    startIncident(s, 'raid');
    _resetIncidentRuntime(); // = Seite neu geladen
    const seen: boolean[] = [];
    const off = bus.on('incidentResolved', (e) => seen.push(e.abandoned));
    const res = settleAbandoned(s, rates(s))!;
    off();
    expect(res.map((r) => r.effect)).toEqual(['fire']);
    expect(seen).toEqual([true]);
    expect(s.incidents.active).toBe('');
    // und es startet nicht sofort ein neuer
    s.stats.playTimeMs = 1_000;
    s.events.nextAt = 1e12;
    updateIncidents(s);
    expect(incidentRunning()).toBeNull();
    expect(settleAbandoned(s, rates(s))).toBeNull();
  });

  it('Erfolgsgrenze kommt aus der Config und passt zur Belohnungsstufe', () => {
    expect(isSolved(INCIDENTS.goodMin)).toBe(true);
    expect(isSolved(INCIDENTS.goodMin - 0.01)).toBe(false);
    expect(rewardFor(INCIDENTS.goodMin - 0.01).effects).toEqual(['fire']);
  });

  it('Score-Stufen', () => {
    expect(rewardFor(0.97).effects).toEqual(['win', 'flow']);
    expect(rewardFor(0.85).effects).toEqual(['win']);
    expect(rewardFor(0.5).effects).toEqual(['tip']);
    expect(rewardFor(0.1).effects).toEqual(['fire']);
  });
});

describe('Abwesenheit zählt für die Timer', () => {
  it('lange weg: Event und Incident kommen kurz nach der Rückkehr', () => {
    const s = createInitialState(0);
    s.stats.playTimeMs = 1_000;
    s.events.nextAt = 1_000 + 4 * 60_000;
    s.incidents.nextAt = 1_000 + 10 * 60_000;
    applyOfflineProgress(s, 2 * 3600_000);
    expect(s.events.nextAt).toBe(1_000 + CONFIG.eventReturnDelayMs);
    expect(s.incidents.nextAt).toBe(1_000 + INCIDENTS.returnDelayMs);
  });

  it('kurz weg: Termine rücken nur um die Abwesenheit vor', () => {
    const s = createInitialState(0);
    s.events.nextAt = 300_000;
    s.incidents.nextAt = 600_000;
    applyOfflineProgress(s, 60_000);
    expect(s.events.nextAt).toBe(240_000);
    expect(s.incidents.nextAt).toBe(540_000);
  });

  it('nie später als vorher geplant', () => {
    const s = createInitialState(0);
    s.events.nextAt = 2_000;
    applyOfflineProgress(s, 60_000);
    expect(s.events.nextAt).toBe(2_000);
  });
});

describe('RAID', () => {
  it('stirbt bei 3 gleichzeitig defekten Platten, wenn man nichts tut', () => {
    const sim = new RaidSim();
    for (let t = 0; t < 10_000 && !sim.dead; t += 50) sim.update(50);
    expect(sim.dead).toBe(true);
    expect(isSolved(sim.score())).toBe(false);
  });

  it('totes Array ist nie ein Erfolg, auch wenn es spät stirbt', () => {
    const sim = new RaidSim();
    // bis kurz vor Schluss alles retten, dann liegen lassen
    for (let t = 0; t < INCIDENTS.games.raid.durationMs - 3_000; t += 50) {
      sim.update(50);
      sim.disks.forEach((d, i) => d === 'failed' && sim.replace(i));
    }
    for (let t = 0; t < 10_000 && !sim.dead; t += 50) sim.update(50);
    expect(sim.dead).toBe(true);
    expect(isSolved(sim.score())).toBe(false);
  });

  it('überlebt, wenn man sofort tauscht – gute Wertung', () => {
    const sim = new RaidSim();
    for (let t = 0; t < INCIDENTS.games.raid.durationMs; t += 50) {
      sim.update(50);
      sim.disks.forEach((d, i) => d === 'failed' && sim.replace(i));
    }
    expect(sim.dead).toBe(false);
    expect(sim.replaced).toBeGreaterThan(10);
    expect(sim.score()).toBeGreaterThan(0.9);
  });

  it('intakte Platte tauschen zählt nicht', () => {
    const sim = new RaidSim();
    expect(sim.replace(0)).toBe(false);
    expect(sim.mdstat()).toBe('U'.repeat(INCIDENTS.games.raid.disks));
  });
});

describe('Spamfilter', () => {
  it('alles richtig bis zum Ziel = 1, Fehler drücken die Wertung', () => {
    const sim = new SpamSim();
    for (let i = 0; i < INCIDENTS.games.spam.target; i++) sim.answer(sim.current.spam);
    expect(sim.score()).toBe(1);
    sim.answer(!sim.current.spam);
    expect(sim.score()).toBeLessThan(1);
  });
  it('genug Spam und echte Mails im Pool', () => {
    expect(MAILS.filter((m) => m.spam).length).toBeGreaterThanOrEqual(8);
    expect(MAILS.filter((m) => !m.spam).length).toBeGreaterThanOrEqual(8);
  });
});

describe('Dienste-Dashboard', () => {
  it('DNS-Ausfall reißt LDAP, Mail, App, Intranet, VPN mit', () => {
    expect([...affectedBy('dns')].sort()).toEqual(['app', 'dns', 'ldap', 'mail', 'vpn', 'web'].sort());
    expect([...affectedBy('nfs')].sort()).toEqual(['app', 'db', 'nfs', 'web'].sort());
  });

  it('nur die Ursache neu zu starten löst die Runde', () => {
    const sim = new ServicesSim(2);
    const dependent = [...sim.down].find((id) => id !== sim.root);
    if (dependent) expect(sim.restart(dependent)).toBe('symptom');
    expect(sim.restart(sim.root)).toBe('fixed');
    expect(sim.restart(sim.root)).toBe('fixed');
    expect(sim.done).toBe(true);
  });

  it('Wertung: alle Runden ohne Fehler = 1', () => {
    const sim = new ServicesSim(3);
    while (!sim.done) sim.restart(sim.root);
    expect(sim.score()).toBe(1);
  });

  it('jede mögliche Ursache existiert als Dienst', () => {
    for (const r of ROOT_CAUSES) expect(SERVICES.some((s) => s.id === r.id)).toBe(true);
  });
});

describe('Inhalte', () => {
  it('jeder Incident hat Texte', () => {
    for (const id of INCIDENT_IDS) {
      const t = INCIDENT_TEXT[id];
      expect(t.host && t.service && t.goal && t.good.length && t.bad.length).toBeTruthy();
    }
  });
});
