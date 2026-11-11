/**
 * Synthetisierte Soundeffekte (Web Audio, keine Assets).
 * Der Klick ist ein Cherry-MX-Switch nach Wahl: nur gefiltertes Rauschen,
 * jeder Anschlag leicht anders, Drücken und Loslassen getrennt.
 */

import type { OsId } from '../content/systems';
import { TAP_SOUND_IDS } from '../core/state';
import { MELODY_FAST, noteFreq, type Melody, type MelodyStyle } from '../content/melodies';

type AudioCtor = typeof AudioContext;
/** Mindestabstand zwischen zwei Tastenklicks (s) und wie weit sie sich höchstens aufstauen dürfen */
const TAP_SPACING = 0.018;
const TAP_BACKLOG = 0.05;
/** Espresso-Melodie: so weit wird vorausgeplant (s, gegen Lücken bei hängenden Frames); nach so langer Pause fängt sie wieder von vorn an (ms) */
const MELODY_AHEAD = 0.3;
/** Takt des Melodie-Planers (ms) und wie lange er ohne Lebenszeichen vom Spiel weiterläuft */
const MELODY_TICK_MS = 40;
const MELODY_HEARTBEAT_MS = 250;
const MELODY_RESUME_MS = 3_000;
/** Bass in eine Lage, die auch Handylautsprecher noch wiedergeben (55–110 Hz) */
const bassRange = (f: number) => {
  let x = f;
  while (x >= 110) x /= 2;
  while (x < 55) x *= 2;
  return x;
};

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
  private room: ConvolverNode | null = null;

  constructor(private settings: () => SoundSettings) {}

  /**
   * Muss aus einer Nutzergeste heraus aufgerufen werden (Browser-Autoplay-Regeln).
   * Das Promise erfüllt sich, sobald die Engine läuft – wer direkt danach einen
   * Klang braucht (Vorschau, Bestätigung), wartet darauf.
   */
  unlock(): Promise<void> {
    // Sound aus: Engine gar nicht erst starten bzw. pausieren
    // (manche Android-Geräte unterdrücken Vibration, solange Audio läuft)
    if (!this.settings().sound) {
      if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {});
      return Promise.resolve();
    }
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return Promise.resolve();
      // iOS: als Medienwiedergabe gelten, sonst schluckt der Lautlos-Schalter alle Töne (Safari 17+)
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
      const ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 4;
      const master = ctx.createGain();
      master.connect(comp).connect(ctx.destination);

      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      // kleiner Büroraum als Hall: abklingendes, nach hinten dunkler werdendes Rauschen
      const irLen = Math.floor(ctx.sampleRate * 0.7);
      const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        let lp = 0;
        for (let i = 0; i < irLen; i++) {
          const k = i / irLen;
          lp += (Math.random() * 2 - 1 - lp) * (0.9 - 0.75 * k);
          d[i] = lp * Math.exp(-i / (ctx.sampleRate * 0.11));
        }
      }
      const room = ctx.createConvolver();
      room.buffer = ir;
      room.connect(master);

      this.ctx = ctx;
      this.master = master;
      this.noise = noise;
      this.room = room;
    }
    // iOS kennt zusätzlich „interrupted“ (nach Anruf, Sperrbildschirm, App-Wechsel): auch dann neu anwerfen
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') return this.ctx.resume().catch(() => {});
    return Promise.resolve();
  }

  /** Laufende Audio-Engine für eigene Klangketten (Büro-Hintergrund), sonst null */
  context(): AudioContext | null {
    return this.ctx?.state === 'running' ? this.ctx : null;
  }

  /** Zustand der Audio-Engine für die Diagnose */
  state(): string {
    return this.ctx ? this.ctx.state : 'nicht gestartet';
  }

  /** Zeitpunkt (performance.now) des letzten Klangs: wer schon einen eigenen Ton hatte, bekommt kein Klick-Tick dazu */
  lastPlayed = 0;

  /** Kontext, falls Sound an und Audio freigegeben; setzt die Lautstärke. */
  /** mark = zählt als „Ton gespielt“ (lastPlayed); die Espresso-Melodie zählt nicht, sonst bekämen Knöpfe keinen Klick mehr */
  private ready(mark = true): { ctx: AudioContext; out: GainNode; t: number } | null {
    const s = this.settings();
    if (!s.sound || !this.ctx || !this.master || this.ctx.state !== 'running') return null;
    if (mark) this.lastPlayed = performance.now();
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

  private hiss(t: number, peak: number, decay: number, filter: BiquadFilterType, freq: number, q = 1, out?: AudioNode, mark = true): void {
    const r = this.ready(mark);
    if (!r || !this.noise) return;
    const src = r.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = r.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(r.ctx, out ?? r.out, t, peak, 0.001, decay));
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

  // --- Espresso-Melodie: läuft im Takt, solange gehalten wird; ein Daumen = Stufe 1, zwei = Stufe 2 ---
  // desk.render() ruft melody() jeden Frame (= „wird noch gehalten“). Geplant wird über einen eigenen kurzen Takt mit
  // Vorlauf, damit ein hängender Frame keine Lücke reißt. Meldet sich das Spiel nicht mehr (Tab im Hintergrund,
  // losgelassen), hält der Takt die Melodie nach MELODY_HEARTBEAT_MS selbst an.
  private mel: {
    m: Melody;
    level: 1 | 2;
    i: number;
    pos: number;
    next: number;
    planned: { t: number; i: number; pos: number }[];
    beat: number;
    timer: number;
  } | null = null;
  /** wo die zuletzt gespielte Melodie stand (und wann sie angehalten wurde): kurz loslassen = dort weiter */
  private melRest = { id: '', i: 0, pos: 0, at: 0 };
  /** geplante Töne der Melodie: beim Anhalten ausblenden bzw. stumm schalten, statt sie nachklingen oder doppelt laufen zu lassen */
  private melGains: { g: GainNode; start: number; end: number }[] = [];

  /** Melodie spielen bzw. Stufe wechseln (jeden Frame aufrufen, solange gehalten wird) */
  melody(m: Melody, level: 1 | 2): void {
    const r = this.ready(false);
    if (!r) return this.stopMelody();
    if (this.mel?.m !== m) {
      this.stopMelody();
      const rest = this.melRest.id === m.id && performance.now() - this.melRest.at < MELODY_RESUME_MS ? this.melRest : { i: 0, pos: 0 };
      this.mel = { m, level, i: rest.i, pos: rest.pos, next: r.t + 0.03, planned: [], beat: 0, timer: 0 };
      this.mel.timer = window.setInterval(() => this.melodyTick(), MELODY_TICK_MS);
    }
    this.mel.level = level;
    this.mel.beat = performance.now();
    this.melodyTick();
  }

  /** Melodie anhalten: Klingendes kurz ausblenden, noch nicht Gestartetes stumm; nächstes Mal geht es beim ersten nicht gespielten Ton weiter */
  stopMelody(): void {
    const st = this.mel;
    if (!st) return;
    clearInterval(st.timer);
    const now = this.ctx?.currentTime ?? 0;
    const resume = st.planned.find((x) => x.t >= now) ?? { i: st.i, pos: st.pos };
    this.melRest = { id: st.m.id, i: resume.i, pos: resume.pos, at: performance.now() };
    this.mel = null;
    for (const { g, start } of this.melGains) {
      g.gain.cancelScheduledValues(now);
      if (start > now) {
        // noch nicht gestartet: sein Wert ist noch der Standard (1) und würde beim Ausblenden kurz laut ploppen
        g.gain.setValueAtTime(0, now);
      } else {
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      }
    }
    this.melGains = [];
  }

  private melodyTick(): void {
    const st = this.mel;
    if (!st) return;
    const r = this.ready(false);
    // nicht mehr gehalten (kein Frame mehr) oder Ton aus: anhalten
    if (!r || performance.now() - st.beat > MELODY_HEARTBEAT_MS) return this.stopMelody();
    const ctx = r.ctx;
    const { m, level } = st;
    const now = ctx.currentTime;
    const sixteenth = 1 / (m.speed * (level === 2 ? MELODY_FAST : 1));
    // zurück aus einer langen Pause: nichts nachspielen
    if (st.next < now) st.next = now + 0.02;
    st.planned = st.planned.filter((x) => x.t >= now);
    this.melGains = this.melGains.filter((x) => x.end > now);
    while (st.next < now + MELODY_AHEAD) {
      st.planned.push({ t: st.next, i: st.i, pos: st.pos });
      const [n, l] = m.notes[st.i % m.notes.length]!;
      const len = l * sixteenth;
      if (n) {
        const f = noteFreq(n);
        this.melVoice(f, st.next, Math.max(0.12, len * 0.95), m.style, level === 2 ? 1 : 0.9);
        // zwei Daumen: zweite Stimme eine Oktave höher (schlicht, spart Klangbausteine)
        if (level === 2) this.melSimple(f * 2, st.next, Math.max(0.1, len * 0.8), 0.4);
      }
      // Bass auf den Schlägen (zwei Daumen: doppelt so oft), Schlagzeug nur mit zwei Daumen
      for (let k = 0; k < l; k++) {
        const p = st.pos + k;
        const t = st.next + k * sixteenth;
        const beat = p % 4 === 0;
        if (beat || (level === 2 && p % 2 === 0)) {
          const root = m.bass ? m.bass[Math.floor(p / 16) % m.bass.length]! : n;
          if (root) this.melBass(bassRange(noteFreq(root)), t, sixteenth * (level === 2 ? 1.8 : 3.5));
        }
        if (level === 2) {
          if (beat) this.melKick(t);
          this.melHat(t, p % 2 ? 0.05 : 0.09);
        } else if (m.style !== 'classic' && p % 2 === 1) this.melHat(t, 0.04);
      }
      st.pos += l;
      st.next += len;
      st.i++;
    }
  }

  /** Hüllkurve für Melodie-Töne (merkt sich den Ton fürs Ausblenden beim Anhalten) */
  private melGain(t: number, peak: number, len: number): GainNode {
    const g = this.env(this.ctx!, this.master!, t, peak, 0.005, Math.max(0.01, len - 0.005));
    this.melGains.push({ g, start: t, end: t + len });
    return g;
  }

  /** zweite Stimme: ein einziger Oszillator */
  private melSimple(f: number, t: number, len: number, level: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(this.melGain(t, 0.2 * level, len));
    o.start(t);
    o.stop(t + len + 0.02);
  }

  /** Hi-Hat der Melodie (läuft über melGain, damit sie beim Anhalten mit verstummt) */
  private melHat(t: number, peak: number): void {
    if (!this.noise) return;
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    src.connect(hp).connect(this.melGain(t, peak, 0.05));
    src.start(t, Math.random() * 0.9, 0.1);
  }

  private melVoice(f: number, t: number, len: number, style: MelodyStyle, level: number): void {
    const ctx = this.ctx!;
    const g = this.melGain(t, 0.2 * level, len);
    const osc = (type: OscillatorType, mul = 1, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      o.detune.value = detune;
      o.start(t);
      o.stop(t + len + 0.02);
      return o;
    };
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.connect(g);
    if (style === 'classic') {
      // Marimba-artig: Dreieck und leiser Oberton
      lp.frequency.value = 6000;
      osc('triangle').connect(lp);
      const o2 = ctx.createGain();
      o2.gain.value = 0.25;
      osc('sine', 4).connect(o2).connect(lp);
    } else if (style === 'chip') {
      lp.frequency.value = 5000;
      const o = ctx.createGain();
      o.gain.value = 0.6;
      osc('square').connect(o).connect(lp);
    } else if (style === 'synth') {
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + len);
      osc('sawtooth', 1, -8).connect(lp);
      osc('sawtooth', 1, 8).connect(lp);
    } else {
      // Acid: Sägezahn durch resonanten Filter, der zuschnappt
      lp.Q.value = 14;
      lp.frequency.setValueAtTime(600 + Math.random() * 2600, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + len * 0.9);
      osc('sawtooth').connect(lp);
    }
  }

  private melBass(f: number, t: number, len: number): void {
    const ctx = this.ctx!;
    const g = this.melGain(t, 0.28, len);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g);
    o.start(t);
    o.stop(t + len + 0.02);
  }

  private melKick(t: number): void {
    const ctx = this.ctx!;
    const g = this.melGain(t, 0.45, 0.25);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** Startzeit des letzten Tastenklicks (Audio-Zeit) */
  private lastTapAt = 0;

  /** Taste drücken (ein Anschlag am Ticket). */
  tap(id = this.settings().tapSound): void {
    const r = this.ready();
    if (!r) return;
    const p = profile(id);
    // Android rechnet Audio in Blöcken: zwei schnelle Anschläge im selben Block würden exakt gleichzeitig starten
    // und wie einer klingen. Darum mindestens TAP_SPACING auseinander, aber nie mehr als TAP_BACKLOG im Rückstand
    // (sonst hinkt der Klang bei Dauerfeuer immer weiter hinterher; dann lieber einen weglassen).
    const at = Math.max(r.t, this.lastTapAt + TAP_SPACING);
    if (at - r.t > TAP_BACKLOG) return;
    this.lastTapAt = at;
    const t = at + this.rnd(0, 0.004);
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

  /**
   * Startton nach der Anmeldung, je System eigener Charakter (selbst gebaut, keine Originalmelodien).
   * Systeme ohne eigenen Ton: kurzes Ping wie beim Entsperren.
   */
  osStart(os: OsId): void {
    if (os === 'win98') return this.start98();
    this.unlockPing();
  }

  /** 98: warme Fläche, die langsam anschwillt, darüber aufsteigende Glöckchen, ganz unten ein weicher Bass */
  private start98(): void {
    const r = this.ready();
    const out = this.space(0.35);
    if (!r || !out) return;
    const t = r.t;
    this.tone('sine', 69.3, 69.3, t, 0.07, 2.2, out, 0.35);
    // Des-Dur, je zwei leicht verstimmte Stimmen: schwebt wie ein Synth-Pad
    for (const f of [277.18, 349.23, 415.3, 554.37]) {
      this.tone('triangle', f, f, t + 0.05, 0.022, 2.0, out, 0.45);
      this.tone('sine', f * 1.004, f * 1.004, t + 0.05, 0.022, 2.0, out, 0.5);
    }
    // aufsteigend, dann ein heller Abschluss
    [1108.73, 1396.91, 1661.22, 2217.46].forEach((f, i) => this.tone('sine', f, f, t + 0.25 + i * 0.16, 0.045, 0.9, out, 0.01));
    this.tone('sine', 2793.83, 2793.83, t + 0.95, 0.03, 1.3, out, 0.02);
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

  /** Monitoring-Alarm: zweitönige Sirene */
  alarm(): void {
    const r = this.ready();
    const lp = this.lowpass(3200);
    if (!r || !lp) return;
    for (let i = 0; i < 6; i++) {
      const f = i % 2 === 0 ? 880 : 660;
      this.tone('square', f, f, r.t + i * 0.14, 0.09, 0.12, lp, 0.005);
    }
  }

  /** Ticket gelöst: kurzes helles „Pling“, das mit jeder Lösung in Folge eine Stufe höher klettert. */
  solved(streak = 1): void {
    const r = this.ready();
    if (!r) return;
    // Dur-Tonleiter ab C6, nach einer Oktave wieder von vorn
    const steps = [0, 2, 4, 5, 7, 9, 11, 12];
    const f = 1046.5 * 2 ** (steps[(streak - 1) % steps.length]! / 12);
    this.tone('triangle', f, f, r.t, 0.09, 0.12);
    this.tone('sine', f * 1.5, f * 1.5, r.t + 0.05, 0.06, 0.18);
  }

  // --- Bausteine für die Belohnungsklänge ---

  /** Ausgang mit etwas Raumhall (send = Anteil Hall) */
  private space(send: number): AudioNode | null {
    const r = this.ready();
    if (!r) return null;
    const g = r.ctx.createGain();
    g.connect(r.out);
    if (this.room) {
      const s = r.ctx.createGain();
      s.gain.value = send;
      g.connect(s).connect(this.room);
    }
    return g;
  }

  /** Hüllkurve mit Haltephase: einblenden, halten, ausblenden */
  private held(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, hold: number, release: number): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(out);
    return g;
  }

  /** Gefiltertes Rauschen mit Haltephase; f1 lässt den Filter wandern */
  private noiseHeld(
    t: number,
    out: AudioNode,
    o: { peak: number; attack: number; hold: number; release: number; type: BiquadFilterType; f0: number; f1?: number; q?: number },
  ): BiquadFilterNode | null {
    const r = this.ready();
    if (!r || !this.noise) return null;
    const dur = o.attack + o.hold + o.release;
    const src = r.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = r.ctx.createBiquadFilter();
    f.type = o.type;
    f.Q.value = o.q ?? 0.7;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    src.connect(f).connect(this.held(r.ctx, out, t, o.peak, o.attack, o.hold, o.release));
    src.start(t, Math.random() * 0.9);
    src.stop(t + dur + 0.05);
    return f;
  }

  /** Angeschlagenes Metall/Glas: Teiltöne [Verhältnis, Lautstärke, Abklingzeit]; leicht verstimmte Paare schweben */
  private strike(t: number, f: number, peak: number, partials: readonly (readonly [number, number, number])[], out: AudioNode): void {
    for (const [ratio, amp, decay] of partials) {
      this.tone('sine', f * ratio, f * ratio, t, peak * amp, decay, out, 0.001);
      this.tone('sine', f * ratio * 1.0025, f * ratio * 1.0025, t, peak * amp * 0.5, decay * 0.8, out, 0.001);
    }
    this.hiss(t, peak * 0.6, 0.004, 'highpass', 5000, 0.7, out);
  }

  /** Abspielen eines frisch berechneten Puffers über einen Filter */
  private buffer(t: number, data: Float32Array, out: AudioNode, gain: number, filters: BiquadFilterNode[]): void {
    const r = this.ready();
    if (!r) return;
    const buf = r.ctx.createBuffer(1, data.length, r.ctx.sampleRate);
    buf.getChannelData(0).set(data);
    const src = r.ctx.createBufferSource();
    src.buffer = buf;
    const g = r.ctx.createGain();
    g.gain.value = gain;
    let node: AudioNode = src;
    for (const f of filters) node = node.connect(f);
    node.connect(g).connect(out);
    src.start(t);
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode | null {
    const r = this.ready();
    if (!r) return null;
    const f = r.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  /**
   * Knisterndes Papier: einzelne Knackser in zufälligen Abständen, deren Lautstärke stark streut
   * (wenige laute, viele leise). grips = [Start, Länge] in Sekunden, je Griff schwillt die Dichte an und ab.
   */
  private paper(sr: number, dur: number, grips: readonly (readonly [number, number])[], rate: number, bed = 0.025): Float32Array {
    const n = Math.floor(sr * dur);
    const d = new Float32Array(n);
    let amp = 0;
    let fall = 0;
    let max = 1e-6;
    for (let i = 0; i < n; i++) {
      const s = i / sr;
      let dens = 0;
      for (const [g0, gl] of grips) {
        const x = (s - g0) / gl;
        if (x > 0 && x < 1) dens = Math.max(dens, Math.sin(Math.PI * x));
      }
      if (Math.random() < (dens * dens * rate) / sr) {
        // gedeckelt, damit kein einzelner Knackser heraussticht
        amp = Math.min(0.7, amp + 0.06 + 0.45 * Math.random() ** 3);
        fall = Math.exp(-1 / (sr * this.rnd(0.0015, 0.008)));
      }
      amp *= fall;
      d[i] = (Math.random() * 2 - 1) * (amp + bed * dens);
      max = Math.max(max, Math.abs(d[i]!));
    }
    for (let i = 0; i < n; i++) d[i]! /= max;
    return d;
  }

  // --- Belohnungen ---

  /** Chef-Aufgabe erledigt: zweimal aufs Stempelkissen, ein satter Stempel auf den Tisch, dann die Hotelklingel. */
  bossDone(): void {
    const r = this.ready();
    const out = this.space(0.18);
    if (!r || !out) return;
    // Stempelkissen: weich und gedämpft
    for (const dt of [0, 0.12]) {
      this.tone('sine', 210, 150, r.t + dt, 0.2, 0.05, out);
      this.hiss(r.t + dt, 0.1, 0.03, 'lowpass', 800, 0.7, out);
    }
    // Stempel: Tischplatte dröhnt, Holzgriff klackt, Papier gibt einen kurzen Klatscher
    const s = r.t + 0.34;
    this.tone('sine', 140, 62, s, 0.6, 0.13, out);
    this.tone('triangle', 460, 320, s, 0.12, 0.05, out);
    this.hiss(s, 0.3, 0.014, 'bandpass', 1900, 0.8, out);
    this.hiss(s, 0.14, 0.07, 'lowpass', 500, 0.7, out);
    // Hotelklingel: ein heller Schlag mit unharmonischen Teiltönen, lang ausklingend
    this.strike(s + 0.3, 1720, 0.13, [[1, 1, 1.1], [2.38, 0.4, 0.55], [4.1, 0.16, 0.25], [6.3, 0.06, 0.12]], out);
  }

  /** Papierkorb leeren: ein kurzes, weiches Papierknüllen. */
  crumple(): void {
    const r = this.ready();
    const out = this.space(0.08);
    // sanft und dumpf: kaum Höhen, die Knackser gehen im weichen Rascheln auf
    const hp = this.filter('highpass', 300, 0.5);
    const lp = this.filter('lowpass', 2400, 0.5);
    const lp2 = this.filter('lowpass', 2400, 0.5);
    if (!r || !out || !hp || !lp || !lp2) return;
    // ein kurzer Knüll: schnell zupacken, langsamer loslassen
    const grips = [[0, 0.12], [0.06, 0.3]] as const;
    this.buffer(r.t, this.paper(r.ctx.sampleRate, 0.38, grips, 600, 0.35), out, 0.3, [hp, lp, lp2]);
  }

  /** Espresso: Siebträger schabt in die Brühgruppe und rastet ein, die Pumpe brummt, Kaffee läuft in die Tasse. */
  espresso(): void {
    const r = this.ready();
    const out = this.space(0.12);
    if (!r || !out) return;
    // Eindrehen: Metall schabt an Metall, dann rastet er ein
    this.noiseHeld(r.t, out, { peak: 0.05, attack: 0.03, hold: 0.1, release: 0.04, type: 'bandpass', f0: 2600, f1: 4200, q: 5 });
    this.strike(r.t + 0.17, 940, 0.07, [[1, 1, 0.08], [2.53, 0.7, 0.06], [4.16, 0.4, 0.04]], out);
    this.tone('sine', 220, 140, r.t + 0.17, 0.14, 0.05, out);
    // Vibrationspumpe: schnarrendes 50-Hz-Brummen
    const p = r.t + 0.4;
    const pumpLp = this.filter('lowpass', 750, 1.2);
    if (!pumpLp) return;
    pumpLp.connect(out);
    for (const [type, f, peak] of [['sawtooth', 50, 0.14], ['square', 100.4, 0.035]] as const) {
      const osc = r.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      osc.connect(this.held(r.ctx, pumpLp, p, peak, 0.06, 0.62, 0.12));
      osc.start(p);
      osc.stop(p + 0.85);
    }
    // feiner Kaffeestrahl und Blasen in der Tasse
    this.noiseHeld(p + 0.22, out, { peak: 0.025, attack: 0.1, hold: 0.35, release: 0.15, type: 'bandpass', f0: 1500, q: 0.8 });
    for (let i = 0; i < 16; i++) {
      const tt = p + 0.24 + Math.random() * 0.55;
      const f = this.rnd(550, 1250);
      this.tone('sine', f, f * this.rnd(1.4, 1.9), tt, this.rnd(0.025, 0.06), this.rnd(0.015, 0.035), out, 0.002);
    }
  }

  /** VIP-Mail erledigt: Patrone klonkt in die Rohrpost, das Rohr saugt sie fauchend weg, weit hinten kommt sie an. */
  vipSent(): void {
    const r = this.ready();
    const out = this.space(0.15);
    if (!r || !out) return;
    // Patrone in die Klappe: hohles Klonk
    this.tone('sine', 280, 250, r.t, 0.35, 0.12, out);
    this.tone('sine', 720, 700, r.t, 0.12, 0.08, out);
    this.hiss(r.t, 0.2, 0.02, 'bandpass', 1400, 1, out);
    // Sog: Rauschen durchs Rohr; Resonanzen des Rohrs als schmale Bänder, wandert weg (tiefer, leiser)
    const s = r.t + 0.18;
    for (const [f, peak] of [[0, 0.3], [390, 0.3], [780, 0.2], [1170, 0.12]] as const) {
      this.noiseHeld(s, out, f === 0
        ? { peak, attack: 0.05, hold: 0.06, release: 0.5, type: 'bandpass', f0: 2400, f1: 600, q: 0.8 }
        : { peak, attack: 0.05, hold: 0.06, release: 0.5, type: 'bandpass', f0: f, f1: f * 0.8, q: 9 });
    }
    // Ankunft am anderen Ende: gedämpftes Rumms
    const lp = this.filter('lowpass', 450);
    if (!lp) return;
    lp.connect(out);
    this.tone('sine', 150, 70, s + 0.75, 0.3, 0.08, lp);
    this.tone('triangle', 300, 260, s + 0.75, 0.12, 0.05, lp);
  }

  /** Achievement: Glockenspiel „ta-daa“ mit Glitzern. */
  achievement(): void {
    const r = this.ready();
    const out = this.space(0.25);
    if (!r || !out) return;
    const glock = [[1, 1, 0.9], [2.76, 0.22, 0.35], [5.4, 0.07, 0.12]] as const;
    this.strike(r.t, 1567.98, 0.09, glock, out);
    for (const f of [2093, 2637.02, 3135.96]) this.strike(r.t + 0.13, f, 0.075, glock, out);
    // weicher Akkord darunter
    for (const f of [523.25, 659.25]) this.tone('sine', f, f, r.t + 0.13, 0.05, 0.8, out, 0.02);
    // Glitzern
    for (let i = 0; i < 9; i++) {
      const f = this.rnd(5000, 8500);
      this.tone('sine', f, f, r.t + 0.2 + i * 0.055 + this.rnd(0, 0.02), 0.03 * (1 - i / 10), 0.07, out, 0.001);
    }
  }

  /** Kauf-Meilenstein: mechanische Registrierkasse, Taste ratscht, „Ching“, Schublade rollt raus, Münzen klimpern. */
  register(): void {
    const r = this.ready();
    const out = this.space(0.15);
    if (!r || !out) return;
    // Taste: Ratsche mit vier schnellen Zähnen
    for (let i = 0; i < 4; i++) {
      this.hiss(r.t + i * 0.019, 0.14 * (1 - i * 0.15), 0.009, 'bandpass', this.rnd(2500, 3200), 3, out);
      this.tone('triangle', 1100, 900, r.t + i * 0.019, 0.025, 0.012, out);
    }
    // Klingel
    const c = r.t + 0.1;
    this.strike(c, 2850, 0.12, [[1, 1, 0.9], [2.13, 0.45, 0.4], [3.35, 0.2, 0.2]], out);
    // Schublade: rollt mit Rattern raus und schlägt an
    this.noiseHeld(c + 0.02, out, { peak: 0.07, attack: 0.03, hold: 0.14, release: 0.04, type: 'lowpass', f0: 600 });
    for (let i = 0; i < 6; i++) this.hiss(c + 0.03 + i * 0.03, 0.05, 0.012, 'bandpass', this.rnd(700, 1100), 3, out);
    const s = c + 0.22;
    this.tone('sine', 130, 75, s, 0.28, 0.08, out);
    this.hiss(s, 0.12, 0.02, 'bandpass', 1500, 1, out);
    // Münzen im Fach
    for (let i = 0; i < 5; i++) {
      this.strike(s + 0.01 + Math.random() * 0.14, this.rnd(3600, 6200), 0.03, [[1, 1, 0.09], [1.62, 0.5, 0.06]], out);
    }
  }

  /**
   * Knarzendes Scharnier: Haftreibung als Impulsfolge, deren Takt unruhig schwankt
   * (langsam anlaufen, schneller, wieder langsamer). Die Resonanzen kommen über Filter dazu.
   */
  private creak(sr: number, dur: number): Float32Array {
    const n = Math.floor(sr * dur);
    const d = new Float32Array(n);
    let phase = 0;
    let rate = 25;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const target = 25 + 75 * Math.sin(Math.PI * x);
      rate += (target - rate) * 0.002 + (Math.random() - 0.5) * 1.2;
      rate = Math.max(12, Math.min(130, rate));
      phase += rate / sr;
      if (phase >= 1) {
        phase -= 1;
        d[i] = (0.6 + 0.4 * Math.random()) * Math.sqrt(Math.sin(Math.PI * x));
      }
    }
    return d;
  }

  /** Kündigen: Klinke runter, die Tür knarzt auf, fällt hinter einem ins Schloss, Flurhall. */
  quit(): void {
    const r = this.ready();
    const out = this.space(0.45);
    if (!r || !out) return;
    // Klinke: runter und Falle schnappt zurück
    this.strike(r.t, 2100, 0.06, [[1, 1, 0.04], [2.7, 0.5, 0.025]], out);
    this.strike(r.t + 0.07, 1800, 0.05, [[1, 1, 0.04], [2.7, 0.5, 0.025]], out);
    // Scharnier knarzt
    const c = r.t + 0.16;
    const creak = this.creak(r.ctx.sampleRate, 0.7);
    for (const [f, q, gain] of [[650, 14, 14], [1450, 12, 9], [2600, 10, 3.5]] as const) {
      const bp = this.filter('bandpass', f, q);
      if (bp) this.buffer(c, creak, out, gain, [bp]);
    }
    // Tür schwingt zu und knallt: Türblatt wummert, Holz klopft, harter Anschlag
    this.noiseHeld(c + 0.75, out, { peak: 0.05, attack: 0.14, hold: 0.02, release: 0.05, type: 'lowpass', f0: 300, f1: 500 });
    const s = c + 0.95;
    this.tone('sine', 78, 40, s, 0.75, 0.3, out);
    this.tone('sine', 190, 120, s, 0.3, 0.12, out);
    this.tone('triangle', 320, 270, s, 0.12, 0.06, out);
    this.hiss(s, 0.45, 0.035, 'lowpass', 2400, 0.7, out);
    this.hiss(s, 0.18, 0.008, 'highpass', 3000, 0.7, out);
    this.strike(s + 0.012, 2300, 0.05, [[1, 1, 0.03], [2.7, 0.5, 0.02]], out);
    // Rahmen klappert nach
    for (let i = 0; i < 4; i++) {
      this.hiss(s + 0.08 + i * 0.045 + this.rnd(0, 0.015), 0.09 * 0.65 ** i, 0.016, 'bandpass', this.rnd(1100, 1800), 4, out);
    }
  }

  /** Pager-Einsatz gelöst: Quittier-Taste klickt, das Gerät piepst „alles klar“ (gleiche Stimme wie der Alarm, aber aufwärts). */
  pagerAck(): void {
    const r = this.ready();
    const lp = this.lowpass(5000);
    if (!r || !lp) return;
    this.hiss(r.t, 0.12, 0.008, 'bandpass', 3500, 2);
    this.tone('triangle', 900, 700, r.t, 0.05, 0.015);
    this.tone('square', 2175, 2175, r.t + 0.08, 0.06, 0.06, lp, 0.004);
    this.tone('square', 2900, 2900, r.t + 0.17, 0.07, 0.16, lp, 0.004);
  }

  /** Incident-Schritt geschafft */
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

  /** Gummiente: Quietschen, hoch und wieder runter. */
  squeak(): void {
    const r = this.ready();
    const lp = this.lowpass(2600);
    if (!r || !lp) return;
    const p = this.rnd(0.9, 1.15);
    this.tone('triangle', 900 * p, 1500 * p, r.t, 0.12, 0.09, lp, 0.01);
    this.tone('triangle', 1500 * p, 800 * p, r.t + 0.09, 0.1, 0.14, lp, 0.005);
  }

  /** Fliegende Espressotasse kommt: Tasse klirrt zweimal auf der Untertasse, dazu Flügelflattern. */
  cup(): void {
    const r = this.ready();
    if (!r) return;
    // Porzellan: hoher Grundton mit unharmonischem Oberton, kurz und hell
    for (const [dt, p] of [[0, 1], [0.16, 1.06]] as const) {
      this.tone('sine', 2350 * p, 2330 * p, r.t + dt, 0.1, 0.22);
      this.tone('sine', 5870 * p, 5850 * p, r.t + dt, 0.035, 0.1);
      this.hiss(r.t + dt, 0.05, 0.012, 'highpass', 6000);
    }
    // Flattern: weiche Luftstöße
    for (let i = 0; i < 6; i++) this.hiss(r.t + 0.35 + i * 0.075, 0.09, 0.04, 'bandpass', 900, 0.8);
  }

  /** Umschalten (Tabs, Einstellungen): leises Tick. */
  tick(): void {
    const r = this.ready();
    if (!r) return;
    this.hiss(r.t, 0.12, 0.015, 'bandpass', 5000, 2);
  }

  // --- Strom: Netzschalter, Leuchtstoffröhren, Röhrenmonitor ---

  /** Netzbrummen (100 Hz und Obertöne), weich ein- und ausgeblendet */
  private hum(t: number, peak: number, dur: number, attack = 0.06): void {
    const lp = this.lowpass(420);
    if (!lp) return;
    this.tone('sawtooth', 100, 100, t, peak, dur, lp, attack);
    this.tone('sine', 100, 100, t, peak * 0.8, dur, undefined, attack);
  }

  /** Entmagnetisieren beim Einschalten: tiefes, schwankendes „Bwoing“ */
  private degauss(t: number, dur: number, peak: number): void {
    const r = this.ready();
    if (!r) return;
    const { ctx } = r;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    // Tremolo, das langsamer wird: die Spule klingt aus
    const trem = ctx.createGain();
    trem.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(17, t);
    lfo.frequency.linearRampToValueAtTime(5, t + dur);
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(trem.gain);
    osc.connect(lp).connect(trem).connect(this.env(ctx, r.out, t, peak, 0.015, dur));
    for (const o of [osc, lfo]) {
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  /** Netzschalter am Startbildschirm: kräftiges Kipp-Klack mit Nachfedern */
  powerKlack(): void {
    const r = this.ready();
    if (!r) return;
    this.hiss(r.t, 0.55, 0.03, 'bandpass', 1300, 1.4);
    this.tone('sine', 150, 55, r.t, 0.4, 0.08);
    this.hiss(r.t + 0.05, 0.16, 0.018, 'bandpass', 2600, 2);
  }

  /** Leuchtstoffröhren an: Starter tickt, Röhre zündet mit leisem Ping, Brummen klingt aus. slow = zwei Röhren nacheinander */
  tubeOn(slow = false): void {
    const r = this.ready();
    if (!r) return;
    const tubes: { ticks: number[]; at: number }[] = slow
      ? [
          { ticks: [0, 0.15, 0.42], at: 0.5 },
          { ticks: [1.18, 1.37], at: 1.55 },
        ]
      : [{ ticks: [0, 0.09, 0.27], at: 0.33 }];
    for (const tube of tubes) {
      for (const dt of tube.ticks) this.hiss(r.t + dt, 0.2, 0.012, 'bandpass', this.rnd(2800, 3600), 4);
      this.tone('sine', 3150, 3100, r.t + tube.at, 0.025, 0.3);
      this.hum(r.t + tube.at, 0.035, slow ? 1.6 : 1.1);
    }
  }

  /** Leuchtstoffröhren aus: Relais-Klack, Brummen fällt ab */
  tubeOff(): void {
    const r = this.ready();
    if (!r) return;
    this.hiss(r.t, 0.3, 0.02, 'bandpass', 1800, 2);
    this.tone('sine', 110, 70, r.t, 0.18, 0.05);
    this.hum(r.t, 0.03, 0.45, 0.002);
  }

  /** Röhrenmonitor an: dumpfes „Tunk“, Entmagnetisieren, leises hohes Pfeifen. slow = erster Start, volles Bwoing */
  crtOn(slow = false): void {
    const r = this.ready();
    if (!r) return;
    this.tone('sine', 95, 42, r.t, 0.45, 0.14);
    this.hiss(r.t, 0.12, 0.02, 'lowpass', 600);
    if (slow) this.degauss(r.t + 0.45, 1.0, 0.32);
    else this.degauss(r.t + 0.08, 0.5, 0.22);
    // Zeilentrafo: fast unhörbar hoch, kommt mit dem Bild
    this.tone('sine', 11800, 12000, r.t + (slow ? 0.4 : 0.05), 0.012, slow ? 1.6 : 0.9, undefined, 0.2);
    // Bild baut sich auf: kurzes Knistern der Bildröhre
    this.hiss(r.t + (slow ? 0.35 : 0.06), 0.05, slow ? 0.5 : 0.25, 'highpass', 4500);
  }

  /** Röhrenmonitor aus: „Zapp“, Pfeifen fällt ab */
  crtOff(): void {
    const r = this.ready();
    if (!r) return;
    this.hiss(r.t, 0.22, 0.13, 'highpass', 3000);
    this.tone('sine', 220, 40, r.t, 0.22, 0.16);
    this.tone('sine', 12000, 7000, r.t + 0.02, 0.012, 0.6);
  }
}
