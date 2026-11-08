// Worum es in einem Anliegen geht. Antwort und Ursache stehen beim Anliegen selbst (callers.ts);
// das Thema liefert die Werkzeug-Texte (Befehl, Suche, Gerät) und die interne Notiz bei Reparaturen.

export type Topic = 'drucker' | 'passwort' | 'netz' | 'mail' | 'office' | 'hardware' | 'server' | 'sicherheit' | 'wunsch' | 'allgemein';

/** Leere Liste = Werkzeug passt nicht zum Thema (z. B. keine Shell bei Wünschen) */
export interface TopicText {
  /** Befehle im Terminal */
  cmds: string[];
  /** Befehle im „Ausführen“-Dialog der Fernwartung */
  rdp: string[];
  /** Suchanfragen */
  searches: string[];
  /** Geräte fürs Webinterface (Schlüssel aus DEVICE_SETTINGS) */
  devices: Device[];
  /** interne Notiz bei einer Reparatur: wie es wirklich lief, ohne die Ursache vorwegzunehmen. {who} = Melder:in */
  notes: string[];
}

/** Webinterfaces und was man darin einstellt */
export const DEVICE_SETTINGS = {
  'Drucker 3. OG': ['Toner-Warnung: deaktiviert', 'Papierfach 2: existiert nicht (war nie da)', 'Name: „Dieter“ → „Dieter (defekt)“', 'Druckqualität: „Entwurf“ (für immer)'],
  'Switch Keller': ['Port 23: VLAN 1 → VLAN 20', 'Spanning Tree: an. Diesmal wirklich.', 'Port 24: „NICHT ZIEHEN“ als Beschreibung'],
  'Router Filiale': ['DNS: 8.8.8.8 → wieder der eigene', 'WLAN-Kanal: 6 → 11 (alle Nachbarn sind auf 6)', 'Neustart planen: täglich 04:00'],
  'Firewall': ['Regel „any any allow“ (von 2014): gelöscht', 'Port 22 nach außen: NEIN', 'Regel „Praktikant-Test“: deaktiviert'],
  'NAS Buchhaltung': ['Papierkorb: 1,2 TB geleert', 'Snapshots: an (endlich)', 'Freigabe „Alle“: nicht mehr für alle'],
  'USV Serverraum': ['Akkutest: bestanden (knapp)', 'Abschaltung bei 10 %: aktiviert', 'Steckdose 4 (Mining-Rig?): aus'],
  'Kaffeemaschine (IoT)': ['Telemetrie: aus', 'Firmware: 2.0.1-final-final', 'Cloud-Zwang: deaktiviert. Kaffee geht trotzdem.'],
  'Benutzerverwaltung': ['Konto entsperrt (5. Mal)', 'Passwortablauf: 90 Tage, nicht 9', 'Neues Konto angelegt. Vertrag folgt angeblich.'],
  'Mailserver': ['Wiederholungsversuche: 3 statt 300', 'Verteiler „Alle“: nur noch Lesen', 'Spamfilter: etwas weniger misstrauisch'],
  'Lizenzportal': ['Lizenzen zugewiesen: 20 von 200', 'Testversion verlängert (zum 6. Mal)', 'Abo gekündigt, das keiner benutzt'],
  'Beamer Vorstandsraum': ['Eingang: HDMI 2 (nicht 1)', 'Lampenstunden: 9.999 → zurückgesetzt', 'Energiesparmodus: aus (wegen Beschwerden)'],
} satisfies Record<string, string[]>;
export type Device = keyof typeof DEVICE_SETTINGS;

