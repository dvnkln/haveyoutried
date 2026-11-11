// Melodien zum Doppelten Espresso: solange eine Taste gehalten wird, läuft eine davon im Takt
// (ein Daumen: mit Bass, zwei Daumen: schneller, zweite Stimme und Schlagzeug). Je Tasse wird eine gewürfelt.
// Klassik: gemeinfrei. Elektro: eigene Stücke im Stil (keine Kopien echter Titel).

export type MelodyStyle = 'classic' | 'synth' | 'acid' | 'chip';
/** [Note („C#5“) oder null = Pause, Länge in Sechzehnteln] */
export type MelodyStep = [string | null, number];

export interface Melody {
  id: string;
  name: string;
  style: MelodyStyle;
  /** Sechzehntel pro Sekunde mit einem Daumen (zwei Daumen: schneller) */
  speed: number;
  notes: MelodyStep[];
  /** Bass je Takt (16 Sechzehntel); fehlt = Bass folgt der Melodie zwei Oktaven tiefer */
  bass?: string[];
}

/** „A3 B3 -“: alle gleich lang (Sechzehntel), „-“ = Pause */
const even = (list: string, dur = 1): MelodyStep[] => list.split(' ').map((n) => [n === '-' ? null : n, dur]);
/** „A3:2 B3:4“: Note mit Länge in Sechzehnteln */
const timed = (list: string): MelodyStep[] =>
  list.split(' ').map((x) => {
    const [n, l] = x.split(':');
    return [n === '-' ? null : n!, Number(l ?? 1)];
  });

export const MELODIES: Melody[] = [
  {
    id: 'bergkoenig',
    name: 'In der Halle des Bergkönigs',
    style: 'classic',
    speed: 9,
    notes: timed('A3:2 B3:2 C4:2 D4:2 E4:2 C4:2 E4:4 D#4:2 B3:2 D#4:4 D4:2 Bb3:2 D4:4 A3:2 B3:2 C4:2 D4:2 E4:2 C4:2 E4:2 A4:2 G4:2 E4:2 C4:2 E4:2 G4:8'),
  },
  {
    id: 'tell',
    name: 'Wilhelm Tell (Galopp)',
    style: 'classic',
    speed: 11,
    notes: timed('E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 E5:1 A5:2 B5:2 C#6:4 E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 E5:1 C#6:2 A5:2 E5:4'),
  },
  {
    id: 'cancan',
    name: 'Can-Can',
    style: 'classic',
    speed: 10,
    notes: timed('C4:4 D4:2 F4:2 E4:2 D4:2 G4:4 G4:4 G4:2 A4:2 E4:2 F4:2 D4:4 D4:4 D4:2 F4:2 E4:2 D4:2 C4:2 C5:2 B4:2 A4:2 G4:2 F4:2 E4:2 D4:2'),
  },
  {
    // Hauptmotiv: fünf Töne chromatisch abwärts, Sprung, wieder runter und hoch; dann eine Quarte höher
    id: 'hummel',
    name: 'Hummelflug',
    style: 'classic',
    speed: 12,
    notes: even(
      'E5 D#5 D5 C#5 C5 F5 E5 D#5 E5 D#5 D5 C#5 C5 C#5 D5 D#5 E5 D#5 D5 C#5 C5 F5 E5 D#5 E5 D#5 D5 C#5 C5 C#5 D5 D#5 ' +
        'A5 G#5 G5 F#5 F5 A#5 A5 G#5 A5 G#5 G5 F#5 F5 F#5 G5 G#5 A5 G#5 G5 F#5 F5 A#5 A5 G#5 A5 G#5 G5 F#5 F5 F#5 G5 G#5',
    ),
  },
  {
    id: 'turca',
    name: 'Türkischer Marsch',
    style: 'classic',
    speed: 10,
    notes: timed(
      'B4:1 A4:1 G#4:1 A4:1 C5:4 D5:1 C5:1 B4:1 C5:1 E5:4 F5:1 E5:1 D#5:1 E5:1 B5:1 A5:1 G#5:1 A5:1 B5:1 A5:1 G#5:1 A5:1 C6:4 ' +
        'A5:2 C6:2 B5:2 A5:2 G5:2 A5:2 B5:2 A5:2 G5:2 A5:2 B5:2 A5:2 G5:2 F#5:2 E5:4',
    ),
  },
  {
    id: 'synthwave',
    name: 'Nachtschicht (Synthwave)',
    style: 'synth',
    speed: 8,
    notes: even(
      'A3 C4 E4 A4 E4 C4 A3 C4 A3 C4 E4 A4 B4 A4 E4 C4 F3 A3 C4 F4 C4 A3 F3 A3 F3 A3 C4 F4 G4 F4 C4 A3 ' +
        'C4 E4 G4 C5 G4 E4 C4 E4 C4 E4 G4 C5 D5 C5 G4 E4 G3 B3 D4 G4 D4 B3 G3 B3 G3 B3 D4 G4 A4 G4 D4 B3',
    ),
    bass: ['A1', 'F1', 'C2', 'G1'],
  },
  {
    id: 'acid',
    name: 'Ich bin drin (Acid)',
    style: 'acid',
    speed: 8,
    notes: even('A2 A2 A3 A2 C3 A2 D#3 A2 G2 A2 A3 G3 A2 C3 A2 E3 A2 A2 A3 A2 C3 A2 D#3 E3 G3 A2 A3 A2 C4 A3 G3 E3'),
  },
  {
    id: 'chiptune',
    name: 'Root-Zugriff (Chiptune)',
    style: 'chip',
    speed: 10,
    notes: even('E4 G4 B4 E5 B4 G4 E4 G4 D4 F#4 A4 D5 A4 F#4 D4 F#4 C4 E4 G4 C5 G4 E4 C4 E4 B3 D#4 F#4 B4 F#4 D#4 F#4 B4'),
    bass: ['E2', 'C2'],
  },
  {
    id: 'terminal',
    name: 'Dunkles Terminal',
    style: 'synth',
    speed: 8,
    notes: even('E3 E3 E4 E3 E3 D4 E3 E3 B3 E3 E3 G3 E3 E3 A3 B3 E3 E3 E4 E3 E3 D4 E3 E3 G4 F#4 E4 D4 B3 A3 G3 B3'),
    bass: ['E1', 'E1'],
  },
];

/** zwei Daumen: so viel schneller */
export const MELODY_FAST = 1.35;

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** „A4“ → 440 Hz; unbekannt → NaN */
export function noteFreq(n: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m || NOTE[m[1]!] === undefined) return NaN;
  return 440 * 2 ** ((NOTE[m[1]!]! + (Number(m[2]) + 1) * 12 - 69) / 12);
}
