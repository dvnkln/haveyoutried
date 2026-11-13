import { BOSS_TASKS, type BossKind } from '../content/boss';
import { pick } from '../util';
import { draw } from './deck';
import { bus } from './bus';
import { quirkMods } from './quirks';
import { addTickets, type GameState } from './state';

/** erste Aufgabe nach so viel Spielzeit, dann Pause zwischen den Aufgaben, Zeit pro Aufgabe */
export const BOSS = { firstMs: 90_000, gapMinMs: 120_000, gapMaxMs: 240_000, timeMs: 5 * 60_000, rewardSec: 60, rewardClicks: 20 };

export interface BossState {
  /** '' = gerade keine Aufgabe */
  kind: string;
  /** Text der Aufgabe (bleibt beim Neuladen gleich) */
  text: string;
  target: number;
  /** Zählerstand beim Start */
  base: number;
  /** Frist in Spielzeit */
  until: number;
  /** nächste Aufgabe ab (Spielzeit) */
  nextAt: number;
  done: number;
}

export const emptyBoss = (): BossState => ({ kind: '', text: '', target: 0, base: 0, until: 0, nextAt: 0, done: 0 });

const owned = (s: GameState) => Object.values(s.generators).reduce((a, g) => a + g.owned, 0);

/** Zähler je Aufgabentyp; Fortschritt = Zähler − Stand beim Start */
export function bossMeasure(s: GameState, kind: string): number {
  switch (kind as BossKind) {
    case 'solve':
      return s.flags.solved ?? 0;
    case 'calls':
      return s.flags.callers ?? 0;
    case 'clicks':
      return s.clicks;
    case 'earn':
      return s.ticketsAllTime;
    case 'buy':
      return owned(s);
    case 'urgent':
      return s.flags.urgent ?? 0;
  }
  return 0;
}

export const bossProgress = (s: GameState) => (s.boss.kind ? Math.max(0, bossMeasure(s, s.boss.kind) - s.boss.base) : 0);

/** schöne runde Zahl für Ticket-Ziele */
const round = (x: number) => {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, x))) - 1);
  return Math.max(10, Math.round(x / p) * p);
};

function newTask(s: GameState, rates: { pps: number; click: number }, rnd: () => number): void {
  const ALL: BossKind[] = ['solve', 'calls', 'clicks', 'earn', 'buy', 'urgent'];
  const kinds = ALL.filter((k) => (k !== 'buy' || owned(s) > 0) && (k !== 'urgent' || quirkMods(s).urgent >= 1));
  // nicht zweimal hintereinander dieselbe Art
  const options = kinds.filter((k) => ALL.indexOf(k) !== s.flags['boss:lastKind']);
  const kind = pick(options.length ? options : kinds, rnd);
  s.flags['boss:lastKind'] = ALL.indexOf(kind);
  const r = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const target =
    kind === 'solve' ? r(10, 25)
    : kind === 'calls' ? r(2, 4)
    : kind === 'clicks' ? r(15, 30) * 10
    : kind === 'earn' ? round(rates.pps * 120 + rates.click * 240)
    : kind === 'buy' ? r(2, 5)
    : 1;
  s.boss = {
    ...s.boss,
    kind,
    text: draw(s, `boss:${kind}`, BOSS_TASKS[kind], { rnd }).replace('{n}', target.toLocaleString('de-DE')),
    target,
    base: bossMeasure(s, kind),
    until: s.stats.playTimeMs + BOSS.timeMs,
  };
  bus.emit('bossTask', { text: s.boss.text });
}

/**
 * Pro Online-Tick: Aufgabe stellen, Fortschritt prüfen, Erfolg belohnen, Frist ablaufen lassen.
 * pausedMs > 0: Incident läuft. Dann keine neue Aufgabe (ihre Meldung sähe man nicht), Frist und Pause bis zur
 * nächsten stehen; gewertet wird erst danach.
 */
export function updateBoss(s: GameState, rates: () => { pps: number; click: number }, rnd: () => number = Math.random, pausedMs = 0): void {
  const b = s.boss;
  const t = s.stats.playTimeMs;
  if (pausedMs > 0) {
    if (b.kind) b.until += pausedMs;
    else if (b.nextAt) b.nextAt += pausedMs;
    return;
  }
  if (!b.kind) {
    if (!b.nextAt) b.nextAt = t + BOSS.firstMs;
    if (t >= b.nextAt) newTask(s, rates(), rnd);
    return;
  }
  const gap = () => t + BOSS.gapMinMs + rnd() * (BOSS.gapMaxMs - BOSS.gapMinMs);
  if (bossProgress(s) >= b.target) {
    const r = rates();
    const reward = Math.max(r.pps * BOSS.rewardSec, r.click * BOSS.rewardClicks);
    addTickets(s, reward);
    s.flags['boss:done'] = (s.flags['boss:done'] ?? 0) + 1;
    bus.emit('bossDone', { text: b.text, reward });
    s.boss = { ...emptyBoss(), done: b.done + 1, nextAt: gap() };
  } else if (t >= b.until) {
    bus.emit('bossFailed', { text: b.text });
    s.boss = { ...emptyBoss(), done: b.done, nextAt: gap() };
  }
}

/** Neuer Job: alte Aufgabe verfällt still, die erste kommt wieder nach kurzer Einarbeitung */
export function resetBoss(s: GameState): void {
  s.boss = { ...emptyBoss(), done: s.boss.done, nextAt: s.stats.playTimeMs + BOSS.firstMs };
}
