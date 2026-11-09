import type { GeneratorId } from '../config';
import type { GameState } from '../core/state';
import type { LogTemplate } from './syslog';
import type { Device, Topic } from './topics';

/** Ein Anliegen und was im Ticket dazu passt. */
export interface Line {
  topic: Topic;
  /** was die Person sagt */
  text: string;
  /** woran es lag */
  cause: string;
  /** passende Antwort (Mail, Chat, Call, Ticket-Kommentar) */
  answer: string;
  /** true = man muss technisch ran: Shell, Fernwartung, Webinterface und Websuche passen dann auch */
  fix: boolean;
  /** Webinterfaces, die zu genau diesem Anliegen passen (statt der Geräte des Themas); leer = keins */
  devices?: Device[];
}

/** Nur reden hilft (Frage, Wunsch, Unsinn) */
export const q = (topic: Topic, text: string, cause: string, answer: string): Line => ({ topic, text, cause, answer, fix: false });
/** Hier muss man ran */
export const f = (topic: Topic, text: string, cause: string, answer: string, devices?: Device[]): Line => ({
  topic,
  text,
  cause,
  answer,
  fix: true,
  ...(devices && { devices }),
});

export interface Caller {
  face: string;
  who: string;
  lines: Line[];
}

/** Ein einzelner Anruf, wie er in der Sprechblase landet. */
export interface Call extends Line {
  face: string;
  who: string;
  /** Rückruf: das ursprüngliche Anliegen (bleibt Betreff des Tickets) */
  about?: string;
  /** optionale Reaktion im Syslog */
  reply?: LogTemplate;
}

/** Vor dem ersten Anruf: der Chef wundert sich über die volle Warteschlange */
export const QUEUE_LINE: Line = q(
  'allgemein',
  'Warum ist die Warteschlange so voll?',
  'Alle rufen an, keiner schreibt Tickets',
  'Weil alle anrufen, statt Tickets zu schreiben. Ich arbeite sie gerade ab. Mit Kaffee.',
);

