import { INCIDENTS } from '../../config';
import { LOG_DECOYS, LOG_TARGETS } from '../../content/incidents';
import { h, juice, SHAKE } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.loggrep;

export interface LogLine {
  id: number;
  text: string;
  target: boolean;
}

export type TapResult = 'hit' | 'wrong' | 'gone';

/** Spiellogik ohne DOM. */
export class LogGrepSim {
  lines: LogLine[] = [];
  found = 0;
  missed = 0;
  wrong = 0;
  private t = 0;
  private nextLine = 0;
  private nextId = 1;
  private decoysLeft: number;
  /** aktuell sichtbarer, noch nicht erwischter echter Fehler */
  private targetId = 0;
  /** Spielzeit des letzten Nachrückens (alle Zeilen eine nach oben) */
  private lastShift = -Infinity;

  constructor(
    private cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    this.decoysLeft = this.decoyCount();
    // Log ist beim Start schon „in Betrieb“: ein paar normale Zeilen vorab
    for (let i = 0; i < 4; i++) this.lines.push({ id: this.nextId++, text: this.pickText(LOG_DECOYS), target: false });
  }

  get roundsDone(): number {
    return this.found + this.missed;
  }

  get done(): boolean {
    return this.roundsDone >= this.cfg.rounds;
  }

  private decoyCount(): number {
    return this.cfg.decoysMin + Math.floor(this.rnd() * (this.cfg.decoysMax - this.cfg.decoysMin + 1));
  }

  private interval(): number {
    const p = Math.min(1, this.t / this.cfg.durationMs);
    return this.cfg.intervalStartMs + (this.cfg.intervalEndMs - this.cfg.intervalStartMs) * p;
  }

  private pickText(pool: readonly string[]): string {
    return pool[Math.floor(this.rnd() * pool.length)]!;
  }

  private push(): void {
    // ein echter Fehler, sobald die Störzeilen dieser Runde durch sind (und keiner offen ist)
    const target = !this.targetId && this.decoysLeft <= 0 && !this.done;
    const line: LogLine = {
      id: this.nextId++,
      text: this.pickText(target ? LOG_TARGETS : LOG_DECOYS),
      target,
    };
    if (target) this.targetId = line.id;
    else this.decoysLeft--;
    this.lines.push(line);
    // oben rausgescrollt
    while (this.lines.length > this.cfg.window) {
      this.lastShift = this.t;
      const gone = this.lines.shift()!;
      if (gone.id === this.targetId) {
        this.targetId = 0;
        this.missed++;
        this.decoysLeft = this.decoyCount();
      }
    }
  }

  update(dt: number): void {
    if (this.done) return;
    this.t += dt;
    while (this.t >= this.nextLine) {
      this.push();
      this.nextLine += this.interval();
    }
  }

  tap(id: number): TapResult {
    const idx = this.lines.findIndex((l) => l.id === id);
    if (idx < 0) return 'gone';
    let line = this.lines[idx]!;
    // Gerade nachgerückt? Dann zielte der Finger wohl auf die Zeile darüber.
    const prev = this.lines[idx - 1];
    if (!line.target && prev?.target && this.t - this.lastShift <= this.cfg.shiftGraceMs) line = prev;
    if (line.target && line.id === this.targetId) {
      this.found++;
      this.targetId = 0;
      line.target = false; // erledigt, zählt nicht doppelt
      this.decoysLeft = this.decoyCount();
      return 'hit';
    }
    this.wrong++;
    return 'wrong';
  }

  score(): number {
    return (this.found / this.cfg.rounds) * Math.max(0.4, 1 - this.wrong * 0.1);
  }
}

export function logGrepGame(): Minigame {
  const sim = new LogGrepSim();
  let api: GameApi | null = null;
  const list = h('div', { class: 'grep-log', role: 'list' });
  const rendered = new Map<number, HTMLButtonElement>();
  const fixed = new Set<number>();

  const sync = () => {
    const ids = new Set(sim.lines.map((l) => l.id));
    for (const [id, el] of rendered) {
      if (!ids.has(id)) {
        el.remove();
        rendered.delete(id);
      }
    }
    for (const line of sim.lines) {
      if (rendered.has(line.id)) continue;
      const el = h('button', { class: 'grep-line', type: 'button', role: 'listitem', text: line.text });
      const level = line.text.slice(0, 5).trim();
      el.dataset.level = level.toLowerCase();
      const hit = () => {
        if (!api || fixed.has(line.id)) return;
        const targetBefore = sim.lines.find((l) => l.target)?.id;
        const res = sim.tap(line.id);
        if (res === 'hit') {
          // bei Nachsicht wurde die Zeile darüber gewertet – die markieren
          const hitId = targetBefore ?? line.id;
          fixed.add(hitId);
          rendered.get(hitId)?.classList.add('fixed');
          api.sfx.good();
          api.haptic('buy');
          if (sim.done) api.finish();
        } else if (res === 'wrong') {
          api.sfx.error();
          api.haptic('error');
          api.penalize(CFG.wrongPenaltyMs);
          juice(el, SHAKE, 240);
          el.classList.add('miss');
        }
      };
      // Aufsetzen zählt (nicht erst Loslassen): die Zeile kann sonst schon weggerutscht sein
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        hit();
      });
      el.addEventListener('click', (e) => {
        if (e.detail === 0) hit();
      });
      rendered.set(line.id, el);
      list.append(el);
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      sim.update(0);
      sync();
      root.append(h('div', { class: 'grep' }, [h('div', { class: 'grep-cmd', text: '$ tail -f /var/log/app01/app.log' }), list]));
    },
    update(dt) {
      const missedBefore = sim.missed;
      sim.update(dt);
      sync();
      if (sim.missed > missedBefore) api?.sfx.error();
      if (sim.done) api?.finish();
    },
    score: () => sim.score(),
    status: () => `gefunden: ${sim.found}/${CFG.rounds} · verpasst: ${sim.missed} · falsch: ${sim.wrong}`,
  };
}
