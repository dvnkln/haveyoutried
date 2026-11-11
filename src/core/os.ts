import { COMPANIES, companyOf, type Company } from '../content/companies';
import { FALLBACK_OS, isOsId, osOf, type OsId } from '../content/systems';
import { weightedPick } from '../util';
import type { GameState } from './state';

/** Flag für alte Spielstände: System der aktuellen Firma kam beim Update dazu (System-Tab meldet das einmal) */
export const OS_NOTICE_FLAG = 'os:notice';

/** So oft landet man nach dem Kündigen mindestens bei einer Firma mit einem noch fehlenden System */
export const NEW_OS_SHARE = 0.5;

export const osUnlocked = (s: GameState, id: OsId) => !!s.os.unlocked[id];
/** freigeschaltet und mit fertigem Look: nur solche Systeme werden gezeigt und angeboten */
export const osAvailable = (s: GameState, id: OsId) => osUnlocked(s, id) && osOf(id).ready;

/** Was gerade läuft: eigene Wahl für diese Firma, sonst das System der Firma (ohne fertigen Look: XP) */
export function activeOs(s: GameState): OsId {
  const own = s.os.pick[s.prestige.company];
  if (own && osAvailable(s, own)) return own;
  const id = companyOf(s.prestige.company).os;
  return osOf(id).ready ? id : FALLBACK_OS;
}

/** Erster Arbeitstag: System der Firma gibt es ab jetzt für immer (auch ohne fertigen Look, dann still). true = war neu */
export function unlockCompanyOs(s: GameState): boolean {
  const id = companyOf(s.prestige.company).os;
  if (osUnlocked(s, id)) return false;
  s.os.unlocked[id] = true;
  return true;
}

/** Eigene Wahl für die aktuelle Firma (nur freigeschaltete Systeme) */
export function chooseOs(s: GameState, id: OsId): boolean {
  if (!osAvailable(s, id)) return false;
  s.os.pick[s.prestige.company] = id;
  return true;
}

/**
 * Nächste Firma nach dem Kündigen: zufällig, aber Firmen mit noch fehlendem System
 * bekommen zusammen mindestens NEW_OS_SHARE der Chance (nie weniger als ohne Bevorzugung).
 */
export function nextCompany(s: GameState, rnd: () => number = Math.random): Company {
  const options = COMPANIES.filter((c) => c.id !== s.prestige.company);
  // nur Systeme mit fertigem Look zählen als „neu“ (die anderen merkt man ja nicht)
  const isFresh = (os: OsId) => !osUnlocked(s, os) && osOf(os).ready;
  const fresh = options.filter((c) => isFresh(c.os)).length;
  if (fresh === 0 || fresh === options.length) return weightedPick(options, () => 1, rnd);
  const share = Math.max(NEW_OS_SHARE, fresh / options.length);
  const known = options.length - fresh;
  return weightedPick(options, (c) => (isFresh(c.os) ? share / fresh : (1 - share) / known), rnd);
}

/**
 * Nach dem Laden (`raw` = os-Feld aus dem Spielstand): kaputte Einträge raus, System der Firma freigeschaltet.
 * Spielstände von vor den Systemen liefen mit XP: XP bleibt aktiv, das Firmen-System kommt dazu.
 */
export function migrateOs(s: GameState, raw: unknown): void {
  if (!isPlain(raw)) {
    s.os = { unlocked: { xp: true }, pick: { [s.prestige.company]: 'xp' } };
    if (unlockCompanyOs(s) && osOf(companyOf(s.prestige.company).os).ready) s.flags[OS_NOTICE_FLAG] = 1;
    return;
  }
  const unlocked: GameState['os']['unlocked'] = {};
  if (isPlain(raw.unlocked)) for (const [id, on] of Object.entries(raw.unlocked)) if (isOsId(id) && on === true) unlocked[id] = true;
  const pick: GameState['os']['pick'] = {};
  if (isPlain(raw.pick)) for (const [company, id] of Object.entries(raw.pick)) if (isOsId(id)) pick[company] = id;
  s.os = { unlocked, pick };
  unlockCompanyOs(s);
}

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