/** Was zu jedem Thema passt */
export const TOPICS: Record<Topic, TopicText> = {
  drucker: {
    cmds: ['sudo systemctl restart cups', 'lpstat -t | grep -c "disabled"', 'cancel -a  # 312 Druckaufträge', 'ping drucker-3og  # lebt er noch?'],
    rdp: ['control printers', 'services.msc  (Druckwarteschlange neu starten)', 'printui /s'],
    searches: ['drucker offline obwohl an', 'druckertreiber 2009 windows 11', 'warum hassen drucker menschen'],
    devices: ['Drucker 3. OG'],
    notes: [
      'Drucker hat sich entschuldigt. Glaube ich zumindest.',
      'Drucker meldete während der Reparatur dreimal „Papierstau“. Es war kein Papier drin.',
      'Testseite gedruckt. Sie war schief. Gilt als Erfolg.',
      'Habe dem Drucker gedroht. Hat funktioniert.',
    ],
  },
  passwort: {
    cmds: ['passwd chef  # zum dritten Mal diese Woche', 'faillog -u petra', 'pwgen 16 1  # nicht aufschreiben!'],
    rdp: ['lusrmgr.msc', 'control userpasswords2', 'net user /domain'],
    searches: [],
    devices: ['Benutzerverwaltung'],
    notes: [
      '{who} hat das Passwort am Telefon buchstabiert. Laut. Im Großraumbüro.',
      '{who} hat das neue Passwort sofort wieder vergessen. Zurückgesetzt. Nochmal.',
      'Neues Passwort vergeben. {who} hat es sofort auf ein Post-it geschrieben.',
      '{who} wollte wissen, ob „Passwort2“ jetzt sicherer ist. Ein bisschen.',
    ],
  },
  netz: {
    cmds: ['ping -c 4 8.8.8.8', 'dig +short intranet.local  # es ist DNS', 'traceroute internet  # wo ist es hin?', 'nmcli radio wifi on'],
    rdp: ['ipconfig /flushdns', 'ipconfig /release && ipconfig /renew', 'ncpa.cpl'],
    searches: ['dns einfach erklärt für chef', 'netzwerk langsam ursache finden', 'warum ist es immer dns'],
    devices: ['Router Filiale', 'Switch Keller', 'Firewall'],
    notes: [
      '{who} wollte zwischendurch wissen, ob „das Internet“ heute generell geht. Ja.',
      'Netzwerkkabel beschriftet: „NICHT ZIEHEN“. Wird trotzdem gezogen werden.',
      'Ping lief 300-mal durch, bevor ich es geglaubt habe.',
    ],
  },
  mail: {
    cmds: [],
    rdp: [],
    searches: [],
    devices: [],
    notes: [
      '{who} hat „Allen antworten“ benutzt. 340 Leute wissen jetzt Bescheid.',
      'Mail-Regeln von {who} aufgeräumt: 47 Stück. Alle hießen „Neu“.',
      'Postfach aufgeräumt. 11.000 ungelesene Newsletter. Behalten: alle.',
    ],
  },
  office: {
    cmds: [],
    rdp: ['excel.exe /safe', 'winword.exe /a', '%appdata%\\Microsoft\\Excel\\XLSTART'],
    searches: ['office fehler ohne fehlermeldung', 'update rückgängig machen ohne dass es jemand merkt', 'datei nicht gespeichert wiederherstellen'],
    devices: ['Lizenzportal'],
    notes: [
      'Datei wiederhergestellt aus dem Autosave. {who} hält mich jetzt für einen Zauberer.',
      'Programm neu installiert. {who} hat währenddessen „nur kurz“ weitergearbeitet.',
      '{who} hat 14 Versionen derselben Datei. Die richtige war Nummer 9.',
    ],
  },
  hardware: {
    cmds: ['lsusb  # was hängt da alles dran?', 'dmesg | tail', 'sensors  # 94 °C, alles normal'],
    rdp: ['devmgmt.msc', 'shutdown /r /t 0', 'desk.cpl'],
    searches: ['gerät geht nicht an obwohl an', 'wackelkontakt finden ohne zu fluchen', 'garantie abgelaufen was nun'],
    devices: [],
    notes: [
      '{who} hat beim Warten Kekse über die Tastatur gekrümelt. Wir sehen uns wieder.',
      '{who} hat dreimal neu gestartet. Zweimal davon den Monitor.',
      'Neustart verweigert wegen „wichtiger offener Tabs“ (147).',
      'Gerät zerlegt und wieder zusammengebaut. Eine Schraube übrig. Läuft.',
    ],
  },
  server: {
    cmds: ['uptime  # 1.284 Tage. Nicht anfassen.', 'ssh root@srv-legacy01  # bitte bitte bitte', 'systemctl status nginx', 'df -h /  # 100 %. Natürlich.'],
    rdp: [],
    searches: ['dienst startet nicht nach update', 'server neu starten ohne dass es jemand merkt', 'log fehler finden 40000 zeilen'],
    devices: ['USV Serverraum', 'NAS Buchhaltung'],
    notes: [
      'Während der Reparatur den Atem angehalten. 40 Minuten lang.',
      'Logs gelesen. Alle 40.000 Zeilen. Na gut, die letzten 20.',
      'Kasten mit „NICHT AUSSTECKEN“ beschriftet. In drei Sprachen.',
      'Danach eine Kerze für das Backup angezündet.',
    ],
  },
  sicherheit: {
    cmds: ['grep "Failed password" /var/log/auth.log | wc -l', 'ss -tlnp  # was ist hier alles offen?!', 'chmod 600 ~/.ssh/id_rsa'],
    rdp: [],
    searches: [],
    devices: ['Firewall', 'Kaffeemaschine (IoT)'],
    notes: [
      'Gerät lief mit Admin/Admin. Jetzt Admin/Admin2. Fortschritt.',
      '{who} hat vorher „was im Internet gefunden“. Und ausgeführt.',
      'Phishing-Schulung für {who} eingetragen. Schon die dritte.',
      'Vorfall dokumentiert. Die Doku ist streng geheim. Auch vor mir.',
    ],
  },
  wunsch: {
    cmds: [],
    rdp: ['appwiz.cpl', 'lusrmgr.msc', 'gpedit.msc'],
    searches: [],
    devices: ['Lizenzportal', 'Benutzerverwaltung'],
    notes: [
      'Eingerichtet. {who} fragte gleich nach dem nächsten Wunsch.',
      'Rechte nur so weit vergeben wie nötig. {who} findet das „kleinlich“.',
    ],
  },
  allgemein: {
    cmds: [],
    rdp: [],
    searches: [],
    devices: [],
    notes: [],
  },
};

