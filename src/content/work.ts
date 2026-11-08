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
