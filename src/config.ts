// Alle Balancing-Werte an einem Ort. Texte liegen in src/content/.

export interface GeneratorDef {
  id: string;
  /** Kosten des ersten Exemplars in Tickets */
  baseCost: number;
  /** Tickets pro Sekunde je Exemplar */
  baseProd: number;
}

export const GENERATORS = [
  { id: 'intern', baseCost: 15, baseProd: 0.025 },
  { id: 'bash', baseCost: 100, baseProd: 0.25 },
  { id: 'cron', baseCost: 1_100, baseProd: 2 },
  { id: 'ansible', baseCost: 12_000, baseProd: 11.75 },
  { id: 'k8s', baseCost: 130_000, baseProd: 65 },
  { id: 'agent', baseCost: 1_400_000, baseProd: 350 },
  { id: 'undertable', baseCost: 20_000_000, baseProd: 1_950 },
] as const satisfies readonly GeneratorDef[];

export type GeneratorId = (typeof GENERATORS)[number]['id'];

// --- Upgrades ---

export type UpgradeEffect =
  /** Tipptempo × mult (weniger Anschläge pro Ticket) */
  | { kind: 'click'; mult: number }
  /** Jeder Anschlag bringt beim Lösen zusätzlich diesen Anteil der Produktion/s */
  | { kind: 'clickPps'; fraction: number }
  /** Jedes gelöste Ticket bringt zusätzlich so viele Sekunden Produktion */
  | { kind: 'solveSec'; sec: number }
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
  { id: 'coffee', cost: 40, unlock: { kind: 'clicks', n: 25 }, effect: { kind: 'click', mult: 2 } },
  { id: 'mousepad', cost: 150, unlock: { kind: 'clicks', n: 60 }, effect: { kind: 'click', mult: 1.5 } },
  { id: 'mouse', cost: 10_000, unlock: { kind: 'total', n: 3_000 }, effect: { kind: 'solveSec', sec: 0.1 } },
  { id: 'keyboard', cost: 500, unlock: { kind: 'clicks', n: 200 }, effect: { kind: 'click', mult: 2 } },
  { id: 'answering', cost: 2_500, unlock: { kind: 'clicks', n: 500 }, effect: { kind: 'click', mult: 2 } },
  { id: 'headset', cost: 15_000, unlock: { kind: 'total', n: 5_000 }, effect: { kind: 'solveSec', sec: 0.1 } },
  { id: 'basement', cost: 600_000, unlock: { kind: 'total', n: 200_000 }, effect: { kind: 'global', mult: 1.1 } },
  { id: 'monitor2', cost: 15_000, unlock: { kind: 'total', n: 5_000 }, effect: { kind: 'clickPps', fraction: 0.01 } },
  { id: 'macro', cost: 50_000, unlock: { kind: 'total', n: 15_000 }, effect: { kind: 'solveSec', sec: 0.2 } },
  // Licht und Monitor gehen von selbst an (ui/power.ts), nebenbei ein bisschen schneller
  { id: 'smartoffice', cost: 40_000, unlock: { kind: 'total', n: 12_000 }, effect: { kind: 'global', mult: 1.05 } },
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
  /** Wertung der Spiele: Fortschritt × max(floor, 1 − Fehlgriffe × mistakePenalty) */
  scoring: { mistakePenalty: 0.1, floor: 0.4 },
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
      shiftGraceMs: 200,
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

// --- Prestige („Kündigen“) und Achievements ---

export const PRESTIGE = {
  /** Berufserfahrung gesamt = floor((Tickets aller Jobs / ticketsPerPoint) ^ exponent) */
  ticketsPerPoint: 25_000,
  exponent: 1 / 3,
  /** Bonus je Punkt Berufserfahrung auf Produktion und Tipptempo */
  bonusPerPoint: 0.05,
};

/**
 * Tickets von Hand: Tippen füllt das Ticket, erst „Gelöst!“ zahlt aus.
 * Tempo (Klick-Upgrades, Berufserfahrung, Überstunden) senkt die nötigen Anschläge.
 */
