import { companyOf, type QuirkMods } from '../content/companies';
import type { GameState } from './state';

/** Eigenheit der aktuellen Firma mit allen Faktoren (fehlende = 1) */
export function quirkMods(state: GameState): Required<QuirkMods> {
  const m = companyOf(state.prestige.company).quirk?.mods ?? {};
  return { prod: 1, tempo: 1, reward: 1, costs: 1, events: 1, incidents: 1, urgent: 1, ...m };
}

/** „nie“ für Planer: weit in der Zukunft, aber eine endliche Zahl (Infinity übersteht kein JSON) */
export const NEVER = 1e15;

/** Wartezeit bis zum nächsten Ereignis, geteilt durch die Häufigkeit; Häufigkeit 0 = nie */
export const scaledDelay = (ms: number, rate: number) => (rate > 0 ? ms / rate : NEVER);

const LABELS: Record<keyof QuirkMods, string> = {
  prod: 'Infrastruktur',
  tempo: 'Tippen',
  reward: 'Wert je Ticket',
  costs: 'Preise',
  events: 'Pager',
  incidents: 'Incidents',
  urgent: 'VIP-Mails',
};

export interface QuirkEffect {
  text: string;
  /** gut oder schlecht für den Spieler; Pager/Incidents/VIP sind beides */
  tone: 'good' | 'bad' | 'mixed';
}

/** Mehr davon ist gut (Produktion, Tempo, Wert) bzw. weniger ist gut (Preise) */
const UP_IS_GOOD: Partial<Record<keyof QuirkMods, boolean>> = { prod: true, tempo: true, reward: true, costs: false };

/** Wirkung einzeln, z. B. [„Infrastruktur +30 %“ (gut), „Tippen −20 %“ (schlecht)] */
export function quirkEffects(mods: QuirkMods): QuirkEffect[] {
  return (Object.entries(mods) as [keyof QuirkMods, number][]).map(([k, v]) => {
    const up = UP_IS_GOOD[k];
    const tone = up === undefined || v === 1 ? 'mixed' : v > 1 === up ? 'good' : 'bad';
    if (v === 0) return { text: `${k === 'incidents' || k === 'urgent' ? 'keine' : 'kein'} ${LABELS[k]}`, tone };
    if ((k === 'events' || k === 'incidents' || k === 'urgent') && v >= 2) return { text: `${LABELS[k]} ×${v}`, tone };
    const pct = Math.round((v - 1) * 100);
    return { text: `${LABELS[k]} ${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`, tone };
  });
}

/** Wirkung in Worten, z. B. „Infrastruktur +30 % · Tippen −20 %“ */
export function describeQuirk(mods: QuirkMods): string {
  return quirkEffects(mods)
    .map((e) => e.text)
    .join(' · ');
}
