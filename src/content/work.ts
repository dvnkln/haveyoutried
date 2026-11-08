// Inhalte für das Arbeitsfenster auf dem Desktop: was getippt wird und was drumherum steht.
export { REPLIES_CMD, REPLIES_TEXT, TICKET_PRIOS } from './props';

/** Chat im Firmen-Messenger: kurze Antworten */
export const CHAT_LINES: string[] = [
  'Bin dran.',
  'Hast du es schon neu gestartet?',
  'Kannst du kurz deinen Bildschirm teilen?',
  'Bin in 5 Minuten da. (IT-Minuten.)',
  'Ein Daumen hoch reicht als Antwort, danke.',
  'Geht’s jetzt? Super, ich schließe das Ticket.',
  'Ich ruf dich an. Nein, doch nicht. Ich schreib.',
  'Bitte keine Sprachnachrichten. Bitte.',
  'Steht im Wiki. Also, stünde.',
  'Ich hab dich auf „Abwesend“ gesehen. Ich weiß, dass du da bist.',
];

/** Videocall: was man sagt (meistens stummgeschaltet) */
export const CALL_LINES: string[] = [
  'Sie sind noch stummgeschaltet.',
  'Können Sie meinen Bildschirm sehen?',
  'Nein, das andere Fenster.',
  'Ich höre Sie … jetzt nicht mehr.',
  'Bitte einmal raus und wieder rein.',
  'Ihr Hintergrund ist ein Strand. Schön.',
  'Wer tippt da so laut? Ach, ich.',
  'Ich glaube, Sie haben eingefroren. Oder nachgedacht.',
  'Das hätte auch eine Mail sein können.',
];

/** Fernwartung per RDP: Befehle im „Ausführen“-Dialog */
export const RDP_LINES: string[] = [
  'control printers',
  'gpupdate /force',
  'services.msc',
  'eventvwr.msc',
  'taskmgr',
  'cleanmgr /sagerun:1',
  'ipconfig /flushdns',
  'shutdown /r /t 0',
  '%temp%  (4,2 GB. Seit 2016.)',
];
export const RDP_PCS: string[] = ['PC-BUCHH-07', 'LAPTOP-CHEF', 'PC-EMPFANG', 'NB-AZUBI-02', 'PC-LAGER-1', 'PC-VERTRIEB-3'];
export const RDP_ERRORS: string[] = [
  'Fehler 0x80070005: Zugriff verweigert.',
  'Ein unbekannter Fehler ist aufgetreten. Unbekannt.',
  'Ihr Kennwort läuft in 0 Tagen ab.',
  'Updates werden installiert (3 %). Nicht ausschalten.',
  'Drucker „HP-3OG“ ist offline. Seit immer.',
];

/** Webinterface von Geräten: was eingestellt wird */
export const WEB_LINES: string[] = [
  'Passwort: admin → neues Passwort: admin2',
  'Toner-Warnung: deaktiviert',
  'Firmware: 2.0.1-final-final',
  'SNMP-Community: public (natürlich)',
  'Neustart planen: Freitag 23:59',
  'Energiesparmodus: aus (wegen Beschwerden)',
  'Zeitzone: endlich nicht mehr 1970',
  'Admin-Zugang aus dem Internet: AUS. Wer hat den angemacht?',
];
export const WEB_DEVICES: string[] = ['Drucker 3. OG', 'Switch Keller', 'NAS Buchhaltung', 'Router Filiale', 'USV Serverraum', 'Kaffeemaschine (IoT)'];

