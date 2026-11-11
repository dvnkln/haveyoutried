import { CONFIG } from '../config';
import { BUY_AMOUNTS, TAP_SOUND_IDS, TASKBAR_POSITIONS, createInitialState, SAVE_VERSION, type BuyAmount, type GameState } from './state';

export const SAVE_KEY = 'hyt.save';

/** Flag mit der alten Berufserfahrung, wenn die Umrechnung auf v3 Punkte gekostet hat (main.ts meldet das einmal) */
export const EXP_REVALUED_FLAG = 'expRevalued';

/** Nachfrist für ein beim Laden gefundenes Pager-Event */
const EVENT_GRACE_MS = 15_000;

/** Migrationen: Index = Version, von der aus migriert wird. */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v2: Punkt kostet 250 K statt 1 M Tickets → gleiche Tickets = doppelte Erfahrung (Wurzel aus 4).
  // Ohne Umrechnung gäbe es beim nächsten Kündigen die Hälfte der Punkte geschenkt.
  1: (raw) => {
    const p = raw.prestige;
    if (!isPlain(p) || typeof p.experience !== 'number') return { ...raw, version: 2 };
    return { ...raw, version: 2, prestige: { ...p, experience: p.experience * 2 } };
  },
  // v3: Kubikwurzel ab 25 K statt Quadratwurzel ab 250 K. Erfahrung über die gleichwertigen Tickets umrechnen:
  // E Punkte entsprachen 250 K × E² Tickets → neu ∛(10 × E²). Bei 10 Punkten bleibt es gleich, darüber wird es weniger.
  2: (raw) => {
    const p = raw.prestige;
    if (!isPlain(p) || typeof p.experience !== 'number') return { ...raw, version: 3 };
    const e = Math.max(0, p.experience);
    const next = Math.floor(Math.cbrt(10 * e * e) + 1e-9);
    // Weniger als vorher: alten Wert merken, beim Start gibt es dazu einen Logeintrag
    const flags = isPlain(raw.flags) ? raw.flags : {};
    const notice = next < e ? { flags: { ...flags, [EXP_REVALUED_FLAG]: e } } : {};
    return { ...raw, ...notice, version: 3, prestige: { ...p, experience: next } };
  },
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Legt geladene Werte über die Defaults. Nur bekannte Felder mit passendem Typ
 * werden übernommen; leere Default-Objekte (z. B. upgrades) übernehmen alles.
 */
function mergeInto(defaults: Plain, loaded: Plain): Plain {
  const out: Plain = { ...defaults };
  const keys = Object.keys(defaults);
  if (keys.length === 0) return { ...loaded };
  for (const key of keys) {
    const d = defaults[key];
    const l = loaded[key];
    if (l === undefined) continue;
    if (isPlain(d) && isPlain(l)) out[key] = mergeInto(d, l);
    else if (typeof d === 'number' && typeof l === 'number' && Number.isFinite(l)) out[key] = l;
    else if (d === null || typeof d === typeof l) out[key] = l;
  }
  return out;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string, now: number): GameState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isPlain(raw) || typeof raw.version !== 'number') return null;

  let data = raw;
  for (let v = data.version as number; v < SAVE_VERSION; v++) {
    const m = migrations[v];
    if (m) data = m(data);
  }
  const state = mergeInto(createInitialState(now) as unknown as Plain, data) as unknown as GameState;
  state.version = SAVE_VERSION;
  // Union-Typ, den der generische Merge nicht abdeckt
  const amount = isPlain(data.settings) ? data.settings.buyAmount : undefined;
  state.settings.buyAmount = BUY_AMOUNTS.includes(amount as BuyAmount) ? (amount as BuyAmount) : 1;
  // Boosts: nur wohlgeformte Einträge übernehmen
  state.buffs = (Array.isArray(state.buffs) ? state.buffs : []).filter(
    (b) =>
      isPlain(b) &&
      typeof b.id === 'string' &&
      (b.target === 'prod' || b.target === 'click') &&
      Number.isFinite(b.mult) &&
      Number.isFinite(b.remainingMs),
  );
  // Pager-Event: Dialog kann nach dem Laden nicht mehr offen sein → wieder als Pager zeigen,
  // mit gültigem Ablauf (sonst blockiert ein „offenes“ Event alle weiteren für immer)
  const act = state.events.active as unknown;
  if (act !== null) {
    if (isPlain(act) && typeof act.id === 'string') {
      const t = state.stats.playTimeMs;
      const exp = typeof act.expiresAt === 'number' && Number.isFinite(act.expiresAt) ? act.expiresAt : t;
      state.events.active = { id: act.id, opened: false, expiresAt: Math.max(exp, t + EVENT_GRACE_MS) };
    } else {
      state.events.active = null;
    }
  }
  // Lautstärke auf 0..1 begrenzen
  state.settings.volume = Math.min(1, Math.max(0, state.settings.volume));
  // alte Klang-IDs (mx, pop, …) auf den Standard-Switch abbilden
  if (!(TAP_SOUND_IDS as readonly string[]).includes(state.settings.tapSound)) state.settings.tapSound = 'blue';
  if (typeof state.settings.wallpaper !== 'string') state.settings.wallpaper = 'auto';
  if (!(TASKBAR_POSITIONS as readonly string[]).includes(state.settings.taskbar)) state.settings.taskbar = 'bottom';
  // Büro-Geräusche: eigener Regler 0..1 (0 = aus); früher gab es kurz einen Schalter – „aus“ heißt jetzt Regler auf 0
  state.settings.ambienceVolume = Math.min(1, Math.max(0, state.settings.ambienceVolume));
  if (isPlain(data.settings) && data.settings.ambience === false) state.settings.ambienceVolume = 0;
  return state;
}

export function loadGame(now: number): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? deserialize(json, now) : null;
  } catch {
    return null;
  }
}

/** Autosave alle CONFIG.autosaveMs plus explizites saveNow(). */
export class Saver {
  private timer: ReturnType<typeof setInterval> | null = null;
  private disabled = false;

  constructor(
    private getState: () => GameState,
    private onError: (e: unknown) => void = () => {},
  ) {}

  start(): void {
    this.timer ??= setInterval(() => this.saveNow(), CONFIG.autosaveMs);
  }

  /** Fehler nur einmal melden, solange das Speichern am Stück scheitert */
  private failing = false;

  saveNow(): boolean {
    if (this.disabled) return false;
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.getState()));
      this.failing = false;
      return true;
    } catch (e) {
      if (!this.failing) this.onError(e);
      this.failing = true;
      return false;
    }
  }

  /** Für Reset/Import: danach wird nichts mehr geschrieben (bis Reload). */
  disable(): void {
    this.disabled = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  wipe(): void {
    this.disable();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* egal */
    }
  }
}
