import type { IncidentId } from '../config';

export interface IncidentText {
  host: string;
  service: string;
  /** Info-Zeile der PROBLEM-Meldung */
  info: string;
  /** Info-Zeile der RECOVERY-Meldung */
  okInfo: string;
  /** Kommentar nach dem Spiel, je nach Leistung */
  good: string[];
  bad: string[];
}

export const INCIDENT_TEXT: Record<IncidentId, IncidentText> = {
  raid: {
    host: 'srv-fs02',
    service: 'RAID',
    info: 'md0 degraded [UUUU_UUUUUUU]',
    okInfo: 'md0 active, resync complete',
    good: [
      'Alle Platten getauscht. Hot-Spare war sogar da. Wer hat den eingebaut? Egal.',
      'Rebuild durch. Die Platten waren alle aus derselben Charge. Das wird nicht der letzte Abend gewesen sein.',
      'Array gerettet. Die alten Platten stehen jetzt als Briefbeschwerer auf dem Schreibtisch. Mahnmal.',
    ],
    bad: [
      'Array verloren. Restore aus dem Backup läuft. Hoffentlich gibt es eins.',
      'RAID ist kein Backup. Das hast du gerade sehr praktisch gelernt.',
      'Die dritte Platte ist beim Rebuild gestorben. Aus Solidarität.',
    ],
  },
  spam: {
    host: 'mx01',
    service: 'MAIL-QUEUE',
    info: 'queue: 4211 messages, deferred: 3982',
    okInfo: 'queue: 3 messages',
    good: [
      'Queue leer. Die Phishing-Mails sind weg, der Kuchen im 3. OG ist angekündigt. Ordnung.',
      'Sauber sortiert. Die Buchhaltung bekommt ihre Mails, der „IT-Support“ von firma-it.support nicht.',
      'Fehlerfrei. Der „CEO“ mit der iPhone-Signatur wartet jetzt vergeblich auf seine 48.000 €.',
    ],
    bad: [
      'Zwei Kollegen haben auf „Gehaltserhöhung“ geklickt. Passwörter werden zurückgesetzt.',
      'Der Kuchen-Hinweis landete im Spam. Das Büro wird dir das nie verzeihen.',
      'Die Rechnung vom Provider liegt im Spam, das Bitcoin-Angebot im Posteingang. Die Buchhaltung ist interessiert.',
    ],
  },
  services: {
    host: 'monitoring',
    service: 'CLUSTER',
    info: '7 services CRITICAL, 2 WARNING',
    okInfo: 'all services OK',
    good: [
      'Ursache gefunden, nur den einen Dienst neu gestartet, alles grün. Wie im Lehrbuch.',
      'Root Cause sauber behoben. Du schreibst sogar ein Postmortem. Vielleicht.',
      'Ein Dienst neu gestartet, acht wieder grün. Das Monitoring ist irritiert.',
    ],
    bad: [
      'Alles neu gestartet, was rot war. Irgendwann war es grün. Warum, weiß keiner.',
      'Die Ursache hat sich am Ende selbst erholt. Du nimmst das trotzdem auf deine Kappe.',
      'Am Ende war alles neu gestartet. Auch Dienste, die gar nicht rot waren. Sicher ist sicher.',
    ],
  },
  loggrep: {
    host: 'app01',
    service: 'ERROR-RATE',
    info: 'error rate 37 % (threshold 5 %)',
    okInfo: 'error rate 0.2 %',
    good: [
      'Ursache im Log gefunden. Du hast sogar den Stacktrace bis zum Ende gelesen. Respekt.',
      'grep -v "known issue" | grep FATAL – und schon war es offensichtlich.',
      'Treffer. Die üblichen ERRORs von 2014 hast du stehen lassen. Die gehören inzwischen zur Familie.',
    ],
    bad: [
      'Im Rauschen untergegangen. Der Kollege hat „tail -f“ gemacht und es sofort gesehen. Sagt er.',
      'Du hast die falsche ERROR-Zeile gefixt. Die war seit 2014 kaputt und hat niemanden gestört.',
      'Das FATAL ist oben rausgescrollt. Du hast es nur noch winken sehen.',
    ],
  },
  network: {
    host: 'admin-pc',
    service: 'PING',
    info: 'packet loss 100 %, rta n/a',
    okInfo: 'packet loss 0 %, rta 0.4 ms',
    good: [
      'Netz wieder da. Systematisch von Layer 1 nach oben. Wie im Lehrbuch. Das Lehrbuch ist von 2003.',
      'Online. Die Queue ist in der Zwischenzeit nicht kürzer geworden. Komisch.',
      'Fehler gefunden, ohne einmal „Hast du es neu gestartet?“ zu sagen. Persönliche Bestleistung.',
    ],
    bad: [
      'Ein Kollege kam vorbei und hat es in 30 Sekunden gefunden. Er erzählt es gerade in der Teeküche.',
      'Nach 20 Minuten Wireshark gefunden. Von unten nach oben wäre schneller gewesen. Du nimmst ein Ticket für dich selbst auf.',
      'Am Ende war es das, was du zuerst ausgeschlossen hattest. Wie immer.',
    ],
  },
  patch: {
    host: 'sw-core01',
    service: 'PORTS',
    info: '12 ports down after Aufräumaktion (Immobilienmanagement)',
    okInfo: 'all access ports up',
    good: [
      'Alles gepatcht. Diesmal sogar beschriftet. Das hält bis zur nächsten Aufräumaktion.',
      'Ports up. Das Immobilienmanagement hat versprochen, nie wieder „Kabel zu ordnen“.',
      'Fehlerfrei gepatcht. Der Schrank sieht aus wie im Katalog. Mach ein Foto, bevor es jemand anfasst.',
    ],
    bad: [
      'Halb gepatcht. Der Drucker im 3. OG ist jetzt im VLAN der Geschäftsführung. Viel Spaß.',
      'Kabelsalat. Ein Kollege hat es mit Kabelbindern „gelöst“. Für immer.',
      'Die Kaffeemaschine hängt jetzt im Buchhaltungs-VLAN. Sie hat Zugriff auf die Gehälter.',
    ],
  },
  diskfull: {
    host: 'fs01',
    service: 'DISK /',
    info: '97 % used, 3 GB free, nohup.out growing',
    okInfo: '68 % used',
    good: [
      'Platz geschaffen, nichts Wichtiges gelöscht. Das Monitoring ist grün. Für etwa drei Wochen.',
      'Aufgeräumt. Den Übeltäter, der die Platte vollschreibt, hast du auch gefunden. Er sitzt zwei Türen weiter.',
      'Wieder Luft auf fs01. Du legst einen Kalendereintrag zum Aufräumen an. Für in drei Wochen. Den verschiebst du dann.',
    ],
    bad: [
      'Platte voll. Die Datenbank schreibt nichts mehr. Die Buchhaltung bucht jetzt auf Papier.',
      'Neue Platte bestellt, Lieferzeit sechs Wochen. Bis dahin speichern alle auf den Desktop.',
      'Zu langsam. Ein Kollege hat „irgendwas Großes“ gelöscht. Was genau, merkt ihr am Monatsende.',
    ],
  },
  certs: {
    host: 'web01',
    service: 'TLS-CERTS',
    info: '5 certificates expire within 90 days, renewal cron disabled',
    okInfo: 'all certificates valid',
    good: [
      'Alles grün, null Warnseiten. Du trägst dir in 60 Tagen einen Termin ein. Und einen Tag später noch einen.',
      'Rechtzeitig erneuert. Den Cronjob dafür gab es übrigens. Er war seit 2022 auskommentiert.',
      'Alle Schlösser zu. Die Hälfte der Domains kanntest du vorher nicht. Jetzt gehören sie dir.',
    ],
    bad: [
      'Mehrere Warnseiten. Die Hotline erklärt jetzt den ganzen Tag, wo „Erweitert“ und „Trotzdem fortfahren“ sind.',
      'Abgelaufen. Der Chef schlägt selbstsignierte Zertifikate vor. Für alles. Für immer.',
      'Ein paar sind abgelaufen. Der Vertrieb hat die Warnseite abfotografiert und als „Sicherheitsfeature“ in die Präsentation gepackt.',
    ],
  },
  ups: {
    host: 'usv-srv',
    service: 'UPS',
    info: 'ON BATTERY, load 100 %, runtime 15 min',
    okInfo: 'all servers shut down cleanly, waiting for mains',
    good: [
      'Alles sauber unten, bevor der Akku leer war. Als der Strom zurückkam, startete alles in der richtigen Reihenfolge. Fast.',
      'Geordnet heruntergefahren. Draußen repariert der Bagger gerade das Kabel, das er vorhin gefunden hat.',
      'Sauber runtergefahren, die USV hat noch Reserve. Die hebst du dir für den nächsten Stromausfall auf.',
    ],
    bad: [
      'Hart ausgegangen. Beim Hochfahren prüft jede Platte erst mal ihr Gewissen. Das dauert.',
      'Falsche Reihenfolge. Die Datenbank war weg, bevor die Anwendungen fertig waren. Die letzte Stunde Bestellungen auch.',
      'Hart aus. Ein Server startet nicht mehr. Er lief seit 2017 durch und hat es sich anders überlegt.',
    ],
  },
  cooling: {
    host: 'glt-ug',
    service: 'TEMP',
    info: 'CRAC 1 failed, zone temperatures drifting',
    okInfo: 'all zones 18–27 °C',
    good: [
      'Alle Racks im grünen Bereich. Der Techniker für Klimagerät 1 kommt morgen. Zwischen 8 und 18 Uhr.',
      'Temperatur gehalten. Du hast jetzt ein Gefühl für Thermodynamik und einen Pullover im Serverraum.',
      'Sauber geregelt. Die Server haben nichts gemerkt. Das ist das höchste Lob, das es gibt.',
    ],
    bad: [
      'Zu warm. Die Server haben sich selbst gedrosselt. Alles läuft, nur halb so schnell. Merkt keiner, sagt der Chef.',
      'Zu kalt geregelt. Auf Rack A hat sich Tau gebildet. Ein Kollege wischt ihn mit seinem Ärmel weg.',
      'Mal zu warm, mal zu kalt. Die Server haben jetzt Schnupfen. Sagt zumindest der Praktikant.',
    ],
  },
  rack: {
    host: 'rz-rack07',
    service: 'INVENTORY',
    info: '6 parcels at loading dock, rack 07: free units fragmented',
    okInfo: 'all devices mounted, cabling (mostly) tidy',
    good: [
      'Alles eingebaut, schwer unten, leicht oben. Das Rack sieht aus wie im Prospekt. Bis morgen jemand ein Kabel braucht.',
      'Eingebaut, und es ist sogar noch eine Höheneinheit frei. Die ist ab morgen voll. Du weißt nur noch nicht, womit.',
      'Fertig. Die Kartons stapeln sich jetzt im Flur. Das Immobilienmanagement hat schon eine Mail geschrieben.',
    ],
    bad: [
      'Halb eingebaut. Der Rest liegt oben auf dem Rack. „Provisorisch“, steht auf einem Zettel.',
      'Das Storage hängt ganz oben. Das Rack wippt, wenn jemand die Tür zumacht.',
      'Nicht alles passte. Die Reste stehen jetzt im Serverraum auf dem Boden, neben dem Zeug, das da seit 2019 steht.',
    ],
  },
  untangle: {
    host: 'vt-eg',
    service: 'LINK',
    info: 'gi0/7 flapping (213 changes), cable path unknown',
    okInfo: 'link stable, cable traced',
    good: [
      'Entwirrt. Das Wackelkabel war sofort zu sehen: geknickt, unter einem Stuhlbein. Seit Monaten.',
      'Alles liegt ordentlich. Ein Kabel führte übrigens nirgendwohin. Es bleibt liegen. Man weiß ja nie.',
      'Entwirrt. Der Kollege, der das Knäuel „organisch gewachsen“ nannte, schaut jetzt ganz kleinlaut.',
    ],
    bad: [
      'Zu viel Salat. Das Wackelkabel wackelt weiter. Der Switch zählt die Link-Wechsel inzwischen fünfstellig.',
      'Halb entwirrt. Der Rest verschwindet wieder unter dem Doppelboden. Aus den Augen, aus dem Ticket.',
      'Noch verknotet. Die Bodenplatte geht nicht mehr zu. Jetzt steht ein Warnhütchen drauf.',
    ],
  },
  tapes: {
    host: 'bk01',
    service: 'RESTORE',
    info: 'job 0815: waiting for media',
    okInfo: 'restore complete, 0 errors, 2 warnings (ignored)',
    good: [
      'Alles zurück. Die Buchhaltung hat nichts gemerkt und fragt trotzdem, warum es so lange gedauert hat.',
      'Zurückgespielt. Der Katalog bekommt jetzt eine Kopie auf einem anderen Server. Steht zumindest im Ticket.',
      'Restore durch. Du klebst einen Zettel an den Bandwechsler: „Funktioniert. Wirklich.“ Datum, Unterschrift.',
    ],
    bad: [
      'Halb zurückgespielt. Bis Dienstag ist alles da, ab Mittwoch tippt die Buchhaltung nach.',
      'Zu viele falsche Bänder. Das Laufwerk will jetzt ein Reinigungsband. Es hat recht.',
      'Restore abgebrochen. Die Sicherung heißt ab heute offiziell „Archiv“. Aus einem Archiv muss man nichts zurückholen.',
    ],
  },
  jam: {
    host: 'prn-3og-dieter',
    service: 'PRINT',
    info: 'paper jam, 47 jobs waiting',
    okInfo: 'ready, queue empty, 1 job printed twice',
    good: [
      'Läuft. Du klebst einen Zettel dran: „Papier vor dem Einlegen auffächern.“ Er hält bis zum Mittag.',
      'Frei. Ursache: 60-g-Papier aus dem Sonderangebot. Der Einkauf ist informiert und zuckt mit den Schultern.',
      'Dieter druckt wieder. Die Schlange vor ihm löst sich auf, ohne dass dir jemand dankt. So soll es sein.',
    ],
    bad: [
      'Noch Fetzen drin. Dieter zieht jetzt über jede Seite einen grauen Streifen. Das Marketing nennt es Designelement.',
      'Stau bleibt. An Dieter hängt jetzt ein Zettel „Außer Betrieb“. Der Zettel ist ausgedruckt. Auf einem anderen Drucker.',
      'Abgebrochen. Das halbe Stockwerk läuft mit USB-Sticks zum Copyshop. Die Warteschlange hat Zeit.',
    ],
  },
  lb: {
    host: 'lb01',
    service: 'HTTP',
    info: 'backend www: 3/4 UP, 503 rising',
    okInfo: 'backend www: 4/4 UP, p99 180 ms',
    good: [
      'Läuft. Die Antwortzeit ist wieder unter einer Sekunde. Niemand hat gemerkt, dass sie je drüber war. Perfekt.',
      'Pool gesund. Im Statusbericht steht „kurzzeitig erhöhte Latenz“. Das stimmt sogar.',
      'Geschafft. Der Vertrieb fragt, ob man die Webseite „etwas schneller“ machen kann. Sie war nie schneller.',
    ],
    bad: [
      'Zu viele 503er. Die Kundschaft hat Fotos von der Fehlerseite gemacht. Das Internet hat jetzt auch welche.',
      'Der Pool hustet weiter. Auf der Startseite steht jetzt „Geplante Wartung“. Geplant seit zehn Minuten.',
      'Abgebrochen. Auf der Fehlerseite steht „Wir sind gleich zurück“. Der Text ist von 2019.',
    ],
  },
};

