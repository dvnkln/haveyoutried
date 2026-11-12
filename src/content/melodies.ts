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
  /**
   * Grundtöne zum Elektro-Bass mit zwei Daumen (Klassik), passend zum Durchlauf der Melodie: [Ton, Länge in Sechzehnteln].
   * Fehlt = aus `bass` (Elektro-Stücke).
   */
  harmony?: MelodyStep[];
}

/** „A3 B3 -“: alle gleich lang (Sechzehntel), „-“ = Pause */
const even = (list: string, dur = 1): MelodyStep[] => list.split(' ').map((n) => [n === '-' ? null : n, dur]);
/** „A3:2 B3:4“: Note mit Länge in Sechzehnteln */
const timed = (list: string): MelodyStep[] =>
  list.split(' ').map((x) => {
    const [n, l] = x.split(':');
    return [n === '-' ? null : n!, Number(l ?? 1)];
  });

/** „E B“ bzw. „E*3“ = dreimal ein Takt (8 Sechzehntel): Grundtöne für `harmony` (Lage egal, der Bass legt sie selbst) */
const roots = (list: string, bar = 8): MelodyStep[] =>
  list.split(' ').flatMap((x) => {
    const [n, k] = x.split('*');
    return Array.from({ length: Number(k ?? 1) }, () => [n + '2', bar] as MelodyStep);
  });

