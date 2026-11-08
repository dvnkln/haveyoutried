// Alle Balancing-Werte an einem Ort. Texte liegen in src/content/.

export interface GeneratorDef {
  id: string;
  /** Kosten des ersten Exemplars in Tickets */
  baseCost: number;
  /** Tickets pro Sekunde je Exemplar */
  baseProd: number;
}

export const GENERATORS = [
  { id: 'intern', baseCost: 15, baseProd: 0.1 },
  { id: 'bash', baseCost: 100, baseProd: 1 },
  { id: 'cron', baseCost: 1_100, baseProd: 8 },
  // Phase 2: ansible, k8s, agent, undertable
] as const satisfies readonly GeneratorDef[];

export type GeneratorId = (typeof GENERATORS)[number]['id'];

export const CONFIG = {
  /** Fester Logik-Takt */
  tickMs: 100,
  /** Max. Frame-Delta, das der Loop nachholt (Rest regelt Offline-Progress) */
  maxFrameDeltaMs: 1_000,
  autosaveMs: 10_000,
  /** Offline-Fortschritt wird höchstens für diese Dauer gutgeschrieben */
  offlineCapMs: 8 * 60 * 60 * 1_000,
  /** Ab dieser Abwesenheit gibt es einen Bericht */
  offlineReportMinMs: 30_000,

  /** Wachstumsfaktor der Generatorkosten pro gekauftem Exemplar */
  costGrowth: 1.15,
  clickValue: 1,
  /** Generator wird sichtbar, sobald Lifetime-Tickets diesen Anteil seiner Basiskosten erreichen */
  unlockAtFraction: 0.5,
  /** Besitz-Schwellen, die einen Meilenstein-Logeintrag auslösen */
  milestones: [1, 10, 25, 50, 100, 150, 200, 300, 400, 500],

  // Flavor-Timing (kein Balancing, aber zentral einstellbar)
  /** Anrufer wechselt nach zufällig min..max geschlossenen Tickets */
  callerTicketsMin: 4,
  callerTicketsMax: 10,
  /** …aber erst, wenn die Sprechblase lange genug stand: Basis + pro Zeichen */
  callerMinShowMs: 2_500,
  callerShowMsPerChar: 50,
  /** Abstand zwischen Ambient-Syslog-Zeilen in ms */
  ambientLogMinMs: 2_500,
  ambientLogMaxMs: 7_000,
  /** Klick-Logzeilen höchstens so oft */
  clickLogMinMs: 1_200,
  logMaxLines: 100,
  /** Erste Ticketnummer */
  ticketNumberOffset: 4_711,
} as const;