/** Button-Texte zum Übernehmen eines Incidents (zufällig) */
export const TAKE_LABELS = [
  'Ich fix das.',
  'Hold my coffee.',
  'sudo fix-it',
  'Bin dran. (Bin nicht dran.)',
  'Wer, wenn nicht ich.',
  'Hab ich schon mal gemacht. Glaub ich.',
  'Ich schau mal drüber.',
  'Kurz vor Feierabend? Klar.',
  'Ich hol mal den Feuerlöscher.',
  'Hab gerade eh nichts vor. (Lüge)',
  'Einmal tief durchatmen.',
  'On-Call ist mein zweiter Vorname.',
];

/** Button-Texte zum Abschließen */
export const DONE_LABELS = {
  good: ['Ticket schließen', 'Postmortem? Nö.', 'Zurück zum Kaffee', 'Ich bin ein Held. Weiter.', 'Mic drop'],
  bad: ['Nicht mehr mein Problem', 'Seufz.', 'Kollege macht das schon', 'War bestimmt der Praktikant.', 'Ab in die Lessons Learned'],
};

// --- Spamfilter ---

export interface Mail {
  from: string;
  subject: string;
  preview: string;
  spam: boolean;
}

const m = (from: string, subject: string, preview: string, spam: boolean): Mail => ({ from, subject, preview, spam });

