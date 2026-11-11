import { CONFIG } from '../config';
import type { GameState } from '../core/state';
import { pick, shuffle } from '../util';

// Rückkehr nach längerer Abwesenheit: Mail vom Chef mit „ein paar Fragen“.
// Die Punkte passen zur Dauer und zu dem, was gerade im Keller läuft.

/** Ab so langer Abwesenheit schreibt der Chef (darunter: kurze Meldung wie bisher) */
export const BOSS_REPORT_MIN_MS = 10 * 60_000;

export const REPORT_SUBJECTS = [
  'Kurze Frage',
  'Was haben Sie eigentlich gemacht?',
  'Statusbericht (bitte bis gestern)',
  'Ihre Abwesenheit',
  'Re: Re: Re: Wo sind Sie?',
  'Wichtig!!! (bitte lesen)',
];

export const REPORT_SIGNATURES = [
  '— Der Chef (gesendet von meinem iPhone)',
  '— Der Chef. PS: Mein Drucker geht wieder nicht.',
  '— Der Chef (diese Mail wurde von einer KI zusammengefasst)',
  '— Der Chef. Mehr Kumpel als Chef. Aber Chef.',
  '— Der Chef. Im Urlaub. Trotzdem erreichbar. Leider auch für Sie.',
];

export const REPORT_BUTTONS = ['Zur Kenntnis genommen', 'Antworten: „Lief alles.“', 'Als gelesen markieren', 'In „Später“ verschieben'];

interface ReportItem {
  /** nur wenn erfüllt (z. B. passende Infrastruktur vorhanden) */
  when?: (s: GameState) => boolean;
  /** gained = tatsächlich geschlossene Tickets (Zahlen in den Fragen dürfen nicht größer sein) */
  text: (min: number, s: GameState, gained: number) => string;
}

const per = (min: number, every: number, least = 1) => Math.max(least, Math.round(min / every));
const fmt = (n: number) => n.toLocaleString('de-DE');

export const REPORT_ITEMS: ReportItem[] = [
  { text: (m) => `${fmt(per(m, 9, 2))} Anrufe auf dem Anrufbeantworter. ${fmt(per(m, 9, 2) - 1)} davon: „Hallo? Ist da die IT?“` },
  { text: (m) => `Drucker „Dieter“ hat ${fmt(per(m, 40))}-mal „Papierstau“ gemeldet. Es war keins drin. Wer kümmert sich darum, wenn Sie nicht da sind?` },
  { text: (m) => `${fmt(per(m, 3, 4))} ungelesene Mails. ${fmt(per(m, 20))} mit „Dringend“ im Betreff. Eine davon von mir.` },
  { text: () => 'Ihr Platz wurde zweimal für ein Meeting gebucht. Es wurde nichts beschlossen. Sie haben also nichts verpasst.' },
  { text: () => 'Jemand hat gefragt, ob wir eine IT haben. Ich habe gesagt: „Ja, aber sie ist gerade nicht da.“ Stimmt das so?' },
  { text: (m) => `Der Kaffeeverbrauch ist ohne Sie um ${Math.min(80, per(m, 6, 5))} % gesunken. Wollen wir darüber reden?` },
  { text: () => 'Ihr Status stand die ganze Zeit auf „Bin gleich da“. Wie definieren Sie „gleich“?' },
  { text: () => 'Die Buchhaltung hat „nichts geändert“. Ich wollte es nur gesagt haben.' },
  {
    // nur wenn das Kamerateam wirklich da war (Pager-Ereignis oder Telefon-Geschichte)
    when: (s) => Object.keys(s.flags).some((k) => k.startsWith('ev:kamerateam:') || (k.startsWith('story:') && k.endsWith(':doku'))),
    text: () => 'Es war ein Kamerateam da. Ich habe gesagt, die IT läuft wegen mir so gut. Bitte nicht widersprechen, falls jemand fragt.',
  },
  { text: () => 'Der Sachbearbeiter gegenüber hat eine Liste geführt, wann Sie weg waren. Ich hab sie nicht gelesen. Also nur kurz.' },
  {
    when: (s) => s.generators.intern.owned > 0,
    text: (m) => `Ihre Praktikanten haben ${fmt(per(m, 30))} Server neu gestartet. ${fmt(Math.max(0, per(m, 30) - 1))} davon absichtlich.`,
  },
  {
    when: (s) => s.generators.bash.owned > 0,
    text: () => 'Auf dem Server liegen Dateien, die auf „.sh“ enden. Sind das Viren? Ich hab sie vorsichtshalber nicht gelöscht. Nur umbenannt.',
  },
  {
    when: (s) => s.generators.cron.owned > 0,
    text: (m, _s, g) => `Nachts um 3 haben Ihre Cronjobs ${fmt(Math.max(1, Math.round(Math.min(per(m, 5, 3), g * 0.4))))} Tickets geschlossen. Welche, weiß keiner. Ist das so gewollt?`,
  },
  {
    when: (s) => s.generators.ansible.owned > 0,
    text: () => 'Ich wollte etwas in der Firewall ändern. Eine Stunde später war es von selbst zurückgeändert. Wer ist dieses Ansible, und warum ist es stärker als ich?',
  },
  {
    when: (s) => s.generators.k8s.owned > 0,
    text: () => 'Die Server haben sich nachts immer wieder selbst neu gestartet. Laut Log heißt das „Self-Healing“. Klingt nach Wellness. Zahlen wir dafür?',
  },
  {
    when: (s) => s.generators.agent.owned > 0,
    text: (m) => `Ein KI-Agent hat in Ihrem Namen ${fmt(per(m, 4, 3))}-mal „Ich verstehe Ihre Frustration“ geschrieben. Die Kunden waren zufriedener als sonst.`,
  },
  {
    when: (s) => s.generators.undertable.owned > 0,
    text: () => 'Die Reinigungskraft sagt, unter einem Tisch im 2. OG ist es warm wie in einer Sauna. Sie macht dort jetzt Pause. Ist das ein Problem?',
  },
];

