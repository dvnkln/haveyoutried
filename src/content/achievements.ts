import { GENERATORS, INCIDENT_IDS, INCIDENTS, UPGRADES, type EventEffectId } from '../config';
import type { GameState } from '../core/state';
import { EVENTS } from './events';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** geheim: Name und Beschreibung erst nach dem Freischalten sichtbar */
  hidden?: boolean;
  /** Uhrzeit-Achievements: nur, wenn der Spieler gerade aktiv ist */
  needsActivity?: boolean;
  check: (s: GameState, now: Date) => boolean;
}

const flag = (s: GameState, key: string) => s.flags[key] ?? 0;

/** Zählerschlüssel für einen Event-Ausgang; Option per Beschriftung, damit Umsortieren nichts kaputt macht. */
function ev(eventId: string, optionLabel: string, effect: EventEffectId): string {
  const def = EVENTS.find((e) => e.id === eventId);
  const idx = def?.options.findIndex((o) => o.label === optionLabel) ?? -1;
  if (!def || idx < 0) throw new Error(`Achievement verweist auf unbekannte Event-Option: ${eventId}/${optionLabel}`);
  return `ev:${eventId}:${idx}:${effect}`;
}

/** Prüf-Funktion „dieser Event-Ausgang kam mindestens einmal vor“ – Schlüssel wird sofort berechnet. */
function evHappened(eventId: string, optionLabel: string, effect: EventEffectId): AchievementDef['check'] {
  const key = ev(eventId, optionLabel, effect);
  return (s) => flag(s, key) > 0;
}

const companiesSeen = (s: GameState) => Object.keys(s.flags).filter((k) => k.startsWith('company:')).length;
const at = (d: Date, h: number, m: number) => d.getHours() === h && d.getMinutes() === m;

const owned = (s: GameState, id: (typeof GENERATORS)[number]['id']) => s.generators[id].owned;
const upgradeCount = (s: GameState) => Object.keys(s.upgrades).length;
const best = (s: GameState, id: string) => s.incidents.best[id] ?? 0;
const PERFECT = 0.95;

const a = (
  id: string,
  name: string,
  desc: string,
  check: AchievementDef['check'],
  hidden = false,
): AchievementDef => ({ id, name, desc, check, hidden });

