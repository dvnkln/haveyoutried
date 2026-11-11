import { ACHIEVEMENTS_CFG } from '../config';
import { ACHIEVEMENTS } from '../content/achievements';
import { bus } from './bus';
import type { GameState } from './state';

// Achievements kommen nur dazu, nie weg: Anzahl pro Objekt zwischenspeichern (heißer Pfad in der Ökonomie).
const countCache = new WeakMap<object, number>();

/**
 * Prüft alle noch offenen Achievements; neu freigeschaltete werden gespeichert und gemeldet.
 * active = der Spieler hat gerade etwas getan; Uhrzeit-Achievements brauchen das (sonst reicht ein offener Tab).
 */
export function checkAchievements(state: GameState, now: Date = new Date(), active = true): string[] {
  const unlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements[def.id]) continue;
    if (def.needsActivity && !active) continue;
    if (!def.check(state, now)) continue;
    state.achievements[def.id] = now.getTime();
    unlocked.push(def.id);
  }
  if (unlocked.length > 0) {
    countCache.delete(state.achievements);
    for (const id of unlocked) bus.emit('achievement', { id, batch: unlocked.length });
  }
  return unlocked;
}

export function achievementCount(state: GameState): number {
  let n = countCache.get(state.achievements);
  if (n === undefined) {
    n = Object.keys(state.achievements).length;
    countCache.set(state.achievements, n);
  }
  return n;
}

/** Bonusfaktor aus Achievements (Produktion und Klicks). */
export function achievementMultiplier(state: GameState): number {
  return 1 + achievementCount(state) * ACHIEVEMENTS_CFG.bonusPerAchievement;
}

// --- gelesen/ungelesen (Karriere-App hebt neue hervor, bis sie eine Weile im Blick waren) ---

/** alles bis zu diesem Zeitpunkt Freigeschaltete gilt als gelesen (im Spielstand, damit „neu“ ein Neuladen übersteht) */
export const ACH_SEEN_FLAG = 'ach:seen';
/** einzeln gelesen; wird zusammengefasst, sobald nichts Neues mehr offen ist */
const READ = 'ach:read:';

/** neu = freigeschaltet, aber noch nicht im Blick gewesen */
export function isUnread(s: GameState, id: string): boolean {
  const at = s.achievements[id];
  return !!at && at > (s.flags[ACH_SEEN_FLAG] ?? 0) && !s.flags[READ + id];
}

/** alle als gelesen markieren: Grenze auf jetzt (bzw. das neueste), Einzelmarken aufräumen */
export function markAllRead(s: GameState, now = Date.now()): void {
  s.flags[ACH_SEEN_FLAG] = Math.max(now, ...Object.values(s.achievements));
  for (const k of Object.keys(s.flags)) if (k.startsWith(READ)) delete s.flags[k];
}

/** eins gelesen; war es das letzte neue, wird zusammengefasst */
export function markRead(s: GameState, id: string, now = Date.now()): void {
  s.flags[READ + id] = 1;
  if (!Object.keys(s.achievements).some((x) => isUnread(s, x))) markAllRead(s, now);
}
