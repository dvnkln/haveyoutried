// Hintergrundbilder auf dem Desktop: eins je Firma (automatisch nach dem Jobwechsel) und welche zum Sammeln.

/** Szenen, die ui/wallpaper.ts zeichnen kann */
export type Scene = 'huegel' | 'corp' | 'bsod' | 'poster' | 'serverraum' | 'nacht' | 'plaid' | 'katze';

export interface CompanyWall {
  /** Hausfarbe */
  color: string;
  slogan: string;
  /** eigene Szene statt Firmen-Vorlage */
  scene?: Scene;
}

/** Firmen-Hintergrundbilder: Logo, Hausfarbe, Slogan */
export const COMPANY_WALLS: Record<string, CompanyWall> = {
  mueller: { color: '#2f6db5', slogan: 'Wir liefern. Irgendwann.' },
  stadtwerke: { color: '#e8932f', slogan: 'Strom. Wasser. Fax.' },
  startup: { color: '#e9b800', slogan: 'Disrupting Bananen seit Dienstag.' },
  klinik: { color: '#4fa982', slogan: 'Ihre Daten sind bei uns in Excel.' },
  amt: { color: '#7d838e', slogan: 'Bitte ziehen Sie eine Nummer.' },
  agentur: { color: '#e5527f', slogan: 'Wir machen was mit digital.' },
  versicherung: { color: '#1f4e79', slogan: 'Seit 1897 nicht zuständig.' },
  uni: { color: '#4062bb', slogan: 'Forschung. Lehre. Druckerprobleme.' },
  konzern: { color: '#3b3b58', slogan: 'Synergien heben. Tickets weiterleiten.' },
  keller: { color: '#6d5a4d', slogan: 'Ganz oben. Außer die IT.' },
  schaden: { color: '#b23a48', slogan: 'Schäden M–Z. A–L bitte warten.' },
  middleout: { color: '#2e9e6f', slogan: 'Optimale Tip-to-Tip-Effizienz.' },
  kirche: { color: '#8e63c0', slogan: 'Und vergib uns unsere Updates.' },
  fc: { color: '#2a8f3f', slogan: 'Echte Liebe. Kein Paketverlust.' },
  steuer: { color: '#5c6f7b', slogan: 'Wir finden jede Lücke. Außer im Backup.' },
  baeckerei: { color: '#c98a4b', slogan: 'Frisch aus der Cloud. Täglich ab 5 Uhr.' },
  esoterik: { color: '#8a4fd6', slogan: 'Ihr Server hat eine schwierige Aura.' },
  bundesamt: { color: '#b8202c', slogan: 'Digital first. Fax second.' },
  autohaus: { color: '#a85a1c', slogan: 'Gebraucht. Wie unsere Server.' },
  kita: { color: '#f08c00', slogan: 'Kleine Bits, große Abstürze.' },
  reederei: { color: '#1d7a8c', slogan: 'Volle Fahrt. Leichte Schlagseite.' },
  zoo: { color: '#5d8c3e', slogan: 'Pinguine bitte nicht ans WLAN lassen.' },
  pommes: { color: '#d9480f', slogan: 'Pommes rot-weiß. Kabel blau-gelb.' },
  theater: { color: '#7b2cbf', slogan: 'Jeder Absturz ein Drama.' },
  weingut: { color: '#722f37', slogan: 'Reift seit 1612. Wie unser Server.' },
  unicorn: { color: '#0096c7', slogan: 'Kein Produkt. Aber Vision.' },
};

export interface CollectWall {
  id: string;
  name: string;
  scene: Scene;
  /** freigeschaltet durch dieses Achievement; fehlt = immer da */
  achievement?: string;
}

export const COLLECT_WALLS: CollectWall[] = [
  { id: 'huegel', name: 'Werkseinstellung', scene: 'huegel' },
  { id: 'katze', name: 'Durchhalten', scene: 'katze', achievement: 'callers100' },
  { id: 'poster', name: 'Synergie', scene: 'poster', achievement: 'mission' },
  { id: 'nacht', name: 'Nachtschicht', scene: 'nacht', achievement: 'night' },
  { id: 'serverraum', name: 'Serverraum', scene: 'serverraum', achievement: 'fullstack' },
  { id: 'bsod', name: 'Blauer Bildschirm', scene: 'bsod', achievement: 'chaos' },
  { id: 'plaid', name: 'Kariert', scene: 'plaid', achievement: 'streak100' },
];

/** Texte in den Szenen */
export const SCENE_TEXT = {
  bsod: {
    face: ':(',
    text: 'Ihr Hintergrundbild ist auf ein Problem gestoßen und muss neu gestartet werden.',
    progress: '27 % abgeschlossen. Seit gestern.',
  },
  poster: { title: 'SYNERGIE', text: 'Gemeinsam schaffen wir es, dass keiner zuständig ist.' },
  katze: 'Durchhalten. Freitag kommt.',
  plaid: 'Sie sind auf Kariert gegangen.',
};
