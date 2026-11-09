// Aufgaben vom Chef: kleine Ziele für die nächsten Minuten. {n} = Zielwert

export type BossKind = 'solve' | 'calls' | 'clicks' | 'earn' | 'buy' | 'urgent';

export const BOSS_TASKS: Record<BossKind, string[]> = {
  solve: [
    'Schließen Sie {n} Tickets. Ich habe dem Vorstand eine Zahl genannt.',
    '{n} Tickets bis zur Mittagspause. Meiner, nicht Ihrer.',
    'Machen Sie {n} Tickets zu. Hauptsache zu.',
  ],
  calls: [
    'Gehen Sie an die nächsten {n} Anrufe ran. Mit Lächeln. Man hört das.',
    '{n} Anrufer glücklich machen. Oder zumindest zum Auflegen bringen.',
  ],
  clicks: [
    'Tippen Sie {n} Mal. Ich will Sie arbeiten hören.',
    '{n} Anschläge. Die Tastatur ist bezahlt, die soll sich lohnen.',
  ],
  earn: [
    'Bis zum Meeting brauche ich {n} Tickets. Für eine Folie.',
    '{n} Tickets. Fragen Sie nicht, wofür. Ich weiß es auch nicht.',
  ],
  buy: [
    'Kaufen Sie {n}-mal Infrastruktur. Das Budget muss weg, sonst wird es gekürzt.',
    'Ich will {n} neue Kästen sehen. Blinkend, wenn möglich.',
  ],
  urgent: [
    'Beantworten Sie eine VIP-Mail. Sofort. Der Vorstand testet Ihre Reflexe.',
    'Die nächste Mail mit rotem Ausrufezeichen ist von mir. Seien Sie schnell.',
  ],
};

export const BOSS_DONE: string[] = [
  'Der Chef nickt. Fast anerkennend.',
  'Der Chef sagt „Gut.“ Das höchste Lob in diesem Haus.',
  'Der Chef leitet es als seinen Erfolg an den Vorstand weiter. Du bekommst trotzdem was ab.',
  'Der Chef hat es nicht gemerkt. Die Buchhaltung schon. Bonus!',
];

export const BOSS_FAILED: string[] = [
  'Frist verpasst. Der Chef hat es zum Glück schon wieder vergessen.',
  'Nicht geschafft. Der Chef erzählt dem Vorstand einfach eine andere Zahl.',
  'Zu spät. Der Chef ist schon im nächsten Meeting über das Meeting.',
];
