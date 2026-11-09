// Texte für die Requisiten am Schreibtisch (Post-its, Gummiente, Tasten).

/** Post-its am Monitorrahmen. Antippen blättert weiter. */
export const POSTITS: string[] = [
  'Passwort: hunter2',
  'Passwort: ********',
  'NICHT neu starten!!',
  '0118 999 881 999 119 725 … 3',
  'Have you tried…?',
  'sudo make me a sandwich',
  'Es ist immer DNS.',
  'Backup = Schrödinger',
  'Freitag: kein Deploy',
  'Drucker = Feind',
  'ID-10-T-Fehler?',
  'Layer 8 prüfen',
  'Ticket ≠ Zuruf',
  'chmod 777 ist keine Lösung',
  'Kaffee nachfüllen!',
  'Wer hat den Stecker …?',
  'Is it plugged in?',
  'Montag. Wieder.',
  'Doku? Später.',
  'Cloud = PC von wem anders',
  'Mittagspause 12:00–12:05',
  'PEBKAC',
  'RTFM (freundlich)',
  'Nicht füttern: Praktikant',
  'Kein Backup, kein Mitleid',
  'Montag: alles ausschalten?',
  'Zuständig: nicht ich',
  'Hast du es eingesteckt?',
  'It works on my machine™',
  ':q!',
  'Prod ≠ Test',
  'Druckerluft ist aus',
  'Ruhe bewahren. Logs lesen.',
  'Anrufer zählen: |||| ||',
  'Wer ist K.?',
  'TODO: Doku (2014)',
];

/** Rubber-Duck-Debugging: Log-Zeilen beim Antippen der Ente. */
export const DUCK_LINES: string[] = [
  'duckd[42]: quack. (Du hast das Problem gerade laut erklärt. Und verstanden.)',
  'duckd[42]: quack? – „Hast du es schon mal aus- und eingeschaltet?“',
  'duckd[42]: QUACK. Die Ente hält das für ein DNS-Problem.',
  'duckd[42]: quack. Die Ente hat die Logs gelesen. Die Ente ist besorgt.',
  'duckd[42]: quack quack. Übersetzt: „Hast du ein Backup?“',
  'duckd[42]: …quack. Die Ente ist im Ruhestand, hilft aber noch aus.',
  'duckd[42]: quack. Senior Rubber Duck Engineer, 20 Jahre Erfahrung.',
  'duckd[42]: quack! Die Ente fordert mehr Budget.',
  'duckd[42]: quack. Ticket an die Ente eskaliert. Ente: „Nicht mein Bereich.“',
  'duckd[42]: quack. Die Ente hat „It works on my machine“ gesagt. Die Ente hat keine Maschine.',
  'duckd[42]: quack… Die Ente fragt, ob du schon mal die Fehlermeldung gelesen hast. Ganz.',
  'duckd[42]: quack. Die Ente schlägt vor, es Montag zu deployen.',
  'duckd[42]: QUACK! Die Ente hat das Wort „Freitag“ gehört.',
];

/** Ab und zu im Log, wenn jemand Alt+F4 drückt. */
export const ALTF4_LINES: string[] = [
  'kernel: Alt+F4 erkannt. Nice try. Der Helpdesk schließt sich nicht.',
  'helpdesk[1337]: Alt+F4 zählt nicht als Feierabend.',
  'windowmanager[2]: Alt+F4 ignoriert. Die Tickets bleiben.',
  'helpdesk[1337]: Alt+F4? Netter Versuch. Der Anrufer ist noch dran.',
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
];

/**
 * Ironische Motivationsposter an der Wand: eins pro Generator, jede Upgrade-Stufe
 * macht es edler (angeklebt → schwarzer Rahmen → Goldrahmen) und bringt einen neuen Spruch.
 */
export const POSTERS: Record<'bash' | 'cron' | 'ansible' | 'k8s' | 'agent', { title: string; glyph: string; color: string; lines: [string, string, string] }> = {
  bash: {
    title: 'AUTOMATISIERUNG',
    glyph: '#!',
    color: '#a0c4ff',
    lines: [
      'Wer Fehler ignoriert, hat keine. Seit set -e leider doch.',
      'Jedes Skript beginnt mit „nur ganz kurz“. Jetzt steht es wenigstens im Kommentar.',
      'Warum 5 Minuten klicken, wenn man 5 Stunden skripten kann? Jetzt ohne Warnungen.',
    ],
  },
  cron: {
    title: 'GEDULD',
    glyph: '*/5',
    color: '#ffd166',
    lines: [
      'Erfolg ist, wenn keiner merkt, ob es läuft. Ohne Cron-Mails merkt es wirklich keiner.',
      'Jeder Job läuft nur noch einmal gleichzeitig. Teamgeist war gestern.',
      'Läuft jede Nacht um 3. Seit 2011. Jetzt mit Unit-File.',
    ],
  },
  ansible: {
    title: 'KONSISTENZ',
    glyph: 'YAML',
    color: '#9be3c1',
    lines: [
      'Dry Run sagt „changed: 0“. Jetzt ist es überall gleich kaputt.',
      'Alle Geheimnisse verschlüsselt. Das Passwort steht im README.',
      'Zweimal ausgeführt, gleiches Ergebnis. Erzähl es deinen Enkeln.',
    ],
  },
  k8s: {
    title: 'SKALIERUNG',
    glyph: 'k8s',
    color: '#cdb4db',
    lines: [
      'Ein Problem. Jetzt verteilt auf 40 Pods.',
      'Wenn es nicht läuft, starte es neu. Für immer. Automatisch.',
      'Niemand versteht das Netzwerk. Aber es ist verschlüsselt.',
    ],
  },
  agent: {
    title: 'INNOVATION',
    glyph: 'AI',
    color: '#f4a261',
    lines: [
      'Halluziniert schneller als jeder Praktikant.',
      'Der Mensch bleibt im Loop. Er klickt „OK“.',
      'Erfindet RFCs jetzt nur noch freitags.',
    ],
  },
};
