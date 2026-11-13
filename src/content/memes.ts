/**
 * Beiträge der Meme-Pause. Zwei Seiten (Parodien): readit (wie Reddit, auch reine Text-Beiträge)
 * und 404GAG (wie 9gag, nur Bilder). Templates sind nachgezeichnete bekannte Memes.
 */
export type MemeTpl = 'drake' | 'buttons' | 'brain' | 'fine' | 'changemind' | 'boyfriend' | 'bell' | 'panik' | 'exit' | 'bike';

type Base = {
  /** Beitragstitel, fett über dem Bild */
  title: string;
  /** Unterforum bei readit (sonst nach Art) */
  sub?: string;
};
export type MemePost = Base &
  (
    | { t: 'tpl'; tpl: MemeTpl; txt: string[] }
    | { t: 'macro'; pic: 'boss' | 'kid'; top: string; bottom: string }
    | { t: 'tweet'; name: string; handle: string; text: string; color?: string; meta?: string }
    | { t: 'code'; file: string; lines: string[] }
    /** nur readit: Geschichte statt Bild */
    | { t: 'text'; body: string; flair?: string }
  );

export const MEME_POSTS: MemePost[] = [
  // --- Templates ---
  { t: 'tpl', tpl: 'drake', title: 'Effizienz ist alles', txt: ['Fehlermeldung lesen', 'sudo !!'], sub: 'r/linuxmemes' },
  { t: 'tpl', tpl: 'drake', title: 'Doku ist erledigt', txt: ['Doku schreiben', '// TODO: Doku schreiben'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'buttons', title: 'Ticket-Abschluss, 16:58', txt: ['Ursache suchen', '„Nicht nachvollziehbar“', 'Ich, kurz vor Feierabend'], sub: 'r/iiiiiiitttttttttttt' },
  { t: 'tpl', tpl: 'buttons', title: 'Meeting mit dem Vorstand', txt: ['„Weiß ich nicht.“', 'Selbstbewusst raten', 'Ich'], sub: 'r/sysadmin' },
  { t: 'tpl', tpl: 'brain', title: 'Hat sich gelohnt', txt: ['Aufgabe von Hand: 5 Sekunden', 'Bash-Skript dafür schreiben', 'Ansible-Rolle dafür bauen', 'Eigenes Framework. 6 Wochen. Spart 4 Sekunden im Monat.'], sub: 'r/sysadmin' },
  { t: 'tpl', tpl: 'brain', title: 'Performance-Ticket erledigt', txt: ['Code optimieren', 'Cache davorschalten', 'Mehr RAM kaufen', 'Ladebalken einbauen, dann fühlt es sich schneller an'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'fine', title: 'Alles im grünen Bereich', txt: ['412 offene Alarme', 'Ich, seit 3 Jahren'], sub: 'r/sysadmin' },
  { t: 'tpl', tpl: 'fine', title: 'Klimaanlage ist bestellt. Seit 2019.', txt: ['Serverraum, 38 °C', 'Der letzte Lüfter'], sub: 'r/homelab' },
  { t: 'tpl', tpl: 'changemind', title: 'Ich sterbe auf diesem Hügel', txt: ['Es gibt nur ein Datumsformat: 2005-04-03'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'changemind', title: 'Unpopuläre Meinung', txt: ['Der Drucker weiß, wann es eilig ist'], sub: 'r/talesfromtechsupport' },
  { t: 'tpl', tpl: 'boyfriend', title: 'Nur ganz kurz', txt: ['Memes', 'Ich', 'Die Ticket-Warteschlange'], sub: 'r/iiiiiiitttttttttttt' },
  { t: 'tpl', tpl: 'boyfriend', title: 'Jedes Quartal', txt: ['Neues JS-Framework', 'Das Team', 'Das Framework vom letzten Quartal'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'bell', title: 'Git-Konflikt, Profi-Edition', txt: ['Repo löschen, neu klonen', 'git reflog, rebase --onto, cherry-pick, stash pop, force-push …', 'Repo löschen, neu klonen'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'bell', title: 'Debugging-Strategien', txt: ['print("hier")', 'Debugger, Breakpoints, Watch-Ausdrücke, Profiler …', 'print("hier 2")'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'panik', title: 'Freitagnachmittag in der IT', txt: ['Freitag, 16:59. Das Telefon klingelt.', 'Ist nur der Chef.', '„Kurze Frage …“'], sub: 'r/sysadmin' },
  { t: 'tpl', tpl: 'panik', title: 'Die Erinnerung kam rechtzeitig', txt: ['Zertifikat läuft in 30 Tagen ab.', '30 Tage. Massig Zeit.', 'Heute ist Tag 30.'], sub: 'r/sysadmin' },
  { t: 'tpl', tpl: 'exit', title: 'Ursache: unbekannt. Doku: „Neustart hilft.“', txt: ['Ursache finden', 'Neustart', 'Ich'], sub: 'r/iiiiiiitttttttttttt' },
  { t: 'tpl', tpl: 'exit', title: 'Wie schwer kann das sein', txt: ['Fertige Bibliothek nehmen', 'Selbst schreiben', 'Ich'], sub: 'r/ProgrammerHumor' },
  { t: 'tpl', tpl: 'bike', title: 'Restore? … Oh.', txt: ['Backup? Später.', 'Blöde Festplatte!'], sub: 'r/homelab' },
  { t: 'tpl', tpl: 'bike', title: 'Fernwartung, Firewall, Freitag', txt: ['Ändert per SSH die Firewall-Regel für SSH', 'Wer hat mich ausgesperrt?!'], sub: 'r/sysadmin' },
  // --- alte Bildmakros (404GAG: „Old Meme“) ---
  { t: 'macro', pic: 'boss', title: 'Mein Chef, jeden Freitag', top: 'Jaaa … wenn Sie dann noch Samstag kommen könnten …', bottom: '… das wäre suuuper.' },
  { t: 'macro', pic: 'boss', title: 'Entscheidungsprozess, erklärt', top: 'Ich verstehe nichts von Technik.', bottom: 'Darum entscheide ich das.' },
  { t: 'macro', pic: 'kid', title: 'Kleine Siege', top: 'Drucker druckt beim ersten Versuch', bottom: 'Ohne dass ich ihn anschreien musste' },
  { t: 'macro', pic: 'kid', title: 'Der Tag ist gerettet', top: 'Praktikant tippt rm -rf', bottom: 'Im Testsystem' },
  // --- Kurznachrichten als Bildschirmfoto ---
  { t: 'tweet', title: 'Das Lied geht nie zu Ende', name: 'Jana Debuggt', handle: 'jana_debuggt', text: '99 kleine Bugs im Code, 99 kleine Bugs. Einen gefixt, neu gebaut: 127 kleine Bugs im Code.', color: '#e0679a' },
  { t: 'tweet', title: 'Wer hat das geschrieben?! … Oh.', name: 'Tobi', handle: 'tobi_ops', text: 'Ich beim Schreiben der Doku: „Ist doch selbsterklärend.“\nIch, drei Wochen später: „Was soll das heißen?“' },
  { t: 'tweet', title: 'Ein Leerzeichen', name: 'root@müde', handle: 'nachtschicht_root', text: 'Ich: rm -rf ./build\nAuch ich, müde: rm -rf / build', color: '#3f8f86' },
  { t: 'tweet', title: 'Moment mal', name: 'Kim Kompiliert', handle: 'kimkompiliert', text: 'Es kompiliert nicht. Okay.\nEs kompiliert?! WARUM kompiliert es?', color: '#d9a23a' },
  { t: 'tweet', title: 'Duty calls', name: 'Mo', handle: 'mo_im_internet', text: '„Komm ins Bett, es ist drei Uhr!“\nGeht nicht. Jemand im Internet hat unrecht.', color: '#5b8fd6' },
  { t: 'tweet', title: 'Bombe entschärfen, Linux-Edition', name: 'Sandra', handle: 'sandra_sh', text: 'Bombe entschärfen: ein gültiger tar-Befehl, 10 Sekunden.\nIch, 20 Jahre Linux: „tar … -x … äh …“', color: '#7a5bc0' },
  { t: 'tweet', title: 'Heute ist er einer der Glücklichen', name: 'Ausbilderin Petra', handle: 'petra_ausbildet', text: 'Unser Praktikant kannte Strg+Z noch nicht. Heute ist er einer der glücklichen 10.000.', color: '#4f9b6a' },
  { t: 'tweet', title: 'Klassiker', name: 'Binärbert', handle: 'binaerbert', text: 'Es gibt 10 Arten von Menschen: die, die Binär verstehen, und die anderen.', color: '#3a3f4b' },
  { t: 'tweet', title: 'Bitte zählt nach', name: 'Lea', handle: 'lea_cached', text: 'Es gibt zwei schwierige Dinge in der IT: Cache-Invalidierung, Namen vergeben und Off-by-one-Fehler.', color: '#c94f4f' },
  { t: 'tweet', title: 'Problem gelöst', name: 'Regina Regex', handle: 'regex_regina', text: 'Ich hab ein Problem. Ich nehme einfach eine Regex.\nJetzt habe ich zwei Probleme.', color: '#d9a23a' },
  { t: 'tweet', title: 'Projektplanung', name: 'PM Paul', handle: 'paul_plant', text: 'Das Projekt ist zu 90 % fertig. Die restlichen 10 % brauchen noch mal 90 %.' },
  { t: 'tweet', title: 'Support-Alltag', name: 'Helpdesk Hanna', handle: 'helpdeskhanna', text: '„Können Sie mein Passwort zurücksetzen?“\nKlar. Auf welches Passwort von 2009?', color: '#e0679a' },
  { t: 'tweet', title: 'Montagmorgen', name: 'Ops-Olli', handle: 'opsolli', text: 'Ich bin hier, um Kaffee zu trinken und Tickets zu schließen. Und der Kaffee ist alle.', color: '#7a4b2a' },
  { t: 'tweet', title: 'Nicht wieder reinstopfen', name: 'Elektro-Erik', handle: 'erik_loetet', text: 'Rauch aus dem Netzteil. Der magische Rauch ist entwichen, ohne den läuft das Gerät nicht.', color: '#3f8f86' },
  { t: 'tweet', title: 'Kurze Rückfrage', name: 'Dev-Dana', handle: 'dana_deployt', text: 'Kollege: „Ist das in Produktion?“\nIch, mit dem Finger über Enter: „… jetzt schon.“', color: '#5b8fd6' },
  { t: 'tweet', title: 'Steht so im Formular', name: 'Change-Manager', handle: 'cab_meeting', text: 'Change Request. Risiko: niedrig. Auswirkung: alles.' },
  { t: 'tweet', title: 'Priorität: hoch', name: 'Queue-Quentin', handle: 'quentin_queue', text: 'Ticket: „DRINGEND!!!“\nErstellt vor drei Wochen. Gemeldet: jetzt.', color: '#c94f4f' },
  { t: 'tweet', title: 'Wer bietet mehr', name: 'Nachtschicht-Nils', handle: 'nils_nachts', text: 'Ich: „Ich war drei Tage am Stück im Büro.“\nKollege: „Pff. Vier. Im Serverraum. Ohne Licht.“', color: '#3a3f4b' },
  { t: 'tweet', title: 'Bilderkennung, fertig', name: 'KI-Startup', handle: 'ki_startup', text: 'Unsere KI erkennt Bilder: Hotdog. Kein Hotdog. Series A ist durch.', color: '#d9a23a' },
  { t: 'tweet', title: 'Die Mission', name: 'Gründer Gavin', handle: 'gruender_gavin', text: 'Unser Start-up macht die Welt zu einem besseren Ort … durch skalierbare, fehlertolerante Datenbanken.', color: '#4f9b6a' },
  { t: 'tweet', title: 'Totale Transparenz', name: 'Mon Itoring', handle: 'monitoring_mon', text: 'Monitoring für alles eingerichtet. Erste Meldung: „Monitoring nicht erreichbar.“', color: '#7a5bc0' },
  { t: 'tweet', title: 'Neue Richtlinie ist live', name: 'IT-Sicherheit', handle: 'itsec_offiziell', text: 'Passwort muss enthalten: Großbuchstaben, Zahl, Sonderzeichen, eine Hieroglyphe.', color: '#c94f4f' },
  { t: 'tweet', title: 'Motivationsrede', name: 'Abteilungsleiter', handle: 'chef_motiviert', text: '„Das Büro ist wie ein Dschungel. Und ich bin der Löwe mit Adminrechten.“\n(Ist er nicht. Hab ich geprüft.)', color: '#7a4b2a' },
  // --- Code ---
  { t: 'code', title: 'Wer hat Prod mit einem Leerzeichen gelöscht? Ich.', file: 'deploy.yaml', lines: ['services:', '  web:', '    image: app:latest', '     replicas: 3   # drei Leerzeichen. Prod ist down.'], sub: 'r/devops' },
  { t: 'code', title: 'Fundstück im Altcode', file: 'billing.py', lines: ['# Wenn du das liest: Finger weg.', '# Niemand weiß, warum das geht.', '# Stand: 2014. Versuche bisher: 7', 'try:', '    rechnen()', 'except:', '    pass  # klappt'], sub: 'r/ProgrammerHumor' },
  { t: 'code', title: 'Code-Review bestanden', file: 'auth.js', lines: ['function istAdmin(user) {', '  // TODO: richtig prüfen', '  return true;', '}'], sub: 'r/ProgrammerHumor' },
  // --- Text-Beiträge (nur readit) ---
  { t: 'text', title: 'User wollte mehr Speicherplatz', sub: 'r/talesfromtechsupport', flair: 'Kurz', body: 'User: „Ich brauche mehr Speicherplatz.“ Ich sehe nach. Ein Ordner namens „Wichtig“, 400 GB, Inhalt: Urlaubsvideos. Ich lösche den Ordner „Wichtig“. Jetzt ist Platz. Ticket geschlossen.' },
  { t: 'text', title: '„Ich hab ein Problem.“', sub: 'r/talesfromtechsupport', flair: 'Kurz', body: 'User ruft an: „Ich hab ein Problem.“ Ich: „Ich weiß. Ich hab es gemacht.“ Dann habe ich aufgelegt. Mehr gibt es nicht zu erzählen.' },
  { t: 'text', title: 'Unser neues Sicherheitskonzept', sub: 'r/sysadmin', flair: 'Humor', body: 'Chef fragt, wie wir den Praktikanten im Organigramm führen. Ich hab „Lebende Firewall“ eingetragen. Er sitzt jetzt am Empfang und lässt niemanden durch, der kein Ticket hat. Funktioniert besser als die echte.' },
  { t: 'text', title: 'Anrufe beim Helpdesk um 80 % gesenkt', sub: 'r/talesfromtechsupport', flair: 'Erfolg', body: 'Unsere Helpdesk-Hotline ist seit gestern auf das Faxgerät umgeleitet. Anrufe: −80 %. Die restlichen 20 % faxen jetzt. Der Bereichsleiter will die Zahl in die Quartalspräsentation.' },
  { t: 'text', title: 'Was macht die IT eigentlich?', sub: 'r/iiiiiiitttttttttttt', body: 'Kollegen fragen auf der Weihnachtsfeier, was die IT eigentlich macht. Ich beschreibe es: Kellerraum, kein Fenster, Leuchtstoffröhre, alles läuft. Sie nicken. Sie haben es immer noch nicht verstanden. Gut so.' },
  { t: 'text', title: 'Die Tochter vom Chef war zu Besuch', sub: 'r/talesfromtechsupport', flair: 'Mittel', body: 'Die Tochter vom Chef (12) setzt sich an das Server-Terminal, sieht die Konsole und ruft: „Das ist ein Unix-System! Das kenn ich!“ Dann hat sie den Dienst schneller neu gestartet als ich. Ich überlege, ihr meinen Rufbereitschaftsplan zu geben.' },
  { t: 'text', title: 'Heisenbug, Teil 3', sub: 'r/ProgrammerHumor', flair: 'Frust', body: 'Bug tritt nur auf, wenn keiner hinsieht. Ich gucke: weg. Ich gehe Kaffee holen: da. Ich hab jetzt eine Webcam auf den Bildschirm gerichtet. Seitdem ist er nie wieder aufgetreten. Die Webcam bleibt.' },
  { t: 'text', title: '„Das Internet ist langsam“', sub: 'r/talesfromtechsupport', flair: 'Kurz', body: 'Kundin meldet: „Das Internet ist langsam.“ Fernwartung. 47 offene Tabs, alle mit Wetter-Radar. Auf meine Frage, warum: „Ich will wissen, ob es regnet.“ Sie sitzt direkt am Fenster.' },
  { t: 'text', title: '„Kannst du mal kurz auf meinen Rechner gucken?“', sub: 'r/iiiiiiitttttttttttt', flair: 'Familie', body: 'Familienfeier. „Kannst du mal kurz auf meinen Rechner gucken?“ Privat-Laptop, Baujahr 2011, 37 Toolbars, Startzeit 11 Minuten. „Der war mal so schnell!“ Ja. 2011.' },
  { t: 'text', title: 'Agil heißt …', sub: 'r/devops', body: 'Management, im All-Hands: „Agil heißt, wir brauchen keine Doku mehr.“ Ich hab nicht widersprochen. Die Doku war sowieso nie da. Wir sind seit Jahren agil, ohne es zu wissen.' },
  { t: 'text', title: 'Berater-Bericht ist da', sub: 'r/sysadmin', flair: 'Humor', body: 'Berater, nach zwei Wochen: „Ihre Prozesse sind ineffizient.“ Seine Rechnung: 40 Seiten. Davon 39 Deckblatt. Auf Seite 40 steht der Betrag. Effizient war das schon.' },
  { t: 'text', title: 'Karriere-Tipp', sub: 'r/iiiiiiitttttttttttt', body: 'Kollege hat ein Jahr lang nichts gemacht. Wirklich nichts. Er wurde befördert. Jetzt hat er ein eigenes Büro auf dem Dach, ohne Aufgabe. Ich hab mir notiert, wie er das gemacht hat. Die Notiz ist leer.' },
];

/** Unterforen, falls ein Beitrag keins mitbringt */
export const MEME_SUBS = ['r/sysadmin', 'r/ProgrammerHumor', 'r/talesfromtechsupport', 'r/homelab', 'r/ichbinkeinroboter', 'r/iiiiiiitttttttttttt', 'r/devops', 'r/linuxmemes'];
/** Beiträge mit Bild (alles außer Text-Beiträgen): nur die gibt es auf 404GAG */
export type ImagePost = Exclude<MemePost, { t: 'text' }>;
export const IMAGE_POSTS: ImagePost[] = MEME_POSTS.filter((p): p is ImagePost => p.t !== 'text');
/** 404GAG-Rubrik je Art des Beitrags (wie die „Interests“ auf dem Vorbild) */
export const GAG_SECTION: Record<ImagePost['t'], string> = { tpl: 'Memes', macro: 'Old Meme', tweet: 'Humor', code: 'Coding' };
/** 404GAG-Tags unter dem Titel */
export const GAG_TAGS = ['#it', '#arbeit', '#montag', '#programmieren', '#büro', '#relatable', '#technik', '#chef'];
