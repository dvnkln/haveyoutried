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
