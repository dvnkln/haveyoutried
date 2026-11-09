import { CONFIG } from '../config';
import { afkTick, applyOfflineProgress, awayReport, type OfflineReport } from '../core/offline';
import type { GameState } from '../core/state';
import { tick } from '../core/tick';
import { pick } from '../util';
import { h } from './dom';
import type { SysLog } from './log';

const LIGHTS_OFF_LINES = [
  'immobilien[42]: Bewegungsmelder: seit 10 Minuten keine Bewegung. Licht aus. Energiesparen!',
  'immobilien[42]: Niemand da. Licht aus. Der Monitor geht auch schlafen.',
  'dpms[7]: Bildschirm aus. Der Admin ist vermutlich beim Kaffee. Oder eingeschlafen.',
];
const LIGHTS_ON_LINES = [
  'immobilien[42]: Bewegung erkannt. Licht an. Die Leuchtstoffröhre braucht einen Moment.',
  'immobilien[42]: Wedeln erkannt. Licht an. Willkommen zurück.',
  'dpms[7]: Bildschirm wieder an. Niemand hat gesehen, wie lange du weg warst. Außer dem Chef.',
];

/** Nach dem Loslassen so lange warten, bis der Bericht kommt (der Klick des Weck-Tippers landet sonst darauf) */
const REPORT_AFTER_RELEASE_MS = 250;
/** Aufwachen per Taste: Bericht nach dem Flackern */
const REPORT_AFTER_KEY_MS = 700;

/**
 * Seite offen, aber niemand spielt: nach CONFIG.afkMs gehen Bildschirm und Bürolicht aus,
 * die Produktion läuft wie bei Abwesenheit (erste Stunde voll, dann gekürzt, irgendwann nichts).
 * Die erste Berührung macht nur das Licht an, danach kommt der Bericht.
 */
export function createAfk(state: GameState, log: SysLog, onWake: (r: OfflineReport) => void) {
  let lastInput = Date.now();
  let afk = false;
  /** Lifetime-Tickets bei der letzten Eingabe: daraus wird der Bericht */
  let ticketsAtInput = state.ticketsAllTime;
  /** Zeitpunkt, an dem die Seite verdeckt wurde (Display aus, App gewechselt) */
  let hiddenAt = 0;
  const app = document.getElementById('app');
  const shade = h('div', { class: 'lights-off', 'aria-hidden': 'true' }, [h('span', { class: 'lo-hint', text: 'Licht aus. Antippen zum Weiterarbeiten.' })]);

  const enter = () => {
    afk = true;
    app?.classList.add('afk');
    shade.classList.remove('waking');
    document.body.append(shade);
    log.write('info', pick(LIGHTS_OFF_LINES));
  };

  /** Licht an; gibt den Bericht über die Zeit seit der letzten Eingabe zurück (oder null) */
  const lightsOn = (): OfflineReport | null => {
    const idle = Date.now() - lastInput;
    const gained = state.ticketsAllTime - ticketsAtInput;
    afk = false;
    app?.classList.remove('afk');
    // Leuchtstoffröhre: kurz flackern, dann hell
    shade.classList.add('waking');
    setTimeout(() => shade.remove(), 700);
    log.write('info', pick(LIGHTS_ON_LINES));
    return gained > 0 ? awayReport(idle, gained) : null;
  };

  const markInput = () => {
    lastInput = Date.now();
    ticketsAtInput = state.ticketsAllTime;
  };

  const input = (e: Event) => {
    if (afk) {
      // erste Berührung weckt nur auf, sie tippt nicht am Ticket weiter und scrollt nicht
      e.preventDefault();
      e.stopPropagation();
      const report = lightsOn();
      if (e.type === 'pointerdown') {
        // der Klick zu diesem Antippen kommt erst beim Loslassen (auch nach langem Drücken): bis dahin schlucken,
        // erst danach den Bericht zeigen, damit der Klick nicht auf dessen Knopf landet
        const swallow = (c: Event) => {
          c.preventDefault();
          c.stopPropagation();
        };
        document.addEventListener('click', swallow, { capture: true });
        const released = () => {
          setTimeout(() => {
            document.removeEventListener('click', swallow, { capture: true });
            if (report) onWake(report);
          }, REPORT_AFTER_RELEASE_MS);
        };
        document.addEventListener('pointerup', released, { capture: true, once: true });
        document.addEventListener('pointercancel', released, { capture: true, once: true });
      } else if (report) {
        setTimeout(() => onWake(report), REPORT_AFTER_KEY_MS);
      }
    }
    markInput();
  };
  document.addEventListener('pointerdown', input, { capture: true });
  document.addEventListener('keydown', input, { capture: true });
  // nicht passiv, sonst wirkt preventDefault beim Aufwachen per Mausrad nicht
  document.addEventListener('wheel', input, { capture: true, passive: false });

  return {
    /** Ein Logik-Schritt: normal oder, wenn niemand da ist, wie Abwesenheit */
    update(dtSec: number) {
      const now = Date.now();
      const idle = now - lastInput;
      // mitten im Minispiel oder bei offenem Dialog (Entscheidung, Bericht) bleibt das Licht an;
      // ein wartender Alarm wartet im Dunkeln (stumm) weiter
      const busy = document.querySelector('.incident.playing') || document.querySelector('dialog[open]');
      if (!afk && idle >= CONFIG.afkMs && !document.hidden && !busy) enter();
      if (afk) afkTick(state, dtSec, now, idle);
      else tick(state, dtSec, now);
    },
    /** Seite wird verdeckt: merken, seit wann */
    hide() {
      hiddenAt = Date.now();
    },
    /**
     * Seite wieder sichtbar: verdeckte Zeit gutschreiben. War schon vorher niemand da, geht die
     * Abwesenheit nahtlos weiter (keine neue volle Stunde), und der Bericht umfasst die ganze Zeit.
     */
    resume(): OfflineReport | null {
      const now = Date.now();
      const priorAway = hiddenAt && afk ? Math.max(0, hiddenAt - lastInput) : 0;
      const offline = applyOfflineProgress(state, now, priorAway);
      let report = offline;
      if (afk) {
        const whole = lightsOn();
        report = whole && whole.elapsedMs >= CONFIG.offlineReportMinMs ? whole : offline;
      }
      hiddenAt = 0;
      markInput();
      return report;
    },
  };
}
