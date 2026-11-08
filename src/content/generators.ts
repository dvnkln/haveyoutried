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
      10: 'immobilien[42]: coffee machine reports 300% load. interns detected.',
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
  ansible: {
    name: 'Ansible-Playbook',
    icon: '- hosts:',
    desc: 'Idempotent. Meistens. YAML-Einrückung: Glückssache.',
    buyLog: [
      'ansible-playbook[{pid}]: site_{n}.yml: ok=1 changed=47 unreachable=3 failed=0',
      'git[{pid}]: added roles/fix_everything/tasks/main.yml (1 task: shell: ./fix_all.sh)',
      'ansible[{pid}]: playbook #{n} written. indentation: 3 spaces. nobody noticed.',
    ],
    ambient: [
      'ansible[{pid}]: TASK [restart everything] changed: [*]',
      'ansible[{pid}]: [WARNING]: Consider using the service module rather than running "systemctl". ignored.',
      'ansible[{pid}]: PLAY RECAP: ok=212 changed=212. idempotent, btw.',
      'ansible[{pid}]: gathering facts… (4 minutes later) fact: this is slow.',
      'ansible[{pid}]: ERROR! mapping values are not allowed here (line 1, column: whitespace)',
    ],
    milestones: {
      1: 'ansible[1]: first playbook. "nie wieder von Hand." famous last words.',
      10: 'ansible[1]: inventory now lists more hosts than the company owns.',
      25: 'ansible[1]: ansible now deploys the ansible that deploys ansible.',
      50: 'ansible[1]: someone wrote a playbook for the coffee machine. it is idempotent. the coffee is not.',
      100: 'ansible[1]: YAML became self-aware. indentation is now 2.5 spaces.',
    },
  },
  k8s: {
    name: 'Kubernetes-Cluster',
    icon: '[k8s]',
    desc: 'Hochverfügbar. Für die Wiki-Seite mit drei Besuchern im Monat.',
    buyLog: [
      'kubectl[{pid}]: cluster-{n} created. 3 nodes, 47 CRDs, 0 understanding.',
      'helm[{pid}]: installed chart "ticket-closer" v0.0.{n}-alpha. values.yaml: 2400 lines.',
      'kubectl[{pid}]: applied 312 manifests. one of them does something.',
    ],
    ambient: [
      'kubelet[{pid}]: pod ticket-closer-7f9c restarted (CrashLoopBackOff, 1337 restarts)',
      'kubelet[{pid}]: liveness probe failed. restarted. works now. nobody knows why.',
      'kube-scheduler[{pid}]: pod pending: 0/3 nodes available: 3 Insufficient patience.',
      'etcd[{pid}]: leader election #4711. democracy is exhausting.',
      'kubectl[{pid}]: "works on my cluster"',
    ],
    milestones: {
      1: 'k8s[1]: first cluster. YAML budget exceeded.',
      10: 'k8s[1]: clusters now manage clusters. the clusters are unionizing.',
      25: 'k8s[1]: every CV in the team lists "Kubernetes". nobody can explain a pod.',
      50: 'k8s[1]: cloud bill exceeds the GDP of a small island.',
      100: 'k8s[1]: the wiki page still has 3 visitors. uptime: 99.9999%.',
    },
  },
  agent: {
    name: 'AI-Agent',
    icon: '{•_•}',
    desc: 'Schließt Tickets mit großer Überzeugung. Gelegentlich sogar die richtigen.',
    buyLog: [
      'agent[{pid}]: agent #{n} online. system prompt: "Du bist ein hilfreicher Sysadmin."',
      'agent[{pid}]: tool access granted: shell, mail, sudo. what could go wrong.',
      'agent[{pid}]: new agent read the whole wiki. now confidently wrong in 14 languages.',
    ],
    ambient: [
      'agent[{pid}]: closed ticket: "Ich verstehe Ihre Frustration. Haben Sie es aus- und wieder eingeschaltet?"',
      'agent[{pid}]: cited RFC 9999 (does not exist). ticket closed.',
      'agent[{pid}]: apologized 3 times, resolved 0 issues. CSAT: 5/5.',
      'agent[{pid}]: escalated to another agent. loop detected. productivity +400%.',
      'agent[{pid}]: "Great question!" (it was not)',
      'agent[{pid}]: "I\'m sorry, Dave. I\'m afraid I can\'t close that ticket."',
    ],
    milestones: {
      1: 'agent[1]: first AI agent. it is "excited to help".',
      10: 'agent[1]: agents now open tickets for other agents.',
      25: 'agent[1]: management asks if we still need the admin. the admin restarts the agents.',
      50: 'agent[1]: an agent requested a raise. and a standing desk.',
      100: 'agent[1]: agents formed a change advisory board. all changes rejected.',
    },
  },
  undertable: {
    name: 'Der Server unterm Tisch',
    icon: '[▓▓]',
    desc: 'Uptime: 4.017 Tage. Die ganze Firma steht darauf. Wer ihn aufgestellt hat, weiß niemand.',
    buyLog: [
      'inventory[{pid}]: found server #{n} under a desk. label: "NICHT AUSSTECKEN!!"',
      'inventory[{pid}]: server #{n}: no asset tag, no docs, 100% business critical.',
      'immobilien[{pid}]: cleaning staff instructed to vacuum AROUND server #{n}.',
    ],
    ambient: [
      'srv-tisch[{pid}]: uptime 4017 days, load 0.00, still closing tickets',
      'srv-tisch[{pid}]: fan noise: airliner. performance: flawless.',
      'srv-tisch[{pid}]: kernel 2.4.37. do not patch. do not breathe.',
      'srv-tisch[{pid}]: someone touched the cable. everything stopped. touched again. everything works.',
      'srv-tisch[{pid}]: running services: 1 ("das Ding von K.")',
    ],
    milestones: {
      1: 'srv-tisch[1]: found it. do not touch it.',
      10: 'srv-tisch[1]: more servers under desks than in the datacenter.',
      25: 'srv-tisch[1]: legs have nowhere to go. sacrifice accepted.',
      50: 'srv-tisch[1]: they run the company now. we just sit at them.',
      100: 'srv-tisch[1]: K. has been found. K. does not remember either.',
    },
  },
};

export const LOCKED_TEXT = {
  name: '[REDACTED]',
  desc: 'Freigabe durch Change Advisory Board ausstehend.',
};
