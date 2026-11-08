import { CONFIG } from '../config';
import { BUY_AMOUNTS, createInitialState, SAVE_VERSION, type BuyAmount, type GameState } from './state';

export const SAVE_KEY = 'hyt.save';

/** Migrationen: Index = Version, von der aus migriert wird. */
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (raw) => ({ ...raw, version: 2, ... }),
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
  return state;
}

export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(code: string, now: number): GameState | null {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes), now);
  } catch {
    return null;
  }
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

  saveNow(): boolean {
    if (this.disabled) return false;
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.getState()));
      return true;
    } catch (e) {
      this.onError(e);
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

  replaceWith(state: GameState): boolean {
    this.disable();
    try {
      localStorage.setItem(SAVE_KEY, serialize(state));
      return true;
    } catch {
      return false;
    }
  }
}
