// Aufgaben vom Chef: kleine Ziele für die nächsten Minuten. {n} = Zielwert

export type BossKind = 'solve' | 'calls' | 'clicks' | 'earn' | 'buy' | 'urgent';

export const BOSS_TASKS: Record<BossKind, string[]> = {
  solve: [
    'Machen Sie {n} Tickets zu. Ich hab oben gesagt, meine Abteilung schafft das. Meine Abteilung sind Sie.',
    'Schließen Sie {n} Tickets. Ich habe dem Vorstand eine Zahl genannt.',
    '{n} Tickets bis zur Mittagspause. Meiner, nicht Ihrer.',
    'Machen Sie {n} Tickets zu. Hauptsache zu.',
    'Machen Sie {n} Tickets zu. Ein guter Chef delegiert. Alles. Ich bin ein sehr guter Chef.',
  ],
  calls: [
    'Nehmen Sie {n} Anrufe an. Telefonieren ist wie Mannschaftssport: Wer zögert, sitzt auf der Bank.',
    'Gehen Sie an die nächsten {n} Anrufe ran. Mit Lächeln. Man hört das.',
    '{n} Anrufer glücklich machen. Oder zumindest zum Auflegen bringen.',
    'Nehmen Sie {n} Anrufe an. Beschwerden über mich bitte nicht am Telefon. Kritik nur per Fax.',
  ],
  clicks: [
    '{n} Anschläge. Ich höre durch die Wand, ob hier gearbeitet wird.',
    'Tippen Sie {n} Mal. Motivation ist wie WLAN: Im Keller schwächer. Ich will hören, dass bei Ihnen was ankommt.',
    '{n} Anschläge. Die Tastatur ist bezahlt, die soll sich lohnen.',
  ],
  earn: [
    'Ich brauche {n} Tickets. Die Zentrale guckt gerade. Also, ich glaube, sie guckt.',
    'Bis zum Meeting brauche ich {n} Tickets. Für eine Folie.',
    '{n} Tickets. Das Leben ist kein Ponyhof, sondern ein Serverraum: laut, kalt, voller Kabel. Also los.',
  ],
  buy: [
    'Kaufen Sie {n}-mal Infrastruktur. Wer nicht investiert, wird zusammengelegt.',
    'Kaufen Sie {n}-mal Infrastruktur. Das Budget muss weg, sonst wird es gekürzt.',
    'Ich will {n} neue Kästen sehen. Blinkend, wenn möglich.',
  ],
  urgent: [
    'Beantworten Sie eine VIP-Mail. Sofort. Der Vorstand testet Ihre Reflexe.',
    'Die nächste Mail mit rotem Ausrufezeichen ist von mir. Seien Sie schnell.',
  ],
};

export const BOSS_DONE: string[] = [
  'Der Chef erzählt allen, er habe dich entdeckt. Ganz früh schon. Bonus trotzdem.',
  'Der Chef nickt. Fast anerkennend.',
  'Der Chef sagt „Gut.“ Das höchste Lob in diesem Haus.',
  'Der Chef sagt: „Ein Chef muss sein wie ein Router: Er leitet weiter.“ Deinen Erfolg leitet er an den Vorstand weiter. Als seinen.',
  'Der Chef hat es nicht gemerkt. Die Buchhaltung schon. Bonus!',
  'Der Chef sagt: „Sehen Sie? Das hab ich Ihnen beigebracht.“',
  'Der Chef sagt: „Lob ist wie Gehalt: Man sollte es nicht zu oft auszahlen.“ Den Bonus gibt es trotzdem.',
];

export const BOSS_FAILED: string[] = [
  'Nicht geschafft. Der Chef nennt es „Lernkurve“. Er meint deine.',
  'Nicht geschafft. Der Chef sagt: „Ein Chef ist wie ein Lagerfeuer. Zu nah: verbrannt. Zu weit weg: kalt.“ Du warst zu weit weg.',
  'Frist verpasst. Der Chef hat es zum Glück schon wieder vergessen.',
  'Nicht geschafft. Der Chef nennt dem Vorstand eine andere Zahl. „Ehrlichkeit ist wie ein Passwort: Man gibt sie nicht jedem.“',
  'Zu spät. Der Chef ist schon im nächsten Meeting über das Meeting.',
  'Frist verpasst. Der Chef sagt: „Ich bin Chef, kein Unmensch.“ Dann trägt er es in deine Akte ein.',
  'Nicht geschafft. Der Chef sagt: „Fehler macht jeder. Ich nicht.“ Bleibt also nur einer übrig.',
];
