import type { GameState } from '../core/state';
import { q, f, type Call, type Line } from './callers';
import { HERRK_COMPANY, atCompany, storyAtKey, storyKey } from './gates';

// Geschichten am Telefon: dieselben Leute rufen in Abständen wieder an, die Sache geht weiter.
// Fortschritt pro Firma (neue Firma, neue Geschichten). Jede Folge ist ein normales Anliegen mit
// passender Ursache und Antwort, so dass Ticket, Werkzeug und Notiz zusammenpassen.

export interface Story {
  id: string;
  /** nur wenn erfüllt (z. B. Praktikanten vorhanden) */
  when?: (s: GameState) => boolean;
  episodes: { face: string; who: string; line: Line }[];
}

/** Frühestens so lange nach der letzten Folge kommt die nächste */
export const STORY_GAP_MS = 20 * 60_000;

const ep = (face: string, who: string, line: Line) => ({ face, who, line });

export const STORIES: Story[] = [
  {
    id: 'testskript',
    when: (s) => s.generators.intern.owned > 0,
    episodes: [
      ep('ᕕ(ᐛ)ᕗ', 'Praktikant', q('server', 'Ich teste nur ganz kurz was. Welcher ist eigentlich der Testserver?', 'Es gibt keinen Testserver', 'Es gibt keinen Testserver. Es gibt nur Produktion und Mut. Ich richte dir eine VM ein. Bis dahin: nichts anfassen.')),
      ep('ᕕ(ᐛ)ᕗ', 'Praktikant', f('server', 'Die VM von dir. Darf die 64 Kerne haben? Hat sie jetzt nämlich.', 'VM mit allen Kernen des Hosts', 'Deine VM hatte alle 64 Kerne. Der Rest der Firma hatte null. Jetzt hat sie zwei. Wie besprochen.', [])),
      ep('ᕕ(ᐛ)ᕗ', 'Praktikant', q('mail', 'Mein Test hat eine Mail an alle Kunden geschickt. 40.000. Betreff: „test test bitte ignorieren“.', 'Testmail an den Kundenverteiler', 'Die Entschuldigung ist raus. 400 Kunden fanden den Test toll. Das Marketing will jetzt eine Serie daraus machen.')),
      ep('ᕕ(ᐛ)ᕗ', 'Praktikant (letzter Tag)', q('allgemein', 'Mein Praktikum ist vorbei. Mein Testskript läuft aber noch. Soll ich das ausmachen?', 'Testskript läuft seit Wochen in Produktion', 'NEIN! Inzwischen hängt die Lohnabrechnung davon ab. Schreib mir bitte nur auf, was es tut. Danke. Und viel Glück.')),
    ],
  },
  {
    id: 'dieter',
    episodes: [
      ep('(ーー;)', 'Betriebsrat', q('drucker', 'Dieter druckt seit gestern nur noch in Pink. Ist das ein Statement?', 'Cyan und Gelb leer', 'Kein Statement, nur Cyan und Gelb leer. Toner ist bestellt. Bis dahin ist alles pink. Sehen Sie es als Corporate Design.')),
      ep('(＾▽＾)', 'Teamassistenz', f('drucker', 'Dieter hat jetzt eine eigene Mailadresse. Er schreibt uns allen, wenn er Hunger hat.', 'Druckermeldungen an den Verteiler „Alle“', 'Dieter schreibt jetzt nur noch mir, wenn ihm Papier fehlt. Er schreibt übrigens sehr höflich. Höflicher als manche Kollegen.', ['Drucker 3. OG'])),
      ep('(ーー;)', 'Betriebsrat', q('drucker', 'Dieter wird zehn. Gibt es eine Feier? Der Betriebsrat würde eine Rede halten.', 'Drucker-Jubiläum', 'Es gibt Kuchen und eine Wartung. Er bekommt neue Walzen. Bitte nicht auf ihn anstoßen, er ist empfindlich.')),
      ep('(￣ヘ￣)', 'Einkauf', q('drucker', 'Wir ersetzen Dieter. Neuer Drucker, gleicher Name?', 'Nachfolger für Dieter', 'Der Neue heißt Dieter 2. Der alte zieht in den Keller und druckt dort in Ruhe Testseiten. Er hat es sich verdient.')),
    ],
  },
  {
    id: 'kistrategie',
    episodes: [
      ep('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('wunsch', 'Ich hab im Flieger ein Buch über KI gelesen. Wir brauchen eine KI-Strategie.', 'Buch vom Flughafen', 'Gerne. Schritt eins: aufschreiben, welches Problem die KI lösen soll. Ich schick Ihnen eine Vorlage. Sie hat eine Zeile.')),
      ep('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Die KI-Strategie ist fertig. Eine Folie. Darauf steht „KI“. Was meinen Sie?', 'Strategie mit einer Folie', 'Schöne Folie. Großes K, großes I. Ich ergänze eine zweite Folie mit den Kosten. Dann reden wir nochmal.')),
      ep('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Ich hab den Chatbot gefragt, ob wir die IT noch brauchen. Er sagt „Ja“. Haben Sie den bestochen?', 'Chatbot sagt die Wahrheit', 'Nicht bestochen. Er hat ausnahmsweise recht. Ich lasse ihn so.')),
    ],
  },
  {
    id: 'herrk',
    // Herr K. gibt es nur bei der Spedition (erste Firma)
    when: atCompany(HERRK_COMPANY),
    episodes: [
      ep('(◔_◔)', 'Herr K. (seit 1987 dabei)', q('allgemein', 'Ich gehe bald in Rente. Nur zur Info: Das Passwort für den Großrechner kenne nur ich.', 'Wissen nur in einem Kopf', 'Gut, dass Sie es sagen! Wir machen einen Termin. Sie erzählen, ich schreibe mit. Diesmal gibt es Doku.')),
      ep('(◔_◔)', 'Herr K. (seit 1987 dabei)', q('allgemein', 'Für die Übergabe: meine Doku. 40 Seiten. Handschriftlich. Auf Durchschlagpapier.', 'Doku auf Durchschlagpapier', 'Großartig. Ehrlich. Ich scanne das ein. Seite 12 ist leider nur ein Kaffeefleck. Was stand da?')),
      ep('(◔_◔)', 'Herr K. (letzter Tag)', f('server', 'Zum Abschied hab ich den Großrechner ausgeschaltet. Der hat ja eh nie was gemacht.', 'Großrechner zum Abschied ausgeschaltet', 'Er läuft wieder. Er hat übrigens doch etwas gemacht: die Gehälter. Danke für alles, Herr K. Wirklich.', [])),
      ep('(◔_◔)', 'Herr K. (in Rente)', q('allgemein', 'Ich bin jetzt in Rente und langweile mich. Läuft der Großrechner noch? Und der Server unterm Tisch? Der Zettel dran ist übrigens von mir.', 'Rentner mit Langeweile', 'Er läuft. Er vermisst Sie, glaube ich. Ich auch ein bisschen. Kommen Sie zur Weihnachtsfeier?')),
    ],
  },
  {
    id: 'kaffeemaschine',
    episodes: [
      ep('(ˆڡˆ)', 'Kantine', f('sicherheit', 'Die neue Kaffeemaschine will ins WLAN. Sie sagt, sonst gibt es keinen Kaffee.', 'Kaffeemaschine mit Cloud-Zwang', 'Sie ist jetzt im Gäste-WLAN, ohne Zugriff auf irgendwas. Sie hat beleidigt einen Espresso gemacht. Er war gut.', ['Kaffeemaschine (IoT)'])),
      ep('(ʘ‿ʘ)', 'Datenschutz', q('sicherheit', 'Die Kaffeemaschine schickt jeden Morgen eine Mail: „Ihr Koffeinkonsum“. An alle.', 'Telemetrie mit Verteiler', 'Der Verteiler ist weg. Sie schickt die Statistik jetzt nur noch mir. Ich lese sie nicht. Sie weiß das.')),
      ep('(ಠ_ಠ)', 'Buchhaltung', q('allgemein', 'Die Kaffeemaschine hat ein Abo abgeschlossen. Für Bohnen. Für 40.000 €.', 'Kaffeemaschine mit Kreditkarte', 'Abo gekündigt, Kreditkarte entfernt. Die Bohnen kommen trotzdem. Wir haben jetzt Kaffee bis 2031.')),
      ep('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Die Kaffeemaschine hat sich für den Betriebsrat aufstellen lassen. Hat sie Chancen?', 'Kaffeemaschine mit Ambitionen', 'Gute Chancen. Sie ist beliebter als alle anderen Kandidaten. Ich würde vorsichtshalber nett zu ihr sein.')),
    ],
  },
  {
    id: 'umzug',
    episodes: [
      ep('(-_-)', 'Immobilienmanagement', q('server', 'Wir ziehen um! Nächste Woche. Der Serverraum kommt in die Besenkammer, die ist frei.', 'Umzugsplanung ohne IT', 'Die Besenkammer hat keine Lüftung und keinen Strom. Ich schreibe Ihnen auf, was ein Serverraum braucht. Es ist eine lange Liste.')),
      ep('(-_-)', 'Immobilienmanagement', q('netz', 'Die Umzugsfirma fragt, ob sie die Kabel einfach abschneiden darf. Geht schneller.', 'Umzugsfirma mit Schere', 'NEIN. Bitte nichts abschneiden. Ich komme mit Etiketten. Jedes Kabel bekommt ein Namensschild.')),
      ep('(°ロ°)', 'Vertrieb', f('netz', 'Im neuen Büro hab ich kein Netz. Das Kabel hängt aus der Decke. Soll ich ziehen?', 'Netzwerkdose noch nicht angeschlossen', 'Bitte nicht ziehen. Die Dose ist jetzt angeschlossen. Das Kabel aus der Decke war übrigens der Feuermelder.', ['Switch Keller'])),
      ep('(-_-)', 'Immobilienmanagement', q('allgemein', 'Der Umzug war ein Erfolg! Nur der Server unterm Tisch fehlt. Wo ist der?', 'Server unterm Tisch beim Umzug vergessen', 'Er steht noch im alten Büro. Unterm Tisch. Er läuft. Ich hole ihn, bevor der Nachmieter ihn aussteckt.')),
    ],
  },
  {
    id: 'doku',
    episodes: [
      ep('(¬‿¬)', 'Chef', q('wunsch', 'Montag kommt ein Kamerateam. Können Sie das Büro moderner aussehen lassen? Mehr Bildschirme, mehr Blinken.', 'Büro soll für die Kamera gut aussehen', 'Ich lasse die Tür zum Serverraum offen. Da blinkt alles sehr professionell. Mehr Blinken ist nicht drin.')),
      ep('(・o・)', 'Kamerateam', f('netz', 'Wir sind vom Fernsehen. Ihr WLAN-Passwort, bitte? Für den Upload.', 'Gäste-WLAN fürs Kamerateam', 'Sie sind im Gäste-WLAN, ins Firmennetz kommen Sie nicht. Der Chef wollte auch rein. Er ist jetzt auch im Gäste-WLAN.', [])),
      ep('(¬‿¬)', 'Chef', q('wunsch', 'Können Sie die Aufnahme von gestern löschen? Ich hab was über die Zentrale gesagt. Und über das Catering. Und nochmal über die Zentrale.', 'Peinliche Aufnahme', 'Das Material gehört dem Sender, nicht uns. Löschen kann ich nichts. Ich kann Ihnen aber die Nummer der Rechtsabteilung raussuchen.')),
      ep('(¬‿¬)', 'Chef', q('allgemein', 'Die Doku läuft heute Abend! Können wir sie in der Kantine auf dem großen Bildschirm zeigen?', 'Doku-Abend in der Kantine', 'Der Bildschirm ist eingerichtet. Ich habe vorher reingeschaut. Vielleicht bleiben Sie morgen im Homeoffice.')),
    ],
  },
];

