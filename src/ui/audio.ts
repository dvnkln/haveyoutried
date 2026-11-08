/**
 * Synthetisierte Soundeffekte (Web Audio, keine Assets).
 * Der Klick ist ein Cherry-MX-Switch nach Wahl: nur gefiltertes Rauschen,
 * jeder Anschlag leicht anders, Drücken und Loslassen getrennt.
 */

import { TAP_SOUND_IDS } from '../core/state';

type AudioCtor = typeof AudioContext;

export interface SoundSettings {
  sound: boolean;
  volume: number;
  tapSound: string;
}

/** Ein Geräuschanteil: gefiltertes Rauschen mit zufälliger Frequenz und Dauer. */
interface Band {
  freq: [number, number];
  gain: number;
  q: number;
  dur: [number, number];
  type?: BiquadFilterType;
}

interface SwitchProfile {
  label: string;
  hint: string;
  /** Klick des Click-Jackets beim Drücken (nur klickende Switches) */
  click?: Band;
  /** Kratzen am taktilen Druckpunkt */
  bump?: Band;
  /** Taste setzt unten auf */
  bottom: Band;
  /** Zeit zwischen Druckbeginn und Aufsetzen in s */
  travel: [number, number];
  /** Klick beim Hochfahren (klickende Switches) */
  releaseClick?: Band;
  /** Stößel schlägt beim Loslassen oben an */
  top: Band;
  /** harter Kunststoff-Transient für Definition auf Handy-Lautsprechern */
  tick: number;
}

const b = (freq: [number, number], gain: number, q: number, dur: [number, number], type?: BiquadFilterType): Band => ({
  freq,
  gain,
  q,
  dur,
  type,
});

/** Profile nach Klangcharakter der echten Switches. Frequenzen bewusst über ~500 Hz (Handy-Lautsprecher). */
export const SWITCHES = {
  blue: {
    label: 'MX Blue',
    hint: 'klickend',
    click: b([4300, 5800], 0.5, 3, [0.007, 0.012]),
    bottom: b([1150, 1750], 0.32, 2, [0.014, 0.024]),
    travel: [0.006, 0.014],
    releaseClick: b([3600, 4900], 0.24, 2.6, [0.006, 0.01]),
    top: b([1300, 1900], 0.08, 2, [0.01, 0.014]),
    tick: 0.2,
  },
  green: {
    label: 'MX Green',
    hint: 'klickend, schwer',
    click: b([3500, 4700], 0.62, 3, [0.009, 0.014]),
    bottom: b([950, 1450], 0.42, 2, [0.016, 0.026]),
    travel: [0.009, 0.017],
    releaseClick: b([3200, 4300], 0.36, 2.6, [0.008, 0.012]),
    top: b([1200, 1700], 0.14, 2, [0.01, 0.014]),
    tick: 0.22,
  },
  brown: {
    label: 'MX Brown',
    hint: 'taktil, leise',
    bump: b([5500, 7500], 0.07, 0.8, [0.015, 0.025], 'highpass'),
    bottom: b([1100, 1600], 0.42, 2, [0.016, 0.026]),
    travel: [0.01, 0.018],
    top: b([1500, 2300], 0.16, 2.2, [0.008, 0.012]),
    tick: 0.1,
  },
  red: {
    label: 'MX Red',
    hint: 'linear, leicht',
    bottom: b([1200, 1800], 0.4, 1.8, [0.014, 0.022]),
    travel: [0.004, 0.009],
    top: b([1600, 2400], 0.15, 2, [0.006, 0.01]),
    tick: 0.12,
  },
  black: {
    label: 'MX Black',
    hint: 'linear, schwer',
    bottom: b([850, 1250], 0.52, 2, [0.018, 0.03]),
    travel: [0.008, 0.014],
    top: b([1700, 2600], 0.26, 2.4, [0.006, 0.01]),
    tick: 0.14,
  },
  silent: {
    label: 'MX Silent Red',
    hint: 'gedämpft',
    bottom: b([600, 900], 0.5, 0.7, [0.02, 0.032], 'lowpass'),
    travel: [0.004, 0.009],
    top: b([800, 1100], 0.06, 0.7, [0.01, 0.016], 'lowpass'),
    tick: 0,
  },
} satisfies Record<(typeof TAP_SOUND_IDS)[number], SwitchProfile>;

