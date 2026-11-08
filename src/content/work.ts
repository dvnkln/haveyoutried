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

/** Memes beim Nichtstun: nur Text, Anspielungen statt Bilder */
export const MEMES: { top: string; bottom: string }[] = [
  { top: 'Es funktioniert auf meinem Rechner.', bottom: 'Dann liefern wir eben deinen Rechner aus.' },
  { top: 'Es ist nicht DNS. Es kann nicht DNS sein.', bottom: 'Es war DNS.' },
  { top: '99 kleine Bugs im Code. Einen gefixt …', bottom: '127 kleine Bugs im Code.' },
  { top: 'Ich, beim Schreiben der Doku:', bottom: 'Ich, drei Wochen später: „Was soll das heißen?“' },
  { top: 'Freitag, 16:59.', bottom: '„Kurze Frage …“' },
  { top: 'Passwort muss enthalten:', bottom: 'Großbuchstaben, Zahl, Sonderzeichen, Hieroglyphe.' },
  { top: 'Backup machen? Später.', bottom: 'Restore? … Oh.' },
  { top: 'Ticket: „Internet kaputt“', bottom: 'Ursache: WLAN-Schalter am Laptop.' },
  { top: 'Kein Deploy am Freitag.', bottom: 'Der Deploy am Freitag: *schwitzt*' },
  { top: 'Der Server, der seit 1.284 Tagen läuft:', bottom: 'Niemand weiß, was er tut. Niemand fasst ihn an.' },
  { top: 'Change Advisory Board:', bottom: '„Klingt riskant. Machen wir’s Montag früh.“' },
  { top: 'Ich: kurz Memes gucken.', bottom: 'Die Warteschlange: *starrt*' },
];
export const MEME_ACCOUNTS: string[] = ['@sysadmin_memes', '@it_crowd_fans', '@dns_was_it', '@ticketqueue', '@bofh_daily'];

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
