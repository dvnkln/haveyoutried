import './styles/main.css';
import { BOOT_LINES, RETURN_LINES } from './content/syslog';
import { startLoop } from './core/loop';
import { applyOfflineProgress, type OfflineReport } from './core/offline';
import { loadGame, Saver } from './core/save';
import { createInitialState } from './core/state';
import { tick } from './core/tick';
import { registerServiceWorker } from './pwa/register';
import { mountApp } from './ui/app';
import { h } from './ui/dom';
import { startFlavor } from './ui/flavor';
import { formatDuration, formatNumber } from './ui/format';
import { createHaptics } from './ui/haptics';
import { SysLog } from './ui/log';
import { showModal } from './ui/modal';
import { infraTab } from './ui/tabs/infra';
import { queueTab } from './ui/tabs/queue';
import { systemTab } from './ui/tabs/system';
import { pick } from './util';

const now = Date.now();
const loaded = loadGame(now);
const state = loaded ?? createInitialState(now);
const startReport = loaded ? applyOfflineProgress(state, now) : null;

const log = new SysLog();
const haptic = createHaptics(() => state.settings.haptics);
const saver = new Saver(
  () => state,
  () => log.write('crit', 'kernel: EXT4-fs error: /dev/localStorage remounted read-only. savegame NOT written.'),
);

const root = document.getElementById('app');
if (!root) throw new Error('#app fehlt');
const app = mountApp(root, { state, log, saver, haptic }, [queueTab(), infraTab(), systemTab()]);
startFlavor(state, log, app, haptic);

for (const line of BOOT_LINES) log.template(line);
if (loaded) log.write('info', 'helpdesk[1337]: savegame restored from /var/lib/helpdesk');

const showOfflineReport = (r: OfflineReport) => {
  if (r.gained <= 0) return;
  log.template(pick(RETURN_LINES));
  showModal({
    title: 'Während du weg warst …',
    body: [
      h('p', {}, [
        'Deine Infrastruktur hat ',
        h('strong', { class: 'hl', text: formatNumber(r.gained) }),
        ' Tickets geschlossen. Niemand hat’s gemerkt.',
      ]),
      `Abwesend: ${formatDuration(r.elapsedMs)}` +
        (r.capped ? ` (angerechnet: ${formatDuration(r.creditedMs)}. Der Rest war Wochenende.)` : ''),
    ],
    actions: [{ label: 'Zur Kenntnis genommen', primary: true }],
  });
};
if (startReport) showOfflineReport(startReport);

const loop = startLoop(
  (dt) => tick(state, dt, Date.now()),
  () => app.render(),
);
saver.start();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saver.saveNow();
  } else {
    const report = applyOfflineProgress(state, Date.now());
    loop.resetClock();
    if (report) showOfflineReport(report);
  }
});
window.addEventListener('pagehide', () => saver.saveNow());

registerServiceWorker();
