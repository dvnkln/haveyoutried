import { describe, expect, it } from 'vitest';
import { INCIDENTS } from '../../src/config';
import { DISK_GROWERS, DISK_JUNK, DISK_KEEP } from '../../src/content/incidents';
import { isSolved } from '../../src/core/incidents';
import { DiskSim, MAP_H, squarify } from '../../src/ui/incidents/diskfull';
import { CertSim } from '../../src/ui/incidents/certs';
import { UpsSim } from '../../src/ui/incidents/ups';
import { CoolingSim } from '../../src/ui/incidents/cooling';
import { RackSim } from '../../src/ui/incidents/rack';
import { segmentHitsBox, SIZE, segmentsCross, UntangleSim } from '../../src/ui/incidents/untangle';
import { TANGLE_DEVICES } from '../../src/content/incidents';
import { TapeSim, weekStart } from '../../src/ui/incidents/tapes';
import { AREAS, JAM_DIRS, JamSim, type Step } from '../../src/ui/incidents/jam';
import { LbSim } from '../../src/ui/incidents/lb';
import { LB_EVENTS } from '../../src/content/incidents';

const CFG = INCIDENTS.games.diskfull;

/** fester Zufall für reproduzierbare Läufe */
const seeded = (seed: number) => {
  let x = (seed * 7919 + 12345) % 2147483647;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
};

describe('Platte voll', () => {
  it('Start: fast voll, Ziel ist erreichbar, nohup.out ist immer dabei', () => {
    const sim = new DiskSim(CFG, seeded(7));
    expect(sim.free).toBeCloseTo(CFG.startFreeGb);
    expect(sim.files.find((f) => f.grows)!.again).toBeTruthy();
    expect(sim.files.filter((f) => f.keep)).toHaveLength(CFG.keep);
    expect(sim.files.filter((f) => !f.keep && !f.grows)).toHaveLength(CFG.junk);
    expect(sim.files.filter((f) => f.grows)).toHaveLength(1);
  });

  it('Ziel je Runde verschieden, aber immer erreichbar (auch mit Wachstum, ohne die wachsende Datei)', () => {
    const goals = new Set<number>();
    const growth = (CFG.growGbPerSec * CFG.durationMs) / 1_000;
    for (let seed = 1; seed < 500; seed++) {
      const sim = new DiskSim(CFG, seeded(seed));
      goals.add(sim.goal);
      const junk = sim.files.filter((f) => !f.keep && !f.grows).reduce((s, f) => s + f.gb, 0);
      expect(CFG.startFreeGb + junk - growth).toBeGreaterThanOrEqual(sim.goal);
      expect(sim.goal).toBeGreaterThanOrEqual(CFG.goalMinGb);
      expect(sim.goal).toBeLessThanOrEqual(CFG.goalMaxGb);
    }
    expect(goals.size).toBeGreaterThan(2);
  });

  it('Runden sehen verschieden aus: andere Dateien, andere wachsende Datei', () => {
    const names = new Set<string>();
    const growers = new Set<string>();
    for (let seed = 1; seed < 300; seed++) {
      const sim = new DiskSim(CFG, seeded(seed));
      sim.files.forEach((f) => names.add(f.name));
      growers.add(sim.files.find((f) => f.grows)!.name);
    }
    expect(names.size).toBe(DISK_JUNK.length + DISK_KEEP.length + DISK_GROWERS.length);
    expect(growers.size).toBe(DISK_GROWERS.length);
  });

  it('keine doppelten Namen in den Listen', () => {
    const all = [...DISK_JUNK, ...DISK_KEEP, ...DISK_GROWERS].map((e) => e.name);
    expect(new Set(all).size).toBe(all.length);
  });

  it('nur Überflüssiges löschen: Ziel erreicht, volle Punktzahl', () => {
    const sim = new DiskSim(CFG, seeded(3));
    for (const f of sim.files.filter((x) => !x.keep && !x.grows)) {
      sim.update(500);
      expect(sim.remove(f.id)).toBe('ok');
      if (sim.done) break;
    }
    expect(sim.done).toBe(true);
    expect(sim.score()).toBe(1);
  });

  it('Wichtiges bleibt stehen und zählt als Fehlgriff', () => {
    const sim = new DiskSim(CFG, seeded(5));
    const db = sim.files.find((f) => f.keep)!;
    const before = sim.free;
    expect(sim.remove(db.id)).toBe('keep');
    expect(db.gone).toBe(false);
    expect(sim.free).toBe(before);
    expect(sim.wrong).toBe(1);
  });

  it('nohup.out fängt nach dem Löschen von vorn an und wächst weiter', () => {
    const sim = new DiskSim(CFG, seeded(9));
    const log = sim.files.find((f) => f.grows)!;
    sim.update(2_000);
    expect(log.gb).toBeGreaterThan(CFG.growStartGb);
    expect(sim.remove(log.id)).toBe('again');
    expect(log.gb).toBe(0);
    expect(log.gone).toBe(false);
    sim.update(1_000);
    expect(log.gb).toBeCloseTo(CFG.growGbPerSec);
  });

  it('nichts tun: Platte läuft voll, nicht gelöst', () => {
    const sim = new DiskSim(CFG, seeded(11));
    for (let t = 0; t < CFG.durationMs; t += 100) sim.update(100);
    expect(sim.dead).toBe(true);
    expect(sim.free).toBe(0);
    expect(isSolved(sim.score())).toBe(false);
  });

  it('jede wichtige Datei hat einen Text für den Beinahe-Unfall', () => {
    for (const e of DISK_KEEP) expect(e.nearMiss).toBeTruthy();
  });
});

describe('Treemap (squarify)', () => {
  it('Flächen proportional, lückenlos im Rahmen', () => {
    const values = [20, 14, 13, 11, 10, 9, 8, 7, 5, 4];
    const rects = squarify(values, 100, 108);
    const total = values.reduce((s, v) => s + v, 0);
    let sum = 0;
    rects.forEach((r, i) => {
      expect(r.w * r.h).toBeCloseTo((values[i]! / total) * 100 * 108, 5);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(108 + 1e-9);
      sum += r.w * r.h;
    });
    expect(sum).toBeCloseTo(100 * 108, 5);
  });

  it('jede Kachel ist breit und hoch genug zum Antippen (≥ 12,5 % der Kartenbreite, ca. 38 px)', () => {
    for (let seed = 1; seed < 300; seed++) {
      const sim = new DiskSim(CFG, seeded(seed));
      const rects = squarify(
        sim.files.map((f) => f.area),
        100,
        MAP_H,
      );
      for (const r of rects) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(12.5);
    }
  });
});

