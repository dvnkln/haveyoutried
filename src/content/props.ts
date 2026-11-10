// Texte für die Requisiten am Schreibtisch (Post-its, Gummiente, Tasten).

/** Post-its am Monitorrahmen. Antippen blättert weiter. */
export const POSTITS: string[] = [
  'Passwort: hunter2',
  'Passwort: ********',
  'NICHT neu starten!!',
  '0118 999 881 999 119 725 … 3',
  'Have you tried…?',
  'sudo make me a sandwich',
  'Urlaub beantragen (seit 2019)',
  'Bin im Serverraum. Kein Netz.',
  'Freitag: kein Deploy',
  'Drucker = Feind',
  'ID-10-T-Fehler?',
  'Layer 8 prüfen',
  'Ticket ≠ Zuruf',
  'chmod 777 ist keine Lösung',
  'Kaffee nachfüllen!',
  'Drucker redet nicht mit mir',
  'There’s no place like 127.0.0.1',
  'Montag. Wieder.',
  'Doku? Später.',
  'Kurzwahl Pizza: 3',
  'Mittagspause 12:00–12:05',
  'PEBKAC',
  'RTFM (freundlich)',
  'Nicht füttern: Praktikant',
  'Kein Backup, kein Mitleid',
  'Passwort-Hinweis: „das übliche“',
  'Zuständig: nicht ich',
  'Chef-Mails erst nach Kaffee',
  'It works on my machine™',
  ':q!',
  'Prod ≠ Test',
  'Löschanlage: NICHT drücken',
  'Ruhe bewahren. Logs lesen.',
  'Anrufer zählen: |||| ||',
  'Ausrede Nr. 17 nicht nochmal',
  'TODO: Doku (2014)',
  'Wer das liest, ist zu nah.',
  'Kekse von Mutti. NICHT nehmen!',
  'Zentrale ruft an? Bin nicht da.',
  'Mein Kaffee. Nicht deiner.',
];

/** Rubber-Duck-Debugging: Log-Zeilen beim Antippen der Ente. */
export const DUCK_LINES: string[] = [
  'duckd[42]: quack. (Du hast das Problem gerade laut erklärt. Und verstanden.)',
  'duckd[42]: quack. Die Ente hat die Frage verstanden. Du noch nicht ganz.',
  'duckd[42]: QUACK. Die Ente hat die Fehlermeldung gegoogelt. Erster Treffer: ein Entenrezept. Die Ente schweigt.',
  'duckd[42]: quack. Die Ente hat die Logs gelesen. Die Ente ist besorgt.',
  'duckd[42]: quack quack. Übersetzt: „Hast du ein Backup?“',
  'duckd[42]: …quack. Die Ente ist im Ruhestand, hilft aber noch aus.',
  'duckd[42]: quack. Senior Rubber Duck Engineer, 20 Jahre Erfahrung.',
  'duckd[42]: quack! Die Ente fordert mehr Budget.',
  'duckd[42]: quack. Ticket an die Ente eskaliert. Ente: „Nicht mein Bereich.“',
  'duckd[42]: quack. Ticketstatus der Ente: „Wartet auf Brot“.',
  'duckd[42]: quack… Die Ente fragt, ob du schon mal die Fehlermeldung gelesen hast. Ganz.',
  'duckd[42]: quack. Die Ente hat deinen Code reviewt. Kommentar: „🦆“. Approved.',
  'duckd[42]: QUACK! Die Ente hat das Wort „Freitag“ gehört.',
];

/** Ab und zu im Log, wenn jemand Alt+F4 drückt. */
export const ALTF4_LINES: string[] = [
  'kernel: Alt+F4 erkannt. Fenster zu. Die Warteschlange ist noch offen.',
  'helpdesk[1337]: Alt+F4 zählt nicht als Feierabend.',
  'windowmanager[2]: Fenster geschlossen. Das Ticket kommt wieder. Sie kommen immer wieder.',
  'helpdesk[1337]: Alt+F4? Netter Versuch. Der Anrufer ist noch dran.',
  'helpdesk[1337]: Ticket per Alt+F4 gelöst. Laut Statistik eine der häufigsten Lösungen.',
];

