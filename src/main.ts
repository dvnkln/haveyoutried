import './styles/main.css';
import { BOOT_LINES, RETURN_LINES } from './content/syslog';
import { awayRule, BOSS_REPORT_MIN_MS, bossReport } from './content/report';
import { createAfk } from './ui/afk';
import { startTutorial } from './ui/tutorial';
import { startLoop } from './core/loop';
import { applyOfflineProgress, type OfflineReport } from './core/offline';
import { EXP_REVALUED_FLAG, loadGame, Saver } from './core/save';
import { createInitialState } from './core/state';
import { registerServiceWorker } from './pwa/register';
import { mountApp } from './ui/app';
import { h } from './ui/dom';
import { startFlavor } from './ui/flavor';
import { mountIncidentOverlay } from './ui/incidents/overlay';
import { isIncidentId, settleAbandoned, startIncident } from './core/incidents';
import { rates } from './core/economy';
import { formatDuration, formatNumber } from './ui/format';
import { createHaptics } from './ui/haptics';
import { Sfx } from './ui/audio';
import { SysLog } from './ui/log';
import { TicketHistory } from './ui/history';
import { showModal } from './ui/modal';
import { infraTab } from './ui/tabs/infra';
import { logTab } from './ui/tabs/log';
import { upgradesTab } from './ui/tabs/upgrades';
import { systemTab } from './ui/tabs/system';
import { careerTab } from './ui/tabs/career';
import { pick } from './util';

const now = Date.now();
const loaded = loadGame(now);
const state = loaded ?? createInitialState(now);
const startReport = loaded ? applyOfflineProgress(state, now) : null;

const history = new TicketHistory();
const log = new SysLog();
const haptic = createHaptics(() => state.settings.haptics);
const sfx = new Sfx(() => state.settings);
// iOS ignoriert user-scalable=no: Pinch-Zoom hier abfangen (Doppeltipp verhindert touch-action im CSS)
for (const type of ['gesturestart', 'gesturechange'] as const) document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
// Audio darf erst nach einer Nutzergeste starten; iOS will dafür teils touchend
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) {
  document.addEventListener(type, () => sfx.unlock(), { capture: true, passive: true });
}
const saver = new Saver(
  () => state,
  () => {
    log.write('crit', 'kernel: EXT4-fs error: /dev/localStorage remounted read-only. savegame NOT written.');
    // Das Log sieht keiner mehr: Speicherfehler muss sichtbar sein
    app.toast('Speichern fehlgeschlagen', '/dev/localStorage ist schreibgeschützt. Fortschritt wird gerade nicht gesichert.');
  },
);

const root = document.getElementById('app');
if (!root) throw new Error('#app fehlt');
const ctx = { state, log, history, saver, sfx, haptic };
const app = mountApp(root, ctx, [logTab(), infraTab(), upgradesTab(), careerTab(), systemTab()]);
startFlavor(ctx, app);
mountIncidentOverlay(ctx);
// Übergabe vom Vorgänger: kurze Hinweise, wenn etwas zum ersten Mal wichtig wird
startTutorial(state);

// Seite während eines Incidents geschlossen → gilt als eskaliert
settleAbandoned(state, rates(state));

// Nur im Test-Build (vite build --mode e2e): ?incident=raid|spam|… startet das Minispiel direkt.
// Im normalen Build fällt der Block samt Abfrage komplett weg.
if (import.meta.env.MODE === 'e2e') {
  const forced = new URLSearchParams(location.search).get('incident');
  if (forced && isIncidentId(forced)) setTimeout(() => startIncident(state, forced), 1_200);
}

for (const line of BOOT_LINES) log.template(line);
if (loaded) log.write('info', 'helpdesk[1337]: savegame restored from /var/lib/helpdesk');
const revaluedFrom = state.flags[EXP_REVALUED_FLAG];
if (revaluedFrom !== undefined) {
  log.write(
    'warn',
    `hr[42]: Berufserfahrung neu bewertet: ${revaluedFrom} → ${state.prestige.experience} Punkte. Begründung: „Marktanpassung“. Einspruch bitte per Fax.`,
  );
  delete state.flags[EXP_REVALUED_FLAG];
}

const showOfflineReport = (r: OfflineReport) => {
  if (r.gained <= 0) return;
  log.template(pick(RETURN_LINES));
  // kurz weg: knappe Meldung; länger weg: der Chef schreibt eine Mail mit „ein paar Fragen“
  if (r.elapsedMs < BOSS_REPORT_MIN_MS) {
    showModal({
      title: 'Während du weg warst …',
      body: [
        h('p', {}, ['Deine Infrastruktur hat ', h('strong', { class: 'hl', text: formatNumber(r.gained) }), ' Tickets geschlossen. Niemand hat’s gemerkt.']),
        `Abwesend: ${formatDuration(r.elapsedMs)}`,
      ],
      actions: [{ label: 'Zur Kenntnis genommen', primary: true }],
    });
    return;
  }
  const mail = bossReport(state, r.elapsedMs, r.capped, Math.random, r.gained);
  showModal({
    title: 'Neue Mail vom Chef',
    className: 'boss-mail',
    body: [
      h('div', { class: 'bm-head' }, [
        h('div', {}, [h('span', { class: 'bm-key', text: 'Von:' }), ' Chef']),
        h('div', {}, [h('span', { class: 'bm-key', text: 'Betreff:' }), ` ${mail.subject}`]),
      ]),
      h('p', {}, [
        `Sie waren ${formatDuration(r.elapsedMs)} weg. Ihre Infrastruktur hat in der Zeit `,
        h('strong', { class: 'hl', text: formatNumber(r.gained) }),
        ' Tickets geschlossen. Ein paar Fragen:',
      ]),
      h('ul', { class: 'bm-list' }, mail.items.map((t) => h('li', { text: t }))),
      mail.closer,
      ...(r.reduced
        ? [h('p', { class: 'hint', text: `Angerechnet: ${formatDuration(r.creditedMs)}. ${awayRule()} Der Rest war laut Personalabteilung Schlaf.` })]
        : []),
      h('p', { class: 'bm-sig', text: mail.signature }),
    ],
    actions: [{ label: mail.button, primary: true }],
  });
};
if (startReport) showOfflineReport(startReport);

// Seite offen, aber niemand da: Licht aus, Produktion wie bei Abwesenheit
const afk = createAfk(state, log, showOfflineReport);
const loop = startLoop(
  (dt) => afk.update(dt),
  () => app.render(),
);
saver.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saver.saveNow();
    afk.hide();
  } else {
    // war vorher schon das Licht aus, läuft die Abwesenheit nahtlos weiter (ein Bericht für alles)
    const report = afk.resume();
    loop.resetClock();
    if (report) showOfflineReport(report);
  }
});
window.addEventListener('pagehide', () => saver.saveNow());

// Drehen (quer ↔ hoch): Höhe neu setzen und eine von iOS stehen gelassene Verschiebung zurücksetzen
const fitViewport = () => {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`);
  window.scrollTo(0, 0);
};
fitViewport();
window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 300));

registerServiceWorker();
