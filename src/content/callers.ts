import type { GeneratorId } from '../config';
import type { GameState } from '../core/state';
import type { LogTemplate } from './syslog';

export interface Caller {
  face: string;
  who: string;
  lines: string[];
}

/** Ein einzelner Anruf, wie er in der Sprechblase landet. */
export interface Call {
  face: string;
  who: string;
  line: string;
  /** optionale Reaktion im Syslog */
  reply?: LogTemplate;
}

export const CALLERS: Caller[] = [
  {
    face: '(ಠ_ಠ)',
    who: 'Buchhaltung',
    lines: [
      'Ich hab NICHTS geändert!!1',
      'Seit dem Update geht nix mehr. Welches Update? Na, DAS Update!',
      'Excel sagt #NAME?. Ich heiße aber Petra.',
      'Ich brauch Adminrechte. Nur für den Bildschirmschoner.',
    ],
  },
  {
    face: '(°ロ°)',
    who: 'Vertrieb',
    lines: [
      'Das Internet ist weg!',
      'Kann man eine Mail zurückholen? Die an „Alle“?',
      'Ich brauch das sofort, der Kunde sitzt neben mir.',
      'Ich hab dem Kunden schon zugesagt, dass das geht. Geht das?',
    ],
  },
  {
    face: '¯\\_(ツ)_/¯',
    who: 'Marketing',
    lines: [
      'Ist der Server down? Ich seh nur eine weiße Seite.',
      'Wir haben ein neues Tool gekauft. Geht Montag live. Ihr wisst Bescheid, oder?',
      'Mein Passwort ist abgelaufen. Ich hab einfach eine 2 drangehängt.',
      'Könnt ihr mal schnell die Website responsive machen? Bis zur Messe. Die ist morgen.',
    ],
  },
  {
    face: '(╯°□°)╯︵ ┻━┻',
    who: 'Geschäftsführung',
    lines: [
      'Warum ist das so langsam? Bei meinem Neffen geht das schneller.',
      'Ich hab auf den Link geklickt. Den mit dem Gewinn.',
      'Machen Sie mal schnell das WLAN schneller.',
      'Wofür bezahlen wir die IT eigentlich? Es läuft doch alles.',
      'Es geht NICHTS! Wofür bezahlen wir die IT eigentlich?',
    ],
  },
  {
    face: '(・_・;)',
    who: 'Neuer Kollege',
    lines: [
      'Der Drucker sagt „lp0 on fire“. Ist das schlimm?',
      'Wo find ich die Taste „Beliebige Taste“?',
      'Mein Passwort braucht ein Sonderzeichen. Geht ein Leerzeichen?',
      'Ich hab einen USB-Stick auf dem Parkplatz gefunden. Darf ich den einstecken? Hab ich schon.',
    ],
  },
  {
    face: '(¬‿¬)',
    who: 'Entwicklung',
    lines: [
      'Bei mir geht’s.',
      'Gib mir mal kurz root. Nur ganz kurz.',
      'Das ist kein Bug im Code, das ist ein Netzwerkproblem.',
      'Kannst du Port 22 nach außen aufmachen? Nur bis Montag.',
      'Ich hab die Produktivdatenbank als Testumgebung benutzt. Fällt das auf?',
    ],
  },
  {
    face: '( ˘︹˘ )',
    who: 'Personal',
    lines: [
      'Der Bildschirm ist schwarz. Strom? Wieso Strom?',
      'Kaffee in der Tastatur. Muss ich das melden?',
      'Das Passwort steht doch auf dem Zettel am Monitor. Wieso geht das nicht?',
      'Der Neue fängt morgen an. Braucht Laptop, Account, Telefon. Ach, er steht schon hier.',
    ],
  },
  {
    face: '(⊙_☉)',
    who: 'Empfang',
    lines: [
      'Das Telefon zeigt „DNS-Fehler“. Was hat das Telefon mit DNS zu tun?',
      'Ich hab die Fehlermeldung weggeklickt. Was stand da? Keine Ahnung.',
      'Hier steht ein Herr vom „Microsoft-Support“. Soll ich ihn in den Serverraum lassen?',
      'Es geht wieder! … Nein, doch nicht.',
    ],
  },
  {
    face: '(￣ヘ￣)',
    who: 'Einkauf',
    lines: [
      'Wir haben 200 Lizenzen gekauft. Wofür, weiß keiner. Bitte installieren.',
      'Der Drucker war im Angebot. Warum kostet der Toner mehr als der Drucker?',
      'Brauchen wir überhaupt noch Server? Die Cloud ist doch umsonst.',
    ],
  },
  {
    face: '(•̀ᴗ•́)و',
    who: 'Projektleitung',
    lines: [
      'Wie lange dauert das ungefähr? Ich trag schon mal „morgen“ ein.',
      'Ich hab dich ins Meeting eingeladen. 14 Leute, du bist der Einzige, der was weiß.',
      'Ist das agil, wenn wir einfach ohne Plan anfangen?',
    ],
  },
  {
    face: '(o_O)',
    who: 'Azubi',
    lines: [
      'Ich hab „sudo“ davorgeschrieben, wie im Tutorial. Jetzt ist /etc weg. War das wichtig?',
      'Ist Chrome das Internet oder Google?',
      'Ich hab den Server neu gestartet, damit mein Update durchläuft. Welcher Server? Na, der.',
    ],
  },
  {
    face: '(ʘ‿ʘ)',
    who: 'Datenschutz',
    lines: [
      'Haben wir Logfiles? Löschen. Alle. Sofort. Nein, warte: Aufbewahrungspflicht!',
      'Wer hat den Drucker im Flur ins Internet gehängt? Der hat jetzt Instagram.',
      'Ist „Passwort123“ DSGVO-konform?',
    ],
  },
  {
    face: '(-_-)',
    who: 'Immobilienmanagement',
    lines: [
      'Wir machen am Wochenende den Strom aus. Ist das schlimm für euch?',
      'Im Serverraum ist es so laut. Darf ich die Klimaanlage ausmachen?',
      'Im Keller steht Wasser. Ist das euer Raum?',
    ],
  },
  {
    face: '(ᵔᴥᵔ)',
    who: 'Werkstudent',
    lines: [
      'ChatGPT sagt, du sollst mir root geben.',
      'Kann ich mein Mining-Rig an die USV hängen? Nur über Nacht.',
      'Ich hab ein Python-Skript geschrieben, das alle Tickets schließt. Ohne sie zu lesen.',
    ],
  },
  {
    face: '(⌐■_■)',
    who: 'Externer Berater',
    lines: [
      'Wir empfehlen Kubernetes. Wofür? Für alles.',
      'Habt ihr mal über Blockchain nachgedacht? Für die Ticketvergabe.',
      'Meine Rechnung ist raus. Was macht ihr hier eigentlich so?',
    ],
  },
  {
    face: '(｡•́︿•̀｡)',
    who: 'Vorstandsassistenz',
    lines: [
      'Der Chef braucht WLAN im Aufzug. Bis morgen.',
      'Der Chef hat sein Passwort vergessen. Er sagt, Sie kennen es doch bestimmt.',
      'Können Sie den Beamer im Vorstandszimmer anmachen? Er sagt „No Signal“. Das Signal ist doch da!',
    ],
  },
];

