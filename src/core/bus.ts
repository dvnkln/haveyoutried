import type { GeneratorId } from '../config';
import type { EffectResult, Resolution } from './events';

/** Alle Ereignisse, die die Logik nach außen meldet (UI, Log, später Achievements). */
export interface GameEvents {
  click: { value: number; ticketNo: number };
  buy: { id: GeneratorId; amount: number; owned: number };
  milestone: { id: GeneratorId; owned: number };
  upgrade: { id: string };
  eventIncoming: { id: string };
  eventResolved: Resolution;
  buffEnded: { id: string };
  incidentStart: { id: string };
  incidentResolved: { id: string; score: number; results: EffectResult[] };
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
