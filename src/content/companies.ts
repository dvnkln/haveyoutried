export interface Company {
  id: string;
  name: string;
  /** Hostname im Prompt: root@<host>:~# */
  host: string;
  /** Spruch zum ersten Arbeitstag */
  welcome: string;
}

export const COMPANIES: Company[] = [
  {
    id: 'mueller',
    name: 'Müller & Söhne Spedition GmbH',
    host: 'mueller-spedition',
    welcome: 'Dein Vorgänger hat eine Übergabe hinterlassen: ein Post-it mit „viel Glück“.',
  },
  {
    id: 'stadtwerke',
    name: 'Stadtwerke Hintertupfingen',
    host: 'sw-hintertupfingen',
    welcome: 'Das Fax ist hier noch Produktivsystem. Bitte nicht ausstecken.',
  },
  {
    id: 'startup',
    name: 'Blockchain4Bananas (4 Mitarbeiter, 3 davon CEO)',
    host: 'b4b-prod',
    welcome: 'Die Produktion läuft auf dem MacBook des Gründers. Er ist gerade in Lissabon.',
  },
  {
    id: 'klinik',
    name: 'Klinikum St. Excel',
    host: 'kl-st-excel',
    welcome: 'Die Dienstpläne liegen in einer Excel-Datei mit 412 Makros. Niemand weiß, wer sie gebaut hat.',
  },
  {
    id: 'amt',
    name: 'Amt für Formularwesen',
    host: 'afw-intern',
    welcome: 'Für den Admin-Zugang brauchst du Formular 7b. Formular 7b gibt es nur im Intranet. Das Intranet braucht den Admin-Zugang.',
  },
  {
    id: 'agentur',
    name: 'Agentur für digitale Transformation',
    host: 'adt-macbook',
    welcome: 'Alle Server sind „in der Cloud“. Gemeint ist ein Dropbox-Ordner.',
  },
  {
    id: 'versicherung',
    name: 'Allgemeine Versicherung (seit 1897)',
    host: 'av1897-as400',
    welcome: 'Das Kernsystem ist eine AS/400. Der einzige, der sie versteht, geht nächsten Monat in Rente.',
  },
  {
    id: 'uni',
    name: 'Universität, Lehrstuhl für Informatik',
    host: 'uni-lst-ws07',
    welcome: 'Der Webserver ist eine Workstation unter dem Schreibtisch eines Doktoranden. Er promoviert seit 2011.',
  },
  {
    id: 'konzern',
    name: 'Konzern AG, Service-Desk-Koordination 3. Ebene',
    host: 'kag-sd3',
    welcome: 'Für jedes Ticket brauchst du drei Freigaben. Die Freigaben sind auch Tickets.',
  },
  {
    id: 'keller',
    name: 'Hochhaus Holding AG (IT im Keller)',
    host: 'hh-keller',
    welcome: 'Dein Büro ist im Keller. Ein Kollege hat für jeden Notfall ein Formular, der andere geht nie ans Telefon.',
  },
  {
    id: 'schaden',
    name: 'Versicherung, Abteilung Schadensregulierung M–Z',
    host: 'vers-schaden-mz',
    welcome: 'Dein Abteilungsleiter erklärt das Büro mit Vergleichen aus dem Wasserball. Du verstehst keinen davon.',
  },
  {
    id: 'middleout',
    name: 'Middle-Out Compression Inc.',
    host: 'anton',
    welcome: 'Der einzige Server heißt Anton. Wer ihn neu startet, wird nicht mehr gegrüßt.',
  },
  {
    id: 'kirche',
    name: 'Kirchengemeinde St. Patch',
    host: 'st-patch-pfarrbuero',
    welcome: 'Der Server steht in der Sakristei. Neustarts nur nach dem Gottesdienst und mit Segen.',
  },
  {
    id: 'fc',
    name: 'FC Ping 04 e. V.',
    host: 'fc-ping04',
    welcome: 'Die Vereins-IT ist ein Laptop im Vereinsheim. Das Passwort ist der Vereinsname. Rückwärts.',
  },
  {
    id: 'steuer',
    name: 'Kalkhoff & Partner Steuerberatung',
    host: 'kp-diskette',
    welcome: 'Alle Mandantendaten liegen auf Disketten. Im Tresor. Ein Laufwerk gibt es nicht mehr.',
  },
  {
    id: 'baeckerei',
    name: 'Bäckerei Brötchen-Cloud KG',
    host: 'broetchen-cloud',
    welcome: 'Die Kasse läuft auf Windows XP. Der Ofen hat WLAN. Und offene Ports.',
  },
  {
    id: 'esoterik',
    name: 'Kristallklar Esoterikversand',
    host: 'kristall-srv',
    welcome: 'Der Server wird mit Rosenquarz gekühlt. Die Uptime ist leider beeindruckend.',
  },
  {
    id: 'bundesamt',
    name: 'Bundesamt für Digitalisierung, Referat Fax',
    host: 'bfd-fax01',
    welcome: 'Erster Auftrag: die Digitalisierungsstrategie ausdrucken, unterschreiben und faxen.',
  },
  {
    id: 'autohaus',
    name: 'Autohaus Rost & Söhne',
    host: 'ah-rost-xp',
    welcome: 'Der Verkaufsleiter möchte die Firewall tunen lassen. Mit Spoiler.',
  },
  {
    id: 'kita',
    name: 'Kita Kleine Bits',
    host: 'kita-bits',
    welcome: 'Das WLAN-Passwort steht auf dem Kühlschrank. Die Kinder kennen es längst.',
  },
];

export const companyOf = (id: string): Company => COMPANIES.find((c) => c.id === id) ?? COMPANIES[0]!;

/** Abschiedszeilen beim Kündigen */
export const FAREWELLS = [
  'Dein Abschiedsgeschenk: ein USB-Stick mit 2 GB. „Für deine Daten.“',
  'Die Kollegen haben zusammengelegt: 3,50 € und ein Gutschein für die Kantine, abgelaufen.',
  'Im Exit-Interview fragt HR, was man besser machen könnte. Du lachst zwei Minuten.',
  'Ein Kuchen im Pausenraum. Auf der Karte hat nur der Praktikant unterschrieben.',
  'Dein Nachfolger fragt nach der Doku. Du gibst ihm das Post-it.',
  'Im Abschiedsgespräch fragt der Chef, was du eigentlich gemacht hast. Gute Frage.',
  'Dein Account wird gesperrt, bevor du die Tür erreichst. Endlich funktioniert mal ein Prozess.',
];
