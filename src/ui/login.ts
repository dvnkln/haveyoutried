import { LOGIN } from '../content/boot';
import { companyOf } from '../content/companies';
import { markLoggedIn } from '../core/login';
import type { AppContext } from './app';
import { h, setText } from './dom';

/** Willkommen-Bildschirm wie bei XP: so lange „Willkommen“ steht, bevor der Desktop kommt */
const WELCOME_MS = 1_100;
/** Ausblenden zum Desktop */
const FADE_MS = 350;

export interface Login {
  el: HTMLElement;
  /** Bildschirm zeigen (Kennwortfeld leer); first = allererster Start (anderer Kennworthinweis) */
  show(first: boolean): void;
  /** Anmeldebildschirm steht (auch während „Willkommen“): Anschläge gehen hierher */
  active(): boolean;
  /** ein Anschlag = ein Punkt im Kennwortfeld: 'dot', beim letzten 'done' (spielt selbst einen Ton), sonst null (nichts mehr einzugeben) */
  type(): 'dot' | 'done' | null;
}

/**
 * Anmeldung am Rechner nach dem Einschalten: jede Taste ist richtig, nach LOGIN.length Anschlägen
 * kommt „Willkommen“ und dann der Desktop. Zählt nicht als Anschlag.
 */
export function createLogin(ctx: AppContext, onDone: () => void): Login {
  const host = h('span', { class: 'login-host' });
  const dots = h('span', { class: 'login-dots' });
  const hint = h('span', { class: 'login-hint' });
  const el = h('div', { class: 'login', hidden: '', role: 'dialog', 'aria-label': 'Anmeldung' }, [
    h('div', { class: 'login-band' }),
    h('div', { class: 'login-mid' }, [
      h('div', { class: 'login-brand' }, [h('b', { text: 'HYT-2000' }), h('span', { text: LOGIN.prompt })]),
      h('div', { class: 'login-user' }, [
        h('span', { class: 'login-pic', 'aria-hidden': 'true', text: '(•‿•)' }),
        h('div', { class: 'login-info' }, [h('b', { class: 'login-name', text: LOGIN.user }), host, h('span', { class: 'login-pw' }, [dots]), hint]),
      ]),
      h('div', { class: 'login-welcome', text: LOGIN.welcome }),
    ]),
    h('div', { class: 'login-band login-foot' }, [h('span', { class: 'login-off', text: LOGIN.off })]),
  ]);

  let typed = 0;
  /** „Willkommen“ und Ausblenden: beim erneuten Zeigen abbrechen, sonst blendet ein alter Zeitgeber den neuen Bildschirm aus */
  let timers: number[] = [];
  const clearTimers = () => {
    for (const t of timers) clearTimeout(t);
    timers = [];
  };

  return {
    el,
    show(first) {
      clearTimers();
      typed = 0;
      setText(host, companyOf(ctx.state.prestige.company).host);
      setText(hint, first ? LOGIN.hintFirst : LOGIN.hintNew);
      setText(dots, '');
      el.classList.remove('ok', 'out');
      el.hidden = false;
    },
    active: () => !el.hidden,
    type() {
      if (el.hidden || typed >= LOGIN.length) return null;
      typed++;
      setText(dots, '●'.repeat(typed));
      if (typed < LOGIN.length) return 'dot';
      // angemeldet: „Willkommen“, dann zum Desktop
      markLoggedIn(ctx.state);
      const c = companyOf(ctx.state.prestige.company);
      ctx.log.write('ok', `winlogon[1]: support@${c.host} angemeldet. Kennwortqualität: „geht so“.`);
      ctx.sfx.unlockPing();
      el.classList.add('ok');
      timers.push(
        window.setTimeout(() => {
          el.classList.add('out');
          timers.push(
            window.setTimeout(() => {
              el.hidden = true;
              onDone();
            }, FADE_MS),
          );
        }, WELCOME_MS),
      );
      return 'done';
    },
  };
}
