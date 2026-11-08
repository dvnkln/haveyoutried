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
  { id: 'ansible', baseCost: 12_000, baseProd: 47 },
  { id: 'k8s', baseCost: 130_000, baseProd: 260 },
  { id: 'agent', baseCost: 1_400_000, baseProd: 1_400 },
  { id: 'undertable', baseCost: 20_000_000, baseProd: 7_800 },
] as const satisfies readonly GeneratorDef[];

export type GeneratorId = (typeof GENERATORS)[number]['id'];

// --- Upgrades ---

export type UpgradeEffect =
  /** Klickwert × mult */
  | { kind: 'click'; mult: number }
  /** Jeder Klick bringt zusätzlich diesen Anteil der Produktion/s */
  | { kind: 'clickPps'; fraction: number }
  /** Produktion eines Generators × mult */
  | { kind: 'gen'; gen: GeneratorId; mult: number }
  /** Gesamtproduktion und Klicks × mult */
  | { kind: 'global'; mult: number };

export type UpgradeUnlock =
  | { kind: 'owned'; gen: GeneratorId; n: number }
  | { kind: 'clicks'; n: number }
  | { kind: 'total'; n: number };

export interface UpgradeDef {
  id: string;
  cost: number;
  unlock: UpgradeUnlock;
  effect: UpgradeEffect;
}

/** Pro Generator drei Stufen ×2, freigeschaltet über den Bestand. */
const GEN_UPGRADE_TIERS = [
  { owned: 1, costFactor: 10 },
  { owned: 10, costFactor: 100 },
  { owned: 25, costFactor: 1_000 },
] as const;

const generatorUpgrades: UpgradeDef[] = GENERATORS.flatMap((g) =>
  GEN_UPGRADE_TIERS.map((tier, i) => ({
    id: `${g.id}-${i + 1}`,
    cost: g.baseCost * tier.costFactor,
    unlock: { kind: 'owned', gen: g.id, n: tier.owned },
    effect: { kind: 'gen', gen: g.id, mult: 2 },
  })),
);

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'coffee', cost: 100, unlock: { kind: 'clicks', n: 25 }, effect: { kind: 'click', mult: 2 } },
  { id: 'keyboard', cost: 1_000, unlock: { kind: 'clicks', n: 200 }, effect: { kind: 'click', mult: 2 } },
  { id: 'monitor2', cost: 15_000, unlock: { kind: 'total', n: 5_000 }, effect: { kind: 'clickPps', fraction: 0.01 } },
  { id: 'macro', cost: 100_000, unlock: { kind: 'clicks', n: 1_000 }, effect: { kind: 'click', mult: 3 } },
  { id: 'duck', cost: 1_000_000, unlock: { kind: 'total', n: 500_000 }, effect: { kind: 'clickPps', fraction: 0.02 } },
  { id: 'rtfm', cost: 75_000, unlock: { kind: 'total', n: 25_000 }, effect: { kind: 'global', mult: 1.1 } },
  { id: 'kanban', cost: 6_000_000, unlock: { kind: 'total', n: 2_000_000 }, effect: { kind: 'global', mult: 1.1 } },
  { id: 'monitoring', cost: 300e6, unlock: { kind: 'total', n: 100e6 }, effect: { kind: 'global', mult: 1.15 } },
  { id: 'freeze', cost: 15e9, unlock: { kind: 'total', n: 5e9 }, effect: { kind: 'global', mult: 1.2 } },
  ...generatorUpgrades,
];

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
  /** Anrufer wechselt nach zufällig min..max geschlossenen Tickets … */
  callerTicketsMin: 4,
  callerTicketsMax: 10,
  /** …aber erst, wenn die Sprechblase lange genug stand: Basis + pro Zeichen */
  callerMinShowMs: 2_500,
  callerShowMsPerChar: 50,
  /** Anteil Anrufe, die von Uhrzeit/Infrastruktur abhängen (wenn passende da sind) */
  callerSituationalChance: 0.3,
  /** Chance, dass der letzte Anrufer nochmal anruft */
  callerCallbackChance: 0.1,
  /** Abstand zwischen Ambient-Syslog-Zeilen in ms */
  ambientLogMinMs: 2_500,
  ambientLogMaxMs: 7_000,
  /** Klick-Logzeilen höchstens so oft */
  clickLogMinMs: 1_200,
  logMaxLines: 100,
  /** Erste Ticketnummer */
  ticketNumberOffset: 4_711,

  // Sound
  /** Klicks innerhalb dieses Abstands zählen als Serie (Tonhöhe steigt) */
  comboWindowMs: 450,
} as const;
