import { INCIDENTS } from '../../config';
import { NET_DISTRACTORS, NET_SCENARIOS, type NetScenario } from '../../content/incidents';
import { pick, shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.network;

export type NetResult = 'ok' | 'early' | 'useless' | 'repeat';

/** Spiellogik ohne DOM. */
export class NetworkSim {
  scenario: NetScenario;
  progress = 0;
  wrong = 0;

  constructor(rnd: () => number = Math.random) {
    this.scenario = NET_SCENARIOS[Math.floor(rnd() * NET_SCENARIOS.length)]!;
  }

  get total(): number {
    return this.scenario.steps.length;
  }

  get done(): boolean {
    return this.progress >= this.total;
  }

  /** Schritt ausführen: richtig ist nur der nächste in der Reihenfolge */
  tap(id: string): NetResult {
    if (this.done) return 'repeat';
    const idx = this.scenario.steps.findIndex((s) => s.id === id);
    if (idx >= 0 && idx < this.progress) return 'repeat';
    if (idx === this.progress) {
      this.progress++;
      return 'ok';
    }
    this.wrong++;
    return idx > this.progress ? 'early' : 'useless';
  }

  score(): number {
    return (this.progress / this.total) * Math.max(0.4, 1 - this.wrong * 0.1);
  }
}

const EARLY_REPLIES = [
  'Zu früh. Erst die Grundlagen, Kollege.',
  'Layer 7 zuerst? Mutig. Falsch, aber mutig.',
  'Das prüfst du, wenn darunter alles läuft.',
];

export function networkGame(): Minigame {
  const sim = new NetworkSim();
  let api: GameApi | null = null;
  const term = h('div', { class: 'net-term', 'aria-live': 'polite' });
  const reply = h('div', { class: 'net-reply' });

  const say = (cls: string, text: string) => {
    term.append(h('div', { class: `net-line ${cls}`, text }));
    while (term.childElementCount > 8) term.firstElementChild?.remove();
    term.scrollTop = term.scrollHeight;
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      say('err', 'admin-pc:~$ ping 10.0.0.1');
      say('err', 'connect: Network is unreachable');

      const buttons = shuffle([
        ...sim.scenario.steps.map((s) => ({ id: s.id, label: s.label })),
        ...shuffle(NET_DISTRACTORS)
          .slice(0, 2)
          .map((d) => ({ id: d.id, label: d.label })),
      ]);

      const grid = h('div', { class: 'net-steps' });
      for (const b of buttons) {
        const el = h('button', { class: 'btn net-step', type: 'button', text: b.label });
        el.addEventListener('click', () => {
          if (!api) return;
          const res = sim.tap(b.id);
          if (res === 'ok') {
            const step = sim.scenario.steps[sim.progress - 1]!;
            el.classList.add('done');
            el.disabled = true;
            say('cmd', `$ ${step.label}`);
            say('ok', step.output);
            setText(reply, '');
            api.sfx.tap();
            api.haptic('tap');
            if (sim.done) {
              say('ok', '64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=0.4 ms');
              api.sfx.good();
              api.finish();
            }
          } else if (res === 'early' || res === 'useless') {
            const d = NET_DISTRACTORS.find((x) => x.id === b.id);
            setText(reply, d ? d.reply : pick(EARLY_REPLIES));
            api.sfx.error();
            api.haptic('error');
            api.penalize(CFG.wrongPenaltyMs);
            juice(el, SHAKE, 240);
          }
        });
        grid.append(el);
      }

      root.append(h('div', { class: 'net' }, [term, reply, grid]));
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `Schritt ${Math.min(sim.progress + 1, sim.total)}/${sim.total} · Fehlgriffe: ${sim.wrong}`,
  };
}
