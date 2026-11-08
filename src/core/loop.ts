import { CONFIG } from '../config';

export interface Loop {
  stop(): void;
  /** Nach Tab-Rückkehr: Zeitbasis neu setzen, damit die Pause nicht doppelt zählt. */
  resetClock(): void;
}

/**
 * rAF-Loop mit festem Logik-Takt: `update` läuft in CONFIG.tickMs-Schritten,
 * `render` einmal pro Frame.
 */
export function startLoop(update: (dtSec: number) => void, render: () => void): Loop {
  const step = CONFIG.tickMs;
  let last = performance.now();
  let acc = 0;
  let raf = 0;

  const frame = (t: number) => {
    acc += Math.min(Math.max(t - last, 0), CONFIG.maxFrameDeltaMs);
    last = t;
    while (acc >= step) {
      update(step / 1_000);
      acc -= step;
    }
    render();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    stop: () => cancelAnimationFrame(raf),
    resetClock: () => {
      last = performance.now();
      acc = 0;
    },
  };
}
