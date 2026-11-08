import { CONFIG, GENERATORS } from '../config';
import { GENERATOR_TEXT } from '../content/generators';
import { AMBIENT, MILESTONE_FALLBACK } from '../content/syslog';
import { bus } from '../core/bus';
import type { GameState } from '../core/state';
import { pick, randInt } from '../util';
import type { App } from './app';
import type { HapticKind } from './haptics';
import type { SysLog } from './log';

/** Verbindet Spielereignisse mit Syslog-Zeilen und streut Ambient-Rauschen ein. */
export function startFlavor(state: GameState, log: SysLog, app: App, haptic: (k: HapticKind) => void): void {
  bus.on('buy', ({ id, owned }) => {
    log.write('info', pick(GENERATOR_TEXT[id].buyLog), { n: owned });
  });

  bus.on('milestone', ({ id, owned }) => {
    const text = GENERATOR_TEXT[id];
    const line = text.milestones[owned];
    if (line) log.write('ok', line);
    else log.template(MILESTONE_FALLBACK(text.name, owned));
    if (owned > 1) {
      app.popCounter();
      haptic('milestone');
    }
  });

  const ambient = () => {
    const running = GENERATORS.filter((g) => state.generators[g.id].owned > 0);
    if (running.length > 0 && Math.random() < 0.45) {
      // gewichtet nach Bestand
      const total = running.reduce((sum, g) => sum + state.generators[g.id].owned, 0);
      let r = Math.random() * total;
      const g = running.find((g) => (r -= state.generators[g.id].owned) < 0) ?? running[0]!;
      log.write('info', pick(GENERATOR_TEXT[g.id].ambient));
    } else {
      log.template(pick(AMBIENT));
    }
    setTimeout(ambient, randInt(CONFIG.ambientLogMinMs, CONFIG.ambientLogMaxMs));
  };
  setTimeout(ambient, randInt(CONFIG.ambientLogMinMs, CONFIG.ambientLogMaxMs));
}
