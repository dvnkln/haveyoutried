export type HapticKind = 'tap' | 'buy' | 'milestone' | 'error';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  buy: [12, 40, 12],
  milestone: [30, 50, 30, 50, 80],
  error: [60, 40, 60],
};

export const hapticsSupported = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function createHaptics(isEnabled: () => boolean): (kind: HapticKind) => void {
  return (kind) => {
    if (!isEnabled() || !hapticsSupported()) return;
    try {
      navigator.vibrate(PATTERNS[kind]);
    } catch {
      /* manche Browser werfen ohne User-Geste */
    }
  };
}