/** Echte Mails kommen meist von @firma.de oder bekannten Dienstleistern; Spam von krummen Domains. */
export const MAILS: Mail[] = [
  m('ceo@firma-de.com', 'Dringend und diskret', 'Bitte überweisen Sie heute noch 48.000 €. Gesendet von meinem iPhone.', true),
  m('it-support@firma.de.secure-login.cc', 'Ihr Passwort läuft ab', 'Klicken Sie hier, um Ihr Passwort zu bestätigen.', true),
  m('hr@gehalt-update.info', 'Ihre Gehaltserhöhung', 'Bitte bestätigen Sie Ihre Zugangsdaten, um die Erhöhung zu erhalten.', true),
  m('noreply@micr0soft-support.ru', 'Ihre Lizenz ist abgelaufen', 'Ihr Windows wird in 24 Stunden gesperrt.', true),
  m('paket@dhl-zustellung.top', 'Ihr Paket wartet', 'Zollgebühr 1,99 € offen. Jetzt bezahlen.', true),
  m('prinz.adebayo@royal-mail.ng', 'Vertrauliches Angebot', 'Ich brauche Ihre Hilfe, 14 Millionen Dollar zu transferieren.', true),
  m('admin@postfach-voll.net', 'Postfach zu 99 % voll', 'Speicher jetzt kostenlos erweitern.', true),
  m('security@paypa1.com', 'Konto eingeschränkt', 'Ungewöhnliche Aktivität festgestellt. Bitte verifizieren.', true),
  m('crypto@moonshot-invest.biz', 'Ihr Bitcoin-Gewinn', 'Sie haben 3,2 BTC verdient. Auszahlung nur heute.', true),
  m('voicemail@firma.de-voice.app', 'Neue Sprachnachricht (0:47)', 'Öffnen Sie den Anhang voicemail.html.', true),
  m('noreply@docu-sign-secure.xyz', 'Dokument zur Unterschrift', 'Vertrag_final_FINAL.pdf.exe wartet auf Sie.', true),
  m('marketing@seo-ranking-1a.de', 'Platz 1 bei Google garantiert', 'Nur heute: SEO-Paket für Ihre Firma.', true),
  m('it-abteilung@firma-it.support', 'Dringende Wartung', 'Bitte installieren Sie das angehängte Update.exe. Ihre IT.', true),
  m('gewinn@lotto-sofort.win', 'Sie haben gewonnen!', 'An einer Verlosung, an der Sie nie teilgenommen haben.', true),
  m('amazon@amaz0n-konto.click', 'Bestellung storniert', 'Ihre Bestellung über 1.299 € wurde storniert. Hier klicken, um sie nicht zu stornieren.', true),
  m('chef.privat@gmail-mail.co', 'Bin im Meeting, kurze Bitte', 'Können Sie 10 Gutscheinkarten kaufen? Ich erkläre es später.', true),

  m('buchhaltung@firma.de', 'WICHTIG!!! Drucker 3. OG', 'Dieter macht wieder dieses Geräusch. Bitte sofort!!!', false),
  m('teamassistenz@firma.de', 'Kuchen in der Teeküche', 'Geburtstag von Petra. Wer zuerst kommt …', false),
  m('chef@firma.de', 'Kurze Frage', 'Hast du mal fünf Minuten? Dauert nicht lang.', false),
  m('vertrieb@firma.de', 'AW: AW: AW: AW: Angebot Müller GmbH', 'Ich hänge das nochmal an, diesmal mit Anhang.', false),
  m('rechnung@telekom.de', 'Ihre Rechnung November', 'Die Rechnung für Ihren Anschluss steht bereit.', false),
  m('alerts@monitoring.firma.de', '** PROBLEM: printer03 is DOWN **', 'Host printer03 is DOWN. (Wie immer.)', false),
  m('personal@firma.de', 'Neuer Kollege ab Montag', 'Bitte Laptop, Account und Telefon vorbereiten. Bis morgen.', false),
  m('immobilienmanagement@firma.de', 'Stromabschaltung Samstag', 'Am Samstag ist von 8 bis 12 Uhr der Strom weg. Betrifft auch den Serverraum.', false),
  m('noreply@github.com', '[firma/infra] Pull request #4711', 'praktikant wants to merge 1 commit into main: "fix"', false),
  m('support@hersteller.de', 'Ihr Ticket #88213', 'Bitte aktualisieren Sie zunächst die Firmware.', false),
  m('datenschutz@firma.de', 'Schulung: Phishing erkennen', 'Pflichttermin am Donnerstag. Ja, auch für die IT.', false),
  m('projektleitung@firma.de', 'Einladung: Retro zur letzten Retro', 'Was lief gut bei der letzten Retro? Agenda folgt.', false),
  m('kantine@firma.de', 'Speiseplan KW 46', 'Montag: Schnitzel. Dienstag: Schnitzel (Rest von Montag).', false),
  m('herr.k@firma.de', 'WG: WG: WG: Lustig!!!', 'Ein Witz aus dem Jahr 2003. Mit Anhang: witz.pps', false),
  m('betriebsrat@firma.de', 'Abstimmung: Name für den neuen Drucker', 'Vorschläge bitte bis Freitag. „Dieter 2“ ist schon vergeben.', false),
  m('controlling@firma.de', 'IT-Kosten Q3', 'Bitte erklären Sie Position 14: „Kaffee (Server)“.', false),
];

// --- Dienste-Dashboard ---

export interface ServiceDef {
  id: string;
  label: string;
  /** Dienste, von denen dieser abhängt */
  deps: string[];
  /** Meldung, wenn der Dienst selbst die Ursache ist */
  rootMsg: string;
  /** Meldung, wenn er wegen einer Abhängigkeit ausfällt */
  symptomMsg: string;
}

export const SERVICES: ServiceDef[] = [
  { id: 'dns', label: 'DNS', deps: [], rootMsg: 'SERVFAIL – query timed out', symptomMsg: 'lookup failed' },
  { id: 'gw', label: 'Gateway', deps: [], rootMsg: '100% packet loss', symptomMsg: 'no route to host' },
  { id: 'nfs', label: 'Storage', deps: [], rootMsg: 'NFS server not responding', symptomMsg: 'stale file handle' },
  { id: 'ldap', label: 'LDAP', deps: ['dns'], rootMsg: "Can't contact LDAP server", symptomMsg: 'bind failed' },
  { id: 'db', label: 'Datenbank', deps: ['nfs'], rootMsg: 'too many connections', symptomMsg: 'I/O error on tablespace' },
  { id: 'app', label: 'App-Server', deps: ['db', 'ldap'], rootMsg: 'OutOfMemoryError', symptomMsg: 'backend unavailable' },
  { id: 'web', label: 'Intranet', deps: ['app'], rootMsg: 'nginx: worker crashed', symptomMsg: 'HTTP 502 Bad Gateway' },
  { id: 'mail', label: 'Mail', deps: ['dns', 'ldap'], rootMsg: 'postfix: queue file write error', symptomMsg: 'relay access denied' },
  { id: 'vpn', label: 'VPN', deps: ['gw', 'ldap'], rootMsg: 'tunnel down', symptomMsg: 'auth timeout' },
];

/** Mögliche Ursachen mit Gewicht – es ist erstaunlich oft DNS. */
export const ROOT_CAUSES: { id: string; weight: number }[] = [
  { id: 'dns', weight: 4 },
  { id: 'nfs', weight: 2 },
  { id: 'gw', weight: 2 },
  { id: 'ldap', weight: 2 },
  { id: 'db', weight: 1 },
  { id: 'app', weight: 1 },
];

/** Warnungen ohne Zusammenhang (Störer) */
export const NOISE_WARNINGS = ['disk 87 %', 'cert expires in 12 days', 'load 4.2', 'swap 61 %', 'NTP offset 0.8 s', 'fan 2 sounds sad', 'uptime 1284 d (do not touch)'];

// --- Log-Grep ---

/** Normales Rauschen und bekannte Fehler, die man ignorieren soll */
export const LOG_DECOYS = [
  'INFO  ticket-api: GET /health 200 (2 ms)',
  'INFO  cron: job cleanup finished (0 files)',
  'WARN  disk /boot 91 % (seit 2019)',
  'ERROR printer03: paper jam (known issue #12)',
  'ERROR deprecated config option "use_legacy" (seit 2014)',
  'INFO  sshd: session opened for user praktikant',
  'WARN  slow query 2.1 s (wie immer)',
  'ERROR ACPI: [\\_SB_.PCI0] namespace lookup failure (harmless)',
  'INFO  ldap: bind ok for svc-helpdesk',
  'ERROR mail: greylisted by gmx.de (known issue #88)',
  'WARN  certificate expires in 29 days',
  'INFO  nginx: 304 Not Modified /favicon.ico',
  'ERROR java: NullPointerException in LegacyReport (ignored since 2014)',
  'INFO  backup: skipped (we believe in it)',
  'WARN  printer03: toner low (since 2021)',
  'INFO  coffee-api: POST /brew 418 I\'m a teapot',
  'ERROR sso: user "chef" forgot password (known issue #1)',
  'INFO  cron: reboot_if_monday.sh – not monday, skipped',
  'WARN  disk /var/log 89 % (log about full log)',
];