export const SOLVE = {
  /** Arbeit pro Ticket in Anschlägen bei Tempo 1 */
  work: 25,
  /** ein Ticket braucht immer mindestens so viele Anschläge (sonst Stempel bei jeder Taste) */
  minPresses: 3,
  /** Tickets pro Lösung (vor Multiplikatoren); Tempo über die Mindest-Anschläge hinaus zählt als Wert */
  reward: 1,
  /** jede Lösung bringt außerdem so viele Sekunden Produktion: aktives Spielen bleibt wertvoll */
  ppsSec: 0.15,
  /** je Ticket in Folge +5 %, höchstens ×2 */
  perStreak: 0.05,
  maxStreakMult: 2,
  /** Serie reißt, wenn so lange keine Taste gedrückt wird */
  breakMs: 4_000,
  /** Meilensteine der Serie: Extra (Sekunden Produktion bzw. Tickets-Lösungen), was mehr ist */
  milestoneSec: 15,
  milestoneTickets: 5,
};

export const ACHIEVEMENTS_CFG = {
  /** Bonus je freigeschaltetem Achievement auf Produktion und Klicks */
  bonusPerAchievement: 0.01,
  /** Prüfintervall in ms */
  checkMs: 1_000,
  /** Uhrzeit-Achievements zählen nur, wenn der letzte Klick höchstens so lange her ist */
  activeWindowMs: 60_000,
};

export const CONFIG = {
  /** Ruhiger Start: so viele Anschläge, bevor der erste Anrufer klingelt und Timer laufen */
  onboardingClicks: 8,
  /** Fester Logik-Takt */
  tickMs: 100,
  /** Max. Frame-Delta, das der Loop nachholt (Rest regelt Offline-Progress) */
  maxFrameDeltaMs: 1_000,
  autosaveMs: 10_000,
  /** Abwesenheit zählt höchstens so lange (danach produziert nichts mehr) */
  offlineCapMs: 8 * 60 * 60 * 1_000,
  /** so lange zählt Abwesenheit voll … */
  offlineFullMs: 60 * 60 * 1_000,
  /** … danach nur noch dieser Anteil (eine Nacht lohnt sich, ersetzt aber kein Spielen) */
  offlineRestShare: 0.2,
  /** Seite offen, aber keine Eingabe: ab dann Licht und Bildschirm aus, Rechnung wie bei Abwesenheit */
  afkMs: 10 * 60 * 1_000,
  /** Ab dieser Abwesenheit gibt es einen Bericht */
  offlineReportMinMs: 30_000,

  /** Wachstumsfaktor der Generatorkosten pro gekauftem Exemplar */
  costGrowth: 1.15,
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
  /** Chance, dass bei einem neuen Anruf eine fällige Folge einer Telefon-Geschichte drankommt */
  callerStoryChance: 0.12,
  /** Chance, dass der letzte Anrufer nochmal anruft */
  callerCallbackChance: 0.1,
  /** Abstand zwischen Ambient-Syslog-Zeilen in ms */
  ambientLogMinMs: 2_500,
  ambientLogMaxMs: 7_000,
  logMaxLines: 100,
  // Zufallsevents (Zeiten in Spielzeit, laufen offline nicht weiter)
  eventFirstMs: 3 * 60_000,
  eventMinMs: 4 * 60_000,
  eventMaxMs: 8 * 60_000,
  /** so lange piept der Pager, bevor „keine Reaktion“ gilt */
  eventExpireMs: 45_000,
  /** nach Abwesenheit frühestens so viel Spielzeit bis zum nächsten Pager-Event */
  eventReturnDelayMs: 5_000,
  /** Fliegende Kaffeetasse (ab Upgrade „Kaffeemaschine“): erwischt = Doppelter Espresso, Taste halten statt tippen */
  espresso: {
    minMs: 4 * 60_000,
    maxMs: 8 * 60_000,
    /** so lange fliegt sie durchs Bild */
    flightMs: 5_500,
    durationMs: 30_000,
    /** Anschläge pro Sekunde je gehaltener Taste (höchstens zwei Daumen): deutlich schneller als jede Hand */
    rate: 40,
    /**
     * Bei der Rate löst man 13–40 Tickets pro Sekunde. Stempel, Erfolgston und „+Tickets“
     * kommen dann höchstens in diesem Abstand; dazwischen zählt nur die Serie bzw. die Summe.
     */
    celebrateGapMs: 120,
    /** Tastatur rattert: so oft geht unter Espresso eine andere Taste kurz runter (nur Optik) */
    ghostEveryMs: 60,
    ghostDownMs: 90,
    /** schneller als man sie einzeln wahrnimmt: Tastenton und Papierschnipsel höchstens in diesem Abstand */
    soundGapMs: 40,
    scrapGapMs: 150,
  },
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
