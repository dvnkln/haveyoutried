import { CONFIG } from '../config';

/**
 * Synthetisierte Soundeffekte (Web Audio, keine Assets).
 * Leitidee: kurz, knackig, leicht variiert – und beim schnellen Tippen
 * steigt eine Pentatonik-Melodie auf und ab, damit Serien „klingen“.
 */

type AudioCtor = typeof AudioContext;

// Pentatonik über gut zwei Oktaven (G4 … C7)
const PENTA = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

export interface SoundSettings {
  sound: boolean;
  volume: number;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private combo = 0;
  private lastTap = 0;

  constructor(private settings: () => SoundSettings) {}

  /** Muss aus einer Nutzergeste heraus aufgerufen werden (Browser-Autoplay-Regeln). */
  unlock(): void {
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

  /** Ticket schließen: Tastenklacken + Bass-Plopp + Melodieton der Serie. */
  tap(): void {
    const r = this.ready();
    if (!r) return;
    const nowMs = performance.now();
    this.combo = nowMs - this.lastTap < CONFIG.comboWindowMs ? this.combo + 1 : 0;
    this.lastTap = nowMs;

    const v = 1 + (Math.random() - 0.5) * 0.08;
    this.hiss(r.t, 0.35, 0.028, 'bandpass', 3200 * v, 1.2);
    this.tone('sine', 170 * v, 55, r.t, 0.55, 0.09);

    // Ping-Pong durch die Pentatonik
    const span = PENTA.length - 1;
    const pos = this.combo % (span * 2);
    const idx = pos <= span ? pos : span * 2 - pos;
    const note = PENTA[idx] ?? PENTA[0]!;
    this.tone('triangle', note, note, r.t, 0.07 + Math.min(this.combo, 20) * 0.002, 0.14);
    // jede 10. Serie: kleiner Glitzer
    if (this.combo > 0 && this.combo % 10 === 0) {
      this.tone('sine', note * 2, note * 2, r.t + 0.05, 0.06, 0.25);
      this.hiss(r.t + 0.05, 0.05, 0.12, 'highpass', 7000);
    }
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
