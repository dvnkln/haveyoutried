import type { Topic } from './topics';

// Inhalte für das Arbeitsfenster auf dem Desktop: was getippt wird und was drumherum steht.
export { BOSSES, TICKET_PRIOS } from './props';

/** Chat im Firmen-Messenger: Einstieg vor der eigentlichen Antwort */
export const CHAT_LINES: string[] = [
  'Moin!',
  'Kurz und knapp:',
  'Hab deine 14 „Hallo?“ gesehen.',
  'Bitte keine Sprachnachrichten. Also:',
  'Ich hab dich auf „Abwesend“ gesehen. Trotzdem:',
  'Bin dran. Und:',
];

/** Videocall: was man vor der eigentlichen Antwort sagt */
export const CALL_LINES: string[] = [
  'Sie sind noch stummgeschaltet. … Jetzt.',
  'Hören Sie mich? … Gut.',
  'Nein, das andere Fenster. Egal:',
  'Sie sind eingefroren. … Ah, wieder da.',
  'Ihr Hintergrund ist ein Strand. Schön. Also:',
  'Wer tippt da so laut? Ach, ich. Also:',
];

export const RDP_ERRORS: string[] = [
  'Fehler 0x80070005: Zugriff verweigert.',
  'Ein unbekannter Fehler ist aufgetreten. Unbekannt.',
  'Ihr Kennwort läuft in 0 Tagen ab.',
  'Updates werden installiert (3 %). Nicht ausschalten.',
  'Drucker „HP-3OG“ ist offline. Seit immer.',
];

/** Webinterface: Einstellungen, die es auf jedem Gerät gibt (Gerätespezifisches in topics.ts) */
export const WEB_GENERIC: string[] = [
  'Passwort: admin → neues Passwort: admin2',
  'Neustart planen: Freitag 23:59',
  'Zeitzone: endlich nicht mehr 1970',
  'Admin-Zugang aus dem Internet: AUS. Wer hat den angemacht?',
  'SNMP-Community: public (natürlich)',
];

/** Websuche: die üblichen Treffer (Suchanfragen je Thema in topics.ts) */
export const SEARCH_RESULTS: string[] = [
  'Forum, 2009: „Gleiches Problem.“ Keine Antwort.',
  'Stack Overflow: Als Duplikat geschlossen.',
  'Hersteller-FAQ: „Wenden Sie sich an Ihren Administrator.“',
  'Video, 14 Minuten: Lösung ab 13:50.',
  'Forum: „Hast du es schon mal aus- und wieder eingeschaltet?“',
  'Seite 2 der Ergebnisse. Hier war noch nie jemand.',
  'Gelöst! (Der Link zur Lösung ist tot.)',
];

/** Chat-Kontakte für den Firmen-Messenger, falls gerade niemand anruft */
export const CHAT_FALLBACK = 'Chef';

