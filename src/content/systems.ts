// Betriebssysteme: nur Optik (Taskleiste, Fenster, Anmeldung, Werkzeuge; main.css unter html[data-os=…]).
// Welche Firma welches System benutzt, steht bei der Firma (content/companies.ts, Feld os).
// Erster Arbeitstag bei einer Firma schaltet ihr System für immer frei (core/os.ts).

export type OsId = 'win98' | 'xp' | 'win7' | 'win10' | 'win11' | 'debian' | 'ubuntu' | 'mac';

export interface OsDef {
  id: OsId;
  /** Name in der Auswahl und auf dem Anmeldebildschirm (Parodie, kein echter Name) */
  name: string;
  /** Spruch beim Auswählen im System-Tab */
  quip: string;
  /** Name/Titel auf dem Anmeldebildschirm, wo das Vorbild Logo oder Titel zeigt (98: Dialogtitel); null = keiner */
  loginBrand: string | null;
  /** eigener Satz unter dem Titel (sonst LOGIN.prompt) */
  loginPrompt?: string;
  /** Browser im Fenstertitel („Seite – Browser“) */
  browser: string;
  /** Titel der SSH-Sitzung, {host} = Rechnername */
  terminal: string;
  /** Look fertig (main.css)? Sonst wird es zwar still freigeschaltet, aber nicht gezeigt, gemeldet oder angeboten */
  ready: boolean;
}

/** Reihenfolge = Auswahl im System-Tab */
export const SYSTEMS: readonly OsDef[] = [
  { id: 'win98', name: 'Fenster 98', quip: 'Plug & Pray. Treiber von der Heft-CD.', loginBrand: 'Willkommen bei Fenster', loginPrompt: 'Geben Sie Benutzernamen und Kennwort ein, um sich bei Fenster anzumelden.', browser: 'Netz-Erkunder', terminal: 'Telnet - {host}', ready: true },
  { id: 'xp', name: 'Fenster XP', quip: 'Grüne Wiese, blauer Himmel, Service Pack 2.', loginBrand: 'Fenster XP', browser: 'Netzsurfer', terminal: 'root@{host} – PuTTY', ready: true },
  { id: 'win7', name: 'Fenster 7', quip: 'Der, den alle behalten wollten. Bis 2020. Und danach auch.', loginBrand: 'Fenster 7', browser: 'Netz-Erkunder 8', terminal: 'root@{host} – PuTTY', ready: true },
  { id: 'win10', name: 'Fenster 10', quip: 'Das letzte Fenster, das es je geben wird. Versprochen.', loginBrand: null, browser: 'Kante', terminal: 'PowerShell – ssh root@{host}', ready: false },
  { id: 'win11', name: 'Fenster 11', quip: 'Start in der Mitte. Vorher will es dein TPM-Modul sehen.', loginBrand: null, browser: 'Kante', terminal: 'root@{host}: ~', ready: false },
  { id: 'debian', name: 'Debiam', quip: 'Die Pakete sind älter als dein Praktikant. Dafür startet es immer.', loginBrand: 'Debiam', browser: 'Eiswiesel', terminal: 'xterm – root@{host}', ready: false },
  { id: 'ubuntu', name: 'Ubuntü', quip: 'Linux für Menschen. Die Menschen fragen trotzdem dich.', loginBrand: 'Ubuntü', browser: 'Glutfuchs', terminal: 'root@{host}: ~', ready: false },
  { id: 'mac', name: 'MäcOS', quip: 'Funktioniert einfach. Außer der Adapter fehlt.', loginBrand: null, browser: 'Pirsch', terminal: 'root@{host} — ssh — 80×24', ready: false },
];

export const OS_IDS: readonly OsId[] = SYSTEMS.map((o) => o.id);
export const isOsId = (v: unknown): v is OsId => (OS_IDS as readonly unknown[]).includes(v);
export const osOf = (id: OsId): OsDef => SYSTEMS.find((o) => o.id === id)!;
/** Systeme ohne fertigen Look laufen als XP */
export const FALLBACK_OS: OsId = 'xp';
