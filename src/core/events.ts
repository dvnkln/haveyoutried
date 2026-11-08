import { CONFIG, EVENT_EFFECTS, type EventEffectId } from '../config';
import { EVENTS, type GameEventDef, type Outcome } from '../content/events';
import { bus } from './bus';
import { addTickets, type Buff, type GameState } from './state';

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
      const amount = Math.min(state.tickets * e.frac, cap);
      state.tickets -= amount;
      return { effect, tickets: -amount, buff: null, mood: 'bad' };
    }
    case 'buff': {
      const buff: Buff = { id: effect, target: e.target, mult: e.mult, remainingMs: e.sec * 1_000 };
      // gleicher Effekt nochmal: Zeit auffrischen statt stapeln
      const existing = state.buffs.find((b) => b.id === effect);
      if (existing) existing.remainingMs = Math.max(existing.remainingMs, buff.remainingMs);
      else state.buffs.push(buff);
      return { effect, tickets: 0, buff, mood: e.mult >= 1 ? 'good' : 'bad' };
    }
  }
}

function pickOutcome(outcomes: Outcome[]): Outcome {
  let r = random();
  for (const o of outcomes) {
    r -= o.chance ?? 1;
    if (r < 0) return o;
  }
  return outcomes[outcomes.length - 1]!;
}

function pickEvent(state: GameState, now: Date): GameEventDef | null {
  const pool = EVENTS.filter((e) => e.id !== state.events.lastId && (e.when?.(state) ?? true));
  const weights = pool.map((e) => e.weight?.(state, now) ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!;
    if (r < 0) return pool[i]!;
  }
  return pool[0] ?? null;
}

function scheduleNext(state: GameState): void {
  const t = state.stats.playTimeMs;
  state.events.nextAt = t + CONFIG.eventMinMs + random() * (CONFIG.eventMaxMs - CONFIG.eventMinMs);
}

/** Pro Online-Tick: Boosts ablaufen lassen, Events planen, auslösen, verfallen lassen. */
export function updateEvents(
  state: GameState,
  dtMs: number,
  rates: () => { pps: number; click: number },
  now: Date = new Date(),
): void {
  // Boosts
  if (state.buffs.length > 0) {
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
    if (!ev.active.opened && t >= ev.active.expiresAt) resolveEvent(state, -1, rates());
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
  state.events.seen[def.id] = (state.events.seen[def.id] ?? 0) + 1;
  scheduleNext(state);

  const res: Resolution = { ...result, eventId: def.id, option, outcome };
  bus.emit('eventResolved', res);
  return res;
}

/** „!! DRINGEND !!“-Ticket erwischt. */
export function claimUrgent(state: GameState, rates: { pps: number; click: number }): EffectResult {
  const rewards = CONFIG.urgentRewards;
  const total = rewards.reduce((a, r) => a + r.weight, 0);
  let r = random() * total;
  const pick = rewards.find((x) => (r -= x.weight) < 0) ?? rewards[0]!;
  return applyEffect(state, pick.effect, rates);
}
