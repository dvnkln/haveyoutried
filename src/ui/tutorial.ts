import { HINT_HEADS, HINT_OK, HINTS, type Hint } from '../content/tutorial';
import type { GameState } from '../core/state';
import { pick } from '../util';
import { gameBlocked } from './blocked';
import { attentionBusy } from './toast';
import { h } from './dom';

/** so oft wird geschaut, ob ein Hinweis dran ist */
const CHECK_MS = 700;
/** erst nach dieser Zeit schließt ein Tippen irgendwo anders den Hinweis (wer gerade wild tippt, soll ihn sehen) */
const READ_MS = 2_500;
/** Abstand der Hervorhebung um die Stelle */
const PAD = 6;

/** Flags: gelesen je Hinweis, ausgeschaltet, „nochmal lesen“ läuft */
const SEEN = 'tut:seen:';
const OFF = 'tut:off';
const REPLAY = 'tut:replay';

export const tutorialOff = (s: GameState) => !!s.flags[OFF];
export function setTutorialOff(s: GameState, off: boolean): void {
  if (off) s.flags[OFF] = 1;
  else delete s.flags[OFF];
}
/** „Übergabe nochmal lesen“: alle Hinweise wieder offen, und zwar unabhängig vom Spielstand (Stelle muss nur zu sehen sein) */
export function resetTutorial(s: GameState): void {
  for (const k of Object.keys(s.flags)) if (k.startsWith(SEEN)) delete s.flags[k];
  s.flags[REPLAY] = 1;
  delete s.flags[OFF];
}

/**
 * „Übergabe vom Vorgänger“: zeigt einmal je Thema auf die passende Stelle, dunkelt den Rest leicht ab
 * und klebt ein Post-it daneben. Das Spiel läuft weiter; immer nur ein Hinweis zur Zeit.
 * Als gelesen gilt ein Hinweis nur, wenn er bestätigt wurde (OK, Stelle angetippt, nach der Lesezeit woanders getippt);
 * verschwindet er, weil ein Fenster aufgeht oder das Licht ausgeht, kommt er später wieder.
 */
export function startTutorial(state: GameState): void {
  const spot = h('div', { class: 'tut-spot', 'aria-hidden': 'true', hidden: '' });
  const head = h('div', { class: 'tut-head' });
  const text = h('p', { class: 'tut-text' });
  const ok = h('button', { class: 'tut-ok', type: 'button' });
  // einmal im DOM und nur der Inhalt wechselt: so lesen Screenreader den neuen Hinweis vor
  const card = h('div', { class: 'tut-note', role: 'status', 'aria-live': 'polite', hidden: '' }, [head, text, ok]);
  document.body.append(spot, card);

  let active: { hint: Hint; el: HTMLElement; since: number } | null = null;

  const visible = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };

  const place = () => {
    if (!active) return;
    const r = active.el.getBoundingClientRect();
    Object.assign(spot.style, {
      left: `${r.left - PAD}px`,
      top: `${r.top - PAD}px`,
      width: `${r.width + 2 * PAD}px`,
      height: `${r.height + 2 * PAD}px`,
    });
    // Post-it dort, wo Platz ist: unter der Stelle, wenn sie oben liegt, sonst darüber
    const vw = document.documentElement.clientWidth;
    const width = Math.min(290, vw - 24);
    card.style.width = `${width}px`;
    card.style.left = `${Math.min(vw - width - 12, Math.max(12, r.left + r.width / 2 - width / 2))}px`;
    const below = r.top + r.height / 2 < window.innerHeight / 2;
    card.style.top = below ? `${r.bottom + PAD + 10}px` : '';
    card.style.bottom = below ? '' : `${window.innerHeight - r.top + PAD + 10}px`;
  };

  /** read = bestätigt (dann nie wieder), sonst nur ausblenden */
  const hide = (read: boolean) => {
    if (!active) return;
    if (read) {
      state.flags[SEEN + active.hint.id] = 1;
      if (HINTS.every((x) => state.flags[SEEN + x.id])) delete state.flags[REPLAY];
    }
    active = null;
    spot.hidden = true;
    card.hidden = true;
    text.textContent = '';
  };

  const show = (hint: Hint, el: HTMLElement) => {
    active = { hint, el, since: performance.now() };
    head.textContent = pick(HINT_HEADS);
    ok.textContent = pick(HINT_OK);
    spot.hidden = false;
    card.hidden = false;
    text.textContent = hint.text;
    follow();
  };

  // jeden Frame nachführen, solange ein Hinweis steht: die Kaffeetasse fliegt ja davon
  let raf = 0;
  const follow = () => {
    cancelAnimationFrame(raf);
    const step = () => {
      if (!active) return;
      place();
      raf = requestAnimationFrame(step);
    };
    step();
  };

  ok.addEventListener('click', () => hide(true));
  // Antippen der gezeigten Stelle erledigt den Hinweis (und tut, was die Stelle tut); woanders erst nach der Lesezeit.
  // Das Post-it selbst lässt Taps durch (nur „OK“ fängt sie), damit es keine Tasten verdeckt.
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!active || e.target === ok) return;
      if (active.el.contains(e.target as Node) || performance.now() - active.since > READ_MS) hide(true);
    },
    { capture: true },
  );
  window.addEventListener('resize', place);
  // zurück in den Tab: Lesezeit beginnt neu
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && active) active.since = performance.now();
  });

  setInterval(() => {
    if (tutorialOff(state)) return hide(false);
    if (active) {
      // Stelle weg (Zettel abgefallen, Pager erledigt) oder Spiel blockiert: nur ausblenden, kommt wieder
      if (!active.el.isConnected || !visible(active.el) || gameBlocked({ hidden: true })) return hide(false);
      return;
    }
    if (gameBlocked({ hidden: true })) return;
    const replay = !!state.flags[REPLAY];
    for (const hint of HINTS) {
      if (state.flags[SEEN + hint.id]) continue;
      // längst bekannte Sachen gelten still als gelesen (außer beim Nochmal-Lesen)
      if (!replay && hint.expired(state)) {
        state.flags[SEEN + hint.id] = 1;
        continue;
      }
      if (!replay && !hint.when(state)) continue;
      const el = document.querySelector<HTMLElement>(hint.target);
      // nicht gleichzeitig mit einer Meldung oder der Kaffeetasse (der VIP-Zettel darf, er ist ja oft das Thema)
      if (el && visible(el) && !attentionBusy(['.urgent-note', '.espresso-cup', '.tut-note:not([hidden])'])) return show(hint, el);
    }
  }, CHECK_MS);
}