describe('Zertifikate', () => {
  const C = INCIDENTS.games.certs;

  /** Spieler mit Plan: sobald certbot frei ist, das knappste fällige Zertifikat erneuern (mit Reaktionszeit) */
  const playGreedy = (seed: number, reactionMs = 250) => {
    const sim = new CertSim(C, seeded(seed));
    let wait = 0;
    for (let t = 0; t < C.durationMs; t += 50) {
      sim.update(50);
      wait -= 50;
      if (sim.busy || wait > 0) continue;
      const due = sim.certs
        .filter((c) => sim.visible(c) && (c.expired || c.days <= C.dueDays))
        .sort((a, b) => a.days - b.days)[0];
      if (due) {
        expect(sim.renew(due.id)).toBe('started');
        wait = reactionMs;
      }
    }
    return sim;
  };

  it('mit Plan schafft man es fast immer ohne Ablauf', () => {
    let clean = 0;
    for (let seed = 1; seed <= 200; seed++) if (playGreedy(seed).expiredCount === 0) clean++;
    expect(clean).toBeGreaterThanOrEqual(180);
  });

  it('menschliches Tempo (1–1,6 s je Entscheidung): nie mehrere zugleich abgelaufen', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = seeded(seed + 999);
      const sim = new CertSim(C, seeded(seed));
      let wait = 0;
      for (let t = 0; t < C.durationMs; t += 50) {
        sim.update(50);
        wait -= 50;
        if (sim.busy || wait > 0) continue;
        const due = sim.certs
          .filter((c) => sim.visible(c) && (c.expired || c.days <= C.dueDays))
          .sort((a, b) => a.days - b.days)[0];
        if (due) {
          sim.renew(due.id);
          wait = 1_000 + r() * 600;
        }
      }
      expect(sim.expiredCount).toBeLessThanOrEqual(1);
    }
  });

  it('zu träge (2 s je Entscheidung): meist laufen welche ab', () => {
    let perfect = 0;
    for (let seed = 1; seed <= 200; seed++) if (playGreedy(seed, 2_000).expiredCount === 0) perfect++;
    expect(perfect).toBeLessThan(100);
  });

  it('nichts tun: mehrere laufen ab, nicht gelöst', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const sim = new CertSim(C, seeded(seed));
      for (let t = 0; t < C.durationMs; t += 50) sim.update(50);
      expect(isSolved(sim.score())).toBe(false);
    }
  });

  it('certbot: vor 30 Tagen „not yet due“, nur einer gleichzeitig, danach 90 Tage', () => {
    const sim = new CertSim(C, seeded(4));
    const fresh = sim.certs.find((c) => sim.visible(c) && c.days > C.dueDays)!;
    expect(sim.renew(fresh.id)).toBe('notdue');
    expect(sim.busy).toBe(true);
    sim.update(C.notDueMs);
    expect(sim.busy).toBe(false);
    fresh.days = 10;
    expect(sim.renew(fresh.id)).toBe('started');
    const other = sim.certs.find((c) => c.id !== fresh.id && sim.visible(c))!;
    other.days = 5;
    expect(sim.renew(other.id)).toBe('busy');
    sim.update(C.renewMs);
    expect(fresh.days).toBe(C.maxDays);
    expect(sim.drain().renewed).toEqual([fresh.id]);
  });

  it('Tempo: gewürfelte Werte bleiben oft erhalten (Abwechslung), nicht nur die Extreme', () => {
    const { lifetimeMinMs: lo, lifetimeMaxMs: hi, maxDays } = C;
    let extreme = 0;
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const c of new CertSim(C, seeded(seed)).certs) {
        total++;
        const life = maxDays / c.rate;
        if (Math.abs(life - lo) < 1 || Math.abs(life - hi) < 1) extreme++;
      }
    }
    expect(extreme / total).toBeLessThan(0.3);
  });

  it('neue Domains tauchen erst später auf und lassen sich vorher nicht anfassen', () => {
    const sim = new CertSim(C, seeded(8));
    const late = sim.certs.filter((c) => c.surprise);
    expect(late).toHaveLength(C.arrivals.length);
    for (const c of late) {
      expect(sim.visible(c)).toBe(false);
      expect(sim.renew(c.id)).toBe('hidden');
    }
    sim.update(C.arrivals[C.arrivals.length - 1]!);
    for (const c of late) expect(sim.visible(c)).toBe(true);
  });

  it('abgelaufen zählt einmal, Erneuern holt es zurück', () => {
    const sim = new CertSim(C, seeded(2));
    const c = sim.certs[0]!;
    c.days = 0.001;
    sim.update(10);
    expect(c.expired).toBe(true);
    expect(sim.expiredCount).toBe(1);
    expect(sim.renew(c.id)).toBe('started');
    sim.update(C.renewMs);
    expect(c.expired).toBe(false);
    expect(sim.expiredCount).toBe(1);
  });
});

