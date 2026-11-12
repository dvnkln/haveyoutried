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