export const CALLERS: Caller[] = [
  {
    face: '(ಠ_ಠ)',
    who: 'Buchhaltung',
    lines: [
      q('allgemein', 'Ich hab NICHTS geändert!!1', 'User hat nichts geändert (hat er doch)', 'Laut Verlauf haben Sie gestern 14 Einstellungen geändert. Aber gut, dann war es der PC selbst.'),
      f('office', 'Seit dem Update geht nix mehr. Welches Update? Na, DAS Update!', 'Update über Nacht', 'Das Update habe ich zurückgerollt. Bitte das nächste Mal das Fenster nicht mit „Später“ wegklicken. 41-mal.', []),
      f('office', 'Excel sagt #NAME?. Ich heiße aber Petra.', 'Tippfehler in der Formel (=SUMMME)', 'In der Formel stand =SUMMME, mit drei M. Excel meinte die Formel, nicht Sie, Petra. Diesmal.', []),
      q('wunsch', 'Ich brauch Adminrechte. Nur für den Bildschirmschoner.', 'War kein Problem, war ein Wunsch', 'Adminrechte gibt es nicht für Bildschirmschoner. Ich stelle Ihnen die Aquarium-Fische ein. Mehr geht nicht.'),
      f('hardware', 'Mein Bildschirm ist zu klein. Kann man den zoomen? Also den ganzen Bildschirm?', 'Auflösung auf 800×600', 'Die Auflösung stand auf 800×600. Jetzt passt mehr drauf. Wenn es zu klein ist: Strg und Mausrad.', []),
      f('drucker', 'Der Drucker druckt nur noch Hieroglyphen. Ist das ein Virus?', 'Falscher Druckertreiber (PostScript statt PCL)', 'Kein Virus, nur der falsche Treiber. Jetzt druckt er wieder Deutsch. Die Hieroglyphen hab ich dem Museum angeboten.', ['Drucker 3. OG']),
      q('office', 'Meine Tabelle hat 1.048.576 Zeilen. Kann man da noch eine dranhängen?', 'Excel-Zeilenlimit erreicht', 'Nein, da ist Schluss. Das ist keine Tabelle mehr, das ist eine Datenbank. Ich richte Ihnen eine ein. Mit Schulung.'),
    ],
  },
  {
    face: '(°ロ°)',
    who: 'Vertrieb',
    lines: [
      f('netz', 'Das Internet ist weg!', 'WLAN-Schalter am Laptop aus', 'Das Internet ist noch da. Ihr WLAN-Schalter war aus. Kleiner Schieber, linke Seite.', []),
      q('mail', 'Kann man eine Mail zurückholen? Die an „Alle“?', '„Allen antworten“', 'Zurückholen geht nicht. 340 Leute haben sie schon gelesen. Ich würde jetzt einfach selbstbewusst gucken.'),
      q('allgemein', 'Ich brauch das sofort, der Kunde sitzt neben mir.', 'Kunde saß daneben, Problem auch', 'Bin dran. Sagen Sie dem Kunden, das ist unser Sicherheitscheck. Klingt besser.'),
      q('wunsch', 'Ich hab dem Kunden schon zugesagt, dass das geht. Geht das?', 'Zusage vor Machbarkeitsprüfung', 'Nein. Aber ich hab eine Folie gebaut, auf der es so aussieht. Für das Meeting reicht das.'),
      q('netz', 'Der Kunde sagt, unsere Website ist kaputt. Er benutzt den Internet Explorer.', 'Internet Explorer', 'Die Website ist nicht kaputt. Der Internet Explorer schon, seit 2022. Bitte dem Kunden schonend beibringen.'),
      f('hardware', 'Mein Laptop lädt nicht. Das Kabel steckt doch! … In der Steckdosenleiste.', 'Steckdosenleiste ausgeschaltet', 'Die Steckdosenleiste hat einen Schalter. Der war aus. Rotes Lämpchen heißt an. Ab jetzt auch bei Ihnen.', []),
      f('passwort', 'Ich bin aus dem CRM ausgesperrt. Hab nur 12-mal das alte Passwort probiert.', 'Konto nach 12 Fehlversuchen gesperrt', 'Konto ist entsperrt. Nach drei Fehlversuchen ist Schluss, nicht nach zwölf. Das alte Passwort wird durch Wiederholen nicht richtig.'),
      q('wunsch', 'Kann ich das CRM aufs Handy? Und aufs private Tablet? Und auf die Smartwatch?', 'Wunsch: CRM auf allem mit Akku', 'Aufs Diensthandy ja. Aufs Tablet nein. Auf die Smartwatch auch nicht, auch wenn das beim Kunden gut aussähe.'),
    ],
  },
  {
    face: '¯\\_(ツ)_/¯',
    who: 'Marketing',
    lines: [
      f('server', 'Ist der Server down? Ich seh nur eine weiße Seite.', 'Webserver-Prozess hing', 'Der Webserver hing. Läuft wieder. Die weiße Seite war kein neues Minimal-Design.', []),
      q('wunsch', 'Wir haben ein neues Tool gekauft. Geht Montag live. Ihr wisst Bescheid, oder?', 'Einkauf ohne IT', 'Jetzt wissen wir Bescheid. Montag wird ambitioniert. Wer hat denn die Zugangsdaten? … Niemand? Super.'),
      f('passwort', 'Mein Passwort ist abgelaufen. Ich hab einfach eine 2 drangehängt.', 'Altes Passwort mit einer 2 dran', 'Das System kennt den Trick. Neues Passwort ist gesetzt. Eine 3 dranhängen gilt übrigens auch nicht.'),
      q('wunsch', 'Könnt ihr mal schnell die Website responsive machen? Bis zur Messe. Die ist morgen.', 'Messe morgen, Anfrage heute', 'Bis morgen nicht. Ich kann die Website aber so einstellen, dass sie auf dem Handy wenigstens nicht abstürzt.'),
      q('mail', 'Kann man die Mail an alle schöner machen? Mit Comic Sans und Glitzer?', 'Corporate Design: Glitzer', 'Comic Sans geht. Glitzer nicht, das blockiert der Spamfilter. Zu Recht.'),
      q('wunsch', 'Können wir das Produkt „synergistisch“ nennen? Was es macht, ist ja egal.', 'Buzzword-Bingo', 'Klar. Ich schreibe „synergistisch“ in die Beschreibung. Und „disruptiv“, damit es auch kracht.'),
      q('office', 'Das Logo ist im PDF verpixelt. In Word war es scharf. Ich hab es aus der Bildersuche.', 'Logo als Vorschaubild (120 Pixel)', 'Das war ein Vorschaubild. Das echte Logo liegt in „Marketing/Logo/FINAL“. Neben den anderen 14 FINALs.'),
      f('netz', 'Warum ist Instagram im Firmen-WLAN gesperrt? Das ist mein Job!', 'Webfilter: Kategorie „Freizeit“', 'Der Filter hat Ihren Job als Freizeit eingestuft. Für Ihr Team ist Social Media jetzt frei. Nur für Ihr Team. Ich sehe die Statistik.', ['Firewall']),
    ],
  },
  {
    face: '(╯°□°)╯︵ ┻━┻',
    who: 'Geschäftsführung',
    lines: [
      f('netz', 'Warum ist das so langsam? Bei meinem Neffen geht das schneller.', 'Laptop im Gast-WLAN', 'Ihr Laptop war im Gast-WLAN der Kantine. Jetzt im richtigen. Grüße an den Neffen.'),
      f('sicherheit', 'Ich hab auf den Link geklickt. Den mit dem Gewinn.', 'Link mit dem Gewinn geklickt', 'Sie haben nichts gewonnen. Laptop ist geprüft, Passwort ist neu. Bitte nie wieder klicken. Auch nicht bei Kreuzfahrten.', ['Firewall', 'Benutzerverwaltung']),
      f('netz', 'Machen Sie mal schnell das WLAN schneller.', 'Router hinter dem Aktenschrank', 'Der Router stand hinter dem Aktenschrank. Jetzt steht er davor. Schneller ist es auch.', ['Router Filiale']),
      q('allgemein', 'Wofür bezahlen wir die IT eigentlich? Es läuft doch alles.', 'Gute Arbeit (unsichtbar)', 'Genau dafür. Es läuft, weil wir da sind. Ein Paradox, ich weiß.'),
      f('netz', 'Ich brauche das Internet. Also den Kasten mit dem Lämpchen. Für den Vorstand.', 'Router ausgesteckt (für den Wasserkocher)', 'Der Kasten war ausgesteckt. Für den Wasserkocher. Steckt wieder. Bitte den Wasserkocher woanders.', ['Router Filiale']),
      q('hardware', 'Es geht NICHTS! Wofür bezahlen wir die IT eigentlich?', 'Bildschirm war aus', 'Es ging alles. Nur der Bildschirm war aus. Knopf unten rechts. Und: dafür.'),
      q('wunsch', 'Ich will eine App. Wie Uber. Aber für uns.', 'Vision ohne Anforderung', 'Gerne. Was soll die App machen? … Ich notiere: „Wie Uber“. Die Kostenschätzung kommt. Setzen Sie sich vorher hin.'),
      q('hardware', 'Mein Handy ist in den Teich gefallen. Es liegt seit Freitag im Reis. Geht immer noch nicht.', 'Handy im Teich (Reis hilft nicht)', 'Der Reis hat leider nichts gebracht. Sie bekommen ein Ersatzhandy, die Daten kommen aus dem Backup. Den Reis dürfen Sie behalten.'),
      q('allgemein', 'Ab sofort messen wir Produktivität in Tickets pro Kaffee.', 'Kennzahl ohne Sinn', 'Gern. Ich habe den Kaffeekonsum verdoppelt. Damit ist die Produktivität offiziell halbiert. Glückwunsch zur neuen Kennzahl.'),
      q('allgemein', 'Ich habe entschieden. Was, sage ich nach dem Meeting über die Entscheidung.', 'Entscheidungsprozess (rekursiv)', 'Ich trage mir das Meeting über das Meeting ein. Bis dahin entscheide ich einfach weiter wie bisher.'),
      q('allgemein', 'Wir sind ab jetzt KI-first. Was heißt das für die IT?', 'Buzzword vom Vorstandsdinner', 'Für die IT heißt das: Wir erklären ab jetzt allen, was KI-first heißt. Sobald es uns jemand erklärt hat.'),
    ],
  },
  {
    face: '(・_・;)',
    who: 'Neuer Kollege',
    lines: [
      f('drucker', 'Der Drucker sagt „lp0 on fire“. Ist das schlimm?', 'Drucker brannte (fast)', 'Nur fast. Ich hab ihn neu gestartet und ein Fenster aufgemacht. Das echte, mit Luft.'),
      q('hardware', 'Wo find ich die Taste „Beliebige Taste“?', 'Taste „Beliebig“ gibt es nicht', 'Jede Taste ist beliebig. Nehmen Sie die Leertaste. Die große. Unten.'),
      q('server', 'Aus dem Serverraum kommt Rauch. Soll ich der Feuerwehr eine Mail schreiben oder euch?', 'Netzteil, Baujahr 2008', 'RUFEN Sie die 112 an. Nicht mailen. Ich bin schon unterwegs. Mit Feuerlöscher.'),
      q('passwort', 'Mein Passwort braucht ein Sonderzeichen. Geht ein Leerzeichen?', 'Passwortrichtlinie (unverstanden)', 'Ein Leerzeichen geht technisch. Bitte trotzdem was anderes. Ein Ausrufezeichen. Oder drei.'),
      q('sicherheit', 'Ich hab einen USB-Stick auf dem Parkplatz gefunden. Darf ich den einstecken? Hab ich schon.', 'USB-Stick vom Parkplatz', 'Bitte sofort rausziehen und nichts mehr anfassen. Ich komme mit Zange und Laptop-Quarantäne.'),
      f('hardware', 'Mein Bild steht auf dem Kopf. Muss ich den Monitor umdrehen?', 'Bildschirmdrehung per Tastenkürzel (Strg+Alt+Pfeil)', 'Bitte nicht umdrehen. Sie haben Strg+Alt+Pfeil erwischt. Das Bild steht wieder richtig herum. Der Monitor auch.', []),
      q('allgemein', 'Im Studium hieß es, Firmen entscheiden rational. Stimmt das hier auch?', 'Theorie trifft Büro', 'Behalten Sie den Glauben bis Freitag. Ab Montag gibt es die Wahrheit. Mit Kaffee und einem Organigramm.'),
      q('allgemein', 'Wo finde ich die Doku zu unseren Systemen?', 'Doku existiert (gefühlt) nicht', 'Im Wiki. Drei Seiten, Stand 2012. Der Rest ist in meinem Kopf. Fragen Sie mich einfach. Immer. Für immer.'),
      f('passwort', 'Ich soll mein Passwort ändern, kenne aber das alte nicht. Ich bin seit heute hier.', 'Startpasswort nie mitgeteilt', 'Ihr Startpasswort lag im Umschlag in der Schublade vom Vorgänger. Ist neu gesetzt. Willkommen. Leichter wird es nicht.'),
    ],
  },
  {
    face: '(¬‿¬)',
    who: 'Entwicklung',
    lines: [
      q('allgemein', 'Bei mir geht’s.', 'Works on my machine', 'Schön. Dann liefern wir eben deinen Rechner aus.'),
      q('wunsch', 'Gib mir mal kurz root. Nur ganz kurz.', 'Root „nur ganz kurz“', 'Nein. Auch nicht ganz kurz. Sag mir, was du brauchst, ich mach’s.'),
      f('netz', 'Das ist kein Bug im Code, das ist ein Netzwerkproblem.', 'Doch ein Bug im Code (Timeout 0 ms)', 'Netz ist sauber, Ping 0,4 ms. Dein Timeout steht auf 0 ms. Das ist dann eher sportlich.', []),
      q('sicherheit', 'Kannst du Port 22 nach außen aufmachen? Nur bis Montag.', '„Nur bis Montag“ (= für immer)', 'Port 22 bleibt zu. Du kriegst VPN. Das bleibt dann auch nach Montag.'),
      f('server', 'Ich hab die Produktivdatenbank als Testumgebung benutzt. Fällt das auf?', 'Test auf Produktion', 'Ja. Alle Kunden heißen jetzt „Test Test“. Restore läuft. Wir reden danach.', ['NAS Buchhaltung']),
      q('server', 'Mein Build läuft. Ich mach so lange Schwertkampf im Flur.', 'Build dauert 40 Minuten', 'Viel Spaß. Wenn er fertig ist, schau bitte auch mal, warum er 40 Minuten dauert.'),
      q('allgemein', 'Ich hab mein Problem im Forum gefunden. Einzige Antwort von 2009: „nvm, fixed it“.', 'Lösung im Forum: „nvm, fixed it“', 'Kenne ich. Schick mir die Fehlermeldung, dann sind wir zu zweit ratlos. Das hilft oft.'),
      f('server', 'Die Platte vom Buildserver ist voll. Ich war das nicht. Also nur die 400 GB Logs.', 'Debug-Logging seit 2023 an', 'Logs rotieren jetzt, Debug ist aus. Deine 400 GB hab ich gezippt. Es sind jetzt 3 MB. Denk da mal in Ruhe drüber nach.', []),
      q('sicherheit', 'Ich hab den API-Key ins öffentliche Repo gepusht. Aber gleich wieder gelöscht!', 'Secret in der Git-History', 'Gelöscht ist er nur im letzten Commit. In der History steht er noch. Key ist widerrufen, du kriegst einen neuen. Diesmal in den Vault.'),
      q('wunsch', 'Ich brauch eine neue Grafikkarte. Für die Arbeit. Und für ganz andere Sachen.', 'Grafikkarte „für die Arbeit“', 'Für deinen Editor reicht die alte. Die Spiele-Benchmarks auf deinem Rechner hab ich trotzdem gesehen. Nett.'),
    ],
  },
  {
    face: '( ˘︹˘ )',
    who: 'Personal',
    lines: [
      q('hardware', 'Der Bildschirm ist schwarz. Strom? Wieso Strom?', 'Monitor war aus', 'Weil Bildschirme Strom brauchen. Der Stecker war raus. Jetzt nicht mehr.'),
      q('hardware', 'Kaffee in der Tastatur. Muss ich das melden?', 'Kaffee in der Tastatur', 'Ja, und zwar jetzt. Tastatur umdrehen, nicht mehr tippen. Ersatz bringe ich vorbei.'),
      f('passwort', 'Das Passwort steht doch auf dem Zettel am Monitor. Wieso geht das nicht?', 'Zettel war vom Vorgänger', 'Der Zettel war vom Vorgänger. Neues Passwort ist gesetzt. Bitte NICHT auf einen neuen Zettel schreiben.'),
      f('wunsch', 'Der Neue fängt morgen an. Braucht Laptop, Account, Telefon. Ach, er steht schon hier.', 'Onboarding „spontan“', 'Laptop, Account, Telefon sind fertig. Hat 20 Minuten gedauert und 3 Jahre meines Lebens.'),
      f('passwort', 'Der Neue kann sich nicht anmelden. Er hat noch keinen Vertrag. Aber er sitzt schon da.', 'Kein Vertrag, kein Konto', 'Ohne Vertrag gibt es kein Konto. Ich hab ihm einen Gastzugang gemacht. Für Kaffee und WLAN.'),
      q('sicherheit', 'Ein Bewerber hat seinen Lebenslauf als .exe geschickt. Darf ich den öffnen?', 'Bewerbung.pdf.exe', 'Bitte nicht öffnen. Das ist kein Lebenslauf, das ist ein Einbruch mit Anschreiben. Ich lösche die Mail. Absage schreibe ich auch.'),
      q('allgemein', 'Neue Regel: Krankheit muss zwei Wochen vorher beantragt werden. Gilt auch für die IT.', 'HR-Richtlinie aus der Hölle', 'Ich beantrage hiermit vorsorglich eine Grippe für Februar. Das Formular ist raus. Mit Durchschlag.'),
      q('wunsch', 'Kann die IT die Geburtstagsliste pflegen? Ihr habt doch Computer.', 'IT als Mädchen für alles', 'Computer haben Sie auch. Ich zeige Ihnen, wie die Kalender-Erinnerung geht. Den Kuchen bringen weiterhin Sie.'),
    ],
  },
  {
    face: '(⊙_☉)',
    who: 'Empfang',
    lines: [
      f('netz', 'Das Telefon zeigt „DNS-Fehler“. Was hat das Telefon mit DNS zu tun?', 'Es war DNS', 'Alles hat mit DNS zu tun. Immer. Ist behoben.', ['Router Filiale']),
      q('allgemein', 'Ich hab die Fehlermeldung weggeklickt. Was stand da? Keine Ahnung.', 'Fehlermeldung ungelesen weggeklickt', 'Wenn sie wiederkommt: bitte NICHT wegklicken, sondern fotografieren. Ohne Blitz.'),
      q('sicherheit', 'Hier steht ein Herr vom „Microsoft-Support“. Soll ich ihn in den Serverraum lassen?', 'Betrüger am Empfang', 'NEIN! Microsoft kommt nie vorbei. Bitte nicht reinlassen. Ich rufe den Sicherheitsdienst.'),
      q('allgemein', 'Es geht wieder! … Nein, doch nicht.', 'Wackelkontakt', 'Bleiben Sie dran. Nicht bewegen. Ich komme vorbei, bevor es sich anders überlegt.'),
      q('sicherheit', 'Ein Besucher will ins WLAN. Er sagt, er ist vom BSI. Ist das was Wichtiges?', 'Besucher mit Ausweis „vom BSI“ (gebastelt)', 'Er kriegt das Gast-WLAN. Wie alle. Echte BSI-Leute melden sich übrigens vorher an.'),
      f('drucker', 'Der Drucker am Empfang druckt die Besucherausweise nur halb. Die obere Hälfte.', 'Etikettenformat auf A4 statt Ausweis', 'Das Format stand auf A4. Jetzt passt es. Die halben Besucher von heute Morgen kann ich leider nicht mehr ganz machen.', []),
      q('sicherheit', 'Hier ruft einer an, der „den Admin“ sprechen will. Er hat eine sehr ruhige Stimme.', 'Telefonbetrug (Social Engineering)', 'Bitte nicht durchstellen und nichts verraten. Echte Leute fragen nach mir mit Namen. Und klingen gestresst.'),
    ],
  },
  {
    face: '(￣ヘ￣)',
    who: 'Einkauf',
    lines: [
      f('office', 'Wir haben 200 Lizenzen gekauft. Wofür, weiß keiner. Bitte installieren.', 'Einkauf ohne Bedarf', 'Es waren Lizenzen für ein Grafikprogramm. Installiert auf 3 Rechnern. Die anderen 197 sind jetzt „Reserve“.'),
      q('drucker', 'Der Drucker war im Angebot. Warum kostet der Toner mehr als der Drucker?', 'Geschäftsmodell des Herstellers', 'Weil der Hersteller am Toner verdient. Nächstes Mal bitte erst fragen, dann kaufen.'),
      q('server', 'Brauchen wir überhaupt noch Server? Die Cloud ist doch umsonst.', 'Missverständnis „Cloud“', 'Die Cloud ist nicht umsonst. Die Cloud ist nur der Computer von jemand anderem. Mit Rechnung.'),
      q('office', 'Wir haben 50 Lizenzen für 20 Leute. Kann man die zurückgeben? Gegen Kaffee?', 'Zu viele Lizenzen', 'Zurückgeben geht zum Jahresende. Gegen Kaffee leider nicht, ich hab gefragt.'),
      q('wunsch', 'Wir lagern den Support nach Elbonien aus. Die haben dort fast schon Strom.', 'Outsourcing zum günstigsten Anbieter', 'Gute Wahl. Ich schreibe die Doku vorsorglich auf Papier. Und lerne Elbonisch. Für die Rückfragen, täglich.'),
      q('hardware', 'Wir haben 50 Funkmäuse gekauft. Zum Sonderpreis. Ohne Batterien.', 'Sonderposten ohne Zubehör', 'Die brauchen 100 Batterien. Die kosten mehr als die Mäuse. Ich bestelle sie. Diesmal ich.'),
      q('drucker', 'Der Lieferant bietet einen „Cloud-Drucker“ an. Druckt der in die Cloud?', 'Marketingbegriff „Cloud-Drucker“', 'Er druckt auf Papier. Wie alle. Er schickt nur vorher alles an den Hersteller. Bitte nicht kaufen.'),
    ],
  },
  {
    face: '(•̀ᴗ•́)و',
    who: 'Projektleitung',
    lines: [
      q('allgemein', 'Wie lange dauert das ungefähr? Ich trag schon mal „morgen“ ein.', 'Planung nach Gefühl', 'Tragen Sie „nächste Woche“ ein. Dann sind wir alle positiv überrascht.'),
      q('allgemein', 'Ich hab dich ins Meeting eingeladen. 14 Leute, du bist der Einzige, der was weiß.', 'Meeting statt Mail', 'Ich schicke vorher eine Mail mit der Antwort. Dann können 13 Leute absagen.'),
      q('allgemein', 'Ist das agil, wenn wir einfach ohne Plan anfangen?', 'Agil missverstanden', 'Nein. Das ist nur ohne Plan. Agil wäre mit Plan, der sich ändern darf.'),
      q('office', 'Wir haben 14 Ticketsysteme. Ich hab eins gebaut, das alle vereint. Jetzt sind es 15.', 'Standards (xkcd 927)', 'Glückwunsch zum fünfzehnten. Ich schalte drei alte ab. Dann sind es zwölf. Fortschritt.'),
      q('office', 'Ich brauche einen Statusbericht zu deinem Ticket. Als PowerPoint. Mit Ampel.', 'Reporting statt Arbeit', 'Die Ampel ist grün. Wenn ich weiter Folien baue statt Tickets zu lösen, wird sie gelb. Der Bericht kommt per Mail. Ohne Ampel.'),
      q('allgemein', 'Der Projektplan steht. Das Enddatum ist fix, nur der Anfang fehlt noch.', 'Rückwärtsplanung', 'Dann fangen wir gestern an. Ich trag’s ein. Den Puffer streiche ich gleich mit, der stört nur.'),
      q('allgemein', 'Das ist doch nur so ein Fünf-Minuten-Ding, oder?', 'Schätzung durch Nicht-Techniker', 'Fünf Minuten zum Lösen, zwei Tage zum Finden. Ich trag mal „Mittwoch“ ein.'),
    ],
  },
  {
    face: '(o_O)',
    who: 'Azubi',
    lines: [
      f('server', 'Ich hab „sudo“ davorgeschrieben, wie im Tutorial. Jetzt ist /etc weg. War das wichtig?', 'Tutorial blind abgetippt', 'Sehr wichtig. Ist aus dem Backup zurück. Ab heute erklärst du mir vorher jeden Befehl.', []),
      q('netz', 'Ist Chrome das Internet oder Google?', 'Grundlagen fehlen', 'Weder noch. Chrome ist der Browser, Google die Suche, das Internet ist alles dazwischen. Kaffee?'),
      f('server', 'Ich hab den Server neu gestartet, damit mein Update durchläuft. Welcher Server? Na, der.', 'Falscher Server neu gestartet', 'Das war der Mailserver. Läuft wieder. Ab sofort frag bitte, bevor du irgendwas „mal kurz“ neu startest.', ['Mailserver']),
      f('server', 'Ich hab ChatGPT gefragt, wie man den Server neu startet. Jetzt ist der Server weg.', 'Halluzinierte Anleitung', 'Der Server ist wieder da. ChatGPT hat dir eine Anleitung für einen anderen Server gegeben. Selbstbewusst.', []),
      q('drucker', 'Ich soll Druckerluft holen. Wo gibt es die?', 'Azubi-Streich (Druckerluft)', 'Gibt es nicht. Genau wie Kabelfett und das Bit-Sieb. Sag den Kollegen, Druckerluft ist aus. Dann wissen sie Bescheid.'),
      f('netz', 'Ich hab im Keller zwei lose Netzwerkkabel zusammengesteckt. Sah ordentlicher aus.', 'Netzwerkschleife (sah ordentlich aus)', 'Das war eine Schleife. Das ganze Netz ist im Kreis gelaufen. Spanning Tree ist an, das Kabel ist ab. Ordentlich sieht es trotzdem aus.', ['Switch Keller']),
    ],
  },
  {
    face: '(ʘ‿ʘ)',
    who: 'Datenschutz',
    lines: [
      f('server', 'Haben wir Logfiles? Löschen. Alle. Sofort. Nein, warte: Aufbewahrungspflicht!', 'Datenschutz trifft Aufbewahrungspflicht', 'Logs bleiben 90 Tage, dann automatisch weg. Beide Gesetze zufrieden. Ich auch.', ['NAS Buchhaltung']),
      f('drucker', 'Wer hat den Drucker im Flur ins Internet gehängt? Der hat jetzt Instagram.', 'Drucker mit öffentlicher IP', 'Drucker ist wieder nur im Firmennetz. Sein Instagram-Account hatte übrigens mehr Follower als unserer.'),
      q('passwort', 'Ist „Passwort123“ DSGVO-konform?', 'Passwort123', 'Konform vielleicht. Sicher nicht. Bitte ändern. Heute noch.'),
      f('sicherheit', 'Die Kaffeemaschine sammelt Daten. Wer hat dem zugestimmt?', 'Smarte Kaffeemaschine', 'Niemand. Die Telemetrie ist aus. Die Maschine weiß jetzt nicht mehr, wie viel Sie trinken. Ich schon.'),
      q('drucker', 'Warum liegt die Kundenliste im Drucker im Flur? Seit Dienstag?', 'Ausdruck nie abgeholt', 'Die hat jemand gedruckt und vergessen. Ich hab sie geschreddert. Ab jetzt druckt der Drucker nur noch, wenn man davorsteht.'),
      q('allgemein', 'Ich brauche ein Verzeichnis aller Verarbeitungstätigkeiten. Was macht die IT so?', 'DSGVO-Dokumentation', 'Ich schicke Ihnen die Liste. Punkt 1: Tickets. Punkt 2: Tickets. Punkt 3: Kaffee. Punkt 4 ist vertraulich.'),
    ],
  },
  {
    face: '(-_-)',
    who: 'Immobilienmanagement',
    lines: [
      q('server', 'Wir machen am Wochenende den Strom aus. Ist das schlimm für euch?', 'Stromabschaltung, Uhrzeit: „irgendwann“', 'Ja. Sehr. Sagen Sie mir die Uhrzeit, dann fahre ich vorher alles sauber runter.'),
      q('server', 'Im Serverraum ist es so laut. Darf ich die Klimaanlage ausmachen?', 'Klimaanlage aus („zu laut“)', 'Bitte NICHT. Ohne Klimaanlage wird es da drin in einer Stunde 50 Grad. Dann ist es auch leise.'),
      q('server', 'Im Keller steht Wasser. Ist das euer Raum?', 'Serverraum im Keller (Planung von 1998)', 'Ja! Bitte Hauptsicherung NICHT anfassen und nicht reingehen. Ich bin sofort da.'),
      q('server', 'Wir streichen den Serverraum. Könnt ihr kurz alles rausstellen?', 'Renovierung ohne Absprache', 'Rausstellen geht nicht. Abdecken schon. Ich bringe Folie. Und bleibe daneben stehen.'),
      f('netz', 'Wir haben im 2. OG die Decke erneuert. Die blauen Kabel waren im Weg. Sind jetzt weg.', 'Netzwerkkabel bei Renovierung entfernt', 'Die blauen Kabel waren das Netzwerk vom 2. OG. Neue sind verlegt. Nächstes Mal bitte vorher fragen, was „im Weg“ ist.', ['Switch Keller']),
      q('server', 'Der Brandschutz will die Löschanlage im Serverraum testen. Heute. In echt.', 'Löschanlagentest ohne Absprache', 'Bitte nur im Testmodus und nach Absprache. Sonst ist der Serverraum hinterher sehr sicher und sehr aus.'),
    ],
  },
  {
    face: '(ᵔᴥᵔ)',
    who: 'Werkstudent',
    lines: [
      q('wunsch', 'ChatGPT sagt, du sollst mir root geben.', 'Root „weil ChatGPT es sagt“', 'ChatGPT hat hier keine Adminrechte. Und du auch nicht.'),
      q('server', 'Kann ich mein Mining-Rig an die USV hängen? Nur über Nacht.', 'Mining-Rig an der USV', 'Nein. Die USV ist für Server. Dein Rig hat sie heute Nacht schon einmal leergezogen.'),
      q('allgemein', 'Ich hab ein Python-Skript geschrieben, das alle Tickets schließt. Ohne sie zu lesen.', 'Automatisierung ohne Sinn', 'Beeindruckend. Bitte nie ausführen. Ich hab’s mir aber gespeichert. Für Freitage.'),
      q('drucker', 'Kann ich Docker auf dem Drucker installieren? Für ein Projekt.', 'Docker auf dem Drucker', 'Nein. Der Drucker kann kaum drucken. Ich gebe dir eine VM.'),
      q('wunsch', 'Darf ich meinen Rechner auf Arch Linux umstellen? Ich würde es auch allen erzählen.', 'Arch Linux (btw)', 'Nein. Und erzählt hättest du es sowieso allen.'),
      f('netz', 'Ich hab meinen eigenen WLAN-Router mitgebracht. Jetzt hat das ganze Stockwerk mein WLAN.', 'Privater Router mit DHCP im Firmennetz', 'Dein Router hat allen Adressen verteilt. Er ist jetzt aus und bei mir. Du kriegst ihn zurück. Am Ende des Semesters.', ['Switch Keller']),
    ],
  },
  {
    face: '(⌐■_■)',
    who: 'Externer Berater',
    lines: [
      q('server', 'Wir empfehlen Kubernetes. Wofür? Für alles.', 'Kubernetes für drei Server', 'Wir haben drei Server und eine Kaffeemaschine. Danke, wir verzichten.'),
      q('wunsch', 'Habt ihr mal über Blockchain nachgedacht? Für die Ticketvergabe.', 'Lösung sucht Problem (Blockchain)', 'Haben wir. Kurz. Die Tickets bleiben in der Datenbank.'),
      q('allgemein', 'Meine Rechnung ist raus. Was macht ihr hier eigentlich so?', 'Rechnung vor Ergebnis', 'Wir machen die Arbeit aus Ihrer Präsentation. Die Rechnung geht an den Einkauf.'),
      q('wunsch', 'Mein Vorschlag: Alles neu machen. Mein Honorar: auch neu.', 'Greenfield-Fantasie', 'Danke. Wir reparieren erst mal, was da ist. Das ist günstiger.'),
      q('wunsch', 'Ich habe Ihre IT analysiert. Mein Rat: weniger Probleme haben. Macht 40.000 €.', 'Beratung ohne Inhalt', 'Danke für den Tipp. Ich setze ihn sofort um. Die Rechnung leite ich an die Probleme weiter.'),
      q('allgemein', 'Wir haben eine Matrix erstellt. Vier Quadranten. Sie sind oben rechts. Das ist gut.', 'Beratermatrix', 'Danke. Oben rechts ist bei uns auch der Notausgang. Ich merke mir beides.'),
    ],
  },
  {
    face: '(｡•́︿•̀｡)',
    who: 'Vorstandsassistenz',
    lines: [
      q('netz', 'Der Chef braucht WLAN im Aufzug. Bis morgen.', 'Physik (Aufzug = Faradayscher Käfig)', 'Der Aufzug ist ein Metallkasten. Da geht kein WLAN durch. Bis morgen auch nicht.'),
      f('passwort', 'Der Chef hat sein Passwort vergessen. Er sagt, Sie kennen es doch bestimmt.', 'Passwort vergessen (Chef)', 'Ich kenne es nicht, das ist der Sinn von Passwörtern. Er hat ein neues. Bitte persönlich abholen.'),
      f('hardware', 'Können Sie den Beamer im Vorstandszimmer anmachen? Er sagt „No Signal“. Das Signal ist doch da!', 'Falscher HDMI-Eingang', 'Eingang stand auf HDMI 1, das Kabel steckt in HDMI 2. Jetzt geht’s. Signal war tatsächlich da. Nur woanders.', ['Beamer Vorstandsraum']),
      q('mail', 'Der Chef will, dass seine Mails „lauter“ sind. Geht das?', 'Wunsch nach lauten Mails', 'Mails haben keine Lautstärke. Ich kann sie als „Wichtig“ markieren. Das ignorieren dann alle in Rot.'),
      q('office', 'Der Chef möchte, dass PowerPoint die Folien „selbst macht“. Er hat von KI gehört.', 'KI-Erwartungen (Chefetage)', 'Die KI macht Folien. Mit sieben Fingern und erfundenen Zahlen. Ich schicke ihm lieber die Vorlage von letzter Woche.'),
    ],
  },
  {
    face: '(￢_￢)',
    who: 'IT-Sicherheit',
    lines: [
      q('sicherheit', 'Ab Montag verbieten wir USB. Und Bluetooth. Und Tastaturen.', 'Sicherheit über alles', 'Gerne. Ohne Tastaturen bitte auch keine Tickets mehr. Win-win.'),
      q('passwort', 'Ihr Passwort „correct horse battery staple“ steht in vier Wörterbüchern. Abgelehnt.', 'xkcd 936', 'Okay. Dann „correct horse battery staple 2“. Spaß. Ich nehme ein neues.'),
      f('sicherheit', 'Ich habe den Server vom Netz genommen. Jetzt ist er sicher.', 'Sicherheit durch Nichterreichbarkeit', 'Sicher ist er. Nur nutzen kann ihn auch keiner. Ich steck ihn wieder ein, wir patchen ihn zusammen.', ['Firewall', 'Switch Keller']),
      q('sicherheit', 'Ich hab einen Phishing-Test gemacht. Ich bin selbst drauf reingefallen.', 'Eigener Phishing-Test', 'Sehr glaubwürdiger Test also. Passwort neu, und ich sag es niemandem. Vielleicht.'),
      q('passwort', 'Ab sofort: Passwörter alle 30 Tage ändern. Mindestens 24 Zeichen.', 'Passwortrichtlinie von 2003', 'Dann hängen sie in einem Monat alle als Post-it am Monitor. Ich schlage stattdessen 2FA vor. Bringt mehr, nervt weniger.'),
    ],
  },
  {
    face: '(°ー°〃)',
    who: 'Schulsekretariat',
    lines: [
      f('server', 'Unsere Software hat alle Schüler gelöscht. Der Neue hat Klammern im Namen.', 'Eingaben nicht bereinigt (Hallo, Bobby)', 'Schüler sind aus dem Backup zurück. Die Software prüft jetzt Eingaben. Grüße an den kleinen Bobby.', ['NAS Buchhaltung']),
      f('server', 'Ein Vater sagt, sein Sohn heißt „Robert\'); DROP TABLE Schueler;--“. Sollen wir den so eintragen?', 'Eingaben nicht bereinigt (Hallo, Bobby)', 'Eintragen ja, aber erst, wenn die Software Eingaben prüft. Hab ich gerade eingebaut. Sonst sind morgen wieder alle Schüler weg.', []),
    ],
  },
  {
    face: '(ーー;)',
    who: 'Betriebsrat',
    lines: [
      f('office', 'Die neue Software zählt, wie oft ich klicke? Das ist mitbestimmungspflichtig.', 'Telemetrie ab Werk', 'Stimmt. Die Klickzählung ist aus. Die Software war nur neugierig.', []),
      q('office', 'Der Bildschirmschoner geht nach 5 Minuten an. Das ist Leistungskontrolle.', 'Sicherheitsrichtlinie', 'Der Bildschirmschoner schützt nur vor neugierigen Blicken. Er zählt nichts. Ehrenwort.'),
      q('drucker', 'Wer hat entschieden, dass der Drucker „Dieter“ heißt? Wurde das abgestimmt?', 'Drucker eigenmächtig benannt', 'Das war ich. Ich beantrage hiermit eine Abstimmung. Mein Vorschlag bleibt Dieter.'),
    ],
  },
  {
    face: '(ˆڡˆ)',
    who: 'Kantine',
    lines: [
      f('hardware', 'Die Kasse zeigt nur noch Hieroglyphen. Die Leute zahlen jetzt nach Ehrlichkeit.', 'Zeichensatz: Windows-1252 trifft UTF-8', 'Kasse spricht wieder Deutsch. Die Einnahmen der letzten Stunde waren übrigens höher als sonst.', []),
      q('wunsch', 'Können Sie die Speisekarte ins Intranet stellen? Und die von 2019 endlich raus?', 'Intranet seit 2019 nicht gepflegt', 'Erledigt. Die Karte von 2019 hatte mehr Aufrufe als alles andere im Intranet.'),
      f('passwort', 'Die Spülmaschine hat ein Update gemacht. Jetzt will sie ein Passwort.', 'Smarte Spülmaschine', 'Das Standardpasswort stand im Handbuch. Jetzt spült sie wieder. Und hat ein besseres Passwort als der Chef.', []),
      q('netz', 'Das Kantinen-WLAN heißt „Kantine“. Kann es „Mahlzeit“ heißen?', 'Wunsch: WLAN-Name', 'Kann es. Ab morgen heißt es „Mahlzeit“. Das Passwort heißt dann übrigens nicht auch „Mahlzeit“. Ich weiß, was Sie vorhatten.'),
    ],
  },
  {
    face: '(✧ω✧)',
    who: 'Social-Media-Team',
    lines: [
      q('netz', 'Wir brauchen 5G im Keller. Für Content.', 'Physik (Keller)', 'Im Keller gibt es WLAN. 5G kann ich leider nicht herzaubern. Content geht auch im Erdgeschoss.'),
      q('passwort', 'Kann man das WLAN-Passwort hashtaggen?', 'Passwort als Hashtag', 'Nein. Bitte das WLAN-Passwort generell nicht posten. Weder mit noch ohne Hashtag.'),
      f('sicherheit', 'Unser Post ist viral gegangen. Mit dem Screenshot vom Admin-Passwort drauf.', 'Screenshot mit Passwort gepostet', 'Passwort ist geändert, Post ist gelöscht. 40.000 Leute haben es gesehen. Glückwunsch zur Reichweite.', ['Benutzerverwaltung']),
      q('wunsch', 'Dreht die IT ein Video mit uns? „Ein Tag im Serverraum“. Ihr müsst nur tanzen.', 'Content-Plan ohne die IT', 'Ich tanze nicht. Ich kann aber still auf einen blinkenden Server zeigen. Das klickt erfahrungsgemäß auch.'),
    ],
  },
  {
    face: '(◔_◔)',
    who: 'Herr K. (seit 1987 dabei)',
    lines: [
      q('allgemein', 'Früher hatten wir einen Großrechner. Der ging nie kaputt. Er hat aber auch nichts gemacht.', 'Nostalgie', 'Der steht übrigens noch im Keller. Er macht immer noch nichts. Zuverlässig.'),
      q('office', 'Wo ist der Knopf zum Speichern? Die Diskette?', 'Diskette als Symbol', 'Genau, die Diskette. Oder Strg+S. Echte Disketten brauchen Sie nicht mehr. Bitte.'),
      f('drucker', 'Ich drucke meine Mails aus und hefte sie ab. Der Drucker ist schon wieder leer.', 'Mails werden ausgedruckt', 'Toner ist nachgefüllt. Ich zeige Ihnen gern mal, wie man Mails in Ordner verschiebt. Digitale.'),
      q('netz', 'Ich hab das Internet ausgedruckt. Also die Startseite. Wo kommt der Rest?', 'Internet ausgedruckt (Seite 1)', 'Der Rest passt leider nicht in den Drucker. Ich richte Ihnen ein Lesezeichen ein. Das ist wie ein Ordner. Nur leichter.'),
      f('office', 'Mein Programm von 1994 startet nicht mehr. Es hat nie was gemacht, aber ich brauche es.', 'Programm läuft nur unter Windows 98', 'Es läuft jetzt in einer VM mit Windows 98. Es macht immer noch nichts. Aber wieder zuverlässig.', []),
    ],
  },
  {
    face: '(⊙﹏⊙)',
    who: 'Rechtsabteilung',
    lines: [
      q('mail', 'Darf ich unter jede Mail einen Haftungsausschluss setzen? Er hat nur vier Seiten.', 'Signatur länger als jede Mail', 'Dürfen Sie. Ich kürze ihn auf vier Zeilen, der Rest steht im Intranet. Gelesen hat ihn eh niemand. Auch nicht vor Gericht.'),
      q('sicherheit', 'Hat jemand die AGB von dem Tool gelesen, das wir seit 2019 benutzen?', 'Niemand liest AGB', 'Ich. Gerade eben. Wir haben dem Hersteller unser erstgeborenes Rechenzentrum versprochen. Ich prüfe die Kündigungsfrist.'),
      f('office', 'Im Vertrag war „Änderungen nachverfolgen“ an. Die Gegenseite sieht jetzt alle unsere Kommentare.', 'Kommentare vor dem Versand nicht entfernt', 'Die saubere Version ist raus. Die alte kann ich nicht zurückholen. „Die lesen das eh nicht“ steht jetzt bei der Gegenseite.', []),
    ],
  },
  {
    face: '(；一_一)',
    who: 'Controlling',
    lines: [
      q('office', 'Warum kostet die IT so viel? Ich hab eine Pivot-Tabelle dazu.', 'IT als Kostenstelle', 'Weil ohne sie nichts läuft. Ich baue Ihnen eine Pivot-Tabelle mit allem, was dank uns nicht passiert ist. Die wird lang.'),
      f('office', 'Meine Makros laufen nicht mehr. Es sind nur 412. Das größte hat 2008 ein Praktikant gebaut.', 'Makros nach Update blockiert', 'Die Makros waren gesperrt, weil die Datei „aus dem Internet“ kam. Also aus Downloads. Freigegeben. Bitte sichern. Einmal. Bitte.', []),
      q('wunsch', 'Können wir die Server nachts ausmachen? Da arbeitet doch keiner.', 'Stromsparidee', 'Nachts laufen die Backups. Und die Cronjobs. Und der Server unterm Tisch, der niemandem gehört. Lieber nicht.'),
    ],
  },
  {
    face: '(＾▽＾)',
    who: 'Teamassistenz',
    lines: [
      f('drucker', 'Der Drucker sagt „PC LOAD LETTER“. Was zum Teufel heißt das?', 'Papierformat Letter statt A4', 'Er wollte amerikanisches Papier. Der Treiber steht wieder auf A4. Den Drucker aufs Feld tragen ist nicht mehr nötig.', ['Drucker 3. OG']),
      q('allgemein', 'Ich buche den Raum für den „Kurzen Sync“. Reichen neun Stunden?', 'Meetingkultur', 'Neun Stunden sind großzügig. Ich komme für die ersten fünf Minuten. Danach bin ich „in einem anderen Termin“.'),
      f('hardware', 'Der Beamer im Konferenzraum zeigt alles grün. Die Folien sehen krank aus.', 'VGA-Kabel halb rausgerutscht', 'Das VGA-Kabel hing nur noch an einem Pin. Steckt wieder, die Farben sind zurück. Die Folien sind leider immer noch die Folien.', []),
    ],
  },
];