describe('USV', () => {
  const U = INCIDENTS.games.ups;

  /** Spieler mit Plan: immer einen Server halten, den keiner mehr braucht; dazwischen Reaktionszeit */
  const playOrdered = (seed: number, react: number, jitter = 0) => {
    const sim = new UpsSim(U, seeded(seed));
    const r = seeded(seed + 77);
    let wait = react;
    for (let t = 0; t < U.durationMs && !sim.done && !sim.dead; t += 50) {
      sim.update(50);
      if (sim.holding) continue;
      wait -= 50;
      if (wait > 0) continue;
      const free = sim.servers.find((s) => s.state === 'on' && sim.users(s.id).length === 0);
      if (free) {
        expect(sim.startHold(free.id)).toBe(true);
        wait = react + r() * jitter;
      }
    }
    return sim;
  };

  it('aufbau: Anwendungen, Datenbank, Anmeldung, Speicher; Abhängigkeiten zeigen auf vorhandene Server', () => {
    const sim = new UpsSim(U, seeded(3));
    expect(sim.servers).toHaveLength(U.front + 3);
    for (const s of sim.servers) for (const n of s.needs) expect(sim.servers[n]).toBeDefined();
    expect(sim.servers.map((s) => s.name)).toEqual(expect.arrayContaining(['db01', 'ldap01', 'nas01']));
  });

  it('richtige Reihenfolge, menschliches Tempo (1–1,6 s): alles sauber aus, volle Punktzahl', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const sim = playOrdered(seed, 1_000, 600);
      expect(sim.dead).toBe(false);
      expect(sim.done).toBe(true);
      expect(sim.score()).toBe(1);
    }
  });

  it('viel zu langsam (3 s je Server): Akku leer, nicht gelöst', () => {
    let fails = 0;
    for (let seed = 1; seed <= 100; seed++) if (!isSolved(playOrdered(seed, 3_000).score())) fails++;
    expect(fails).toBeGreaterThan(80);
  });

  it('loslassen vor Ende: Server läuft weiter', () => {
    const sim = new UpsSim(U, seeded(5));
    const free = sim.servers.find((s) => sim.users(s.id).length === 0)!;
    sim.startHold(free.id);
    sim.update(U.holdMs / 2);
    expect(sim.holdProgress(free.id)).toBeCloseTo(0.5, 1);
    sim.cancelHold();
    expect(free.state).toBe('on');
    sim.update(U.holdMs);
    expect(free.state).toBe('on');
  });

  it('falsche Reihenfolge: Speicher zuerst reißt alle mit, die ihn (auch indirekt) brauchen', () => {
    const sim = new UpsSim(U, seeded(9));
    const nas = sim.servers.find((s) => s.name === 'nas01')!;
    const db = sim.servers.find((s) => s.name === 'db01')!;
    sim.startHold(nas.id);
    sim.update(U.holdMs);
    expect(nas.state).toBe('off');
    expect(db.state).toBe('crashed');
    // alle, die db01 brauchten, sind auch abgestürzt
    for (const s of sim.servers) if (s.needs.includes(db.id)) expect(s.state).toBe('crashed');
    const { crashed } = sim.drain();
    expect(crashed.length).toBe(sim.wrong);
    expect(sim.wrong).toBeGreaterThan(0);
    expect(sim.score()).toBeLessThan(1);
  });

  it('Speicher zuerst: jeder Absturz zählt genau einmal (auch wer zwei Abhängigkeiten verliert)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const sim = new UpsSim(U, seeded(seed));
      const nas = sim.servers.find((s) => s.name === 'nas01')!;
      sim.startHold(nas.id);
      sim.update(U.holdMs);
      const { crashed } = sim.drain();
      const ids = crashed.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(sim.wrong).toBe(sim.servers.filter((s) => s.state === 'crashed').length);
    }
  });

  it('weniger laufende Server: weniger Last, längere Restlaufzeit', () => {
    const sim = new UpsSim(U, seeded(4));
    const before = sim.runtimeMs;
    const free = sim.servers.find((s) => sim.users(s.id).length === 0)!;
    sim.startHold(free.id);
    sim.update(U.holdMs);
    expect(sim.load).toBeLessThan(1);
    expect(sim.runtimeMs).toBeGreaterThan(before - U.holdMs);
  });

  it('nichts tun: Akku leer, alles hart aus, nicht gelöst', () => {
    const sim = new UpsSim(U, seeded(1));
    for (let t = 0; t < U.durationMs; t += 100) sim.update(100);
    expect(sim.dead).toBe(true);
    expect(sim.servers.every((s) => s.state === 'crashed')).toBe(true);
    expect(isSolved(sim.score())).toBe(false);
  });
});

describe('Serverraum-Klima', () => {
  const K = INCIDENTS.games.cooling;
  const mid = (K.minC + K.maxC) / 2;

  /** Spieler schaut alle react ms auf den Pfeil der kritischsten Zone und stellt ihren Regler (10er-Schritte, leicht ungenau) */
  const play = (seed: number, react: number) => {
    const sim = new CoolingSim(K, seeded(seed));
    const r = seeded(seed + 5);
    let wait = react;
    for (let t = 0; t < K.durationMs; t += 50) {
      sim.update(50);
      wait -= 50;
      if (wait > 0) continue;
      const z = [...sim.zones].sort((a, b) => Math.abs(sim.target(b) - mid) - Math.abs(sim.target(a) - mid))[0]!;
      if (Math.abs(sim.target(z) - mid) > 2.5) sim.setPower(sim.zones.indexOf(z), Math.round(((z.heat + (r() - 0.5) * 0.1) / K.coolMax) * 10) / 10);
      wait = react + r() * 400;
    }
    return sim;
  };

  it('aufmerksam (alle 1–1,4 s ein Blick): immer ein Erfolg, oft mit Bestnote', () => {
    let win = 0;
    let top = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = play(seed, 1_000).score();
      if (s >= 0.8) win++;
      if (s >= 0.95) top++;
    }
    expect(win).toBe(200);
    expect(top).toBeGreaterThanOrEqual(120);
  });

  it('langsam (alle 2,2–2,6 s): gelöst, aber kein sicherer Erfolg', () => {
    let solved = 0;
    let win = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = play(seed, 2_200).score();
      if (isSolved(s)) solved++;
      if (s >= 0.8) win++;
    }
    expect(solved).toBeGreaterThanOrEqual(190);
    expect(win).toBeLessThan(150);
  });

  it('nichts tun: (fast) nie gelöst', () => {
    let solved = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const sim = new CoolingSim(K, seeded(seed));
      for (let t = 0; t < K.durationMs; t += 100) sim.update(100);
      if (isSolved(sim.score())) solved++;
    }
    expect(solved).toBeLessThan(15);
  });

  it('Start: jede Zone zielt aus dem grünen Bereich, muss also einmal angefasst werden', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sim = new CoolingSim(K, seeded(seed));
      for (const z of sim.zones) expect(sim.target(z) < K.minC || sim.target(z) > K.maxC).toBe(true);
    }
  });

  it('Regler stellt das Ziel ein: mehr Kühlung = kälter, Temperatur folgt und bleibt dort', () => {
    const sim = new CoolingSim(K, seeded(2));
    const z = sim.zones[0]!;
    sim.setPower(0, 0.2);
    const warm = sim.target(z);
    sim.setPower(0, 0.8);
    expect(sim.target(z)).toBeLessThan(warm);
    sim.setPower(0, 5);
    expect(z.power).toBe(1);
    sim.setPower(0, 0.9);
    const aim = sim.target(z);
    const before = Math.abs(z.temp - aim);
    // vor dem ersten Ereignis: Temperatur nähert sich dem Ziel, Trend zeigt dorthin
    expect(Math.sign(sim.trend(z))).toBe(Math.sign(aim - z.temp));
    sim.update(K.eventMinMs - 100);
    expect(Math.abs(z.temp - aim)).toBeLessThan(before * 0.6);
  });

  it('Ereignisse kommen regelmäßig und nennen das Rack', () => {
    const sim = new CoolingSim(K, seeded(6));
    sim.update(K.durationMs);
    const evs = sim.drain();
    expect(evs.length).toBeGreaterThanOrEqual(Math.floor(K.durationMs / K.eventMaxMs));
    for (const e of evs) {
      expect(e.text).not.toContain('{rack}');
      if (e.zone >= 0) expect(e.text).toContain(sim.zones[e.zone]!.name);
    }
  });
});

