import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { LB_EVENTS, LB_TEXT } from '../../content/incidents';
import { fill, pick } from '../../util';
import { h, juice, NUDGE, onTap, reducedMotion, SHAKE, setFlag, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.lb;
type Cfg = typeof CFG;

/** ok = gesund, down = abgestürzt (502), slow = langsam (Warteschlange läuft voll, 503) */
export type Health = 'ok' | 'down' | 'slow';

export interface Backend {
  name: string;
  inPool: boolean;
  health: Health;
  /** wartende Anfragen (fließend, angezeigt aufgerundet) */
  queue: number;
  /** so lange muss er noch draußen bleiben, bis er gesund ist (ms) */
  healLeft: number;
}

export type LbEventKind = 'crash' | 'slow' | 'spike' | 'healed';

export interface LbEvent {
  kind: LbEventKind;
  /** betroffener Server, -1 = alle (Lastspitze) */
  server: number;
  text: string;
}

/** Eine Anfrage: angenommen oder mit Fehlercode abgewiesen; server -1 = kein Server im Pool */
export interface Routed {
  server: number;
  code: 200 | 502 | 503;
}

/** Spiellogik ohne DOM. */
export class LbSim {
  servers: Backend[];
  t = 0;
  /** beantwortet: zählt erst, wenn ein Server die Anfrage abgearbeitet hat (fließend, wie die Warteschlange) */
  ok = 0;
  failed = 0;
  /** Lastspitze läuft noch so lange (ms) */
  spikeLeft = 0;
  private acc = 0;
  private rr = 0;
  private nextEvent: number;
  private lastKind: LbEventKind | null = null;
  private had = new Set<LbEventKind>();
  private lastServer = -1;
  private events: LbEvent[] = [];
  private routed: Routed[] = [];
  private lastText = '';

  constructor(
    private cfg: Cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    this.servers = Array.from({ length: cfg.servers }, (_, i) => ({
      name: `web0${i + 1}`,
      inPool: true,
      health: 'ok' as Health,
      queue: 0,
      healLeft: 0,
    }));
    // einer steht noch vom letzten Deploy auf Wartung: der erste Handgriff
    this.servers[Math.floor(rnd() * cfg.servers)]!.inPool = false;
    this.nextEvent = cfg.firstEventMs;
  }

  /** Anfragen je Sekunde gerade */
  get rate(): number {
    const p = Math.min(1, this.t / this.cfg.durationMs);
    const base = this.cfg.rateStart + (this.cfg.rateEnd - this.cfg.rateStart) * p;
    return this.spikeLeft > 0 ? base * this.cfg.spikeMul : base;
  }

  /** Anteil beantworteter Anfragen */
  get okShare(): number {
    const n = this.ok + this.failed;
    return n > 0 ? this.ok / n : 1;
  }

  private sick(s: Backend): boolean {
    return s.health !== 'ok';
  }

  /** Draußen und noch nicht erholt: kann nicht zurück (er startet ja gerade neu) */
  locked(i: number): boolean {
    const s = this.servers[i];
    return !!s && !s.inPool && this.sick(s);
  }

  /** Antippen: raus aus dem Pool oder wieder rein. false = gesperrt, weil er sich draußen noch erholt. */
  toggle(i: number): boolean {
    const s = this.servers[i];
    if (!s || this.locked(i)) return false;
    s.inPool = !s.inPool;
    return true;
  }

  update(dt: number): void {
    this.t += dt;
    this.spikeLeft = Math.max(0, this.spikeLeft - dt);
    this.acc += (this.rate * dt) / 1_000;
    while (this.acc >= 1) {
      this.acc -= 1;
      this.route();
    }
    for (const [i, s] of this.servers.entries()) {
      const rps = s.health === 'down' ? 0 : s.health === 'slow' ? this.cfg.slowRps : this.cfg.serveRps;
      const served = Math.min(s.queue, (rps * dt) / 1_000);
      s.queue -= served;
      this.ok += served;
      if (!s.inPool && this.sick(s)) {
        s.healLeft -= dt;
        if (s.healLeft <= 0) {
          s.health = 'ok';
          s.healLeft = 0;
          this.events.push({ kind: 'healed', server: i, text: fill(LB_EVENTS.healed, { srv: s.name }) });
        }
      }
    }
    while (this.t >= this.nextEvent) {
      this.fire();
      this.nextEvent += this.cfg.eventMinMs + this.rnd() * (this.cfg.eventMaxMs - this.cfg.eventMinMs);
    }
  }

  /** Round Robin über alle Server im Pool, so dumm wie echt: ob der Server lebt, prüft keiner (Health-Check ist aus) */
  private route(): void {
    const pool = this.servers.flatMap((s, i) => (s.inPool ? [i] : []));
    if (!pool.length) {
      this.failed++;
      this.routed.push({ server: -1, code: 503 });
      return;
    }
    const i = pool[this.rr++ % pool.length]!;
    const s = this.servers[i]!;
    let code: Routed['code'] = 200;
    if (s.health === 'down') code = 502;
    else if (s.queue + 1 > this.cfg.queueMax) code = 503;
    if (code === 200) s.queue += 1;
    else this.failed++;
    this.routed.push({ server: i, code });
  }

  /**
   * Eine Störung. Nie zwei kranke Server gleichzeitig (Häufungen fühlen sich unfair an):
   * solange einer krank ist, kommt höchstens eine Lastspitze. Nie zweimal dieselbe Art oder derselbe Server hintereinander.
   */
  private fire(): void {
    const anySick = this.servers.some((s) => this.sick(s));
    const targets = this.servers.flatMap((s, i) => (s.inPool && !this.sick(s) && i !== this.lastServer ? [i] : []));
    let kinds: LbEventKind[] = anySick || !targets.length ? ['spike'] : ['crash', 'slow', 'spike'];
    // nie dieselbe Art zweimal hintereinander: geht nur noch eine Lastspitze und war die letzte eine, dann diesmal nichts
    kinds = kinds.filter((k) => k !== this.lastKind);
    // jede Runde soll alles einmal zeigen: was noch nicht dran war, kommt zuerst
    const fresh = kinds.filter((k) => !this.had.has(k));
    if (fresh.length) kinds = fresh;
    // Lastspitze nicht direkt in eine laufende hinein
    if (this.spikeLeft > 0) kinds = kinds.filter((k) => k !== 'spike');
    if (!kinds.length) return;
    const kind = pick(kinds, this.rnd);
    this.lastKind = kind;
    this.had.add(kind);
    if (kind === 'spike') {
      this.spikeLeft = this.cfg.spikeMs;
      this.events.push({ kind, server: -1, text: this.freshText(LB_EVENTS.spike) });
      return;
    }
    const i = pick(targets, this.rnd);
    const s = this.servers[i]!;
    this.lastServer = i;
    s.health = kind === 'crash' ? 'down' : 'slow';
    s.healLeft = kind === 'crash' ? this.cfg.rebootMs : this.cfg.calmMs;
    if (kind === 'crash') {
      // was in der Warteschlange stand, ist mit abgestürzt (war noch nicht beantwortet, zählt also nur als Fehler)
      this.failed += s.queue;
      s.queue = 0;
    }
    this.events.push({ kind, server: i, text: fill(this.freshText(kind === 'crash' ? LB_EVENTS.crash : LB_EVENTS.slow), { srv: s.name }) });
  }

  private freshText(pool: readonly string[]): string {
    const t = pick(
      pool.filter((x) => x !== this.lastText),
      this.rnd,
    );
    this.lastText = t;
    return t;
  }

  drainEvents(): LbEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  drainRouted(): Routed[] {
    const out = this.routed;
    this.routed = [];
    return out;
  }

  score(): number {
    // Nichtstun beantwortet auch noch einiges: erst was darüber hinausgeht, zählt
    const { scoreFloor: f, scoreGoal: g } = this.cfg;
    return progressScore(Math.max(0, Math.min(1, (this.okShare - f) / (g - f))), 1, 0);
  }
}

/** Attribut/CSS-Variable nur schreiben, wenn sich der Wert ändert (render läuft jeden Frame) */
const setAttr = (el: Element, name: string, v: string) => {
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
};
const setVar = (el: HTMLElement, name: string, v: string) => {
  if (el.style.getPropertyValue(name) !== v) el.style.setProperty(name, v);
};

const pct = (x: number) => `${Math.floor(x * 100)} %`;

/** Text im Status-LCD des Servers (höchstens 8 Zeichen, so breit ist das Display bei 320 px) */
function stateOf(s: Backend): { key: string; label: string } {
  const sec = Math.ceil(s.healLeft / 1_000);
  if (s.inPool) {
    if (s.health === 'down') return { key: 'down', label: 'DOWN 502' };
    if (s.health === 'slow') return { key: 'slow', label: 'LANGSAM' };
    return { key: 'up', label: 'UP' };
  }
  if (s.health === 'down') return { key: 'heal', label: `BOOT ${sec}s` };
  if (s.health === 'slow') return { key: 'heal', label: `WAIT ${sec}s` };
  return { key: 'maint', label: 'MAINT' };
}

export function lbGame(): Minigame {
  const sim = new LbSim();
  let api: GameApi | null = null;
  const cards: HTMLButtonElement[] = [];
  const wires: HTMLElement[] = [];
  const leds: HTMLElement[][] = [];
  const states: HTMLElement[] = [];
  const switches: HTMLElement[] = [];
  const shown: string[] = [];
  /** Fehlercodes nicht für jede Anfrage einzeln hochploppen lassen */
  const lastPop: number[] = [];
  /** wann der Lastverteiler zuletzt gewackelt hat (niemand im Pool) */
  let lastShake = -1e9;
  const reply = h('div', { class: 'lb-reply', text: LB_TEXT.start, 'aria-live': 'polite' });
  const rate = h('b', { class: 'lb-rate' });
  const spike = h('span', { class: 'lb-spike', text: 'Lastspitze' });
  const lbBox = h('div', { class: 'lb-box', 'aria-hidden': 'true' }, [
    h('span', { class: 'lb-cloud', text: 'Internet' }),
    h('span', { class: 'lb-arrow', text: '→' }),
    h('span', { class: 'lb-dev' }, [h('b', { text: 'lb01' }), rate]),
    spike,
  ]);

  const pop = (i: number, code: number) => {
    const now = sim.t;
    if (now - (lastPop[i] ?? -1e9) < 300) return;
    lastPop[i] = now;
    const el = h('span', { class: 'lb-pop', text: String(code), 'aria-hidden': 'true' });
    cards[i]!.append(el);
    setTimeout(() => el.remove(), 700);
  };

  /** Anfrage als Punkt, der den Draht hinunter in den Server fällt (rot: kommt nicht an) */
  const drop = (i: number, bad: boolean) => {
    if (reducedMotion()) return;
    const w = wires[i]!;
    if (w.childElementCount > 6) return;
    const dot = h('span', { class: bad ? 'lb-dot bad' : 'lb-dot' });
    w.append(dot);
    dot.addEventListener('animationend', () => dot.remove());
  };

  const render = () => {
    setText(rate, `${sim.rate.toFixed(1).replace('.', ',')} req/s`);
    setFlag(spike, 'on', sim.spikeLeft > 0);
    sim.servers.forEach((s, i) => {
      const st = stateOf(s);
      const card = cards[i]!;
      if (shown[i] !== st.key) {
        card.dataset.state = st.key;
        shown[i] = st.key;
      }
      setText(states[i]!, st.label);
      const sw = switches[i]!;
      const locked = sim.locked(i);
      // gesperrt sieht gesperrt aus: grau, Füllbalken bis er fertig ist
      setText(sw, locked ? 'wartet' : s.inPool ? 'im Pool' : 'raus');
      setFlag(sw, 'off', !s.inPool);
      setFlag(sw, 'locked', locked);
      // Füllbalken in 2-%-Schritten: nicht jeden Frame einen neuen Stil schreiben
      if (locked) setVar(sw, '--p', (Math.floor((1 - s.healLeft / (s.health === 'down' ? CFG.rebootMs : CFG.calmMs)) * 50) / 50).toFixed(2));
      setAttr(card, 'aria-pressed', s.inPool ? 'true' : 'false');
      // Screenreader hören den Zustand (Name, LCD, Pool), nicht nur den Namen
      setAttr(card, 'aria-label', `${s.name}: ${st.label}, ${s.inPool ? 'im Pool' : 'draußen'}`);
      const q = Math.ceil(s.queue - 0.05);
      leds[i]!.forEach((l, k) => setFlag(l, 'on', k < q));
      setAttr(card, 'data-full', q >= CFG.queueMax ? '1' : '');
    });
  };

  const onCard = (i: number) => {
    const s = sim.servers[i]!;
    if (!sim.toggle(i)) {
      juice(cards[i]!, SHAKE, 260);
      api?.haptic('error');
      setText(reply, fill(s.health === 'down' ? LB_TEXT.lockedDown : LB_TEXT.lockedSlow, { srv: s.name }));
      reply.dataset.kind = '';
      return;
    }
    api?.sfx.tick();
    api?.haptic('tap');
    juice(cards[i]!, NUDGE, 200);
    render();
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const pool = sim.servers.map((s, i) => {
        const wire = h('div', { class: 'lb-wire', 'aria-hidden': 'true' });
        const ledRow = Array.from({ length: CFG.queueMax }, () => h('span', { class: 'lb-led' }));
        const state = h('div', { class: 'lb-lcd' });
        const sw = h('span', { class: 'lb-sw' });
        // Tower-Server von vorn: Name + Betriebs-LED, Status-LCD, sechs Plattenschächte (ihre LEDs = Warteschlange,
        // füllt sich von unten), Lüftungsgitter, Netzschalter
        const tower = h('div', { class: 'lb-tower' }, [
          h('div', { class: 'lb-top', 'aria-hidden': 'true' }, [h('b', { text: s.name }), h('span', { class: 'lb-power' })]),
          state,
          h('div', { class: 'lb-bays', 'aria-hidden': 'true' }, [...ledRow].reverse().map((led) => h('span', { class: 'lb-bay' }, [led]))),
          h('div', { class: 'lb-grille', 'aria-hidden': 'true' }, [h('span', { class: 'lb-btn-power' })]),
        ]);
        const card = h('button', { class: 'lb-srv', type: 'button' }, [wire, tower, sw]);
        onTap(card, () => onCard(i));
        cards.push(card);
        wires.push(wire);
        leds.push(ledRow);
        states.push(state);
        switches.push(sw);
        shown.push('');
        return card;
      });
      root.append(
        h('div', { class: 'lb' }, [
          h('div', { class: 'lb-win' }, [
            h('div', { class: 'lb-head', 'aria-hidden': 'true' }, [
              h('b', { text: 'HAHAProxy · Statistics Report' }),
              h('span', { text: 'backend www · balance roundrobin · health check: ' }),
              h('span', { class: 'lb-off', text: 'off' }),
            ]),
            lbBox,
            // Spalten und Leitung richten sich nach der Zahl der Server
            h('div', { class: 'lb-pool', style: `--n:${CFG.servers}` }, pool),
            h('div', { class: 'lb-legend', 'aria-hidden': 'true' }, [
              h('span', { class: 'k-up', text: 'UP' }),
              h('span', { class: 'k-down', text: 'DOWN' }),
              h('span', { class: 'k-slow', text: 'langsam' }),
              h('span', { class: 'k-heal', text: 'Neustart' }),
              h('span', { class: 'k-maint', text: 'fit, draußen' }),
            ]),
          ]),
          reply,
        ]),
      );
      render();
    },
    update(dt) {
      sim.update(dt);
      for (const r of sim.drainRouted()) {
        if (r.server < 0) {
          // niemand im Pool: alles prallt am Lastverteiler ab
          if (sim.t - lastShake > 400) {
            lastShake = sim.t;
            juice(lbBox, SHAKE, 260);
          }
          continue;
        }
        drop(r.server, r.code !== 200);
        if (r.code !== 200) pop(r.server, r.code);
      }
      for (const ev of sim.drainEvents()) {
        setText(reply, ev.text);
        reply.dataset.kind = ev.kind;
        if (ev.kind === 'spike') {
          juice(lbBox, NUDGE, 260);
          api?.sfx.tick();
        } else if (ev.kind === 'healed') {
          juice(cards[ev.server]!, NUDGE, 260);
          api?.sfx.tick();
        } else {
          juice(cards[ev.server]!, SHAKE, 320);
          api?.sfx.error();
          api?.haptic('error');
        }
      }
      render();
    },
    score: () => sim.score(),
    status: () => `beantwortet: ${pct(sim.okShare)}`,
  };
}
