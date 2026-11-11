import type { GeneratorId, IncidentId } from '../config';
import type { EffectResult, Resolution } from './events';
import type { OsId } from '../content/systems';

/** Alle Ereignisse, die die Logik nach außen meldet (UI, Log, später Achievements). */
export interface GameEvents {
  click: { value: number; ticketNo: number };
  buy: { id: GeneratorId; amount: number; owned: number };
  milestone: { id: GeneratorId; owned: number };
  upgrade: { id: string };
  eventIncoming: { id: string };
  eventResolved: Resolution;
  buffEnded: { id: string };
  incidentStart: { id: IncidentId };
  /** batch = wie viele im selben Durchgang freigeschaltet wurden */
  achievement: { id: string; batch: number };
  jobQuit: { gained: number; company: string };
  /** andere Wahl im System-Tab, Einstellungen zu: Neustart mit dem neuen System */
  osChanged: { os: OsId };
  bossTask: { text: string };
  bossDone: { text: string; reward: number };
  bossFailed: { text: string };
  /** abandoned = beim Laden gefunden (Seite während des Incidents geschlossen) */
  incidentResolved: { id: IncidentId; score: number; results: EffectResult[]; abandoned: boolean };
}

type Handler<T> = (payload: T) => void;

export class Bus<E extends object> {
  private handlers: { [K in keyof E]?: Handler<E[K]>[] } = {};

  on<K extends keyof E>(type: K, fn: Handler<E[K]>): () => void {
    (this.handlers[type] ??= []).push(fn);
    return () => {
      this.handlers[type] = this.handlers[type]?.filter((h) => h !== fn);
    };
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    for (const fn of this.handlers[type] ?? []) fn(payload);
  }
}

export const bus = new Bus<GameEvents>();
