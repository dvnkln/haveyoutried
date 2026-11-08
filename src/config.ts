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

// --- Zufallsevents ---

export type EventEffect =
  | { kind: 'none' }
  /** Sofort-Tickets: max(Klickwert × clicks, Produktion/s × sec) */
  | { kind: 'tickets'; sec: number; clicks: number }
  /** Verlust: frac des Kontostands, höchstens Produktion × sec (bzw. Klickwert × clicks) */
  | { kind: 'lose'; frac: number; sec: number; clicks: number }
  /** zeitlich begrenzter Multiplikator auf Produktion oder Klicks */
  | { kind: 'buff'; target: 'prod' | 'click'; mult: number; sec: number };

export const EVENT_EFFECTS = {
  none: { kind: 'none' },
  tip: { kind: 'tickets', sec: 60, clicks: 15 },
  win: { kind: 'tickets', sec: 300, clicks: 40 },
  jackpot: { kind: 'tickets', sec: 900, clicks: 100 },
  lossSmall: { kind: 'lose', frac: 0.05, sec: 120, clicks: 10 },
  loss: { kind: 'lose', frac: 0.1, sec: 300, clicks: 30 },
  rush: { kind: 'buff', target: 'prod', mult: 2, sec: 60 },
  flow: { kind: 'buff', target: 'prod', mult: 3, sec: 45 },
  overtime: { kind: 'buff', target: 'click', mult: 7, sec: 30 },
  fire: { kind: 'buff', target: 'prod', mult: 0.5, sec: 60 },
  fireBig: { kind: 'buff', target: 'prod', mult: 0.25, sec: 90 },
} as const satisfies Record<string, EventEffect>;

export type EventEffectId = keyof typeof EVENT_EFFECTS;

// --- Incidents (Minispiele nach Monitoring-Alarm) ---

export const INCIDENT_IDS = ['raid', 'spam', 'services', 'loggrep', 'network', 'patch'] as const;
export type IncidentId = (typeof INCIDENT_IDS)[number];

/** Ab dieser Leistung gilt ein Incident als gelöst (RECOVERY statt ESCALATION) */
const INCIDENT_GOOD_MIN = 0.4;

export const INCIDENTS = {
  goodMin: INCIDENT_GOOD_MIN,
  /** Spielzeit bis zum ersten Incident, danach zufällig min..max */
  firstMs: 5 * 60_000,
  minMs: 6 * 60_000,
  maxMs: 12 * 60_000,
  /** „Übernehmen“-Button ist erst danach aktiv (gegen Fehlgriffe beim Dauertippen) */
  ackArmMs: 1_200,
  /** Countdown vor dem Spielstart (Spielfeld schon sichtbar, aber eingefroren) */
  readyMs: 3_000,
  /** Alarm wiederholt sich, bis übernommen wird */
  alarmRepeatMs: 6_000,
  /** nach Abwesenheit frühestens so viel Spielzeit bis zum nächsten Incident */
  returnDelayMs: 20_000,
  /** läuft gerade ein Pager-Event, wird so lange verschoben */
  retryMs: 30_000,
  /** Score → Effekte (aus EVENT_EFFECTS), erste passende Stufe gilt */
  rewards: [
    { min: 0.95, effects: ['win', 'flow'] },
    { min: 0.8, effects: ['win'] },
    { min: INCIDENT_GOOD_MIN, effects: ['tip'] },
    { min: 0, effects: ['fire'] },
  ] as { min: number; effects: EventEffectId[] }[],
  games: {
    raid: {
      durationMs: 20_000,
      disks: 12,
      /** RAID 6: zwei Ausfälle verkraftbar, beim dritten ist das Array tot */
      maxFailed: 3,
      /** Abstand zwischen Plattenausfällen, wird im Spielverlauf kürzer */
      failEveryStartMs: 1_400,
      failEveryEndMs: 550,
      rebuildMs: 1_200,
    },
    spam: {
      durationMs: 20_000,
      /** so viele richtige Entscheidungen = volle Punktzahl */
      target: 14,
    },
    services: {
      durationMs: 25_000,
      rounds: 4,
      /** Zeitstrafe für Neustart des falschen Dienstes */
      wrongPenaltyMs: 1_500,
    },
    loggrep: {
      durationMs: 25_000,
      /** so viele echte Fehler tauchen auf */
      rounds: 5,
      /** Abstand neuer Logzeilen, wird schneller */
      intervalStartMs: 800,
      intervalEndMs: 450,
      /** Nachsicht: kurz nach dem Nachrücken zählt die Zeile unter dem Fehler auch als Treffer */
      shiftGraceMs: 350,
      /** sichtbare Zeilen; fällt der Fehler oben raus, ist er verpasst */
      window: 9,
      /** Störzeilen vor dem echten Fehler (min..max) */
      decoysMin: 3,
      decoysMax: 7,
      wrongPenaltyMs: 1_000,
    },
    network: {
      durationMs: 25_000,
      wrongPenaltyMs: 1_500,
    },
    patch: {
      durationMs: 25_000,
      cables: 5,
      wrongPenaltyMs: 1_200,
      /** Kabel auf den Uplink: Broadcast-Sturm */
      uplinkPenaltyMs: 3_000,
    },
  },
} as const;

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
  // Zufallsevents (Zeiten in Spielzeit, laufen offline nicht weiter)
  eventFirstMs: 3 * 60_000,
  eventMinMs: 4 * 60_000,
  eventMaxMs: 8 * 60_000,
  /** so lange piept der Pager, bevor „keine Reaktion“ gilt */
  eventExpireMs: 45_000,
  /** nach Abwesenheit frühestens so viel Spielzeit bis zum nächsten Pager-Event */
  eventReturnDelayMs: 5_000,
  /** „!! DRINGEND !!“-Tickets in der Queue */
  urgentMinMs: 90_000,
  urgentMaxMs: 240_000,
  urgentVisibleMs: 9_000,
  /** Belohnung beim Erwischen: Effekt und Gewicht */
  urgentRewards: [
    { effect: 'win', weight: 60 },
    { effect: 'overtime', weight: 25 },
    { effect: 'flow', weight: 15 },
  ] as { effect: EventEffectId; weight: number }[],

  /** Erste Ticketnummer */
  ticketNumberOffset: 4_711,
} as const;
