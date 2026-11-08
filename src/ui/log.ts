import { CONFIG } from '../config';
import type { LogLevel, LogTemplate } from '../content/syslog';
import { fill, pick } from '../util';
import { h } from './dom';

const HOSTS = ['helpdesk01', 'helpdesk01', 'helpdesk01', 'srv-legacy01', 'fs02', 'dc01'];

const time = (d: Date) =>
  [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');

/** Scrollendes Fake-Syslog. Reiner Flavor, nicht im Spielstand. */
export class SysLog {
  readonly el: HTMLElement;
  private pinned = true;

  constructor() {
    this.el = h('div', { class: 'log', role: 'log', 'aria-live': 'off', 'aria-label': 'Syslog' });
    this.el.addEventListener(
      'scroll',
      () => {
        const { scrollTop, scrollHeight, clientHeight } = this.el;
        this.pinned = scrollHeight - scrollTop - clientHeight < 24;
      },
      { passive: true },
    );
  }

  write(level: LogLevel, text: string, vars: Record<string, string | number> = {}): void {
    const line = h('div', { class: `line lv-${level}` }, [
      h('span', { class: 'ts', text: `${time(new Date())} ${pick(HOSTS)} ` }),
      fill(text, vars),
    ]);
    this.el.append(line);
    while (this.el.childElementCount > CONFIG.logMaxLines) this.el.firstElementChild?.remove();
    if (this.pinned) this.el.scrollTop = this.el.scrollHeight;
  }

  template(tpl: LogTemplate, vars: Record<string, string | number> = {}): void {
    this.write(tpl.level, tpl.text, vars);
  }

  /** Nach Tab-Wechsel wieder ans Ende springen */
  scrollToEnd(): void {
    if (this.pinned) this.el.scrollTop = this.el.scrollHeight;
  }
}