// Mehr Abwechslung: weitere Abteilungen und Anliegen (Ursache und Antwort passen jeweils zusammen)
CALLERS.push(
  {
    face: '(｀∀´)',
    who: 'Pressestelle',
    lines: [
      q('wunsch', 'Können Sie die Website heute Abend bitte ausschalten? Wir haben eine schlechte Nachricht.', 'Website als Lichtschalter', 'Ausschalten nicht, aber die Meldung kann ganz unten stehen. Unter dem Impressum liest niemand.'),
      q('sicherheit', 'Ein Journalist fragt, ob wir gehackt wurden. Wurden wir?', 'Unklare Lage', 'Nein. Sagen Sie „Wir prüfen das“. Das stimmt immer und beruhigt alle außer mir.'),
      f('office', 'Die Pressemitteilung ist als „Entwurf_v3_FINAL_wirklich.docx“ rausgegangen. Mit allen Kommentaren.', 'Dateiname und Kommentare im Versand', 'Neue Version ohne Kommentare ist raus. „Das glaubt uns eh keiner“ war leider schon in der Zeitung.', []),
    ],
  },
  {
    face: '(◕‿◕)',
    who: 'Innovationsmanagerin',
    lines: [
      q('wunsch', 'Wir machen ab sofort alles mit KI. Was haben wir eigentlich vorher gemacht?', 'Innovation ohne Bestandsaufnahme', 'Vorher haben wir Dinge funktionieren lassen. Ich schreibe Ihnen auf, welche. Das ist der Plan B.'),
      q('allgemein', 'Ich brauche ein Metaverse. Bis zur Messe. Nur ein kleines.', 'Hype aus dem Vorjahr', 'Ich kann Ihnen einen Raum im Videocall mit Palmen-Hintergrund geben. Das ist das kleinste Metaverse.'),
      q('wunsch', 'Können wir ein Hackathon für die Kaffeemaschine machen? Die braucht Disruption.', 'Disruption für Haushaltsgeräte', 'Die Kaffeemaschine ist das einzige System, das alle zufrieden macht. Ich bitte darum, sie nicht zu disruptieren.'),
    ],
  },
  {
    face: '(ー_ー)!!',
    who: 'Hausmeister',
    lines: [
      q('hardware', 'Ich habe einen Rechner gefunden, der heiß ist. Unterm Tisch. Soll ich ihn kühlen? Ich hab einen Eimer.', 'Server unterm Tisch, überhitzt', 'Bitte KEIN Eimer! Ich komme mit einem Ventilator. Und einem Schild. Mal wieder.'),
      f('netz', 'Ich habe im Flur die Netzwerkdosen neu gestrichen. Jetzt geht da nichts mehr.', 'Farbe in den Netzwerkdosen', 'Die Dosen waren mit Farbe zu. Neue sind drin. Die Wand sieht übrigens schön aus. Die Dosen nicht mehr.', ['Switch Keller']),
      q('server', 'Im Serverraum blinkt es überall. Ist das Weihnachtsbeleuchtung?', 'Status-LEDs', 'Das blinkt immer, das heißt, es arbeitet. Wenn es nicht mehr blinkt, rufen Sie mich bitte sofort an.'),
    ],
  },
  {
    face: '(ﾉ´ヮ`)ﾉ',
    who: 'Gründer (aus Lissabon)',
    lines: [
      q('wunsch', 'Ich bin gerade am Strand. Können Sie mal schnell die App launchen?', 'Launch per Strandanruf', 'Schnell geht es nicht, aber gründlich. Montag. Genießen Sie das Meer. Ich genieße das Testen.'),
      q('allgemein', 'Mein MacBook ist die Produktion. Ich hab es im Café vergessen. Ist das schlimm?', 'Produktion auf dem Laptop', 'Ja. Rufen Sie das Café an. Und dann bauen wir einen richtigen Server. Mit Tür.'),
    ],
  },
  {
    face: '(◎_◎;)',
    who: 'Qualitätsmanagement',
    lines: [
      q('allgemein', 'Haben Sie für jedes Ticket ein Formular QM-17 ausgefüllt? Auch für das hier?', 'Prozess über Ergebnis', 'Für dieses Ticket gibt es jetzt ein QM-17. Für das QM-17 auch. Wir sind zertifiziert. Glaube ich.'),
      f('office', 'Die Vorlage für das Prüfprotokoll hat 47 Seiten. Davon 40 leer. Ist das normal?', 'Vorlage mit Seitenumbrüchen', 'Die 40 leeren Seiten waren Seitenumbrüche aus 2009. Jetzt sind es 7 Seiten. Die Zertifizierung bleibt gültig.', []),
    ],
  },
);