const hours = (ms: number) => {
  const h = ms / 3_600_000;
  return h === 1 ? 'eine Stunde' : `${h.toLocaleString('de-DE')} Stunden`;
};
/** Anteil als Wort, wo es schön klingt (0,2 → „ein Fünftel“) */
const share = (x: number) => ({ 0.5: 'die Hälfte', 0.4: 'zwei Fünftel', 0.25: 'ein Viertel', 0.2: 'ein Fünftel', 0.1: 'ein Zehntel' })[x] ?? `${Math.round(x * 100)} %`;

/** Die Regel für Abwesenheit in Worten, aus den echten Werten */
export function awayRule(rest: number = CONFIG.offlineRestShare): string {
  return `Die erste${CONFIG.offlineFullMs === 3_600_000 ? ' Stunde' : `n ${hours(CONFIG.offlineFullMs)}`} zählt voll, danach nur ${share(rest)}, nach ${hours(CONFIG.offlineCapMs)} nichts mehr.`;
}

/** Schlusssatz je nach Dauer */
export function reportCloser(elapsedMs: number, capped: boolean): string {
  if (capped) return `Sie waren über ${hours(CONFIG.offlineCapMs)} weg. Ab da hat sogar der Keller Feierabend gemacht. Die Personalabteilung nennt das „Wochenende“.`;
  const h = elapsedMs / 3_600_000;
  if (h >= 6) return pick(['Sie waren über Nacht weg? Die Server nicht. Nur so als Hinweis.', 'Ich habe heute Nacht schlecht geschlafen. Lief der Server? Egal, Sie waren ja eh nicht da.']);
  if (h >= 1) return pick(['Bitte kurze Rückmeldung. Dauert nicht lang.', 'Können wir dazu kurz einen Termin machen? 90 Minuten reichen.', 'Ich will nicht drängeln. Aber: Wann sind Sie wieder da?']);
  return pick(['Ach, Sie sind wieder da? Dann ist ja gut.', 'Waren Sie Kaffee holen? Bringen Sie mir einen mit. Nächstes Mal.', 'Nur zur Info. Kein Stress. (Ein bisschen Stress.)']);
}

export interface BossReport {
  subject: string;
  items: string[];
  closer: string;
  signature: string;
  button: string;
}

/** Drei passende Fragen, Betreff, Schluss und Unterschrift */
export function bossReport(state: GameState, elapsedMs: number, capped: boolean, rnd: () => number = Math.random, gained = Infinity): BossReport {
  const min = elapsedMs / 60_000;
  const pool = REPORT_ITEMS.filter((i) => !i.when || i.when(state));
  // Infrastruktur-Fragen bevorzugen: die zeigen, dass der Keller weitergearbeitet hat
  const special = pool.filter((i) => i.when);
  const plain = pool.filter((i) => !i.when);
  const take = (list: ReportItem[], n: number) => shuffle(list, rnd).slice(0, n);
  const chosen = [...take(special, Math.min(2, special.length)), ...take(plain, 3)].slice(0, 3);
  return {
    subject: pick(REPORT_SUBJECTS, rnd),
    items: chosen.map((i) => i.text(min, state, gained)),
    closer: reportCloser(elapsedMs, capped),
    signature: pick(REPORT_SIGNATURES, rnd),
    button: pick(REPORT_BUTTONS, rnd),
  };
}
