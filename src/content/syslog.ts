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
  'Neustart. Überraschung: hat geholfen',
  'User im Urlaub, Ticket jetzt auch',
  '„ok danke geht wieder“',
  'Drucker mit Gewalt überzeugt',
  'War Montag',
  'Treiber von 2009 installiert',
  'Siehe Wiki (es gibt kein Wiki)',
  'Sie müssen auf „OK“ klicken',
  'War kein Problem, war eine Frage',
  'Zur Chefsache erklärt (= nie)',
  'Kaffee aus der Tastatur geschüttelt',
  'Num-Lock',
  'Mit „sudo“ davor gelöst',
  'Sonnenwind',
  'Haben Sie es mal mit einem anderen Browser versucht?',
  'Bekanntes Problem, Fix kommt im nächsten Release (2031)',
  'Workaround: nicht mehr machen',
];

/** Klassische BOFH-Ausreden für bofh[666]. */
export const BOFH_EXCUSES = [
  'solar flares',
  'static buildup in the user',
  'temporary routing anomaly',
  'the vendor put the bug there',
  'cosmic rays flipped a bit. that bit.',
  'electromagnetic interference from the coffee machine',
  'the cleaning staff needed the socket',
  'butterflies in the datacenter',
  'packet loss due to draft from the window',
  'the bits are on lunch break',
  'too many zeros in the cable, ones got stuck',
  'firewall is in a bad mood',
  'router in power saving mode since 2017',
  'network not warmed up yet',
  'IPv6 is jealous',
  'server is homesick',
  'the internet was full',
  'leap second, retroactively',
  'mouse needs more exercise',
  'wrong polarity on the ethernet cable',
  'user is using the wrong end of the mouse',
  'scheduled unscheduled maintenance',
  'moon phase unfavourable for layer 2',
  'DNS. obviously.',
  'it worked in the change request',
];

