import { CONFIG, EVENT_EFFECTS, type EventEffectId } from '../config';
import { EVENTS, type GameEventDef, type Outcome } from '../content/events';
import { weightedPick } from '../util';
import { draw } from './deck';
import { bus } from './bus';
import { quirkMods, scaledDelay } from './quirks';
import { addTickets, bumpFlag, type Buff, type GameState } from './state';

/** Ergebnis eines angewendeten Effekts, für Anzeige und Log. */
export interface EffectResult {
  effect: EventEffectId;
  /** Tickets (+/-) bei Sofort-Effekten */
  tickets: number;
  buff: Buff | null;
  /** grob: gut, schlecht oder neutral */
  mood: 'good' | 'bad' | 'neutral';
}

export interface Resolution extends EffectResult {
  eventId: string;
  /** Index der Option, -1 = keine Reaktion */
  option: number;
  outcome: Outcome;
}

const random = () => Math.random();

export function eventDef(id: string): GameEventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

/** Produkt aller laufenden Boosts für ein Ziel. */
export function buffMultiplier(state: GameState, target: Buff['target']): number {
  let m = 1;
  for (const b of state.buffs) if (b.target === target) m *= b.mult;
  return m;
}

// economy importiert buffMultiplier von hier; damit kein Import-Kreis entsteht,
// bekommen die Funktionen Produktion und Klickwert übergeben.
export function applyEffect(
  state: GameState,
  effect: EventEffectId,
  rates: { pps: number; click: number },
): EffectResult {
  const e = EVENT_EFFECTS[effect];
  switch (e.kind) {
    case 'none':
      return { effect, tickets: 0, buff: null, mood: 'neutral' };
    case 'tickets': {
      const amount = Math.max(rates.click * e.clicks, rates.pps * e.sec);
      addTickets(state, amount);
      return { effect, tickets: amount, buff: null, mood: 'good' };
    }
    case 'lose': {
      const cap = Math.max(rates.pps * e.sec, rates.click * e.clicks);
      // Echte Idempotenz (Ansible Stufe 3): automatischer Rollback, nur halb so schlimm
      const soften = state.upgrades['ansible-3'] ? 0.5 : 1;
      const amount = Math.min(state.tickets * e.frac, cap) * soften;
      state.tickets -= amount;
      return { effect, tickets: -amount, buff: null, mood: 'bad' };
    }
    case 'buff': {
      // Bremsen dauern mit Rollback (Ansible Stufe 3) nur halb so lang
      const soften = e.mult < 1 && state.upgrades['ansible-3'] ? 0.5 : 1;
      const buff: Buff = { id: effect, target: e.target, mult: e.mult, remainingMs: e.sec * 1_000 * soften };
      // gleicher Effekt nochmal: Zeit auffrischen statt stapeln
      const existing = state.buffs.find((b) => b.id === effect);
      if (existing) existing.remainingMs = Math.max(existing.remainingMs, buff.remainingMs);
      else state.buffs.push(buff);
      return { effect, tickets: 0, buff, mood: e.mult >= 1 ? 'good' : 'bad' };
    }
  }
}

function pickOutcome(outcomes: Outcome[]): Outcome {
  return weightedPick(outcomes, (o) => o.chance ?? 1, random);
}

/** Allererster Pager überhaupt: etwas Lustiges und Harmloses, damit der erste Eindruck sitzt */
export const INTRO_EVENTS = ['sqlcolor', 'internet', 'coffee'];

function pickEvent(state: GameState, now: Date): GameEventDef | null {
  const first = !Object.keys(state.flags).some((k) => k.startsWith('ev:'));
  const intro = first ? EVENTS.filter((e) => INTRO_EVENTS.includes(e.id)) : [];
  // reihum über den Kartenstapel (core/deck.ts): erst kommt jedes Ereignis einmal dran, dann das nächste Mal.
  // Eigener Stapel statt events.seen: alte Spielstände mit hohen Zählern bevorzugen sonst neue Ereignisse jedes zweite Mal.
  // Was heute besonders passt (Gewicht > 1, z. B. Freitag), ist innerhalb der Runde wahrscheinlicher dran.
  const opts = { key: (e: GameEventDef) => e.id, weight: (e: GameEventDef) => e.weight?.(state, now) ?? 1, rnd: random };
  if (intro.length > 0) return draw(state, 'events', intro, opts);
  const allowed = EVENTS.filter((e) => e.id !== state.events.lastId && (e.when?.(state) ?? true));
  return allowed.length > 0 ? draw(state, 'events', allowed, opts) : null;
}

