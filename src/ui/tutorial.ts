import { HINT_HEADS, HINT_OK, HINTS, type Hint } from '../content/tutorial';
import { fresh } from '../core/deck';
import type { GameState } from '../core/state';
import { gameBlocked } from './blocked';
import { h } from './dom';

/** so oft wird geschaut, ob ein Hinweis dran ist */
const CHECK_MS = 700;
/** nach einem Zwischenschritt so lange jeden Frame nach dem eigentlichen Ziel suchen */
const VIA_SEARCH_MS = 1_500;

/** erstes sichtbares Ziel eines Hinweises (Liste = Vorrang von vorn nach hinten) */
export function findTarget(target: string | string[], visible: (el: HTMLElement) => boolean): HTMLElement | null {
  for (const sel of Array.isArray(target) ? target : [target]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && visible(el)) return el;
  }
  return null;
}
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
 * und klebt ein Post-it daneben. Solange er hängt, steht das Spiel; immer nur ein Hinweis zur Zeit.
 * Als gelesen gilt ein Hinweis nur, wenn er bestätigt wurde (OK oder Stelle angetippt);
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

  let active: { hint: Hint; el: HTMLElement } | null = null;

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
    active = { hint, el };
    head.textContent = fresh('HINT_HEADS', HINT_HEADS);
    ok.textContent = fresh('HINT_OK', HINT_OK);
    spot.hidden = false;
    card.hidden = false;
    text.textContent = hint.text;
    follow(el);
  };

  // jeden Frame nachschauen (die Kaffeetasse fliegt, Layout kann sich verschieben), aber nur bei Bewegung neu setzen
  let raf = 0;
  const follow = (el: HTMLElement) => {
    cancelAnimationFrame(raf);
    let last = '';
    const step = () => {
      if (active?.el !== el) return;
      const r = el.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height},${window.innerWidth},${window.innerHeight}`;
      if (key !== last) {
        last = key;
        place();
      }
      raf = requestAnimationFrame(step);
    };
    step();
  };

  ok.addEventListener('click', () => hide(true));
  // Bestätigen muss man: mit „OK“ oder indem man die gezeigte Stelle antippt (die tut dann, was sie tut).
  // Woanders tippen schließt ihn nicht; das Spiel steht so lange (afk.ts, Tastatur in desk.ts).
  // Das Post-it selbst lässt Taps durch (nur „OK“ fängt sie), damit es keine Tasten verdeckt.
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!active || e.target === ok) return;
      if (!active.el.contains(e.target as Node)) return;
      // Zwischenschritt (z. B. Start): nur der Weg zum Ziel; danach suchen, bis es zu sehen ist (z. B. im offenen Launcher)
      const via = active.hint.via ?? [];
      if (via.some((sel) => active!.el.matches(sel))) {
        hide(false);
        const until = performance.now() + VIA_SEARCH_MS;
        const look = () => {
          check(true);
          if (!active && performance.now() < until) requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      } else hide(true);
    },
    { capture: true },
  );
  window.addEventListener('resize', place);

  /** skipVia: Zwischenschritte überspringen (gerade eben angetippt, das Ziel geht gleich auf) */
  const check = (skipVia = false) => {
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
      const targets = (Array.isArray(hint.target) ? hint.target : [hint.target]).filter((t) => !skipVia || !hint.via?.includes(t));
      const el = findTarget(targets, visible);
      // Vorrang vor Meldungen (die warten in ihrer Schlange, z. B. das Achievement zum ersten Ticket);
      // VIP-Mail und Kaffeetasse dürfen, sie sind ja oft das Thema
      if (el) return show(hint, el);
    }
  };
  setInterval(() => check(), CHECK_MS);
}