/** Echte neue Fehler – die muss man erwischen */
export const LOG_TARGETS = [
  'FATAL ticket-api: connection pool exhausted (db01:5432)',
  'CRIT  kernel: EXT4-fs error on /var – remounted read-only',
  'FATAL app: OutOfMemoryError – Java heap space',
  'CRIT  db01: too many connections (max 100)',
  'FATAL ticket-api: Segmentation fault (core dumped)',
  'CRIT  nfs: server fs02 not responding, still trying',
  'FATAL auth: LDAP bind failed – invalid credentials (svc-helpdesk)',
  'CRIT  disk: /dev/sdb – I/O error, sector 4711',
  'FATAL queue: ticket-worker died – no workers left',
];

// --- Netzwerkausfall ---

export interface NetStep {
  id: string;
  label: string;
  /** Terminal-Ausgabe, wenn der Schritt dran war */
  output: string;
  /** Ausgabe zeigt einen Befund (Fehler gefunden), kein Erfolg */
  finding?: boolean;
}

export interface NetScenario {
  id: string;
  /** Terminal-Ausgabe zu Beginn, passend zur Ursache */
  intro: [string, string];
  steps: NetStep[];
}

const step = (id: string, label: string, output: string, finding = false): NetStep => ({ id, label, output, finding });

/** Mögliche Ursachen, jeweils die richtige Reihenfolge von unten nach oben */
export const NET_SCENARIOS: NetScenario[] = [
  {
    id: 'cable',
    intro: ['admin-pc:~$ ping 10.0.0.1', 'connect: Network is unreachable'],
    steps: [
      step('cable', 'Kabel prüfen', 'Kabel hängt lose raus. Spuren vom Staubsauger.', true),
      step('plug', 'Kabel einstecken', '*klick*'),
      step('led', 'Link-LED prüfen', 'Link up, 1000 Mbit/s full duplex'),
      step('gw', 'Gateway anpingen', '64 bytes from 10.0.0.1: time=0.4 ms'),
    ],
  },
  {
    id: 'dhcp',
    intro: ['admin-pc:~$ ping 10.0.0.1', 'connect: Network is unreachable'],
    steps: [
      step('cable', 'Kabel prüfen', 'Kabel steckt.'),
      step('led', 'Link-LED prüfen', 'Link up.'),
      step('ip', 'IP-Adresse prüfen', 'inet 169.254.13.37 – das ist APIPA. Kein DHCP.', true),
      step('dhcp', 'DHCP erneuern', 'DHCPACK: 10.0.0.42/24, gw 10.0.0.1'),
      step('gw', 'Gateway anpingen', '64 bytes from 10.0.0.1: time=0.5 ms'),
    ],
  },
  {
    id: 'dns',
    intro: ['admin-pc:~$ ping intranet.firma.de', 'ping: intranet.firma.de: Temporary failure in name resolution'],
    steps: [
      step('cable', 'Kabel prüfen', 'Kabel steckt.'),
      step('led', 'Link-LED prüfen', 'Link up.'),
      step('ip', 'IP-Adresse prüfen', 'inet 10.0.0.42/24 – passt.'),
      step('gw', 'Gateway anpingen', '64 bytes from 10.0.0.1: time=0.4 ms'),
      step('dns', 'DNS testen (nslookup)', ';; connection timed out; no servers could be reached', true),
      step('dnsfix', 'DNS-Server eintragen', 'nameserver 10.0.0.53 – Auflösung klappt. Wer hat den alten eingetragen?'),
    ],
  },
];

/** Buttons, die nie helfen */
export const NET_DISTRACTORS: { id: string; label: string; reply: string }[] = [
  { id: 'reboot', label: 'Rechner neu starten', reply: 'Neustart. 4 Minuten Updates. Immer noch offline.' },
  { id: 'escalate', label: 'Ticket ans Netzwerkteam', reply: 'Das Netzwerkteam bist du.' },
  { id: 'yell', label: 'Router anschreien', reply: 'Hat gutgetan. Hilft aber nicht.' },
  { id: 'wifi', label: 'Ins Gäste-WLAN', reply: 'Gäste-WLAN-Passwort steht am Empfang. Der Empfang ist nicht erreichbar.' },
  { id: 'duck', label: 'Gummiente fragen', reply: 'Die Ente sagt: „Fang unten an.“ Die Ente hat recht.' },
  { id: 'forum', label: 'Im Forum fragen', reply: 'Du bist offline. Das Forum auch. Für dich.' },
  { id: 'firmware', label: 'Firmware updaten', reply: 'Das Update braucht Internet. Haha.' },
];

// --- Patchkabel ---

/** Abteilungen: Dose (links) zeigt den Namen, der Switch-Port (rechts) nur das VLAN-Kürzel */
export const PATCH_DEPARTMENTS: { name: string; vlan: string }[] = [
  { name: 'Buchhaltung', vlan: 'BUHA' },
  { name: 'Vertrieb', vlan: 'SALES' },
  { name: 'Marketing', vlan: 'MKTG' },
  { name: 'Personal', vlan: 'HR' },
  { name: 'Empfang', vlan: 'EMPF' },
  { name: 'Chefetage', vlan: 'GF' },
  { name: 'Drucker 3. OG', vlan: 'PRINT' },
  { name: 'Kaffeemaschine', vlan: 'IOT-KAFFEE' },
];


// --- Platte voll ---

export type DiskKind = 'video' | 'archive' | 'db' | 'mail' | 'iso' | 'log' | 'sys' | 'vm' | 'table' | 'home';

export interface DiskEntry {
  name: string;
  path: string;
  gb: number;
  kind: DiskKind;
  /** was in der Detailzeile steht */
  desc: string;
  /** nur bei Wichtigem: was passiert, wenn man es löschen will (Strg+C gerade noch rechtzeitig) */
  nearMiss?: string;
}

const junk = (name: string, path: string, gb: number, kind: DiskKind, desc: string): DiskEntry => ({ name, path, gb, kind, desc });
const keep = (name: string, path: string, gb: number, kind: DiskKind, desc: string, nearMiss: string): DiskEntry => ({ name, path, gb, kind, desc, nearMiss });

/** Kann weg. Namen sind ehrlich (bei 25 Sekunden keine Fallen), die Farbe verrät aber nichts. */
export const DISK_JUNK: DiskEntry[] = [
  junk('core.48213', '/var/crash/core.48213', 9, 'archive', 'Speicherabbild vom Absturz letzten Dienstag. Analysiert hat es niemand. Wird auch niemand.'),
  junk('ubuntu-16.04.iso', '/home/praktikant/Downloads/', 5, 'iso', 'Dasselbe ISO, dreimal heruntergeladen. Für alle Fälle.'),
  junk('Sommerfest_4K.mov', '/srv/share/Alle/Sommerfest_4K.mov', 11, 'video', '47 Minuten Rede vom Chef. In 4K. Der Ton fehlt, das ist das Beste daran.'),
  junk('apt-Cache', '/var/cache/apt/archives/', 4, 'archive', 'Installationspakete von 2019. Längst installiert, trotzdem aufgehoben.'),
  junk('backup_vor_update.tar', '/root/backup_vor_update.tar', 13, 'archive', 'Backup von 2017. Liegt auf derselben Platte wie das Original. Hilft also genau nie.'),
  junk('export_alles.csv', '/tmp/export_alles.csv', 7, 'table', 'Jemand wollte die ganze Datenbank in Excel öffnen. Excel wollte nicht.'),
  junk('Testserver_ALT.vmdk', '/srv/vm/Testserver_ALT.vmdk', 10, 'vm', 'Test-VM vom Vorgänger. Das Passwort kennt keiner. Gestartet hat sie seit Jahren niemand.'),
  junk('syslog.*.gz', '/var/log/syslog.2.gz … syslog.2847.gz', 6, 'log', 'Rotiert wird fleißig. Gelöscht wurde nie.'),
  junk('dump_altsystem.sql.gz', '/var/backups/dump_altsystem.sql.gz', 8, 'db', 'Dump der alten Datenbank. Das System wurde 2017 abgeschaltet, die Daten sind längst umgezogen.'),
  junk('Webinare/', '/srv/share/Alle/Webinare/', 12, 'video', 'Aufzeichnungen aller Webinare seit 2020. Angeschaut: nie. Nicht mal von den Vortragenden.'),
  junk('Spiele/', '/home/azubi/Spiele/', 9, 'home', 'Komplette Spielesammlung vom Azubi. Auf dem Fileserver. Er wird Fragen beantworten müssen.'),
  junk('render_tmp/', '/tmp/render_tmp/', 6, 'video', 'Zwischenstände vom Imagefilm. Der Film ist seit einem Jahr fertig.'),
  junk('Druckertreiber/', '/srv/share/IT/Druckertreiber/', 5, 'archive', 'Treiber für Drucker, die seit 2019 auf dem Wertstoffhof stehen.'),
  junk('LÖSCHEN_AB_2002/', '/srv/share/Alle/LÖSCHEN_AB_2002/', 7, 'home', 'Steht seit 2001 so drauf. Es ist jetzt so weit. Schon seit einer Weile.'),
  junk('ALT_TEST.zip', '/home/entwicklung/ALT_TEST.zip', 5, 'archive', 'Ein alter Test, gepackt. Was getestet wurde, weiß keiner mehr. Ergebnis: alt.'),
  junk('kann_weg/', '/srv/share/IT/kann_weg/', 6, 'home', 'Angelegt 2015, damit endlich etwas weggeht. Es ging nichts weg. Bis heute.'),
  junk('Copy of Copy of müll.zip', '/srv/share/Alle/Copy of Copy of müll.zip', 6, 'archive', 'Hieß schon im Original „müll“. Wurde trotzdem zweimal kopiert. Sicher ist sicher.'),
  junk('asdf/', '/root/asdf/', 4, 'home', 'Ordner „asdf“. Darin: „qwer“. Darin: „jklö“. Darin: 4 GB Testdaten von irgendwem.'),
  junk('neu2_alt/', '/srv/share/IT/neu2_alt/', 5, 'archive', 'Liegt neben neu/, neu2/ und alt_neu/. Die anderen sind leer, der hier leider nicht. Gebraucht wird keiner.'),
  junk('Bilanz_2009_Kopie.xlsx', '/home/chef/Desktop/Kopie von Kopie/', 5, 'table', 'Die 14. Kopie derselben Bilanz. Das Original liegt sicher in der Buchhaltung.'),
];

