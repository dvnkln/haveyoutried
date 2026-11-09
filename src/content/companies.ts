export interface Company {
  id: string;
  name: string;
  /** Hostname im Prompt: root@<host>:~# */
  host: string;
  /** Spruch zum ersten Arbeitstag */
  welcome: string;
  /** Eigenheit: verändert die Spielregeln in diesem Job (Vor- und Nachteil) */
  quirk?: Quirk;
}

/** Faktoren je Firma; fehlt = 1. events/incidents/urgent = Häufigkeit (0 = gar nicht) */
export interface QuirkMods {
  prod?: number;
  tempo?: number;
  reward?: number;
  costs?: number;
  events?: number;
  incidents?: number;
  urgent?: number;
}
export interface Quirk {
  title: string;
  flavor: string;
  mods: QuirkMods;
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
    quirk: { title: 'Faxgesteuert', flavor: 'Alles läuft über Fax. Läuft gut, kostet aber Papier.', mods: { prod: 1.3, costs: 1.3 } },
  },
  {
    id: 'startup',
    name: 'Blockchain4Bananas (4 Mitarbeiter, 3 davon CEO)',
    host: 'b4b-prod',
    welcome: 'Die Produktion läuft auf dem MacBook des Gründers. Er ist gerade in Lissabon.',
    quirk: { title: 'Move fast', flavor: 'Alle sind schnell. Nichts davon ist viel wert.', mods: { tempo: 1.3, reward: 0.77 } },
  },
  {
    id: 'klinik',
    name: 'Klinikum St. Excel',
    host: 'kl-st-excel',
    welcome: 'Die Dienstpläne liegen in einer Excel-Datei mit 412 Makros. Niemand weiß, wer sie gebaut hat.',
    quirk: { title: 'Makros überall', flavor: 'Die Makros arbeiten mit, kosten aber Lizenzen. Und piepen öfter.', mods: { prod: 1.25, costs: 1.25, events: 1.5 } },
  },
  {
    id: 'amt',
    name: 'Amt für Formularwesen',
    host: 'afw-intern',
    welcome: 'Für den Admin-Zugang brauchst du Formular 7b. Formular 7b gibt es nur im Intranet. Das Intranet braucht den Admin-Zugang.',
    quirk: { title: 'Dreifach abgeheftet', flavor: 'Jedes Ticket dauert doppelt so lange. Zählt aber doppelt.', mods: { tempo: 0.5, reward: 2 } },
  },
  {
    id: 'agentur',
    name: 'Agentur für digitale Transformation',
    host: 'adt-macbook',
    welcome: 'Alle Server sind „in der Cloud“. Gemeint ist ein Dropbox-Ordner.',
    quirk: { title: 'Alles in der Cloud', flavor: 'Infrastruktur ist billig gemietet. Läuft entsprechend.', mods: { costs: 0.85, prod: 0.85 } },
  },
  {
    id: 'versicherung',
    name: 'Allgemeine Versicherung (seit 1897)',
    host: 'av1897-as400',
    welcome: 'Das Kernsystem ist eine AS/400. Der einzige, der sie versteht, geht nächsten Monat in Rente.',
    quirk: { title: 'Seit 1897 stabil', flavor: 'Halb so viele Incidents. Das System hat schon Schlimmeres gesehen.', mods: { incidents: 0.5 } },
  },
  {
    id: 'uni',
    name: 'Universität, Lehrstuhl für Informatik',
    host: 'uni-lst-ws07',
    welcome: 'Der Webserver ist eine Workstation unter dem Schreibtisch eines Doktoranden. Er promoviert seit 2011.',
    quirk: { title: 'Doktoranden', flavor: 'Tippen schnell, aber oberflächlich. Die Diss geht vor.', mods: { tempo: 1.2, reward: 0.85 } },
  },
  {
    id: 'konzern',
    name: 'Konzern AG, Service-Desk-Koordination 3. Ebene',
    host: 'kag-sd3',
    welcome: 'Für jedes Ticket brauchst du drei Freigaben. Die Freigaben sind auch Tickets.',
    quirk: { title: 'Drei Freigaben', flavor: 'Doppelt so viel Pager. Jedes Ticket zählt etwas weniger, weil es drei Leute abzeichnen.', mods: { events: 2, reward: 0.9 } },
  },
  {
    id: 'keller',
    name: 'Hochhaus Holding AG (IT im Keller)',
    host: 'hh-keller',
    welcome: 'Dein Büro ist im Keller. Ein Kollege hat für jeden Notfall ein Formular, der andere geht nie ans Telefon.',
    quirk: { title: 'IT im Keller', flavor: 'Niemand findet euch: halb so viele VIP-Mails. Dafür zählt jedes Ticket etwas mehr.', mods: { urgent: 0.5, reward: 1.05 } },
  },
  {
    id: 'schaden',
    name: 'Versicherung, Abteilung Schadensregulierung M–Z',
    host: 'vers-schaden-mz',
    welcome: 'Dein Abteilungsleiter erklärt das Büro mit Vergleichen aus dem Wasserball. Du verstehst keinen davon.',
    quirk: { title: 'Wasserball-Vergleiche', flavor: 'Motivierend. Man tippt schneller, versteht aber weniger.', mods: { tempo: 1.1, reward: 0.91 } },
  },
  {
    id: 'middleout',
    name: 'Middle-Out Compression Inc.',
    host: 'anton',
    welcome: 'Der einzige Server heißt Anton. Wer ihn neu startet, wird nicht mehr gegrüßt.',
    quirk: { title: 'Middle-Out', flavor: 'Genial komprimiert, sündhaft teuer. Die Server leiden öfter.', mods: { prod: 1.4, costs: 1.4, incidents: 1.5 } },
  },
  {
    id: 'kirche',
    name: 'Kirchengemeinde St. Patch',
    host: 'st-patch-pfarrbuero',
    welcome: 'Der Server steht in der Sakristei. Neustarts nur nach dem Gottesdienst und mit Segen.',
    quirk: { title: 'Sonntagsruhe', flavor: 'Kein Pager. Dafür zählt jedes Ticket ein bisschen mehr. Amen.', mods: { events: 0, reward: 1.1 } },
  },
  {
    id: 'fc',
    name: 'FC Ping 04 e. V.',
    host: 'fc-ping04',
    welcome: 'Die Vereins-IT ist ein Laptop im Vereinsheim. Das Passwort ist der Vereinsname. Rückwärts.',
    quirk: { title: 'Ehrenamt', flavor: 'Alles halb so teuer. Leistet aber auch nicht viel mehr als ein Ehrenamt.', mods: { costs: 0.75, prod: 0.75 } },
  },
  {
    id: 'steuer',
    name: 'Kalkhoff & Partner Steuerberatung',
    host: 'kp-diskette',
    welcome: 'Alle Mandantendaten liegen auf Disketten. Im Tresor. Ein Laufwerk gibt es nicht mehr.',
    quirk: { title: 'Disketten im Tresor', flavor: 'Jedes Ticket mit Siegel. Dauert, zählt aber.', mods: { tempo: 0.8, reward: 1.25 } },
  },
  {
    id: 'baeckerei',
    name: 'Bäckerei Brötchen-Cloud KG',
    host: 'broetchen-cloud',
    welcome: 'Die Kasse läuft auf Windows XP. Der Ofen hat WLAN. Und offene Ports.',
    quirk: { title: 'Ofen mit WLAN', flavor: 'Öfter Incidents. Es riecht nach Brötchen, das lenkt ab.', mods: { incidents: 1.5, reward: 0.95 } },
  },
  {
    id: 'esoterik',
    name: 'Kristallklar Esoterikversand',
    host: 'kristall-srv',
    welcome: 'Der Server wird mit Rosenquarz gekühlt. Die Uptime ist leider beeindruckend.',
    quirk: { title: 'Die Steine wissen es', flavor: 'Kein Monitoring, keine Incidents. Dafür ein Hauch mehr Wert je Ticket.', mods: { incidents: 0, reward: 1.05 } },
  },
  {
    id: 'bundesamt',
    name: 'Bundesamt für Digitalisierung, Referat Fax',
    host: 'bfd-fax01',
    welcome: 'Erster Auftrag: die Digitalisierungsstrategie ausdrucken, unterschreiben und faxen.',
    quirk: { title: 'Referat Fax', flavor: 'Alles auf Papier. Langsam, aber amtlich.', mods: { tempo: 0.7, reward: 1.43 } },
  },
  {
    id: 'autohaus',
    name: 'Autohaus Rost & Söhne',
    host: 'ah-rost-xp',
    welcome: 'Der Verkaufsleiter möchte die Firewall tunen lassen. Mit Spoiler.',
    quirk: { title: 'Getunt', flavor: 'Schneller tippen, weniger Inhalt. Wie beim Tuning.', mods: { tempo: 1.25, reward: 0.8 } },
  },
  {
    id: 'kita',
    name: 'Kita Kleine Bits',
    host: 'kita-bits',
    welcome: 'Das WLAN-Passwort steht auf dem Kühlschrank. Die Kinder kennen es längst.',
    quirk: { title: 'Mittagsschlaf', flavor: 'Halb so viel Pager und VIP-Mails. Was bleibt, zählt mehr.', mods: { events: 0.5, urgent: 0.5, reward: 1.1 } },
  },
  {
    id: 'reederei',
    name: 'Reederei Leck & Co. KG',
    host: 'leck-srv01',
    welcome: 'Der Serverraum ist im Unterdeck. Bei Seegang laufen die Festplatten im Kreis.',
    quirk: { title: 'Seegang', flavor: 'Große Maschinen, große Preise.', mods: { prod: 1.2, costs: 1.2 } },
  },
  {
    id: 'zoo',
    name: 'Tierpark Bitfeld',
    host: 'zoo-gehege-it',
    welcome: 'Die Pinguine haben eine eigene Webcam. Sie ist das einzige System mit Monitoring.',
    quirk: { title: 'Pinguin-Alarm', flavor: 'Doppelt so viele VIP-Mails. Die Pinguine sind VIPs.', mods: { urgent: 2, reward: 0.92 } },
  },
  {
    id: 'pommes',
    name: 'Imbiss „Zum goldenen Router“',
    host: 'pommes-kasse',
    welcome: 'Die Kasse ist ein Laptop in der Nähe der Fritteuse. Die Tastatur glänzt. Nicht vor Sauberkeit.',
    quirk: { title: 'Fettige Tastatur', flavor: 'Günstige Server, die auch so laufen.', mods: { costs: 0.85, prod: 0.85 } },
  },
  {
    id: 'theater',
    name: 'Stadttheater, Abteilung Technik und Drama',
    host: 'theater-buehne',
    welcome: 'Die Lichtsteuerung läuft auf Windows 2000. Wenn sie abstürzt, wird das Stück spontan ein Hörspiel.',
    quirk: { title: 'Drama', flavor: 'Doppelt so viel Pager. Jede Nacht Premiere.', mods: { events: 2, reward: 0.92 } },
  },
  {
    id: 'weingut',
    name: 'Weingut Bitterling (seit 1612)',
    host: 'weingut-keller',
    welcome: 'Der Server reift im Weinkeller. Konstante 12 °C, sagt der Winzer. Gut fürs Backup, schlecht für den Admin.',
    quirk: { title: 'Reifeprozess', flavor: 'Die Server reifen und kosten. Du tippst gemütlicher.', mods: { prod: 1.3, costs: 1.3, tempo: 0.9 } },
  },
  {
    id: 'unicorn',
    name: 'SynergyHub.ai (Series A, kein Produkt)',
    host: 'synergy-pitch',
    welcome: 'Es gibt 14 Slack-Kanäle, einen Tischkicker und keine Server. Die KI im Pitchdeck bist du.',
    quirk: { title: 'Series A', flavor: 'Alles 30 % billiger, alles 30 % weniger wert.', mods: { costs: 0.7, prod: 0.7 } },
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
  'Dein Abschiedsgeschenk: eine Tasse mit „Bester Admin“. Die Tasse ist vom Vorgänger.',
  'Der Server unterm Tisch piept zum Abschied. Einmal. Du nimmst es persönlich.',
  'In der Abschiedsmail stehen 340 Empfänger. 12 antworten mit „Wer?“.',
  'HR fragt nach dem Laptop. Du gibst ihn ab. Mit allen 147 Tabs.',
  'Die Kollegen singen. Leise. Damit der Server nicht aufwacht.',
];
