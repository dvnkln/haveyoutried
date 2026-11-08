import { GENERATORS, PRESTIGE } from '../config';
import { COMPANIES } from '../content/companies';
import { pick } from '../util';
import { bus } from './bus';
import { scheduleNext } from './events';
import { incidentRunning } from './incidents';
import { bumpFlag, type GameState } from './state';

/** Gesamte Berufserfahrung, die Tickets aller Jobs zusammen wert sind. */
export function experienceFor(ticketsAllTime: number): number {
  return Math.floor((Math.max(0, ticketsAllTime) / PRESTIGE.ticketsPerPoint) ** PRESTIGE.exponent);
}

/** Was eine Kündigung jetzt bringen würde. */
export function prestigeGain(state: GameState): number {
  return Math.max(0, experienceFor(state.ticketsAllTime) - state.prestige.experience);
}

/** Ab so vielen Tickets (über alle Jobs) gibt es den nächsten Punkt. */
export function ticketsForNextPoint(state: GameState): number {
  const next = experienceFor(state.ticketsAllTime) + 1;
  return PRESTIGE.ticketsPerPoint * next ** (1 / PRESTIGE.exponent);
}

/** Bonusfaktor aus Berufserfahrung (Produktion und Klicks). */
export function prestigeMultiplier(state: GameState): number {
  return 1 + experienceBonus(state.prestige.experience);
}

/** Bonusanteil für eine Menge Berufserfahrung (0.1 = +10 %). */
export function experienceBonus(experience: number): number {
  return experience * PRESTIGE.bonusPerPoint;
}

export function canQuit(state: GameState): boolean {
  return prestigeGain(state) >= 1 && !incidentRunning();
}

/**
 * Kündigen: Erfahrung gutschreiben, Job-Fortschritt zurücksetzen, neue Firma.
 * Mutiert den Zustand an Ort und Stelle (alle UI-Teile halten dieselbe Referenz).
 */
export function quitJob(state: GameState, rnd: () => number = Math.random): number {
  if (!canQuit(state)) return 0;
  const gained = prestigeGain(state);
  state.prestige.experience += gained;
  state.prestige.jobs += 1;
  bumpFlag(state, `company:${state.prestige.company}`);
  state.prestige.company = pick(
    COMPANIES.filter((c) => c.id !== state.prestige.company),
    rnd,
  ).id;

  state.tickets = 0;
  state.ticketsTotal = 0;
  for (const g of GENERATORS) state.generators[g.id] = { owned: 0 };
  state.upgrades = {};
  state.buffs = [];
  state.events.active = null;
  scheduleNext(state); // sonst piept es am ersten Arbeitstag sofort
  state.incidents.active = '';

  bumpFlag(state, `company:${state.prestige.company}`);
  bus.emit('jobQuit', { gained, company: state.prestige.company });
  return gained;
}
