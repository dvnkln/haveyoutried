import { INCIDENTS } from '../../config';
import { h, juice, SHAKE } from '../dom';
import type { GameApi, Minigame } from './types';

type DiskState = 'ok' | 'failed' | 'rebuild';
const CFG = INCIDENTS.games.raid;

/** Spiellogik ohne DOM. */
export class RaidSim {
  disks: DiskState[];
  private failedAt: number[];
  private rebuildLeft: number[];
  t = 0;
  dead = false;
  deadAt = 0;
  replaced = 0;
  private reactionSum = 0;
  private nextFail = 600;

  constructor(
    private cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    this.disks = Array<DiskState>(cfg.disks).fill('ok');
    this.failedAt = Array<number>(cfg.disks).fill(0);
    this.rebuildLeft = Array<number>(cfg.disks).fill(0);
  }

  get failedCount(): number {
    return this.disks.filter((d) => d === 'failed').length;
  }

  private interval(): number {
    const p = Math.min(1, this.t / this.cfg.durationMs);
    return this.cfg.failEveryStartMs + (this.cfg.failEveryEndMs - this.cfg.failEveryStartMs) * p;
  }

  update(dt: number): void {
    if (this.dead) return;
    this.t += dt;
    this.disks.forEach((d, i) => {
      if (d !== 'rebuild') return;
      this.rebuildLeft[i]! -= dt;
      if (this.rebuildLeft[i]! <= 0) this.disks[i] = 'ok';
    });
    while (this.t >= this.nextFail) {
      const ok = this.disks.map((d, i) => (d === 'ok' ? i : -1)).filter((i) => i >= 0);
      if (ok.length > 0) {
        const i = ok[Math.floor(this.rnd() * ok.length)]!;
        this.disks[i] = 'failed';
        this.failedAt[i] = this.t;
      }
      this.nextFail += this.interval() * (0.7 + this.rnd() * 0.6);
    }
    if (this.failedCount >= this.cfg.maxFailed) {
      this.dead = true;
      this.deadAt = this.t;
    }
  }

  /** Platte tauschen; true, wenn sie defekt war */
  replace(i: number): boolean {
    if (this.dead || this.disks[i] !== 'failed') return false;
    this.disks[i] = 'rebuild';
    this.rebuildLeft[i] = this.cfg.rebuildMs;
    this.replaced++;
    this.reactionSum += this.t - this.failedAt[i]!;
    return true;
  }

  /** wie /proc/mdstat: U = ok, _ = fehlt/rebuild */
  mdstat(): string {
    return this.disks.map((d) => (d === 'ok' ? 'U' : '_')).join('');
  }

  score(): number {
    if (this.dead) return Math.min(0.7, (this.deadAt / this.cfg.durationMs) * 0.7);
    const avg = this.replaced > 0 ? this.reactionSum / this.replaced : 0;
    const quality = Math.max(0, Math.min(1, 1 - (avg - 300) / 2_000));
    return 0.7 + 0.3 * quality;
  }
}

export function raidGame(): Minigame {
  const sim = new RaidSim();
  let buttons: HTMLButtonElement[] = [];
  let api: GameApi | null = null;
  let lastFailed = 0;

  return {
    mount(root, gameApi) {
      api = gameApi;
      buttons = sim.disks.map((_, i) => {
        const name = `sd${String.fromCharCode(97 + i)}`;
        const b = h('button', { class: 'disk', type: 'button', 'aria-label': `Platte ${name}`, 'data-state': 'ok' }, [
          h('span', { class: 'disk-led' }),
          h('span', { class: 'disk-name', text: name }),
          h('span', { class: 'disk-slot' }),
        ]);
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (sim.replace(i)) {
            gameApi.sfx.tap();
            gameApi.haptic('tap');
          } else {
            juice(b, SHAKE, 200);
          }
        });
        b.addEventListener('pointerup', () => gameApi.sfx.release());
        return b;
      });
      root.append(h('div', { class: 'rack' }, buttons));
    },
    update(dt) {
      sim.update(dt);
      sim.disks.forEach((d, i) => {
        const b = buttons[i];
        if (b && b.dataset.state !== d) b.dataset.state = d;
      });
      // neuer Ausfall: kurzer Warnton
      if (sim.failedCount > lastFailed) api?.sfx.error();
      lastFailed = sim.failedCount;
      if (sim.dead) api?.finish();
    },
    score: () => sim.score(),
    status: () => `md0 : active raid6 [${sim.disks.length}/${sim.disks.length - sim.failedCount}] [${sim.mdstat()}]`,
  };
}
