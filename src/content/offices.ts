// Büro-Stile: Wand und Schreibtisch je Firma (Farben und Muster in main.css unter html[data-office=…]).
// Welche Firma in welchem Büro sitzt, steht bei der Firma (content/companies.ts, Feld office).

export type Office = 'standard' | 'amt' | 'klinik' | 'startup' | 'altbau' | 'keller' | 'konzern' | 'bunt';

export const OFFICES: readonly Office[] = ['standard', 'amt', 'klinik', 'startup', 'altbau', 'keller', 'konzern', 'bunt'];
