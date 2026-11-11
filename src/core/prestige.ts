import { GENERATORS, PRESTIGE } from '../config';
import { bus } from './bus';
import { scheduleNext } from './events';
import { incidentRunning, scheduleNextIncident } from './incidents';
import { resetBoss } from './boss';
import { nextCompany, unlockCompanyOs } from './os';
import { osOf } from '../content/systems';
import { bumpFlag, type GameState } from './state';

/** Gesamte Berufserfahrung, die Tickets aller Jobs zusammen wert sind. */
export function experienceFor(ticketsAllTime: number): number {
  const t = Math.max(0, ticketsAllTime);
  const root = (t / PRESTIGE.ticketsPerPoint) ** PRESTIGE.exponent;
  // Potenzen mit Bruch-Exponent runden knapp daneben (1000 ** (1/3) = 9,999…): zur nächsten ganzen Zahl
  // runden und einmal an der exakten Schwelle prüfen. Jenseits sicherer Ganzzahlen bringt das nichts mehr.
  const n = Math.round(root);
  if (!Number.isSafeInteger(n)) return Math.floor(root);
  return pointThreshold(n) > t ? n - 1 : n;
}

/** Ab so vielen Tickets (über alle Jobs) hat man n Punkte. */
function pointThreshold(n: number): number {
  return Math.round(PRESTIGE.ticketsPerPoint * n ** (1 / PRESTIGE.exponent));
}

/** Was eine Kündigung jetzt bringen würde. */
export function prestigeGain(state: GameState): number {
  return Math.max(0, experienceFor(state.ticketsAllTime) - state.prestige.experience);
}

/** Ab so vielen Tickets (über alle Jobs) gibt es den nächsten Punkt. */
export function ticketsForNextPoint(state: GameState): number {
  return pointThreshold(experienceFor(state.ticketsAllTime) + 1);
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

/** Punkt an „Karriere“: 0 = Kündigen geht noch nicht, 1 = geht, 2 = lohnt sich richtig (Bonus wächst spürbar) */
export function quitWorth(state: GameState): 0 | 1 | 2 {
  // wie canQuit, aber den Gewinn nur einmal rechnen (läuft jeden Frame)
  const gain = prestigeGain(state);
  if (gain < 1 || incidentRunning()) return 0;
  const now = 1 + experienceBonus(state.prestige.experience);
  const after = 1 + experienceBonus(state.prestige.experience + gain);
  return after / now >= PRESTIGE.worthIt ? 2 : 1;
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
  const next = nextCompany(state, rnd);
  state.prestige.company = next.id;
  // Meldung nur für Systeme mit fertigem Look; die anderen sind trotzdem freigeschaltet
  const newOs = unlockCompanyOs(state) && osOf(next.os).ready ? next.os : null;

  state.tickets = 0;
  state.ticketsTotal = 0;
  for (const g of GENERATORS) state.generators[g.id] = { owned: 0 };
  state.upgrades = {};
  state.settings.buyAmount = 1; // neuer Job, keine Infrastruktur: ×10/Max wäre nur verwirrend
  state.buffs = [];
  state.events.active = null;
  scheduleNext(state); // sonst piept es am ersten Arbeitstag sofort
  // neue Firma, neue Eigenheit: Incidents neu planen (z. B. gar keine beim Esoterikversand)
  scheduleNextIncident(state);
  resetBoss(state);
  state.incidents.active = '';

  bumpFlag(state, `company:${state.prestige.company}`);
  bus.emit('jobQuit', { gained, company: state.prestige.company, newOs });
  return gained;
}