describe('Rack', () => {
  const R = INCIDENTS.games.rack;

  /** Löser: probiert alle Reihenfolgen und Lücken (Gerät sitzt unten in der Lücke) */
  const solve = (sim: RackSim): boolean => {
    const open = sim.parcels.filter((p) => p.at === null);
    if (open.length === 0) return true;
    const p = open[0]!;
    for (const r of sim.runs()) {
      const w = sim.wrong;
      if (sim.place(p.id, r.bottom) === 'ok') {
        if (solve(sim)) return true;
        sim.unplace(p.id);
      }
      sim.wrong = w;
    }
    return false;
  };

  it('jedes Rack ist lösbar, Platz reicht genau oder knapp, schweres Gerät dabei', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const sim = new RackSim(R, seeded(seed));
      expect(sim.parcels).toHaveLength(R.deliveries);
      expect(sim.parcels.filter((p) => p.dev.heavy)).toHaveLength(1);
      const need = sim.parcels.reduce((s, p) => s + p.dev.he, 0);
      const free = sim.runs().reduce((s, r) => s + r.size, 0);
      expect(free).toBe(need);
      expect(solve(sim)).toBe(true);
    }
  });

  it('mindestens manchmal nimmt eine Lücke zwei Geräte auf (sonst wäre es kein Puzzle)', () => {
    let merged = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const sim = new RackSim(R, seeded(seed));
      if (sim.runs().length < sim.parcels.length) merged++;
    }
    expect(merged).toBeGreaterThan(100);
  });

  it('USV steht unten, nichts überlappt, alles im Schrank', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sim = new RackSim(R, seeded(seed));
      expect(sim.fixed[0]!.dev.name).toBe('usv01');
      expect(sim.fixed[0]!.bottom).toBe(0);
      const cells = Array<number>(R.heights).fill(0);
      for (const m of sim.fixed) for (let i = m.bottom; i < m.bottom + m.dev.he; i++) cells[i]!++;
      for (const r of sim.runs()) for (let i = r.bottom; i < r.bottom + r.size; i++) cells[i]!++;
      expect(cells.every((c) => c === 1)).toBe(true);
    }
  });

  it('Schweres über der Linie oder zu groß: abgelehnt, aber kein Fehlgriff (leuchtet gar nicht erst)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sim = new RackSim(R, seeded(seed));
      const heavy = sim.parcels.find((p) => p.dev.heavy)!;
      const high = sim.runs().find((r) => r.size >= heavy.dev.he && r.bottom + heavy.dev.he > R.half);
      if (high) {
        expect(sim.fits(heavy.id, high)).toBe(false);
        expect(sim.place(heavy.id, high.bottom)).toBe('heavy');
        expect(sim.wrong).toBe(0);
        expect(heavy.at).toBeNull();
      }
      const small = sim.runs().find((r) => r.size < heavy.dev.he);
      if (small) {
        const w = sim.wrong;
        expect(sim.place(heavy.id, small.bottom)).toBe('nofit');
        expect(sim.wrong).toBe(w);
      }
    }
  });

  it('Retoure: nur das Gerät ohne Rackschienen; ins Rack will es nicht', () => {
    const sim = new RackSim(R, seeded(3));
    expect(sim.place('odd', sim.runs()[0]!.bottom)).toBe('odd');
    expect(sim.sendBack(0)).toBe(false);
    expect(sim.wrong).toBe(2);
    expect(sim.sendBack('odd')).toBe(true);
    expect(solve(sim)).toBe(true);
    expect(sim.done).toBe(true);
    expect(sim.score()).toBeLessThan(1);
  });

  it('ausbauen gibt die Lücke wieder frei', () => {
    const sim = new RackSim(R, seeded(4));
    const before = sim.runs().reduce((s, r) => s + r.size, 0);
    const p = sim.parcels.find((x) => !x.dev.heavy)!;
    const r = sim.runs().find((x) => x.size >= p.dev.he)!;
    expect(sim.place(p.id, r.bottom)).toBe('ok');
    sim.unplace(p.id);
    expect(sim.runs().reduce((s, x) => s + x.size, 0)).toBe(before);
  });
});