/** Bleibt. Löschen wollen kostet Zeit. */
export const DISK_KEEP: DiskEntry[] = [
  keep('postgresql', '/var/lib/postgresql/', 20, 'db', 'Produktivdatenbank. Alles, was die Firma weiß.', 'Strg+C gerade noch rechtzeitig. Die Datenbank lebt. Dein Puls liegt bei 180.'),
  keep('mysql', '/var/lib/mysql/', 16, 'db', 'Warenwirtschaft: Lager, Lieferanten, offene Bestellungen.', 'Abgebrochen. Das Lager hätte ab morgen nach Gefühl bestellt.'),
  keep('mail', '/srv/mail/', 14, 'mail', 'Alle Postfächer. Auch das vom Chef, mit 40.000 ungelesenen Mails.', 'Abgebrochen. 300 Leute hätten ab morgen keine Mails mehr gehabt. Manche hätten sich gefreut.'),
  keep('Buchhaltung', '/srv/share/Buchhaltung/', 8, 'table', 'Jahresabschlüsse der letzten zehn Jahre. Das Finanzamt fragt danach.', 'Abgebrochen. Die nächste Betriebsprüfung wäre sonst sehr kurz geworden. Für dich.'),
  keep('usr', '/usr/', 6, 'sys', 'Das Betriebssystem. Ohne das läuft auch rm nicht mehr.', 'rm hätte sich selbst gelöscht. Mitten im Satz. Gerade noch abgebrochen.'),
  keep('ticketdb', '/var/lib/ticketdb/', 9, 'db', 'Das Ticketsystem. Alle offenen Tickets, auch deine.', 'Abgebrochen. Kurz war der Gedanke verlockend.'),
  keep('kunden/', '/srv/share/kunden/', 11, 'table', 'Kundenstamm: Adressen, Verträge, Ansprechpartner.', 'Abgebrochen. Der Vertrieb hätte ab morgen raten müssen, wer seine Kunden sind.'),
  keep('webshop/', '/srv/www/webshop/', 7, 'home', 'Der Webshop. Läuft, verkauft, bitte nicht anfassen.', 'Abgebrochen. Der Shop hätte ab sofort nichts mehr verkauft. Nicht mal das Sonderangebot.'),
  keep('Personal/', '/srv/share/Personal/', 5, 'table', 'Personalakten: Verträge, Zeugnisse, Gehälter.', 'Abgebrochen. Die Personalabteilung hätte dich als Erstes gefunden.'),
  keep('git/', '/srv/git/', 9, 'archive', 'Alle Git-Repositories. Der Code der Firma mit zwölf Jahren Historie.', 'Abgebrochen. Die Entwicklung hätte gesagt, sie hat ja Klone. Hat sie nicht.'),
  keep('lizenzen/', '/opt/lizenzen/', 4, 'archive', 'Lizenzdateien der CAD-Software. Neu kaufen kostet 40.000 €.', 'Abgebrochen. Die Konstruktion hätte ab morgen wieder mit Lineal gearbeitet.'),
];

export interface DiskGrower extends DiskEntry {
  /** nach dem Löschen: die Datei kommt wieder */
  again: string;
}

/** Wächst während des Spiels; löschen gibt Platz, dann fängt die Datei von vorn an. Eine pro Runde. */
export const DISK_GROWERS: DiskGrower[] = [
  {
    name: 'nohup.out',
    path: '/home/praktikant/nohup.out',
    gb: 0,
    kind: 'log',
    desc: 'Ausgabe vom Skript des Praktikanten. Läuft seit Freitag und schreibt jede Millisekunde „läuft noch“.',
    again: 'Gelöscht. Das Skript legt einfach eine neue an. Es läuft noch.',
  },
  {
    name: 'kueche.mjpg',
    path: '/srv/cam/kueche.mjpg',
    gb: 0,
    kind: 'video',
    desc: 'Die Testkamera in der Kaffeeküche nimmt seit der Probeinstallation alles auf. Es passiert nie etwas.',
    again: 'Gelöscht. Die Kamera nimmt weiter auf. Gerade holt jemand Milch.',
  },
  {
    name: 'deferred/',
    path: '/var/spool/postfix/deferred/',
    gb: 0,
    kind: 'mail',
    desc: 'Zwei Abwesenheitsnotizen antworten sich gegenseitig. Seit Montag. Die Queue wächst mit jeder Antwort.',
    again: 'Queue geleert. Die beiden Notizen haben sofort wieder angefangen. Sie haben sich viel zu sagen.',
  },
];

// --- Zertifikate ---

export interface CertDomain {
  host: string;
  /** was dahinter läuft (kleine Zeile unter dem Namen) */
  what: string;
  /** was passiert, wenn es abläuft */
  expired: string;
}

const cd = (host: string, what: string, expired: string): CertDomain => ({ host, what, expired });

/** Von Anfang an im Monitoring */
export const CERT_DOMAINS: CertDomain[] = [
  cd('shop.firma.de', 'Webshop', 'Kunden sehen eine Warnseite. Drei klicken trotzdem auf „Weiter“. Der Rest kauft woanders.'),
  cd('mail.firma.de', 'Webmail', 'Outlook fragt jetzt jeden Morgen, ob man dem Server vertraut. Alle klicken „Ja“. Für immer.'),
  cd('vpn.firma.de', 'VPN', 'Der Außendienst kommt nicht mehr rein. Er meldet sich auffällig nicht.'),
  cd('api.firma.de', 'Schnittstelle der App', 'Die App zeigt nur noch „Fehler -1“. Die Bewertungen im Store auch.'),
  cd('wiki.firma.de', 'Wiki', 'Das Wiki ist weg. Gemerkt hat es nach einer Stunde jemand, der etwas eintragen wollte. Der Erste seit Monaten.'),
  cd('sso.firma.de', 'Anmeldung für alles', 'Niemand kann sich mehr anmelden. Nirgends. Die Kaffeemaschine geht noch.'),
  cd('tickets.firma.de', 'Ticketsystem', 'Das Ticketsystem ist zu. Die Tickets kommen jetzt per Telefon. Alle gleichzeitig.'),
  cd('status.firma.de', 'Statusseite', 'Die Statusseite meldet ihren eigenen Ausfall nicht. Sie ist ja ausgefallen.'),
];

/** Tauchen mitten im Spiel auf: keiner wusste, dass es sie gibt */
export const CERT_SURPRISES: CertDomain[] = [
  cd('gewinnspiel2019.firma.de', 'Gewinnspiel von 2019, läuft noch', 'Das Gewinnspiel ist weg. Beschwert hat sich genau einer. Er hatte gewonnen.'),
  cd('drucker3og.firma.de', 'Drucker mit eigener Webseite', 'Der Drucker zeigt eine Zertifikatswarnung an. Er druckt sie auch aus.'),
  cd('blog-chef.firma.de', 'Blog vom Chef, ein Artikel (2020)', 'Der Chef hat die Warnung sofort bemerkt. Er liest seinen Blog täglich.'),
  cd('shop-alt.firma.de', 'Alter Shop, „wird 2021 abgeschaltet“', 'Der alte Shop ist weg. Wie geplant, nur drei Jahre später und aus Versehen.'),
];

// --- USV / Stromausfall ---

export interface UpsServer {
  name: string;
  role: string;
  /** diese Server müssen laufen, solange dieser läuft */
  needs: string[];
}

