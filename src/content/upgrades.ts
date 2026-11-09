import { GENERATOR_TEXT } from './generators';
import type { UpgradeEffect } from '../config';

export interface UpgradeText {
  name: string;
  desc: string;
}

export const UPGRADE_TEXT: Record<string, UpgradeText> = {
  // Klick
  coffee: { name: 'Kaffeemaschine', desc: 'Läuft durch wie der Admin. Entkalkt wurde sie 2017.' },
  mousepad: {
    name: 'Mauspad mit Werbung',
    desc: 'Vom Hardware-Lieferanten, Messe 2011. Das Logo ist abgerieben, die Maus läuft wieder geradeaus.',
  },
  mouse: {
    name: 'Ergonomische Maus',
    desc: 'Rund, gummiert, mit grünem Mausrad, 89 €. Nebenbei ein Klick ins Dashboard, und die Skripte laufen weiter, während du tippst. Die Kollegen fragen, ob das ein Ufo ist.',
  },
  keyboard: { name: 'Mechanische Tastatur', desc: 'Cherry MX Blue. Das Großraumbüro hasst dich. Du tippst doppelt so schnell.' },
  answering: {
    name: 'Anrufbeantworter mit Ansage',
    desc: '„Hallo, IT. Haben Sie es schon aus- und wieder eingeschaltet?“ Löst 40 % aller Anrufe, ohne dass jemand abhebt.',
  },
  headset: {
    name: 'Headset mit Mute-Taste',
    desc: 'Telefonieren und nebenbei die Cronjobs anschubsen. Die Mute-Taste rettet dich in jedem Call, in dem du gerade „Kann der nicht einfach…“ sagen wolltest.',
  },
  basement: { name: 'Büro im Keller', desc: 'Kein Fenster, kein Handyempfang, keine Besucher. Die Produktivität ist beängstigend.' },
  monitor2: {
    name: 'Neuer Monitor: HYT-3000 PRO',
    desc: '17 Zoll Röhre, platingrau, blaue Power-LED. Wiegt 23 kg, der Tisch biegt sich. Flimmert nur noch dienstags.',
  },
  macro: { name: 'Textbaustein', desc: 'Strg+Alt+R: „Haben Sie es schon aus- und wieder eingeschaltet?“ Die gesparte Zeit verbringst du im Monitoring. Angeblich.' },
  duck: { name: 'Rubber Duck', desc: 'Hört zu. Urteilt nicht. Löst die Hälfte aller Probleme durch Schweigen.' },

  // Global
  rtfm: { name: 'RTFM', desc: 'Du hast das Handbuch gelesen. Es stand nichts Hilfreiches drin, aber du fühlst dich überlegen.' },
  kanban: { name: 'Kanban-Board', desc: 'Spalten: „Todo“, „Doing“, „Brennt“. Alles steht in „Brennt“.' },
  monitoring: { name: 'Monitoring, das nicht nur rot ist', desc: 'Zum ersten Mal alles grün. Verdächtig.' },
  freeze: { name: 'Change Freeze', desc: 'Niemand darf irgendwas ändern. Endlich Ruhe. Die Tickets schließen sich fast von selbst.' },

  // Praktikant
  'intern-1': { name: 'Eigener Schreibtisch', desc: 'Statt Klappstuhl neben dem Drucker. Mit Pflanze. Produktivität verdoppelt, Rückenschmerzen halbiert.' },
  'intern-2': { name: 'Admin-Rechte (temporär)', desc: 'Seit 2019 temporär. Die Zugangsdaten kleben jetzt als Post-it am Monitor.' },
  'intern-3': { name: 'Übernahmeangebot', desc: 'Sie bleiben. Für Mindestlohn, Club-Mate und das Versprechen „nächstes Jahr mehr“.' },
  // Bash
  'bash-1': { name: 'set -euo pipefail', desc: 'Scheitert jetzt laut statt leise. Das nennt man Fortschritt.' },
  'bash-2': { name: 'Kommentare', desc: '„# keine Ahnung warum, aber nicht entfernen“ zählt als Doku.' },
  'bash-3': { name: 'ShellCheck', desc: '1.437 Warnungen. Alle als „false positive“ markiert. Läuft trotzdem schneller.' },
  // Cron
  'cron-1': { name: 'MAILTO=""', desc: 'Keine Cron-Mails mehr. Was man nicht sieht, ist nicht kaputt.' },
  'cron-2': { name: 'flock', desc: 'Jobs laufen nicht mehr fünfmal parallel. Meistens.' },
  'cron-3': { name: 'systemd-Timer', desc: 'Wie Cron, nur mit Unit-File, Drop-in und drei Wochen Einarbeitung.' },
  // Ansible
  'ansible-1': { name: '--check', desc: 'Dry Run. Meldet „changed: 0“. Lügt.' },
  'ansible-2': { name: 'Ansible Vault', desc: 'Alle Passwörter verschlüsselt. Das Vault-Passwort steht im README.' },
  'ansible-3': { name: 'Echte Idempotenz', desc: 'Zweimal ausgeführt, gleiches Ergebnis. Ein historischer Moment.' },
  // Kubernetes
  'k8s-1': { name: 'Helm-Chart', desc: 'Templates, die Templates templaten.' },
  'k8s-2': { name: 'Liveness-Probe', desc: 'Startet Pods neu, bis es funktioniert. Kommt dir irgendwie bekannt vor.' },
  'k8s-3': { name: 'Service Mesh', desc: 'Jetzt versteht wirklich niemand mehr den Netzwerkverkehr. Aber er ist verschlüsselt.' },
  // AI-Agent
  'agent-1': { name: 'Prompt: „Sei hilfreich“', desc: 'Hilft. Sehr. Hat drei Tickets direkt an den Vorstand eskaliert.' },
  'agent-2': { name: 'Human in the Loop', desc: 'Der Praktikant klickt auf „Genehmigen“. Gelesen wird nichts.' },
  'agent-3': { name: 'Halluzinationsfilter', desc: 'Erfundene RFCs nur noch freitags. „Tut mir leid, Dave“ sagt er auch nicht mehr.' },
  // Server unterm Tisch
  'undertable-1': { name: 'Schild „NICHT AUSSTECKEN“', desc: 'Handgeschrieben, Edding, laminiert. Wirkt seit 2009.' },
  'undertable-2': { name: 'Staubsauger', desc: 'Erstmals seit Inbetriebnahme abgesaugt. Die Uptime hat überlebt. Knapp.' },
  'undertable-3': { name: 'Doku gefunden', desc: 'Ein Post-it auf der Rückseite: „Nicht neu starten. —K.“ Wer ist K.?' },
};

const pct = (mult: number) => `+${Math.round((mult - 1) * 100)} %`;

/** Kurzbeschreibung der Wirkung für die UI. */
export function effectLabel(effect: UpgradeEffect): string {
  switch (effect.kind) {
    case 'click':
      return `Tippen ×${effect.mult} schneller`;
    case 'clickPps':
      return `Anschlag +${Math.round(effect.fraction * 100)} % der Tickets/s`;
    case 'solveSec':
      return `Ticket +${effect.sec.toLocaleString('de-DE')} s Produktion`;
    case 'gen':
      return `${GENERATOR_TEXT[effect.gen].name} ×${effect.mult}`;
    case 'global':
      return `Alles ${pct(effect.mult)}`;
  }
}