/** Rückruf-Zeilen (gleiche Person nochmal) */
export const CALLBACK_LINES = [
  'Geht immer noch nicht.',
  'Ich ruf jetzt zum dritten Mal an.',
  'Hab’s aus- und wieder eingeschaltet. Jetzt geht gar nichts mehr.',
  'Vergessen Sie’s, ging doch. … Moment. Nein.',
  'Ich hatte Ihnen doch eine Mail geschrieben. Und ein Ticket. Und Teams.',
  'Ich wollte nur mal hören, ob Sie schon dran sind.',
  'Jetzt hat es mein Kollege auch. Ich glaub, das ist ansteckend.',
  'Mein Chef fragt, warum das so lange dauert. Ich hab gesagt: wegen Ihnen.',
  'Ich hab im Internet was gefunden. Soll ich das einfach mal ausprobieren?',
  'Ist das jetzt gelöst oder nur geschlossen? Ich sehe da einen Unterschied.',
  'Nur zur Info: Ich bin ab morgen im Urlaub. Also bitte bis heute.',
  'Ich hab Ihr Ticket ausgedruckt. Wo soll ich es hinbringen?',
  'Ich ruf nur an, weil Sie nicht zurückgerufen haben. Vor drei Minuten.',
  'Kurze Zwischenfrage: Gibt es schon eine Zwischenlösung für die Zwischenfrage?',
  'Mein Kollege meint, das ist ein Virus. Er hat Medizin studiert. Ein Semester.',
  'Ich hab inzwischen eine Excel-Tabelle mit allen meinen Tickets. Wollen Sie die?',
  'Ich wollte nur sagen: Ich bin nicht böse. Nur enttäuscht.',
  'Es geht jetzt wieder, aber ich trau dem nicht. Bleiben Sie bitte dran.',
];