describe('Kabelsalat', () => {
  const U = INCIDENTS.games.untangle;

  /** Mensch mit Augenmaß: nimmt ein Gerät mit vielen Kreuzungen und probiert ein paar Stellen grob aus */
  const play = (sim: UntangleSim, tries: number, moves: number, rnd: () => number) => {
    for (let m = 0; m < moves && !sim.done; m++) {
      const cnt = new Map<number, number>();
      for (const x of sim.crossingPoints()) for (const ci of [x.i, x.j]) for (const n of [sim.cables[ci]!.a, sim.cables[ci]!.b]) cnt.set(n, (cnt.get(n) ?? 0) + 1);
      for (const x of sim.covered()) for (const n of [x.node, sim.cables[x.cable]!.a, sim.cables[x.cable]!.b]) cnt.set(n, (cnt.get(n) ?? 0) + 1);
      const cand = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
      const i = cand[Math.floor(rnd() * Math.min(2, cand.length))]![0];
      let best = { p: { x: sim.nodes[i]!.x, y: sim.nodes[i]!.y }, c: sim.crossings() };
      for (let t = 0; t < tries; t++) {
        sim.drag(i, { x: rnd() * SIZE, y: rnd() * SIZE });
        const c = sim.drop(i);
        if (c < best.c) best = { p: { x: sim.nodes[i]!.x, y: sim.nodes[i]!.y }, c };
      }
      sim.drag(i, best.p);
      sim.drop(i);
    }
  };

  it('Start: verknotet im erlaubten Bereich, alles hängt zusammen, jedes Gerät hat zwei Kabel', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const sim = new UntangleSim(U, seeded(seed));
      expect(sim.nodes).toHaveLength(U.devices);
      expect(new Set(sim.nodes.map((n) => n.dev.name)).size).toBe(U.devices);
      expect(sim.cables.length).toBeGreaterThanOrEqual(U.cables - 1);
      expect(sim.startCrossings).toBeGreaterThanOrEqual(U.startCrossMin);
      expect(sim.startCrossings).toBeLessThanOrEqual(U.startCrossMax);
      const deg = Array<number>(U.devices).fill(0);
      for (const c of sim.cables) {
        deg[c.a]!++;
        deg[c.b]!++;
      }
      expect(deg.every((d) => d >= 2 && d <= U.maxDegree)).toBe(true);
      // zusammenhängend
      const seen = new Set([0]);
      for (let k = 0; k < U.devices; k++) for (const c of sim.cables) if (seen.has(c.a) || seen.has(c.b)) seen.add(c.a).add(c.b);
      expect(seen.size).toBe(U.devices);
      // keine Geräte übereinander
      for (let a = 0; a < U.devices; a++) for (let b = a + 1; b < U.devices; b++) expect(sim.overlaps(sim.nodes[a]!, sim.nodes[b]!)).toBe(false);
    }
  });

  it('es gibt immer eine ordentliche Lage: dorthin geschoben ist alles entwirrt (volle Punktzahl)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const sim = new UntangleSim(U, seeded(seed));
      sim.solution.forEach((p, i) => sim.drag(i, p));
      sim.solution.forEach((_, i) => sim.drop(i));
      expect(sim.crossings()).toBe(0);
      expect(sim.done).toBe(true);
      expect(sim.score()).toBe(1);
    }
  });

  it('Runden sehen verschieden aus: andere Geräte', () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) new UntangleSim(U, seeded(seed)).nodes.forEach((n) => names.add(n.dev.name));
    expect(names.size).toBe(TANGLE_DEVICES.length);
  });

  it('Kabel, die sich nur am selben Gerät berühren, kreuzen sich nicht', () => {
    const o = { x: 50, y: 50 };
    expect(segmentsCross(o, { x: 0, y: 0 }, o, { x: 100, y: 0 })).toBe(false);
    expect(segmentsCross({ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 })).toBe(true);
  });

  it('Kabel unter einem fremden Gerät zählt wie eine Kreuzung (sieht sonst aus wie angeschlossen)', () => {
    expect(segmentHitsBox({ x: 0, y: 50 }, { x: 100, y: 50 }, { x: 50, y: 52 }, 10, 5)).toBe(true);
    expect(segmentHitsBox({ x: 0, y: 50 }, { x: 100, y: 50 }, { x: 50, y: 60 }, 10, 5)).toBe(false);
    expect(segmentHitsBox({ x: 0, y: 50 }, { x: 30, y: 50 }, { x: 50, y: 50 }, 10, 5)).toBe(false);
    const sim = new UntangleSim(U, seeded(5));
    sim.solution.forEach((p, i) => sim.drag(i, p));
    expect(sim.covered()).toHaveLength(0);
    // ein Gerät mitten auf ein fremdes Kabel legen
    const c = sim.cables[0]!;
    const k = sim.nodes.findIndex((_, i) => i !== c.a && i !== c.b);
    const a = sim.nodes[c.a]!;
    const b = sim.nodes[c.b]!;
    sim.drag(k, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    expect(sim.covered().some((x) => x.node === k && x.cable === 0)).toBe(true);
    expect(sim.crossings()).toBeGreaterThan(0);
  });

  it('auf ein anderes Gerät fallen gelassen: rutscht daneben', () => {
    const sim = new UntangleSim(U, seeded(9));
    sim.drag(0, sim.nodes[1]!);
    sim.drop(0);
    for (let b = 1; b < U.devices; b++) expect(sim.overlaps(sim.nodes[0]!, sim.nodes[b]!)).toBe(false);
  });

  it('Wertung zählt den besten Stand: nochmal verschlimmern kostet nichts', () => {
    const sim = new UntangleSim(U, seeded(11));
    sim.solution.forEach((p, i) => sim.drag(i, p));
    sim.solution.forEach((_, i) => sim.drop(i));
    const best = sim.score();
    sim.drag(0, { x: 0, y: 0 });
    sim.drop(0);
    expect(sim.score()).toBe(best);
  });

  it('fair mit menschlichem Tempo (≈1,4 s je Zug → 20 Züge): oft ganz entwirrt, immer über der Lösungsschwelle', () => {
    for (const tries of [4, 12]) {
      let solved = 0;
      const N = 200;
      for (let seed = 1; seed <= N; seed++) {
        const sim = new UntangleSim(U, seeded(seed));
        play(sim, tries, 20, seeded(seed + 999));
        if (sim.done) solved++;
        expect(isSolved(sim.score())).toBe(true);
      }
      // der Bot probiert blind; ein Mensch sieht die Struktur und schafft mehr
      expect(solved / N).toBeGreaterThan(0.5);
    }
  });

  it('Zeit läuft ab, während man das letzte Gerät noch hält: der gehaltene Stand zählt', () => {
    const sim = new UntangleSim(U, seeded(13));
    sim.solution.forEach((p, i) => sim.drag(i, p));
    expect(sim.crossings()).toBe(0);
    expect(sim.score()).toBe(1);
  });

  it('nie schon gelöst beim Start', () => {
    for (let seed = 1; seed <= 500; seed++) expect(new UntangleSim(U, seeded(seed)).startCrossings).toBeGreaterThan(0);
  });

  it('Nichtstun ist nicht gelöst', () => {
    expect(isSolved(new UntangleSim(U, seeded(1)).score())).toBe(false);
  });
});

