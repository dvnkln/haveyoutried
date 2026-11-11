import { COMPANIES, companyOf, type Company } from '../content/companies';
import { FALLBACK_OS, isOsId, OS_IDS, osOf, type OsId } from '../content/systems';
import { weightedPick } from '../util';
import type { GameState } from './state';

/** Alter Merker (bis ac93312): System der Firma kam beim Update dazu, Meldung stand noch aus */
const OLD_NOTICE_FLAG = 'os:notice';

/** So oft landet man nach dem Kündigen mindestens bei einer Firma mit einem noch fehlenden System */
export const NEW_OS_SHARE = 0.5;

export const osUnlocked = (s: GameState, id: OsId) => !!s.os.unlocked[id];
/** freigeschaltet und mit fertigem Look: nur solche Systeme werden gezeigt, gemeldet und angeboten */
export const osAvailable = (s: GameState, id: OsId) => osUnlocked(s, id) && osOf(id).ready;
/** Was man bei einer Firma mit diesem System sieht: das System selbst oder, solange sein Look fehlt, XP */
const shownFor = (id: OsId): OsId => (osOf(id).ready ? id : FALLBACK_OS);

/** Was gerade laufen soll: eigene Wahl für diese Firma, sonst das System der Firma (ohne fertigen Look: XP) */
export function activeOs(s: GameState): OsId {
  const own = s.os.pick[s.prestige.company];
  if (own && osAvailable(s, own)) return own;
  return shownFor(companyOf(s.prestige.company).os);
}

/**
 * Erster Arbeitstag: System der Firma gibt es ab jetzt für immer. Ohne fertigen Look läuft dort XP,
 * also ist dann auch XP freigeschaltet (man benutzt es ja).
 */
export function unlockCompanyOs(s: GameState): void {
  const id = companyOf(s.prestige.company).os;
  s.os.unlocked[id] = true;
  s.os.unlocked[shownFor(id)] = true;
}

/** Freigeschaltet und fertig, aber noch nie gemeldet (z. B. Look kam mit einem Update): Meldung „Neues Betriebssystem“ */
export const unannouncedOs = (s: GameState): OsId[] => OS_IDS.filter((id) => osAvailable(s, id) && !s.os.known[id]);
export function markAnnounced(s: GameState, id: OsId): void {
  s.os.known[id] = true;
}

/** Eigene Wahl für die aktuelle Firma (nur freigeschaltete Systeme) */
export function chooseOs(s: GameState, id: OsId): boolean {
  if (!osAvailable(s, id)) return false;
  s.os.pick[s.prestige.company] = id;
  return true;
}

/**
 * Nächste Firma nach dem Kündigen: zufällig, aber Firmen, bei denen man ein noch fehlendes System zu sehen bekäme,
 * bekommen zusammen mindestens NEW_OS_SHARE der Chance (nie weniger als ohne Bevorzugung).
 */
export function nextCompany(s: GameState, rnd: () => number = Math.random): Company {
  const options = COMPANIES.filter((c) => c.id !== s.prestige.company);
  const isFresh = (c: Company) => !osUnlocked(s, shownFor(c.os));
  const fresh = options.filter(isFresh).length;
  if (fresh === 0 || fresh === options.length) return weightedPick(options, () => 1, rnd);
  const share = Math.max(NEW_OS_SHARE, fresh / options.length);
  const known = options.length - fresh;
  return weightedPick(options, (c) => (isFresh(c) ? share / fresh : (1 - share) / known), rnd);
}

/**
 * Nach dem Laden (`raw` = os-Feld aus dem Spielstand): kaputte Einträge raus, System der Firma freigeschaltet.
 * Spielstände von vor den Systemen liefen mit XP: XP bleibt aktiv (und gilt als bekannt), das Firmen-System kommt dazu.
 */
export function migrateOs(s: GameState, raw: unknown): void {
  if (!isPlain(raw)) {
    s.os = { unlocked: { xp: true }, pick: { [s.prestige.company]: 'xp' }, known: { xp: true }, shown: 'xp' };
    unlockCompanyOs(s);
    delete s.flags[OLD_NOTICE_FLAG];
    return;
  }
  const ids = (v: unknown) => {
    const out: Partial<Record<OsId, true>> = {};
    if (isPlain(v)) for (const [id, on] of Object.entries(v)) if (isOsId(id) && on === true) out[id] = true;
    return out;
  };
  const unlocked = ids(raw.unlocked);
  const pick: GameState['os']['pick'] = {};
  if (isPlain(raw.pick)) for (const [company, id] of Object.entries(raw.pick)) if (isOsId(id)) pick[company] = id;
  s.os = { unlocked, pick, known: ids(raw.known), shown: isOsId(raw.shown) ? raw.shown : null };
  unlockCompanyOs(s);
  // Stände von vor „known“: alles Freigeschaltete (auch das ersatzweise XP) galt als gemeldet, außer der Meldung, die noch ausstand
  if (!isPlain(raw.known)) {
    s.os.known = { ...s.os.unlocked };
    if (s.flags[OLD_NOTICE_FLAG]) delete s.os.known[companyOf(s.prestige.company).os];
  }
  delete s.flags[OLD_NOTICE_FLAG];
}

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
