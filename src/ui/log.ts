import { CONFIG } from '../config';
import type { LogLevel, LogTemplate } from '../content/syslog';
import { fill, pick } from '../util';

const HOSTS = ['helpdesk01', 'helpdesk01', 'helpdesk01', 'srv-legacy01', 'fs02', 'dc01'];

const time = (d: Date) =>
  [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');

export interface LogLine {
  level: LogLevel;
  text: string;
}

/**
 * Fake-Syslog ohne Anzeige (die App „Tickets“ hat das Log abgelöst): hält nur die
 * letzten Zeilen als Text im Speicher, billig genug für jeden Anschlag. Nicht im Spielstand.
 */
export class SysLog {
  readonly lines: LogLine[] = [];

  write(level: LogLevel, text: string, vars: Record<string, string | number> = {}): void {
    this.lines.push({ level, text: `${time(new Date())} ${pick(HOSTS)} ${fill(text, vars)}` });
    if (this.lines.length > CONFIG.logMaxLines) this.lines.shift();
  }

  template(tpl: LogTemplate, vars: Record<string, string | number> = {}): void {
    this.write(tpl.level, tpl.text, vars);
  }
}