const srv = (name: string, role: string, needs: string[]): UpsServer => ({ name, role, needs });

/** Anwendungen: davon kommen einige pro Runde */
export const UPS_FRONT: UpsServer[] = [
  srv('web01', 'Webshop', ['db01', 'nas01']),
  srv('app01', 'Warenwirtschaft', ['db01', 'ldap01']),
  srv('mail01', 'Mail', ['ldap01', 'nas01']),
  srv('wiki01', 'Wiki', ['db01']),
  srv('print01', 'Druckserver', ['ldap01']),
  srv('ci01', 'Buildserver', ['nas01']),
  srv('crm01', 'CRM', ['db01', 'ldap01']),
];

/** Immer dabei: darauf bauen die anderen auf */
export const UPS_CORE: UpsServer[] = [srv('db01', 'Datenbank', ['nas01']), srv('ldap01', 'Anmeldung', []), srv('nas01', 'Speicher (NFS)', [])];

/** Was nach einem Absturz noch passiert (zufällig) */
export const UPS_CRASH_AFTER = [
  'Beim nächsten Start: Dateisystemprüfung, 40 Minuten.',
  'Die letzten zehn Minuten Daten sind weg.',
  'Das Journal wird beim Start erst mal komplett nachgelesen.',
  'Die Logdatei endet mitten im Satz.',
];

// --- Serverraum-Klima ---

export interface CoolEvent {
  /** {rack} wird durch den Namen ersetzt; ohne {rack} betrifft es alle Zonen */
  text: string;
  /** Änderung der Abwärme */
  delta: number;
}

const ce = (text: string, delta: number): CoolEvent => ({ text, delta });

export const COOL_EVENTS: CoolEvent[] = [
  ce('Backup startet auf {rack}. Die Platten werden warm.', 0.3),
  ce('Der Buildserver in {rack} baut den Monolithen. Komplett.', 0.35),
  ce('{rack}: Jemand hat den Benchmark „nur kurz“ angeworfen.', 0.3),
  ce('{rack}: Der Datenbank-Index wird neu aufgebaut. Alle Kerne glühen.', 0.3),
  ce('Ein Server in {rack} hat sich schlafen gelegt. Weniger Abwärme.', -0.3),
  ce('{rack}: Das Backup ist fertig. Die Platten kühlen ab.', -0.3),
  ce('Jemand hat in {rack} einen Ventilator von zu Hause hingestellt. Er hilft sogar.', -0.25),
  ce('Die Tür zum Serverraum steht offen. Draußen sind 31 °C.', 0.2),
  ce('Die Sonne steht jetzt auf dem Fenster vom Serverraum. Ja, er hat eins.', 0.15),
  ce('Ein Gewitter zieht auf, es wird kühler. Endlich spielt das Wetter mal mit.', -0.15),
];

// --- Hardware einbauen (Rack) ---

export interface RackDevice {
  name: string;
  /** was es ist (kleine Zeile) */
  what: string;
  he: number;
  kg: number;
  heavy?: boolean;
  /** wie die Front aussieht (angedeutet) */
  look: RackLook;
}

export type RackLook = 'switch' | 'patch' | 'ups' | 'server' | 'storage' | 'gpu' | 'firewall' | 'tape' | 'kvm' | 'cable' | 'blank' | 'mystery';

const dev = (name: string, what: string, he: number, kg: number, look: RackLook, heavy = false): RackDevice => ({ name, what, he, kg, heavy, look });

/** Lieferung: davon kommt pro Runde ein schweres und mehrere andere */
export const RACK_NEW: RackDevice[] = [
  dev('sw-acc05', 'Switch', 1, 4, 'switch'),
  dev('fw02', 'Firewall', 1, 6, 'firewall'),
  dev('srv-app03', 'Server', 2, 24, 'server'),
  dev('srv-db02', 'Datenbankserver', 2, 27, 'server'),
  dev('srv-mail02', 'Mailserver', 2, 22, 'server'),
  dev('tape01', 'Bandlaufwerk', 3, 21, 'tape'),
  dev('nas02', 'Storage', 4, 41, 'storage', true),
  dev('gpu01', 'GPU-Server für „KI“', 4, 38, 'gpu', true),
];

/** Steht schon im Rack */
export const RACK_OLD: RackDevice[] = [
  dev('Patchfeld', '24 Ports, 3 beschriftet', 1, 2, 'patch'),
  dev('sw-core01', 'Core-Switch', 1, 7, 'switch'),
  dev('Kabelbügel', 'theoretisch', 1, 1, 'cable'),
  dev('srv-web01', 'Webserver', 2, 23, 'server'),
  dev('???', 'läuft seit 2014, keiner weiß wofür', 2, 25, 'mystery'),
  dev('KVM', 'Monitor-Schublade zum Ausklappen', 1, 12, 'kvm'),
];

/** Füllt Rest-Höheneinheiten (eine Blende, kein Gerät) */
export const RACK_BLANK: RackDevice = dev('Blindblende', 'hält die kalte Luft drin', 1, 0, 'blank');

export const RACK_UPS: RackDevice = dev('usv01', 'USV', 2, 30, 'ups');

/** Hat keine Rackschienen: muss in die Retoure */
export const RACK_ODD: { name: string; what: string; desc: string }[] = [
  { name: 'Tower-Server', what: 'mit Rollen', desc: 'Ohne Rackschienen. „Passt schon irgendwie“, sagt der Einkauf.' },
  { name: 'Desktop-NAS', what: 'Weihnachtsangebot', desc: 'Aus dem Elektromarkt. Vier Platten, ein Lüfter, kein Rack.' },
  { name: 'Mini-PC', what: 'mit Klettband', desc: 'Der Vertrieb will ihn „ins Rechenzentrum“. Er hat eine Halterung für die Monitorrückseite.' },
];

// --- Kabelsalat ---

export interface TangleDevice {
  name: string;
  /** Aussehen der Front */
  look: 'switch' | 'router' | 'firewall' | 'server' | 'nas' | 'ap' | 'printer' | 'phone' | 'cam' | 'clock' | 'media' | 'box';
  /** steht unten, sobald man das Gerät anfasst */
  desc: string;
}

const td = (name: string, look: TangleDevice['look'], desc: string): TangleDevice => ({ name, look, desc });

/** Restore-Aufträge fürs Bandspiel: Ordner und was ihm passiert ist */
export const TAPE_JOBS: { path: string; why: string }[] = [
  { path: '\\\\fs01\\Buchhaltung', why: 'Der Sync-Client hat „Ordner leeren“ sehr ernst genommen.' },
  { path: '\\\\fs01\\Personal', why: 'Jemand hat aufgeräumt. Mit Shift+Entf.' },
  { path: '\\\\fs01\\Vertrieb\\Angebote', why: 'Ein Makro aus „Mahnung_dringend.docm“ hat alles verschlüsselt.' },
  { path: '\\\\fs01\\Projekte\\2024', why: 'In einen Ordner namens „Papierkorb (alt)“ gezogen. Der wird nachts geleert.' },
  { path: '\\\\fs01\\Marketing\\Logo', why: 'Mit dem Stand vom letzten Jahr überschrieben. Alle 600 Dateien.' },
  { path: '\\\\fs01\\Einkauf', why: 'Ein Skript sollte alte Dateien löschen. „Alt“ war als „vor morgen“ definiert.' },
];

/** Druckaufträge, an denen Dieter hängen bleibt (einer je Runde) */
export const PRINT_JOBS: { file: string; who: string; pages: number; note: string }[] = [
  { file: 'Lebenslauf_NEU_2026.docx', who: 'Vertrieb', pages: 3, note: 'Muss raus, bevor der Chef am Drucker vorbeikommt.' },
  { file: 'Umsatz_Q3.xlsx', who: 'Controlling', pages: 912, note: 'Kein Druckbereich gesetzt: jede Zelle bekommt ihre eigene Seite.' },
  { file: 'Handbuch_LaserJam_404.pdf', who: 'Du', pages: 188, note: 'Um nachzulesen, wie man einen Papierstau behebt.' },
  { file: 'Dienstplan_Dezember.xlsx', who: 'Lager', pages: 2, note: 'In Schriftgröße 6, damit alles auf zwei Seiten passt. Eine Lupe liegt bei.' },
  { file: 'Konzertkarten.pdf', who: 'Azubi', pages: 2, note: 'Privat, in Farbe. „Der Drucker ist doch eh da.“' },
  { file: 'Präsentation_Kunde.pptx', who: 'Marketing', pages: 1, note: 'Eine Folie mit 34 Animationen. Auf Papier sieht man keine davon.' },
];

/** Werkzeugleiste der Quarantäne im Mail-Gateway (Spamhausmeister) */
export const MAIL_TOOLS = ['Freigeben', 'Löschen', 'Blocken', 'Whitelist'];

