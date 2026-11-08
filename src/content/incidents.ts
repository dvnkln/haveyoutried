import type { IncidentId } from '../config';

export interface IncidentText {
  host: string;
  service: string;
  /** Info-Zeile der PROBLEM-Meldung */
  info: string;
  /** Info-Zeile der RECOVERY-Meldung */
  okInfo: string;
  /** Anweisung während des Spiels */
  goal: string;
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
    goal: 'Defekte Platten (rot) antippen und tauschen. Ab 3 gleichzeitig ist das Array tot.',
    good: [
      'Alle Platten getauscht. Hot-Spare war sogar da. Wer hat den eingebaut? Egal.',
      'Rebuild durch. Die Platten waren alle aus derselben Charge. Das wird nicht der letzte Abend gewesen sein.',
    ],
    bad: [
      'Array verloren. Restore aus dem Backup läuft. Hoffentlich gibt es eins.',
      'RAID ist kein Backup. Das hast du gerade sehr praktisch gelernt.',
    ],
  },
  spam: {
    host: 'mx01',
    service: 'MAIL-QUEUE',
    info: 'queue: 4211 messages, deferred: 3982',
    okInfo: 'queue: 3 messages',
    goal: 'Mails sortieren: Spam nach links, echte Mails nach rechts. Achte auf den Absender.',
    good: [
      'Queue leer. Die Phishing-Mails sind weg, der Kuchen im 3. OG ist angekündigt. Ordnung.',
      'Sauber sortiert. Die Buchhaltung bekommt ihre Mails, der Prinz aus Nigeria nicht.',
    ],
    bad: [
      'Zwei Kollegen haben auf „Gehaltserhöhung“ geklickt. Passwörter werden zurückgesetzt.',
      'Der Kuchen-Hinweis landete im Spam. Das Büro wird dir das nie verzeihen.',
    ],
  },
  services: {
    host: 'monitoring',
    service: 'CLUSTER',
    info: '7 services CRITICAL, 2 WARNING',
    okInfo: 'all services OK',
    goal: 'Finde die Ursache und starte nur diesen Dienst neu. Achte darauf, wovon ein Dienst abhängt.',
    good: [
      'Ursache gefunden, alles grün. Es war DNS. Natürlich war es DNS.',
      'Root Cause sauber behoben. Du schreibst sogar ein Postmortem. Vielleicht.',
    ],
    bad: [
      'Alles neu gestartet, was rot war. Irgendwann war es grün. Warum, weiß keiner.',
      'Die Ursache hat sich am Ende selbst erholt. Du nimmst das trotzdem auf deine Kappe.',
    ],
  },
  loggrep: {
    host: 'app01',
    service: 'ERROR-RATE',
    info: 'error rate 37 % (threshold 5 %)',
    okInfo: 'error rate 0.2 %',
    goal: 'Tippe neue, echte Fehler (FATAL/CRIT) an, bevor sie oben rausscrollen. Die üblichen ERRORs sind seit 2014 da – ignorieren.',
    good: [
      'Ursache im Log gefunden. Du hast sogar den Stacktrace bis zum Ende gelesen. Respekt.',
      'grep -v "known issue" | grep FATAL – und schon war es offensichtlich.',
    ],
    bad: [
      'Im Rauschen untergegangen. Der Kollege hat „tail -f“ gemacht und es sofort gesehen. Sagt er.',
      'Du hast die falsche ERROR-Zeile gefixt. Die war seit 2014 kaputt und hat niemanden gestört.',
    ],
  },
  network: {
    host: 'admin-pc',
    service: 'PING',
    info: 'packet loss 100 %, rta n/a',
    okInfo: 'packet loss 0 %, rta 0.4 ms',
    goal: 'Dein eigener Rechner ist offline – keine Tickets mehr. Arbeite dich von unten nach oben durch (OSI!). Falsche Reihenfolge kostet Zeit.',
    good: [
      'Netz wieder da. Systematisch von Layer 1 nach oben. Wie im Lehrbuch. Das Lehrbuch ist von 2003.',
      'Online. Die Queue ist in der Zwischenzeit nicht kürzer geworden. Komisch.',
    ],
    bad: [
      'Ein Kollege hat dein Kabel wieder eingesteckt. Er erzählt es gerade in der Teeküche.',
      'Nach 20 Minuten Wireshark: Das Kabel war ab. Du nimmst ein Ticket für dich selbst auf.',
    ],
  },
  patch: {
    host: 'sw-core01',
    service: 'PORTS',
    info: '12 ports down after Aufräumaktion (Immobilienmanagement)',
    okInfo: 'all access ports up',
    goal: 'Dose links mit dem passenden Switch-Port rechts verbinden: antippen + antippen oder ziehen. Finger weg vom Uplink!',
    good: [
      'Alles gepatcht. Diesmal sogar beschriftet. Das hält bis zur nächsten Aufräumaktion.',
      'Ports up. Das Immobilienmanagement hat versprochen, nie wieder „Kabel zu ordnen“.',
    ],
    bad: [
      'Halb gepatcht. Der Drucker im 3. OG ist jetzt im VLAN der Geschäftsführung. Viel Spaß.',
      'Kabelsalat. Ein Kollege hat es mit Kabelbindern „gelöst“. Für immer.',
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
];

/** Button-Texte zum Abschließen */
export const DONE_LABELS = { good: ['Ticket schließen', 'Postmortem? Nö.', 'Zurück zum Kaffee'], bad: ['Nicht mehr mein Problem', 'Seufz.', 'Kollege macht das schon'] };

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

  m('buchhaltung@firma.de', 'WICHTIG!!! Drucker 3. OG', 'Der Drucker druckt wieder nur Hieroglyphen. Bitte sofort!!!', false),
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
  m('projektleitung@firma.de', 'Einladung: Kurzer Sync (90 min)', '17 Teilnehmer. Agenda folgt.', false),
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
export const NOISE_WARNINGS = ['disk 87 %', 'cert expires in 12 days', 'load 4.2', 'swap 61 %', 'NTP offset 0.8 s'];

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
      step('dnsfix', 'DNS-Server eintragen', 'nameserver 10.0.0.53 – Auflösung klappt. Es war DNS.'),
    ],
  },
];

/** Buttons, die nie helfen */
export const NET_DISTRACTORS: { id: string; label: string; reply: string }[] = [
  { id: 'reboot', label: 'Rechner neu starten', reply: 'Neustart. 4 Minuten Updates. Immer noch offline.' },
  { id: 'escalate', label: 'Ticket ans Netzwerkteam', reply: 'Das Netzwerkteam bist du.' },
  { id: 'yell', label: 'Router anschreien', reply: 'Hat gutgetan. Hilft aber nicht.' },
  { id: 'wifi', label: 'Ins Gäste-WLAN', reply: 'Gäste-WLAN-Passwort steht am Empfang. Der Empfang ist nicht erreichbar.' },
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
