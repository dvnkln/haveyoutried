import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { COOL_EVENTS, type CoolEvent } from '../../content/incidents';
import { fill, pick } from '../../util';
import { h, juice, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.cooling;
type Cfg = typeof CFG;

export interface Zone {
  name: string;
  /** Temperatur in °C */
  temp: number;
  /** Abwärme der Server (Einheiten wie die Kühlleistung) */
  heat: number;
  /** Regler 0..1 */
  power: number;
  /** Spielzeit im grünen Bereich (ms) */
  okMs: number;
}

export interface FiredEvent {
  text: string;
  /** betroffene Zone, -1 = alle */
  zone: number;
  delta: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Spiellogik ohne DOM. */
export class CoolingSim {
  zones: Zone[];
  t = 0;
  private nextEvent: number;
  private lastEvent: CoolEvent | null = null;
  private fired: FiredEvent[] = [];

  constructor(
    private cfg: Cfg = CFG,
    private rnd: () => number = Math.random,
  ) {
    const between = (a: number, b: number) => a + rnd() * (b - a);
    this.zones = Array.from({ length: cfg.zones }, (_, i) => ({
      name: `Rack ${String.fromCharCode(65 + i)}`,
      temp: cfg.startC + between(-1.5, 1.5),
      // Ziel liegt beim Start außerhalb des grünen Bereichs: jeder Regler muss einmal angefasst werden
      heat: clamp(
        cfg.startPower * cfg.coolMax + (rnd() < 0.5 ? -1 : 1) * between(cfg.startOffMin, cfg.startOffMax),
        cfg.heatStartMin,
        cfg.heatStartMax,
      ),
      power: cfg.startPower,
      okMs: 0,
    }));
    this.nextEvent = between(cfg.eventMinMs, cfg.eventMaxMs);
  }

  inRange(z: Zone): boolean {
    return z.temp >= this.cfg.minC && z.temp <= this.cfg.maxC;
  }

  /**
   * Wohin die Temperatur läuft (°C): Gleichgewicht aus Abwärme und Kühlung.
   * Der Regler stellt also das Ziel ein, nicht die Geschwindigkeit: das ist am Handy greifbar.
   */
  target(z: Zone): number {
    const mid = (this.cfg.minC + this.cfg.maxC) / 2;
    return clamp(mid + (z.heat - z.power * this.cfg.coolMax) * this.cfg.gainC, this.cfg.scaleMinC, this.cfg.scaleMaxC);
  }

  /** Temperaturtrend in °C/s (für die Anzeige „steigt/fällt“) */
  trend(z: Zone): number {
    return ((this.target(z) - z.temp) * 1_000) / this.cfg.tauMs;
  }

  setPower(i: number, v: number): void {
    const z = this.zones[i];
    if (z) z.power = clamp(v, 0, 1);
  }

  update(dt: number): void {
    this.t += dt;
    for (const z of this.zones) {
      // folgt dem Ziel mit Verzögerung (wie ein echter Raum)
      z.temp += (this.target(z) - z.temp) * (1 - Math.exp(-dt / this.cfg.tauMs));
      if (this.inRange(z)) z.okMs += dt;
    }
    while (this.t >= this.nextEvent) {
      this.fire();
      this.nextEvent += this.cfg.eventMinMs + this.rnd() * (this.cfg.eventMaxMs - this.cfg.eventMinMs);
    }
  }

  /** Ein Ereignis: ändert die Abwärme einer Zone (oder aller). Nie zweimal dasselbe hintereinander. */
  private fire(): void {
    const pool = COOL_EVENTS.filter((e) => e !== this.lastEvent);
    // Abwärme nicht über die Grenzen treiben: dann lieber ein Ereignis in die andere Richtung
    let e = pick(pool, this.rnd);
    const zone = e.text.includes('{rack}') ? Math.floor(this.rnd() * this.zones.length) : -1;
    const targets = zone >= 0 ? [this.zones[zone]!] : this.zones;
    const avg = targets.reduce((s, z) => s + z.heat, 0) / targets.length;
    if ((e.delta > 0 && avg + e.delta > this.cfg.heatMax) || (e.delta < 0 && avg + e.delta < this.cfg.heatMin)) {
      const flip = pool.filter((x) => Math.sign(x.delta) !== Math.sign(e.delta) && x.text.includes('{rack}') === zone >= 0);
      if (flip.length) e = pick(flip, this.rnd);
    }
    for (const z of targets) z.heat = clamp(z.heat + e.delta, this.cfg.heatMin, this.cfg.heatMax);
    this.lastEvent = e;
    const name = zone >= 0 ? this.zones[zone]!.name : '';
    this.fired.push({ text: fill(e.text, { rack: name }), zone, delta: e.delta });
  }

  drain(): FiredEvent[] {
    const out = this.fired;
    this.fired = [];
    return out;
  }

  /** Anteil der Zeit im grünen Bereich, über alle Zonen gemittelt */
  get okShare(): number {
    if (this.t <= 0) return 1;
    return this.zones.reduce((s, z) => s + z.okMs, 0) / (this.zones.length * this.t);
  }

  score(): number {
    // Nichtstun bleibt anfangs eine Weile grün: erst was darüber hinausgeht, zählt
    const f = this.cfg.scoreFloor;
    return progressScore(Math.max(0, (this.okShare - f) / (1 - f)), 1, 0);
  }
}

const deg = (c: number) => `${c.toFixed(1).replace('.', ',')} °C`;

export function coolingGame(): Minigame {
  const sim = new CoolingSim();
  let api: GameApi | null = null;
  const lcds: HTMLElement[] = [];
  const marks: HTMLElement[] = [];
  const aims: HTMLElement[] = [];
  const cards: HTMLElement[] = [];
  const pcts: HTMLElement[] = [];
  const trends: HTMLElement[] = [];
  const zoneState: string[] = [];
  const reply = h('div', { class: 'cool-reply' });
  const span = CFG.scaleMaxC - CFG.scaleMinC;
  const pos = (c: number) => ((c - CFG.scaleMinC) / span) * 100;

  const render = () => {
    sim.zones.forEach((z, i) => {
      setText(lcds[i]!, deg(z.temp));
      marks[i]!.style.bottom = `${pos(z.temp).toFixed(1)}%`;
      aims[i]!.style.bottom = `${pos(sim.target(z)).toFixed(1)}%`;
      aims[i]!.dataset.ok = sim.target(z) >= CFG.minC && sim.target(z) <= CFG.maxC ? '1' : '';
      setText(pcts[i]!, `${Math.round(z.power * 100)} %`);
      const tr = sim.trend(z);
      setText(trends[i]!, Math.abs(tr) < 0.15 ? '→ stabil' : tr > 0 ? '↑ steigt' : '↓ fällt');
      const st = z.temp > CFG.maxC ? 'hot' : z.temp < CFG.minC ? 'cold' : 'ok';
      if (zoneState[i] !== st) {
        if (zoneState[i] === 'ok' && st !== 'ok') {
          api?.sfx.error();
          api?.haptic('error');
        }
        cards[i]!.dataset.state = st;
        zoneState[i] = st;
      }
    });
  };

  /** Senkrechter Regler: überall auf der Schiene antippen oder ziehen; Pfeiltasten für die Tastatur */
  const slider = (i: number) => {
    const knob = h('span', { class: 'cool-knob', 'aria-hidden': 'true' });
    const track = h('div', { class: 'cool-track', role: 'slider', tabindex: '0', 'aria-label': `Kühlung ${sim.zones[i]!.name}`, 'aria-valuemin': '0', 'aria-valuemax': '100' }, [
      h('span', { class: 'cool-fill', 'aria-hidden': 'true' }),
      h('span', { class: 'cool-end top', 'aria-hidden': 'true', text: 'kalt' }),
      h('span', { class: 'cool-end bottom', 'aria-hidden': 'true', text: 'aus' }),
      knob,
    ]);
    /** ein Weg für Finger und Tastatur: Wert, Anzeige, Screenreader, Klick */
    const set = (raw: number, quiet = false) => {
      // 10-%-Schritte: am Handy gut zu treffen
      const v = Math.round(clamp(raw, 0, 1) * 10) / 10;
      const changed = v !== sim.zones[i]!.power;
      sim.setPower(i, v);
      track.setAttribute('aria-valuenow', String(Math.round(v * 100)));
      track.style.setProperty('--p', String(v));
      if (changed && !quiet) api?.sfx.tick();
    };
    const setFrom = (e: PointerEvent) => {
      const r = track.getBoundingClientRect();
      set(1 - (e.clientY - r.top) / r.height);
    };
    set(sim.zones[i]!.power, true);
    track.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      track.setPointerCapture(e.pointerId);
      setFrom(e);
    });
    track.addEventListener('pointermove', (e) => {
      if (track.hasPointerCapture(e.pointerId)) setFrom(e);
    });
    track.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 0.1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -0.1 : 0;
      if (!step) return;
      e.preventDefault();
      set(sim.zones[i]!.power + step);
    });
    return track;
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const zones = sim.zones.map((z, i) => {
        const lcd = h('div', { class: 'cool-lcd' });
        const trend = h('div', { class: 'cool-trend' });
        const mark = h('span', { class: 'cool-mark', 'aria-hidden': 'true' });
        // Pfeil: dorthin läuft die Temperatur bei dieser Reglerstellung
        const aim = h('span', { class: 'cool-aim', 'aria-hidden': 'true' });
        const pct = h('div', { class: 'cool-pct' });
        const thermo = h('div', { class: 'cool-thermo', 'aria-hidden': 'true' }, [
          h('span', { class: 'cool-band', style: `bottom:${pos(CFG.minC)}%;height:${pos(CFG.maxC) - pos(CFG.minC)}%` }),
          h('span', { class: 'cool-tick', style: `bottom:${pos(CFG.maxC)}%`, text: String(CFG.maxC) }),
          h('span', { class: 'cool-tick', style: `bottom:${pos(CFG.minC)}%`, text: String(CFG.minC) }),
          mark,
          aim,
        ]);
        const card = h('div', { class: 'cool-zone', 'data-state': 'ok' }, [
          h('div', { class: 'cool-name', text: z.name }),
          lcd,
          trend,
          h('div', { class: 'cool-ctl' }, [thermo, slider(i)]),
          h('div', { class: 'cool-fan' }, [h('span', { text: 'Kühlung' }), pct]),
        ]);
        lcds.push(lcd);
        marks.push(mark);
        aims.push(aim);
        cards.push(card);
        pcts.push(pct);
        trends.push(trend);
        zoneState.push('ok');
        return card;
      });
      root.append(
        h('div', { class: 'cool' }, [
          h('div', { class: 'cool-win' }, [
            h('div', { class: 'cool-head', 'aria-hidden': 'true' }, [
              h('b', { text: 'Gebäudeleittechnik' }),
              h('span', { text: 'Serverraum UG · Klimagerät 1: ' }),
              h('span', { class: 'cool-fault', text: 'STÖRUNG' }),
            ]),
            h('div', { class: 'cool-zones' }, zones),
          ]),
          reply,
        ]),
      );
      render();
    },
    update(dt) {
      sim.update(dt);
      for (const ev of sim.drain()) {
        setText(reply, ev.text);
        reply.dataset.kind = ev.delta > 0 ? 'hot' : 'cold';
        const targets = ev.zone >= 0 ? [cards[ev.zone]!] : cards;
        for (const c of targets) juice(c, [{ transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], 240);
        api?.sfx.tick();
      }
      render();
    },
    score: () => sim.score(),
    status: () => `im grünen Bereich: ${Math.round(sim.okShare * 100)} %`,
  };
}