/** Ab und zu im Log, wenn jemand die Panik-Taste drückt. */
export const PANIC_LINES: string[] = [
  'helpdesk[1337]: Panik-Taste gedrückt. Hat nichts gebracht. Wie immer.',
  'helpdesk[1337]: DON’T PANIC. (Handtuch liegt in der Schublade.)',
  'helpdesk[1337]: Panik registriert. Ticket für Panik angelegt.',
  'helpdesk[1337]: Panik eskaliert. An dich. Du bist die Eskalation.',
  'helpdesk[1337]: Panik-Taste gedrückt. Kaffee wird vorbereitet.',
];

/** Schild an der Wand („Arbeitstage ohne Unfall“). */
export const INCIDENT_SIGN = 'Minuten ohne Incident';

/** Prioritäten im Ticketsystem */
export const TICKET_PRIOS: string[] = ['niedrig', 'mittel', 'hoch', 'sehr hoch', 'gestern'];
/** Wer die Priorität „CHEF“ bekommt (sonst nie) */
export const BOSSES = ['Chef', 'Geschäftsführung', 'Vorstand', 'Vorstandsassistenz'];

/** Maus auf dem Mauspad: Antippen gibt einen Spruch im Log. */
export const MOUSE_LINES: string[] = [
  'mouse[3]: Rechtsklick. Kontextmenü: leer. Wie das Wiki.',
  'mouse[3]: Doppelklick erkannt. Zwei Tickets geöffnet. Beide: Drucker.',
  'mouse[3]: Kugelmaus. Die Kugel fehlt seit 2008.',
  'mouse[3]: Mausrad klemmt. Scrollt nur noch nach unten. Wie die Stimmung.',
  'mouse[3]: Klick. Nichts passiert. Fühlt sich trotzdem produktiv an.',
  'mouse[3]: Dreifachklick. Ganzer Absatz markiert. Aus Versehen gelöscht. Strg+Z.',
  'mouse[3]: Mauszeiger springt. Grund: Krümel. Von wem: unklar.',
  'mouse[3]: Akku 3 %. Seit 2 Jahren. Hält ewig.',
];

/** Papierkorb auf dem Desktop: Antippen gibt einen Spruch im Log. */
export const TRASH_LINES: string[] = [
  'trash[99]: 4.812 Dateien. Darunter: „Budget_FINAL_v7_wirklich_final.xlsx“.',
  'trash[99]: Papierkorb geleert. Die Hälfte war noch gebraucht.',
  'trash[99]: Inhalt: drei Lebensläufe von Kollegen. Interessant.',
  'trash[99]: Der Papierkorb ist voll. Wie dein Postfach. Und dein Kalender.',
  'trash[99]: Gefunden: die Doku von 2014. Gelöscht von: dir.',
  'trash[99]: Inhalt: ein Ordner „Nicht löschen“. Ironie erkannt.',
  'trash[99]: Wiederherstellen? Nein. Das hat einen Grund.',
  'trash[99]: 1 Element: „Kündigung_Entwurf.docx“. Nur ein Entwurf.',
  'trash[99]: „Witze_Teamrunde_v3.docx“ vom Abteilungsleiter. Zu Recht hier.',
];

/**
 * Becher-Design je Infrastruktur: die zuletzt verbesserte bestimmt den Becher.
 * Stufe 1: weiß mit Aufdruck, 2: in der Farbe der Infrastruktur, 3: golden. Antippen zeigt das Motto.
 */
