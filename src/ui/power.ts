import { SMART_GLITCH_HINT, SMART_GLITCH_LINES, SMART_ON_LINES } from '../content/boot';
import { fresh } from '../core/deck';
import type { Sfx } from './audio';
import type { SysLog } from './log';
import { h } from './dom';

/** Dauer der Animationen (ms), muss zu den Keyframes in main.css passen */
const MS = {
  lightsOn: 600,
  lightsOnSlow: 1_900,
  screenOn: 520,
  screenOnSlow: 1_500,
  screenOff: 700,
} as const;
/** Nach dem Loslassen so lange den Klick schlucken (der Klick zum Antippen kommt erst beim Loslassen) */
const SWALLOW_AFTER_RELEASE_MS = 250;
/** Aufwachen per Taste: „losgelassen“ erst nach dem Flackern (dann kommt z. B. der Bericht) */
const KEY_RELEASE_MS = 700;
/** Hinweise (winken, Knopf am Monitor) erst, wenn jemand so lange nicht draufkommt */
export const HINT_DELAY_MS = 5_000;
/** Smart-Office: so oft installiert die Bridge gerade Updates (dann doch selbst) */
const SMART_GLITCH = 0.12;
/** Smart-Office beim Start: so oft nachsehen, ob kein Dialog mehr im Weg ist */
const SMART_RETRY_MS = 500;
/** Smart-Office beim Start: kurz warten, als ob der Sensor erst reagieren muss */
const SMART_START_MS = 500;

/**
 * Farbe der Statusleiste: immer dunkel, gleich wie die Navigationsleiste unten (theme_color im Manifest)
 * (die Wand hat oft Tapetenmuster, eine einfarbige Leiste passt dazu nie richtig).
 */
const HEX = /^#[0-9a-f]{6}$/i;
export const THEME_DARK = '#120f18';
const meta = () => document.querySelector('meta[name="theme-color"]');
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
let fadeFrame = 0;
/** Farbe setzen; ms > 0 = in kleinen Schritten überblenden (das Betriebssystem selbst kann das nicht) */
export function setThemeColor(color: string, ms = 0): void {
  cancelAnimationFrame(fadeFrame);
  const el = meta();
  const from = el?.getAttribute('content') ?? color;
  if (!el || ms <= 0 || !HEX.test(from) || !HEX.test(color)) return void el?.setAttribute('content', color);
  const a = rgb(from);
  const b = rgb(color);
  const start = performance.now();
  let lastStep = -1;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    // höchstens ~12 Zwischenstufen: jede Änderung lässt den Browser die Leiste neu zeichnen
    const q = Math.round(t * 12);
    if (q !== lastStep) {
      lastStep = q;
      const mix = a.map((v, i) => Math.round(v + (b[i]! - v) * (q / 12)));
      el.setAttribute('content', `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`);
    }
    if (t < 1) fadeFrame = requestAnimationFrame(step);
  };
  fadeFrame = requestAnimationFrame(step);
}

export interface Power {
  /** Licht ist an */
  readonly lit: boolean;
  /** Monitor ist aus (Standby) */
  readonly screenOff: boolean;
  /** Erster Start: alles langsamer und nicht zu überspringen */
  slow: boolean;
  /** Licht aus; instant = ohne Animation und Ton (Start im dunklen Büro); delayMs = Röhren gehen erst später aus, gilt aber schon als dunkel */
  lightsOff(hint: string, opts?: { instant?: boolean; delayMs?: number }): void;
  /** Licht an (Röhren flackern); erfüllt sich, wenn das Flackern vorbei ist */
  lightsOn(): Promise<void>;
  /** Monitor aus (Bild fällt zum Strich und Punkt zusammen); instant = sofort dunkel */
  screenOffNow(instant?: boolean): void;
  /** Monitor an; erfüllt sich nach der Animation */
  screenOn(): Promise<void>;
  /** Ab jetzt zählt die Zeit bis zum Hinweis „winken“ (Start: erst nach Splash und Zettel) */
  armHint(): void;
  /** Smart-Office-Bridge gekauft? Dann gehen Licht und Monitor von selbst an */
  auto: () => boolean;
  /** Start mit Smart-Office: Licht und danach Monitor von selbst (oder Update-Aussetzer: dann von Hand) */
  autoStart(): void;
  /** Wahrscheinlichkeit für einen Update-Aussetzer (Test-Build: 0) */
  glitchChance: number;
  /** Jemand hat im Dunkeln gewunken (getippt, Taste, Mausrad): Licht geht an. released = Finger wieder oben */
  onWave(cb: (released: Promise<void>) => void): void;
  /** Knopf am Monitor: Monitor geht an */
  onScreen(cb: () => void): void;
}

