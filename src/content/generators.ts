import type { GeneratorId } from '../config';

export interface GeneratorText {
  name: string;
  /** ASCII-„Icon“ für die Infra-Liste */
  icon: string;
  desc: string;
  /** Logzeile beim Kauf; {n} = neuer Bestand */
  buyLog: string[];
  /** Zufällige Logzeilen, solange mindestens einer läuft */
  ambient: string[];
  /** Meilenstein-Zeilen nach Bestand; Fallback: generic */
  milestones: Partial<Record<number, string>>;
}

export const GENERATOR_TEXT: Record<GeneratorId, GeneratorText> = {
  intern: {
    name: 'Praktikant',
    icon: 'ᕕ(ᐛ)ᕗ',
    desc: 'Hat es aus- und wieder eingeschaltet.',
    buyLog: [
      'hr[201]: new intern onboarded. issued: 1 laptop, 0 admin rights (yet)',
      'hr[201]: intern #{n} started. desk: next to the printer. good luck.',
      'ldap[389]: user "praktikant{n}" created. password: Sommer2026!',
    ],
    ambient: [
      'praktikant[{pid}]: asked "have you tried turning it off and on again?" -> resolved',
      'praktikant[{pid}]: rebooted the wrong server. nobody noticed.',
      'praktikant[{pid}]: googled the error. applied first answer from 2009.',
      'praktikant[{pid}]: replaced toner. ticket closed. hands now permanently blue.',
      'praktikant[{pid}]: "kein Netz" -> cable plugged in. ticket closed.',
    ],
    milestones: {
      1: 'hr[201]: first intern. they still believe in documentation.',
      10: 'facility[42]: coffee machine reports 300% load. interns detected.',
      25: 'ldap[389]: 25 interns in group "Domain Admins". this is fine.',
      50: 'hr[201]: intern pool exceeds parking spots. new policy: bike.',
      100: 'kernel: intern overflow. spawning more desks.',
    },
  },
  bash: {
    name: 'Bash-Skript',
    icon: '#!/bin/sh',
    desc: 'Funktioniert. Keiner weiß warum. Nicht anfassen.',
    buyLog: [
      'vim[{pid}]: wrote fix_{n}.sh: 1 line, 7 pipes, 0 comments',
      'bash[{pid}]: chmod +x fix_everything_v{n}_final_FINAL.sh',
      'git[{pid}]: commit "quick fix" (+1 -0) pushed to main. no review.',
    ],
    ambient: [
      'fix_all.sh[{pid}]: exit 0 (no idea why)',
      'fix_all.sh[{pid}]: line 42: # TODO: das hier richtig machen (2014)',
      'restart_if_slow.sh[{pid}]: service restarted (3rd time this hour)',
      'cleanup.sh[{pid}]: rm -rf "$DIR/"* -- DIR was set. this time.',
      'bash[{pid}]: warning: script last modified by "temp_user" in 2013',
    ],
    milestones: {
      1: 'bash[1]: first script deployed. it has no error handling. it never fails.',
      10: 'bash[1]: 10 scripts call each other. dependency graph: yes.',
      25: 'bash[1]: someone found "set -e" in one script. it was removed.',
      50: 'bash[1]: script count exceeds employee count.',
      100: 'bash[1]: the scripts are now maintaining the scripts.',
    },
  },
  cron: {
    name: 'Cronjob',
    icon: '*/5 * *',
    desc: 'Läuft jede Nacht um 03:00. Seit 2011. Owner: unbekannt.',
    buyLog: [
      'crontab[{pid}]: installed new crontab for root. nobody will remember this.',
      'crontab[{pid}]: "0 3 * * * /opt/legacy/job{n}.sh >/dev/null 2>&1"',
      'crontab[{pid}]: new job added. output goes to mail. mail goes nowhere.',
    ],
    ambient: [
      'CRON[{pid}]: (root) CMD (/opt/scripts/close_tickets.sh >/dev/null 2>&1)',
      'CRON[{pid}]: job owner "hmueller" left the company in 2016. job still running.',
      'anacron[{pid}]: catching up 14 missed runs. sorry.',
      'CRON[{pid}]: (root) CMD (find /tmp -mtime +7 -delete) # hopefully /tmp',
      'CRON[{pid}]: closed tickets that resolved themselves. counts as work.',
    ],
    milestones: {
      1: 'cron[1]: first cronjob. 03:00 is now a dangerous time.',
      10: 'cron[1]: all 10 jobs start at 03:00. load average: yes.',
      25: 'cron[1]: nobody knows what job #17 does. disabling it broke payroll.',
      50: 'cron[1]: crontab has more lines than the wiki.',
      100: 'cron[1]: the server now has a social life at night.',
    },
  },
};

export const LOCKED_TEXT = {
  name: '[REDACTED]',
  desc: 'Freigabe durch Change Advisory Board ausstehend.',
};
