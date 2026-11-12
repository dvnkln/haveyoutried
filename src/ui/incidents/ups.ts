import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { UPS_CORE, UPS_CRASH_AFTER, UPS_FRONT } from '../../content/incidents';
import { pick, shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.ups;
type Cfg = typeof CFG;

export type ServerState = 'on' | 'stopping' | 'off' | 'crashed';

export interface Server {
  id: number;
  name: string;
  role: string;
  /** ids der Server, die dieser braucht */
  needs: number[];
  state: ServerState;
}

export interface Crash {
  id: number;
  /** wegen dieses Servers abgestürzt */
  cause: number;
}

/** Spiellogik ohne DOM. */
export class UpsSim {
  servers: Server[];
  /** Akkuladung 1..0 */
  charge = 1;
  t = 0;
  /** abgestürzte Server (falsche Reihenfolge) */
  wrong = 0;
  dead = false;
  holding: { id: number; left: number } | null = null;
  private justOff: number[] = [];
  private justCrashed: Crash[] = [];

  constructor(
    private cfg: Cfg = CFG,
    rnd: () => number = Math.random,
  ) {
    const defs = [...shuffle(UPS_FRONT, rnd).slice(0, cfg.front), ...UPS_CORE];
    // Reihenfolge im Rack gemischt: wer wovon abhängt, steht an den Servern, nicht in der Anordnung
    const order = shuffle(defs, rnd);
    const idOf = new Map(order.map((d, i) => [d.name, i]));
    this.servers = order.map((d, i) => ({
      id: i,
      name: d.name,
      role: d.role,
      needs: d.needs.map((n) => idOf.get(n)).filter((x): x is number => x !== undefined),
      state: 'on',
    }));
  }

  private running(s: Server): boolean {
    return s.state === 'on' || s.state === 'stopping';
  }

  get runningCount(): number {
    return this.servers.filter((s) => this.running(s)).length;
  }

  /** Last 0..1: Grundlast plus Anteil der laufenden Server */
  get load(): number {
    return this.cfg.idleLoad + ((1 - this.cfg.idleLoad) * this.runningCount) / this.servers.length;
  }

  /** Restlaufzeit in ms Spielzeit bei aktueller Last */
  get runtimeMs(): number {
    return (this.charge * this.cfg.batteryMs) / this.load;
  }

  get done(): boolean {
    return this.runningCount === 0;
  }

  get cleanOff(): number {
    return this.servers.filter((s) => s.state === 'off').length;
  }

  /** laufende Server, die diesen noch brauchen */
  users(id: number): Server[] {
    return this.servers.filter((s) => this.running(s) && s.needs.includes(id));
  }

  update(dt: number): void {
    if (this.dead || this.done) return;
    this.t += dt;
    this.charge -= (this.load * dt) / this.cfg.batteryMs;
    if (this.holding) {
      this.holding.left -= dt;
      if (this.holding.left <= 0) {
        const id = this.holding.id;
        this.holding = null;
        this.shutDown(id);
      }
    }
    if (this.charge <= 0) {
      this.charge = 0;
      this.dead = true;
      this.holding = null;
      // alles, was noch läuft, geht hart aus (zählt nicht als sauber, aber auch nicht als Reihenfolgefehler)
      for (const s of this.servers) if (this.running(s)) s.state = 'crashed';
    }
  }

  /** Gedrückt halten beginnt: Server fährt herunter, solange gehalten wird */
  startHold(id: number): boolean {
    const s = this.servers[id];
    if (!s || s.state !== 'on' || this.dead || this.holding) return false;
    s.state = 'stopping';
    this.holding = { id, left: this.cfg.holdMs };
    return true;
  }

  /** Losgelassen, bevor er unten war: läuft einfach weiter */
  cancelHold(): void {
    if (!this.holding) return;
    const s = this.servers[this.holding.id]!;
    if (s.state === 'stopping') s.state = 'on';
    this.holding = null;
  }

  /** Fortschritt des Haltens 0..1 */
  holdProgress(id: number): number {
    return this.holding?.id === id ? 1 - Math.max(0, this.holding.left) / this.cfg.holdMs : 0;
  }

  private shutDown(id: number): void {
    const s = this.servers[id]!;
    s.state = 'off';
    this.justOff.push(id);
    this.crashUsers(id);
  }

  /** Wer den Server noch brauchte, stürzt ab; deren Nutzer gleich mit */
  private crashUsers(id: number): void {
    for (const u of this.users(id)) {
      // kann schon über einen anderen Pfad mitgerissen worden sein (braucht beide): nicht doppelt zählen
      if (u.state === 'crashed') continue;
      if (this.holding?.id === u.id) this.holding = null;
      u.state = 'crashed';
      this.wrong++;
      this.justCrashed.push({ id: u.id, cause: id });
      this.crashUsers(u.id);
    }
  }

  drain(): { off: number[]; crashed: Crash[] } {
    const out = { off: this.justOff, crashed: this.justCrashed };
    this.justOff = [];
    this.justCrashed = [];
    return out;
  }

  score(): number {
    const s = progressScore(this.cleanOff, this.servers.length, this.wrong);
    // leerer Akku ist nie ein Erfolg (wie das tote RAID)
    return this.dead ? Math.min(s, INCIDENTS.goodMin * 0.9) : s;
  }
}

const LCD_SEGMENTS = 10;

export function upsGame(): Minigame {
  const sim = new UpsSim();
  let api: GameApi | null = null;
  let over = false;
  let pressedAt = 0;
  /** Finger, der gerade hält: nur dessen Loslassen bricht ab (ein zweiter Finger stört nicht) */
  let holdPointer: number | null = null;
  const holdShown: string[] = [];
  const units: HTMLButtonElement[] = [];
  const stateEls: HTMLElement[] = [];
  const needEls: HTMLElement[][] = [];
  const segs: HTMLElement[] = [];
  const loadEl = h('span', { class: 'ups-load' });
  const runEl = h('span', { class: 'ups-run' });
  const modeEl = h('div', { class: 'ups-mode', text: 'BATTERIEBETRIEB' });
  const reply = h('div', { class: 'ups-reply' });

  const STATE_TEXT: Record<ServerState, string> = { on: 'läuft', stopping: 'fährt herunter …', off: 'aus', crashed: 'abgestürzt' };

  const render = () => {
    const lit = Math.ceil(sim.charge * LCD_SEGMENTS);
    segs.forEach((s, i) => s.classList.toggle('on', i < lit));
    setText(loadEl, `Last ${Math.round(sim.load * 100)} %`);
    const min = Math.max(0, Math.floor((sim.runtimeMs / 1_000) * CFG.minutesPerSec));
    setText(runEl, `Restlaufzeit ${min} min`);
    sim.servers.forEach((s, i) => {
      const u = units[i]!;
      if (u.dataset.state !== s.state) u.dataset.state = s.state;
      const hold = sim.holdProgress(i).toFixed(3);
      if (holdShown[i] !== hold) {
        u.style.setProperty('--hold', hold);
        holdShown[i] = hold;
      }
      setText(stateEls[i]!, STATE_TEXT[s.state]);
      // Abhängigkeiten, die schon aus sind, durchstreichen
      s.needs.forEach((n, k) => needEls[i]![k]!.classList.toggle('gone', sim.servers[n]!.state !== 'on' && sim.servers[n]!.state !== 'stopping'));
    });
  };

  const release = (e: PointerEvent) => {
    if (e.pointerId !== holdPointer) return;
    holdPointer = null;
    if (!sim.holding) return;
    const quick = performance.now() - pressedAt < 350;
    sim.cancelHold();
    api?.sfx.release();
    if (quick) setText(reply, 'Gedrückt halten, bis er unten ist. Kurz drücken hieße: Stecker ziehen.');
    render();
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const rack = h('div', { class: 'ups-rack' });
      sim.servers.forEach((s, i) => {
        const state = h('span', { class: 'ups-state' });
        const needs = s.needs.map((n) => h('b', { text: sim.servers[n]!.name }));
        const needLine = h('span', { class: 'ups-needs' }, needs.length ? ['braucht: ', ...needs.flatMap((b, k) => (k ? [', ', b] : [b]))] : ['braucht: nichts']);
        const unit = h('button', { class: 'ups-unit', type: 'button', 'aria-label': `${s.name} herunterfahren (gedrückt halten)` }, [
          h('span', { class: 'ups-ear', 'aria-hidden': 'true' }),
          h('span', { class: 'ups-face' }, [
            h('span', { class: 'ups-name' }, [h('b', { text: s.name }), h('small', { text: s.role })]),
            needLine,
            state,
          ]),
          h('span', { class: 'ups-power', 'aria-hidden': 'true' }, [h('span', { class: 'ups-led' })]),
          h('span', { class: 'ups-ear', 'aria-hidden': 'true' }),
          h('span', { class: 'ups-hold', 'aria-hidden': 'true' }),
        ]);
        unit.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (!sim.startHold(i)) {
            if (s.state === 'on') return;
            juice(unit, SHAKE, 160);
            return;
          }
          pressedAt = performance.now();
          holdPointer = e.pointerId;
          unit.setPointerCapture(e.pointerId);
          gameApi.sfx.tap();
          gameApi.haptic('tap');
          setText(reply, '');
        });
        unit.addEventListener('pointerup', release);
        unit.addEventListener('pointercancel', release);
        unit.addEventListener('lostpointercapture', release);
        // Tastatur (Enter/Space): startet das Herunterfahren und lässt es durchlaufen
        unit.addEventListener('click', (e) => {
          if (e.detail === 0 && sim.startHold(i)) gameApi.sfx.tap();
        });
        unit.addEventListener('contextmenu', (e) => e.preventDefault());
        units.push(unit);
        stateEls.push(state);
        needEls.push(needs);
        rack.append(unit);
      });
      const battery = h(
        'span',
        { class: 'ups-batt', 'aria-hidden': 'true' },
        Array.from({ length: LCD_SEGMENTS }, () => {
          const seg = h('span');
          segs.push(seg);
          return seg;
        }),
      );
      root.append(
        h('div', { class: 'ups' }, [
          h('div', { class: 'ups-box' }, [
            h('div', { class: 'ups-brand', 'aria-hidden': 'true' }, [h('b', { text: 'APZ' }), ' Smart-USV 1500']),
            h('div', { class: 'ups-lcd', role: 'status' }, [modeEl, h('div', { class: 'ups-lcd-row' }, [battery, h('span', { class: 'ups-vals' }, [loadEl, runEl])])]),
          ]),
          rack,
          reply,
        ]),
      );
      render();
    },
    update(dt) {
      sim.update(dt);
      const { off, crashed } = sim.drain();
      for (const id of off) {
        api?.sfx.good();
        api?.haptic('tap');
        juice(units[id]!, [{ transform: 'scale(0.985)' }, { transform: 'scale(1)' }], 200);
      }
      if (crashed.length) {
        // direkt Betroffene (brauchten den Server) und mitgerissene (hingen an einem Abgestürzten) getrennt nennen
        const root = off[off.length - 1] ?? crashed[0]!.cause;
        const name = (id: number) => sim.servers[id]!.name;
        const direct = crashed.filter((x) => x.cause === root).map((x) => name(x.id));
        const chain = crashed.filter((x) => x.cause !== root).map((x) => name(x.id));
        const head = `${direct.join(', ')} ${direct.length > 1 ? 'brauchten' : 'brauchte'} ${name(root)} noch: abgestürzt.`;
        const tail = chain.length ? ` ${chain.join(', ')} ${chain.length > 1 ? 'sind' : 'ist'} gleich mit.` : '';
        setText(reply, `${head}${tail} ${pick(UPS_CRASH_AFTER)}`);
        api?.sfx.error();
        api?.haptic('error');
        for (const x of crashed) juice(units[x.id]!, SHAKE, 260);
      }
      render();
      if (!over && (sim.done || sim.dead)) {
        over = true;
        if (sim.dead) {
          setText(modeEl, 'BATTERIE LEER');
          setText(reply, 'Akku leer. Alles, was noch lief, ist hart ausgegangen.');
        } else {
          setText(modeEl, 'LAST AUS · WARTE AUF NETZ');
        }
        api?.finish();
      }
    },
    score: () => sim.score(),
    status: () => `sauber aus: ${sim.cleanOff}/${sim.servers.length} · abgestürzt: ${sim.wrong}`,
  };
}