export function scheduleNext(state: GameState): void {
  const t = state.stats.playTimeMs;
  // Eigenheit der Firma: mehr oder weniger Pager (0 = gar keiner)
  state.events.nextAt = t + scaledDelay(CONFIG.eventMinMs + random() * (CONFIG.eventMaxMs - CONFIG.eventMinMs), quirkMods(state).events);
}

/** Pro Online-Tick: Boosts ablaufen lassen, Events planen, auslösen, verfallen lassen. */
export function updateEvents(
  state: GameState,
  dtMs: number,
  rates: () => { pps: number; click: number },
  now: Date = new Date(),
  /** während eines Incidents: keine neuen Events, Pager-Countdown und Boosts stehen */
  paused = false,
): void {
  // Boosts: stehen während eines Incidents (man kann sie da ohnehin nicht nutzen)
  if (state.buffs.length > 0 && !paused) {
    for (const b of state.buffs) b.remainingMs -= dtMs;
    const ended = state.buffs.filter((b) => b.remainingMs <= 0);
    if (ended.length > 0) {
      state.buffs = state.buffs.filter((b) => b.remainingMs > 0);
      for (const b of ended) bus.emit('buffEnded', { id: b.id });
    }
  }

  const ev = state.events;
  const t = state.stats.playTimeMs;
  if (!ev.nextAt) ev.nextAt = t + CONFIG.eventFirstMs;

  if (ev.active) {
    if (paused) {
      if (!ev.active.opened) ev.active.expiresAt += dtMs;
      return;
    }
    if (!ev.active.opened && t >= ev.active.expiresAt) resolveEvent(state, -1, rates());
    return;
  }
  if (paused) {
    if (t >= ev.nextAt) ev.nextAt = t + 1_000;
    return;
  }
  if (t >= ev.nextAt) {
    const def = pickEvent(state, now);
    if (!def) return scheduleNext(state);
    ev.active = { id: def.id, expiresAt: t + CONFIG.eventExpireMs, opened: false };
    bus.emit('eventIncoming', { id: def.id });
  }
}

/** Entscheidung treffen; option -1 = keine Reaktion. */
export function resolveEvent(
  state: GameState,
  option: number,
  rates: { pps: number; click: number },
): Resolution | null {
  const active = state.events.active;
  const def = active && eventDef(active.id);
  if (!active || !def) {
    state.events.active = null;
    return null;
  }
  const opt = option >= 0 ? def.options[option] : undefined;
  const outcome = opt ? pickOutcome(opt.outcomes) : def.ignore;
  const result = applyEffect(state, outcome.effect, rates);

  state.events.active = null;
  state.events.lastId = def.id;
  // für Achievements: welche Option mit welchem Ausgang
  bumpFlag(state, `ev:${def.id}:${option}:${outcome.effect}`);
  if (option < 0) bumpFlag(state, 'ev:ignored');
  state.events.seen[def.id] = (state.events.seen[def.id] ?? 0) + 1;
  scheduleNext(state);

  const res: Resolution = { ...result, eventId: def.id, option, outcome };
  bus.emit('eventResolved', res);
  return res;
}

/** „!! DRINGEND !!“-Ticket erwischt. */
export function claimUrgent(state: GameState, rates: { pps: number; click: number }): EffectResult {
  const pick = weightedPick(CONFIG.urgentRewards, (r) => r.weight, random);
  bumpFlag(state, 'urgent');
  return applyEffect(state, pick.effect, rates);
}