export type SwitchId = (typeof TAP_SOUND_IDS)[number];
const DEFAULT_SWITCH: SwitchId = 'blue';

const profile = (id: string): SwitchProfile => SWITCHES[id as SwitchId] ?? SWITCHES[DEFAULT_SWITCH];

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  constructor(private settings: () => SoundSettings) {}

  /** Muss aus einer Nutzergeste heraus aufgerufen werden (Browser-Autoplay-Regeln). */
  unlock(): void {
    // Sound aus: Engine gar nicht erst starten bzw. pausieren
    // (manche Android-Geräte unterdrücken Vibration, solange Audio läuft)
    if (!this.settings().sound) {
      if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {});
      return;
    }
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      const master = ctx.createGain();
      master.connect(comp).connect(ctx.destination);

      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.master = master;
      this.noise = noise;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  /** Zustand der Audio-Engine für die Diagnose */
  state(): string {
    return this.ctx ? this.ctx.state : 'nicht gestartet';
  }

  /** Kontext, falls Sound an und Audio freigegeben; setzt die Lautstärke. */
  private ready(): { ctx: AudioContext; out: GainNode; t: number } | null {
    const s = this.settings();
    if (!s.sound || !this.ctx || !this.master || this.ctx.state !== 'running') return null;
    this.master.gain.value = s.volume * 0.8;
    return { ctx: this.ctx, out: this.master, t: this.ctx.currentTime + 0.005 };
  }

  // --- Bausteine ---

  private env(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(out);
    return g;
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    t: number,
    peak: number,
    decay: number,
    out?: AudioNode,
    attack = 0.003,
  ): void {
    const r = this.ready();
    if (!r) return;
    const osc = r.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + decay);
    osc.connect(this.env(r.ctx, out ?? r.out, t, peak, attack, decay));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  private hiss(t: number, peak: number, decay: number, filter: BiquadFilterType, freq: number, q = 1): void {
    const r = this.ready();
    if (!r || !this.noise) return;
    const src = r.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = r.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(r.ctx, r.out, t, peak, 0.001, decay));
    // zufälliger Startpunkt im Rauschen = jedes Klacken klingt minimal anders
    src.start(t, Math.random() * 0.9, decay + 0.05);
  }

  private lowpass(cutoff: number): BiquadFilterNode | null {
    const r = this.ready();
    if (!r) return null;
    const f = r.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.connect(r.out);
    return f;
  }

  // --- Effekte ---

  /** Zufall im Bereich [a, b] */
  private rnd(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  private band(t: number, x: Band, level: number, freqScale = 1): void {
    this.hiss(t, x.gain * level, this.rnd(...x.dur), x.type ?? 'bandpass', this.rnd(...x.freq) * freqScale, x.q);
  }

  /** Taste drücken („Ticket schließen“). */
  tap(id = this.settings().tapSound): void {
    const r = this.ready();
    if (!r) return;
    const p = profile(id);
    const t = r.t + this.rnd(0, 0.004);
    const level = this.rnd(0.8, 1.1);
    // ab und zu eine „größere“ Taste: tiefer, mit Stabilisator-Klappern
    const big = Math.random() < 0.1;

    if (p.click) {
      this.band(t, p.click, level);
      // zweite, leicht versetzte Klickkomponente = mehr Mechanik, weniger „sauber“
      this.hiss(t + this.rnd(0.001, 0.003), p.click.gain * 0.45 * level, 0.006, 'highpass', this.rnd(6500, 8500), 0.7);
    }
    if (p.bump) this.band(t, p.bump, level);

    const tb = t + this.rnd(...p.travel);
    this.band(tb, p.bottom, level * (big ? 1.4 : 1), big ? 0.6 : 1);
    if (p.tick > 0) this.hiss(tb, p.tick * level, 0.004, 'highpass', this.rnd(4500, 6000), 0.7);
    if (big) this.hiss(tb + this.rnd(0.008, 0.014), 0.12, 0.01, 'bandpass', this.rnd(2500, 3200), 3);
  }

  /** Taste loslassen. */
  release(id = this.settings().tapSound): void {
    const r = this.ready();
    if (!r) return;
    const p = profile(id);
    const t = r.t + this.rnd(0, 0.006);
    const level = this.rnd(0.7, 1);
    if (p.releaseClick) this.band(t, p.releaseClick, level);
    this.band(t + this.rnd(0.002, 0.006), p.top, level);
  }

  /** Vorschau: einmal drücken und loslassen. */
  preview(id: string): void {
    this.tap(id);
    setTimeout(() => this.release(id), 95);
  }

  /** Generator gekauft: zweitöniges „Ka-ching“. */
  buy(): void {
    const r = this.ready();
    if (!r) return;
    this.tone('sine', 120, 50, r.t, 0.4, 0.08);
    this.tone('triangle', 783.99, 783.99, r.t, 0.18, 0.12);
    this.tone('triangle', 1174.66, 1174.66, r.t + 0.07, 0.2, 0.28);
    this.hiss(r.t + 0.07, 0.07, 0.2, 'highpass', 6500);
  }

  /** Upgrade gekauft: aufsteigendes Arpeggio. */
  upgrade(): void {
    const r = this.ready();
    if (!r) return;
    [1046.5, 1318.51, 1567.98, 2093].forEach((f, i) => {
      this.tone('triangle', f, f, r.t + i * 0.055, 0.16, 0.22);
      this.tone('square', f / 2, f / 2, r.t + i * 0.055, 0.025, 0.12);
    });
    this.hiss(r.t + 0.2, 0.06, 0.35, 'highpass', 8000);
  }

  /** Meilenstein: kleine Chiptune-Fanfare. */
  milestone(): void {
    const r = this.ready();
    const lp = this.lowpass(3200);
    if (!r || !lp) return;
    const seq: [number, number, number][] = [
      [783.99, 0, 0.07],
      [783.99, 0.09, 0.07],
      [783.99, 0.18, 0.07],
      [1046.5, 0.28, 0.4],
    ];
    for (const [f, dt, d] of seq) this.tone('square', f, f, r.t + dt, 0.09, d, lp);
    this.tone('triangle', 261.63, 261.63, r.t + 0.28, 0.2, 0.4);
  }

  /** Neues freigeschaltet: Monitoring-Ping. */
  unlockPing(): void {
    const r = this.ready();
    if (!r) return;
    this.tone('sine', 1567.98, 1567.98, r.t, 0.14, 0.18);
    this.tone('sine', 2093, 2093, r.t + 0.12, 0.12, 0.3);
  }

  /** Neuer Anrufer: deutsches Freizeichen (425 Hz), ganz kurz und leise. */
  ring(): void {
    const r = this.ready();
    if (!r) return;
    for (const dt of [0, 0.11]) {
      this.tone('sine', 425, 425, r.t + dt, 0.05, 0.07, undefined, 0.01);
      this.tone('sine', 850, 850, r.t + dt, 0.015, 0.07, undefined, 0.01);
    }
  }

  /** Pager: drei kurze, hohe Piepser. */
  pager(): void {
    const r = this.ready();
    const lp = this.lowpass(5000);
    if (!r || !lp) return;
    for (const dt of [0, 0.13, 0.26]) this.tone('square', 2900, 2900, r.t + dt, 0.07, 0.07, lp, 0.004);
  }

  /** Gutes Event-Ergebnis */
  good(): void {
    this.upgrade();
  }

  /** Geht nicht: tiefes „Nope“. */
  error(): void {
    const r = this.ready();
    const lp = this.lowpass(900);
    if (!r || !lp) return;
    this.tone('square', 150, 95, r.t, 0.14, 0.16, lp);
  }

  /** Umschalten (Tabs, Einstellungen): leises Tick. */
  tick(): void {
    const r = this.ready();
    if (!r) return;
    this.hiss(r.t, 0.12, 0.015, 'bandpass', 5000, 2);
  }
}
