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