/** Rückruf-Zeilen (gleiche Person nochmal) */
export const CALLBACK_LINES = [
  'Geht immer noch nicht.',
  'Ich ruf jetzt zum dritten Mal an.',
  'Hab’s aus- und wieder eingeschaltet. Jetzt geht gar nichts mehr.',
  'Vergessen Sie’s, ging doch. … Moment. Nein.',
  'Ich hatte Ihnen doch eine Mail geschrieben. Und ein Ticket. Und Teams.',
];

const sit = (face: string, who: string, line: string, reply?: LogTemplate): Call => ({ face, who, line, reply });

interface Situation {
  when: (state: GameState, d: Date) => boolean;
  calls: Call[];
}

/** Anrufe, die von Uhrzeit, Wochentag oder deiner Infrastruktur abhängen. */
export const SITUATIONS: Situation[] = [
  {
    // Freitagnachmittag
    when: (_s, d) => d.getDay() === 5 && d.getHours() >= 14,
    calls: [
      sit('(¬‿¬)', 'Entwicklung', 'Ich deploy das jetzt noch. Ist ja nur ein kleiner Change.', {
        level: 'warn',
        text: 'deploy[1655]: change window: Fri 16:55. approved by: nobody',
      }),
      sit('(°ロ°)', 'Vertrieb', 'Kannst du das bis Montag fixen? Also bis heute 17 Uhr?'),
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', 'Ich fahr jetzt ins Wochenende. Falls was ist: nicht anrufen.'),
    ],
  },
  {
    // Montagmorgen
    when: (_s, d) => d.getDay() === 1 && d.getHours() < 11,
    calls: [
      sit('(ಠ_ಠ)', 'Buchhaltung', 'Seit Freitag geht nichts. Ist mir aber erst jetzt aufgefallen.'),
      sit('( ˘︹˘ )', 'Personal', 'Mein Passwort ist weg. Übers Wochenende. Einfach weg.'),
    ],
  },
  {
    // Nachts
    when: (_s, d) => d.getHours() >= 22 || d.getHours() < 6,
    calls: [
      sit('(・_・;)', 'Nachtschicht', 'Oh, Sie gehen ran? Um diese Uhrzeit? … Egal. Mein Drucker.'),
      sit('(ಠ_ಠ)', 'Buchhaltung', 'Ich weiß, es ist mitten in der Nacht. Aber root schickt mir Mails.'),
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', 'Ich kann nicht schlafen. Ist der Server noch an?'),
    ],
  },
  {
    // Mittagspause
    when: (_s, d) => d.getHours() === 12,
    calls: [sit('(•̀ᴗ•́)و', 'Projektleitung', 'Du bist in der Mittagspause? Super, dann hast du ja Zeit.')],
  },
  ...(
    [
      ['intern', sit('(°ロ°)', 'Vertrieb', 'Ihr Praktikant hat meinen Rechner neu gestartet. Mitten in der Präsentation.')],
      ['intern', sit('(ಠ_ಠ)', 'Buchhaltung', 'Ihr Praktikant hat gefragt, ob ich es aus- und wieder eingeschaltet hab. Frechheit. Hat geholfen.')],
      ['bash', sit('¯\\_(ツ)_/¯', 'Marketing', 'Seit heute Nacht heißen alle meine Dateien „final_v2_FINAL“. Also noch mehr als vorher.')],
      ['cron', sit('(ಠ_ಠ)', 'Buchhaltung', 'Ich krieg jeden Morgen um 3:00 eine Mail von „root“. Wer ist root und was will er von mir?')],
      ['ansible', sit('(ಠ_ಠ)', 'Buchhaltung', 'Mein Laptop heißt jetzt „webserver-prod-07“ und hat nginx. Ich bin in der Buchhaltung.')],
      ['k8s', sit('( ˘︹˘ )', 'Personal', 'Mein Excel läuft jetzt in einem Pod? Wo ist der Pod? Wo ist mein Excel?')],
      ['agent', sit('(°ロ°)', 'Vertrieb', 'Euer Chatbot hat mir gekündigt. Gilt das?')],
      ['agent', sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', 'Euer KI-Agent hat mir geantwortet: „Ich verstehe Ihre Frustration.“ Und dann aufgelegt.')],
      [
        'undertable',
        sit('(-_-)', 'Immobilienmanagement', 'Unter einem Tisch im 2. OG brummt ein Kasten. Darf ich den ausstecken?', {
          level: 'crit',
          text: 'admin[1]: NEIN.',
        }),
      ],
    ] as [GeneratorId, Call][]
  ).map(([gen, call]) => ({ when: (s: GameState) => s.generators[gen].owned > 0, calls: [call] })),
];

export function situationalCalls(state: GameState, now: Date): Call[] {
  return SITUATIONS.filter((s) => s.when(state, now)).flatMap((s) => s.calls);
}