export type MugGen = 'bash' | 'cron' | 'ansible' | 'k8s' | 'agent';
export const MUG_DESIGNS: Record<MugGen, { title: string; color: string; prints: [[string, string], [string, string], [string, string]]; lines: [string, string, string] }> = {
  bash: {
    title: 'AUTOMATISIERUNG',
    color: '#a0c4ff',
    prints: [
      ['SET -EUO', 'PIPEFAIL'],
      ['# KEINE', 'AHNUNG'],
      ['SHELL', 'CHECKED'],
    ],
    lines: [
      'Wer Fehler ignoriert, hat keine. Seit set -e leider doch.',
      'Jedes Skript beginnt mit „nur ganz kurz“. Jetzt steht es wenigstens im Kommentar.',
      'Warum 5 Minuten klicken, wenn man 5 Stunden skripten kann? Jetzt ohne Warnungen.',
    ],
  },
  cron: {
    title: 'GEDULD',
    color: '#ffd166',
    prints: [
      ['MAILTO=""', 'RUHE'],
      ['NUR EINER', 'ZUR ZEIT'],
      ['03:00', 'MEINE ZEIT'],
    ],
    lines: [
      'Erfolg ist, wenn keiner merkt, ob es läuft. Ohne Cron-Mails merkt es wirklich keiner.',
      'Jeder Job läuft nur noch einmal gleichzeitig. Teamgeist war gestern.',
      'Läuft jede Nacht um 3. Seit 2011. Jetzt mit Unit-File.',
    ],
  },
  ansible: {
    title: 'KONSISTENZ',
    color: '#9be3c1',
    prints: [
      ['CHANGED: 0', '(GELOGEN)'],
      ['PASSWORT', 'IM README'],
      ['2× GLEICH', 'GEBRÜHT'],
    ],
    lines: [
      'Dry Run sagt „changed: 0“. Jetzt ist es überall gleich kaputt.',
      'Alle Geheimnisse verschlüsselt. Das Passwort steht im README.',
      'Zweimal ausgeführt, gleiches Ergebnis. Erzähl es deinen Enkeln.',
    ],
  },
  k8s: {
    title: 'SKALIERUNG',
    color: '#cdb4db',
    prints: [
      ['HELM', 'AM STEUER'],
      ['ICH STARTE', 'NEU'],
      ['KEINER', 'VERSTEHT’S'],
    ],
    lines: [
      'Ein Problem. Jetzt verteilt auf 40 Pods.',
      'Wenn es nicht läuft, starte es neu. Für immer. Automatisch.',
      'Niemand versteht das Netzwerk. Aber es ist verschlüsselt.',
    ],
  },
  agent: {
    title: 'INNOVATION',
    color: '#f4a261',
    prints: [
      ['SEI', 'HILFREICH'],
      ['MENSCH', 'KLICKT OK'],
      ['100 %', 'FAKTEN*'],
    ],
    lines: [
      'Halluziniert schneller als jeder Praktikant.',
      'Der Mensch bleibt im Loop. Er klickt „OK“.',
      'Erfindet RFCs jetzt nur noch freitags.',
    ],
  },
};

/** Abreißkalender an der Wand: Antippen reißt das Blatt ab, der nächste Tag kommt */
export const CALENDAR_LINES: string[] = [
  'Teamwork: Einer macht’s, alle in CC.',
  'sudo Kaffee',
  '404: Motivation not found.',
  'Heute ist ein guter Tag für ein Backup.',
  'Never touch a running system.',
  'Kein Bug. Ein Feature.',
  'Ein Ticket kommt selten allein.',
  'Heute kein Meeting. (Lüge)',
  'Erst denken, dann rm -rf.',
  'Nichts hält länger als ein Provisorium.',
  'Heute schon gepingt?',
  'Kein Workaround. Architektur.',
  'Gestern lief es noch.',
  'Ab heute Doku. Ab morgen.',
  'YAML: Leerzeichen sind Gefühle.',
  'Es gibt 10 Arten von Menschen.',
  'Heute ist Patchday. Irgendwo.',
  'Nur Mut. Und ein Rollback-Plan.',
  'Strg+S ist Selbstfürsorge.',
  'Die Zukunft ist da. Ungepatcht.',
  '„Sofort“ heißt „vorgestern“.',
  'Morgen ist auch noch ein Ticket.',
  'Ich bin Chef, kein Unmensch.',
  'Ein guter Chef delegiert. Alles.',
  'Fehler macht jeder. Ich nicht.',
  'Lob ist wie Gehalt: selten.',
  'Kritik? Bitte per Fax.',
  'Wer suchet, der greppt.',
  'Morgenstund hat Ticket im Mund.',
  'Wo gehobelt wird, fallen Server.',
  'Reden ist Silber, Mute ist Gold.',
  'Ohne Fleiß kein sudo.',
  'Weniger ist mehr. Außer RAM.',
  'Ping ist keine Begrüßung.',
  'Admin ist, wer zuletzt geht.',
  'Lächeln. Du bist im Log.',
  'Wissen ist Macht. Doku ist Ohnmacht.',
];
