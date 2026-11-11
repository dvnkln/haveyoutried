import type { GameState } from '../core/state';
import { companyOf } from './companies';
import type { Office } from './offices';

// Wer und was nur in bestimmten Firmen vorkommt (Anrufer, Geschichten, Ereignisse)

/** Firma gerade eine von diesen */
export const atCompany =
  (...ids: string[]) =>
  (s: GameState) =>
    ids.includes(s.prestige.company);

/** Büro-Stil der Firma (z. B. alle Start-ups) */
export const atOffice = (office: Office) => (s: GameState) => companyOf(s.prestige.company).office === office;

/** Fortschritt einer Telefon-Geschichte, je Firma gespeichert */
export const storyKey = (company: string, id: string) => `story:${company}:${id}`;
export const storyAtKey = (company: string, id: string) => `storyAt:${company}:${id}`;

/** Herr K. gehört zur Spedition (erste Firma) */
export const HERRK_COMPANY = 'mueller';
/** nach so vielen Folgen seiner Geschichte ist er in Rente (Folge 3 = letzter Tag; ein Test prüft das) */
export const HERRK_RETIRED_STEP = 3;
/** Herr K. ruft an: nur bei der Spedition und nur bis zur Rente */
export const herrKAround = (s: GameState) =>
  s.prestige.company === HERRK_COMPANY && (s.flags[storyKey(HERRK_COMPANY, 'herrk')] ?? 0) < HERRK_RETIRED_STEP;