/** Memes beim Nichtstun: Bildmakros (oben/unten), in der Mitte ein Text-Gesicht als „Foto“ */
export const MEMES: { top: string; bottom: string; face: string }[] = [
  { top: 'Es funktioniert auf meinem Rechner.', bottom: 'Dann liefern wir eben deinen Rechner aus.', face: '(¬‿¬)' },
  { top: 'Es ist nicht DNS. Es kann nicht DNS sein.', bottom: 'Es war DNS.', face: 'ಠ_ಠ' },
  { top: '99 kleine Bugs im Code. Einen gefixt …', bottom: '127 kleine Bugs im Code.', face: '(⊙_☉)' },
  { top: 'Ich, beim Schreiben der Doku', bottom: 'Ich, drei Wochen später: „Was soll das heißen?“', face: '(・_・;)' },
  { top: 'Freitag, 16:59', bottom: '„Kurze Frage …“', face: '(╯°□°)╯︵ ┻━┻' },
  { top: 'Passwort muss enthalten:', bottom: 'Großbuchstaben, Zahl, Sonderzeichen, Hieroglyphe', face: '(ʘ‿ʘ)' },
  { top: 'Backup machen? Später.', bottom: 'Restore? … Oh.', face: '(°ロ°)' },
  { top: 'Ticket: „Internet kaputt“', bottom: 'Ursache: WLAN-Schalter am Laptop', face: '¯\\_(ツ)_/¯' },
  { top: 'Kein Deploy am Freitag', bottom: 'Der Deploy am Freitag: *schwitzt*', face: '(；一_一)' },
  { top: 'Der Server, der seit 1.284 Tagen läuft', bottom: 'Niemand weiß, was er tut. Niemand fasst ihn an.', face: '(◔_◔)' },
  { top: 'Change Advisory Board:', bottom: '„Klingt riskant. Machen wir’s Montag früh.“', face: '(￣ヘ￣)' },
  { top: 'Ich: kurz Memes gucken', bottom: 'Die Warteschlange: *starrt*', face: '(ಠ_ಠ)' },
  { top: 'Hast du es aus- und wieder eingeschaltet?', bottom: 'Ich hab es aus- und wieder eingeschaltet. Jetzt brennt es.', face: '(o_O)' },
  { top: 'Wenn der Kunde sagt „Ich hab nichts geändert“', bottom: 'Der Verlauf: 14 Änderungen', face: '(¬_¬)' },
  // BOFH
  { top: 'User: „Ich brauche mehr Speicherplatz.“', bottom: 'BOFH: *löscht den Ordner „Wichtig“*. Jetzt ist Platz.', face: '(¬‿¬)' },
  { top: 'Ausrede des Tages:', bottom: 'Sonnenwind stört die Glasfaser.', face: '(￣▽￣)' },
  { top: 'Chef will Adminrechte', bottom: 'Chef bekommt einen Knopf. Der Knopf ist nicht angeschlossen.', face: '(◕‿◕)' },
  { top: 'Wie ich den Praktikanten nenne:', bottom: 'Lebende Firewall', face: '(⌐■_■)' },
  { top: 'Helpdesk-Hotline', bottom: 'Seit gestern auf das Faxgerät umgeleitet. Anrufe −80 %.', face: '(͡° ͜ʖ ͡°)' },
  { top: '„Können Sie mein Passwort zurücksetzen?“', bottom: 'Klar. Auf welches Passwort von 2009?', face: '(ʘ‿ʘ)' },
  // IT Crowd
  { top: 'Notfallnummer auswendig?', bottom: '0118 999 881 999 119 725 … 3', face: '(°ロ°)' },
  { top: 'Das hier ist das Internet.', bottom: 'Es wiegt nichts. Bitte nicht fallen lassen.', face: '(⊙_⊙)' },
  { top: '„Hallo, IT. Schon mal aus- und wieder eingeschaltet?“', bottom: 'Anrufer: „Woher wissen Sie das?!“', face: '(¬‿¬)' },
  { top: 'Feuer im Serverraum', bottom: 'Ich schick dazu mal ’ne Mail.', face: '(ノಠ益ಠ)ノ' },
  { top: 'Kollegen: „Was macht die IT eigentlich?“', bottom: 'Kellerraum, kein Fenster, Leuchtstoffröhre: alles läuft.', face: '(・_・)' },
  // xkcd und Klassiker
  { top: 'Schule ruft an:', bottom: 'Ihr Sohn heißt Robert\'); DROP TABLE Schüler;--?', face: '(°ロ°)' },
  { top: 'Gesamte IT-Infrastruktur', bottom: 'Ein Paket, gepflegt von einem Typen in Nebraska seit 2003', face: '(◔_◔)' },
  { top: 'Ich: „Das automatisiere ich schnell.“', bottom: 'Sechs Wochen später: Skript spart 4 Sekunden pro Monat.', face: '(；一_一)' },
  { top: 'Standards: 14 konkurrierende', bottom: 'Wir machen einen, der alle vereint. Standards: 15', face: '(ಠ_ಠ)' },
  { top: 'Frage im Forum, 2011: „Hat jemand das gelöst?“', bottom: 'Einzige Antwort: „Hat sich erledigt, danke.“', face: '(╥_╥)' },
  { top: 'Fehlerursache gefunden:', bottom: 'PEBKAC. Problem sitzt vor dem Bildschirm.', face: '(¬_¬)' },
  { top: 'Layer 1 bis 7: geprüft.', bottom: 'Layer 8 hat den Stecker gezogen.', face: '(ಥ﹏ಥ)' },
  { top: 'Drucker: „Papierstau“', bottom: 'Kein Papier drin. Kein Papierstau. Drucker lügt.', face: '(╯°□°)╯︵ ┻━┻' },
  { top: 'Rauch aus dem Netzteil', bottom: 'Magischer Rauch entwichen. Gerät läuft nicht ohne.', face: '(⊙_☉)' },
  { top: 'sudo mach mir ein Sandwich', bottom: 'Okay.', face: '(⌐■_■)' },
  { top: 'Chef: „Warum spielt ihr Schwertkampf?“', bottom: '„Kompiliert gerade.“, Chef: „Ah. Weitermachen.“', face: '(•̀ᴗ•́)و' },
  { top: 'Passwort: Tr0ub4dor&3', bottom: 'Besser: korrekt pferd batterie heftklammer', face: '(⊙_⊙)' },
  { top: 'Kollege: „Ist das in Produktion?“', bottom: 'Ich, mit dem Finger über Enter: „…jetzt schon.“', face: '(°ー°〃)' },
  { top: 'Ticket schließen', bottom: 'Ticket wieder offen. Bevor ich die Hand von der Maus hab.', face: '(；′⌒`)' },
  { top: 'Kunde: „Das Internet ist langsam.“', bottom: 'Kunde hat 47 Tabs mit Wetter-Radar offen.', face: '(¬‿¬)' },
  { top: 'Gelöst durch: Neustart', bottom: 'Ursache: unbekannt. Doku: „Neustart hilft.“', face: '(ツ)' },
  { top: 'Mein Kalender', bottom: 'Meeting über das Meeting, in dem wir Meetings reduzieren.', face: '(-_-;)' },
];