// Länge: ein Durchlauf ≈ 11–18 s, also zwei bis drei pro Espresso (30 s), mit zwei Daumen etwas mehr
export const MELODIES: Melody[] = [
  {
    // Notensatz: Thema (h-Moll), dann dieselbe Figur auf der Dominante Fis, die zurück zum Anfang führt
    id: 'bergkoenig',
    name: 'In der Halle des Bergkönigs',
    style: 'classic',
    speed: 9,
    notes: timed(
      'B3:2 C#4:2 D4:2 E4:2 F#4:2 D4:2 F#4:4 F4:2 C#4:2 F4:4 E4:2 C4:2 E4:4 B3:2 C#4:2 D4:2 E4:2 F#4:2 D4:2 F#4:2 B4:2 A4:2 F#4:2 D4:2 F#4:2 A4:8 ' +
        'F#4:2 G#4:2 A#4:2 B4:2 C#5:2 A#4:2 C#5:4 D5:2 A#4:2 D5:4 C#5:2 A#4:2 C#5:4 F#4:2 G#4:2 A#4:2 B4:2 C#5:2 A#4:2 C#5:4 D5:2 A#4:2 D5:4 C#5:8',
    ),
    harmony: roots('B*4 F#*4', 16),
  },
  {
    // Notensatz: Galopp-Thema in E-Dur, dann eine Oktave höher (die letzten Takte kehren wie im Satz in die tiefe Lage zurück);
    // letzter Auftakt „H H“ führt zurück zum Anfang
    id: 'tell',
    name: 'Wilhelm Tell (Galopp)',
    style: 'classic',
    speed: 11,
    notes: timed(
      'B4:2 B4:1 B4:1 B4:2 B4:1 B4:1 E5:2 F#5:2 G#5:2 B4:1 B4:1 B4:2 B4:1 B4:1 E5:2 G#5:1 G#5:1 F#5:2 D#5:2 B4:2 B4:1 B4:1 ' +
        'B4:2 B4:1 B4:1 B4:2 B4:1 B4:1 E5:2 F#5:2 G#5:2 E5:1 G#5:1 B5:5 A5:1 G#5:1 F#5:1 E5:2 G#5:2 E5:2 B5:1 B5:1 ' +
        'B5:2 B5:1 B5:1 B5:2 B5:1 B5:1 E6:2 F#6:2 G#6:2 B5:1 B5:1 B5:2 B5:1 B5:1 E6:2 G#6:1 G#6:1 F#6:2 D#6:2 B5:2 B5:1 B5:1 ' +
        'B5:2 B5:1 B5:1 B5:2 B5:1 B5:1 E6:2 F#6:2 G#6:2 E5:1 G#5:1 B5:5 A5:1 G#5:1 F#5:1 E5:2 G#5:2 E5:2 B4:1 B4:1',
    ),
    harmony: roots('E E E B E E B E E E E B E E B E'),
  },
  {
    // Notensatz: ganze Periode (Vordersatz endet offen, Nachsatz auf G), danach beginnt sie von vorn
    id: 'cancan',
    name: 'Can-Can',
    style: 'classic',
    speed: 10,
    notes: timed(
      'G4:8 A4:2 C5:2 B4:2 A4:2 D5:4 D5:4 D5:2 E5:2 B4:2 C5:2 A4:4 A4:4 A4:2 C5:2 B4:2 A4:2 G4:2 G5:2 F#5:2 E5:2 D5:2 C5:2 B4:2 A4:2 ' +
        'G4:8 A4:2 C5:2 B4:2 A4:2 D5:4 D5:4 D5:2 E5:2 B4:2 C5:2 A4:4 A4:4 A4:2 C5:2 B4:2 A4:2 G4:2 D5:2 A4:2 B4:2 G4:4 D4:4',
    ),
    harmony: roots('G D D G D D G D G D D G D D G G'),
  },
  {
    // Notensatz: A-Teil (Halbschluss auf E), C-Dur-Teil, A-Teil mit Schluss auf A (Takte 1–8 und 17–32)
    id: 'turca',
    name: 'Türkischer Marsch',
    style: 'classic',
    speed: 11,
    notes: timed(
      'B4:1 A4:1 G#4:1 A4:1 C5:2 -:2 D5:1 C5:1 B4:1 C5:1 E5:2 -:2 F5:1 E5:1 D#5:1 E5:1 B5:1 A5:1 G#5:1 A5:1 B5:1 A5:1 G#5:1 A5:1 C6:4 ' +
        'A5:2 C6:2 B5:2 A5:2 G5:2 A5:2 B5:2 A5:2 G5:2 A5:2 B5:2 A5:2 G5:2 F#5:2 E5:4 ' +
        'E5:2 F5:2 G5:2 G5:2 A5:1 G5:1 F5:1 E5:1 D5:4 E5:2 F5:2 G5:2 G5:2 A5:1 G5:1 F5:1 E5:1 D5:4 ' +
        'C5:2 D5:2 E5:2 E5:2 F5:1 E5:1 D5:1 C5:1 B4:4 C5:2 D5:2 E5:2 E5:2 F5:1 E5:1 D5:1 C5:1 B4:4 ' +
        'B4:1 A4:1 G#4:1 A4:1 C5:2 -:2 D5:1 C5:1 B4:1 C5:1 E5:2 -:2 F5:1 E5:1 D#5:1 E5:1 B5:1 A5:1 G#5:1 A5:1 B5:1 A5:1 G#5:1 A5:1 C6:4 ' +
        'A5:2 B5:2 C6:2 B5:2 A5:2 G#5:2 A5:2 E5:2 F5:2 D5:2 C5:4 C5:1 B4:1 C5:1 B4:1 A4:4',
    ),
    harmony: [...roots('A E E A A E B E C G C G A E A E A E E A A E'), ['D2', 4], ['A2', 4], ['E2', 4], ['A2', 4]],
  },
  {
    id: 'synthwave',
    name: 'Nachtschicht (Synthwave)',
    style: 'synth',
    speed: 8,
    notes: even(
      'A3 C4 E4 A4 E4 C4 A3 C4 A3 C4 E4 A4 B4 A4 E4 C4 F3 A3 C4 F4 C4 A3 F3 A3 F3 A3 C4 F4 G4 F4 C4 A3 ' +
        'C4 E4 G4 C5 G4 E4 C4 E4 C4 E4 G4 C5 D5 C5 G4 E4 G3 B3 D4 G4 D4 B3 G3 B3 G3 B3 D4 G4 A4 G4 D4 B3 ' +
        'D4 F4 A4 D5 A4 F4 D4 F4 D4 F4 A4 D5 E5 D5 A4 F4 E4 G#4 B4 E5 B4 G#4 E4 G#4 B4 E5 G#4 B4 G#4 E4 B3 G#3',
    ),
    bass: ['A1', 'F1', 'C2', 'G1', 'D2', 'E2'],
  },
  {
    // Riff auf A, dasselbe eine Quarte höher auf D, dann auf A mit Lücken und Lauf nach oben
    id: 'acid',
    name: 'Ich bin drin (Acid)',
    style: 'acid',
    speed: 8,
    notes: even(
      'A2 A2 A3 A2 C3 A2 D#3 A2 G2 A2 A3 G3 A2 C3 A2 E3 A2 A2 A3 A2 C3 A2 D#3 E3 G3 A2 A3 A2 C4 A3 G3 E3 ' +
        'D3 D3 D4 D3 F3 D3 G#3 D3 C3 D3 D4 C4 D3 F3 D3 A3 D3 D3 D4 D3 F3 D3 G#3 A3 C4 D3 D4 D3 F4 D4 C4 A3 ' +
        'A2 - A3 A2 C3 - D#3 E3 G3 - A3 G3 E3 D#3 C3 A2 A2 A2 A3 A2 C3 A2 D#3 A2 E3 G3 A3 C4 E4 D#4 C4 G3',
    ),
  },
  {
    // Arpeggio-Teil, Melodie-Teil (endet auf H-Dur), Arpeggio, Melodie mit Schluss auf E
    id: 'chiptune',
    name: 'Root-Zugriff (Chiptune)',
    style: 'chip',
    speed: 10,
    notes: even(
      'E4 G4 B4 E5 B4 G4 E4 G4 D4 F#4 A4 D5 A4 F#4 D4 F#4 C4 E4 G4 C5 G4 E4 C4 E4 B3 D#4 F#4 B4 F#4 D#4 F#4 B4 ' +
        'E5 - E5 G5 - G5 F#5 E5 D5 - D5 F#5 - A5 G5 F#5 E5 - E5 B4 - G4 C5 B4 A4 - F#4 A4 B4 - D#5 F#5 ' +
        'E4 G4 B4 E5 B4 G4 E4 G4 D4 F#4 A4 D5 A4 F#4 D4 F#4 C4 E4 G4 C5 G4 E4 C4 E4 B3 D#4 F#4 B4 F#4 D#4 F#4 B4 ' +
        'E5 - E5 G5 - G5 F#5 E5 D5 - D5 F#5 - A5 B5 A5 G5 - F#5 E5 - D#5 E5 F#5 B4 - - B4 E5 - - -',
    ),
    bass: ['E2', 'C2', 'E2', 'B1'],
  },
  {
    // Riff auf E, dann auf C und D, zum Schluss auf E mit Lauf runter zur Dominante
    id: 'terminal',
    name: 'Dunkles Terminal',
    style: 'synth',
    speed: 8,
    notes: even(
      'E3 E3 E4 E3 E3 D4 E3 E3 B3 E3 E3 G3 E3 E3 A3 B3 E3 E3 E4 E3 E3 D4 E3 E3 G4 F#4 E4 D4 B3 A3 G3 B3 ' +
        'C3 C3 C4 C3 C3 B3 C3 C3 G3 C3 C3 E3 C3 C3 F#3 G3 D3 D3 D4 D3 D3 C4 D3 D3 A3 D3 D3 F#3 B3 A3 F#3 D#3 ' +
        'E3 E3 E4 E3 E3 D4 E3 E3 B3 E3 E3 G3 E3 E3 A3 B3 E3 E3 E4 E3 E3 D4 E3 E3 B3 C4 B3 A3 G3 F#3 D#3 B2',
    ),
    bass: ['E1', 'E1', 'C2', 'D2', 'E1', 'B1'],
  },
];

/** Länge eines Durchlaufs in Sechzehnteln */
const lengths = new WeakMap<Melody, number>();
export function melodyLength(m: Melody): number {
  let n = lengths.get(m);
  if (n === undefined) lengths.set(m, (n = m.notes.reduce((a, [, l]) => a + l, 0)));
  return n;
}

/** Grundton an Stelle p (Sechzehntel ab Start, läuft über Durchläufe weiter) für den Elektro-Bass; null = keiner */
export function melodyRoot(m: Melody, p: number): string | null {
  if (m.harmony) {
    let x = p % melodyLength(m);
    for (const [n, l] of m.harmony) {
      if (x < l) return n;
      x -= l;
    }
    return null;
  }
  return m.bass ? m.bass[Math.floor(p / 16) % m.bass.length]! : null;
}

/** zwei Daumen: so viel schneller */
export const MELODY_FAST = 1.35;

const NOTE: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** „A4“ → 440 Hz; unbekannt → NaN */
export function noteFreq(n: string): number {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m || NOTE[m[1]!] === undefined) return NaN;
  return 440 * 2 ** ((NOTE[m[1]!]! + (Number(m[2]) + 1) * 12 - 69) / 12);
}
