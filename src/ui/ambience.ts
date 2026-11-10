import type { GameState } from '../core/state';
import type { Sfx } from './audio';

/**
 * Büro-Hintergrund: leises Raumrauschen (Lüftung), ein Hauch Röhrenbrummen und ganz leise Server-Lüfter,
 * dazu ab und zu gedämpfte Geräusche aus dem Nachbarbüro (Kollege tippt, Drucker, Telefon, Stuhl,
 * Wasserspender, Kaffeemaschine). Alles deutlich leiser als die Spielgeräusche und ohne Bezug zum Tippen:
 * man soll es als Raum wahrnehmen, nicht hören.
 */

/**
 * Pegel (vor dem Regler „Büro-Geräusche“). Bei Standard-Einstellung (0,4) ungefähr: Lüftung −45 dBFS,
 * Server-Lüfter (volle Infrastruktur) −59, Röhren −60, nebenan Spitzen −37; ein Tastenanschlag liegt bei −15.
 */
const LEVEL = {
  air: 0.03,
  hum: 0.0025,
  /** Server-Lüfter bei voller Infrastruktur; bewusst kaum hörbar */
  fans: 0.006,
  /** Geräusche von nebenan */
  event: 0.035,
} as const;
/** Abstand der Geräusche von nebenan (ms) */
const EVENT_MIN_MS = 15_000;
const EVENT_MAX_MS = 40_000;
/** Ein- und Ausblenden des Teppichs (s) */
const FADE_S = 1.5;

type Kind = 'typing' | 'printer' | 'phone' | 'chair' | 'water' | 'coffee';

export class Ambience {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  /** Klangkette läuft (nur solange man sie hören kann; sonst abgebaut, damit das Handy schlafen kann) */
  private running = false;
  private sources: AudioScheduledSourceNode[] = [];
  private bus: GainNode | null = null;
  private air: GainNode | null = null;
  private hum: GainNode | null = null;
  private fans: GainNode | null = null;
  /** Geräusche von nebenan: gedämpft (Tiefpass), wie durch die Wand */
  private room: BiquadFilterNode | null = null;
  private eventTimer = 0;
  private stopTimer = 0;
  /** zuletzt eingestellte Werte: nur bei Änderung nachregeln */
  private applied = '';

  constructor(
    private readonly sfx: Sfx,
    private readonly state: () => GameState,
    /** Licht an? (sonst nur Lüftung und Server: das Büro ist leer) */
    private readonly lit: () => boolean,
  ) {
    // nachregeln: Einstellungen, Licht, Infrastruktur, sichtbar (geändert wird nur, was sich geändert hat)
    window.setInterval(() => this.update(), 500);
    document.addEventListener('visibilitychange', () => this.update());
    this.scheduleEvent();
  }

  /** Klangkette aufbauen, sobald die Audio-Engine läuft */
  private start(): boolean {
    if (this.running) return true;
    const ctx = this.sfx.context();
    if (!ctx) return false;
    this.ctx = ctx;
    if (!this.noise) {
      const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = noise.getChannelData(0);
      // leicht „rosa“ Rauschen (tiefer, weicher als weißes)
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
        data[i] = last * 6;
      }
      this.noise = noise;
    }
    this.sources = [];
    this.applied = '';

    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(ctx.destination);
    this.bus = bus;

    // Lüftung: tiefes Rauschen, das ganz langsam atmet (eigene Stufe, ±25 % um 1)
    const breath = ctx.createGain();
    breath.gain.value = 1;
    this.air = this.loopNoise(450, 'lowpass', 0.7, breath);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.25;
    lfo.connect(depth).connect(breath.gain);
    lfo.start();
    this.sources.push(lfo);

    // Leuchtstoffröhren: 100 Hz und ein Oberton, kaum hörbar
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    this.hum.connect(bus);
    for (const [f, g] of [
      [100, 1],
      [200, 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      const lvl = ctx.createGain();
      lvl.gain.value = g;
      osc.connect(lvl).connect(this.hum);
      osc.start();
      this.sources.push(osc);
    }

    // Server-Lüfter: mittleres, gleichmäßiges Rauschen
    this.fans = this.loopNoise(1100, 'bandpass', 0.8);

    // nebenan: alles durch einen Tiefpass
    this.room = ctx.createBiquadFilter();
    this.room.type = 'lowpass';
    this.room.frequency.value = 1700;
    this.room.connect(bus);
    this.running = true;
    return true;
  }

  /** Klangkette abbauen (Regler auf 0, Sound aus, App im Hintergrund): danach rechnet das Audio nichts mehr */
  private stop(): void {
    if (!this.running) return;
    for (const src of this.sources) {
      try {
        src.stop();
      } catch {
        // schon gestoppt
      }
      src.disconnect();
    }
    this.sources = [];
    this.bus?.disconnect();
    this.bus = this.air = this.hum = this.fans = this.room = null;
    this.running = false;
  }

  /** Rauschen in Schleife → Filter → (Zwischenstufe) → eigener Pegel → Bus */
  private loopNoise(freq: number, type: BiquadFilterType, q: number, via?: GainNode): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    if (via) src.connect(f).connect(via).connect(g).connect(this.bus!);
    else src.connect(f).connect(g).connect(this.bus!);
    src.start(0, Math.random() * 2);
    this.sources.push(src);
    return g;
  }

  /** Lautstärke des ganzen Teppichs: eigener Regler, nur bei Sound an und sichtbarer Seite */
  private level(): number {
    const s = this.state().settings;
    if (!s.sound || document.hidden) return 0;
    return s.ambienceVolume;
  }