/** Meme-Plattformen (Parodien): helle Forum-Variante und dunkle Bilderseite */
export const MEME_SUBS = ['r/sysadmin', 'r/ProgrammerHumor', 'r/talesfromtechsupport', 'r/homelab', 'r/ichbinkeinroboter'];
export const MEME_USERS = ['u/bofh_42', 'u/pfy_intern', 'u/dns_was_it', 'u/ticketqueue', 'u/printer_hater', 'u/root_not_root'];

/**
 * Abschluss-Spruch im Ticketverlauf („Lösung“): passt zum Programm, das gerade offen war.
 * Platzhalter: {who} = Anrufer/Abteilung, {target} = Gerät oder PC.
 */
export const DONE_LINES: Record<'mail' | 'ticket' | 'term' | 'chat' | 'call' | 'rdp' | 'web' | 'search', string[]> = {
  mail: [
    '{who}: Mail raus. Lesebestätigung: abgelehnt.',
    '{who}: Mail raus. Auto-Reply: „Bin im Urlaub bis 2027“.',
    '{who}: Mail beantwortet. Antwort darauf: „Und jetzt?“',
    '{who}: Mail raus. Kam als Spam an. Beim Empfänger.',
    '{who}: „Danke!!“ an alle. 340 Leute. Allen antworten.',
    '{who} hat die Mail ausgedruckt. Und eingescannt. Und gemailt.',
    '{who}: Mail raus. Signatur länger als die Mail.',
  ],
  ticket: [
    '{who}: Ticket gelöst. Kunde: „Geht immer noch nicht.“',
    '{who}: Ticket auf „Gelöst“. Wiedereröffnet in 3 … 2 …',
    '{who}: Ticket geschlossen: „Works as designed“.',
    '{who}: Ticket geschlossen. Zufriedenheit: ★☆☆☆☆',
    '{who}: Ticket gelöst. Danke-Mail erhalten. Gerahmt.',
    '{who}: Ticket als Duplikat geschlossen. Von sich selbst.',
    '{who}: Ticket gelöst. Level 2 war Kaffee holen, also selbst gemacht.',
  ],
  term: [
    'Befehl lief durch. Exit 0. Keiner weiß warum.',
    'Befehl lief durch. Hoffentlich auf dem richtigen Server.',
    'Fertig. Kein Fehler. Verdächtig.',
    'Fertig. 3 Warnungen. Alle ignoriert. Wie geplant.',
    'Erledigt. History gelöscht. Sicher ist sicher.',
    'Läuft wieder. Nicht anfassen. Auch nicht angucken.',
  ],
  chat: [
    '{who} hat 👍 reagiert. Gespräch beendet.',
    '{who} tippt … tippt … schickt ein GIF.',
    '{who}: „ok“. Kleingeschrieben. Ohne Punkt. Bedrohlich.',
    '{who} ist jetzt „abwesend“. Seit 2 Sekunden.',
    '{who} antwortet mit Sprachnachricht. 4 Minuten.',
    '{who}: „ok“. Dann: „danke“. Dann: „aber …“. Dann nichts mehr.',
  ],
  call: [
    '{who}: Call beendet. 45 Minuten, davon 40 „Hört ihr mich?“',
    '{who}: Call beendet. Hätte eine Mail sein können.',
    '{who}: Call beendet. Du warst die ganze Zeit stumm.',
    '{who}: Call beendet. Follow-up-Termin: noch ein Call.',
    '{who}: Call beendet. Die Katze war das Highlight.',
    '{who} hat den Call verlassen. Mitten in deinem Satz.',
  ],
  rdp: [
    '{target} repariert. {who}: „War schon immer so.“',
    '{target} neu gestartet. Updates: 1 von 147.',
    '{target}: läuft wieder. Für mindestens 10 Minuten.',
    '{target} aufgeräumt. 12.000 Desktop-Icons. Behalten: alle.',
    '{target}: Fehler weg. Grund: Rätsel.',
    '{target}: {who} hat währenddessen weitergeklickt.',
  ],
  web: [
    '{target}: Einstellung gespeichert. Neustart nötig. Natürlich.',
    '{target}: gespeichert. Webinterface sagt „Error“, geht aber.',
    '{target}: Firmware aktualisiert. Ein Lämpchen leuchtet jetzt orange.',
    '{target}: gespeichert. Admin-Passwort steht trotzdem auf dem Post-it.',
    '{target}: läuft. Konfig gesichert auf: Desktop/neu(3).txt',
    '{target}: gespeichert. Doku? Kommt. Irgendwann.',
  ],
  search: [
    '{who}: Lösung gefunden. Forum, 2009. Hat funktioniert.',
    '{who}: Lösung gefunden. Stack Overflow, akzeptierte Antwort: falsch.',
    'Gegoogelt. Ergebnis: „Hast du es neu gestartet?“',
    '{who}: Antwort gefunden. Auf Seite 3. Niemand geht auf Seite 3.',
    'Gesucht. Fund: dein eigenes Ticket von 2021.',
    '{who}: Lösung: GitHub-Issue, „closed as won’t fix“.',
  ],
};


