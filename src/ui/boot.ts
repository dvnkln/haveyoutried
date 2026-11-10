import {
  BOOT_DARK_HINT,
  BOOT_LIGHTS_LINE,
  BOOT_SCREEN_LINE,
  GAME_TITLE,
  HANDOVER,
  SPLASH_BACK_GAGS,
  SPLASH_BUTTON,
  SPLASH_GAGS,
} from '../content/boot';
import { pick } from '../util';
import type { Sfx } from './audio';
import { h } from './dom';
import type { SysLog } from './log';
import { showModal } from './modal';
import { setThemeColor, THEME_DARK, type Power } from './power';

/** Ränder (Statusleiste) passend zum Splash-Hintergrund */
const SPLASH_THEME = '#120f18';

/** Mail erscheint, wenn das Bild steht (CRT-Animation, siehe power.ts) */
export const MAIL_AFTER_SCREEN_MS = 600;
/** Splash blendet aus (ms), muss zu .splash.leaving in main.css passen */
const SPLASH_OUT_MS = 260;
const SPLASH_OUT_SLOW_MS = 600;

const POWER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
  <path d="M12 3v8"/><path d="M6.3 6.6a8 8 0 1 0 11.4 0"/></svg>`;

/** Startbildschirm mit Titel und Netzschalter; erfüllt sich nach dem Drücken (dann ist auch der Ton frei) */
function splash(sfx: Sfx, first: boolean): Promise<void> {
  const btn = h('button', { class: 'splash-power', type: 'button', 'aria-label': SPLASH_BUTTON }, [
    h('span', { class: 'splash-led', 'aria-hidden': 'true' }),
  ]);
  btn.insertAdjacentHTML('afterbegin', POWER_SVG);
  const el = h('div', { class: 'splash', role: 'dialog', 'aria-modal': 'true', 'aria-label': GAME_TITLE }, [
    h('div', { class: 'splash-card' }, [
      h('div', { class: 'splash-kicker', text: 'HYT-2000 · Helpdesk-Terminal' }),
      h('h1', { class: 'splash-title', text: GAME_TITLE }),
      btn,
      h('div', { class: 'splash-label', text: SPLASH_BUTTON }),
      h('p', { class: 'splash-gag', text: pick(first ? SPLASH_GAGS : [...SPLASH_GAGS, ...SPLASH_BACK_GAGS]) }),
    ]),
  ]);
  document.body.append(el);
  setThemeColor(SPLASH_THEME);
  // Rechner mit Tastatur: Enter oder Leertaste drückt den Schalter (ohne Fokusrahmen beim Laden)
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    window.removeEventListener('keydown', onKey);
    btn.click();
  };
  window.addEventListener('keydown', onKey);
  return new Promise((done) => {
    btn.addEventListener(
      'click',
      () => {
        window.removeEventListener('keydown', onKey);
        btn.disabled = true;
        btn.classList.add('on');
        // Audio wird beim Antippen freigegeben (main.ts); der Klack kommt, sobald die Engine läuft
        void sfx.unlock().then(() => sfx.powerKlack());
        el.classList.add('leaving');
        setThemeColor(THEME_DARK, first ? SPLASH_OUT_SLOW_MS : SPLASH_OUT_MS);
        el.classList.toggle('slow', first);
        setTimeout(() => {
          el.remove();
          done();
        }, first ? SPLASH_OUT_SLOW_MS : SPLASH_OUT_MS);
      },
      { once: true },
    );
  });
}

/** Zettel vom Vorgänger: Setting und was zu tun ist */
function handoverNote(): Promise<void> {
  return new Promise((done) => {
    showModal({
      title: HANDOVER.title,
      className: 'handover-note',
      armDelayMs: 900,
      body: [
        h('p', { class: 'hn-greet', text: HANDOVER.greeting }),
        h('p', { class: 'hn-head', text: HANDOVER.jobTitle }),
        h('ul', { class: 'hn-list' }, HANDOVER.job.map((t) => h('li', { text: t }))),
        h('p', { class: 'hn-head', text: HANDOVER.morningTitle }),
        h('ol', { class: 'hn-list hn-steps' }, HANDOVER.morning.map((t) => h('li', { text: t }))),
        h('p', { class: 'hn-ps', text: HANDOVER.ps }),
        h('p', { class: 'hn-sig', text: HANDOVER.signature }),
      ],
      actions: [{ label: HANDOVER.button, primary: true }],
      onClose: done,
    });
  });
}

export interface BootOptions {
  power: Power;
  sfx: Sfx;
  log: SysLog;
  /** kein Spielstand (erstes Mal oder nach „Alles löschen“): Zettel und langsame Fassung */
  first: boolean;
  /** Bericht über die Abwesenheit (Chef-Mail), kommt nach dem Einschalten; erfüllt sich, wenn er zu ist */
  report: () => Promise<void>;
}

/**
 * Jeder Start: Splash → (erstes Mal: Zettel) → winken = Licht an → Taste = Monitor an → (sonst: Chef-Mail).
 * Beim allerersten Mal läuft alles langsamer und lässt sich nicht überspringen.
 */
export async function runBoot({ power, sfx, log, first, report }: BootOptions): Promise<void> {
  power.slow = first;
  // Büro dunkel, Monitor in Standby, kein Werkzeug offen
  power.screenOffNow(true);
  power.lightsOff(BOOT_DARK_HINT, { instant: true });
  await splash(sfx, first);
  // erstes Mal: handgeschriebener Zettel, den liest man auch im Dunkeln
  if (first) await handoverNote();
  power.armHint();
  const waved = new Promise<void>((done) => power.onWave(() => done()));
  // Smart-Office-Bridge: Licht und Monitor gehen von selbst an
  power.autoStart();
  await waved;
  log.write('info', BOOT_LIGHTS_LINE);
  await new Promise<void>((done) => power.onScreen(() => done()));
  log.write('info', BOOT_SCREEN_LINE);
  power.slow = false;
  // sonst: die Mail vom Chef kommt auf den Bildschirm, sobald er an ist
  if (!first) {
    await new Promise((done) => setTimeout(done, MAIL_AFTER_SCREEN_MS));
    await report();
  }
}
