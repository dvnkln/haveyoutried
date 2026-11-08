export type HapticKind = 'tap' | 'buy' | 'milestone' | 'error' | 'unlock';

/** Android & Co.: Vibration API. Unter ~15 ms spüren viele Geräte gar nichts. */
const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 15,
  buy: [25, 40, 25],
  milestone: [40, 60, 40, 60, 90],
  error: [80, 50, 80],
  unlock: [20, 70, 20],
};

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));

export type HapticSupport = 'vibrate' | 'ios' | 'none';

export function hapticSupport(): HapticSupport {
  if (canVibrate()) return 'vibrate';
  if (isIOS()) return 'ios';
  return 'none';
}

/**
 * iOS (Safari ab 18) hat keine Vibration API, gibt aber beim Umschalten eines
 * <input type="checkbox" switch> einen haptischen Tick. Den lösen wir per
 * label.click() aus. Funktioniert nur innerhalb einer Nutzergeste; pointerdown
 * zählt in WebKit nicht sicher dazu, darum werden Ticks aus pointerdown bis
 * zum pointerup/touchend aufgeschoben.
 */
function createIOSHaptics(): (kind: HapticKind) => void {
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.body.append(label);

  // Nur ein Tick pro Ereignis: weitere Ticks per setTimeout lägen außerhalb
  // der Nutzergeste und würden von WebKit ignoriert.
  const tick = () => label.click();

  let inPointerDown = false;
  let pending = false;
  document.addEventListener(
    'pointerdown',
    () => {
      inPointerDown = true;
      setTimeout(() => (inPointerDown = false), 0);
    },
    { capture: true, passive: true },
  );
  const flush = () => {
    if (pending) tick();
    pending = false;
  };
  document.addEventListener('pointerup', flush, { capture: true, passive: true });
  document.addEventListener('touchend', flush, { capture: true, passive: true });

  return () => {
    if (inPointerDown) pending = true;
    else tick();
  };
}

export function createHaptics(isEnabled: () => boolean): (kind: HapticKind) => void {
  const support = hapticSupport();
  if (support === 'none') return () => {};

  const fire =
    support === 'ios'
      ? createIOSHaptics()
      : (kind: HapticKind) => {
          try {
            navigator.vibrate(PATTERNS[kind]);
          } catch {
            /* manche Browser werfen ohne Nutzergeste */
          }
        };
  return (kind) => {
    if (isEnabled()) fire(kind);
  };
}
