import { LOGIN } from '../content/boot';
import { companyOf } from '../content/companies';
import { osOf } from '../content/systems';
import { activeOs } from '../core/os';
import { markLoggedIn } from '../core/login';
import type { AppContext } from './app';
import { h, setText } from './dom';

/** Willkommen-Bildschirm wie bei XP: so lange „Willkommen“ steht, bevor der Desktop kommt */
const WELCOME_MS = 1_100;
/** Ausblenden zum Desktop */
const FADE_MS = 350;

export type LoginReason = 'first' | 'job' | 'os';

const HINTS: Record<LoginReason, string> = { first: LOGIN.hintFirst, job: LOGIN.hintNew, os: LOGIN.hintOs };

export interface Login {
  el: HTMLElement;
  /** Bildschirm zeigen (Kennwortfeld leer); first = allererster Start, job = neue Firma, os = anderes System (je eigener Kennworthinweis) */
  show(reason: LoginReason): void;
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
  // Logo-Name oder Dialogtitel des Systems, wie beim Vorbild (content/systems.ts loginBrand)
  const brand = h('b');
  const prompt = h('span');
  const el = h('div', { class: 'login', hidden: '', role: 'dialog', 'aria-label': 'Anmeldung' }, [
    h('div', { class: 'login-band' }),
    h('div', { class: 'login-mid' }, [
      h('div', { class: 'login-brand' }, [brand, prompt]),
      h('div', { class: 'login-user' }, [
        h('span', { class: 'login-pic', 'aria-hidden': 'true', text: '(•‿•)' }),
        // Feldnamen und Knöpfe nur, wo das Vorbild einen Anmeldedialog hat (98)
        h('div', { class: 'login-info' }, [
          h('span', { class: 'login-label', text: LOGIN.labelUser }),
          h('b', { class: 'login-name', text: LOGIN.user }),
          host,
          h('span', { class: 'login-label', text: LOGIN.labelPw }),
          h('span', { class: 'login-pw' }, [dots]),
          hint,
        ]),
      ]),
      h('div', { class: 'login-btns', 'aria-hidden': 'true' }, [h('span', { text: LOGIN.ok }), h('span', { text: LOGIN.cancel })]),
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
    show(reason) {
      clearTimers();
      typed = 0;
      const os = osOf(activeOs(ctx.state));
      setText(brand, os.loginBrand ?? '');
      brand.hidden = !os.loginBrand;
      setText(prompt, os.loginPrompt ?? LOGIN.prompt);
      setText(host, companyOf(ctx.state.prestige.company).host);
      setText(hint, HINTS[reason]);
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
      // Startton des Systems
      ctx.sfx.osStart(activeOs(ctx.state));
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
