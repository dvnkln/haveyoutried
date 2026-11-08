import type { EventEffectId } from '../config';
import type { GameState } from '../core/state';
import type { LogTemplate } from './syslog';

export interface Outcome {
  /** Wahrscheinlichkeit innerhalb der Option (Summe = 1); fehlt = 1 */
  chance?: number;
  effect: EventEffectId;
  text: string;
  log?: LogTemplate;
}

export interface EventOption {
  label: string;
  outcomes: Outcome[];
}

export interface GameEventDef {
  id: string;
  /** Zeile im Pager */
  title: string;
  text: string;
  /** nur wenn erfüllt */
  when?: (s: GameState) => boolean;
  /** relative Häufigkeit (Standard 1) */
  weight?: (s: GameState, d: Date) => number;
  options: EventOption[];
  /** „keine Reaktion“ */
  ignore: Outcome;
}

const o = (effect: EventEffectId, text: string, chance?: number, log?: LogTemplate): Outcome => ({
  effect,
  text,
  chance,
  log,
});

export const EVENTS: GameEventDef[] = [
  {
    id: 'dns',
    title: 'DNS-Ausfall',
    text: 'Nichts geht mehr. Intranet, Mail, Drucker. Die Hotline glüht. Der Praktikant sagt: „Kann nicht DNS sein.“',
    options: [
      {
        label: 'Logs lesen',
        outcomes: [
          o('win', 'Es war DNS. Natürlich war es DNS. Zone repariert, Serial hochgezählt, Held des Tages.', 1, {
            level: 'ok',
            text: 'named[53]: zone hd-local.de/IN: loaded serial 2026110801. it was DNS.',
          }),
        ],
      },
      {
        label: 'Cache leeren und beten',
        outcomes: [
          o('rush', 'resolvectl flush-caches. Läuft wieder. Warum, weißt du nicht. Das ist ja nichts Neues.', 0.6),
          o('fire', 'Cache geleert. Auch die Einträge, die funktioniert haben. Alles weg.', 0.4),
        ],
      },
      {
        label: 'Dem Praktikanten glauben',
        outcomes: [o('lossSmall', 'Zwei Stunden Fehlersuche im Netzwerk. Es war DNS.')],
      },
    ],
    ignore: o('fire', 'Niemand hat reagiert. Nach drei Stunden hat jemand den Router neu gestartet. Es war trotzdem DNS.'),
  },
  {
    id: 'friday',
    title: 'Change: Freitag, 16:55',
    text: 'Die Entwicklung will „nur ein kleines Update“ deployen. Freigabe: jetzt. Rollback-Plan: „Wird schon.“',
    weight: (_s, d) => (d.getDay() === 5 ? 4 : 1),
    options: [
      {
        label: 'Durchwinken',
        outcomes: [
          o('jackpot', 'Lief durch. Keine Fehler. Du traust dem Frieden nicht, aber die Tickets sind weg.', 0.4),
          o('fireBig', 'Prod ist down. Einen Rollback gibt es nicht. Ein Wochenende auch nicht mehr.', 0.6, {
            level: 'crit',
            text: 'deploy[1655]: migration 0815 failed. rollback: not implemented. weekend: cancelled.',
          }),
        ],
      },
      {
        label: 'Ablehnen',
        outcomes: [o('tip', 'Abgelehnt. Die Entwicklung ist beleidigt. Dein Wochenende nicht.')],
      },
      {
        label: 'Auf Montag schieben',
        outcomes: [o('rush', 'Am Montag deployt. Lief sofort. Niemand weiß, warum Montags alles geht.')],
      },
    ],
    ignore: o('fireBig', 'Keine Antwort ist auch eine Antwort. Die Entwicklung hat das als Freigabe verstanden.'),
  },
  {
    id: 'nochange',
    title: 'User hat nichts geändert',
    text: 'Buchhaltung: „Seit heute geht Excel nicht mehr. Ich habe NICHTS geändert.“',
    options: [
      { label: 'Glauben', outcomes: [o('lossSmall', 'Du hast es geglaubt. Zwei Stunden Fehlersuche. Natürlich hatte sie was geändert.')] },
      {
        label: 'Logs prüfen',
        outcomes: [
          o('win', 'Logs: Um 08:14 wurde ein Add-in namens „SuperExcelTurbo“ installiert. Ticket geschlossen. Mit Screenshot.'),
        ],
      },
      {
        label: 'Aus- und wieder einschalten lassen',
        outcomes: [
          o('tip', 'Hat geholfen. Natürlich hat es geholfen.', 0.7),
          o('lossSmall', 'Hat nicht geholfen. Jetzt startet auch der Rechner nicht mehr.', 0.3),
        ],
      },
    ],
    ignore: o('tip', 'Hat sich von selbst erledigt. Sie hat es rückgängig gemacht, ohne es zu merken.'),
  },
  {
    id: 'beep',
    title: 'Irgendwo piept ein Server',
    text: 'Ein regelmäßiges Piepen aus dem 2. OG. Es kommt von unter einem Tisch. Niemand weiß, wem der Server gehört.',
    options: [
      {
        label: 'Nachsehen',
        outcomes: [
          o('win', 'Lüfter voller Staub. Ausgepustet. Er läuft jetzt so leise, dass du ihm nicht mehr traust.', 0.5),
          o('rush', 'Nur der USV-Akku. Getauscht. Nebenbei drei weitere vergessene Server gefunden.', 0.5),
        ],
      },
      {
        label: 'Ignorieren',
        outcomes: [
          o('none', 'Es piept seit 2014. Es wird auch morgen piepen.', 0.7),
          o('lossSmall', 'Es hat aufgehört zu piepen. Weil er aus ist.', 0.3),
        ],
      },
      {
        label: 'Ausstecken',
        outcomes: [
          o('fireBig', 'Ausgesteckt. Lohnabrechnung, Telefonanlage und Kaffeemaschine sind aus. Wieder einstecken. Beten. Nie wieder.', 1, {
            level: 'crit',
            text: 'srv-tisch[1]: power lost after 4017 days. the building holds its breath.',
          }),
        ],
      },
    ],
    ignore: o('none', 'Es piept weiter. Man gewöhnt sich an alles.'),
  },
  {
    id: 'contract',
    title: 'Supportvertrag läuft aus',
    text: 'Der Hersteller-Vertrieb ruft an: Der Supportvertrag fürs SAN läuft heute aus. Verlängerung? „Ein attraktives Angebot.“',
    options: [
      {
        label: 'Verlängern',
        outcomes: [
          o('lossSmall', 'Verlängert. 30 % teurer. Gleicher Support: Tickets werden nach fünf Werktagen mit „Bitte Firmware updaten“ geschlossen.'),
        ],
      },
      {
        label: 'Pokern',
        outcomes: [
          o('win', 'Pokerface. Er knickt ein: 40 % Rabatt und ein Mousepad.', 0.5),
          o('loss', 'Er knickt nicht ein. Jetzt heißt es „Premium-Support“. Der Preis auch.', 0.5),
        ],
      },
      { label: 'Selbst supporten', outcomes: [o('overtime', 'Du bist jetzt der Support. Die nächsten Tickets machst du von Hand. Mit Leidenschaft.')] },
    ],
    ignore: o('loss', 'Vertrag ausgelaufen. Am nächsten Morgen ist natürlich ein SAN-Controller kaputt.'),
  },
  {
    id: 'patchday',
    title: 'Wartungsfenster heute Nacht',
    text: 'Patchday. 47 Updates, drei davon „kritisch“, eines davon „nur ein kleiner Neustart“.',
    options: [
      { label: 'Überstunden machen', outcomes: [o('overtime', 'Kaffee, Pizza, Patches. Du bist im Tunnel. Jeder Klick zählt siebenfach.')] },
      {
        label: 'Automatisch über Nacht',
        outcomes: [
          o('flow', 'Alles durchgelaufen. Morgens alles grün. Das ist dir unheimlich.', 0.7),
          o('fire', 'Ein Update hat den Bootloader gefressen. Der Morgen beginnt mit einem USB-Stick und Tränen.', 0.3),
        ],
      },
      { label: 'Verschieben', outcomes: [o('none', 'Verschoben. Zum vierten Mal. Die Sicherheitslücke wird langsam volljährig.')] },
    ],
    ignore: o('none', 'Niemand hat entschieden. Die Updates warten. Sie sind geduldig. Die Angreifer auch.'),
  },
  {
    id: 'phishing',
    title: 'Phishing-Mail im Umlauf',
    text: 'Betreff: „Ihre Gehaltserhöhung (bitte Passwort bestätigen)“. 43 haben geklickt, 12 geantwortet, einer hat angerufen, um sich zu bedanken.',
    options: [
      { label: 'Alle Passwörter zurücksetzen', outcomes: [o('win', 'Erledigt. 43 neue Tickets „Passwort geht nicht“. Die schließt du gern.')] },
      { label: 'Awareness-Schulung ansetzen', outcomes: [o('rush', 'Schulung gebucht. Teilnahmequote 4 %. Aber die 4 % klicken jetzt nicht mehr.')] },
      {
        label: 'Rundmail: „Nicht klicken!“',
        outcomes: [
          o('fire', 'Deine Warnung ging an alle. 412 Antworten „Danke!“ an alle. Der Mailserver liegt.', 1, {
            level: 'warn',
            text: 'postfix/smtp[25]: reply-all storm: 412 x "Danke!" (1 x "Bitte austragen")',
          }),
        ],
      },
    ],
    ignore: o('fire', 'Niemand hat reagiert. Der Angreifer ist jetzt Domain-Admin. Immerhin hat er drei Tickets geschlossen.'),
  },
  {
    id: 'coffee',
    title: 'Kaffeemaschine kaputt',
    text: 'Die Kaffeemaschine im 3. OG zeigt seit 2017 „Entkalken“. Jetzt geht sie gar nicht mehr. Das ganze Büro schaut dich an.',
    options: [
      { label: 'Reparieren', outcomes: [o('rush', 'Entkalkt. Erste Tasse. Das Büro feiert dich. Die Tickets fliegen.')] },
      {
        label: '„Nicht unser Bereich“',
        outcomes: [
          o('none', 'Facility kümmert sich. Lieferzeit: sechs Wochen.', 0.5),
          o('fire', 'Ohne Kaffee schließt niemand Tickets. Du auch nicht.', 0.5),
        ],
      },
      { label: 'Ticket aufmachen', outcomes: [o('tip', 'Ticket für die Kaffeemaschine aufgemacht und direkt selbst geschlossen. Zählt.')] },
    ],
    ignore: o('fire', 'Keiner kümmert sich. Ohne Kaffee steht der Laden still.'),
  },
  {
    id: 'audit',
    title: 'Audit nächste Woche',
    text: 'Der Wirtschaftsprüfer will „eine vollständige Dokumentation aller Systeme“. Du hast ein Wiki mit drei Seiten und einen Post-it.',
    options: [
      { label: 'Doku schreiben', outcomes: [o('flow', 'Drei Tage Doku. Der Prüfer hat sie nicht gelesen. Aber du weißt jetzt, was srv-legacy01 macht.')] },
      {
        label: 'Excel mit grünen Häkchen',
        outcomes: [
          o('win', '400 grüne Häkchen. Audit bestanden. Mit Auszeichnung.', 0.8),
          o('loss', 'Er hat eine Zelle angeklickt. Die Formel war ="✓".', 0.2),
        ],
      },
      { label: 'Krankmelden', outcomes: [o('none', 'Ein Kollege hat das Audit gemacht. Er schaut dich seitdem anders an.')] },
    ],
    ignore: o('loss', 'Keine Doku, keine Antwort. Das Audit findet trotzdem statt. Mit Feststellungen.'),
  },
  {
    id: 'cloud',
    title: 'Chef war auf einer Konferenz',
    text: '„Wir gehen in die Cloud. Alles. Bis Freitag. Und wir machen jetzt KI.“',
    options: [
      {
        label: 'Begeistert nicken',
        outcomes: [
          o('jackpot', 'Budget bewilligt! Du kaufst drei neue Server. On-Prem. Er merkt es nicht.', 0.5),
          o('loss', 'Alles migriert. Die erste Cloud-Rechnung kommt. Er war gerne auf der Konferenz.', 0.5),
        ],
      },
      { label: 'Machbarkeitsstudie vorschlagen', outcomes: [o('tip', 'Die Studie läuft. Seit zwei Jahren. Alle sind zufrieden.')] },
      { label: 'Nach dem Budget fragen', outcomes: [o('none', '„Budget? Das machen wir agil.“ Thema erledigt. Für immer.')] },
    ],
    ignore: o('tip', 'Er hat es vergessen. Bis zur nächsten Konferenz.'),
  },
  {
    id: 'rmrf',
    title: 'Praktikant hat Fragen',
    text: 'Der Praktikant fragt, was „rm -rf /*“ macht. Er fragt danach.',
    when: (s) => s.generators.intern.owned > 0,
    options: [
      {
        label: 'Backup einspielen',
        outcomes: [
          o('win', 'Backup da! Restore läuft. Der erste erfolgreiche Restore-Test der Firmengeschichte.', 0.5, {
            level: 'ok',
            text: 'backup[{pid}]: restore completed. first one ever. someone frame this log line.',
          }),
          o('fireBig', 'Letztes Backup: never. Du erinnerst dich an die Logzeile.', 0.5, {
            level: 'crit',
            text: 'backup[{pid}]: last successful backup: never. (we told you.)',
          }),
        ],
      },
      { label: 'Ruhe bewahren, nachsehen', outcomes: [o('tip', 'Er hatte kein sudo. Nur sein Home ist weg. Darin: 4 GB Memes.')] },
      { label: 'Root-Rechte entziehen', outcomes: [o('none', 'Rechte entzogen. Er hat jetzt sudo. Das sei was anderes, sagt er.')] },
    ],
    ignore: o('fireBig', 'Niemand hat geantwortet. Er hat es einfach ausprobiert.'),
  },
];

/** „!! DRINGEND !!“-Ticket erwischt: Texte je Effekt */
export const URGENT_TEXT: Record<string, string> = {
  win: 'VIP-Ticket vom Vorstand in 2 Sekunden gelöst. Beförderung: nein. Tickets: ja.',
  overtime: 'Adrenalin! Die nächsten Klicks zählen siebenfach.',
  flow: 'Du bist im Flow. Die ganze Abteilung läuft dreifach.',
};

export const URGENT_LABELS = ['!! DRINGEND !!', '!! VIP !!', '!! CHEF !!', '!! PROD DOWN !!', '!! ASAP !!'];

/** Anzeigenamen der Boosts/Bremsen im Header */
export const BUFF_LABELS: Record<string, string> = {
  rush: 'Rückenwind',
  flow: 'Flow',
  overtime: 'Überstunden',
  fire: 'Es brennt',
  fireBig: 'Alles brennt',
};
