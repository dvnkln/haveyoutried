import type { Sfx } from '../audio';
import type { HapticKind } from '../haptics';

export interface GameApi {
  /** Spiel vorzeitig beenden (geschafft oder verloren) */
  finish(): void;
  /** Zeitstrafe in ms (z. B. falscher Neustart) */
  penalize(ms: number): void;
  sfx: Sfx;
  haptic(kind: HapticKind): void;
}

export interface Minigame {
  mount(root: HTMLElement, api: GameApi): void;
  /** pro Frame, solange das Spiel läuft (pausiert mit dem Tab) */
  update(dtMs: number): void;
  /** Leistung 0..1 bei Spielende */
  score(): number;
  /** kurze Statuszeile unter dem Zeitbalken */
  status(): string;
}