  private update(): void {
    const level = this.level();
    if (level > 0) {
      clearTimeout(this.stopTimer);
      this.stopTimer = 0;
      if (!this.start()) return;
    }
    if (!this.running) return;
    const lit = this.lit();
    const fans = Math.round(this.fanShare() * 20) / 20;
    const key = `${level}|${lit}|${fans}`;
    if (key === this.applied) return;
    this.applied = key;
    const t = this.ctx!.currentTime;
    const ramp = (g: GainNode | null, v: number) => g?.gain.setTargetAtTime(v, t, FADE_S / 3);
    ramp(this.bus, level);
    // nicht zu hören: ausblenden, dann abbauen
    if (level <= 0) {
      if (!this.stopTimer) this.stopTimer = window.setTimeout(() => this.stop(), FADE_S * 1_000 + 200);
      return;
    }
    ramp(this.air, LEVEL.air);
    ramp(this.hum, lit ? LEVEL.hum : 0);
    ramp(this.fans, LEVEL.fans * fans);
  }

  /** Server-Lüfter je nach Infrastruktur: 0 bis 1, langsam (logarithmisch) wachsend */
  private fanShare(): number {
    const owned = Object.values(this.state().generators).reduce((n, g) => n + g.owned, 0);
    return Math.min(1, Math.log10(1 + owned) / 3);
  }

  private scheduleEvent(): void {
    clearTimeout(this.eventTimer);
    this.eventTimer = window.setTimeout(
      () => {
        // nur bei Licht (nachts ist nebenan auch keiner) und wenn man es hören kann
        if (this.level() > 0 && this.lit() && this.running) this.play(this.pickKind());
        this.scheduleEvent();
      },
      EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS),
    );
  }

  private pickKind(): Kind {
    const kinds: Kind[] = ['typing', 'typing', 'printer', 'phone', 'chair', 'water'];
    // die Kaffeemaschine gibt's erst, wenn sie gekauft ist
    if (this.state().upgrades.coffee) kinds.push('coffee', 'coffee');
    return kinds[Math.floor(Math.random() * kinds.length)]!;
  }

  // --- Bausteine (gehen alle durch den Wand-Tiefpass) ---

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.room!);
    return g;
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, peak: number, decay: number, attack = 0.005): void {
    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
    osc.connect(this.env(t, peak, attack, decay));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  private hiss(t: number, peak: number, decay: number, freq: number, q = 1, attack = 0.001): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx!.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(t, peak, attack, decay));
    // Startpunkt so wählen, dass das Rauschen nicht vor dem Ende der Hüllkurve ausgeht (sonst knackst es)
    const dur = attack + decay + 0.05;
    src.start(t, Math.random() * Math.max(0, this.noise!.duration - dur), dur);
  }

  private rnd(a: number, b: number): number {
    return a + Math.random() * (b - a);
  }

  /** Ein Geräusch von nebenan (öffentlich nur für Tests; im Spiel kommt es über scheduleEvent) */
  play(kind: Kind): void {
    if (!this.start()) return;
    const t = this.ctx!.currentTime + 0.05;
    const v = LEVEL.event;
    switch (kind) {
      case 'typing': {
        // ein Kollege tippt eine Zeile, macht kurz Pause, tippt weiter
        let at = t;
        const bursts = Math.ceil(this.rnd(1, 3));
        for (let b = 0; b < bursts; b++) {
          const n = Math.round(this.rnd(8, 22));
          for (let i = 0; i < n; i++) {
            this.hiss(at, v * this.rnd(0.5, 1), 0.012, this.rnd(1800, 2600), 2);
            at += this.rnd(0.07, 0.16);
          }
          at += this.rnd(0.5, 1.2);
        }
        break;
      }
      case 'printer': {
        // Drucker im Flur: Anlaufen, rhythmisches Rattern, Blatt rutscht raus
        this.tone('sawtooth', 55, 55, t, v * 0.5, 0.4, 0.2);
        const lines = Math.round(this.rnd(10, 20));
        for (let i = 0; i < lines; i++) this.hiss(t + 0.4 + i * 0.13, v * 0.7, 0.06, 900, 3);
        this.hiss(t + 0.5 + lines * 0.13, v * 0.6, 0.35, 3000, 0.6, 0.08);
        break;
      }
      case 'phone': {
        // Telefon nebenan, keiner geht ran: zwei, drei Klingeltöne
        const rings = Math.round(this.rnd(2, 3));
        for (let r = 0; r < rings; r++) {
          const at = t + r * 2.6;
          for (let i = 0; i < 16; i++) this.tone('triangle', i % 2 ? 1250 : 1000, i % 2 ? 1250 : 1000, at + i * 0.06, v * 0.45, 0.05, 0.004);
        }
        break;
      }
      case 'chair':
        // Bürostuhl quietscht, jemand lehnt sich zurück
        this.tone('sine', this.rnd(650, 800), this.rnd(850, 1000), t, v * 0.25, 0.25, 0.04);
        this.hiss(t + 0.28, v * 0.4, 0.04, 400, 1.5);
        break;
      case 'water':
        // Wasserspender: ein paar Gluckser
        for (let i = 0; i < Math.round(this.rnd(3, 5)); i++) {
          const f = this.rnd(220, 380);
          this.tone('sine', f, f * 1.8, t + i * this.rnd(0.18, 0.3), v * 0.5, 0.08, 0.01);
        }
        break;
      case 'coffee':
        // Kaffeemaschine: Mahlwerk, dann Blubbern
        this.hiss(t, v * 0.6, 1.4, 1200, 0.8, 0.15);
        for (let i = 0; i < 8; i++) {
          const f = this.rnd(160, 300);
          this.tone('sine', f, f * 1.5, t + 1.8 + i * this.rnd(0.12, 0.25), v * 0.35, 0.07, 0.01);
        }
        break;
    }
  }
}