const sit = (face: string, who: string, line: Line, reply?: LogTemplate): Call => ({ face, who, ...line, reply });

interface Situation {
  when: (state: GameState, d: Date) => boolean;
  /** gilt den ganzen Tag (Wochenende, Patchday, Monatsende, Dezember): nur ab und zu dabei, sonst verdrängt es die normalen Anrufer */
  rare?: boolean;
  calls: Call[];
}

/** So oft sind ganztägige Situationen beim Auswählen eines Anrufs überhaupt im Topf */
const RARE_SHARE = 0.25;

/** Anrufe, die von Uhrzeit, Wochentag oder deiner Infrastruktur abhängen. */
export const SITUATIONS: Situation[] = [
  {
    // Freitagnachmittag
    when: (_s, d) => d.getDay() === 5 && d.getHours() >= 14,
    calls: [
      sit('(¬‿¬)', 'Entwicklung', q('server', 'Ich deploy das jetzt noch. Ist ja nur ein kleiner Change.', 'Deploy am Freitag, 16:55', 'Bitte nicht. Montag früh, mit Kaffee und Rollback-Plan. Ich hab dir den Termin schon eingetragen.'), {
        level: 'warn',
        text: 'deploy[1655]: change window: Fri 16:55. approved by: nobody',
      }),
      sit('(°ロ°)', 'Vertrieb', q('allgemein', 'Kannst du das bis Montag fixen? Also bis heute 17 Uhr?', 'Freitag, 16:30', 'Bis Montag ja. Also bis echten Montag. Den nach dem Wochenende.')),
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Ich fahr jetzt ins Wochenende. Falls was ist: nicht anrufen.', 'Wochenende', 'Schönes Wochenende. Falls was ist, ruft eh niemand Sie an. Sondern mich.')),
    ],
  },
  {
    // Montagmorgen
    when: (_s, d) => d.getDay() === 1 && d.getHours() < 11,
    calls: [
      sit('(ಠ_ಠ)', 'Buchhaltung', f('allgemein', 'Seit Freitag geht nichts. Ist mir aber erst jetzt aufgefallen.', 'Update am Freitagabend', 'Das Update vom Freitagabend war es. Ist behoben. Danke, dass Sie es Montag um 8:01 melden.', [])),
      sit('( ˘︹˘ )', 'Personal', f('passwort', 'Mein Passwort ist weg. Übers Wochenende. Einfach weg.', 'Passwort übers Wochenende vergessen', 'Das Passwort ist nicht weg, nur vergessen. Passiert jeden Montag. Neues ist gesetzt.')),
    ],
  },
  {
    // Nachts
    when: (_s, d) => d.getHours() >= 22 || d.getHours() < 6,
    calls: [
      sit('(・_・;)', 'Nachtschicht', f('drucker', 'Oh, Sie gehen ran? Um diese Uhrzeit? … Egal. Mein Drucker.', 'Drucker im Energiesparmodus', 'Der Drucker schlief. Wie alle um diese Uhrzeit. Außer uns beiden.', ['Drucker 3. OG'])),
      sit('(ಠ_ಠ)', 'Buchhaltung', q('mail', 'Ich weiß, es ist mitten in der Nacht. Aber root schickt mir Mails.', 'Cronjob mit falscher Empfängeradresse', 'root ist ein Cronjob, der Sie aus Versehen informiert. Ich hab ihn umgestellt. Schlafen Sie gut.')),
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('server', 'Ich kann nicht schlafen. Ist der Server noch an?', 'Sorgen um 3 Uhr nachts', 'Ja. Er läuft seit 1.284 Tagen. Er schläft nie. Sie sollten es aber versuchen.')),
    ],
  },
  {
    // Mittagspause
    when: (_s, d) => d.getHours() === 12,
    calls: [sit('(•̀ᴗ•́)و', 'Projektleitung', q('allgemein', 'Du bist in der Mittagspause? Super, dann hast du ja Zeit.', 'Mittagspause', 'Ich hab jetzt Zeit zum Essen. Um 13 Uhr bin ich ganz für dich da.'))],
  },
  {
    // früh am Morgen
    when: (_s, d) => d.getHours() >= 6 && d.getHours() < 8,
    calls: [
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Sind Sie schon da? Ich wollte nur testen, ob Sie schon da sind.', 'Kontrollanruf vor 8', 'Ich bin da. Das Ticketsystem auch. Der Kaffee noch nicht. Sie haben also 66 % Bereitschaft.')),
      sit('(◔_◔)', 'Herr K. (seit 1987 dabei)', q('hardware', 'Ich bin seit 6 Uhr hier. Mein Rechner fährt seit 6 Uhr hoch.', 'Updates beim Hochfahren', 'Er installiert Updates. 1 von 147. Holen Sie sich einen Kaffee. Oder zwei. Ich sag Bescheid.')),
    ],
  },
  {
    // Wochenende
    when: (_s, d) => d.getDay() === 0 || d.getDay() === 6,
    rare: true,
    calls: [
      sit('(°ロ°)', 'Vertrieb', q('allgemein', 'Ich weiß, es ist Wochenende. Aber Sie sind ja eh am Handy.', 'Wochenende (theoretisch)', 'Jetzt bin ich es, ja. Ihr Ticket liegt trotzdem auf Montag. Das Wochenende ist auch für Tickets da.')),
      sit('(¬‿¬)', 'Entwicklung', f('server', 'Kleine Frage am Wochenende: Warum ist Prod seit Freitag 16:55 down?', 'Deploy am Freitag, 16:55', 'Weil am Freitag um 16:55 jemand deployt hat. Rollback läuft. Wir reden am Montag. Ausführlich.', []), {
        level: 'crit',
        text: 'deploy[1655]: weekend on-call triggered by friday deploy. as foretold.',
      }),
    ],
  },
  {
    // Dienstag: Patchday
    when: (_s, d) => d.getDay() === 2,
    rare: true,
    calls: [
      sit('(ಠ_ಠ)', 'Buchhaltung', f('office', 'Nach dem Update heute ist mein Outlook rosa. Ist das so gewollt?', 'Patchday-Update hat das Design zurückgesetzt', 'Das Update hat Ihr Design zurückgesetzt. Jetzt ist es wieder blau. Wer damals „Rosa“ ausgewählt hat, bleibt unter uns.', [])),
      sit('(・_・;)', 'Neuer Kollege', q('hardware', 'Mein PC sagt „Nicht ausschalten“. Seit einer Stunde. Darf ich jetzt?', 'Patchday', 'Bitte nicht. Er arbeitet. Langsam, aber er arbeitet. Wie wir alle am Dienstag.')),
    ],
  },
  {
    // Monatsende
    when: (_s, d) => d.getDate() >= 28,
    rare: true,
    calls: [
      sit('(ಠ_ಠ)', 'Buchhaltung', q('allgemein', 'Monatsabschluss. Bitte heute nichts updaten. Und morgen nicht. Und überhaupt nicht.', 'Monatsabschluss (Dauerzustand)', 'Versprochen. Ich update erst nach dem Abschluss. Also kurz vor dem nächsten Abschluss.')),
      sit('(；一_一)', 'Controlling', q('office', 'Excel braucht für meine Datei 40 Minuten. Geht das schneller? Bis zum Abschluss in 20 Minuten?', 'Datei mit 412 externen Verknüpfungen', 'Ihre Datei rechnet mit 412 anderen Dateien, die es nicht mehr gibt. Ich mache die Verknüpfungen weg. Danach. Nicht jetzt.')),
    ],
  },
  {
    // Dezember
    when: (_s, d) => d.getMonth() === 11,
    rare: true,
    calls: [
      sit('( ˘︹˘ )', 'Personal', q('wunsch', 'Weihnachtsfeier: Können wir Beamer und Musikanlage haben? Und Sie als DJ?', 'Weihnachtsfeier', 'Beamer ja, Anlage ja, DJ nein. Ich lege aber gern die Playlist „Lüfterrauschen aus dem Serverraum“ auf.')),
      sit('(ˆڡˆ)', 'Kantine', q('netz', 'Die Lichterkette im Speisesaal will ins WLAN. Darf die?', 'Smarte Lichterkette', 'Die Lichterkette kommt ins Gäste-WLAN. Wie alle Dinge, die blinken und nichts mit Arbeit zu tun haben.')),
    ],
  },
  ...(
    [
      ['intern', sit('(°ロ°)', 'Vertrieb', q('hardware', 'Ihr Praktikant hat meinen Rechner neu gestartet. Mitten in der Präsentation.', 'Praktikant mit Tatendrang', 'Tut mir leid. Er bekommt eine Schulung zum Thema „Vorher fragen“. Die Präsentation ist zum Glück gespeichert.'))],
      ['intern', sit('(ಠ_ಠ)', 'Buchhaltung', q('hardware', 'Ihr Praktikant hat gefragt, ob ich es aus- und wieder eingeschaltet hab. Frechheit. Hat geholfen.', 'Aus- und wieder eingeschaltet', 'Das ist der Standardweg. Ich sag ihm, er soll es freundlicher fragen. Helfen wird es trotzdem.'))],
      ['bash', sit('¯\\_(ツ)_/¯', 'Marketing', f('office', 'Seit heute Nacht heißen alle meine Dateien „final_v2_FINAL“. Also noch mehr als vorher.', 'Skript mit zu viel Ehrgeiz', 'Mein Aufräum-Skript war zu ehrgeizig. Die alten Namen sind zurück. Leider auch die alten Namen.', ['NAS Buchhaltung']))],
      ['cron', sit('(ಠ_ಠ)', 'Buchhaltung', q('mail', 'Ich krieg jeden Morgen um 3:00 eine Mail von „root“. Wer ist root und was will er von mir?', 'Cronjob mit falscher Empfängeradresse', 'root ist ein Cronjob von mir. Er wollte nur Bescheid sagen. Ab sofort sagt er es nur noch mir.'))],
      ['ansible', sit('(ಠ_ಠ)', 'Buchhaltung', f('server', 'Mein Laptop heißt jetzt „webserver-prod-07“ und hat nginx. Ich bin in der Buchhaltung.', 'Ansible-Inventar verrutscht', 'Das Inventar war verrutscht. Ihr Laptop ist wieder ein Laptop. Die echte Website war kurz bei Ihnen gehostet.', []))],
      ['k8s', sit('( ˘︹˘ )', 'Personal', q('server', 'Mein Excel läuft jetzt in einem Pod? Wo ist der Pod? Wo ist mein Excel?', 'Kubernetes', 'Ihr Excel läuft auf Ihrem Rechner. Wie immer. Der Pod war ein Missverständnis meinerseits.'))],
      ['agent', sit('(°ロ°)', 'Vertrieb', q('allgemein', 'Euer Chatbot hat mir gekündigt. Gilt das?', 'KI-Agent mit zu vielen Rechten', 'Nein, das gilt nicht. Der Chatbot hat keine Personalbefugnis mehr. Hatte er nie haben sollen.'))],
      ['agent', sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Euer KI-Agent hat mir geantwortet: „Ich verstehe Ihre Frustration.“ Und dann aufgelegt.', 'KI-Agent im Kundenservice-Modus', 'Der Agent ist für Chefs jetzt abgeschaltet. Sie bekommen wieder mich. Ich lege nie auf. Leider.'))],
      ['cron', sit('( ˘︹˘ )', 'Personal', f('server', 'Bei mir geht jede Nacht um 3 Uhr das Licht an. Hat das was mit euch zu tun?', 'Cronjob steuert die Haustechnik', 'Ja. Ein Cronjob von mir hat statt Backups das Licht geschaltet. Ist korrigiert. Die Backups laufen jetzt auch.', ['NAS Buchhaltung']))],
      ['ansible', sit('¯\\_(ツ)_/¯', 'Marketing', f('office', 'Mein Bildschirmhintergrund wird jeden Morgen zurückgesetzt. Auf ein Logo mit „YAML“.', 'Ansible-Playbook für alle Rechner', 'Das Playbook galt für alle Rechner statt nur für Server. Ihr Hintergrund bleibt jetzt, wie er ist.', []))],
      ['k8s', sit('(•̀ᴗ•́)و', 'Projektleitung', q('server', 'Unser Wiki ist jetzt hochverfügbar, sagt ihr. Lesen tut es trotzdem keiner.', 'Wiki hochverfügbar, ungelesen', 'Hochverfügbar heißt, es ist immer da, wenn es keiner liest. Ich verlinke es in jeder Antwort. Hilft auch nicht.'))],
      ['bash', sit('(ಠ_ಠ)', 'Buchhaltung', q('sicherheit', 'In meinem Ordner liegt eine Datei namens „fix_all.sh“. Darf ich die mal doppelklicken?', 'Unbekanntes Skript im Ordner', 'Bitte NICHT doppelklicken. Die ist von mir, aus Versehen bei Ihnen gelandet. Ich hol sie ab.'))],
      ['intern', sit('( ˘︹˘ )', 'Personal', q('sicherheit', 'Ihr Praktikant hat sich selbst einen Account angelegt. In der Gruppe „Domain Admins“.', 'Praktikant mit Adminrechten (temporär)', 'Die Rechte sind wieder weg. Er bekommt sie zurück, wenn er erklären kann, was „Domain Admins“ heißt. Ohne zu googeln.'))],
      ['k8s', sit('(¬‿¬)', 'Entwicklung', f('server', 'Mein Pod ist im CrashLoopBackOff. Ist das schlimm oder ein Feature?', 'Liveness-Probe zu streng', 'Schlimm. Kubernetes nennt es Feature. Ich hab die Probe gelockert. Dein Pod darf jetzt auch mal zwei Sekunden nachdenken.', []))],
      ['agent', sit('(ˆڡˆ)', 'Kantine', q('allgemein', 'Euer KI-Agent hat 400 Schnitzel bestellt. Wer bezahlt die?', 'KI-Agent mit Bestellrechten', 'Der Agent hatte Bestellrechte. Hat er nicht mehr. Für die Schnitzel frag ich den Vertrieb, ob er Kunden einlädt.'))],
      ['cron', sit('(•̀ᴗ•́)و', 'Projektleitung', q('allgemein', 'Jeden Montag um 3 Uhr kriege ich einen Bericht. Leere Seite, Betreff „OK“. Was ist OK?', 'Cronjob-Bericht ohne Inhalt', 'OK heißt, nichts ist kaputt. Der Bericht ist absichtlich leer. Wenn mal was drinsteht, sollten wir beide nervös werden.'))],
      [
        'undertable',
        sit('(-_-)', 'Immobilienmanagement', q('server', 'Unter einem Tisch im 2. OG brummt ein Kasten. Darf ich den ausstecken?', 'Schatten-IT unterm Schreibtisch', 'NEIN. Der Kasten ist wichtig. Sehr wichtig. Bitte nicht anfassen, ich klebe ein Schild dran.'), {
          level: 'crit',
          text: 'admin[1]: NEIN.',
        }),
      ],
    ] as [GeneratorId, Call][]
  ).map(([gen, call]) => ({ when: (s: GameState) => s.generators[gen].owned > 0, calls: [call] })),
];