describe('Bandsicherung', () => {
  const T = INCIDENTS.games.tapes;
  const today = new Date(2026, 10, 12); // Donnerstag

  /** Vorspielen abwarten */
  const watch = (sim: TapeSim) => {
    while (sim.phase === 'show') sim.update(50);
  };

  /** Spieler: schaut zu, legt dann im Tempo nach; `miss` = Fehlgriffe je Auftrag */
  const play = (seed: number, tempo: () => number, miss = 0) => {
    const sim = new TapeSim(T, seeded(seed), today);
    let budget = T.durationMs;
    let wait = 0;
    let misses = 0;
    let round = -1;
    let phase = sim.phase;
    const dt = 50;
    while (budget > 0 && !sim.done) {
      if (sim.round !== round) {
        round = sim.round;
        misses = miss;
      }
      // nach dem Vorspielen erst kurz besinnen
      if (sim.phase === 'recall' && phase !== 'recall') wait = tempo();
      phase = sim.phase;
      if (sim.phase === 'recall' && !sim.busy) {
        wait -= dt;
        if (wait <= 0) {
          wait = tempo();
          if (misses > 0) {
            misses--;
            const wrong = sim.tapes.find((t) => !t.done && t !== sim.next)!;
            sim.insert(wrong.slot);
            budget -= T.wrongPenaltyMs;
          } else sim.insert(sim.next!.slot);
        }
      }
      sim.update(dt);
      budget -= dt;
    }
    return sim;
  };

  it('Start: volles Magazin, eindeutige Strichcodes, Reihenfolge Voll → Mo → Di …', () => {
    for (let seed = 1; seed < 100; seed++) {
      const sim = new TapeSim(T, seeded(seed), today);
      expect(sim.tapes).toHaveLength(8);
      expect(new Set(sim.tapes.map((t) => t.barcode)).size).toBe(8);
      const need = sim.tapes.filter((t) => t.need >= 0).sort((a, b) => a.need - b.need);
      expect(need[0]!.kind).toBe('full');
      expect(need.slice(1).every((t) => t.kind === 'inc')).toBe(true);
      expect(need.length).toBeGreaterThanOrEqual(Math.max(...T.rounds));
      expect(sim.tapes.map((t) => t.slot)).toEqual([...Array(8).keys()]);
      // mehr als Voll + Mo–Fr gibt das Magazin nicht her
      expect(Math.max(...T.rounds)).toBeLessThanOrEqual(6);
    }
  });

  it('nur vergangene Woche: der Freitag im Magazin liegt vor heute', () => {
    for (let d = 0; d < 7; d++) {
      const day = new Date(2026, 10, 8 + d);
      const sun = weekStart(day);
      expect(sun.getDay()).toBe(0);
      expect(new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 5) < day).toBe(true);
    }
  });

  it('Vorspielen: jedes nötige Band leuchtet einmal, in Reihenfolge; solange gesperrt', () => {
    const sim = new TapeSim(T, seeded(3), today);
    expect(sim.insert(sim.tapes.find((t) => t.need === 0)!.slot)).toBe('locked');
    const seen: number[] = [];
    while (sim.phase === 'show') {
      sim.update(20);
      seen.push(...sim.drain().lit);
    }
    expect(seen.map((s) => sim.tapes[s]!.need)).toEqual([...Array(T.rounds[0]).keys()]);
    expect(sim.phase).toBe('recall');
  });

  it('richtiges Band: belegt das Laufwerk kurz, dann zurückgespielt; nächstes wird verlangt', () => {
    const sim = new TapeSim(T, seeded(5), today);
    watch(sim);
    const first = sim.next!;
    expect(first.kind).toBe('full');
    expect(sim.insert(first.slot)).toBe('ok');
    // während des Ladens: zweiter Tipp ist kein Fehlgriff
    expect(sim.insert(sim.tapes.find((t) => t.need === 1)!.slot)).toBe('busy');
    sim.update(T.loadMs + 1);
    expect(first.done).toBe(true);
    expect(sim.restored).toBe(1);
    expect(sim.next!.need).toBe(1);
    expect(sim.insert(first.slot)).toBe('used');
    expect(sim.wrong).toBe(0);
  });

  it('falsches Band: Fehlgriff, Auswurf, Etikett bekannt; kein zweites Vorspielen, gesucht bleibt dasselbe', () => {
    const sim = new TapeSim(T, seeded(8), today);
    watch(sim);
    sim.insert(sim.next!.slot);
    sim.update(T.loadMs + 1);
    const want = sim.next!;
    const other = sim.tapes.find((t) => t.need < 0)!;
    expect(sim.insert(other.slot)).toBe('wrong');
    expect(sim.wrong).toBe(1);
    sim.update(T.ejectMs + 1);
    expect(other.known).toBe(true);
    expect(sim.phase).toBe('recall');
    expect(sim.next).toBe(want);
    expect(sim.insert(want.slot)).toBe('ok');
  });

  it('nächster Auftrag: dieselbe Folge plus ein Band, alles wieder im Magazin, anderer Ordner', () => {
    const sim = new TapeSim(T, seeded(11), today);
    const job1 = sim.job.path;
    const order1 = sim.tapes.filter((t) => t.need >= 0 && t.need < T.rounds[0]!).sort((a, b) => a.need - b.need).map((t) => t.slot);
    watch(sim);
    for (let i = 0; i < T.rounds[0]!; i++) {
      sim.insert(sim.next!.slot);
      sim.update(T.loadMs + 1);
    }
    expect(sim.phase).toBe('pause');
    sim.update(T.pauseMs + 1);
    expect(sim.round).toBe(1);
    expect(sim.phase).toBe('show');
    expect(sim.job.path).not.toBe(job1);
    expect(sim.tapes.some((t) => t.done || t.known)).toBe(false);
    sim.drain();
    const seen: number[] = [];
    while (sim.phase === 'show') {
      sim.update(20);
      seen.push(...sim.drain().lit);
    }
    expect(seen).toHaveLength(T.rounds[1]!);
    expect(seen.slice(0, order1.length)).toEqual(order1);
  });

  it('fair mit menschlichem Tempo (1–1,6 s je Band): immer fertig, Bestnote', () => {
    for (let seed = 1; seed < 200; seed++) {
      const r = seeded(seed * 3);
      const sim = play(seed, () => 1_000 + r() * 600);
      expect(sim.done).toBe(true);
      expect(sim.score()).toBeGreaterThanOrEqual(0.95);
    }
  });

  it('langsam (1,6 s), aber fehlerfrei: noch fertig', () => {
    for (let seed = 1; seed < 100; seed++) expect(play(seed, () => 1_600).done).toBe(true);
  });

  it('ein Fehlgriff je Auftrag: nicht unbedingt fertig, aber gelöst', () => {
    for (let seed = 1; seed < 100; seed++) expect(isSolved(play(seed, () => 1_600, 1).score())).toBe(true);
  });

  it('Zeit läuft ab, während das richtige Band lädt: zählt mit', () => {
    const sim = new TapeSim(T, seeded(2), today);
    watch(sim);
    sim.insert(sim.next!.slot);
    expect(sim.score()).toBeCloseTo(1 / sim.total);
  });

  it('Nichtstun ist nicht gelöst', () => {
    const sim = new TapeSim(T, seeded(4), today);
    sim.update(T.durationMs);
    expect(isSolved(sim.score())).toBe(false);
  });
});