/** Störungen am Lastverteiler: {srv} = betroffener Server */
export const LB_EVENTS = {
  /** abgestürzt: jede Anfrage dorthin endet als 502 */
  crash: [
    '{srv}: OOM-Killer hat sich ausgerechnet den Webserver ausgesucht',
    '{srv}: Deploy halb durch. Die andere Hälfte kommt nach der Mittagspause.',
    '{srv}: unattended-upgrades hat neu gestartet. Unbeaufsichtigt, wie versprochen.',
    '{srv}: Port 80 belegt. Ein Kollege testet dort „nur ganz kurz“ etwas.',
    '{srv}: Zertifikat neu, Konfiguration alt. Webserver startet nicht.',
    '{srv}: Jemand hat in Prod ein Hotfix-Skript ausprobiert. Es hat gefixt. Den Server.',
  ],
  /** langsam: Warteschlange läuft voll, dann 503 */
  slow: [
    '{srv}: Antwortzeit 8 s. Das Backup läuft auf derselben Platte.',
    '{srv}: Garbage Collection. Seit vier Sekunden. Und es hört nicht auf.',
    '{srv}: Log-Level steht noch auf DEBUG. 2 GB pro Minute, jede Zeile wichtig.',
    '{srv}: Cron-Job von 2017 berechnet wieder Statistiken, die niemand liest.',
    '{srv}: Virenscanner prüft das komplette Webverzeichnis. Gründlich. Datei für Datei.',
    '{srv}: Datenbankabfrage ohne Index. Sie liest gerade alle Kunden seit 1998.',
  ],
  /** Lastspitze: alle gesunden Server werden gebraucht */
  spike: [
    'Lastspitze: Gutscheincode „SORRY10“ für den Ausfall letzter Woche ist raus.',
    'Lastspitze: Die Firma war im Lokalradio. Kurz, aber laut.',
    'Lastspitze: Ein Suchmaschinen-Bot hat die Sitemap gefunden. Er will alles. Sofort.',
    'Lastspitze: Der Chef hat den Link in den Firmenchat gestellt. 400 Leute drücken F5.',
    'Lastspitze: Gewinnspiel gestartet. Teilnahme nur heute, also alle in dieser Minute.',
  ],
  /** draußen wieder gesund geworden */
  healed: '{srv}: wieder gesund. Zurück in den Pool damit.',
};

/** Feste Zeilen im Spiel: Start und Antippen eines Servers, der sich draußen noch erholt */
export const LB_TEXT = {
  start: 'Ein Server steht noch auf Wartung. Antippen holt ihn in den Pool.',
  lockedDown: '{srv} startet noch neu. Erst danach darf er wieder rein.',
  lockedSlow: '{srv} erholt sich noch. Erst danach darf er wieder rein.',
};

/** Geräte im Verteiler; jede Runde liegen andere im Salat */
export const TANGLE_DEVICES: TangleDevice[] = [
  td('Switch', 'switch', 'Alle Wege führen hierher. Leider auch alle Kabel.'),
  td('Router', 'router', 'Hier kommt das Internet rein. Von wo, weiß nur der Anbieter.'),
  td('Firewall', 'firewall', 'Blinkt rot, seit sie eingebaut ist. Laut Handbuch heißt das „alles in Ordnung“.'),
  td('NAS', 'nas', 'Heißt im Netz „NAS-alt“, auf dem Aufkleber „NAS-neu“ und im Team „das Ding“.'),
  td('WLAN-AP', 'ap', 'Hing mal an der Wand. Jetzt liegt er hier. Der Empfang im Flur ist seitdem „anders“.'),
  td('Drucker', 'printer', '2. OG. Wacht nachts um drei auf und druckt eine leere Seite. Seit Jahren.'),
  td('TK-Anlage', 'phone', 'Klingelt intern, sobald jemand ihr Kabel anfasst. Aus Prinzip.'),
  td('Kamera', 'cam', 'Hofeinfahrt. Filmt seit 2016 dieselbe Mülltonne. In HD.'),
  td('Stempel\u00aduhr', 'clock', 'Wenn die ausfällt, beschwert sich niemand. Außer der Personalabteilung.'),
  td('Kiste ???', 'box', 'Grauer Kasten, ein grünes Lämpchen, kein Typenschild. Steht in keiner Inventarliste. Läuft.'),
  td('Konverter', 'media', 'Medienkonverter. Macht aus Glasfaser Kupfer. Klein, warm, und es gibt genau einen.'),
  td('srv-neu', 'server', 'Heißt „neu“, weil er den alten ersetzt hat. Der alte läuft auch noch. Irgendwo.'),
];

// --- Alarm-Details und Runbooks (Wiki „Konfusion“) ---

export interface IncidentBrief {
  /** zusätzliche Zeilen der Alarmmeldung (Plugin-Ausgabe, englisch/gemischt wie echte Checks) */
  detail: string[];
  /** Wiki-Seite vor dem Spiel: in Ruhe lesen, dann Countdown */
  runbook: {
    title: string;
    steps: string[];
    /** Kasten „Achtung“ */
    warn: string;
    /** Kommentar unter der Seite */
    note: { who: string; text: string };
  };
}

