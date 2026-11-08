import type { GeneratorId } from '../config';
import type { GameState } from '../core/state';
import type { LogTemplate } from './syslog';
import type { Topic } from './topics';

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
}

/** Nur reden hilft (Frage, Wunsch, Unsinn) */
const q = (topic: Topic, text: string, cause: string, answer: string): Line => ({ topic, text, cause, answer, fix: false });
/** Hier muss man ran */
const f = (topic: Topic, text: string, cause: string, answer: string): Line => ({ topic, text, cause, answer, fix: true });

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
      f('office', 'Seit dem Update geht nix mehr. Welches Update? Na, DAS Update!', 'Update über Nacht', 'Das Update habe ich zurückgerollt. Bitte das nächste Mal das Fenster nicht mit „Später“ wegklicken. 41-mal.'),
      f('office', 'Excel sagt #NAME?. Ich heiße aber Petra.', 'Zelle als Text formatiert', 'Die Zelle war als Text formatiert. Excel meinte nicht Sie, Petra. Diesmal.'),
      q('wunsch', 'Ich brauch Adminrechte. Nur für den Bildschirmschoner.', 'War kein Problem, war ein Wunsch', 'Adminrechte gibt es nicht für Bildschirmschoner. Ich stelle Ihnen die Aquarium-Fische ein. Mehr geht nicht.'),
      f('hardware', 'Mein Bildschirm ist zu klein. Kann man den zoomen? Also den ganzen Bildschirm?', 'Auflösung auf 800×600', 'Die Auflösung stand auf 800×600. Jetzt passt mehr drauf. Wenn es zu klein ist: Strg und Mausrad.'),
    ],
  },
  {
    face: '(°ロ°)',
    who: 'Vertrieb',
    lines: [
      f('netz', 'Das Internet ist weg!', 'WLAN-Schalter am Laptop aus', 'Das Internet ist noch da. Ihr WLAN-Schalter war aus. Kleiner Schieber, linke Seite.'),
      q('mail', 'Kann man eine Mail zurückholen? Die an „Alle“?', '„Allen antworten“', 'Zurückholen geht nicht. 340 Leute haben sie schon gelesen. Ich würde jetzt einfach selbstbewusst gucken.'),
      q('allgemein', 'Ich brauch das sofort, der Kunde sitzt neben mir.', 'Kunde saß daneben, Problem auch', 'Bin dran. Sagen Sie dem Kunden, das ist unser Sicherheitscheck. Klingt besser.'),
      q('wunsch', 'Ich hab dem Kunden schon zugesagt, dass das geht. Geht das?', 'Zusage vor Machbarkeitsprüfung', 'Nein. Aber ich hab eine Folie gebaut, auf der es so aussieht. Für das Meeting reicht das.'),
      q('netz', 'Der Kunde sagt, unsere Website ist kaputt. Er benutzt den Internet Explorer.', 'Internet Explorer', 'Die Website ist nicht kaputt. Der Internet Explorer schon, seit 2022. Bitte dem Kunden schonend beibringen.'),
    ],
  },
  {
    face: '¯\\_(ツ)_/¯',
    who: 'Marketing',
    lines: [
      f('server', 'Ist der Server down? Ich seh nur eine weiße Seite.', 'Webserver-Prozess hing', 'Der Webserver hing. Läuft wieder. Die weiße Seite war kein neues Minimal-Design.'),
      q('wunsch', 'Wir haben ein neues Tool gekauft. Geht Montag live. Ihr wisst Bescheid, oder?', 'Einkauf ohne IT', 'Jetzt wissen wir Bescheid. Montag wird ambitioniert. Wer hat denn die Zugangsdaten? … Niemand? Super.'),
      f('passwort', 'Mein Passwort ist abgelaufen. Ich hab einfach eine 2 drangehängt.', 'Altes Passwort mit einer 2 dran', 'Das System kennt den Trick. Neues Passwort ist gesetzt. Eine 3 dranhängen gilt übrigens auch nicht.'),
      q('wunsch', 'Könnt ihr mal schnell die Website responsive machen? Bis zur Messe. Die ist morgen.', 'Messe morgen, Anfrage heute', 'Bis morgen nicht. Ich kann die Website aber so einstellen, dass sie auf dem Handy wenigstens nicht abstürzt.'),
      q('mail', 'Kann man die Mail an alle schöner machen? Mit Comic Sans und Glitzer?', 'Corporate Design: Glitzer', 'Comic Sans geht. Glitzer nicht, das blockiert der Spamfilter. Zu Recht.'),
    ],
  },
  {
    face: '(╯°□°)╯︵ ┻━┻',
    who: 'Geschäftsführung',
    lines: [
      f('netz', 'Warum ist das so langsam? Bei meinem Neffen geht das schneller.', 'Laptop im Gast-WLAN', 'Ihr Laptop war im Gast-WLAN der Kantine. Jetzt im richtigen. Grüße an den Neffen.'),
      f('sicherheit', 'Ich hab auf den Link geklickt. Den mit dem Gewinn.', 'Link mit dem Gewinn geklickt', 'Sie haben nichts gewonnen. Laptop ist geprüft, Passwort ist neu. Bitte nie wieder klicken. Auch nicht bei Kreuzfahrten.'),
      f('netz', 'Machen Sie mal schnell das WLAN schneller.', 'Router hinter dem Aktenschrank', 'Der Router stand hinter dem Aktenschrank. Jetzt steht er davor. Schneller ist es auch.'),
      q('allgemein', 'Wofür bezahlen wir die IT eigentlich? Es läuft doch alles.', 'Gute Arbeit (unsichtbar)', 'Genau dafür. Es läuft, weil wir da sind. Ein Paradox, ich weiß.'),
      f('netz', 'Ich brauche das Internet. Also den Kasten mit dem Lämpchen. Für den Vorstand.', 'Router ausgesteckt (für den Wasserkocher)', 'Der Kasten war ausgesteckt. Für den Wasserkocher. Steckt wieder. Bitte den Wasserkocher woanders.'),
      f('allgemein', 'Es geht NICHTS! Wofür bezahlen wir die IT eigentlich?', 'Bildschirm war aus', 'Es ging alles. Nur der Bildschirm war aus. Knopf unten rechts. Und: dafür.'),
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
    ],
  },
  {
    face: '(¬‿¬)',
    who: 'Entwicklung',
    lines: [
      q('allgemein', 'Bei mir geht’s.', 'Works on my machine', 'Schön. Dann liefern wir eben Ihren Rechner aus.'),
      q('wunsch', 'Gib mir mal kurz root. Nur ganz kurz.', 'Root „nur ganz kurz“', 'Nein. Auch nicht ganz kurz. Sag mir, was du brauchst, ich mach’s.'),
      f('netz', 'Das ist kein Bug im Code, das ist ein Netzwerkproblem.', 'Doch ein Bug im Code (Timeout 0 ms)', 'Netz ist sauber, Ping 0,4 ms. Dein Timeout steht auf 0 ms. Das ist dann eher sportlich.'),
      q('sicherheit', 'Kannst du Port 22 nach außen aufmachen? Nur bis Montag.', '„Nur bis Montag“ (= für immer)', 'Port 22 bleibt zu. Du kriegst VPN. Das bleibt dann auch nach Montag.'),
      f('server', 'Ich hab die Produktivdatenbank als Testumgebung benutzt. Fällt das auf?', 'Test auf Produktion', 'Ja. Allen Kunden heißen jetzt „Test Test“. Restore läuft. Wir reden danach.'),
      q('server', 'Mein Build läuft. Ich mach so lange Schwertkampf im Flur.', 'Build dauert 40 Minuten', 'Viel Spaß. Wenn er fertig ist, schau bitte auch mal, warum er 40 Minuten dauert.'),
      q('allgemein', 'Ich hab mein Problem im Forum gefunden. Einzige Antwort von 2009: „nvm, fixed it“.', 'Lösung im Forum: „nvm, fixed it“', 'Kenne ich. Schick mir die Fehlermeldung, dann sind wir zu zweit ratlos. Das hilft oft.'),
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
    ],
  },
  {
    face: '(⊙_☉)',
    who: 'Empfang',
    lines: [
      f('netz', 'Das Telefon zeigt „DNS-Fehler“. Was hat das Telefon mit DNS zu tun?', 'Es war DNS', 'Alles hat mit DNS zu tun. Immer. Ist behoben.'),
      q('allgemein', 'Ich hab die Fehlermeldung weggeklickt. Was stand da? Keine Ahnung.', 'Fehlermeldung ungelesen weggeklickt', 'Wenn sie wiederkommt: bitte NICHT wegklicken, sondern fotografieren. Ohne Blitz.'),
      q('sicherheit', 'Hier steht ein Herr vom „Microsoft-Support“. Soll ich ihn in den Serverraum lassen?', 'Betrüger am Empfang', 'NEIN! Microsoft kommt nie vorbei. Bitte nicht reinlassen. Ich rufe den Sicherheitsdienst.'),
      q('allgemein', 'Es geht wieder! … Nein, doch nicht.', 'Wackelkontakt', 'Bleiben Sie dran. Nicht bewegen. Ich komme vorbei, bevor es sich anders überlegt.'),
      q('sicherheit', 'Ein Besucher will ins WLAN. Er sagt, er ist vom BSI. Ist das was Wichtiges?', 'Besucher mit Ausweis „vom BSI“ (gebastelt)', 'Er kriegt das Gast-WLAN. Wie alle. Echte BSI-Leute melden sich übrigens vorher an.'),
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
    ],
  },
  {
    face: '(o_O)',
    who: 'Azubi',
    lines: [
      f('server', 'Ich hab „sudo“ davorgeschrieben, wie im Tutorial. Jetzt ist /etc weg. War das wichtig?', 'Tutorial blind abgetippt', 'Sehr wichtig. Ist aus dem Backup zurück. Ab heute erklärst du mir vorher jeden Befehl.'),
      q('netz', 'Ist Chrome das Internet oder Google?', 'Grundlagen fehlen', 'Weder noch. Chrome ist der Browser, Google die Suche, das Internet ist alles dazwischen. Kaffee?'),
      f('server', 'Ich hab den Server neu gestartet, damit mein Update durchläuft. Welcher Server? Na, der.', 'Falscher Server neu gestartet', 'Das war der Mailserver. Läuft wieder. Ab sofort frag bitte, bevor du irgendwas „mal kurz“ neu startest.'),
      f('server', 'Ich hab ChatGPT gefragt, wie man den Server neu startet. Jetzt ist der Server weg.', 'Halluzinierte Anleitung', 'Der Server ist wieder da. ChatGPT hat dir eine Anleitung für einen anderen Server gegeben. Selbstbewusst.'),
    ],
  },
  {
    face: '(ʘ‿ʘ)',
    who: 'Datenschutz',
    lines: [
      f('server', 'Haben wir Logfiles? Löschen. Alle. Sofort. Nein, warte: Aufbewahrungspflicht!', 'Datenschutz trifft Aufbewahrungspflicht', 'Logs bleiben 90 Tage, dann automatisch weg. Beide Gesetze zufrieden. Ich auch.'),
      f('drucker', 'Wer hat den Drucker im Flur ins Internet gehängt? Der hat jetzt Instagram.', 'Drucker mit öffentlicher IP', 'Drucker ist wieder nur im Firmennetz. Sein Instagram-Account hatte übrigens mehr Follower als unserer.'),
      q('passwort', 'Ist „Passwort123“ DSGVO-konform?', 'Passwort123', 'Konform vielleicht. Sicher nicht. Bitte ändern. Heute noch.'),
      f('sicherheit', 'Die Kaffeemaschine sammelt Daten. Wer hat dem zugestimmt?', 'Smarte Kaffeemaschine', 'Niemand. Die Telemetrie ist aus. Die Maschine weiß jetzt nicht mehr, wie viel Sie trinken. Ich schon.'),
    ],
  },
  {
    face: '(-_-)',
    who: 'Immobilienmanagement',
    lines: [
      q('server', 'Wir machen am Wochenende den Strom aus. Ist das schlimm für euch?', 'Stromabschaltung ohne Vorwarnung', 'Ja. Sehr. Bitte sagen Sie mir wann, dann fahre ich vorher alles sauber runter.'),
      q('server', 'Im Serverraum ist es so laut. Darf ich die Klimaanlage ausmachen?', 'Klimaanlage aus („zu laut“)', 'Bitte NICHT. Ohne Klimaanlage wird es da drin in einer Stunde 50 Grad. Dann ist es auch leise.'),
      q('server', 'Im Keller steht Wasser. Ist das euer Raum?', 'Serverraum im Keller (Planung von 1998)', 'Ja! Bitte Hauptsicherung NICHT anfassen und nicht reingehen. Ich bin sofort da.'),
      q('server', 'Wir streichen den Serverraum. Könnt ihr kurz alles rausstellen?', 'Renovierung ohne Absprache', 'Rausstellen geht nicht. Abdecken schon. Ich bringe Folie. Und bleibe daneben stehen.'),
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
    ],
  },
  {
    face: '(⌐■_■)',
    who: 'Externer Berater',
    lines: [
      q('server', 'Wir empfehlen Kubernetes. Wofür? Für alles.', 'Lösung sucht Problem', 'Wir haben drei Server und eine Kaffeemaschine. Danke, wir verzichten.'),
      q('wunsch', 'Habt ihr mal über Blockchain nachgedacht? Für die Ticketvergabe.', 'Lösung sucht Problem', 'Haben wir. Kurz. Die Tickets bleiben in der Datenbank.'),
      q('allgemein', 'Meine Rechnung ist raus. Was macht ihr hier eigentlich so?', 'Berater', 'Wir machen die Arbeit aus Ihrer Präsentation. Die Rechnung geht an den Einkauf.'),
      q('wunsch', 'Mein Vorschlag: Alles neu machen. Mein Honorar: auch neu.', 'Berater', 'Danke. Wir reparieren erst mal, was da ist. Das ist günstiger.'),
    ],
  },
  {
    face: '(｡•́︿•̀｡)',
    who: 'Vorstandsassistenz',
    lines: [
      q('netz', 'Der Chef braucht WLAN im Aufzug. Bis morgen.', 'Physik (Aufzug = Faradayscher Käfig)', 'Der Aufzug ist ein Metallkasten. Da geht kein WLAN durch. Bis morgen auch nicht.'),
      f('passwort', 'Der Chef hat sein Passwort vergessen. Er sagt, Sie kennen es doch bestimmt.', 'Passwort vergessen (Chef)', 'Ich kenne es nicht, das ist der Sinn von Passwörtern. Er hat ein neues. Bitte persönlich abholen.'),
      f('hardware', 'Können Sie den Beamer im Vorstandszimmer anmachen? Er sagt „No Signal“. Das Signal ist doch da!', 'Falscher HDMI-Eingang', 'Eingang stand auf HDMI 1, das Kabel steckt in HDMI 2. Jetzt geht’s. Signal war tatsächlich da. Nur woanders.'),
      q('mail', 'Der Chef will, dass seine Mails „lauter“ sind. Geht das?', 'Wunsch nach lauten Mails', 'Mails haben keine Lautstärke. Ich kann sie als „Wichtig“ markieren. Das ignorieren dann alle in Rot.'),
    ],
  },
  {
    face: '(￢_￢)',
    who: 'IT-Sicherheit',
    lines: [
      q('sicherheit', 'Ab Montag verbieten wir USB. Und Bluetooth. Und Tastaturen.', 'Sicherheit über alles', 'Gerne. Ohne Tastaturen bitte auch keine Tickets mehr. Win-win.'),
      q('passwort', 'Ihr Passwort „correct horse battery staple“ steht in vier Wörterbüchern. Abgelehnt.', 'xkcd 936', 'Okay. Dann „correct horse battery staple 2“. Spaß. Ich nehme ein neues.'),
      f('sicherheit', 'Ich habe den Server vom Netz genommen. Jetzt ist er sicher.', 'Sicherheit durch Nichterreichbarkeit', 'Sicher ist er. Nur nutzen kann ihn auch keiner. Ich steck ihn wieder ein, wir patchen ihn zusammen.'),
      q('sicherheit', 'Ich hab einen Phishing-Test gemacht. Ich bin selbst drauf reingefallen.', 'Eigener Phishing-Test', 'Sehr glaubwürdiger Test also. Passwort neu, und ich sag es niemandem. Vielleicht.'),
    ],
  },
  {
    face: '(°ー°〃)',
    who: 'Schulsekretariat',
    lines: [
      f('server', 'Unsere Software hat alle Schüler gelöscht. Der Neue hat Klammern im Namen.', 'Eingaben bereinigt (Hallo, Bobby)', 'Schüler sind aus dem Backup zurück. Die Software prüft jetzt Eingaben. Grüße an den kleinen Bobby.'),
      q('server', 'Heißt Ihr Sohn wirklich Robert, Klammer zu, Semikolon, DROP TABLE?', 'Eingaben bereinigt (Hallo, Bobby)', 'Ja. Wir nennen ihn Little Bobby Tables. Und Sie bereinigen hoffentlich Ihre Eingaben.'),
    ],
  },
  {
    face: '(ーー;)',
    who: 'Betriebsrat',
    lines: [
      f('office', 'Die neue Software zählt, wie oft ich klicke? Das ist mitbestimmungspflichtig.', 'Telemetrie ab Werk', 'Stimmt. Die Klickzählung ist aus. Die Software war nur neugierig.'),
      q('office', 'Der Bildschirmschoner geht nach 5 Minuten an. Das ist Leistungskontrolle.', 'Sicherheitsrichtlinie', 'Der Bildschirmschoner schützt nur vor neugierigen Blicken. Er zählt nichts. Ehrenwort.'),
      q('drucker', 'Wer hat entschieden, dass der Drucker „Dieter“ heißt? Wurde das abgestimmt?', 'Drucker eigenmächtig benannt', 'Das war ich. Ich beantrage hiermit eine Abstimmung. Mein Vorschlag bleibt Dieter.'),
    ],
  },
  {
    face: '(ˆڡˆ)',
    who: 'Kantine',
    lines: [
      f('hardware', 'Die Kasse zeigt nur noch Hieroglyphen. Die Leute zahlen jetzt nach Ehrlichkeit.', 'Zeichensatz: Windows-1252 trifft UTF-8', 'Kasse spricht wieder Deutsch. Die Einnahmen der letzten Stunde waren übrigens höher als sonst.'),
      q('wunsch', 'Können Sie die Speisekarte ins Intranet stellen? Und die von 2019 endlich raus?', 'Intranet seit 2019 nicht gepflegt', 'Erledigt. Die Karte von 2019 hatte mehr Aufrufe als alles andere im Intranet.'),
      f('passwort', 'Die Spülmaschine hat ein Update gemacht. Jetzt will sie ein Passwort.', 'Smarte Spülmaschine', 'Das Standardpasswort stand im Handbuch. Jetzt spült sie wieder. Und hat ein besseres Passwort als der Chef.'),
    ],
  },
  {
    face: '(✧ω✧)',
    who: 'Social-Media-Team',
    lines: [
      q('netz', 'Wir brauchen 5G im Keller. Für Content.', 'Physik (Keller)', 'Im Keller gibt es WLAN. 5G kann ich leider nicht herzaubern. Content geht auch im Erdgeschoss.'),
      q('passwort', 'Kann man das WLAN-Passwort hashtaggen?', 'Passwort als Hashtag', 'Nein. Bitte das WLAN-Passwort generell nicht posten. Weder mit noch ohne Hashtag.'),
      f('sicherheit', 'Unser Post ist viral gegangen. Mit dem Screenshot vom Admin-Passwort drauf.', 'Screenshot mit Passwort gepostet', 'Passwort ist geändert, Post ist gelöscht. 40.000 Leute haben es gesehen. Glückwunsch zur Reichweite.'),
    ],
  },
  {
    face: '(◔_◔)',
    who: 'Herr K. (seit 1987 dabei)',
    lines: [
      q('allgemein', 'Früher hatten wir einen Großrechner. Der ging nie kaputt. Er hat aber auch nichts gemacht.', 'Nostalgie', 'Der steht übrigens noch im Keller. Er macht immer noch nichts. Zuverlässig.'),
      q('office', 'Wo ist der Knopf zum Speichern? Die Diskette?', 'Diskette als Symbol', 'Genau, die Diskette. Oder Strg+S. Echte Disketten brauchen Sie nicht mehr. Bitte.'),
      f('drucker', 'Ich drucke meine Mails aus und hefte sie ab. Der Drucker ist schon wieder leer.', 'Mails werden ausgedruckt', 'Toner ist nachgefüllt. Ich zeige Ihnen gern mal, wie man Mails in Ordner verschiebt. Digitale.'),
    ],
  },
];

