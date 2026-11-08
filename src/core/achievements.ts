import { ACHIEVEMENTS } from '../content/achievements';
import { bus } from './bus';
import type { GameState } from './state';

/** Prüft alle noch offenen Achievements; neu freigeschaltete werden gespeichert und gemeldet. */
export function checkAchievements(state: GameState, now: Date = new Date()): string[] {
  const unlocked: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements[def.id]) continue;
    if (!def.check(state, now)) continue;
    state.achievements[def.id] = now.getTime();
    unlocked.push(def.id);
    bus.emit('achievement', { id: def.id });
  }
  return unlocked;
}

export const achievementCount = (state: GameState): number => Object.keys(state.achievements).length;
