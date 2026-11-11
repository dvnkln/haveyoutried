// Betriebssysteme: nur Optik (Taskleiste, Fenster, Anmeldung, Werkzeuge; main.css unter html[data-os=…]).
// Welche Firma welches System benutzt, steht bei der Firma (content/companies.ts, Feld os).
// Erster Arbeitstag bei einer Firma schaltet ihr System für immer frei (core/os.ts).

export type OsId = 'win98' | 'xp' | 'win7' | 'win10' | 'win11' | 'debian' | 'ubuntu' | 'mac';

export interface OsDef {
  id: OsId;
  /** Name in der Auswahl und auf dem Anmeldebildschirm (Parodie, kein echter Name) */
  name: string;
}

/** Reihenfolge = Auswahl im System-Tab */
export const SYSTEMS: readonly OsDef[] = [
  { id: 'win98', name: 'Fenster 98' },
  { id: 'xp', name: 'Fenster XP' },
  { id: 'win7', name: 'Fenster 7' },
  { id: 'win10', name: 'Fenster 10' },
  { id: 'win11', name: 'Fenster 11' },
  { id: 'debian', name: 'Debiam' },
  { id: 'ubuntu', name: 'Ubuntü' },
  { id: 'mac', name: 'MäcOS' },
];

export const OS_IDS: readonly OsId[] = SYSTEMS.map((o) => o.id);
export const isOsId = (v: unknown): v is OsId => (OS_IDS as readonly unknown[]).includes(v);
export const osOf = (id: OsId): OsDef => SYSTEMS.find((o) => o.id === id)!;