/** Rückruf-Zeilen (gleiche Person nochmal) */
export const CALLBACK_LINES = [
  'Geht immer noch nicht.',
  'Ich ruf jetzt zum dritten Mal an.',
  'Hab’s aus- und wieder eingeschaltet. Jetzt geht gar nichts mehr.',
  'Vergessen Sie’s, ging doch. … Moment. Nein.',
  'Ich hatte Ihnen doch eine Mail geschrieben. Und ein Ticket. Und Teams.',
];

const sit = (face: string, who: string, line: Line, reply?: LogTemplate): Call => ({ face, who, ...line, reply });

interface Situation {
  when: (state: GameState, d: Date) => boolean;
  calls: Call[];
}

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
      sit('(ಠ_ಠ)', 'Buchhaltung', f('allgemein', 'Seit Freitag geht nichts. Ist mir aber erst jetzt aufgefallen.', 'Update am Freitagabend', 'Das Update vom Freitagabend war es. Ist behoben. Danke, dass Sie es Montag um 8:01 melden.')),
      sit('( ˘︹˘ )', 'Personal', f('passwort', 'Mein Passwort ist weg. Übers Wochenende. Einfach weg.', 'Passwort übers Wochenende vergessen', 'Das Passwort ist nicht weg, nur vergessen. Passiert jeden Montag. Neues ist gesetzt.')),
    ],
  },
  {
    // Nachts
    when: (_s, d) => d.getHours() >= 22 || d.getHours() < 6,
    calls: [
      sit('(・_・;)', 'Nachtschicht', f('drucker', 'Oh, Sie gehen ran? Um diese Uhrzeit? … Egal. Mein Drucker.', 'Drucker im Energiesparmodus', 'Der Drucker schlief. Wie alle um diese Uhrzeit. Außer uns beiden.')),
      sit('(ಠ_ಠ)', 'Buchhaltung', q('mail', 'Ich weiß, es ist mitten in der Nacht. Aber root schickt mir Mails.', 'Cronjob mit falscher Empfängeradresse', 'root ist ein Cronjob, der Sie aus Versehen informiert. Ich hab ihn umgestellt. Schlafen Sie gut.')),
      sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('server', 'Ich kann nicht schlafen. Ist der Server noch an?', 'Sorgen um 3 Uhr nachts', 'Ja. Er läuft seit 1.284 Tagen. Er schläft nie. Sie sollten es aber versuchen.')),
    ],
  },
  {
    // Mittagspause
    when: (_s, d) => d.getHours() === 12,
    calls: [sit('(•̀ᴗ•́)و', 'Projektleitung', q('allgemein', 'Du bist in der Mittagspause? Super, dann hast du ja Zeit.', 'Mittagspause', 'Ich hab jetzt Zeit zum Essen. Um 13 Uhr bin ich ganz für dich da.'))],
  },
  ...(
    [
      ['intern', sit('(°ロ°)', 'Vertrieb', q('hardware', 'Ihr Praktikant hat meinen Rechner neu gestartet. Mitten in der Präsentation.', 'Praktikant mit Tatendrang', 'Tut mir leid. Er bekommt eine Schulung zum Thema „Vorher fragen“. Die Präsentation ist zum Glück gespeichert.'))],
      ['intern', sit('(ಠ_ಠ)', 'Buchhaltung', q('hardware', 'Ihr Praktikant hat gefragt, ob ich es aus- und wieder eingeschaltet hab. Frechheit. Hat geholfen.', 'Aus- und wieder eingeschaltet', 'Das ist der Standardweg. Ich sag ihm, er soll es freundlicher fragen. Helfen wird es trotzdem.'))],
      ['bash', sit('¯\\_(ツ)_/¯', 'Marketing', f('office', 'Seit heute Nacht heißen alle meine Dateien „final_v2_FINAL“. Also noch mehr als vorher.', 'Skript mit zu viel Ehrgeiz', 'Mein Aufräum-Skript war zu ehrgeizig. Die alten Namen sind zurück. Leider auch die alten Namen.'))],
      ['cron', sit('(ಠ_ಠ)', 'Buchhaltung', q('mail', 'Ich krieg jeden Morgen um 3:00 eine Mail von „root“. Wer ist root und was will er von mir?', 'Cronjob mit falscher Empfängeradresse', 'root ist ein Cronjob von mir. Er wollte nur Bescheid sagen. Ab sofort sagt er es nur noch mir.'))],
      ['ansible', sit('(ಠ_ಠ)', 'Buchhaltung', f('server', 'Mein Laptop heißt jetzt „webserver-prod-07“ und hat nginx. Ich bin in der Buchhaltung.', 'Ansible-Inventar verrutscht', 'Das Inventar war verrutscht. Ihr Laptop ist wieder ein Laptop. Die echte Website war kurz bei Ihnen gehostet.'))],
      ['k8s', sit('( ˘︹˘ )', 'Personal', q('server', 'Mein Excel läuft jetzt in einem Pod? Wo ist der Pod? Wo ist mein Excel?', 'Kubernetes', 'Ihr Excel läuft auf Ihrem Rechner. Wie immer. Der Pod war ein Missverständnis meinerseits.'))],
      ['agent', sit('(°ロ°)', 'Vertrieb', q('allgemein', 'Euer Chatbot hat mir gekündigt. Gilt das?', 'KI-Agent mit zu vielen Rechten', 'Nein, das gilt nicht. Der Chatbot hat keine Personalbefugnis mehr. Hatte er nie haben sollen.'))],
      ['agent', sit('(╯°□°)╯︵ ┻━┻', 'Geschäftsführung', q('allgemein', 'Euer KI-Agent hat mir geantwortet: „Ich verstehe Ihre Frustration.“ Und dann aufgelegt.', 'KI-Agent im Kundenservice-Modus', 'Der Agent ist für Chefs jetzt abgeschaltet. Sie bekommen wieder mich. Ich lege nie auf. Leider.'))],
      ['cron', sit('( ˘︹˘ )', 'Personal', f('server', 'Bei mir geht jede Nacht um 3 Uhr das Licht an. Hat das was mit euch zu tun?', 'Cronjob steuert die Haustechnik', 'Ja. Ein Cronjob von mir hat statt Backups das Licht geschaltet. Ist korrigiert. Die Backups laufen jetzt auch.'))],
      ['ansible', sit('¯\\_(ツ)_/¯', 'Marketing', f('office', 'Mein Bildschirmhintergrund wird jeden Morgen zurückgesetzt. Auf ein Logo mit „YAML“.', 'Ansible-Playbook für alle Rechner', 'Das Playbook galt für alle Rechner statt nur für Server. Ihr Hintergrund bleibt jetzt, wie er ist.'))],
      ['k8s', sit('(•̀ᴗ•́)و', 'Projektleitung', q('server', 'Unser Wiki ist jetzt hochverfügbar, sagt ihr. Lesen tut es trotzdem keiner.', 'Wiki hochverfügbar, ungelesen', 'Hochverfügbar heißt, es ist immer da, wenn es keiner liest. Ich verlinke es in jeder Antwort. Hilft auch nicht.'))],
      ['bash', sit('(ಠ_ಠ)', 'Buchhaltung', q('sicherheit', 'In meinem Ordner liegt eine Datei namens „fix_all.sh“. Darf ich die mal doppelklicken?', 'Unbekanntes Skript im Ordner', 'Bitte NICHT doppelklicken. Die ist von mir, aus Versehen bei Ihnen gelandet. Ich hol sie ab.'))],
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
  ],
});

export function situationalCalls(state: GameState, now: Date): Call[] {
  return SITUATIONS.filter((s) => s.when(state, now)).flatMap((s) => s.calls);
}
