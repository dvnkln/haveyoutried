import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { DISK_GROWERS, DISK_JUNK, DISK_KEEP, type DiskKind } from '../../content/incidents';
import { pick, shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import { termBar } from './term';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.diskfull;

export interface DiskFile {
  id: number;
  name: string;
  path: string;
  desc: string;
  kind: DiskKind;
  gb: number;
  /** Größe beim Start: bestimmt die Fläche in der Belegungskarte (bleibt fest, nichts springt unter dem Finger) */
  area: number;
  keep: boolean;
  grows: boolean;
  nearMiss: string;
  /** nur beim wachsenden: Text nach dem Löschen */
  again: string;
  gone: boolean;
}

export type DiskResult = 'ok' | 'again' | 'keep' | 'gone';

type Cfg = typeof CFG;

/** Spiellogik ohne DOM. */
export class DiskSim {
  files: DiskFile[];
  capacity: number;
  t = 0;
  wrong = 0;
  dead = false;
  deadAt = 0;
  /** so viel muss am Ende frei sein (GB), je Runde anders */
  goal: number;
  private startFree: number;

  constructor(
    private cfg: Cfg = CFG,
    rnd: () => number = Math.random,
  ) {
    // jede Runde andere Größen: ganze GB, nie unter 3
    const size = (n: number) => Math.max(3, Math.round(n * (cfg.sizeMin + rnd() * (cfg.sizeMax - cfg.sizeMin))));
    const junk = shuffle(DISK_JUNK, rnd)
      .slice(0, cfg.junk)
      .map((e) => ({ ...e, gb: size(e.gb), keep: false, grows: false, nearMiss: '', again: '' }));
    const picked = [
      ...junk,
      ...shuffle(DISK_KEEP, rnd)
        .slice(0, cfg.keep)
        .map((e) => ({ ...e, gb: size(e.gb), keep: true, grows: false, nearMiss: e.nearMiss ?? '', again: '' })),
      { ...pick(DISK_GROWERS, rnd), gb: cfg.growStartGb, keep: false, grows: true, nearMiss: '' },
    ];
    const junkSum = junk.reduce((s, e) => s + e.gb, 0);
    const raw = Math.floor((cfg.startFreeGb + junkSum * cfg.goalShare) / 5) * 5;
    this.goal = Math.max(cfg.goalMinGb, Math.min(cfg.goalMaxGb, raw));
    this.files = shuffle(picked, rnd).map((e, id) => ({
      id,
      name: e.name,
      path: e.path,
      desc: e.desc,
      kind: e.kind,
      gb: e.gb,
      // Mindestfläche: kleine Dateien bleiben gut zu treffen; nohup.out startet klein, wächst aber
      area: Math.max(e.gb, e.grows ? 7 : 6),
      keep: e.keep,
      grows: e.grows,
      nearMiss: e.nearMiss,
      again: e.again,
      gone: false,
    }));
    this.startFree = cfg.startFreeGb;
    this.capacity = this.used + cfg.startFreeGb;
  }

  get used(): number {
    return this.files.reduce((s, f) => s + (f.gone ? 0 : f.gb), 0);
  }

  get free(): number {
    return Math.max(0, this.capacity - this.used);
  }

  get done(): boolean {
    return this.free >= this.goal;
  }

  /** Anteil am Ziel 0..1 (vom Startwert aus gerechnet: nichts tun gibt nichts) */
  get progress(): number {
    return Math.max(0, Math.min(1, (this.free - this.startFree) / (this.goal - this.startFree)));
  }

  update(dt: number): void {
    if (this.dead || this.done) return;
    this.t += dt;
    const grower = this.files.find((f) => f.grows);
    if (grower) grower.gb += (this.cfg.growGbPerSec * dt) / 1_000;
    if (this.capacity - this.used <= 0) {
      if (grower) grower.gb -= this.used - this.capacity;
      this.dead = true;
      this.deadAt = this.t;
    }
  }

  /** rm -rf: Wichtiges bleibt (Fehlgriff), nohup.out fängt neu an */
  remove(id: number): DiskResult {
    const f = this.files[id];
    if (!f || f.gone || this.dead) return 'gone';
    if (f.keep) {
      this.wrong++;
      return 'keep';
    }
    if (f.grows) {
      f.gb = 0;
      return 'again';
    }
    f.gone = true;
    return 'ok';
  }

  score(): number {
    // volle Platte ist nie ein Erfolg (wie das tote RAID)
    if (this.dead) return Math.min(1, this.deadAt / this.cfg.durationMs) * INCIDENTS.goodMin * 0.9;
    return progressScore(this.progress, 1, this.wrong);
  }
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Belegungskarte wie WinDirStat/Baobab: Squarified Treemap (Bruls et al.).
 * Größte Flächen zuerst, Zeilen so gefüllt, dass die Kacheln möglichst quadratisch bleiben.
 */
export function squarify(values: number[], width: number, height: number): Rect[] {
  const out: Rect[] = values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return out;
  const scale = (width * height) / total;
  const order = values.map((_, i) => i).sort((a, b) => values[b]! - values[a]!);
  let x = 0;
  let y = 0;
  let w = width;
  let hh = height;
  let row: number[] = [];

  const area = (i: number) => values[i]! * scale;
  const worst = (r: number[], side: number) => {
    if (r.length === 0) return Infinity;
    const s = r.reduce((acc, i) => acc + area(i), 0);
    const max = Math.max(...r.map(area));
    const min = Math.min(...r.map(area));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const place = () => {
    const s = row.reduce((acc, i) => acc + area(i), 0);
    if (w >= hh) {
      // Spalte links
      const cw = s / hh;
      let cy = y;
      for (const i of row) {
        const ih = area(i) / cw;
        out[i] = { x, y: cy, w: cw, h: ih };
        cy += ih;
      }
      x += cw;
      w -= cw;
    } else {
      // Zeile oben
      const rh = s / w;
      let cx = x;
      for (const i of row) {
        const iw = area(i) / rh;
        out[i] = { x: cx, y, w: iw, h: rh };
        cx += iw;
      }
      y += rh;
      hh -= rh;
    }
    row = [];
  };

  for (const i of order) {
    const side = Math.min(w, hh);
    if (row.length === 0 || worst([...row, i], side) <= worst(row, side)) {
      row.push(i);
    } else {
      place();
      row.push(i);
    }
  }
  if (row.length > 0) place();
  return out;
}

export const gb = (n: number): string => `${n.toFixed(1).replace('.', ',')} GB`;
/** abgerundet: die Anzeige behauptet nie mehr freien Platz, als das Spiel zählt */
const gbDown = (n: number): string => gb(Math.floor(n * 10) / 10);

/** Seitenverhältnis der Karte (Höhe/Breite), passt zum CSS aspect-ratio */
const MAP_W = 100;
export const MAP_H = 92;

export function diskFullGame(): Minigame {
  const sim = new DiskSim();
  let api: GameApi | null = null;
  let selected: number | null = null;
  let over = false;
  const tiles: HTMLButtonElement[] = [];
  const sizeEls: HTMLElement[] = [];
  const fill = h('span', { class: 'du-fill' });
  const gaugeText = h('span', { class: 'du-gauge-text' });
  const infoPath = h('div', { class: 'du-path' });
  // wie die markierte Zeile in der Dateiliste: Anteil als Balken, dann die Größe
  const pctFill = h('span', { class: 'du-pct-fill' });
  const pctText = h('span', { class: 'du-pct-text' });
  const pctRow = h('div', { class: 'du-pct', hidden: '' }, [h('span', { class: 'du-pct-bar' }, [pctFill]), pctText]);
  const infoDesc = h('div', { class: 'du-desc' });
  const rm = h('button', { class: 'btn btn-danger du-rm', type: 'button', text: 'rm -rf', disabled: '' });

  const select = (id: number | null) => {
    selected = id;
    tiles.forEach((t, i) => t.classList.toggle('selected', i === id));
    rm.disabled = id === null;
    infoDesc.classList.remove('warn', 'ok');
    if (id === null) return;
    const f = sim.files[id]!;
    setText(infoPath, f.path);
    showPct(f.gb);
    setText(infoDesc, f.desc);
  };

  const showPct = (size: number) => {
    const pct = (size / sim.capacity) * 100;
    pctRow.hidden = false;
    pctFill.style.width = `${Math.min(100, pct).toFixed(1)}%`;
    setText(pctText, `${pct.toFixed(1).replace('.', ',')} % · ${gb(size)}`);
  };

  const tell = (cls: 'warn' | 'ok', path: string, text: string) => {
    pctRow.hidden = true;
    setText(infoPath, path);
    setText(infoDesc, text);
    infoDesc.classList.remove('warn', 'ok');
    infoDesc.classList.add(cls);
  };

  const render = () => {
    const usedPct = Math.min(100, (sim.used / sim.capacity) * 100);
    fill.style.width = `${usedPct.toFixed(1)}%`;
    fill.dataset.level = usedPct >= 95 ? 'crit' : usedPct >= 85 ? 'warn' : 'ok';
    setText(gaugeText, `${Math.round(usedPct)} % belegt · ${gbDown(sim.free)} frei · Ziel: ${sim.goal} GB`);
    sim.files.forEach((f, i) => {
      if (f.grows) setText(sizeEls[i]!, gb(f.gb));
    });
    if (selected !== null && sim.files[selected]?.grows && !infoDesc.classList.contains('ok')) {
      showPct(sim.files[selected]!.gb);
    }
  };

  const doRemove = () => {
    if (!api || selected === null) return;
    const id = selected;
    const f = sim.files[id]!;
    const tile = tiles[id]!;
    const freed = f.gb;
    const res = sim.remove(id);
    if (res === 'keep') {
      api.sfx.error();
      api.haptic('error');
      api.penalize(CFG.wrongPenaltyMs);
      juice(tile, SHAKE, 260);
      tile.classList.remove('selected');
      selected = null;
      rm.disabled = true;
      tell('warn', `^C  rm -rf ${f.path}`, f.nearMiss);
      return;
    }
    if (res === 'gone') return;
    api.sfx.tap();
    setTimeout(() => api?.sfx.release(), 70);
    api.haptic('tap');
    if (res === 'ok') {
      tile.dataset.gone = '';
      tile.disabled = true;
      tile.setAttribute('aria-label', `frei, ${gb(freed)}`);
    }
    select(null);
    tell('ok', `rm -rf ${f.path}`, res === 'again' ? f.again : `${gb(freed)} frei geworden.`);
    render();
    if (sim.done) {
      api.sfx.good();
      api.finish();
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const rects = squarify(
        sim.files.map((f) => f.area),
        MAP_W,
        MAP_H,
      );
      const map = h('div', { class: 'du-map' });
      sim.files.forEach((f, i) => {
        const r = rects[i]!;
        const size = h('span', { class: 'du-size', text: gb(f.gb) });
        const tile = h(
          'button',
          {
            class: `du-tile k-${f.kind}${f.grows ? ' grows' : ''}`,
            type: 'button',
            'aria-label': `${f.name}, ${gb(f.gb)}`,
            style: `left:${r.x}%;top:${(r.y / MAP_H) * 100}%;width:${r.w}%;height:${(r.h / MAP_H) * 100}%`,
          },
          [h('span', { class: 'du-name', text: f.name.replace(/([_.-])/g, '$1\u200b') }), size],
        );
        tile.addEventListener('click', () => {
          if (sim.dead || f.gone) return;
          gameApi.sfx.tick();
          select(selected === i ? null : i);
        });
        tiles.push(tile);
        sizeEls.push(size);
        map.append(tile);
      });
      rm.addEventListener('click', doRemove);
      const goalPct = ((sim.capacity - sim.goal) / sim.capacity) * 100;
      const gauge = h('div', { class: 'du-gauge' }, [
        h('span', { class: 'du-drive', 'aria-hidden': 'true' }, [h('b', { text: '/dev/sda1' }), ' auf /, ext4']),
        h('span', { class: 'du-bar' }, [fill, h('span', { class: 'du-goal', style: `left:${goalPct.toFixed(1)}%`, title: 'Ziel' })]),
        gaugeText,
      ]);
      setText(infoPath, `fs01:/ · ${Math.round(sim.capacity)} GB`);
      setText(infoDesc, 'Feld antippen: zeigt, was es ist. Löschen erst mit rm -rf.');
      root.append(
        h('div', { class: 'du' }, [
          h('div', { class: 'du-win' }, [
            termBar('DirStatt – fs01:/'),
            h(
              'div',
              { class: 'du-menu', 'aria-hidden': 'true' },
              ['Datei', 'Bearbeiten', 'Aufräumen', 'Ansicht', 'Hilfe'].map((t) => h('span', { text: t })),
            ),
            gauge,
            map,
            h('div', { class: 'du-info' }, [h('div', { class: 'du-text' }, [infoPath, pctRow, infoDesc]), rm]),
          ]),
        ]),
      );
      render();
    },
    update(dt) {
      sim.update(dt);
      render();
      if (sim.dead && !over) {
        over = true;
        tell('warn', 'write error: No space left on device', 'Platte voll. Die Datenbank hat aufgehört zu schreiben.');
        api?.finish();
      }
    },
    score: () => sim.score(),
    status: () => `frei: ${Math.floor(sim.free)}/${sim.goal} GB · Fehlgriffe: ${sim.wrong}`,
  };
}