/** Websuche: Suchanfragen und die üblichen Treffer */
export const SEARCH_LINES: string[] = [
  'drucker druckt nur leere seiten',
  'outlook startet nur im abgesicherten modus',
  'dns einfach erklärt für chef',
  'excel datei nicht gespeichert wiederherstellen',
  'fehler 0x8007045d',
  'wie lange dauert ein raid rebuild wirklich',
  'kann man teams firmenweit deinstallieren',
  'wlan geht nur am fenster',
  'warum ist es immer dns',
];
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
    '{who}: Ticket gelöst. Ursache: Layer 8.',
    '{who}: Ticket als Duplikat geschlossen. Von sich selbst.',
    '{who}: Ticket an Level 2 eskaliert. Level 2 ist Kaffee holen.',
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
    '{who}: „Ah, war der Stecker.“',
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
    '{target}: Drucker wieder da. Für 10 Minuten.',
    '{target} aufgeräumt. 12.000 Desktop-Icons. Behalten: alle.',
    '{target}: Fehler weg. Grund: Rätsel.',
    '{target}: {who} hat währenddessen weitergeklickt.',
  ],
  web: [
    '{target}: Einstellung gespeichert. Neustart nötig. Natürlich.',
    '{target}: gespeichert. Webinterface sagt „Error“, geht aber.',
    '{target}: Firmware aktualisiert. Ein Lämpchen leuchtet jetzt orange.',
    '{target}: Passwort geändert. Steht jetzt auf dem Post-it.',
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


/** Interne Notizen im Ticketverlauf: was wirklich passiert ist. {who} = Melder:in, {target} = Gerät */
export const TICKET_NOTES: string[] = [
  '{who} hat dreimal neu gestartet. Zweimal davon den Monitor.',
  'Problem trat nur auf, wenn ich nicht hingeschaut habe.',
  'Stecker war drin. Andere Seite nicht.',
  'Beim Fernzugriff hat {who} die ganze Zeit die Maus festgehalten.',
  '{who} hat das Passwort am Telefon buchstabiert. Laut. Im Großraumbüro.',
  'Hab nichts gemacht. Ging dann. Als „gelöst durch IT“ markiert.',
  'Fehler nicht reproduzierbar. {who} auch nicht erreichbar.',
  'Laut {who} „seit gestern“. Laut Logs seit 2019.',
  'Ursache: Kaffee. In der Tastatur.',
  '{who} hat vorher „was im Internet gefunden“. Und ausgeführt.',
  'Screenshot erhalten. Abfotografiert. Mit Blitz. Vom Handy der Kollegin.',
  'Ticket war eigentlich für die Kantine. Trotzdem gelöst.',
  'Dritte Meldung diese Woche. Gleiches Problem. Gleiche Lösung. Gleicher Mensch.',
  '{who} wollte wissen, ob „das Internet“ heute geht. Ja.',
  'Problem saß vor dem Bildschirm. Höflich umformuliert.',
  'Bei mir ging’s. Bei {who} jetzt auch. Keine Fragen.',
  'Workaround dokumentiert. In meinem Kopf.',
  'Aufwand: 2 Minuten Lösung, 25 Minuten Small Talk.',
  'Drucker hat sich entschuldigt. Glaube ich zumindest.',
  '{who} hat „Allen antworten“ benutzt. 340 Leute wissen jetzt Bescheid.',
  'Hab Caps Lock ausgemacht. Ticket gelöst. Respekt verdient.',
  'Neustart verweigert wegen „wichtiger offener Tabs“ (147).',
  'Hinweis an mich: nie wieder „Das dauert nur kurz“ sagen.',
  'Laut {who} hat „der Computer das selbst gemacht“. Korrekt: Update.',
  '{target} lief mit Admin/Admin. Jetzt Admin/Admin2. Fortschritt.',
  'Bitte nicht wiedereröffnen. Bitte. Bitte.',
  'Eskalation an den Chef vermieden. Durch Kekse.',
  'Wiki-Artikel dazu existiert. Hat keiner gelesen. Ich auch nicht.',
  '{who} fragte, ob ich „mal eben“ noch den privaten Laptop anschauen kann.',
  'Hat am Ende doch mit Aus- und Einschalten funktioniert. Wie immer.',
];

/** Status im Ticketverlauf */
export const TICKET_STATES: string[] = ['Gelöst', 'Geschlossen', 'Gelöst (vorläufig)', 'Gelöst (hoffentlich)', 'Erledigt', 'Wartet auf Rückmeldung (ewig)'];

/** VIP-Tickets (rote Post-its) im Verlauf: wer und was */
export const VIP_TICKETS: { who: string; subject: string }[] = [
  { who: 'Chef', subject: 'Beamer im Vorstandsraum: „Kein Signal“. Meeting in 2 Min.' },
  { who: 'Geschäftsführung', subject: 'Das Internet ist weg. (WLAN aus.)' },
  { who: 'Chef', subject: 'Excel rechnet falsch. (Zelle als Text formatiert.)' },
  { who: 'Vorstand', subject: 'Passwort vergessen. Zum vierten Mal. Heute.' },
  { who: 'Chef', subject: 'Drucker druckt nicht. Vor dem Kunden.' },
  { who: 'Geschäftsführung', subject: 'Handy synchronisiert nicht. Ist das Handy der Frau.' },
  { who: 'Chef', subject: 'PowerPoint ist weg! (minimiert)' },
  { who: 'Vorstand', subject: 'Bitte sofort: neues iPad. Grund: „Farbe“.' },
];