/** Achievement, das nur beim aktiven Spielen zählt (Uhrzeit allein reicht nicht). */
const live = (def: AchievementDef): AchievementDef => ({ ...def, needsActivity: true });

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Tickets & Klicks ---
  a('first', 'Hallo, IT?', 'Das erste Ticket gelöst.', (s) => (s.flags.solved ?? 0) >= 1),
  a('clicks1k', 'Sehnenscheide, Stufe 1', '1.000 Anschläge. Die Tastatur ist eingetippt.', (s) => s.clicks >= 1_000),
  a('clicks10k', 'Sehnenscheide, Stufe 2', '10.000 Anschläge. Die Leertaste glänzt schon.', (s) => s.clicks >= 10_000),
  a('total1k', 'Queue leer? Nie.', '1 K Tickets in einem Job.', (s) => s.ticketsTotal >= 1e3),
  a('total1m', 'Mega-Ticket', '1 M Tickets in einem Job.', (s) => s.ticketsTotal >= 1e6),
  a('total1g', 'Giga-überlastet', '1 G Tickets in einem Job.', (s) => s.ticketsTotal >= 1e9),
  a('total1t', 'Data Lake', '1 T Tickets in einem Job. Niemand wird sie je lesen.', (s) => s.ticketsTotal >= 1e12),
  a('clicks100k', 'Sehnenscheide, Stufe 3', '100.000 Anschläge. Die Physiotherapeutin kennt dich beim Namen.', (s) => s.clicks >= 100_000),
  a('callers100', 'Telefonseelsorge', '100 Anrufer angehört.', (s) => flag(s, 'callers') >= 100),
  a('callbacks10', 'Ich ruf jetzt zum dritten Mal an', '10 Rückrufe ertragen.', (s) => flag(s, 'callbacks') >= 10),
  a('story', 'Fortsetzung folgt', 'Eine Geschichte am Telefon bis zur letzten Folge verfolgt.', (s) => flag(s, 'stories:done') >= 1),
  a('herrk', 'Herr K. hat jetzt Zeit', 'Herrn K. bis in die Rente begleitet. Der Großrechner läuft.', (s) => flag(s, 'storyDone:herrk') >= 1, true),
  a('callers500', 'Ohr mit Headset-Abdruck', '500 Anrufer angehört. Du erkennst die Abteilungen am Klingeln.', (s) => flag(s, 'callers') >= 500),
  a('callbacks50', 'Zum fünfzigsten Mal: Geht immer noch nicht', '50 Rückrufe ertragen. Du nimmst inzwischen mit „Ja, ich weiß“ ab.', (s) => flag(s, 'callbacks') >= 50),
  a('streak10', 'Die Warteschlange hat Angst', '10 Tickets in Folge gelöst, ohne abzusetzen.', (s) => flag(s, 'bestStreak') >= 10),
  a('streak42', 'Die Antwort auf alles', '42 Tickets in Folge gelöst. Handtuch nicht vergessen.', (s) => flag(s, 'bestStreak') >= 42),
  a('streak100', 'Ludicrous Speed', '100 Tickets in Folge. Die Tastatur hat Plaid erreicht.', (s) => flag(s, 'bestStreak') >= 100),
  a('solved500', 'Inbox Zero ist ein Mythos', '500 Tickets komplett beantwortet. Die Warteschlange: unbeeindruckt.', (s) => flag(s, 'solved') >= 500),
  a('uptime', 'Uptime: 365 Tage', '365 Minuten gespielt. In Helpdesk-Zeit ist das ein Jahr.', (s) => s.stats.playTimeMs >= 365 * 60_000),

  // --- Infrastruktur & Upgrades ---
  a('interns25', 'Praktikanten-Rudel', '25 Praktikanten. Die Kaffeemaschine kapituliert.', (s) => owned(s, 'intern') >= 25),
  a('interns100', 'Praktikanten-Armee', '100 Praktikanten. Der Parkplatz ist voll.', (s) => owned(s, 'intern') >= 100),
  a('scripts50', 'Funktioniert, keiner weiß warum', '50 Bash-Skripte.', (s) => owned(s, 'bash') >= 50),
  a('cron100', '03:00 Uhr ist Rushhour', '100 Cronjobs. Nachts ist im Serverraum mehr los als tagsüber.', (s) => owned(s, 'cron') >= 100),
  a('k8s25', 'Hochverfügbares Wiki', '25 Kubernetes-Cluster für drei Besucher im Monat.', (s) => owned(s, 'k8s') >= 25),
  a('agents100', 'Skynet (Beta)', '100 AI-Agents. Sie haben einen Betriebsrat gegründet.', (s) => owned(s, 'agent') >= 100),
  a('undertable', 'Nicht anfassen.', 'Den ersten Server unterm Tisch gefunden.', (s) => owned(s, 'undertable') >= 1),
  a('fullstack', 'Full Stack (Chaos)', 'Von jeder Infrastruktur mindestens eins.', (s) => GENERATORS.every((g) => owned(s, g.id) >= 1)),
  a('upgrades10', 'Budget ausgeschöpft', '10 Upgrades gekauft.', (s) => upgradeCount(s) >= 10),
  a('upgradesAll', 'Change Advisory Board persönlich', 'Alle Upgrades gekauft.', (s) => upgradeCount(s) >= UPGRADES.length),

  // --- Pager-Events ---
  a('dns', 'Es war DNS.', 'Beim DNS-Ausfall die Logs gelesen. Es war DNS.', evHappened('dns', 'Logs lesen', 'win')),
  a('rmrf', 'rm -rf überlebt', 'Nach „rm -rf /*“ das Backup erfolgreich eingespielt.', evHappened('rmrf', 'Backup einspielen', 'win')),
  a('password', 'Passwort war Passwort123', 'Nach der Phishing-Welle alle Passwörter zurückgesetzt.', evHappened('phishing', 'Alle Passwörter zurücksetzen', 'win')),
  a('friday', 'Freitags-Deploy überlebt', 'Freitag 16:55 durchgewunken – und es lief.', evHappened('friday', 'Durchwinken', 'jackpot')),
  a('fridayFail', 'Welches Wochenende?', 'Freitag 16:55 durchgewunken. Es lief nicht.', evHappened('friday', 'Durchwinken', 'fireBig'), true),
  a('replyall', 'Reply-All-Sturm', 'Eine Warnung an alle geschickt. Alle haben geantwortet.', evHappened('phishing', 'Rundmail: „Nicht klicken!“', 'fire'), true),
  a('unplug', 'Du hast ihn ausgesteckt.', 'Den Server unterm Tisch ausgesteckt. Die Lohnabrechnung erinnert sich.', evHappened('beep', 'Ausstecken', 'fireBig'), true),
  a('bobby', 'Little Bobby Tables', 'Die Schuldatenbank gerettet und Eingaben bereinigt.', evHappened('bobby', 'Backup einspielen und Eingaben bereinigen', 'win')),
  a('internetbox', 'Das ist das Internet.', 'Dem Chef einen schwarzen Kasten mit Lämpchen geliehen. Der Vorstand war begeistert.', evHappened('internet', 'Schwarzen Kasten mit Lämpchen geben', 'jackpot')),
  a('nebraska', 'Die Person in Nebraska', 'Die Bibliothek geforkt, auf der alles steht. Jetzt bist du es.', evHappened('nebraska', 'Forken und selbst pflegen', 'overtime')),
  a('firemail', 'Ich schick dazu eine Mail', 'Bei Rauch im Serverraum der Feuerwehr gemailt.', evHappened('fire', 'Mail an die Feuerwehr schreiben', 'fire'), true),
  a('thisisfine', 'This is fine.', 'Bei Rauch im Serverraum erst mal Kaffee getrunken. Es war nicht fine.', evHappened('fire', 'Kaffee trinken. „This is fine.“', 'fireBig'), true),
  a('denvercoder', 'Antwort aus 2009', 'Der Fragesteller aus dem Forum hat nach 17 Jahren geantwortet.', evHappened('forum', 'Den Fragesteller anschreiben', 'jackpot'), true),
  a('cert', 'Ihre Verbindung ist privat', 'Ein abgelaufenes Zertifikat ordentlich erneuert. Statt „Weiter“ zu klicken.', evHappened('cert', 'Neues Zertifikat ausstellen', 'win')),
  a('licenses', 'Lizenz zum Zählen', 'Beim Lizenz-Audit 197 Lizenzen zu viel gefunden. Der Einkauf will nicht darüber reden.', evHappened('audit-license', 'Alle Lizenzen zählen', 'win')),
  a('mission', 'Wir leben Synergien', 'Das Firmenleitbild per Zufallsgenerator geschrieben. Und es wurde genommen.', evHappened('mission', 'Einen Leitbild-Generator schreiben', 'jackpot'), true),
  a('mauve', 'Mauve hat den meisten RAM', 'Den Chef gefragt, in welcher Farbe er seine Datenbank möchte.', evHappened('sqlcolor', 'Fragen, welche Farbe sie haben soll', 'jackpot'), true),
  a('camera', 'Blick in die Kamera', 'Beim Kamerateam einmal lange in die Linse geschaut. Mehr musste man nicht sagen.', evHappened('kamerateam', 'Direkt in die Kamera gucken', 'win'), true),
  a('standort', 'Der Standort bleibt', 'Beim Schließungsgerücht das Netz dokumentiert. Der Chef hat es verhandelt. Sagt er.', evHappened('standort', 'Das Netz sauber dokumentieren', 'win'), true),
  a('mikro', 'Leider kaputt', 'Bei der Betriebsfeier das Mikro sabotiert. Und es hat geklappt.', evHappened('betriebsfeier', 'Mikro „leider kaputt“', 'tip'), true),
  a('chefbutton', 'Der Knopf ist nicht angeschlossen', 'Dem Chef ein Admin-Konto gegeben, das nichts darf. Er ist glücklich.', evHappened('chefpw', 'Ihm ein eigenes Konto geben', 'win'), true),
  a('agentyolo', 'Inbox Zero (technisch)', 'Den KI-Agenten alle Tickets schließen lassen. Und es ging gut. Diesmal.', evHappened('agentclose', 'Freigeben', 'jackpot'), true),
  a('whisperer', 'Druckerflüsterer', 'Dieter gut zugeredet. Er hat aufgehört. Das Stockwerk ist beeindruckt.', evHappened('printerghost', 'Dieter gut zureden', 'rush'), true),
  a('ignore5', 'Nicht mein Problem', '5 Pager-Alarme einfach ignoriert.', (s) => flag(s, 'ev:ignored') >= 5),
  a('espresso1', 'Doppelter Espresso', 'Eine fliegende Kaffeetasse erwischt. Die Finger tippen jetzt allein.', (s) => flag(s, 'espresso') >= 1),
  a('espresso10', 'Koffein-Infusion', '10 Tassen erwischt. Die Hände zittern. Produktiv.', (s) => flag(s, 'espresso') >= 10),
  a('urgent10', 'VIP-Dompteur', '10 „!! DRINGEND !!“-Tickets erwischt.', (s) => flag(s, 'urgent') >= 10),

  // --- Incidents ---
  a('raid', 'RAID ist kein Backup', 'RAID-Rettung mit Bestwertung.', (s) => best(s, 'raid') >= PERFECT),
  a('spam', 'Spamfilter mit Herz', 'Mail-Queue fehlerfrei sortiert.', (s) => best(s, 'spam') >= PERFECT),
  a('services', 'Root Cause Analyst', 'Dienste-Dashboard ohne Fehlgriff gelöst.', (s) => best(s, 'services') >= PERFECT),
  a('loggrep', 'grep-Meister', 'Jeden echten Fehler im Log erwischt.', (s) => best(s, 'loggrep') >= PERFECT),
  a('network', 'OSI-Schichtarbeiter', 'Netzwerkausfall ohne Fehlgriff behoben.', (s) => best(s, 'network') >= PERFECT),
  a('patch', 'Kabelmanagement', 'Patchfeld fehlerfrei verkabelt.', (s) => best(s, 'patch') >= PERFECT),
  a('oncall', 'On-Call-Held', 'Jeden Incident-Typ mindestens einmal gelöst.', (s) => INCIDENT_IDS.every((id) => best(s, id) >= INCIDENTS.goodMin)),

  // --- Karriere ---
  a('quit1', 'Neuer Job, alte Probleme', 'Zum ersten Mal gekündigt.', (s) => s.prestige.jobs >= 1),
  a('quit5', 'Jobhopper', '5 Mal gekündigt. Der Lebenslauf wird lang.', (s) => s.prestige.jobs >= 5),
  a('exp25', 'Senior (laut Signatur)', '15 Punkte Berufserfahrung.', (s) => s.prestige.experience >= 15),
  a('exp100', 'Principal Staff Lead Architect', '50 Punkte Berufserfahrung. Dein Titel passt nicht mehr auf die Visitenkarte.', (s) => s.prestige.experience >= 50),
  a('quit10', 'Lebenslauf länger als die Doku', '10 Mal gekündigt.', (s) => s.prestige.jobs >= 10),
  a('companies5', 'Branchenkenner', 'Bei 5 verschiedenen Firmen gearbeitet. Überall dasselbe.', (s) => companiesSeen(s) >= 5),

  // --- Geheim ---
  a('weekend', 'Wochenende', '8 Stunden am Stück weg gewesen. Es lief auch ohne dich. Leider.', (s) => flag(s, 'offline:capped') > 0, true),
  live(a('night', 'Nachtschicht', 'Zwischen 0 und 5 Uhr gespielt.', (_s, d) => d.getHours() < 5, true)),
  live(a('fridayLate', 'Freitag, 16:55', 'Freitag kurz vor Feierabend noch Tickets geschlossen.', (_s, d) => d.getDay() === 5 && d.getHours() === 16 && d.getMinutes() >= 55, true)),
  a('silent', 'Großraumbüro-tauglich', 'Den Sound ausgeschaltet. Die Kollegen danken.', (s) => !s.settings.sound, true),
  a('loud', 'Großraumbüro-Terror', 'MX Blue auf voller Lautstärke. Die Kollegen planen etwas.', (s) => s.settings.sound && s.settings.volume >= 1 && s.settings.tapSound === 'blue', true),
  a('silentRed', 'Leisetreter', 'Auf MX Silent Red gewechselt. Feigling.', (s) => s.settings.tapSound === 'silent', true),
  live(a('leet', '1337 h4x0r', 'Um 13:37 Uhr gespielt.', (_s, d) => at(d, 13, 37), true)),
  live(a('pi', 'π-hole', 'Um 3:14 Uhr gespielt. Nachts. Warum?', (_s, d) => at(d, 3, 14), true)),
  live(a('monday', 'Montagmorgen, 7:59', 'Montag vor 8 Uhr schon Tickets geschlossen.', (_s, d) => d.getDay() === 1 && d.getHours() < 8, true)),
  live(a('sunday', 'Sonntagsdienst', 'Am Sonntag gespielt. Rufbereitschaft wird nicht vergütet.', (_s, d) => d.getDay() === 0, true)),
  live(a('xmas', 'Weihnachtsbereitschaft', 'An Heiligabend Tickets geschlossen. Der Drucker hat dir ein Lied gedruckt.', (_s, d) => d.getMonth() === 11 && d.getDate() === 24, true)),
  live(a('nye', 'Jahreswechsel im Serverraum', 'Silvester nach 23 Uhr gespielt. Das Feuerwerk ist der Brandmelder.', (_s, d) => d.getMonth() === 11 && d.getDate() === 31 && d.getHours() >= 23, true)),
  a('chaos', 'Ausnahmezustand', 'Drei Boosts oder Bremsen gleichzeitig aktiv.', (s) => s.buffs.length >= 3, true),
];
