import { prestigeGain } from '../core/prestige';
import { availableUpgrades, priceFor } from '../core/economy';
import type { GameState } from '../core/state';

// „Übergabe vom Vorgänger“: kurze Hinweise im richtigen Moment, je einmal.
// Jeder Hinweis zeigt auf eine Stelle (CSS-Selektor) und erscheint nur, solange die Sache neu ist,
// damit Leute mit Spielstand nicht nachträglich erklärt bekommen, was sie längst können.

export interface Hint {
  id: string;
  /** worauf gezeigt wird */
  target: string;
  text: string;
  /** wann der Hinweis dran ist */
  when: (s: GameState) => boolean;
  /** kann nie mehr dran sein (Sache längst bekannt): gilt still als gelesen */
  expired: (s: GameState) => boolean;
}

const noInfra = (s: GameState) => Object.values(s.generators).every((g) => g.owned === 0);
const seenEvent = (s: GameState) => Object.keys(s.flags).some((k) => k.startsWith('ev:'));

export const HINTS: Hint[] = [
  {
    id: 'call',
    target: '.caller:not(.quiet)',
    text: 'Das Telefon. Wer anruft, will was. Deine Antwort tippst du oben im Monitor, jede Taste ist richtig. Hab ich auch nie verstanden.',
    when: (s) => (s.flags.callers ?? 0) <= 1 && (s.flags.solved ?? 0) === 0,
    expired: (s) => (s.flags.solved ?? 0) > 0 || (s.flags.callers ?? 0) > 1,
  },
  {
    id: 'solved',
    target: '.desktop > .last-closed',
    text: 'Erstes Ticket zu! Hier unten steht, woran du gerade sitzt. Grüner Balken = gleich fertig. Dann kommt das nächste. Immer.',
    when: (s) => (s.flags.solved ?? 0) >= 1 && (s.flags.solved ?? 0) <= 3,
    expired: (s) => (s.flags.solved ?? 0) > 3,
  },
  {
    id: 'infra',
    target: '.app-infra',
    text: 'Genug Tickets für einen Praktikanten. Unter „Infra“ stellst du ihn ein. Der arbeitet auch, wenn du Kaffee holst.',
    when: (s) => s.prestige.jobs === 0 && noInfra(s) && s.tickets >= priceFor(s, 'intern', 1).cost,
    expired: (s) => s.prestige.jobs > 0 || !noInfra(s),
  },
  {
    id: 'upgrades',
    target: '.app-upgrades',
    text: '„Upgrades“: Dinge, die die Firma nie bezahlen würde. Hier zahlst du selbst. Macht dich schneller. Die Kaffeemaschine zuerst, glaub mir.',
    when: (s) => s.prestige.jobs === 0 && Object.keys(s.upgrades).length === 0 && availableUpgrades(s).some((u) => u.cost <= s.tickets),
    expired: (s) => s.prestige.jobs > 0 || Object.keys(s.upgrades).length > 0,
  },
  {
    id: 'pager',
    target: '.pager-device',
    text: 'Der Pager. Piept er, brennt irgendwo was. Antippen und entscheiden. Wer nicht entscheidet, dem entscheidet das Schicksal.',
    when: (s) => !!s.events.active && !seenEvent(s),
    expired: seenEvent,
  },
  {
    id: 'urgent',
    target: '.urgent-note',
    text: 'Mails mit rotem Ausrufezeichen sind VIP-Tickets vom Chef. Schnell antippen, die Benachrichtigung bleibt nicht lange. Er merkt sich, wer zu langsam war.',
    when: (s) => (s.flags.urgent ?? 0) === 0,
    expired: (s) => (s.flags.urgent ?? 0) > 0,
  },
  {
    id: 'cup',
    target: '.espresso-cup',
    text: 'Eine fliegende Espressotasse! Schnell antippen. Danach reicht es eine Weile, eine Taste gedrückt zu halten. Koffein ist auch eine Abhängigkeit, aber die gute.',
    when: (s) => (s.flags.espresso ?? 0) === 0,
    expired: (s) => (s.flags.espresso ?? 0) > 0,
  },
  {
    id: 'buff',
    target: '.buffs .buff',
    text: 'Oben am Zähler hängt ein Boost. Oder eine Bremse, je nachdem, wie dein Tag läuft. Der Balken zeigt, wie lange noch. Antippen erklärt den Rest.',
    when: (s) => s.buffs.length > 0,
    expired: () => false,
  },
  {
    id: 'boss',
    target: '.boss-chip:not([hidden])',
    text: 'Der Chef hat eine Aufgabe. Hier steht, wie weit du bist, Antippen zeigt sie ganz. Schaffst du sie rechtzeitig, gibt es Tickets. Und ein Nicken. Das Nicken ist selten.',
    when: (s) => !!s.boss.kind && s.boss.done === 0,
    expired: (s) => s.boss.done > 0,
  },
  {
    id: 'career',
    target: '.app-career',
    text: 'Kündigen ist hier keine Niederlage, sondern Karriere. Du nimmst Erfahrung mit, der nächste Job läuft schneller. Steht unter „Karriere“.',
    when: (s) => s.prestige.jobs === 0 && prestigeGain(s) >= 1,
    expired: (s) => s.prestige.jobs > 0,
  },
];

/** Überschriften der Post-its vom Vorgänger */
export const HINT_HEADS = ['Notiz vom Vorgänger:', 'Übergabe, Seite 1 von 1:', 'Von K. (glaube ich):', 'PS vom Vorgänger:'];
export const HINT_OK = ['Alles klar', 'Verstanden', 'Danke, K.', 'Notiert'];