/** Status im Ticketverlauf */
export const TICKET_STATES: string[] = ['Gelöst', 'Geschlossen', 'Gelöst (vorläufig)', 'Gelöst (hoffentlich)', 'Erledigt', 'Geschlossen (bevor es wieder aufgeht)'];

/** VIP-Tickets (rote Post-its) im Verlauf: wer, was, Thema und die eine wahre Ursache */
export const VIP_TICKETS: { who: string; subject: string; topic: Topic; cause: string }[] = [
  { who: 'Chef', topic: 'hardware', subject: 'Beamer im Vorstandsraum: „Kein Signal“. Meeting in 2 Min.', cause: 'Falscher HDMI-Eingang' },
  { who: 'Geschäftsführung', topic: 'netz', subject: 'Das Internet ist weg.', cause: 'WLAN-Schalter am Laptop aus' },
  { who: 'Chef', topic: 'office', subject: 'Excel rechnet falsch.', cause: 'Zelle als Text formatiert' },
  { who: 'Vorstand', topic: 'passwort', subject: 'Passwort vergessen. Zum vierten Mal. Heute.', cause: 'Neues Passwort nicht notiert (gut so, aber …)' },
  { who: 'Chef', topic: 'drucker', subject: 'Drucker druckt nicht. Vor dem Kunden.', cause: 'Drucker im falschen Stockwerk ausgewählt' },
  { who: 'Geschäftsführung', topic: 'mail', subject: 'Handy synchronisiert keine Mails. Ist das Handy der Frau.', cause: 'Falsches Konto (das der Frau)' },
  { who: 'Chef', topic: 'office', subject: 'PowerPoint ist weg!', cause: 'Fenster minimiert' },
  { who: 'Vorstand', topic: 'wunsch', subject: 'Bitte sofort: neues iPad. Grund: „Farbe“.', cause: 'Farbe' },
];

/** Meilensteine einer Serie gelöster Tickets: Spruch unter dem Stempel */
export const STREAK_LINES: Record<number, string> = {
  5: 'Läuft bei dir!',
  10: 'Die Warteschlange hat Angst.',
  20: 'Moss wäre stolz.',
  42: 'Die Antwort auf alles.',
  100: 'Ludicrous Speed!',
};