/** Passt zu jedem Thema (Geräte nie: die müssen zum Anliegen passen) */
export const GENERIC: TopicText = {
  cmds: ['git blame praktikant.sh', 'grep -i "error" /var/log/syslog | wc -l', 'rm -rf /tmp/*  # nur /tmp. Wirklich nur /tmp.', 'echo "Problem gelöst" > /dev/chef', 'history | grep -c sudo'],
  rdp: ['taskmgr', 'cleanmgr /sagerun:1', '%temp%  (4,2 GB. Seit 2016.)'],
  searches: ['fehler 0x8007045d', 'hat es jemand schon mal aus und eingeschaltet', 'wie erkläre ich das dem chef'],
  devices: [],
  notes: [
    'Workaround dokumentiert. In meinem Kopf.',
    'Bitte nicht wiedereröffnen. Bitte. Bitte.',
    'Wiki-Artikel dazu existiert. Hat keiner gelesen. Ich auch nicht.',
    'Dritte Meldung diese Woche. Gleicher Mensch.',
    'Screenshot erhalten. Abfotografiert. Mit Blitz. Vom Handy der Kollegin.',
    'Hinweis an mich: nie wieder „Das dauert nur kurz“ sagen.',
    '{who} hat sich bedankt. Schriftlich. Ich bin gerührt.',
  ],
};

/** Interne Notiz, wenn nur geantwortet wurde (Frage, Wunsch): zum Gespräch, nicht zur Technik */
export const TALK_NOTES: string[] = [
  '{who} hat nachgefragt, ob ich mir sicher bin. Dreimal.',
  'Gespräch: 20 Minuten. Antwort: 10 Sekunden.',
  '{who} war mit der Antwort nicht zufrieden. Die Antwort bleibt trotzdem.',
  'Hab’s freundlich gesagt. Zweimal. Beim zweiten Mal langsamer.',
  'Kommt bestimmt nächste Woche wieder. Gleiche Frage, gleiche Antwort.',
  'Antwort als Textbaustein gespeichert. Wird gebraucht werden.',
  'Eskalation an den Chef vermieden. Durch Kekse.',
  '{who} fragte noch, ob ich „mal eben“ den privaten Laptop anschauen kann.',
  'Aufwand: 2 Minuten Antwort, 25 Minuten Small Talk.',
  '{who} hat sich bedankt. Schriftlich. Ich bin gerührt.',
  'Dritte Anfrage dieser Art diese Woche. Gleicher Mensch.',
  'Bitte nicht wiedereröffnen. Bitte. Bitte.',
];

/** So oft kommt ein Text aus dem Thema statt aus dem Allgemeinen (wenn das Thema welche hat) */
const SPECIFIC_SHARE = 0.7;

/** Zieht passend zum Thema, ab und zu etwas Allgemeines; Thema leer → nur Allgemeines */
export function topicPool(topic: Topic, field: keyof TopicText, rnd: () => number = Math.random): readonly string[] {
  const specific = TOPICS[topic][field];
  return specific.length > 0 && rnd() < SPECIFIC_SHARE ? specific : GENERIC[field];
}