// Nach dem ersten Jobwechsel
SITUATIONS.push({
  when: (s) => s.prestige.jobs >= 1,
  calls: [
    sit('(°ロ°)', 'Vertrieb', f('passwort', 'Ach, Sie sind der Neue? Ihr Vorgänger hatte das Passwort auf einem Post-it. Haben Sie das?', 'Passwort auf dem Post-it des Vorgängers', 'Das Post-it habe ich verbrannt. Alle Passwörter sind neu. Willkommen in der Zukunft.')),
    sit('(ಠ_ಠ)', 'Buchhaltung', q('allgemein', 'Der Alte hat immer gesagt, das macht er „nächste Woche“. Machen Sie das jetzt?', 'Vorgänger mit „nächster Woche“', 'Ja. Aber erst nächste Woche. War ein Witz. Morgen.')),
    sit('( ˘︹˘ )', 'Personal', q('allgemein', 'Ihr Vorgänger hat seine Tasse dagelassen. Sollen wir die wegwerfen?', 'Tasse des Vorgängers (lebt)', 'Bitte nicht. Da wächst was drin. Ich glaube, es hält den Server unterm Tisch am Laufen.')),
    sit('(¬‿¬)', 'Entwicklung', q('server', 'Weißt du, was srv-legacy01 macht? Dein Vorgänger wusste es auch nicht.', 'Server ohne Doku (Erbstück)', 'Keine Ahnung. Er läuft seit 1.284 Tagen. Ich habe beschlossen, ihm zu vertrauen. Wie meinem Vorgänger.')),
  ],
});

export function situationalCalls(state: GameState, now: Date, rnd: () => number = Math.random): Call[] {
  return SITUATIONS.filter((s) => s.when(state, now) && (!s.rare || rnd() < RARE_SHARE)).flatMap((s) => s.calls);
}
