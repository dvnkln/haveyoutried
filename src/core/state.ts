import { GENERATORS, type GeneratorId } from '../config';

export const SAVE_VERSION = 1;

export type BuyAmount = 1 | 10 | 100 | 'max';
export const BUY_AMOUNTS: readonly BuyAmount[] = [1, 10, 100, 'max'];

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
  /** „Kündigen und neuen Job anfangen“ */
  prestige: { experience: number; jobs: number };
  /** Zufallsevents */
  events: { nextAt: number; active: string | null };
  // ---

  stats: { startedAt: number; playTimeMs: number; offlineTickets: number };
  settings: { haptics: boolean; buyAmount: BuyAmount };
  /** Wall-Clock des letzten Ticks, Basis für Offline-Progress */
  lastTick: number;
}

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
    prestige: { experience: 0, jobs: 0 },
    events: { nextAt: 0, active: null },
    stats: { startedAt: now, playTimeMs: 0, offlineTickets: 0 },
    settings: { haptics: true, buyAmount: 1 },
    lastTick: now,
  };
}
