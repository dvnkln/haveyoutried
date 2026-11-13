import { emptyBoss, type BossState } from './boss';
import { GENERATORS, type GeneratorId } from '../config';
import type { OsId } from '../content/systems';

export const SAVE_VERSION = 3;

/** Cherry-Switch-Klänge; Profile in ui/audio.ts */
export const TAP_SOUND_IDS = ['blue', 'green', 'brown', 'red', 'black', 'silent'] as const;

export type BuyAmount = 1 | 10 | 100 | 'max';
export const BUY_AMOUNTS: readonly BuyAmount[] = [1, 10, 100, 'max'];

export const isBuyAmount = (v: unknown): v is BuyAmount => (BUY_AMOUNTS as readonly unknown[]).includes(v);

/** Kaufmenge einer Infrastruktur: eigene Einstellung der Zeile, sonst die für alle */
export const buyAmountFor = (s: GameState, id: GeneratorId): BuyAmount => s.settings.buyAmounts[id] ?? s.settings.buyAmount;

export interface ActiveEvent {
  id: string;
  /** Spielzeit, ab der „keine Reaktion“ gilt */
  expiresAt: number;
  /** Dialog wurde geöffnet → kein Ablauf mehr */
  opened: boolean;
}

export interface Buff {
  /** Effekt-ID aus EVENT_EFFECTS */
  id: string;
  target: 'prod' | 'click';
  mult: number;
  remainingMs: number;
}

export interface GeneratorState {
  owned: number;
}

/** Der komplette Spielstand. Muss JSON-serialisierbar bleiben. */
export interface GameState {
  version: number;
  /** aktuelle Währung */
  tickets: number;
  /** Lifetime im aktuellen Job (Basis für Prestige) */
  ticketsTotal: number;
  /** über alle Jobs hinweg */
  ticketsAllTime: number;
  clicks: number;
  generators: Record<GeneratorId, GeneratorState>;

  // --- Phase 2: schon im Schema, noch ungenutzt ---
  /** gekaufte Upgrade-IDs */
  upgrades: Record<string, true>;
  /** Achievement-ID → Freischalt-Timestamp */
  achievements: Record<string, number>;
  /** „Kündigen und neuen Job anfangen“: experience = insgesamt verdiente Berufserfahrung */
  prestige: { experience: number; jobs: number; company: string };
  /** Zähler für Achievements (z. B. Event-Ausgänge, erwischte Dringend-Tickets) */
  flags: Record<string, number>;
  /** Zufallsevents; Zeiten in Spielzeit (stats.playTimeMs) */
  events: { nextAt: number; active: ActiveEvent | null; lastId: string; seen: Record<string, number> };
  /** laufende Boosts/Bremsen aus Events */
  buffs: Buff[];
  /** Minispiel-Incidents; `active` = gestartet, aber noch nicht gewertet (Reload = Eskalation) */
  incidents: { nextAt: number; lastId: string; active: string; seen: Record<string, number>; best: Record<string, number> };
  // ---

  /**
   * Betriebssysteme (nur Optik, core/os.ts): freigeschaltet für immer, eigene Wahl je Firma, schon gemeldete,
   * und was zuletzt zu sehen war (weicht die Wahl ab, startet der Rechner neu, auch nach Neuladen)
   */
  os: { unlocked: Partial<Record<OsId, true>>; pick: Record<string, OsId>; known: Partial<Record<OsId, true>>; shown: OsId | null };
  /** Aufgabe vom Chef (kleines Ziel für die nächsten Minuten) */
  boss: BossState;
  /** Kartenstapel der Zufallstexte (core/deck.ts): Liste → Fingerabdrücke der schon gezeigten Einträge */
  decks: Record<string, string[]>;
  stats: { startedAt: number; playTimeMs: number; offlineTickets: number };
  /** wallpaper: 'auto' = Bild der aktuellen Firma, sonst ID aus ui/wallpaper.ts */
  settings: {
    haptics: boolean;
    sound: boolean;
    volume: number;
    tapSound: string;
    /** Kaufmenge für alle Zeilen (Leiste oben im Infra-Tab) */
    buyAmount: BuyAmount;
    /** eigene Kaufmenge je Infrastruktur (Knopf in der Zeile); fehlt = buyAmount */
    buyAmounts: Partial<Record<GeneratorId, BuyAmount>>;
    wallpaper: string;
    ambienceVolume: number;
    /** wo die Taskleiste im Monitor sitzt */
    taskbar: TaskbarPos;
  };
  /** Wall-Clock des letzten Ticks, Basis für Offline-Progress */
  lastTick: number;
}

export const TASKBAR_POSITIONS = ['bottom', 'top', 'left', 'right'] as const;
export type TaskbarPos = (typeof TASKBAR_POSITIONS)[number];
/** Standard-Lautstärken (auch für „zurücksetzen“ in den Einstellungen) */
export const DEFAULT_VOLUME = { volume: 0.7, ambienceVolume: 0.4 } as const;

export function createInitialState(now: number): GameState {
  const generators = {} as Record<GeneratorId, GeneratorState>;
  for (const g of GENERATORS) generators[g.id] = { owned: 0 };

  return {
    version: SAVE_VERSION,
    tickets: 0,
    ticketsTotal: 0,
    ticketsAllTime: 0,
    clicks: 0,
    generators,
    upgrades: {},
    achievements: {},
    prestige: { experience: 0, jobs: 0, company: 'mueller' },
    flags: {},
    // erste Firma (Müller & Söhne) läuft auf 98
    os: { unlocked: { win98: true }, pick: {}, known: { win98: true }, shown: null },
    events: { nextAt: 0, active: null, lastId: '', seen: {} },
    buffs: [],
    incidents: { nextAt: 0, lastId: '', active: '', seen: {}, best: {} },
    boss: emptyBoss(),
    decks: {},
    stats: { startedAt: now, playTimeMs: 0, offlineTickets: 0 },
    settings: {
      haptics: true,
      sound: true,
      volume: DEFAULT_VOLUME.volume,
      tapSound: 'blue',
      buyAmount: 1,
      buyAmounts: {},
      wallpaper: 'auto',
      ambienceVolume: DEFAULT_VOLUME.ambienceVolume,
      taskbar: 'bottom',
    },
    lastTick: now,
  };
}

export function addTickets(state: GameState, amount: number): void {
  state.tickets += amount;
  state.ticketsTotal += amount;
  state.ticketsAllTime += amount;
}

export function bumpFlag(state: GameState, key: string, by = 1): void {
  state.flags[key] = (state.flags[key] ?? 0) + by;
}