/**
 * Bürolicht und Röhrenmonitor: an, aus, mit Animation und Ton.
 * Im Dunkeln weckt jede Berührung das Licht; den Monitor schaltet sein Knopf (.mon-power) ein und aus.
 * Bei aus-Monitor tippt die Tastatur nicht; wer es versucht, bekommt gleich den Hinweis auf den Knopf,
 * sonst erst nach HINT_DELAY_MS. Auch „winken“ steht erst nach dieser Zeit da.
 */
export function createPower(app: HTMLElement, sfx: Sfx, log: SysLog): Power {
  const hint = h('span', { class: 'lo-hint' });
  const shade = h('div', { class: 'lights-off', 'aria-hidden': 'true' }, [hint]);
  let lit = true;
  let screenOff = false;
  /** während einer langsamen Animation (erster Start) zählt keine Geste */
  let locked = false;
  let shadeTimer = 0;
  let crtTimer = 0;
  let soundTimer = 0;
  let themeTimer = 0;
  let hintTimer = 0;
  let powerHintTimer = 0;
  /** Licht an, Monitor aus: wartet auf den Knopf */
  let awaiting = false;
  const waveCbs: ((released: Promise<void>) => void)[] = [];
  const screenCbs: (() => void)[] = [];

  const lock = (ms: number) => {
    locked = true;
    app.classList.add('power-busy');
    setTimeout(() => {
      locked = false;
      app.classList.remove('power-busy');
      sync();
    }, ms);
  };
  /** wartet der Monitor auf seinen Knopf? Nach einer Weile zeigt ein Hinweis darauf (.hint-power) */
  const sync = () => {
    const now = lit && screenOff && !locked;
    app.classList.toggle('await-power', now);
    if (now === awaiting) return;
    awaiting = now;
    clearTimeout(powerHintTimer);
    app.classList.remove('hint-power');
    if (now) powerHintTimer = window.setTimeout(() => app.classList.add('hint-power'), HINT_DELAY_MS);
  };

  /**
   * Smart-Office installiert gerade Updates: einmal je Einschalten auswürfeln und merken,
   * bis der Monitor wieder an ist (sonst sagt die Meldung „von Hand“ und der Monitor springt trotzdem an)
   */
  let smartDown = false;
  const smartGlitch = (): boolean => {
    smartDown = Math.random() < power.glitchChance;
    if (smartDown) log.write('warn', fresh('SMART_GLITCH_LINES', SMART_GLITCH_LINES));
    return smartDown;
  };
  /** Dauer des Licht-an-Flackerns (langsame Fassung beim ersten Start) */
  const lightsMs = () => (power.slow ? MS.lightsOnSlow : MS.lightsOn);
  /** Monitor von selbst an, sobald die Röhren brennen */
  const autoScreen = () =>
    window.setTimeout(() => {
      if (!lit || !screenOff || locked) return;
      void power.screenOn();
      for (const cb of screenCbs) cb();
    }, lightsMs() + 150);
  /** Licht an wie nach einem Winken (Zuhörer bekommen ein schon „losgelassenes“ Winken) */
  const wave = () => {
    void power.lightsOn();
    for (const cb of waveCbs) cb(Promise.resolve());
  };

  const power: Power = {
    get lit() {
      return lit;
    },
    get screenOff() {
      return screenOff;
    },
    slow: false,
    lightsOff(text, { instant = false, delayMs = 0 } = {}) {
      hint.textContent = text;
      if (!lit) return;
      lit = false;
      clearTimeout(shadeTimer);
      clearTimeout(soundTimer);
      app.classList.add('afk');
      shade.classList.remove('waking', 'slow');
      shade.classList.toggle('instant', instant);
      shade.style.animationDelay = delayMs ? `${delayMs}ms` : '';
      // „winken“ erst, wenn niemand von selbst draufkommt; beim Start (instant) erst ab armHint(), nach Splash und Zettel
      shade.classList.remove('show-hint');
      clearTimeout(hintTimer);
      if (!instant) hintTimer = window.setTimeout(() => shade.classList.add('show-hint'), delayMs + HINT_DELAY_MS);
      document.body.append(shade);
      if (instant) setThemeColor(THEME_DARK);
      else themeTimer = window.setTimeout(() => !lit && setThemeColor(THEME_DARK, 500), delayMs);
      if (!instant) soundTimer = window.setTimeout(() => !lit && sfx.tubeOff(), delayMs);
      sync();
    },
    lightsOn() {
      if (lit) return Promise.resolve();
      lit = true;
      clearTimeout(soundTimer);
      clearTimeout(themeTimer);
      clearTimeout(hintTimer);
      shade.style.animationDelay = '';
      const ms = power.slow ? MS.lightsOnSlow : MS.lightsOn;
      app.classList.remove('afk');
      shade.classList.remove('instant');
      shade.classList.toggle('slow', power.slow);
      shade.classList.add('waking');
      sfx.tubeOn(power.slow);
      if (power.slow) lock(ms);
      clearTimeout(shadeTimer);
      shadeTimer = window.setTimeout(() => shade.remove(), ms + 100);
      sync();
      return new Promise((done) => setTimeout(done, ms));
    },
    screenOffNow(instant = false) {
      if (screenOff) return;
      screenOff = true;
      clearTimeout(crtTimer);
      app.classList.remove('crt-on', 'crt-slow');
      app.classList.add('screen-off');
      if (!instant) {
        app.classList.add('crt-off');
        sfx.crtOff();
        crtTimer = window.setTimeout(() => app.classList.remove('crt-off'), MS.screenOff);
      }
      sync();
    },
    screenOn() {
      if (!screenOff) return Promise.resolve();
      screenOff = false;
      smartDown = false;
      const ms = power.slow ? MS.screenOnSlow : MS.screenOn;
      clearTimeout(crtTimer);
      app.classList.remove('screen-off', 'crt-off');
      app.classList.toggle('crt-slow', power.slow);
      app.classList.add('crt-on');
      sfx.crtOn(power.slow);
      if (power.slow) lock(ms);
      crtTimer = window.setTimeout(() => app.classList.remove('crt-on', 'crt-slow'), ms);
      sync();
      return new Promise((done) => setTimeout(done, ms));
    },
    auto: () => false,
    glitchChance: SMART_GLITCH,
    autoStart() {
      if (lit || !power.auto()) return;
      const attempt = () => {
        if (lit) return;
        // Dialog oder Startbildschirm im Weg: gleich nochmal nachsehen
        if (document.querySelector('.splash, dialog[open]')) return void window.setTimeout(attempt, SMART_RETRY_MS);
        if (smartGlitch()) {
          // Aussetzer: der Hinweis kommt gleich, man muss ja jetzt selbst ran
          hint.textContent = SMART_GLITCH_HINT;
          clearTimeout(hintTimer);
          shade.classList.add('show-hint');
          return;
        }
        log.write('info', fresh('SMART_ON_LINES', SMART_ON_LINES));
        wave();
        autoScreen();
      };
      window.setTimeout(attempt, SMART_START_MS);
    },
    armHint() {
      if (lit) return;
      clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => shade.classList.add('show-hint'), HINT_DELAY_MS);
    },
    onWave(cb) {
      waveCbs.push(cb);
    },
    onScreen(cb) {
      screenCbs.push(cb);
    },
  };

  /** Geste verbraucht: weder Ticket noch Knopf darunter bekommt sie; gibt zurück, wann der Finger wieder oben ist */
  const swallow = (e: Event): Promise<void> => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== 'pointerdown') return new Promise((done) => setTimeout(done, e.type === 'keydown' ? KEY_RELEASE_MS : 0));
    // der Klick zu diesem Antippen kommt erst beim Loslassen (auch nach langem Drücken): bis dahin schlucken
    // nur den einen Klick, der zu diesem Antippen gehört (ein schneller nächster Tipper soll zählen)
    const eat = (c: Event) => {
      c.preventDefault();
      c.stopImmediatePropagation();
      window.removeEventListener('click', eat, { capture: true });
    };
    window.addEventListener('click', eat, { capture: true });
    return new Promise((done) => {
      const released = () => {
        window.removeEventListener('pointerup', released, { capture: true });
        window.removeEventListener('pointercancel', released, { capture: true });
        setTimeout(() => {
          window.removeEventListener('click', eat, { capture: true });
          done();
        }, SWALLOW_AFTER_RELEASE_MS);
      };
      window.addEventListener('pointerup', released, { capture: true });
      window.addEventListener('pointercancel', released, { capture: true });
    });
  };

  const onInput = (e: Event) => {
    // Startbildschirm und Dialoge (Bericht, Zettel) gehen vor
    if (document.querySelector('.splash, dialog[open]')) return;
    if (e.type === 'pointerdown' && (e as PointerEvent).button > 0) return;
    // die geschluckte Geste erreicht die Audio-Freigabe in main.ts nicht mehr (iOS: nach Sperrbildschirm neu anwerfen)
    if (!lit || screenOff) void sfx.unlock();
    const repeat = e.type === 'keydown' && (e as KeyboardEvent).repeat;
    if (!lit) {
      // gehaltene Taste (z. B. Enter vom Splash) ist kein Winken
      if (locked || repeat) return void swallow(e);
      const released = swallow(e);
      void power.lightsOn();
      for (const cb of waveCbs) cb(released);
      // Smart-Office: der Monitor kommt von selbst nach (außer die Bridge installiert gerade Updates;
      // ein Aussetzer beim Start gilt bis der Monitor an ist)
      if (screenOff && power.auto() && !smartDown && !smartGlitch()) autoScreen();
      return;
    }
    if (!screenOff || e.type === 'wheel') return;
    // Tastatur: Tippen auf die Tasten oder echte Tasten, die niemand sonst will (Fokus auf der Seite selbst);
    // Tasten auf Knöpfen, Reglern oder im App-Fenster (Enter, Esc, Pfeile) gehören denen
    const t = e.target;
    const onKeyboard =
      e.type === 'keydown'
        ? t === document.body || t === document.documentElement || (t instanceof Element && !!t.closest('.keyboard-wrap'))
        : t instanceof Element && !!t.closest('.keyboard-wrap');
    if (!onKeyboard) return;
    // Tab bleibt für die Fokus-Navigation
    if (e.type === 'keydown' && ((e as KeyboardEvent).key === 'Tab' || repeat)) return;
    // Monitor aus: Tastatur tippt nicht; wer es versucht, sucht offenbar den Knopf
    void swallow(e);
    if (!locked) app.classList.add('hint-power');
  };
  // Knopf am Monitor: aus → an, an → aus (Have you tried turning it off and on again?)
  const onPowerButton = (e: Event) => {
    if (!(e.target instanceof Element) || !e.target.closest('.mon-power')) return;
    if (document.querySelector('.splash, dialog[open]') || !lit || locked) return;
    if (screenOff) {
      void power.screenOn();
      for (const cb of screenCbs) cb();
    } else if (!app.classList.contains('incident-on') && !app.classList.contains('sheet-open')) {
      power.screenOffNow();
    }
  };
  window.addEventListener('click', onPowerButton);
  // window + capture: kommt vor allen anderen Zuhörern (Tastatur, Aufwachen, Ticket)
  window.addEventListener('pointerdown', onInput, { capture: true });
  window.addEventListener('keydown', onInput, { capture: true });
  // nicht passiv, sonst wirkt preventDefault beim Aufwachen per Mausrad nicht
  window.addEventListener('wheel', onInput, { capture: true, passive: false });

  return power;
}
