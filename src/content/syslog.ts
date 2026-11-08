export type LogLevel = 'info' | 'ok' | 'warn' | 'crit';

export interface LogTemplate {
  level: LogLevel;
  text: string;
}

const t = (level: LogLevel, text: string): LogTemplate => ({ level, text });

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
  'internet box too far from Big Ben',
  'the dependency maintained by one person in Nebraska took a day off',
  'polarity needs reversing (worked on TV)',
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
  // IT Crowd, xkcd, Dilbert & Co.
  t('warn', 'smoke-detector[{pid}]: server room. response: email sent to feuerwehr@stadt.de'),
  t('info', 'pbx[{pid}]: new emergency number configured: 0118 999 881 999 119 725 … 3'),
  t('info', 'facility-map[{pid}]: IT department located in the basement. again. sunlight: n/a'),
  t('crit', "mysql[3306]: INSERT INTO schueler VALUES ('Robert'); DROP TABLE schueler;--') … oops"),
  t('info', 'forum[{pid}]: thread "same problem here" (2009). last post: "nvm, fixed it". no details.'),
  t('warn', 'npm[{pid}]: 1412 dependencies installed. 1 maintained by one person in Nebraska since 2003.'),
  t('info', 'make[{pid}]: compiling… (sword fight in the hallway is approved)'),
  t('info', 'sudo[{pid}]: make me a sandwich → okay.'),
  t('info', 'standards[{pid}]: 14 competing standards. proposal: one universal standard. result: 15 competing standards.'),
  t('warn', 'passwd[{pid}]: "correct horse battery staple" rejected: needs 1 uppercase, 1 digit, 1 hieroglyph'),
  t('info', 'automation[{pid}]: script saves 5 min/week. took 3 weeks to write. worth it.'),
  t('warn', 'security[{pid}]: USB request denied. reason: information wants to be prevented.'),
  t('info', 'coffee[{pid}]: colleague walks slowly with full mug. looks busy. is not.'),
  t('info', 'deep-thought[42]: answer computed: 42. question: unknown.'),
  t('warn', 'meme[{pid}]: server room at 41 °C. dog with coffee reports: this is fine.'),
  t('info', 'anton[{pid}]: do not restart me.'),
  // Büro-Alltag
  t('warn', 'login[{pid}]: user "admin" logged in from 3 countries at once. impressive.'),
  t('info', 'cupsd[631]: job "Internet.pdf" received (4312 pages, color)'),
  t('info', 'wifi[{pid}]: SSID "Polizei Überwachungswagen 3" detected next door'),
  t('info', 'calendar[{pid}]: meeting "Wie machen wir weniger Meetings?" scheduled (2 h)'),
  t('info', 'git[{pid}]: commit "final final v2 (jetzt aber wirklich)"'),
  t('info', 'CRON[{pid}]: job "reboot_if_monday" executed. it is monday.'),
  t('info', 'teams[{pid}]: status "Bin gleich da" for 3 days'),
  t('warn', 'ldap[389]: account "praktikant2019" still active. praktikant left in 2019.'),
  t('warn', 'excel[{pid}]: "Budget_final.xlsx" links to 412 files that no longer exist'),
  t('warn', 'ups[{pid}]: battery self-test passed. battery age: 11 years. trust: low.'),
  t('info', 'kernel: usb 2-1: new device "Tassenwärmer (USB)" wants 2 A. denied.'),
  t('info', 'helpdesk[1337]: ticket "Maus geht nicht" – the mouse is a TV remote.'),
  t('warn', 'named[53]: TTL set to 86400. by someone. on friday.'),
  t('info', 'sshd[{pid}]: key "id_rsa_final_FINAL" accepted from praktikant-laptop'),
  t('info', 'backup[{pid}]: tape rotation: tape 3 is a cassette labelled "Mix 1994"'),
  t('warn', 'monitoring[{pid}]: everything green. this has never happened. investigating.'),
  t('info', 'jira[{pid}]: new ticket: "Bitte Ticket für das Ticketsystem anlegen"'),
  t('info', 'outlook[{pid}]: out-of-office: "Bis auf Weiteres im Urlaub. Bei Fragen: siehe oben."'),
  t('info', 'dishwasher[{pid}]: firmware 2.1 installed. now requires login.'),
  t('info', 'cupsd[631]: printer "Dieter" renamed by works council vote'),
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
  t('info', 'pbx[{pid}]: 47 voicemails. 46 of them: "Hallo? Ist da die IT?"'),
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
