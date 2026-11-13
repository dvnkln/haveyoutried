import { weightedPick } from '../util';
import type { GameState } from './state';

/**
 * Kartenstapel für Zufallstexte: Aus jeder Liste kommt erst jeder Eintrag einmal dran, bevor sich
 * etwas wiederholt. Was schon dran war, steht im Spielstand (state.decks), übersteht also Neuladen.
 * Gemerkt wird nur ein kurzer Fingerabdruck je Text, damit der Spielstand klein bleibt.
 */

/** so viele Fingerabdrücke merkt sich ein Stapel höchstens (Listen ändern sich je Firma/Lage) */
const MAX_REMEMBERED = 300;

/** FNV-1a, Base36: kurz, stabil, Kollisionen wären harmlos (dann kommt ein Text eben eine Runde später) */
const printCache = new Map<string, string>();
export function fingerprint(text: string): string {
  const cached = printCache.get(text);
  if (cached !== undefined) return cached;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const print = (h >>> 0).toString(36);
  // Texte stehen fest im Spiel (endliche Menge): einmal rechnen reicht
  printCache.set(text, print);
  return print;
}

/** Objekte (Melodien, VIP-Tickets …) nur einmal in Text verwandeln */
const objectKeys = new WeakMap<object, string>();
const keyOf = (item: unknown): string => {
  if (typeof item !== 'object' || item === null) return String(item);
  let k = objectKeys.get(item);
  if (k === undefined) objectKeys.set(item, (k = JSON.stringify(item)));
  return k;
};

export interface DrawOptions<T> {
  /** Text, an dem ein Eintrag erkannt wird (Standard: der String selbst) */
  key?: (item: T) => string;
  /** relative Häufigkeit innerhalb der noch nicht gezogenen Einträge */
  weight?: (item: T) => number;
  rnd?: () => number;
}

/** Zieht aus `items`, was in diesem Stapel noch nicht dran war; ist alles durch, wird neu gemischt (ohne den letzten). */
export function draw<T>(state: GameState, bag: string, items: readonly T[], opts: DrawOptions<T> = {}): T {
  if (items.length === 0) throw new Error(`draw(${bag}) on empty list`);
  const key = opts.key ?? keyOf;
  const rnd = opts.rnd ?? Math.random;
  const raw = state.decks[bag];
  let used = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  const usedSet = new Set(used);
  const prints = items.map((it) => fingerprint(key(it)));
  const printOf = new Map(items.map((it, i) => [it, prints[i]!] as const));
  let pool = items.filter((_it, i) => !usedSet.has(prints[i]!));
  if (pool.length === 0) {
    // diese Liste ist durch: neue Runde nur für sie (andere Listen im selben Stapel behalten ihr Gedächtnis),
    // aber nicht direkt das, was aus ihr zuletzt kam
    const mine = new Set(prints);
    const last = [...used].reverse().find((p) => mine.has(p));
    used = used.filter((p) => !mine.has(p));
    pool = items.filter((_it, i) => prints[i] !== last);
    if (pool.length === 0) pool = [...items];
  }
  const item = weightedPick(pool, opts.weight ?? (() => 1), rnd);
  used.push(printOf.get(item) ?? fingerprint(key(item)));
  state.decks[bag] = used.slice(-MAX_REMEMBERED);
  return item;
}

/** Für UI-Code ohne eigenen Zugriff auf den Spielstand: main.ts meldet ihn hier an. */
let current: (() => GameState) | null = null;
export const useDeckState = (get: () => GameState) => (current = get);

/** wie draw(), mit dem angemeldeten Spielstand; ohne (Tests, Vorschau-Seiten) einfach zufällig */
export function fresh<T>(bag: string, items: readonly T[], opts: DrawOptions<T> = {}): T {
  if (current) return draw(current(), bag, items, opts);
  if (items.length === 0) throw new Error(`fresh(${bag}) on empty list`);
  return weightedPick(items, opts.weight ?? (() => 1), opts.rnd ?? Math.random);
}


/** Was aus dieser Liste in der laufenden Runde noch nicht dran war (leer = alles schon gezeigt) */
export function unused<T>(bag: string, items: readonly T[], opts: Pick<DrawOptions<T>, 'key'> = {}): T[] {
  const raw = current?.().decks[bag];
  if (!Array.isArray(raw)) return [...items];
  const used = new Set(raw);
  const key = opts.key ?? keyOf;
  return items.filter((it) => !used.has(fingerprint(key(it))));
}