/** Hintergrundrauschen im Syslog. {pid} wird zufällig ersetzt. */
export const AMBIENT: LogTemplate[] = [
  // Klassiker
  t('crit', 'kernel: lp0 on fire'),
  t('warn', 'named[53]: SERVFAIL resolving intranet.local'),
  t('info', 'named[53]: it was DNS. it is always DNS.'),
  t('info', 'named[53]: query printer.local: NXDOMAIN. it was DNS. (it was the printer.)'),
  t('warn', 'sshd[{pid}]: Failed password for root from 10.0.0.23 port 4711 ssh2'),
  t('warn', 'sshd[{pid}]: Accepted password for admin (password: Passwort123)'),
  t('info', 'sshd[{pid}]: Connection closed by user admin (typo in password, 4th attempt)'),
  t('warn', 'sudo[{pid}]: praktikant : user NOT in sudoers ; This incident will be reported.'),
  t('info', 'sudo[{pid}]: lecture shown to user "werkstudent". user did not read it.'),
  t('info', 'ldap[389]: password changed: Passwort123 -> Passwort124'),
  t('info', 'kernel: EDAC MC0: 1 CE memory read error. it is fine. it is ECC.'),
  t('warn', 'kernel: Out of memory: Killed process {pid} (chrome, 147 tabs)'),
  t('info', 'kernel: TCP: out of memory -- consider tuning tcp_mem (consider coffee)'),
  t('warn', 'kernel: usb 1-1: new device "USB-Stick (Parkplatz, gefunden)"'),
  t('info', 'kernel: CPU0: temperature above threshold (Kaffeemaschine steht davor)'),
  t('warn', 'smartd[666]: /dev/sda: 8 pending sectors. replacement budgeted for next FY.'),
  t('warn', 'mdadm[{pid}]: /dev/md0 degraded. user asks if that is "the beeping".'),
  t('crit', 'backup[{pid}]: last successful backup: never'),
  t('info', 'backup[{pid}]: restore test skipped. we believe in it.'),
  t('crit', 'ups[{pid}]: on battery. reason: cleaning staff needed the socket'),
  t('warn', 'ntpd[123]: time has gone backwards. again.'),
  t('info', 'ntpd[123]: synced with stratum 1 server (a raspberry pi under a desk)'),
  t('warn', 'certbot[{pid}]: certificate expires in 0 days. reminder went to ex-employee.'),
  t('warn', 'firewall[{pid}]: rule "allow any any" added. comment: "temporär"'),
  t('info', 'dhcpd[{pid}]: DHCPACK to 10.0.0.66 (Smart-Kühlschrank Teeküche)'),
  t('warn', 'dhcpd[{pid}]: no free leases. someone brought 3 phones, 2 watches and a toaster'),
  t('info', 'monitoring[{pid}]: srv-legacy01 uptime 2847 days. nobody knows what it does.'),
  t('warn', 'monitoring[{pid}]: disk / 99% full. culprit: /var/log/monitoring.log'),
  t('crit', 'nagios[{pid}]: CRITICAL: everything. acknowledged by: everyone. fixed by: no one.'),
  t('info', 'docker[{pid}]: image size 4.7 GB. contents: hello world'),
  t('crit', 'git[{pid}]: force-push to main by "praktikant". history rewritten. so was yours.'),
  t('info', 'git[{pid}]: commit "fix" "fix2" "fix fix" "jetzt aber" "WARUM" pushed'),
  t('warn', 'vim[{pid}]: user unable to exit. session duration: 3 days.'),
  t('info', 'bash[{pid}]: history shows "rm -rf / tmp". note the space.'),
  // Drucker
  t('info', 'cupsd[631]: printer01: PC LOAD LETTER'),
  t('crit', 'cupsd[631]: printer02: paper jam. printer03: paper jam. printer04: on fire'),
  t('info', 'cupsd[631]: printer03: ready. (lying)'),
  t('warn', 'cupsd[631]: job 4711: 600 pages, color, duplex: "test, bitte ignorieren"'),
  // Büroleben
  t('info', 'postfix/smtp[{pid}]: reply-all storm (412 recipients, 3x "bitte austragen")'),
  t('warn', 'helpdesk[1337]: user replied to auto-reply. auto-reply replied. loop detected.'),
  t('info', 'helpdesk[1337]: user reports "nothing works". no further details.'),
  t('info', 'helpdesk[1337]: user calls the browser "das Google". noted.'),
  t('info', 'helpdesk[1337]: ticket reopened: "geht wieder nicht" (attached: photo of screen, angled)'),
  t('info', 'helpdesk[1337]: priority set to "SEHR DRINGEND!!!" by user. priority set back by admin.'),
  t('info', 'jira[{pid}]: ticket moved to "Done" by product owner. nothing was done.'),
  t('info', 'teams[{pid}]: message "Kurze Frage" (estimated duration: 2h)'),
  t('info', 'teams[{pid}]: "Kannst du kurz meinen Bildschirm sehen?" (cannot)'),
  t('warn', 'outlook[{pid}]: mailbox full. user deletes 1 mail, keeps 14 GB of attachments'),
  t('info', 'wiki[{pid}]: page "Notfallplan" last edited 2012. status: draft.'),
  t('info', 'wiki[{pid}]: page "Passwörter (NICHT LÖSCHEN)" viewed 412 times'),
  t('info', 'calendar[{pid}]: meeting "Kurzer Sync" (90 min, 17 participants, 1 decision: new meeting)'),
  // systemd
  t('info', 'systemd[1]: Started Daily Excuse Generator.'),
  t('info', 'systemd[1]: Reached target Coffee.'),
  t('info', 'systemd[1]: Stopping User Patience... done.'),
  t('warn', 'systemd[1]: Failed to start Monday. Retrying in 7 days.'),
  t('warn', 'systemd[1]: helpdesk.service: Main process exited, status=1/MONDAY'),
  t('info', 'systemd-resolved[{pid}]: Using DNS server 8.8.8.8 because ours is down. again.'),
  // BOFH
  t('info', 'bofh[666]: user asked for more disk space. user now has less.'),
  t('info', 'bofh[666]: helpdesk hotline now routed to the fax machine. call volume -80%.'),
  t('info', 'bofh[666]: user asked for "the password". gave them one. not theirs.'),
  t('info', 'bofh[666]: user\'s mailbox quota set to 1 mail. they will learn.'),
  t('info', 'pfy[{pid}]: carpet static charge test on manager\'s desk: successful'),
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
  t('info', 'helpdesk[1337]: welcome back. nobody noticed you were gone. nobody ever does.'),
];

/** Wenn ein Upgrade gekauft wird; {name} = Upgrade-Name */
export const UPGRADE_BUY_LINES: LogTemplate[] = [
  t('ok', 'procurement[{pid}]: "{name}" approved. budget code: "Sonstiges"'),
  t('ok', 'changelog[{pid}]: deployed "{name}". no change request. works anyway.'),
  t('ok', 'helpdesk[1337]: "{name}" installed. productivity up, morale unchanged.'),
];

/** Neues Upgrade verfügbar */
export const UPGRADE_AVAILABLE_LINE = (name: string) =>
  t('warn', `jira[{pid}]: new ticket from management: "Wir brauchen ${name}. Bis gestern."`);

/** Neuer Generator sichtbar */
export const GENERATOR_UNLOCK_LINE = (name: string) =>
  t('warn', `monitoring[{pid}]: new resource discovered: "${name}". owner: unknown.`);

export const MILESTONE_FALLBACK = (name: string, n: number) =>
  t('ok', `inventory[{pid}]: ${n}x ${name}. purchase order approved by nobody.`);