describe('Druckerstau', () => {
  const J = INCIDENTS.games.jam;

  /** einen Schritt so ausführen, wie das Display ihn verlangt */
  const act = (sim: JamSim, st: Step) => {
    if (st.k === 'open' || st.k === 'close') sim.toggle(st.area);
    else if (st.k === 'toner-out' || st.k === 'toner-in') sim.toner();
    else if (st.k === 'lever' || st.k === 'lever-in') sim.toggleLever();
    else if (st.k === 'pull') sim.pull(st.area, sim.jam(st.area)!.dir);
  };

  /** Spieler im Tempo, `tears` = so oft je Runde zuerst in die falsche Richtung gezogen */
  const play = (seed: number, tempo: () => number, tears = 0) => {
    const sim = new JamSim(J, seeded(seed));
    let budget = J.durationMs;
    let round = -1;
    let left = 0;
    let actions = 0;
    while (budget > 0 && !sim.done) {
      if (sim.phase === 'print') {
        sim.update(50);
        budget -= 50;
        continue;
      }
      if (sim.round !== round) {
        round = sim.round;
        left = tears;
      }
      budget -= tempo();
      if (budget <= 0) break;
      const st = sim.next();
      actions++;
      if (st.k === 'pull' && left > 0) {
        left--;
        const d = sim.jam(st.area)!.dir;
        sim.pull(st.area, ({ left: 'right', right: 'left', up: 'down', down: 'up' } as const)[d]);
        budget -= J.tearPenaltyMs;
        continue;
      }
      act(sim, st);
    }
    return { sim, used: J.durationMs - budget, actions };
  };

  it('Start: eine Staustelle, nie nur das Ausgabefach; Runden 1/2/3, Code passt dazu', () => {
    for (let seed = 1; seed < 300; seed++) {
      const sim = new JamSim(J, seeded(seed));
      expect(sim.jams).toHaveLength(J.rounds[0]!);
      expect(sim.jams[0]!.area).not.toBe('D');
      expect(sim.code).toMatch(/^13\.[A-D][1-9]$/);
      expect(sim.total).toBe(6);
    }
  });

  it('neue Runde nimmt zuerst Stellen, die vorher nicht dran waren', () => {
    for (let seed = 1; seed < 300; seed++) {
      const sim = new JamSim(J, seeded(seed));
      let prev = sim.jams.map((j) => j.area);
      for (let r = 1; r < 3; r++) {
        while (sim.phase === 'jam') act(sim, sim.next());
        while (sim.phase === 'print') sim.update(100);
        const now = sim.jams.map((j) => j.area);
        const overlap = now.filter((a) => prev.includes(a)).length;
        // nur so viele Wiederholungen, wie es bei vier Stellen sein müssen
        expect(overlap).toBe(Math.max(0, prev.length + now.length - AREAS.length));
        prev = now;
      }
    }
  });

  it('letzte Runde: alles raus, aber nicht zugemacht = nicht volle Punktzahl (aber gelöst)', () => {
    const sim = new JamSim(J, seeded(2));
    for (let r = 0; r < 2; r++) {
      while (sim.phase === 'jam') act(sim, sim.next());
      while (sim.phase === 'print') sim.update(100);
    }
    // alle Blätter raus, aber nichts zurückbauen oder schließen
    for (const j of [...sim.jams]) {
      if (j.area === 'A') {
        sim.toggle('A');
        sim.toner();
      } else if (j.area === 'B') {
        sim.toggle('B');
        sim.toggleLever();
      } else if (j.area === 'C') sim.toggle('C');
      expect(sim.pull(j.area, j.dir)).toBe('ok');
    }
    expect(sim.done).toBe(false);
    expect(sim.score()).toBeLessThan(1);
    expect(isSolved(sim.score())).toBe(true);
    while (!sim.done) act(sim, sim.next());
    expect(sim.score()).toBe(1);
  });

  it('Abwechslung: alle Bereiche und Richtungen kommen vor, innerhalb einer Runde verschiedene Bereiche', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 300; seed++) {
      const { sim } = play(seed, () => 500);
      expect(sim.done).toBe(true);
    }
    for (let seed = 1; seed < 300; seed++) {
      const sim = new JamSim(J, seeded(seed));
      for (let r = 0; r < 3; r++) {
        expect(new Set(sim.jams.map((j) => j.area)).size).toBe(sim.jams.length);
        for (const j of sim.jams) {
          expect(JAM_DIRS[j.area]).toContain(j.dir);
          seen.add(j.area + j.dir);
        }
        while (sim.phase === 'jam') act(sim, sim.next());
        while (sim.phase === 'print') sim.update(100);
      }
    }
    expect(seen.size).toBe(AREAS.reduce((n, a) => n + JAM_DIRS[a].length, 0));
  });

  it('Toner liegt vor dem Blatt in A, Klappe A geht ohne Toner nicht zu', () => {
    const sim = new JamSim(J, seeded(1));
    sim.jams = [{ area: 'A', dir: 'left', torn: false, cleared: false }];
    expect(sim.pull('A', 'left')).toBe('hidden');
    expect(sim.toner()).toBe('locked');
    sim.toggle('A');
    expect(sim.pull('A', 'left')).toBe('hidden');
    expect(sim.toner()).toBe('open');
    expect(sim.toggle('A')).toBe('toner');
    expect(sim.open.A).toBe(true);
    expect(sim.pull('A', 'left')).toBe('ok');
    expect(sim.wrong).toBe(0);
  });

  it('Fixiereinheit: fester Hebel hält das Blatt (ohne Riss); vor dem Schließen muss er wieder runter', () => {
    const sim = new JamSim(J, seeded(1));
    sim.jams = [{ area: 'B', dir: 'down', torn: false, cleared: false }];
    sim.toggle('B');
    expect(sim.reachable('B')).toBe(false);
    expect(sim.pull('B', 'down')).toBe('held');
    expect(sim.pull('B', 'up')).toBe('held');
    expect(sim.wrong).toBe(0);
    expect(sim.jam('B')!.torn).toBe(false);
    sim.toggleLever();
    expect(sim.pull('B', 'down')).toBe('ok');
    expect(sim.toggle('B')).toBe('lever');
    expect(sim.open.B).toBe(true);
    expect(sim.next()).toEqual({ k: 'lever-in' });
    sim.toggleLever();
    expect(sim.toggle('B')).toBe('closed');
  });

  it('Hinweis bleibt beim geöffneten Bereich, bis er wieder zu ist; erst dann der nächste', () => {
    const sim = new JamSim(J, seeded(1));
    sim.jams = [
      { area: 'A', dir: 'left', torn: false, cleared: false },
      { area: 'B', dir: 'up', torn: false, cleared: false },
    ];
    expect(sim.next()).toEqual({ k: 'open', area: 'A' });
    sim.toggle('A');
    expect(sim.next()).toEqual({ k: 'toner-out' });
    sim.toner();
    expect(sim.next()).toEqual({ k: 'pull', area: 'A' });
    sim.pull('A', 'left');
    // nicht zu B springen: erst Toner rein und Klappe zu
    expect(sim.next()).toEqual({ k: 'toner-in' });
    sim.toner();
    expect(sim.next()).toEqual({ k: 'close', area: 'A' });
    sim.toggle('A');
    expect(sim.next()).toEqual({ k: 'open', area: 'B' });
    sim.toggle('B');
    expect(sim.next()).toEqual({ k: 'lever' });
    sim.toggleLever();
    sim.pull('B', 'up');
    expect(sim.next()).toEqual({ k: 'lever-in' });
    sim.toggleLever();
    expect(sim.next()).toEqual({ k: 'close', area: 'B' });
    sim.toggle('B');
    expect(sim.next()).toEqual({ k: 'print' });
  });

  it('mehrere offen: der zuletzt geöffnete kommt zuerst dran; leer geöffnet heißt wieder zu', () => {
    const sim = new JamSim(J, seeded(1));
    sim.jams = [{ area: 'C', dir: 'up', torn: false, cleared: false }];
    sim.toggle('C');
    sim.toggle('A');
    expect(sim.next()).toEqual({ k: 'close', area: 'A' });
    sim.toggle('A');
    expect(sim.next()).toEqual({ k: 'pull', area: 'C' });
  });

  it('gegen den Pfeil reißt es (Rest bleibt), seitlich passiert nichts', () => {
    const sim = new JamSim(J, seeded(1));
    sim.jams = [{ area: 'D', dir: 'left', torn: false, cleared: false }];
    expect(sim.pull('D', 'up')).toBe('sideways');
    expect(sim.wrong).toBe(0);
    expect(sim.pull('D', 'right')).toBe('torn');
    expect(sim.wrong).toBe(1);
    expect(sim.jam('D')).toBeDefined();
    expect(sim.pull('D', 'left')).toBe('ok');
    expect(sim.jam('D')).toBeUndefined();
  });

  it('weiter geht es erst, wenn alles frei, drin und zu ist; dann Druckpause und neuer Stau', () => {
    const sim = new JamSim(J, seeded(4));
    while (sim.jams.some((j) => !j.cleared)) act(sim, sim.next());
    expect(sim.phase).toBe('jam');
    while (sim.phase === 'jam') act(sim, sim.next());
    expect(sim.phase).toBe('print');
    expect(sim.drain().roundDone).toBe(true);
    expect(sim.toggle('A')).toBe('locked');
    sim.update(J.printMs);
    expect(sim.drain().printed).toBe(true);
    expect(sim.round).toBe(1);
    expect(sim.jams).toHaveLength(J.rounds[1]!);
  });

  it('alles richtig: volle Punktzahl, fertig nach der letzten Runde', () => {
    const { sim } = play(9, () => 600);
    expect(sim.done).toBe(true);
    expect(sim.score()).toBe(1);
  });

  it('menschliches Tempo (1–1,6 s je Handgriff) schafft es immer; mit einem Riss je Runde meistens', () => {
    let slowMax = 0;
    let tornSolved = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const r = seeded(seed * 3);
      const tempo = () => 1_000 + r() * 600;
      const clean = play(seed, tempo);
      expect(clean.sim.done).toBe(true);
      slowMax = Math.max(slowMax, play(seed, () => 1_600).used);
      if (isSolved(play(seed, tempo, 1).sim.score())) tornSolved++;
    }
    // langsamster sauberer Lauf passt in die Zeit, mit Luft
    expect(slowMax).toBeLessThan(J.durationMs);
    expect(tornSolved / N).toBeGreaterThan(0.9);
  });
});

