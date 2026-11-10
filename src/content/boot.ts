// Einschalten und Ausschalten: Startbildschirm, Zettel vom Vorgänger, Licht und Monitor.

export const GAME_TITLE = 'Have You Tried Turning It Off and On Again?';

/** Kleingedrucktes unter dem Netzschalter (zufällig) */
export const SPLASH_GAGS = [
  'Bitte nicht gedrückt halten. Das ist kein Reset.',
  'Strom kommt vom Immobilienmanagement. Meistens.',
  'Einmal drücken. Nicht doppelklicken. Wir hatten darüber gesprochen.',
  'Laut Wissensdatenbank löst dieser Knopf 80 % aller Tickets.',
  'Netzteil: 230 V. Geduld: 12 V.',
  'Achtung: Gerät enthält keine vom Benutzer zu wartenden Teile. Also dich.',
  'Zuletzt eingeschaltet von: Praktikant. Zuletzt ausgeschaltet von: Praktikant.',
  'Energieeffizienzklasse: F5.',
];
/** Mit Spielstand: Willkommen zurück */
export const SPLASH_BACK_GAGS = [
  'Willkommen zurück. Die Tickets haben dich vermisst. Der Chef nicht.',
  'Schicht beginnt. Der Kaffee ist schon kalt.',
  'Der Server lief die ganze Zeit. Du nicht.',
];
export const SPLASH_BUTTON = 'Einschalten';

/** Im dunklen Büro beim Start */
export const BOOT_DARK_HINT = 'Bewegungsmelder (Baujahr 1998). Einmal winken: irgendwo antippen.';
/** Blase am Netzschalter des Monitors, wenn jemand ihn sucht */
export const POWER_HINT = 'Monitor aus? Hier ist der Knopf.';

/** Banner über der Tastatur, solange auf dem Desktop noch kein Werkzeug offen ist */
export const TOOL_HINT = 'Tipp drauf! Erstes Ticket aufmachen';
/** nach Alt+F4 */
export const NEXT_TOOL_HINT = 'Tipp drauf! Nächstes Ticket aufmachen';

/** Wasserzeichen unten rechts auf dem Hintergrundbild (zufällig pro Start) */
export const WALLPAPER_MARKS: [string, string][] = [
  ['Betriebssystem nicht aktiviert', 'Seit 2009. Hat noch keiner gemerkt.'],
  ['Gruppenrichtlinie aktiv', 'Wird nachts um drei zurückgesetzt.'],
  ['Testversion abgelaufen', 'Vor 4.817 Tagen. Läuft trotzdem.'],
  ['Neustart erforderlich', 'Seit 214 Tagen. Wird verschoben.'],
  ['Von Ihrer Organisation verwaltet', 'Die Organisation weiß davon nichts.'],
  ['Sync-Konflikt: Desktop (2)', 'Desktop (2) gewinnt. Wie immer.'],
  ['Remote-Sitzung aktiv', 'Jemand schaut zu. Bitte nicht gähnen.'],
  ['Abgesicherter Modus', 'Seit dem letzten Update. Läuft stabil.'],
  ['Studentenversion', 'Der Student ist 2016 gegangen.'],
  ['Treiber nicht signiert', 'Hat der Praktikant selbst geschrieben.'],
  ['Speicherplatz fast voll', 'Bitte Hintergrundbild löschen.'],
  ['Uhrzeit nicht synchron', 'Laut Systemuhr ist seit 2021 Montag.'],
  ['Domäne nicht erreichbar', 'Angemeldet mit Passwort von 2019.'],
  ['Wartungsmodus', 'Nicht berühren. Auch nicht der Admin.'],
  ['Energiesparplan: Höchstleistung', 'Für die Tabellenkalkulation. Angeblich.'],
  ['Bildschirmschoner deaktiviert', 'Der Chef soll sehen, dass was läuft.'],
];

/** Nach 10 min ohne Eingabe */
export const AFK_HINTS = [
  'Licht aus. Antippen zum Weiterarbeiten.',
  'Bewegungsmelder sagt: niemand da. Beweis das Gegenteil.',
  'Energiesparmodus. Einmal winken.',
];

export const LIGHTS_OFF_LINES = [
  'immobilien[42]: Bewegungsmelder: seit 10 Minuten keine Bewegung. Licht aus. Energiesparen!',
  'immobilien[42]: Niemand da. Licht aus. Der Monitor geht auch schlafen.',
  'dpms[7]: Bildschirm aus. Der Admin ist vermutlich beim Kaffee. Oder eingeschlafen.',
];
export const LIGHTS_ON_LINES = [
  'immobilien[42]: Bewegung erkannt. Licht an. Die Leuchtstoffröhre braucht einen Moment.',
  'immobilien[42]: Wedeln erkannt. Licht an. Willkommen zurück.',
  'immobilien[42]: Röhre 3 von 4 zündet. Röhre 4 denkt noch nach.',
];
export const SCREEN_ON_LINES = [
  'dpms[7]: Bildschirm wieder an. Niemand hat gesehen, wie lange du weg warst. Außer dem Chef.',
  'dpms[7]: Monitor an. Die Röhre summt zufrieden.',
  'dpms[7]: Standby beendet. Die Pixel müssen sich erst wieder aufstellen.',
];
/** Beim Start: Licht und Monitor */
export const BOOT_LIGHTS_LINE = 'immobilien[42]: Bewegung erkannt. Röhren zünden. Starter tickt wie 1998.';
export const BOOT_SCREEN_LINE = 'dpms[7]: HYT-2000 aufgewärmt. Entmagnetisiert. Bwoing.';

/** Zettel vom Vorgänger beim allerersten Start (und nach „Alles löschen“) */
export const HANDOVER = {
  title: 'Übergabe',
  greeting: 'Falls du das liest: Glückwunsch, du bist jetzt der Support. Ich bin raus. Frag nicht, wohin.',
  jobTitle: 'So läuft der Laden:',
  job: [
    'Telefon klingelt → jemand hat ein Problem. Meistens den Drucker.',
    'Du tippst die Antwort. Jede Taste ist richtig, frag nicht. Ticket zu = Ticket aufs Konto.',
    'Davon holst du Praktikanten, Skripte und Kaffee. Die arbeiten auch ohne dich.',
    'Pager piept → es brennt.',
  ],
  morningTitle: 'Jeden Morgen:',
  morning: ['Winken. Das Licht hängt am Bewegungsmelder (Baujahr 1998).', 'Monitor an: Knopf unten rechts. Revolutionär, ich weiß.'],
  ps: 'P.S. Passwort klebt unter der Tastatur. Die Gummiente weiß alles.',
  signature: '– Dein Vorgänger',
  button: 'Gelesen. Ungefähr.',
};
