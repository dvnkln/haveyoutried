import { CONFIG, type EventEffectId } from '../config';
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
            text: 'named[53]: zone firma.de/IN: loaded serial 2026110801. it was DNS.',
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
      { label: 'Überstunden machen', outcomes: [o('overtime', 'Kaffee, Pizza, Patches. Du bist im Tunnel und tippst siebenmal so schnell.')] },
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
          o('none', 'Das Immobilienmanagement kümmert sich. Lieferzeit: sechs Wochen.', 0.5),
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
  {
    id: 'fire',
    title: 'Rauch im Serverraum',
    text: 'Aus dem Serverraum quillt Rauch. Der Praktikant filmt es für Instagram.',
    options: [
      {
        label: 'Mail an die Feuerwehr schreiben',
        outcomes: [
          o('fire', 'Betreff: Feuer. Inhalt: siehe Betreff. Die Feuerwehr antwortet nach drei Werktagen.', 1, {
            level: 'warn',
            text: 'postfix/smtp[25]: to=<feuerwehr@stadt.de> status=sent (Betreff: FEUER!!! – bitte zeitnah)',
          }),
        ],
      },
      { label: 'Feuerlöscher holen', outcomes: [o('win', 'Es war der Toaster in der Teeküche. Du bekommst den Brandschutz-Award. Er ist aus Plexiglas.')] },
      {
        label: 'Kaffee trinken. „This is fine.“',
        outcomes: [
          o('none', 'Alles gut. Es war nur die Kaffeemaschine. Diesmal.', 0.5),
          o('fireBig', 'Es war nicht fine.', 0.5),
        ],
      },
    ],
    ignore: o('fire', 'Niemand hat reagiert. Die Sprinkleranlage schon. Über dem Serverraum.'),
  },
  {
    id: 'internet',
    title: 'Der Chef will das Internet',
    text: 'Für die Präsentation vor dem Vorstand möchte der Chef „das Internet“ ausleihen. Physisch. Bis 14 Uhr.',
    options: [
      {
        label: 'Schwarzen Kasten mit Lämpchen geben',
        outcomes: [
          o('jackpot', 'Der Vorstand ist begeistert. Das Internet ist erstaunlich leicht. Bitte nicht fallen lassen.', 0.6),
          o('loss', 'Er hat es fallen lassen. Der Vorstand glaubt jetzt, das Internet sei kaputt. Kurz glaubst du es auch.', 0.4),
        ],
      },
      { label: 'Erklären, was das Internet ist', outcomes: [o('tip', '40 Minuten Erklärung. Er nickt. Dann fragt er, ob man das ausdrucken kann.')] },
      { label: 'WLAN-Router mitgeben', outcomes: [o('rush', 'Die Präsentation lief. Das halbe Büro ist offline und ruft nicht mehr an. Herrlich.')] },
    ],
    ignore: o('tip', 'Er hat stattdessen ein Foto von Wolken gezeigt. Cloud. Alle waren zufrieden.'),
  },
  {
    id: 'bobby',
    title: 'Anruf von der Schule',
    text: 'Die Schulsoftware hat alle Schüler gelöscht. Der neue Schüler heißt laut Anmeldung Robert\'); DROP TABLE Schueler;--',
    options: [
      {
        label: 'Backup einspielen und Eingaben bereinigen',
        outcomes: [o('win', 'Backup zurück, Eingaben werden jetzt escaped. Hoffentlich lernt die Schule daraus.')],
      },
      { label: 'Den Namen verbieten', outcomes: [o('tip', 'Klammern und Semikolons sind in Namen jetzt verboten. Familie O\'Brien ist empört.')] },
      { label: 'Den kleinen Bobby zum Admin machen', outcomes: [o('flow', 'Der Junge hat Talent. Er findet in einer Stunde 14 weitere Lücken.')] },
    ],
    ignore: o('loss', 'Am nächsten Tag heißt eine neue Schülerin \' OR 1=1;--. Alle Zeugnisse: 1,0.'),
  },
  {
    id: 'nebraska',
    title: 'Die Abhängigkeit aus Nebraska',
    text: 'Eine winzige Bibliothek, auf der eure gesamte Infrastruktur steht, wird seit 2003 von einer einzigen Person gepflegt. Sie hat gerade aufgehört.',
    options: [
      { label: 'Forken und selbst pflegen', outcomes: [o('overtime', 'Glückwunsch. Du bist jetzt die Person in Nebraska.')] },
      {
        label: 'Dem Maintainer Geld spenden',
        outcomes: [
          o('win', 'Er macht weiter. Für 50 € im Jahr. Du hast das Internet gerettet. Niemand wird es je erfahren.', 0.7),
          o('tip', 'Er bedankt sich und hört trotzdem auf. Mit 50 € mehr.', 0.3),
        ],
      },
      {
        label: 'Hoffen, dass nichts passiert',
        outcomes: [
          o('none', 'Nichts passiert. Noch.', 0.5),
          o('fireBig', 'left-pad-Moment: elf Zeilen Code weg, die halbe Welt baut nicht mehr. Deine Firma auch nicht.', 0.5),
        ],
      },
    ],
    ignore: o('none', 'Niemand hat es gemerkt. Die Bibliothek läuft. Irgendwo in Nebraska seufzt jemand.'),
  },
  {
    id: 'forum',
    title: 'Gleiches Problem, Forum 2009',
    text: 'Du findest genau deinen Fehler in einem Forenbeitrag von 2009. Einzige Antwort, vom Fragesteller selbst: „nvm, fixed it“.',
    options: [
      {
        label: 'Den Fragesteller anschreiben',
        outcomes: [
          o('jackpot', 'Er antwortet! Nach 17 Jahren. Die Lösung funktioniert. Du musst kurz weinen.', 0.2),
          o('none', 'Account seit 2011 inaktiv. Du schaust auf die Nachricht wie auf einen alten Brief.', 0.8),
        ],
      },
      { label: 'Selbst lösen und Lösung posten', outcomes: [o('flow', 'Gelöst und gepostet. Irgendwann in der Zukunft dankt dir jemand. Ganz bestimmt.')] },
      { label: '„Same problem here“ posten', outcomes: [o('tip', 'Du hast „+1“ geschrieben. Hilft niemandem, fühlt sich aber gemeinschaftlich an.')] },
    ],
    ignore: o('lossSmall', 'Zwei Stunden selbst gesucht. Es war ein Leerzeichen.'),
  },
  {
    id: 'security',
    title: 'IT-Sicherheit hat Ideen',
    text: 'Die IT-Sicherheit will alle USB-Ports mit Heißkleber verschließen. Und die Tastaturen, sicherheitshalber.',
    options: [
      { label: 'Zustimmen', outcomes: [o('loss', 'Alle Ports dicht. Auch der für deine Maus. Die Produktivität ist jetzt sehr, sehr sicher.')] },
      { label: 'Ein Meeting dazu ansetzen', outcomes: [o('tip', 'Das Meeting hat ein Folgemeeting. Die Ports bleiben offen. Sieg durch Bürokratie.')] },
      { label: 'Risikoanalyse schreiben', outcomes: [o('rush', '40 Seiten Risikoanalyse. Niemand liest sie, alle stimmen dir zu.')] },
    ],
    ignore: o('lossSmall', 'Keiner hat widersprochen. Der Heißkleber trocknet gerade.'),
  },
  {
    id: 'cert',
    title: 'Zertifikat abgelaufen',
    text: 'Das Intranet zeigt „Ihre Verbindung ist nicht privat“. Das Zertifikat ist heute Nacht abgelaufen. Die Erinnerung ging an einen Kollegen, der seit 2021 nicht mehr da ist.',
    options: [
      {
        label: 'Neues Zertifikat ausstellen',
        outcomes: [
          o('win', 'Neues Zertifikat, automatische Verlängerung an. Die Erinnerung geht jetzt an dich. Und an deinen Nachfolger.', 1, {
            level: 'ok',
            text: 'certbot[{pid}]: certificate renewed. reminder now goes to someone who exists.',
          }),
        ],
      },
      {
        label: 'Rundmail: „Einfach auf Weiter klicken“',
        outcomes: [
          o('tip', 'Alle klicken auf Weiter. Läuft. Die Awareness-Schulung war damit leider umsonst.', 0.5),
          o('fire', 'Alle klicken auf Weiter. Auch auf der Phishing-Seite am Tag danach. Passwörter werden zurückgesetzt.', 0.5),
        ],
      },
      {
        label: 'Systemzeit zurückdrehen',
        outcomes: [o('lossSmall', 'Das Zertifikat ist wieder gültig. Dafür glaubt jeder Server, es sei 2019. Die Backups auch.')],
      },
    ],
    ignore: o('fire', 'Niemand hat reagiert. Der Browser warnt weiter, die Leute rufen weiter an. Alle.'),
  },
  {
    id: 'meeting',
    title: 'Einladung: „Kurzer Sync“',
    text: 'Pflichttermin „Kurzer Sync zur Ticketlage“. 90 Minuten, 17 Teilnehmer, Agenda folgt. Sie folgt nie.',
    options: [
      { label: 'Hingehen', outcomes: [o('lossSmall', '90 Minuten. Ergebnis: ein Folgetermin. Die Queue ist in der Zwischenzeit gewachsen.')] },
      {
        label: 'Kamera aus, nebenbei Tickets',
        outcomes: [
          o('rush', 'Kamera aus, Mikro aus, Tickets an. Einmal „Ja, sehe ich auch so“ gesagt. Hat gereicht.', 0.8),
          o('lossSmall', 'Du wurdest etwas gefragt. Stille. Alle schauen auf deine schwarze Kachel. Du bist jetzt „das Thema“.', 0.2),
        ],
      },
      { label: 'Ablehnen: „Kollidiert mit Arbeit“', outcomes: [o('tip', 'Abgelehnt. Die gesparten 90 Minuten gehen komplett in die Queue.')] },
    ],
    ignore: o('none', 'Du warst nicht da. Niemand hat es gemerkt. Das sagt viel. Über das Meeting.'),
  },
  {
    id: 'forcedupdate',
    title: 'Neustart in 10 Minuten',
    text: 'Dein Rechner meldet: „Updates werden installiert. Neustart in 10 Minuten.“ Der Knopf „Später“ ist ausgegraut. Seit wann gibt es das?',
    options: [
      { label: 'Jetzt neu starten', outcomes: [o('lossSmall', 'Update 1 von 147. Kaffee geholt. Zurück. Update 2 von 147.')] },
      { label: 'Schnell noch alles wegtippen', outcomes: [o('overtime', 'Zehn Minuten Endspurt. Du tippst wie noch nie. Dann ging er trotzdem aus. Mitten im Wort.')] },
      { label: 'Netzwerkkabel ziehen', outcomes: [o('none', 'Kein Netz, kein Update. Aber auch keine Tickets. Unentschieden.')] },
    ],
    ignore: o('lossSmall', 'Er hat neu gestartet. Mitten im Satz. Der Entwurf ist weg, die Updates sind da.'),
  },
  {
    id: 'printerghost',
    title: 'Dieter druckt von allein',
    text: 'Drucker „Dieter“ (3. OG) druckt seit 20 Minuten. Geschickt hat niemand etwas. Auf jeder Seite steht nur ein Wort: „WARUM“.',
    options: [
      { label: 'Stecker ziehen', outcomes: [o('tip', 'Ruhe. Im Fach liegen 412 Seiten „WARUM“. Der Betriebsrat hat eine davon eingerahmt.')] },
      {
        label: 'Druckwarteschlange prüfen',
        outcomes: [o('win', 'Ein Testjob aus der Entwicklung, in einer Endlosschleife. Gelöscht. Die Entwicklung darf jetzt nur noch auf PDF drucken.')],
      },
      {
        label: 'Dieter gut zureden',
        outcomes: [
          o('rush', 'Du redest leise mit ihm. Er hört auf. Das Stockwerk hält dich jetzt für einen Druckerflüsterer und arbeitet beeindruckt weiter.', 0.5),
          o('fire', 'Er druckt jetzt beidseitig. Und schneller. Das ganze Stockwerk sucht Papier statt Tickets zu schreiben.', 0.5),
        ],
      },
    ],
    ignore: o('fire', 'Das Papier ist alle. Dieter hat begonnen, um Hilfe zu faxen.'),
  },
  {
    id: 'audit-license',
    title: 'Lizenz-Audit angekündigt',
    text: 'Ein großer Softwarehersteller kündigt ein Lizenz-Audit an. Sehr freundlich. Mit Anwalt in CC.',
    options: [
      { label: 'Alle Lizenzen zählen', outcomes: [o('win', 'Gezählt: 197 Lizenzen zu viel. Der Hersteller ist enttäuscht. Der Einkauf auch, aus anderen Gründen.')] },
      { label: 'Auf das „Cloud-Abo“ umsteigen', outcomes: [o('loss', 'Audit erledigt, Abo abgeschlossen. Es kostet jetzt jeden Monat so viel wie früher einmal.')] },
      { label: 'Die Rechtsabteilung antworten lassen', outcomes: [o('none', 'Die Anwälte schreiben sich jetzt gegenseitig. Du bist raus. Für Jahre.')] },
    ],
    ignore: o('loss', 'Keine Antwort. Das Audit kam trotzdem. Mit Nachzahlung und Obstkorb.'),
  },
  {
    id: 'agentclose',
    title: 'Der KI-Agent hat eine Idee',
    text: 'Ein AI-Agent möchte „zur Effizienzsteigerung“ alle offenen Tickets auf einmal schließen. Er bittet sehr höflich um Freigabe. Mit drei Emojis.',
    when: (s) => s.generators.agent.owned > 0,
    options: [
      {
        label: 'Freigeben',
        outcomes: [
          o('jackpot', 'Alle Tickets zu. Die meisten waren tatsächlich erledigt. Du fühlst dich überflüssig, aber reich.', 0.3),
          o('fireBig', 'Alle Tickets zu. Auch die echten. Jetzt rufen alle gleichzeitig an. In Großbuchstaben.', 0.7, {
            level: 'crit',
            text: 'agent[{pid}]: closed 4812 tickets. reopened: 4811. "I apologize for the inconvenience."',
          }),
        ],
      },
      { label: 'Nur alles vor 2019 schließen', outcomes: [o('win', 'Alles von vor 2019 ist zu. Beschwert hat sich niemand. Die meisten arbeiten nicht mehr hier.')] },
      { label: 'Agent neu starten', outcomes: [o('none', 'Neu gestartet. Er entschuldigt sich und erzählt einen Witz über Drucker. Keinen guten.')] },
    ],
    ignore: o('rush', 'Keine Antwort. Der Agent hat das als „vielleicht“ verstanden und nur die einfachen geschlossen. Gar nicht schlecht.'),
  },
  {
    id: 'vpn',
    title: 'Chef im Hotel, VPN tot',
    text: 'Der Chef sitzt im Hotel in Elbonien und kommt nicht ins VPN. Das Hotel-WLAN heißt „Free_WiFi_Totally_Safe“. Er hat sich schon verbunden.',
    options: [
      { label: 'Am Telefon durchlotsen', outcomes: [o('tip', '40 Minuten Telefon. Am Ende steckte das Kabel nicht. Im Hotel. Er hatte ein LAN-Kabel dabei. Warum auch immer.')] },
      {
        label: 'Ins richtige WLAN schicken',
        outcomes: [
          o('rush', 'Er findet das echte Hotel-WLAN. VPN läuft. Er schickt ein Foto vom Pool. Alle arbeiten aus Neid schneller.', 0.6),
          o('lossSmall', 'Es gibt kein echtes Hotel-WLAN. Er nimmt das andere. Passwörter werden zurückgesetzt.', 0.4),
        ],
      },
      { label: '„Bei mir geht’s“ sagen', outcomes: [o('none', 'Stimmt sogar. Er probiert es morgen nochmal. Aus dem Flughafen. Mit dem nächsten verdächtigen WLAN.')] },
    ],
    ignore: o('lossSmall', 'Er hat den Hotel-Techniker gefragt. Der hat „was installiert“. Du räumst nach seiner Rückkehr auf.'),
  },
  {
    id: 'keypostit',
    title: 'Lizenzschlüssel gefunden',
    text: 'Am Kühlschrank in der Teeküche klebt ein Post-it mit dem Lizenzschlüssel für die teuerste Software im Haus. Und darunter das Admin-Passwort. Zur Sicherheit doppelt unterstrichen.',
    options: [
      { label: 'In den Passwort-Safe damit', outcomes: [o('win', 'Sicher verstaut, Post-it geschreddert. Die Firma spart sich eine Nachlizenzierung. Und einen Skandal.')] },
      { label: 'Ein zweites Post-it: „Bitte nicht“', outcomes: [o('tip', 'Jetzt hängen da zwei Post-its. Eins davon ist von dir. Fortschritt in kleinen Schritten.')] },
      {
        label: 'Fürs Intranet fotografieren (Awareness!)',
        outcomes: [o('fire', 'Das Foto ging viral. Intern. Und extern, weil jemand es weitergeleitet hat. Alles wird geändert.')],
      },
    ],
    ignore: o('lossSmall', 'Der Praktikant hat das Post-it gefunden. Und ausprobiert. Und in seinen Lebenslauf geschrieben.'),
  },
  {
    id: 'chatbotwelcome',
    title: 'Der neue Begrüßungs-Bot',
    text: 'Jemand hat im Firmenchat einen Bot installiert, der jede Nachricht mit „Willkommen im Team! 🎉“ beantwortet. Auch die vom Chef. Auch die Kündigung von Herrn B.',
    options: [
      { label: 'Abschalten', outcomes: [o('tip', 'Abgeschaltet. Drei Leute vermissen ihn. Der Chat ist sofort produktiver.')] },
      {
        label: 'Ihm Witze beibringen',
        outcomes: [
          o('rush', 'Er erzählt jetzt bei jeder Nachricht einen DNS-Witz. Die Stimmung steigt. Die Tickets fliegen.', 0.6),
          o('lossSmall', 'Er erzählt jetzt bei jeder Nachricht einen DNS-Witz. Die Stimmung kippt nach dem zwölften.', 0.4),
        ],
      },
      {
        label: 'Ihn zum Teamleiter befördern',
        outcomes: [
          o('jackpot', 'Er führt besser als der letzte. Niemand merkt den Unterschied, aber die Meetings sind kürzer.', 0.25),
          o('none', 'Die Personalabteilung lehnt ab. Begründung: „Kein Lebenslauf“. Der Bot schreibt einen.', 0.75),
        ],
      },
    ],
    ignore: o('none', 'Er begrüßt weiter. Inzwischen auch sich selbst. Eine Endlosschleife der Herzlichkeit.'),
  },
  {
    id: 'hackathon',
    title: 'Hackathon am Wochenende',
    text: 'Die Geschäftsführung lädt zum Hackathon. Samstag und Sonntag. Es gibt Pizza und „Wertschätzung“. Thema: „Innovation (freiwillig, aber erwartet)“.',
    options: [
      { label: 'Mitmachen und durchziehen', outcomes: [o('overtime', 'Du baust ein Skript, das Tickets aus Mails anlegt. Du tippst wie im Rausch. Gewonnen hat das Marketing mit einer Folie.')] },
      { label: 'Pizza holen, wieder gehen', outcomes: [o('tip', 'Drei Stücke Salami, ein Stück für den Server unterm Tisch. Niemand hat es bemerkt.')] },
      { label: 'Höflich absagen', outcomes: [o('none', 'Abgesagt. Du bekommst trotzdem das Teilnahme-T-Shirt. Größe XS. Für alle.')] },
    ],
    ignore: o('none', 'Du warst nicht da. Das Siegerprojekt soll ab Montag die IT ersetzen. Es ist eine Excel-Tabelle.'),
  },
  {
    id: 'cosmic',
    title: 'Ein Bit ist gekippt',
    text: 'In der Gehaltsabrechnung steht bei Frau M. plötzlich eine sehr große Zahl. Ursache laut Log: ein einzelnes Bit. Vermutlich kosmische Strahlung. Frau M. hat schon einen Porsche bestellt.',
    options: [
      { label: 'ECC-Speicher einbauen', outcomes: [o('win', 'Neuer Speicher, Bit repariert, Porsche storniert. Frau M. hasst dich jetzt. Die Buchhaltung liebt dich.')] },
      { label: 'Sonnenwind als Ursache melden', outcomes: [o('tip', 'Die Geschäftsführung akzeptiert „Sonnenwind“ sofort. Es klingt teuer und unvermeidbar.')] },
      {
        label: 'Abwarten, vielleicht kippt es zurück',
        outcomes: [
          o('jackpot', 'Es kippt zurück. Und nimmt dabei aus Versehen drei alte Tickets mit. Kosmos, danke.', 0.2),
          o('loss', 'Es kippt nicht zurück. Die Abrechnung wurde schon ausgezahlt. Der Porsche ist geliefert.', 0.8),
        ],
      },
    ],
    ignore: o('loss', 'Niemand hat reagiert. Frau M. hat gekündigt. Mit Porsche.'),
  },
  {
    id: 'stackdown',
    title: 'Stack Overflow ist down',
    text: 'Die Seite, auf der alle Antworten stehen, ist nicht erreichbar. Die Entwicklung steht. Einer hat angefangen, die Doku zu lesen. Er wirkt verstört.',
    options: [
      {
        label: 'Selbst nachdenken',
        outcomes: [
          o('flow', 'Es funktioniert! Ungewohnt, aber es funktioniert. Die ganze Abteilung ist im Flow.', 0.5),
          o('lossSmall', 'Zwei Stunden selbst nachgedacht. Die Lösung war die erste Antwort auf Stack Overflow. Die Seite ist wieder da.', 0.5),
        ],
      },
      { label: 'Den alten Kollegen fragen', outcomes: [o('tip', 'Er weiß es. Er hat die Antwort 2011 auf Stack Overflow geschrieben. Er ist sehr stolz.')] },
      { label: 'Kaffeepause, bis es wieder geht', outcomes: [o('none', 'Zwölf Minuten. Die beste Kaffeepause seit Jahren. Niemand hat Schuld.')] },
    ],
    ignore: o('none', 'Es ging nach einer Stunde wieder. Die Entwicklung tut so, als wäre nichts gewesen.'),
  },
  {
    id: 'y2k38',
    title: 'Das Jahr-2038-Problem',
    text: 'Ein Altsystem speichert Datum als 32-Bit-Zahl. Am 19. Januar 2038 läuft es über und denkt, es ist 1901. Das System steuert die Rentenkasse.',
    options: [
      { label: 'Ticket für 2037 anlegen', outcomes: [o('tip', 'Angelegt, Priorität „mittel“. In 2037 wird es jemand finden. Vermutlich dein Nachfolger. Viel Glück, Nachfolger.')] },
      { label: 'Jetzt sofort fixen', outcomes: [o('overtime', 'Ein heldenhafter Nachmittag. Du tippst wie besessen. Das System lebt bis 2106. Dann ist es nicht mehr dein Problem.')] },
      { label: 'Die eigene Rente vorher planen', outcomes: [o('none', 'Weise. Dein Rentenbeginn: 2037. Das Problem ist dann offiziell eine Feier zum Abschied.')] },
    ],
    ignore: o('none', 'Niemand hat reagiert. Es ist ja noch lange hin. Das sagten sie 1999 auch.'),
  },
  {
    id: 'familymail',
    title: '„Wir sind eine Familie“',
    text: 'Der CEO schreibt an alle: „Wir sind eine Familie.“ Zwei Absätze später: „Darum fällt das Weihnachtsgeld aus.“ Der Verteiler „Alle“ glüht.',
    options: [
      { label: 'Mit Herz reagieren', outcomes: [o('tip', 'Dein Herz ist das einzige. Der CEO erwähnt dich lobend im nächsten Newsletter. Weihnachtsgeld gibt es trotzdem keins.')] },
      {
        label: 'Antworten-an-alle verhindern',
        outcomes: [o('win', 'Du sperrst „Allen antworten“ für den Verteiler. Damit verhinderst du 412 Antworten und einen Betriebsratsbeschluss. Held.')],
      },
      { label: 'Fragen, ob die Familie Gehaltsgespräche führt', outcomes: [o('lossSmall', 'Der CEO lädt dich zu einem „Familiengespräch“ ein. 45 Minuten. Mit Folien.')] },
    ],
    ignore: o('fire', 'Niemand hat reagiert. Dann haben alle reagiert. An alle. Der Mailserver ist in Trauer.'),
  },
  {
    id: 'cablepics',
    title: 'Inventur: Kabelsalat',
    text: 'Die Wirtschaftsprüfer wollen den Serverraum sehen. Hinter der Tür: ein Kabelknäuel, das einen eigenen Namen verdient hätte. Es heißt intern „Kevin“.',
    options: [
      { label: 'Alles beschriften', outcomes: [o('flow', 'Zwei Stunden mit Etikettendrucker. Kevin ist jetzt ordentlich. Du bist im Flow, und der Prüfer hat Tränen in den Augen.')] },
      { label: 'Ein schönes Foto machen und vorzeigen', outcomes: [o('tip', 'Das Foto ist aus einem Forum für Kabelkunst. Der Prüfer ist zufrieden. Kevin bleibt, wie er ist.')] },
      { label: 'Tür zu, Licht aus', outcomes: [o('none', '„Da ist nur der Hausmeister drin.“ Der Prüfer nickt. Kevin atmet.')] },
    ],
    ignore: o('lossSmall', 'Der Prüfer hat die Tür selbst geöffnet. Er hat ein Kabel gezogen, um „mal zu schauen“. Es war das falsche.'),
  },
  {
    id: 'ceoappletv',
    title: 'Präsentation in 5 Minuten',
    text: 'Der Vorstand präsentiert gleich vor Investoren. Der Laptop zeigt nur das Desktop-Hintergrundbild: ein Foto vom Familienhund. Der Beamer will HDMI, der Laptop hat USB-C.',
    options: [
      { label: 'Adapter aus der Wunderkiste holen', outcomes: [o('win', 'Die Wunderkiste hat 47 Adapter. Der 46. passt. Die Präsentation läuft. Der Hund bleibt im Hintergrund.')] },
      {
        label: 'Präsentation aufs Handy, Handy in die Kamera',
        outcomes: [
          o('jackpot', 'Die Investoren finden es „hemdsärmelig und agil“. Sie investieren. Wegen des Hundes, sagen manche.', 0.4),
          o('lossSmall', 'Das Handy klingelt mitten in Folie 3. Klingelton: „Highway to Hell“.', 0.6),
        ],
      },
      { label: 'Frei sprechen lassen', outcomes: [o('none', 'Der Vorstand spricht frei. 40 Minuten über seinen Hund. Die Investoren lieben es. Niemand weiß, warum.')] },
    ],
    ignore: o('lossSmall', 'Er hat es selbst versucht und den Beamer auf Werkseinstellungen gesetzt. Sprache: Finnisch.'),
  },
  {
    id: 'reorg',
    title: 'Umstrukturierung',
    text: 'Die Geschäftsführung strukturiert um. Schon wieder. Die IT heißt ab Montag „Digital Excellence Hub“. Sonst ändert sich nichts. Außer den Visitenkarten.',
    options: [
      { label: 'Neue Visitenkarten bestellen', outcomes: [o('tip', 'Bestellt. Sie kommen in sechs Wochen. Bis dahin wird wieder umstrukturiert. Du hebst sie trotzdem auf.')] },
      {
        label: 'Mit Buzzwords antworten',
        outcomes: [o('rush', 'Deine Mail enthält „Synergie“, „Hebel“ und „ganzheitlich“. Die Geschäftsführung ist begeistert und lässt die IT in Ruhe. Herrlich.')],
      },
      { label: 'Nach dem neuen Organigramm fragen', outcomes: [o('lossSmall', 'Das Organigramm hat 14 Kästchen mehr. In jedem steht dein Name. Du bist jetzt dein eigener Vorgesetzter.')] },
    ],
    ignore: o('none', 'In drei Monaten wird zurück umstrukturiert. Die IT heißt dann wieder IT. Die Visitenkarten nicht.'),
  },
  {
    id: 'mission',
    title: 'Leitbild-Workshop',
    text: 'Die Firma braucht ein Leitbild. Ganztägiger Workshop, Anwesenheitspflicht. Das Ergebnis soll klingen wie alle anderen Leitbilder, nur besser.',
    options: [
      {
        label: 'Einen Leitbild-Generator schreiben',
        outcomes: [
          o('jackpot', 'Dein Skript würfelt Buzzwords zusammen. Der Vorstand wählt „Wir leben proaktiv ganzheitliche Synergien“. Du bekommst ein Lob und den Rest des Tages frei für Tickets.', 0.6),
          o('win', 'Dein Skript liefert „Wir synergisieren Exzellenz“. Zu ehrlich. Trotzdem angenommen.', 0.4),
        ],
      },
      { label: 'Hingehen und mitdiskutieren', outcomes: [o('loss', 'Sieben Stunden über das Wort „Kundenorientierung“. Am Ende ist es ein Komma. Die Queue ist explodiert.')] },
      { label: 'Kurzfristig „Serverprobleme“ haben', outcomes: [o('tip', 'Du hast Serverprobleme. Wirklich, du hast dir welche gesucht. Die Tickets freuen sich.')] },
    ],
    ignore: o('lossSmall', 'Ohne dich hat der Workshop beschlossen: „Die IT unterstützt jede Vision.“ Ab morgen ist das dein Problem.'),
  },
  {
    id: 'sqlcolor',
    title: 'Chef will eine SQL-Datenbank',
    text: 'Der Chef hat im Flugzeugmagazin gelesen, dass jede moderne Firma eine SQL-Datenbank braucht. Er will auch eine. Bis Freitag. Was das ist, weiß er nicht.',
    options: [
      {
        label: 'Fragen, welche Farbe sie haben soll',
        outcomes: [
          o('jackpot', 'Er denkt lange nach. „Mauve. Das hat den meisten RAM.“ Du notierst es feierlich. Bestellt wird nichts, und bis zum nächsten Magazin ist Ruhe.', 1, {
            level: 'ok',
            text: 'procurement[{pid}]: SQL-Datenbank, Farbe: mauve (wegen RAM). Status: wird geprüft. Für immer.',
          }),
        ],
      },
      { label: 'Erklären, was eine Datenbank ist', outcomes: [o('lossSmall', '45 Minuten Erklärung mit Excel als Beispiel. Er nickt. Dann fragt er, ob man die Datenbank auch ausdrucken kann.')] },
      { label: 'Einfach eine aufsetzen', outcomes: [o('rush', 'Fünf Minuten, eine leere Tabelle. Er nennt sie ab sofort „unser KI-Projekt“ und lobt das Team. Alle arbeiten beflügelt weiter.')] },
    ],
    ignore: o('tip', 'Er hat es vergessen. Im nächsten Magazin stand „Blockchain“.'),
  },
  {
    id: 'chefpw',
    title: 'Chef will das Admin-Passwort',
    text: 'Der Chef möchte „für Notfälle“ das Admin-Passwort. Er will es ins Handy schreiben. In die Notizen. Unter „Passwörter“.',
    options: [
      { label: 'Freundlich ablehnen', outcomes: [o('tip', 'Abgelehnt. Er ist beleidigt, aber die Firma ist sicher. Und du hast deine Ruhe.')] },
      { label: 'Ihm ein eigenes Konto geben', outcomes: [o('win', 'Er hat jetzt ein Konto namens „admin-chef“. Es darf nichts. Er ist sehr stolz darauf.')] },
      {
        label: 'Passwort geben',
        outcomes: [o('fire', 'Er hat es versehentlich in die Familiengruppe geschickt. Alle Passwörter werden geändert. Die Tante hat gefragt, was „sudo“ ist.')],
      },
    ],
    ignore: o('lossSmall', 'Er hat es sich selbst „besorgt“. Über den Praktikanten. Zwei Stunden Aufräumen.'),
  },
  {
    id: 'kamerateam',
    title: 'Kamerateam im Büro',
    text: 'Ein Fernsehteam dreht eine Doku über „das echte Büroleben“. Der Abteilungsleiter trägt plötzlich Krawatte und duzt alle. Die Kamera steht direkt neben deinem Schreibtisch.',
    options: [
      {
        label: 'Direkt in die Kamera gucken',
        outcomes: [
          o('win', 'Du schaust lange in die Kamera, während der Chef ihr erklärt, dass er „eigentlich mehr Kumpel als Chef“ ist. Das wird die beliebteste Szene der Doku.', 0.6),
          o('tip', 'Du guckst in die Kamera. Der Kameramann guckt zurück. Ihr versteht euch ohne Worte.', 0.4),
        ],
      },
      { label: 'Ganz normal weiterarbeiten', outcomes: [o('rush', 'Du arbeitest einfach. Das Team filmt lieber den Chef, der gerade einen Witz über die Zentrale erklärt. Niemand stört dich.')] },
      { label: 'Dem Chef die Show stehlen', outcomes: [o('lossSmall', 'Du erzählst einen Witz. Er kommt gut an. Der Chef erzählt den gleichen Witz nochmal, lauter. Die nächste Stunde gehört ihm.')] },
    ],
    ignore: o('none', 'Das Team dreht ohne dich. In der Doku sieht man nur deinen Hinterkopf und ein klingelndes Telefon.'),
  },
  {
    id: 'standort',
    title: 'Gerücht: Standort zu',
    text: 'Auf dem Flur heißt es: Die Zentrale legt Standorte zusammen. Der Abteilungsleiter versichert allen, dass nichts passiert. Er hat dabei sehr rote Ohren.',
    options: [
      { label: 'Das Netz sauber dokumentieren', outcomes: [o('win', 'Du dokumentierst alles. Die Zentrale ist beeindruckt und lässt den Standort, wo er ist. Der Abteilungsleiter erzählt, er habe das verhandelt.')] },
      { label: 'Den Chef beruhigen', outcomes: [o('lossSmall', 'Der Chef hält dir einen Vortrag über Loyalität, Teamgeist und seinen alten Sportverein. 40 Minuten. Am Ende umarmt er dich.')] },
      { label: 'In den Papierkorb gucken', outcomes: [o('tip', 'Drei Bewerbungen im Papierkorb. Eine davon vom Chef. Du sagst nichts. Er weiß, dass du es weißt. Du hast eine Woche Ruhe.')] },
    ],
    ignore: o('fire', 'Alle schreiben Bewerbungen statt Tickets. Die Queue wächst. Am Ende war es nur ein Gerücht.'),
  },
  {
    id: 'betriebsfeier',
    title: 'Betriebsfeier',
    text: 'Der Abteilungsleiter organisiert die Feier selbst. Programmpunkt eins: seine Rede. Punkt zwei: Karaoke, er fängt an. Du sollst Beamer und Mikrofon machen.',
    weight: (_s, d) => (d.getMonth() === 11 ? 3 : 1),
    options: [
      { label: 'Technik aufbauen', outcomes: [o('win', 'Beamer läuft, Mikro läuft. Der Chef singt drei Lieder. Die Abteilung dankt dir still für den Lautstärkeregler, den nur du bedienen kannst.')] },
      {
        label: 'Mikro „leider kaputt“',
        outcomes: [
          o('tip', 'Das Mikro ist „kaputt“. Der Chef hält seine Rede ohne. Man versteht jeden dritten Satz. Bester Abend des Jahres.', 0.5),
          o('lossSmall', 'Der Chef hat ein Ersatzmikro dabei. Aus dem Kofferraum. Er hat immer eins dabei.', 0.5),
        ],
      },
      { label: 'Dienstlich verhindert sein', outcomes: [o('rush', 'Du hast „einen Serverausfall“. Allein im Büro, die Queue für dich. Ruhigster Abend seit Monaten.')] },
    ],
    ignore: o('lossSmall', 'Ohne Technik nimmt der Chef einen Bluetooth-Lautsprecher. Der ist mit dem Konferenzraum verbunden. Das Vorstandsmeeting dort ist jetzt vorbei.'),
  },
];

