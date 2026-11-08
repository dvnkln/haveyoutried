import { describe, expect, it } from 'vitest';
import { INCIDENTS } from '../../src/config';
import { LOG_DECOYS, LOG_TARGETS, NET_DISTRACTORS, NET_SCENARIOS, PATCH_DEPARTMENTS } from '../../src/content/incidents';
import { isSolved, progressScore } from '../../src/core/incidents';
import { LogGrepSim } from '../../src/ui/incidents/loggrep';
import { NetworkSim } from '../../src/ui/incidents/network';
import { PatchSim, UPLINK } from '../../src/ui/incidents/patch';

const CFG = INCIDENTS.games.loggrep;

describe('Log-Grep', () => {
  it('jeder echte Fehler sofort erwischt = volle Punktzahl, vorzeitig fertig', () => {
    const sim = new LogGrepSim();
    for (let t = 0; t < CFG.durationMs && !sim.done; t += 50) {
      sim.update(50);
      const target = sim.lines.find((l) => l.target);
      if (target) expect(sim.tap(target.id)).toBe('hit');
    }
    expect(sim.found).toBe(CFG.rounds);
    expect(sim.score()).toBe(1);
  });

  it('nichts tun: Fehler scrollen raus und gelten als verpasst', () => {
    const sim = new LogGrepSim();
    for (let t = 0; t < CFG.durationMs; t += 50) sim.update(50);
    expect(sim.missed).toBeGreaterThan(0);
    expect(sim.found).toBe(0);
    expect(isSolved(sim.score())).toBe(false);
  });

  it('Störzeile antippen ist ein Fehlgriff, nie mehr als window Zeilen sichtbar', () => {
    const sim = new LogGrepSim();
    sim.update(5_000);
    expect(sim.lines.length).toBeLessThanOrEqual(CFG.window);
    const decoy = sim.lines.find((l) => !l.target)!;
    expect(sim.tap(decoy.id)).toBe('wrong');
    expect(sim.wrong).toBe(1);
  });

  /** Läuft, bis der echte Fehler sichtbar ist, nicht ganz unten steht und gerade nachgerückt wurde. */
  const justShiftedWithTarget = () => {
    const sim = new LogGrepSim();
    let top = sim.lines[0]?.id;
    for (let t = 0; t < 60_000; t += 10) {
      sim.update(10);
      const shifted = sim.lines[0]?.id !== top;
      top = sim.lines[0]?.id;
      const ti = sim.lines.findIndex((l) => l.target);
      if (shifted && ti >= 0 && ti < sim.lines.length - 1) return { sim, ti };
    }
    throw new Error('kein passender Moment gefunden');
  };

  it('Nachsicht: kurz nach dem Nachrücken zählt die Zeile unter dem Fehler', () => {
    const { sim, ti } = justShiftedWithTarget();
    expect(sim.tap(sim.lines[ti + 1]!.id)).toBe('hit');
    expect(sim.found).toBe(1);
    expect(sim.wrong).toBe(0);
  });

  it('ohne frisches Nachrücken ist die Zeile darunter ein Fehlgriff', () => {
    const { sim, ti } = justShiftedWithTarget();
    sim.update(CFG.shiftGraceMs + 20); // kürzer als ein Zeilenabstand: kein neues Nachrücken
    const target = sim.lines.findIndex((l) => l.target);
    expect(target).toBe(ti);
    expect(sim.tap(sim.lines[ti + 1]!.id)).toBe('wrong');
  });

    it('echte Fehler und Störer sind klar unterscheidbar (FATAL/CRIT nur bei echten)', () => {
    for (const t of LOG_TARGETS) expect(t).toMatch(/^(FATAL|CRIT)/);
    for (const d of LOG_DECOYS) expect(d).not.toMatch(/^(FATAL|CRIT)/);
  });
});

describe('Netzwerkausfall', () => {
  it('richtige Reihenfolge löst es ohne Abzug', () => {
    for (let i = 0; i < 10; i++) {
      const sim = new NetworkSim();
      for (const s of sim.scenario.steps) expect(sim.tap(s.id)).toBe('ok');
      expect(sim.done).toBe(true);
      expect(sim.score()).toBe(1);
    }
  });

  it('zu früh und nutzlose Schritte kosten', () => {
    const sim = new NetworkSim(() => 0.99); // DNS-Szenario (letztes)
    expect(sim.scenario.id).toBe('dns');
    expect(sim.tap('dnsfix')).toBe('early');
    expect(sim.tap('yell')).toBe('useless');
    expect(sim.tap('cable')).toBe('ok');
    expect(sim.tap('cable')).toBe('repeat');
    expect(sim.wrong).toBe(2);
  });

  it('Einstieg passt zur Ursache, jedes Szenario hat einen Befund', () => {
    for (const sc of NET_SCENARIOS) {
      expect(sc.steps.some((st) => st.finding)).toBe(true);
      if (sc.id === 'dns') {
        expect(sc.intro[1]).toMatch(/name resolution/);
        expect(sc.steps.find((st) => st.id === 'gw')!.finding).toBeFalsy();
      } else {
        expect(sc.intro[1]).toMatch(/unreachable/);
      }
    }
  });

  it('Szenarien beginnen bei Layer 1, IDs eindeutig, keine Überschneidung mit Ablenkungen', () => {
    const distractors = new Set(NET_DISTRACTORS.map((d) => d.id));
    for (const sc of NET_SCENARIOS) {
      expect(sc.steps[0]!.id).toBe('cable');
      const ids = sc.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(distractors.has(id)).toBe(false);
    }
  });
});

describe('Patchkabel', () => {
  it('alle richtig verbunden = 1', () => {
    const sim = new PatchSim();
    expect(sim.right).toContain(UPLINK);
    expect(sim.right).toHaveLength(INCIDENTS.games.patch.cables + 1);
    for (const d of sim.left) expect(sim.connect(d, d)).toBe('ok');
    expect(sim.done).toBe(true);
    expect(sim.score()).toBe(1);
  });

  it('falsches VLAN, Uplink und Doppelbelegung', () => {
    const sim = new PatchSim();
    const [a, b] = sim.left as [string, string];
    expect(sim.connect(a, b)).toBe('wrong');
    expect(sim.connect(a, UPLINK)).toBe('uplink');
    expect(sim.connect(a, a)).toBe('ok');
    expect(sim.connect(a, a)).toBe('taken');
    expect(sim.wrong).toBe(2);
    expect(sim.uplinkHits).toBe(1);
  });

  it('belegter Port meldet „taken“ und zählt nicht als Fehlgriff', () => {
    const sim = new PatchSim();
    const [a, b] = sim.left as [string, string];
    sim.connect(a, a);
    expect(sim.connect(b, a)).toBe('taken');
    expect(sim.wrong).toBe(0);
  });

  it('genug Abteilungen mit eindeutigen VLANs', () => {
    expect(PATCH_DEPARTMENTS.length).toBeGreaterThanOrEqual(INCIDENTS.games.patch.cables);
    expect(new Set(PATCH_DEPARTMENTS.map((d) => d.vlan)).size).toBe(PATCH_DEPARTMENTS.length);
  });
});

describe('Gemeinsame Wertung', () => {
  it('Fortschritt mal Fehlerabzug mit Untergrenze', () => {
    expect(progressScore(5, 5, 0)).toBe(1);
    expect(progressScore(5, 5, 2)).toBeCloseTo(0.8);
    expect(progressScore(5, 5, 50)).toBeCloseTo(INCIDENTS.scoring.floor);
    expect(progressScore(0, 0, 0)).toBe(0);
  });
});