export const INCIDENT_BRIEF: Record<IncidentId, IncidentBrief> = {
  raid: {
    detail: ['md0: sdk faulty, sdf SMART: 1832 reallocated sectors', 'hot spare: none (Ticket „Spare bestellen“ offen seit 2021)'],
    runbook: {
      title: 'Defekte Platten tauschen',
      steps: [
        'Rote Platte = defekt. Antippen, dann wird sie getauscht.',
        'Eine getauschte Platte baut sich erst neu auf und ist danach wieder grün.',
        'Es fallen immer wieder neue aus. Dranbleiben, bis die Zeit um ist.',
      ],
      warn: 'Ab 3 defekten Platten gleichzeitig ist das Array tot.',
      note: { who: 'Vorgänger', text: 'Schacht 7 hakt beim Rausziehen. Nicht rütteln, das mag er nicht.' },
    },
  },
  spam: {
    detail: ['postfix/qmgr: 3982 deferred, oldest 2d 4h', 'top sender: 412 msgs from a domain registered yesterday'],
    runbook: {
      title: 'Mailqueue sortieren',
      steps: [
        'Oben liegt jeweils eine Mail.',
        'Spam: nach links wischen oder „◀ Spam“. Echte Mail: nach rechts oder „Echt ▶“.',
        'Entscheidend ist die Domain hinter dem @ (fett gedruckt).',
      ],
      warn: 'Der Name vor dem @ darf lügen. Die Domain nicht.',
      note: { who: 'Geschäftsführung', text: 'Der Newsletter vom Golfclub ist kein Spam. Den lese ich. Später.' },
    },
  },
  services: {
    detail: ['check_cluster: 7 CRITICAL, 2 WARNING, 0 OK in Kette', 'dependency map: zuletzt gepflegt vor dem letzten Umzug'],
    runbook: {
      title: 'Die eine Ursache finden',
      steps: [
        'Viele Dienste sind rot, aber nur einer ist die Ursache. Der Rest fällt hinterher um.',
        'Unter jedem Dienst steht, was er braucht. Folge den Abhängigkeiten nach unten.',
        'Den kaputten Dienst antippen, der selbst nichts Kaputtes braucht: Neustart.',
      ],
      warn: 'Neustart am falschen Dienst kostet Zeit.',
      note: { who: 'Werkstudent', text: 'Ich hab einfach alle neu gestartet. Hat 40 Minuten gedauert, aber dann ging es.' },
    },
  },
  loggrep: {
    detail: ['app.log: 12.400 lines/min, ERROR 37 %', 'new since 09:12: FATAL in payment-worker (3×)'],
    runbook: {
      title: 'Neue Fehler im Log erwischen',
      steps: [
        'Das Log läuft von unten nach oben durch.',
        'Neue, echte Fehler (FATAL oder CRIT) antippen, bevor sie oben verschwinden.',
        'Normale ERROR-Zeilen ignorieren, die kommen jeden Tag.',
      ],
      warn: 'Harmlose Zeilen antippen kostet Zeit.',
      note: { who: 'Entwicklung', text: 'Die ERRORs sind Absicht. Damit man merkt, dass das Logging läuft.' },
    },
  },
  network: {
    detail: ['admin-pc: no route to host, last seen 4 min ago', 'ticket queue: unreachable from this workstation'],
    runbook: {
      title: 'Eigener Rechner offline',
      steps: [
        'Ohne Netz keine Tickets. Fehlersuche von unten nach oben, wie im OSI-Modell.',
        'Erst Kabel und Link, dann Adresse, dann Namensauflösung und alles darüber.',
        'Immer den nächsten Schritt antippen. Manche Knöpfe sind Ablenkung.',
      ],
      warn: 'Falsche Reihenfolge kostet Zeit.',
      note: { who: 'Vorgänger', text: 'Erst mal gucken, ob das Lämpchen an der Dose leuchtet. Hätte mir zwei Tage gespart.' },
    },
  },
  patch: {
    detail: ['sw-core01: access ports notconnect, uplink ok', 'last change: gestern 16:58 (Aufräumaktion)'],
    runbook: {
      title: 'Patchfeld neu stecken',
      steps: [
        'Links die Dosen mit Abteilung, rechts die Switch-Ports mit VLAN.',
        'Dose antippen, dann den Port mit dem passenden VLAN (z. B. Buchhaltung → BUHA). Ziehen geht auch.',
        'Jede Dose genau einmal.',
      ],
      warn: 'Finger weg vom Uplink. Ein Kabel dort legt das ganze Netz lahm.',
      note: { who: 'Hausmeister', text: 'Ich hab nur die grünen zu den grünen gesteckt. Sah ordentlicher aus.' },
    },
  },
  diskfull: {
    detail: ['/: 97 % used, inodes 61 %', 'top writer: +200 MB/s, process owner: unbekannt'],
    runbook: {
      title: 'Platz auf der Platte schaffen',
      steps: [
        'Jedes Feld ist eine Datei, groß heißt groß. Antippen zeigt, was es ist.',
        'Überflüssiges löschen, bis der Balken unter der Zielmarke ist.',
        'Eine Datei wächst nach. Die löst sich nicht durch Löschen allein.',
      ],
      warn: 'Was die Firma braucht, bleibt. Löschen-Wollen kostet Zeit.',
      note: { who: 'Chef', text: 'Meine Urlaubsfotos liegen da nur vorübergehend. Seit 2017.' },
    },
  },
  certs: {
    detail: ['certbot.timer: inactive (dead) since last upgrade', 'last successful renewal: never'],
    runbook: {
      title: 'Zertifikate erneuern',
      steps: [
        'Zeile antippen = Zertifikat mit certbot erneuern.',
        'certbot schafft nur eins auf einmal, und erst ab 30 Tagen Restlaufzeit.',
        'Zwischendurch kommen neue Domains dazu. Im Blick behalten.',
      ],
      warn: 'Keins darf ablaufen.',
      note: { who: 'Marketing', text: 'Können wir das grüne Schloss auch in Firmenblau haben?' },
    },
  },
  ups: {
    detail: ['ups: ON BATTERY since 00:00:41, input 0 V', 'mains: Hausanschluss tot, Netzbetreiber informiert'],
    runbook: {
      title: 'Bei Stromausfall geordnet herunterfahren',
      steps: [
        'Server gedrückt halten = sauber herunterfahren. Einer nach dem anderen.',
        'Erst die, von denen nichts mehr abhängt. Datenbank und Speicher zum Schluss.',
        'Jeder Server, der aus ist, schont den Akku.',
      ],
      warn: 'Wer zu früh die Basis abschaltet, reißt alles mit, was darauf läuft.',
      note: { who: 'Vorgänger', text: 'Die Anleitung lag ausgedruckt im Serverraum. Der war dunkel.' },
    },
  },
  cooling: {
    detail: ['CRAC 1: compressor fault E-17', 'CRAC 2: running at 100 % (allein)'],
    runbook: {
      title: 'Klimaausfall – Racks kühl halten',
      steps: [
        'Jedes Rack hat einen Regler. Hoch = mehr Kühlung = kälter.',
        'Der Pfeil am Thermometer zeigt, wohin die Temperatur gerade läuft.',
        'Ereignisse (Backup, Benchmark …) ändern die Abwärme. Nachregeln.',
      ],
      warn: 'Grüner Bereich: 18 bis 27 °C. Zu kalt ist auch falsch.',
      note: { who: 'Empfang', text: 'Im Serverraum ist es so schön kühl. Darf ich da meine Pflanzen überwintern?' },
    },
  },
  rack: {
    detail: ['dock: 6 parcels for rack 07, 1 without rail kit', 'rack 07: freie HE über mehrere Lücken verteilt'],
    runbook: {
      title: 'Lieferung ins Rack einbauen',
      steps: [
        'Gerät rechts antippen, dann eine leuchtende Lücke im Schrank.',
        'Schweres gehört unter die gestrichelte Linie.',
        'Was keine Rackschienen hat, kommt nicht ins Rack: ab in die Retoure.',
      ],
      warn: 'Falsch einsortiert kostet Zeit. Eingebautes lässt sich wieder ausbauen.',
      note: { who: 'Einkauf', text: 'Das war im Angebot. Ob es passt, stand nicht dabei.' },
    },
  },
  untangle: {
    detail: ['gi0/7: link up/down 213× in 10 min', 'cable path: undokumentiert'],
    runbook: {
      title: 'Kabelsalat entwirren',
      steps: [
        'Geräte ziehen. Die Kabel gehen mit.',
        'Rote Punkte zeigen, wo sich zwei Kabel kreuzen.',
        'Roter Rand: Ein fremdes Kabel läuft unter dem Gerät durch. Zählt auch.',
      ],
      warn: 'Fertig ist es erst, wenn kein Rot mehr übrig ist.',
      note: { who: 'Vertrieb', text: 'Können wir nicht einfach WLAN machen?' },
    },
  },
  tapes: {
    detail: ['restore job 0815: 41.212 files requested', 'catalog db: down, Rest nur noch im Cache des Autoloaders'],
    runbook: {
      title: 'Ordner vom Band zurückholen',
      steps: [
        'Der Katalog spielt die nötigen Bänder in Reihenfolge vor: Eins nach dem anderen leuchtet kurz auf.',
        'Dann bist du dran: dieselben Fächer in derselben Reihenfolge antippen.',
        'Jeder neue Auftrag braucht dieselben Bänder wie der vorige, plus eins.',
      ],
      warn: 'Ein falsches Band wird ausgeworfen und kostet Zeit. Vorgespielt wird nur einmal.',
      note: { who: 'Vorgänger', text: 'Die Bänder sind beschriftet. Mit Strichcode. Den kann ich auch nicht lesen.' },
    },
  },
  jam: {
    detail: ['printer: 13.B9 paper jam, fuser 185 °C', 'queue: 47 jobs, davon 12× dieselbe Datei (es kam ja nichts raus)'],
    runbook: {
      title: 'Papierstau beheben (Dieter, 3. OG)',
      steps: [
        'Orange Buchstaben am Drucker zeigen, wo Papier steckt. Das Display sagt dasselbe als Fehlercode.',
        'Klappe auf. Manchmal ist etwas im Weg: Tonerkassette herausnehmen, grünen Andruckhebel vom Blatt wegklappen.',
        'Das Blatt in Pfeilrichtung herauswischen. Dann alles wieder rein und zu, vorher druckt er nicht weiter.',
      ],
      warn: 'Gegen den Pfeil reißt das Blatt. Kostet Zeit, und der Rest steckt noch drin.',
      note: { who: 'Vorgänger', text: 'Alles Grüne darf man anfassen. Alles andere hat schon mal jemand angefasst.' },
    },
  },
  lb: {
    detail: ['backend www: 1 server MAINT, queue 6/6, HTTP 503 rising', 'health checks: disabled (seit 2021, siehe Kommentar)'],
    runbook: {
      title: 'Lastverteiler: kranke Server aus dem Pool nehmen',
      steps: [
        'Der Lastverteiler schickt die Anfragen stur reihum an alle Server im Pool, auch an kaputte. Antippen nimmt einen Server raus oder holt ihn wieder rein.',
        'Rot (abgestürzt, 502) und Gelb (langsam, die Warteschlange läuft über: 503) müssen raus. Draußen startet er neu (grau), das dauert ein paar Sekunden.',
        'Danach steht er gesund draußen (blau) und muss von Hand wieder rein. Einer steht schon seit dem letzten Deploy so da.',
      ],
      warn: 'Bei Lastspitzen braucht es jeden gesunden Server. Wer grundlos draußen steht, fehlt dann.',
      note: { who: 'Vorgänger', text: 'Den Health-Check hab ich ausgeschaltet. Der hat ständig Server rausgenommen.' },
    },
  },
};

/** Wer die Runbook-Seite zuletzt angefasst hat (zufällig) */
export const WIKI_EDITED = [
  'bearbeitet von deinem Vorgänger · 3 Aufrufe, alle von ihm',
  'bearbeitet von dir, nachts um vier · Du erinnerst dich nicht',
  'bearbeitet vom Praktikanten · vom Chef mit 👍 freigegeben',
  'bearbeitet von „admin“ · Wer ist admin? Gute Frage.',
];

/** Knopf unter dem Runbook: startet den Countdown */
export const RUNBOOK_GO = ['Gelesen. Los!', 'Klingt machbar. Los!', 'Alles klar, Uhr starten.', 'Runbook im Kopf. Los!'];