const stepKey = (s: GameState, id: string) => storyKey(s.prestige.company, id);
const atKey = (s: GameState, id: string) => storyAtKey(s.prestige.company, id);

/** Nächste fällige Folge einer Geschichte (oder null) */
export function dueStoryCall(state: GameState, now: number): { id: string; call: Call } | null {
  for (const story of STORIES) {
    if (story.when && !story.when(state)) continue;
    const step = state.flags[stepKey(state, story.id)] ?? 0;
    const e = story.episodes[step];
    if (!e) continue;
    if (step > 0 && now - (state.flags[atKey(state, story.id)] ?? 0) < STORY_GAP_MS) continue;
    const total = story.episodes.length;
    return {
      id: story.id,
      call: {
        face: e.face,
        who: e.who,
        ...e.line,
        // ab Folge 2: die Telefonanlage erkennt die Nummer wieder
        ...(step > 0 && { reply: { level: 'info' as const, text: `pbx[{pid}]: Nummer bekannt. Fortsetzung folgt (Teil ${step + 1} von ${total}).` } }),
      },
    };
  }
  return null;
}

/** Folge gezeigt: weiterzählen; letzte Folge = Geschichte zu Ende */
export function advanceStory(state: GameState, id: string, now: number): void {
  const story = STORIES.find((s) => s.id === id);
  if (!story) return;
  const key = stepKey(state, id);
  const step = (state.flags[key] ?? 0) + 1;
  state.flags[key] = step;
  state.flags[atKey(state, id)] = now;
  if (step >= story.episodes.length) {
    state.flags['stories:done'] = (state.flags['stories:done'] ?? 0) + 1;
    state.flags[`storyDone:${id}`] = (state.flags[`storyDone:${id}`] ?? 0) + 1;
  }
}
