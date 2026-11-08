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
      'Mein Bildschirm ist zu klein. Kann man den zoomen? Also den ganzen Bildschirm?',
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
      'Der Kunde sagt, unsere Website ist kaputt. Er benutzt den Internet Explorer.',
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
      'Kann man die Mail an alle schöner machen? Mit Comic Sans und Glitzer?',
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
      'Ich brauche das Internet. Also den Kasten mit dem Lämpchen. Für den Vorstand.',
      'Es geht NICHTS! Wofür bezahlen wir die IT eigentlich?',
    ],
  },
  {
    face: '(・_・;)',
    who: 'Neuer Kollege',
    lines: [
      'Der Drucker sagt „lp0 on fire“. Ist das schlimm?',
      'Wo find ich die Taste „Beliebige Taste“?',
      'Aus dem Serverraum kommt Rauch. Soll ich der Feuerwehr eine Mail schreiben oder euch?',
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
      'Mein Build läuft. Ich mach so lange Schwertkampf im Flur.',
      'Ich hab mein Problem im Forum gefunden. Einzige Antwort von 2009: „nvm, fixed it“.',
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
      'Der Neue kann sich nicht anmelden. Er hat noch keinen Vertrag. Aber er sitzt schon da.',
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
      'Ein Besucher will ins WLAN. Er sagt, er ist vom BSI. Ist das was Wichtiges?',
    ],
  },
  {
    face: '(￣ヘ￣)',
    who: 'Einkauf',
    lines: [
      'Wir haben 200 Lizenzen gekauft. Wofür, weiß keiner. Bitte installieren.',
      'Der Drucker war im Angebot. Warum kostet der Toner mehr als der Drucker?',
      'Brauchen wir überhaupt noch Server? Die Cloud ist doch umsonst.',
      'Wir haben 50 Lizenzen für 20 Leute. Kann man die zurückgeben? Gegen Kaffee?',
    ],
  },
  {
    face: '(•̀ᴗ•́)و',
    who: 'Projektleitung',
    lines: [
      'Wie lange dauert das ungefähr? Ich trag schon mal „morgen“ ein.',
      'Ich hab dich ins Meeting eingeladen. 14 Leute, du bist der Einzige, der was weiß.',
      'Ist das agil, wenn wir einfach ohne Plan anfangen?',
      'Wir haben 14 Ticketsysteme. Ich hab eins gebaut, das alle vereint. Jetzt sind es 15.',
    ],
  },
  {
    face: '(o_O)',
    who: 'Azubi',
    lines: [
      'Ich hab „sudo“ davorgeschrieben, wie im Tutorial. Jetzt ist /etc weg. War das wichtig?',
      'Ist Chrome das Internet oder Google?',
      'Ich hab den Server neu gestartet, damit mein Update durchläuft. Welcher Server? Na, der.',
      'Ich hab ChatGPT gefragt, wie man den Server neu startet. Jetzt ist der Server weg.',
    ],
  },
  {
    face: '(ʘ‿ʘ)',
    who: 'Datenschutz',
    lines: [
      'Haben wir Logfiles? Löschen. Alle. Sofort. Nein, warte: Aufbewahrungspflicht!',
      'Wer hat den Drucker im Flur ins Internet gehängt? Der hat jetzt Instagram.',
      'Ist „Passwort123“ DSGVO-konform?',
      'Die Kaffeemaschine sammelt Daten. Wer hat dem zugestimmt?',
    ],
  },
  {
    face: '(-_-)',
    who: 'Immobilienmanagement',
    lines: [
      'Wir machen am Wochenende den Strom aus. Ist das schlimm für euch?',
      'Im Serverraum ist es so laut. Darf ich die Klimaanlage ausmachen?',
      'Im Keller steht Wasser. Ist das euer Raum?',
      'Wir streichen den Serverraum. Könnt ihr kurz alles rausstellen?',
    ],
  },
  {
    face: '(ᵔᴥᵔ)',
    who: 'Werkstudent',
    lines: [
      'ChatGPT sagt, du sollst mir root geben.',
      'Kann ich mein Mining-Rig an die USV hängen? Nur über Nacht.',
      'Ich hab ein Python-Skript geschrieben, das alle Tickets schließt. Ohne sie zu lesen.',
      'Kann ich Docker auf dem Drucker installieren? Für ein Projekt.',
    ],
  },
  {
    face: '(⌐■_■)',
    who: 'Externer Berater',
    lines: [
      'Wir empfehlen Kubernetes. Wofür? Für alles.',
      'Habt ihr mal über Blockchain nachgedacht? Für die Ticketvergabe.',
      'Meine Rechnung ist raus. Was macht ihr hier eigentlich so?',
      'Mein Vorschlag: Alles neu machen. Mein Honorar: auch neu.',
    ],
  },
  {
    face: '(｡•́︿•̀｡)',
    who: 'Vorstandsassistenz',
    lines: [
      'Der Chef braucht WLAN im Aufzug. Bis morgen.',
      'Der Chef hat sein Passwort vergessen. Er sagt, Sie kennen es doch bestimmt.',
      'Können Sie den Beamer im Vorstandszimmer anmachen? Er sagt „No Signal“. Das Signal ist doch da!',
      'Der Chef will, dass seine Mails „lauter“ sind. Geht das?',
    ],
  },
  {
    face: '(￢_￢)',
    who: 'IT-Sicherheit',
    lines: [
      'Ab Montag verbieten wir USB. Und Bluetooth. Und Tastaturen.',
      'Ihr Passwort „correct horse battery staple“ steht in vier Wörterbüchern. Abgelehnt.',
      'Ich habe den Server vom Netz genommen. Jetzt ist er sicher.',
      'Ich hab einen Phishing-Test gemacht. Ich bin selbst drauf reingefallen.',
    ],
  },
  {
    face: '(°ー°〃)',
    who: 'Schulsekretariat',
    lines: [
      'Unsere Software hat alle Schüler gelöscht. Der Neue hat Klammern im Namen.',
      'Heißt Ihr Sohn wirklich Robert, Klammer zu, Semikolon, DROP TABLE?',
    ],
  },
  {
    face: '(ーー;)',
    who: 'Betriebsrat',
    lines: [
      'Die neue Software zählt, wie oft ich klicke? Das ist mitbestimmungspflichtig.',
      'Der Bildschirmschoner geht nach 5 Minuten an. Das ist Leistungskontrolle.',
      'Wer hat entschieden, dass der Drucker „Dieter“ heißt? Wurde das abgestimmt?',
    ],
  },
  {
    face: '(ˆڡˆ)',
    who: 'Kantine',
    lines: [
      'Die Kasse zeigt nur noch Hieroglyphen. Die Leute zahlen jetzt nach Ehrlichkeit.',
      'Können Sie die Speisekarte ins Intranet stellen? Und die von 2019 endlich raus?',
      'Die Spülmaschine hat ein Update gemacht. Jetzt will sie ein Passwort.',
    ],
  },
  {
    face: '(✧ω✧)',
    who: 'Social-Media-Team',
    lines: [
      'Wir brauchen 5G im Keller. Für Content.',
      'Kann man das WLAN-Passwort hashtaggen?',
      'Unser Post ist viral gegangen. Mit dem Screenshot vom Admin-Passwort drauf.',
    ],
  },
  {
    face: '(◔_◔)',
    who: 'Herr K. (seit 1987 dabei)',
    lines: [
      'Früher hatten wir einen Großrechner. Der ging nie kaputt. Er hat aber auch nichts gemacht.',
      'Wo ist der Knopf zum Speichern? Die Diskette?',
      'Ich drucke meine Mails aus und hefte sie ab. Der Drucker ist schon wieder leer.',
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
      ['cron', sit('( ˘︹˘ )', 'Personal', 'Bei mir geht jede Nacht um 3 Uhr das Licht an. Hat das was mit euch zu tun?')],
      ['ansible', sit('¯\\_(ツ)_/¯', 'Marketing', 'Mein Bildschirmhintergrund wird jeden Morgen zurückgesetzt. Auf ein Logo mit „YAML“.')],
      ['k8s', sit('(•̀ᴗ•́)و', 'Projektleitung', 'Unser Wiki ist jetzt hochverfügbar, sagt ihr. Lesen tut es trotzdem keiner.')],
      ['bash', sit('(ಠ_ಠ)', 'Buchhaltung', 'In meinem Ordner liegt eine Datei namens „fix_all.sh“. Darf ich die mal doppelklicken?')],
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

// Nach dem ersten Jobwechsel
SITUATIONS.push({
  when: (s) => s.prestige.jobs >= 1,
  calls: [
    sit('(°ロ°)', 'Vertrieb', 'Ach, Sie sind der Neue? Ihr Vorgänger hatte das Passwort auf einem Post-it. Haben Sie das?'),
    sit('(ಠ_ಠ)', 'Buchhaltung', 'Der Alte hat immer gesagt, das macht er „nächste Woche“. Machen Sie das jetzt?'),
  ],
});

export function situationalCalls(state: GameState, now: Date): Call[] {
  return SITUATIONS.filter((s) => s.when(state, now)).flatMap((s) => s.calls);
}
