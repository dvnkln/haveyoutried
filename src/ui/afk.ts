import { CONFIG } from '../config';
import { afkTick, applyOfflineProgress, awayReport, restShare, type OfflineReport } from '../core/offline';
import type { GameState } from '../core/state';
import { tick } from '../core/tick';
import { pick } from '../util';
import type { SysLog } from './log';
import type { Power } from './power';
import { gamePaused } from './blocked';
import { MAIL_AFTER_SCREEN_MS } from './boot';
import { AFK_HINTS, LIGHTS_OFF_LINES, LIGHTS_ON_LINES, SCREEN_ON_LINES } from '../content/boot';

/** Nach Incident oder Dialog: so lange mindestens, bevor das Licht ausgehen darf */
const BUSY_GRACE_MS = 60_000;
/** Erst geht der Monitor in Standby, dann das Licht */
const LIGHTS_AFTER_SCREEN_MS = 900;

/**
 * Seite offen, aber niemand spielt: nach CONFIG.afkMs gehen Bildschirm und Bürolicht aus,
 * die Produktion läuft wie bei Abwesenheit (erste Stunde voll, dann gekürzt, irgendwann nichts).
 * Die erste Berührung macht nur das Licht an, der Monitor geht mit der Tastatur an, dann kommt der Bericht.
 */
export function createAfk(state: GameState, log: SysLog, power: Power, onWake: (r: OfflineReport) => void) {
  let lastInput = Date.now();
  let afk = false;
  /** Startablauf (Splash bis Monitor an): keine Ereignisse, kein Licht-aus */
  let booting = true;
  /** Lifetime-Tickets bei der letzten Eingabe: daraus wird der Bericht */
  let ticketsAtInput = state.ticketsAllTime;
  /** Zeitpunkt, an dem die Seite verdeckt wurde (Display aus, App gewechselt) */
  let hiddenAt = 0;
  /** im letzten Schritt lief ein Incident oder war ein Dialog offen */
  let wasBusy = false;

  const enter = () => {
    afk = true;
    log.write('info', pick(LIGHTS_OFF_LINES));
    // gilt sofort als dunkel (jede Berührung weckt), die Röhren gehen aber erst nach dem Monitor aus
    const delayMs = power.screenOff ? 0 : LIGHTS_AFTER_SCREEN_MS;
    power.screenOffNow();
    power.lightsOff(pick(AFK_HINTS), { delayMs });
  };

  const markInput = () => {
    lastInput = Date.now();
    ticketsAtInput = state.ticketsAllTime;
  };

  /** Bericht wartet, bis der Monitor an ist: die Mail vom Chef liest man am Bildschirm */
  let pending: OfflineReport | null = null;
  /** Beginn der Abwesenheit, über die der wartende Bericht geht (geht man erneut, ohne den Monitor anzumachen, zählt alles zusammen) */
  let pendingFrom: { at: number; tickets: number } | null = null;
  /** wartenden Bericht abholen (dann ist er erledigt) */
  const takePending = () => {
    const report = pending;
    pending = null;
    pendingFrom = null;
    return report;
  };

  /** Wieder da: gibt den Bericht über die Zeit seit der letzten Eingabe zurück (oder null) */
  const wake = (): OfflineReport | null => {
    if (!afk) return null;
    const from = pendingFrom ?? { at: lastInput, tickets: ticketsAtInput };
    pendingFrom = from;
    const idle = Date.now() - from.at;
    const gained = state.ticketsAllTime - from.tickets;
    afk = false;
    log.write('info', pick(LIGHTS_ON_LINES));
    markInput();
    return gained > 0 ? awayReport(idle, gained, restShare(state)) : null;
  };

  // Gewunken: Licht geht an (macht power); der Bericht kommt mit dem Monitor
  power.onWave(() => {
    const report = wake();
    if (report) pending = report;
    markInput();
  });
  power.onScreen(() => {
    markInput();
    if (booting) return;
    log.write('info', pick(SCREEN_ON_LINES));
    const report = takePending();
    if (report) setTimeout(() => onWake(report), MAIL_AFTER_SCREEN_MS);
  });

  for (const type of ['pointerdown', 'keydown', 'wheel'] as const) document.addEventListener(type, markInput, { capture: true, passive: true });

  return {
    /** Ein Logik-Schritt: normal oder, wenn niemand da ist (oder der Monitor aus ist), wie Abwesenheit */
    update(dtSec: number) {
      const now = Date.now();
      const idle = now - lastInput;
      // mitten im Minispiel oder bei offenem Dialog (Entscheidung, Bericht) bleibt das Licht an;
      // ein wartender Alarm wartet im Dunkeln (stumm) weiter
      const busy = !!(document.querySelector('.incident.playing') || document.querySelector('dialog[open]'));
      // gerade einen Incident gelöst oder einen Dialog geschlossen: nicht gleich Licht aus, eine Minute Schonfrist
      if (wasBusy && !busy && idle > CONFIG.afkMs - BUSY_GRACE_MS) lastInput = now - (CONFIG.afkMs - BUSY_GRACE_MS);
      wasBusy = busy;
      if (!afk && !booting && now - lastInput >= CONFIG.afkMs && !document.hidden && !busy) enter();
      // Zettel vom Vorgänger oder Dialog offen: Spielzeit steht (Chef-Aufgabe, Boosts, Ereignisse), damit man in Ruhe liest;
      // die Infrastruktur arbeitet weiter, bei langer Abwesenheit (Dialog offen gelassen) aber nur wie bei Abwesenheit
      if (!afk && !booting && !power.screenOff && gamePaused()) {
        if (idle >= CONFIG.afkMs) afkTick(state, dtSec, now, idle);
        else tick(state, dtSec, now, false);
        return;
      }
      // Monitor aus: es läuft nur die Infrastruktur, keine Anrufe, Pager oder Incidents im Dunkeln
      if (afk || booting || power.screenOff) afkTick(state, dtSec, now, idle);
      else tick(state, dtSec, now);
    },
    /** Startablauf fertig: ab jetzt zählt die Zeit bis zum Licht-aus */
    booted() {
      booting = false;
      markInput();
      // App während des Startablaufs kurz gewechselt: dieser Bericht kommt jetzt
      const report = takePending();
      if (report) onWake(report);
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
        const whole = wake();
        void power.lightsOn();
        report = whole && whole.elapsedMs >= CONFIG.offlineReportMinMs ? whole : offline;
      }
      hiddenAt = 0;
      markInput();
      // Monitor noch aus (Licht war aus) oder Startablauf läuft noch: Bericht kommt erst, wenn er an bzw. fertig ist
      if (power.screenOff || booting) {
        if (report) pending = report;
        return null;
      }
      pendingFrom = null;
      return report;
    },
  };
}
