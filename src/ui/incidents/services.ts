import { INCIDENTS } from '../../config';
import { NOISE_WARNINGS, ROOT_CAUSES, SERVICES, type ServiceDef } from '../../content/incidents';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.services;

const labelOf = (id: string) => SERVICES.find((x) => x.id === id)?.label ?? id;

export type ServiceState = 'ok' | 'warn' | 'crit';

/** Alle Dienste, die (direkt oder indirekt) an `root` hängen, inkl. root selbst. */
export function affectedBy(root: string, services: readonly ServiceDef[] = SERVICES): Set<string> {
  const down = new Set([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of services) {
      if (!down.has(s.id) && s.deps.some((d) => down.has(d))) {
        down.add(s.id);
        changed = true;
      }
    }
  }
  return down;
}

export type RestartResult = 'fixed' | 'symptom' | 'noise' | 'ok';

/** Spiellogik ohne DOM. */
export class ServicesSim {
  round = 0;
  solved = 0;
  wrong = 0;
  root = '';
  down = new Set<string>();
  noise = new Map<string, string>();

  constructor(
    private rounds: number = CFG.rounds,
    private rnd: () => number = Math.random,
  ) {
    this.newRound();
  }

  get done(): boolean {
    return this.solved >= this.rounds;
  }

  private newRound(): void {
    const pool = ROOT_CAUSES.filter((r) => r.id !== this.root);
    const total = pool.reduce((a, r) => a + r.weight, 0);
    let x = this.rnd() * total;
    this.root = (pool.find((r) => (x -= r.weight) < 0) ?? pool[0]!).id;
    this.down = affectedBy(this.root);
    // 1–2 Störer unter den gesunden Diensten
    this.noise.clear();
    const healthy = SERVICES.filter((s) => !this.down.has(s.id));
    const n = Math.min(healthy.length, 1 + Math.floor(this.rnd() * 2));
    for (let i = 0; i < n; i++) {
      const s = healthy.splice(Math.floor(this.rnd() * healthy.length), 1)[0];
      if (s) this.noise.set(s.id, NOISE_WARNINGS[Math.floor(this.rnd() * NOISE_WARNINGS.length)]!);
    }
  }

  state(id: string): ServiceState {
    if (this.down.has(id)) return 'crit';
    if (this.noise.has(id)) return 'warn';
    return 'ok';
  }

  message(s: ServiceDef): string {
    if (s.id === this.root) return s.rootMsg;
    if (this.down.has(s.id)) return s.symptomMsg;
    return this.noise.get(s.id) ?? 'OK';
  }

  restart(id: string): RestartResult {
    if (this.done) return 'ok';
    if (id === this.root) {
      this.solved++;
      this.round++;
      if (!this.done) this.newRound();
      else this.down.clear();
      return 'fixed';
    }
    if (this.down.has(id)) {
      this.wrong++;
      return 'symptom';
    }
    if (this.noise.has(id)) {
      this.wrong++;
      return 'noise';
    }
    return 'ok';
  }

  score(): number {
    return (this.solved / this.rounds) * Math.max(0.4, 1 - this.wrong * 0.1);
  }
}

export function servicesGame(): Minigame {
  const sim = new ServicesSim();
  let api: GameApi | null = null;
  const tiles = new Map<string, { el: HTMLButtonElement; state: HTMLElement; msg: HTMLElement }>();
  const info = h('div', { class: 'svc-info', 'aria-live': 'polite' });
  let locked = false;

  const paint = () => {
    for (const s of SERVICES) {
      const t = tiles.get(s.id);
      if (!t) continue;
      const st = sim.state(s.id);
      t.el.dataset.state = st;
      setText(t.state, st === 'crit' ? 'CRITICAL' : st === 'warn' ? 'WARNING' : 'OK');
      setText(t.msg, sim.message(s));
    }
  };

  const restart = (s: ServiceDef) => {
    if (locked || !api) return;
    const tile = tiles.get(s.id)!;
    const res = sim.restart(s.id);
    if (res === 'fixed') {
      api.sfx.good();
      api.haptic('buy');
      setText(info, `systemctl restart ${s.id} → OK. Alles hängt dran, alles kommt zurück.`);
      locked = true;
      for (const t of tiles.values()) t.el.dataset.state = 'ok';
      setTimeout(() => {
        locked = false;
        if (sim.done) api?.finish();
        else {
          paint();
          setText(info, `Runde ${sim.round + 1}: Wo liegt die Ursache?`);
        }
      }, 650);
    } else if (res === 'symptom' || res === 'noise') {
      api.sfx.error();
      api.haptic('error');
      api.penalize(CFG.wrongPenaltyMs);
      juice(tile.el, SHAKE, 260);
      setText(
        info,
        res === 'symptom'
          ? `systemctl restart ${s.id} → läuft kurz, dann wieder CRITICAL. Das ist nur ein Symptom.`
          : `systemctl restart ${s.id} → hilft nicht. Die Warnung hat damit nichts zu tun.`,
      );
    } else {
      api.sfx.tick();
      setText(info, `${s.label} läuft. Den neu zu starten bringt nichts.`);
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const grid = h('div', { class: 'svc-grid' });
      for (const s of SERVICES) {
        const state = h('span', { class: 'svc-state' });
        const msg = h('span', { class: 'svc-msg' });
        const el = h('button', { class: 'svc', type: 'button', 'data-svc': s.id }, [
          h('span', { class: 'svc-name', text: s.label }),
          state,
          msg,
          h('span', { class: 'svc-deps', text: `braucht: ${s.deps.map(labelOf).join(', ') || '–'}` }),
        ]);
        el.addEventListener('click', () => restart(s));
        tiles.set(s.id, { el, state, msg });
        grid.append(el);
      }
      setText(info, 'Runde 1: Wo liegt die Ursache?');
      paint();
      root.append(h('div', { class: 'services' }, [grid, info]));
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `Runde ${Math.min(sim.round + 1, CFG.rounds)}/${CFG.rounds} · Fehlgriffe: ${sim.wrong}`,
  };
}
