export interface Caller {
  face: string;
  who: string;
  lines: string[];
}

export const CALLERS: Caller[] = [
  {
    face: '(ಠ_ಠ)',
    who: 'Buchhaltung',
    lines: [
      'Ich hab NICHTS geändert!!1',
      'Seit dem Update geht nix mehr. Welches Update? Na, DAS Update!',
      'Excel ist schon wieder kaputt. Die Formel war gestern noch da.',
    ],
  },
  {
    face: '(°ロ°)',
    who: 'Vertrieb',
    lines: [
      'Das Internet ist weg!',
      'Kann man eine Mail zurückholen? Die an „Alle“?',
      'Ich brauch das sofort, der Kunde sitzt neben mir.',
    ],
  },
  {
    face: '¯\\_(ツ)_/¯',
    who: 'Marketing',
    lines: [
      'Ist der Server down? Ich seh nur eine weiße Seite.',
      'Wir haben ein neues Tool gekauft. Geht Montag live. Ihr wisst Bescheid, oder?',
      'Mein Passwort ist abgelaufen. Ich hab einfach eine 2 drangehängt.',
    ],
  },
  {
    face: '(╯°□°)╯︵ ┻━┻',
    who: 'Geschäftsführung',
    lines: [
      'Warum ist das so langsam? Bei meinem Neffen geht das schneller.',
      'Ich hab auf den Link geklickt. Den mit dem Gewinn.',
      'Machen Sie mal schnell das WLAN schneller.',
    ],
  },
  {
    face: '(・_・;)',
    who: 'Neuer Kollege',
    lines: [
      'Der Drucker sagt „lp0 on fire“. Ist das schlimm?',
      'Darf ich den Server unterm Tisch ausstecken? Ich brauch die Steckdose.',
      'Wo find ich die Taste „Beliebige Taste“?',
    ],
  },
  {
    face: '(¬‿¬)',
    who: 'Entwicklung',
    lines: [
      'Bei mir geht’s.',
      'Gib mir mal kurz root. Nur ganz kurz.',
      'Ich deploy das noch schnell. Ist ja erst Freitag, 16:55.',
    ],
  },
  {
    face: '( ˘︹˘ )',
    who: 'Personal',
    lines: [
      'Der Bildschirm ist schwarz. Strom? Wieso Strom?',
      'Kaffee in der Tastatur. Muss ich das melden?',
      'Das Passwort steht doch auf dem Zettel am Monitor. Wieso geht das nicht?',
    ],
  },
  {
    face: '(⊙_☉)',
    who: 'Empfang',
    lines: [
      'Das Telefon zeigt „DNS-Fehler“. Was hat das Telefon mit DNS zu tun?',
      'Ich hab die Fehlermeldung weggeklickt. Was stand da? Keine Ahnung.',
      'Es geht wieder! … Nein, doch nicht.',
    ],
  },
];
