// Texte für die Requisiten am Schreibtisch (Post-its, Gummiente, Combo, Tasten).

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
  'There is no cloud. Just someone else’s computer.',
  'Mittagspause 12:00–12:05',
  'PEBKAC',
  'RTFM (freundlich)',
  'Nicht füttern: Praktikant',
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
];

/** Combo-Sprüche bei schnellem Tippen (Serie → Text). */
export const COMBO_LINES: Record<number, string> = {
  50: 'Sehnenscheide: warm',
  100: 'Tastatur-Garantie: erloschen',
  250: 'Kollegen fragen, ob alles okay ist',
  500: 'Die Tastatur raucht. Gutes Zeichen?',
  1000: 'Du bist jetzt ein Makro.',
};

/** Ab und zu im Log, wenn jemand Alt+F4 drückt. */
export const ALTF4_LINES: string[] = [
  'kernel: Alt+F4 erkannt. Nice try. Der Helpdesk schließt sich nicht.',
  'helpdesk[1337]: Alt+F4 zählt nicht als Feierabend.',
  'windowmanager[2]: Alt+F4 ignoriert. Die Tickets bleiben.',
];

/** Ab und zu im Log, wenn jemand die Panik-Taste drückt. */
export const PANIC_LINES: string[] = [
  'helpdesk[1337]: Panik-Taste gedrückt. Hat nichts gebracht. Wie immer.',
  'helpdesk[1337]: DON’T PANIC. (Handtuch liegt in der Schublade.)',
  'helpdesk[1337]: Panik registriert. Ticket für Panik angelegt.',
];

/** Schild an der Wand („Arbeitstage ohne Unfall“). */
export const INCIDENT_SIGN = 'Minuten ohne Incident';

/** Prioritäten im Ticketsystem */
export const TICKET_PRIOS: string[] = ['niedrig', 'mittel', 'hoch', 'sehr hoch', 'CHEF', 'gestern'];

/** Maus auf dem Mauspad: Antippen gibt einen Spruch im Log. */
export const MOUSE_LINES: string[] = [
  'mouse[3]: Rechtsklick. Kontextmenü: leer. Wie das Wiki.',
  'mouse[3]: Doppelklick erkannt. Zwei Tickets geöffnet. Beide: Drucker.',
  'mouse[3]: Kugelmaus. Die Kugel fehlt seit 2008.',
  'mouse[3]: Mausrad klemmt. Scrollt nur noch nach unten. Wie die Stimmung.',
  'mouse[3]: Klick. Nichts passiert. Fühlt sich trotzdem produktiv an.',
];

/** Papierkorb auf dem Desktop: Antippen gibt einen Spruch im Log. */
export const TRASH_LINES: string[] = [
  'trash[99]: 4.812 Dateien. Darunter: „Budget_FINAL_v7_wirklich_final.xlsx“.',
  'trash[99]: Papierkorb geleert. Die Hälfte war noch gebraucht.',
  'trash[99]: Inhalt: drei Lebensläufe von Kollegen. Interessant.',
  'trash[99]: Der Papierkorb ist voll. Wie dein Postfach. Und dein Kalender.',
  'trash[99]: Gefunden: die Doku von 2014. Gelöscht von: dir.',
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
      'Warum 5 Minuten klicken, wenn man 5 Stunden skripten kann?',
      'Jedes Skript beginnt mit „nur ganz kurz“. Und endet mit 400 Zeilen.',
      'Wer Fehler ignoriert, hat keine. (set -e hat das jetzt beendet.)',
    ],
  },
  cron: {
    title: 'GEDULD',
    glyph: '*/5',
    color: '#ffd166',
    lines: [
      'Läuft jede Nacht um 3. Seit 2011. Niemand weiß, was.',
      'Erfolg ist, wenn keiner merkt, dass es läuft. Oder ob.',
      'Manche Jobs laufen fünfmal gleichzeitig. Das nennt man Teamgeist.',
    ],
  },
  ansible: {
    title: 'KONSISTENZ',
    glyph: 'YAML',
    color: '#9be3c1',
    lines: [
      'Jetzt ist es überall gleich kaputt.',
      'Ein Leerzeichen zu viel trennt Genie von Wahnsinn.',
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
