import { CONFIG } from '../config';
import type { GameState } from '../core/state';
import { draw } from '../core/deck';
import { pick } from '../util';

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
  'Kurzer Austausch (dauert)',
  'Bitte um Rückmeldung (Frist: vorhin)',
  'FYI',
  'Sie wissen schon, worum es geht',
];

export const REPORT_SIGNATURES = [
  '— Der Chef (gesendet von meinem iPhone)',
  '— Der Chef. PS: Mein Drucker geht wieder nicht.',
  '— Der Chef (diese Mail wurde von einer KI zusammengefasst)',
  '— Der Chef. Mehr Kumpel als Chef. Aber Chef.',
  '— Der Chef. Im Urlaub. Trotzdem erreichbar. Leider auch für Sie.',
  '— Der Chef. Abteilungsleiter. Noch.',
  '— Der Chef. Diktiert, nicht gelesen.',
  '— Ihr Chef. Vorgesetzter, Mentor, Visionär. In dieser Reihenfolge.',
  '— Der Chef (bitte nicht an die Zentrale weiterleiten)',
];

export const REPORT_BUTTONS = [
  'Zur Kenntnis genommen',
  'Antworten: „Lief alles.“',
  'Als gelesen markieren',
  'In „Später“ verschieben',
  'Antworten: „Bin dran.“',
  'Ausdrucken und abheften',
];

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
  { text: () => 'Ich habe in Ihrer Abwesenheit selbst einen Drucker installiert. Er druckt jetzt im Keller. Wir haben keinen Drucker im Keller.' },
  { text: () => 'Mir hat jemand gesagt, ich sei „nicht mehr tragbar“. Es ging um meinen Laptop, glaube ich. Können Sie mal nachsehen, ob der zu schwer ist?' },
  { text: () => 'Jemand aus dem Vertrieb hat seinen Hund mitgebracht. Der hat ein Kabel angeknabbert. Das Internet geht noch, aber der Hund guckt komisch. Muss ich das melden? Den Hund, meine ich.' },
  { text: () => 'Das 3. OG hat ein Ticket als „sehr dringend“ geschickt. Ich hab gesagt: Pipifax. Kurz danach ist das 3. OG ausgefallen. Zusammenhang? Bitte bis morgen klären.' },
  { text: () => 'Ich habe heute schon drei Entscheidungen getroffen. Vor dem ersten Kaffee. Der Kürbis ist noch sehr saftig, sage ich immer. Bitte prüfen Sie trotzdem, ob die Firewall noch da ist.' },
  { text: () => 'Der Chef vom 2. OG hat gefragt, wo Sie sind. Ich hab gesagt: „Auf Fortbildung.“ Bitte sehen Sie entsprechend fortgebildet aus.' },
  { text: () => 'Ich habe Ihren Schreibtisch aufgeräumt. Also, ich habe alles in eine Schublade geschoben. Welche, weiß ich nicht mehr.' },
  { text: () => 'Ich habe im Chat einen Kanal „IT-Notfälle“ angelegt. Da sind jetzt 140 Leute drin. Sie nicht. Bitte nachholen.' },
  { text: () => 'Die Zentrale hat nach „dem Admin“ gefragt. Ich habe gesagt, ich bin der Admin. Kurze Frage: Was ist ein Hypervisor?' },
  { text: () => 'Die Kaffeemaschine zeigt „Entkalken“. Ist das IT? Ich finde: Alles mit Display ist IT.' },
  { text: () => 'Ich habe Ihre Abwesenheitsnotiz verbessert: „Bei Fragen wenden Sie sich an den Chef.“ Viele haben angerufen. Ich bin nicht rangegangen.' },
  {
    when: (s) => s.generators.intern.owned > 0,
    text: (m) => `Ihre Praktikanten haben ${fmt(per(m, 30))} Server neu gestartet. ${fmt(Math.max(0, per(m, 30) - 1))} davon absichtlich.`,
  },
  {
    when: (s) => s.generators.intern.owned > 0,
    text: () => 'Der Praktikant hat mich geduzt. Ich habe nichts gesagt, ich bin ja modern. Aber sagen Sie ihm bitte, dass ich es gemerkt habe.',
  },
  {
    when: (s) => s.generators.bash.owned > 0,
    text: () => 'Auf dem Server liegen Dateien, die auf „.sh“ enden. Sind das Viren? Ich hab sie vorsichtshalber nicht gelöscht. Nur umbenannt.',
  },
  {
    when: (s) => s.generators.bash.owned > 0,
    text: () => 'Ein Skript hat mir eine Mail geschickt: „Job done.“ Wer ist Job, und warum ist er vor mir fertig?',
  },
  {
    when: (s) => s.generators.cron.owned > 0,
    text: (m, _s, g) => `Nachts um 3 haben Ihre Cronjobs ${fmt(Math.max(1, Math.round(Math.min(per(m, 5, 3), g * 0.4))))} Tickets geschlossen. Welche, weiß keiner. Ist das so gewollt?`,
  },
  {
    when: (s) => s.generators.cron.owned > 0,
    text: () => 'Nachts kam eine Mail von einem „Cron Daemon“. Klingt nach Heavy Metal. Haben wir eine Band auf dem Server?',
  },
  {
    when: (s) => s.generators.ansible.owned > 0,
    text: () => 'Ich wollte etwas in der Firewall ändern. Eine Stunde später war es von selbst zurückgeändert. Wer ist dieses Ansible, und warum ist es stärker als ich?',
  },
  {
    when: (s) => s.generators.ansible.owned > 0,
    text: () => 'In Ihrer Konfiguration steht „idempotent“. Ist das was Medizinisches? Falls ja: Ich hab das auch manchmal.',
  },
  {
    when: (s) => s.generators.k8s.owned > 0,
    text: () => 'Die Server haben sich nachts immer wieder selbst neu gestartet. Laut Log heißt das „Self-Healing“. Klingt nach Wellness. Zahlen wir dafür?',
  },
  {
    when: (s) => s.generators.k8s.owned > 0,
    text: () => 'Wir haben jetzt mehr Pods als Mitarbeiter. Wer entscheidet eigentlich, wann ein Pod Urlaub bekommt? Ich möchte da mitreden.',
  },
  {
    when: (s) => s.generators.agent.owned > 0,
    text: (m) => `Ein KI-Agent hat in Ihrem Namen ${fmt(per(m, 4, 3))}-mal „Ich verstehe Ihre Frustration“ geschrieben. Die Kunden waren zufriedener als sonst.`,
  },
  {
    when: (s) => s.generators.agent.owned > 0,
    text: () => 'Der KI-Agent hat mir ein Meeting eingestellt. Thema: „Ihre Rolle in der Zukunft“. Dauer: fünf Minuten. Ist das ein schlechtes Zeichen?',
  },
  {
    when: (s) => s.generators.undertable.owned > 0,
    text: () => 'Die Reinigungskraft sagt, unter einem Tisch im 2. OG ist es warm wie in einer Sauna. Sie macht dort jetzt Pause. Ist das ein Problem?',
  },
  {
    when: (s) => s.generators.undertable.owned > 0,
    text: () => 'Unter einem Tisch im 2. OG brummt etwas. Ich habe ihm gut zugeredet. Jetzt brummt es freundlicher. Muss ich mir Sorgen machen?',
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
export function reportCloser(elapsedMs: number, capped: boolean, choose: (bag: string, lines: string[]) => string = (_b, l) => pick(l)): string {
  if (capped) return `Sie waren über ${hours(CONFIG.offlineCapMs)} weg. Ab da hat sogar der Keller Feierabend gemacht. Die Personalabteilung nennt das „Wochenende“.`;
  const h = elapsedMs / 3_600_000;
  if (h >= 6)
    return choose('closer:night', [
      'Sie waren über Nacht weg? Die Server nicht. Nur so als Hinweis.',
      'Ich habe heute Nacht schlecht geschlafen. Lief der Server? Egal, Sie waren ja eh nicht da.',
      'Ich bin heute extra früh gekommen, um zu sehen, wann Sie kommen. Sie kamen später. Ich ehrlich gesagt auch.',
    ]);
  if (h >= 1)
    return choose('closer:hours', [
      'Bitte kurze Rückmeldung. Dauert nicht lang.',
      'Können wir dazu kurz einen Termin machen? 90 Minuten reichen.',
      'Ich will nicht drängeln. Aber: Wann sind Sie wieder da?',
      'Eine kurze Antwort reicht. Ein Wort. Am besten „Ja“.',
    ]);
  return choose('closer:short', [
    'Ach, Sie sind wieder da? Dann ist ja gut.',
    'Waren Sie Kaffee holen? Bringen Sie mir einen mit. Nächstes Mal.',
    'Nur zur Info. Kein Stress. (Ein bisschen Stress.)',
    'War nicht schlimm. Ich hab nur zweimal angerufen. Und einmal an Ihrem Stuhl gedreht.',
  ]);
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
  // reihum (core/deck.ts): jede Frage kommt erst wieder, wenn die anderen dran waren, auch über Neuladen hinweg
  // erkannt am Text (mit festen Zahlen), nicht an der Position: neue Fragen in der Liste verschieben sonst das Gedächtnis
  const key = (i: ReportItem) => i.text(60, state, 1e9);
  const chosen: ReportItem[] = [];
  const take = (list: ReportItem[]) => {
    const rest = list.filter((i) => !chosen.includes(i));
    if (rest.length > 0) chosen.push(draw(state, 'report', rest, { key, rnd }));
  };
  // eine Infrastruktur-Frage vorweg: die zeigt, dass der Keller weitergearbeitet hat; der Rest aus allem
  take(pool.filter((i) => i.when));
  while (chosen.length < 3 && chosen.length < pool.length) take(pool);
  const choose = <T,>(bag: string, list: readonly T[]) => draw(state, bag, list, { rnd });
  return {
    subject: choose('REPORT_SUBJECTS', REPORT_SUBJECTS),
    items: chosen.map((i) => i.text(min, state, gained)),
    closer: reportCloser(elapsedMs, capped, choose),
    signature: choose('REPORT_SIGNATURES', REPORT_SIGNATURES),
    button: choose('REPORT_BUTTONS', REPORT_BUTTONS),
  };
}