describe('Lastverteiler', () => {
  const LB = INCIDENTS.games.lb;
  /** Bot mit menschlichem Tempo: sieht, was zu tun ist, handelt nach `react` ms, danach 0,4 s für den nächsten Griff */
  const play = (seed: number, react: number, mode: 'idle' | 'red' | 'all') => {
    const sim = new LbSim(LB, seeded(seed));
    const seen = new Map<number, number>();
    let busy = 0;
    for (let t = 0; t < LB.durationMs; t += 50) {
      sim.update(50);
      if (mode === 'idle') continue;
      busy -= 50;
      sim.servers.forEach((s, i) => {
        const want = s.inPool ? s.health === 'down' || (mode === 'all' && s.health === 'slow') : s.health === 'ok';
        if (!want) seen.delete(i);
        else if (!seen.has(i)) seen.set(i, sim.t);
      });
      if (busy > 0) continue;
      for (const [i, since] of seen) {
        if (sim.t - since >= react) {
          sim.toggle(i);
          seen.delete(i);
          busy = 400;
          break;
        }
      }
    }
    return sim;
  };

  it('Start: einer steht auf Wartung, alle gesund', () => {
    for (let seed = 1; seed < 50; seed++) {
      const sim = new LbSim(LB, seeded(seed));
      expect(sim.servers.filter((s) => !s.inPool)).toHaveLength(1);
      expect(sim.servers.every((s) => s.health === 'ok')).toBe(true);
    }
  });

  it('Round Robin: abgestürzt = 502, Warteschlange voll = 503, niemand im Pool = 503', () => {
    const sim = new LbSim(LB, () => 0);
    sim.servers.forEach((s) => (s.inPool = true));
    sim.servers[0]!.health = 'down';
    sim.servers[1]!.queue = LB.queueMax;
    sim.update(1_000);
    const r = sim.drainRouted();
    expect(r.filter((x) => x.server === 0).every((x) => x.code === 502)).toBe(true);
    expect(r.filter((x) => x.server === 1).some((x) => x.code === 503)).toBe(true);
    expect(r.filter((x) => x.server >= 2).every((x) => x.code === 200)).toBe(true);
    sim.servers.forEach((_, i) => sim.toggle(i));
    sim.update(500);
    expect(sim.drainRouted().every((x) => x.server === -1 && x.code === 503)).toBe(true);
  });

  it('erholt sich nur draußen, ist solange gesperrt, danach muss er von Hand wieder rein', () => {
    const sim = new LbSim(LB, () => 0);
    const s = sim.servers[2]!;
    s.inPool = true;
    s.health = 'down';
    s.healLeft = LB.rebootMs;
    sim.update(LB.rebootMs + 100);
    expect(s.health).toBe('down');
    expect(sim.toggle(2)).toBe(true);
    // draußen gesperrt, bis er fertig ist: zurückholen geht nicht
    sim.update(LB.rebootMs / 2);
    expect(sim.locked(2)).toBe(true);
    expect(sim.toggle(2)).toBe(false);
    expect(s.inPool).toBe(false);
    sim.update(LB.rebootMs / 2 + 100);
    expect(sim.locked(2)).toBe(false);
    expect(sim.toggle(2)).toBe(true);
    expect(s.inPool).toBe(true);
    expect(s.health).toBe('ok');
    expect(sim.drainEvents().some((e) => e.kind === 'healed' && e.server === 2)).toBe(true);
  });

  it('nie zwei kranke Server gleichzeitig, auch wenn niemand eingreift', () => {
    for (let seed = 1; seed < 200; seed++) {
      const sim = new LbSim(LB, seeded(seed));
      for (let t = 0; t < LB.durationMs; t += 50) {
        sim.update(50);
        expect(sim.servers.filter((s) => s.health !== 'ok').length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('jede Runde kommen alle drei Störungsarten vor, Texte nie zweimal hintereinander', () => {
    for (let seed = 1; seed < 200; seed++) {
      const sim = new LbSim(LB, seeded(seed));
      const kinds = new Set<string>();
      let last = '';
      for (let t = 0; t < LB.durationMs; t += 50) {
        sim.update(50);
        for (const e of sim.drainEvents()) {
          if (e.kind === 'healed') continue;
          kinds.add(e.kind);
          expect(e.text).not.toBe(last);
          last = e.text;
        }
        // perfekt spielen, damit Störungen kommen können
        sim.servers.forEach((s, i) => {
          if (s.inPool === (s.health !== 'ok')) sim.toggle(i);
        });
      }
      expect(kinds.size, `seed ${seed}`).toBe(3);
    }
  });

  it('Fairness: menschliches Tempo (1–1,6 s) schafft es immer gut, Nichtstun nie, nur Rote rausnehmen deutlich schlechter', () => {
    let red = 0;
    for (let seed = 1; seed <= 300; seed++) {
      expect(play(seed, 0, 'idle').score()).toBe(0);
      expect(play(seed, 1_600, 'all').score(), `seed ${seed}`).toBeGreaterThan(0.7);
      expect(play(seed, 1_000, 'all').score(), `seed ${seed}`).toBeGreaterThan(0.8);
      red += play(seed, 1_300, 'red').score() / 300;
    }
    // wer Gelb ignoriert, kommt meist noch durch, aber deutlich schlechter
    expect(red).toBeLessThan(0.65);
  });

  it('Texte: Platzhalter da, keine Doppelten', () => {
    for (const t of [...LB_EVENTS.crash, ...LB_EVENTS.slow, LB_EVENTS.healed]) expect(t).toContain('{srv}');
    const all = [...LB_EVENTS.crash, ...LB_EVENTS.slow, ...LB_EVENTS.spike];
    expect(new Set(all).size).toBe(all.length);
  });
});
