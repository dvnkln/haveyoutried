export type LogLevel = 'info' | 'ok' | 'warn' | 'crit';

export interface LogTemplate {
  level: LogLevel;
  text: string;
}

const t = (level: LogLevel, text: string): LogTemplate => ({ level, text });

/** Wie ein Ticket geschlossen wurde. */
export const CLOSE_REASONS = [
  'Aus- und wieder eingeschaltet',
  'Bei mir geht’s',
  'PEBKAC',
  'Works as designed',
  'User hat nichts geändert (hat er doch)',
  'Layer-8-Problem',
  'Duplikat von #INC-000001',
  'Kabel war nicht eingesteckt',
  'Es war DNS',
  'Nicht reproduzierbar',
  'Feature, kein Bug',
  'Hat sich von selbst erledigt',
  'ID-10-T-Fehler',
  'An Hersteller eskaliert (/dev/null)',
  'Cache geleert',
  'Monitor war aus',
  'Caps Lock',
];

/** Hintergrundrauschen im Syslog. {pid} wird zufällig ersetzt. */
export const AMBIENT: LogTemplate[] = [
  t('crit', 'kernel: lp0 on fire'),
  t('warn', 'named[53]: SERVFAIL resolving intranet.local'),
  t('info', 'named[53]: it was DNS. it is always DNS.'),
  t('warn', 'sshd[{pid}]: Failed password for root from 10.0.0.23 port 4711 ssh2'),
  t('warn', 'sshd[{pid}]: Accepted password for admin (password: Passwort123)'),
  t('warn', 'sudo[{pid}]: praktikant : user NOT in sudoers ; This incident will be reported.'),
  t('warn', 'smartd[666]: /dev/sda: 8 pending sectors. replacement budgeted for next FY.'),
  t('info', 'bofh[666]: excuse of the day: solar flares'),
  t('info', 'bofh[666]: excuse of the day: static buildup in the user'),
  t('info', 'bofh[666]: excuse of the day: temporary routing anomaly'),
  t('info', 'bofh[666]: excuse of the day: the vendor put the bug there'),
  t('info', 'bofh[666]: user asked for more disk space. user now has less.'),
  t('warn', 'deploy[1655]: change scheduled: Fri 16:55. approved by: nobody'),
  t('info', 'cupsd[631]: printer01: PC LOAD LETTER'),
  t('crit', 'cupsd[631]: printer02: paper jam. printer03: paper jam. printer04: on fire'),
  t('warn', 'ntpd[123]: time has gone backwards. again.'),
  t('warn', 'kernel: Out of memory: Killed process {pid} (chrome, 147 tabs)'),
  t('info', 'monitoring[{pid}]: srv-legacy01 uptime 2847 days. nobody knows what it does.'),
  t('crit', 'backup[{pid}]: last successful backup: never'),
  t('warn', 'mdadm[{pid}]: /dev/md0 degraded. user asks if that is "the beeping".'),
  t('info', 'postfix/smtp[{pid}]: reply-all storm detected (412 recipients, 3 "bitte austragen")'),
  t('info', 'systemd[1]: Started Daily Excuse Generator.'),
  t('info', 'systemd[1]: Reached target Coffee.'),
  t('warn', 'systemd[1]: helpdesk.service: Main process exited, status=1/MONDAY'),
  t('info', 'kernel: CPU0: temperature above threshold (Kaffeemaschine steht davor)'),
  t('info', 'dhcpd[{pid}]: DHCPACK to 10.0.0.66 (Smart-Kühlschrank Teeküche)'),
  t('warn', 'firewall[{pid}]: rule "allow any any" added. comment: "temporär"'),
  t('info', 'helpdesk[1337]: user reports "nothing works". no further details.'),
  t('info', 'helpdesk[1337]: user calls the browser "das Google". noted.'),
  t('warn', 'certbot[{pid}]: certificate expires in 0 days. reminder mail went to ex-employee.'),
  t('info', 'wiki[{pid}]: page "Notfallplan" last edited 2012. status: draft.'),
];

export const BOOT_LINES: LogTemplate[] = [
  t('info', 'kernel: Linux version 2.6.32-legacy (never-updated) #1 SMP'),
  t('info', 'systemd[1]: Started Helpdesk Ticket Daemon.'),
  t('warn', 'helpdesk[1337]: queue loaded: ∞ open tickets'),
  t('info', 'helpdesk[1337]: on-call: you. always you.'),
];

export const RETURN_LINES: LogTemplate[] = [
  t('info', 'helpdesk[1337]: admin is back. pretending it was busy the whole time.'),
  t('info', 'login[{pid}]: session resumed. 47 unread "Dringend!!" mails.'),
];

export const MILESTONE_FALLBACK = (name: string, n: number) =>
  t('ok', `inventory[{pid}]: ${n}x ${name}. purchase order approved by nobody.`);