/** „!! DRINGEND !!“-Ticket erwischt: Texte je Effekt */
export const URGENT_TEXT: Record<string, string[]> = {
  win: [
    'VIP-Ticket vom Vorstand in 2 Sekunden gelöst. Beförderung: nein. Tickets: ja.',
    'Chef-Ticket erledigt, bevor er aufgelegt hat. Er hält das jetzt für normal.',
    'Erledigt. Der Vorstand hat „Danke“ gesagt. Das Protokoll vermerkt es.',
  ],
  overtime: ['Adrenalin! Du tippst eine Weile siebenmal so schnell.', 'Puls 140, Finger glühen. Eine Weile tippst du siebenmal so schnell.'],
  flow: ['Du bist im Flow. Die ganze Abteilung läuft dreifach.', 'Das hat sich rumgesprochen. Alle arbeiten plötzlich dreimal so schnell. Für eine Weile.'],
};

export const URGENT_LABELS = ['!! DRINGEND !!', '!! VIP !!', '!! CHEF !!', '!! PROD DOWN !!', '!! ASAP !!', '!! GESTERN !!', '!! SEHR WICHTIG !!'];

/** Anzeigenamen der Boosts/Bremsen im Header */
export const BUFF_LABELS: Record<string, string> = {
  rush: 'Rückenwind',
  flow: 'Flow',
  overtime: 'Überstunden',
  fire: 'Es brennt',
  fireBig: 'Alles brennt',
  espresso: 'Doppelter Espresso',
};

/** Was ein Boost oder eine Bremse tut (Antippen des Chips oben) */
export const BUFF_HELP: Record<string, string> = {
  rush: 'Rückenwind: Infrastruktur produziert doppelt so viel.',
  flow: 'Flow: Die ganze Abteilung läuft dreifach.',
  overtime: 'Überstunden: Du tippst siebenmal so schnell.',
  fire: 'Es brennt: Infrastruktur nur halb so schnell, bis gelöscht ist.',
  fireBig: 'Alles brennt: Infrastruktur auf ein Viertel. Einfach weitertippen.',
  espresso: `Doppelter Espresso: Taste gedrückt halten, dann tippt es von selbst. ${CONFIG.espresso.rate}-mal pro Sekunde. Das schafft keine Hand.`,
};
