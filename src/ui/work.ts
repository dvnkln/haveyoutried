import { CONFIG, SOLVE } from '../config';
import { fresh } from '../core/deck';
import { espressoActive } from '../core/actions';
import { ticketWork } from '../core/economy';
import { availableCallers, QUEUE_LINE, type Call, type Line } from '../content/callers';
import {
  BOSSES,
  STREAK_LINES,
  CALL_LINES,
  CHAT_LINES,
  CHAT_STATES,
  MAIL_SIGS,
  MAIL_TITLES,
  MEME_ENTER_LINES,
  MEME_LEAVE_LINES,
  RDP_ERRORS,
  RDP_ICONS,
  SEARCH_RESULTS,
  TICKET_OPEN_STATES,
  TICKET_PRIOS,
  WEB_FOOTERS,
  WEB_GENERIC,
  DONE_LINES,
  TICKET_STATES,
  AI_FOOTERS,
  AI_GREETINGS,
  AI_PROMPTS,
  AI_REPLIES,
  AI_TITLES,
} from '../content/work';
import { GAG_SECTION, GAG_TAGS, IMAGE_POSTS, MEME_POSTS, MEME_SUBS, type ImagePost, type MemePost } from '../content/memes';
import { memeImage } from './memes';
import { DEVICE_SETTINGS, TALK_NOTES, TOPICS, topicPool, type Device } from '../content/topics';
import { fill, hhmm, pick, randInt, shuffle, weightedPick } from '../util';
import type { AppContext } from './app';
import { h, setText } from './dom';
import { companyOf } from '../content/companies';
import { FALLBACK_OS, osOf } from '../content/systems';
import { shownOs } from '../core/os';
import { nextTicketNo, ticketId } from './history';

/** Ohne Anschlag so lange, dann wird heimlich durch Memes gescrollt */
const IDLE_MEMES_MS = 15_000;
/** Memes je Seite (Forum, Bilderseite): genug, dass auch hohe Fenster nie leer durchscrollen */
const MEMES_PER_SITE = 10;
/** Kanal im Ticketverlauf */
const CHANNELS: Record<Kind, string> = {
  mail: 'Mail',
  ticket: 'Ticketsystem',
  term: 'Shell',
  chat: 'Firmen-Chat',
  call: 'Videocall',
  rdp: 'Fernwartung {target}',
  web: 'Webinterface {target}',
  search: 'Websuche (und Hoffnung)',
  ai: 'KI-Assistent (Beta)',
};
/** Überschrift des Getippten im Ticketverlauf */
const REPLY_LABELS: Record<Kind, string> = {
  mail: 'Antwort',
  ticket: 'Kommentar',
  term: 'Befehl',
  chat: 'Antwort',
  call: 'Gesagt',
  rdp: 'Ausgeführt',
  web: 'Geändert',
  search: 'Gesucht',
  ai: 'Gepromptet',
};
/** Rechnername passend zur Abteilung, z. B. „PC-BUCHH-07“; Chefetage hat Laptops */
const pcOf = (who: string) =>
  /Chef|Geschäftsführung|Vorstand/.test(who)
    ? 'LAPTOP-CHEF'
    : `PC-${who.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/[^A-Z]/g, '').slice(0, 5)}-${String(randInt(1, 12)).padStart(2, '0')}`;
/** ab und zu programmtypisches Geplänkel vor der eigentlichen Antwort */
const withPrefix = (prefixes: readonly string[], answer: string, share: number) => [Math.random() < share ? `${pick(prefixes)} ${answer}` : answer];
/** Antworten geht immer */
const TALK: Kind[] = ['mail', 'ticket', 'chat', 'call', 'ai'];
/** Werkzeuge, die zum Thema passen: genau die, für die das Thema Texte hat */
/** Webinterfaces für ein Anliegen: eigene Liste, sonst die des Themas */
const devicesFor = (line: Line): readonly Device[] => line.devices ?? TOPICS[line.topic].devices;
const techFor = (line: Line): Kind[] => {
  const t = TOPICS[line.topic];
  return [
    ...(t.cmds.length ? (['term'] as const) : []),
    ...(t.rdp.length ? (['rdp'] as const) : []),
    ...(devicesFor(line).length ? (['web'] as const) : []),
    ...(t.searches.length ? (['search'] as const) : []),
  ];
};
/** so lange bleibt ein gelöstes Ticket stehen; der nächste Anschlag wartet nicht darauf */
const SENT_HOLD_MS = 450;
/** Erfolgsstempel: meistens „Gelöst!“, ab und zu Abwechslung */
const STAMPS = ['Gelöst!', 'Gelöst!', 'Gelöst!', 'Ticket gelöst!', 'Erledigt!'];
/** nur nach einer Reparatur: bei reinen Antworten läuft nichts „wieder“ */
const FIX_STAMPS = [...STAMPS, 'Gefixt!', 'Läuft wieder!'];
const initials = (who: string) =>
  who
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

type Kind = 'mail' | 'ticket' | 'term' | 'chat' | 'call' | 'rdp' | 'web' | 'search' | 'ai';

interface Task {
  kind: Kind;
  who: string;
  subject: string;
  /** ganzer Anliegen-Text (subject ist gekürzt) */
  full: string;
  no: number;
  /** das Anliegen: Thema, Ursache, passende Antwort */
  line: Line;
  /** Anruf, zu dem das Ticket gehört (null = Warteschlange) */
  call: Call | null;
  /** Gerät im Webinterface */
  device: Device | null;
  /** Gerät, PC oder Ähnliches, je nach Programm */
  target: string;
  /** Rechnername der Firma (Terminal-Titel je System und Log: root@host) */
  host: string;
  /** Name der Web-App im Browser-Tab (KI-Assistent), einmal gewürfelt; sonst leer */
  app: string;
  /** Fernwartung auf einen Server (statt auf den PC des Anrufers) */
  server: boolean;
  /** Priorität: im Ticketsystem und im Verlauf dieselbe */
  prio: string;
}

/** Programm für eine Aufgabe: Titel, Kopf, was getippt wird und wie es im Log landet */
interface Program {
  weight: number;
  title: (t: Task) => string;
  head: (t: Task) => Node[];
  /** Beschriftung vor dem Getippten (im Terminal steht dort der Prompt) */
  label?: string;
  /** Inhalt unter dem Eingabefeld (Treffer, Knöpfe, Taskleiste) */
  extra?: (t: Task) => Node[];
  /** was getippt werden kann, passend zum Thema der Aufgabe */
  lines: (t: Task) => readonly string[];
  log: (t: Task, text: string) => string;
  /**
   * Abgeschickt (letzter Zustand vor „Gelöst“): Fenster zeigt das Ergebnis wie im echten Programm.
   * Kann eine Rückfallebene liefern, falls das Ergebnis nicht ins Fenster passt.
   */
  ready?: (t: Task, head: HTMLElement, extra: HTMLElement, reply: string) => (() => void) | void;
}

/** kleine grüne Bestätigung unter dem Eingabefeld */
const note = (text: string) => h('div', { class: 'sent-note', text });
const aiRow = (text: string, answered = false) =>
  h('div', { class: 'ai-row' }, [h('span', { class: 'ai-bot', 'aria-hidden': 'true', text: '{•_•}' }), h('span', { class: `ai-bubble${answered ? ' answered' : ''}`, text })]);
/**
 * Messenger-Verlauf: die abgeschickte Nachricht wandert als Blase rechts unter die letzte Nachricht,
 * danach ggf. die Antwort; das Eingabefeld unten ist wieder leer. Geht nicht, wenn der Verlauf im engen Fenster ausgeblendet ist.
 * Liefert, wie es rückgängig geht (dann steht die Nachricht wie früher im Eingabefeld).
 */
const toHistory = (head: HTMLElement, mine: HTMLElement, after: HTMLElement[] = []) => {
  const lastMsg = head.lastElementChild as HTMLElement | null;
  const work = head.closest('.work');
  if (!lastMsg || lastMsg.offsetParent === null || !work) return null;
  const added = [h('div', { class: 'msg-me' }, [mine]), ...after];
  head.append(...added);
  work.classList.add('moved');
  return () => {
    for (const n of added) n.remove();
    work.classList.remove('moved');
  };
};
/**
 * Bestätigung an die Stelle von etwas Sichtbarem setzen (gleicher Platz, nichts springt).
 * Ist das Ziel im engen Fenster ausgeblendet, kommt sie als „optional“ dazu und fällt weg, wenn kein Platz ist.
 */
const swap = (target: Element | null | undefined, node: HTMLElement) => {
  if (!target) return;
  if (target instanceof HTMLElement && target.offsetParent !== null) target.replaceWith(node);
  else {
    node.classList.add('opt');
    target.after(node);
  }
};
/** typische Ausgabe nach einem Befehl im Terminal */
const TERM_OUT = ['OK', '[  OK  ]', 'done.', 'exit 0', '3 warnings (ignoriert)', '1 Datei geändert.', 'Job erledigt.'];


/** Ein Browser für alle Web-Werkzeuge (und die Memes): immer dieselben Tabs offen, der des aktuellen Werkzeugs ist aktiv */
const BROWSER_TABS: { site: string; title: string }[] = [
  { site: 'ticket', title: 'TicketDesk 3.1 (Legacy)' },
  { site: 'ai', title: 'ChatKI' },
  { site: 'search', title: 'Sucher – Websuche' },
  { site: 'forum', title: 'r/all – readit' },
  { site: 'gag', title: '404GAG – Hot' },
];
const browserTab = (site: string, title: string, on: boolean) =>
  h('span', { class: `br-tab${on ? ' on' : ''}`, 'data-site': site }, [
    h('span', { class: 'br-fav' }),
    h('span', { class: 'br-tab-title', text: title }),
    h('span', { class: 'br-x', text: '×' }),
  ]);
/** Tab-Leiste: active = Werkzeug; title ersetzt dessen Standardtitel; extra = zusätzlicher Tab (Geräteseite), steht vor den Memes */
const browserTabs = (active: string, title?: string, extra?: { site: string; title: string }) => {
  const list = [...BROWSER_TABS];
  if (extra) list.splice(3, 0, extra);
  return list.map((t) => browserTab(t.site, t.site === active && title ? title : t.title, t.site === active));
};

/** Knopfleiste der Browser von früher (98: noch keine Tabs); sonst unsichtbar (main.css) */
const browserTools = () =>
  h('div', { class: 'br-tools', 'aria-hidden': 'true' }, BROWSER_TOOLS.map((x) => h('span', { text: x })));
const BROWSER_TOOLS = ['← Zurück', '→', '✕', '↻', '⌂ Startseite'];

/** Adresse in Domain und Rest geteilt: Safari (MäcOS) zeigt nur die Domain, die anderen Browser alles */
const addrParts = (url: string): (string | HTMLElement)[] => {
  const cut = url.indexOf('/');
  return cut < 0 ? [url] : [url.slice(0, cut), h('span', { class: 'br-path', text: url.slice(cut) })];
};

/** Browser-Rahmen: Tab-Leiste und Adresszeile (Schloss bzw. „Nicht sicher“) */
const browser = (url: string, secure: boolean, active: string, title?: string, extra?: { site: string; title: string }) =>
  h('div', { class: 'browser' }, [
    h('div', { class: 'br-tabs' }, [...browserTabs(active, title, extra), h('span', { class: 'br-new', text: '+' })]),
    browserTools(),
    h('div', { class: 'br-bar' }, [
      h('span', { class: 'br-nav', text: '‹ › ↻' }),
      h('span', { class: `br-url${secure ? '' : ' insecure'}` }, [
        h('span', { class: 'br-lock', text: secure ? '🔒︎' : '⚠ Nicht sicher' }),
        h('span', { class: 'br-addr' }, addrParts(url)),
      ]),
    ]),
  ]);

/** Desktop-Symbole der Fernwartung: kleine Zeichnungen je Dateityp, darunter der Name */
const RDP_ICON_SVG: Record<string, string> = {
  bin: '<path d="M5 6h10l-1 11H6z" fill="#e8eef7" stroke="#3d2c2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 5h12M8 4h4" stroke="#3d2c2e" stroke-width="1.4" stroke-linecap="round"/><path d="M8 8v7M10 8v7M12 8v7" stroke="#8aa0bd" stroke-width="1"/>',
  sheet: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#3d2c2e" stroke-width="1.4" stroke-linejoin="round"/><rect x="2" y="8" width="9" height="8" rx="1" fill="#2f9e6a" stroke="#3d2c2e" stroke-width="1.2"/><path d="M4.5 10l4 4M8.5 10l-4 4" stroke="#fff" stroke-width="1.4"/><path d="M12 9h3M12 12h3M12 15h3" stroke="#2f9e6a" stroke-width="1"/>',
  doc: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#3d2c2e" stroke-width="1.4" stroke-linejoin="round"/><rect x="2" y="8" width="9" height="8" rx="1" fill="#3a6fd8" stroke="#3d2c2e" stroke-width="1.2"/><path d="M4 10l1.2 4 1.3-3 1.3 3L9 10" fill="none" stroke="#fff" stroke-width="1.1"/><path d="M12 9h3M12 12h3M12 15h3" stroke="#3a6fd8" stroke-width="1"/>',
  txt: '<path d="M4 2h9l3 3v13H4z" fill="#fff" stroke="#3d2c2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 7h6M7 10h6M7 13h4" stroke="#8a8295" stroke-width="1.2" stroke-linecap="round"/>',
  folder: '<path d="M2 5h6l2 2h8v10H2z" fill="#ffd166" stroke="#3d2c2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 8h16" stroke="#e0a100" stroke-width="1.2"/>',
  globe: '<circle cx="10" cy="10" r="7.5" fill="#7cc4f2" stroke="#3d2c2e" stroke-width="1.4"/><path d="M5 6c2 1 3 3 2 5s1 3 2 4M12 3c-1 2 1 3 3 3M13 17c0-2 2-3 3-5" fill="none" stroke="#2f9e6a" stroke-width="1.6" stroke-linecap="round"/>',
  app: '<rect x="2.5" y="3.5" width="15" height="12" rx="1.5" fill="#fffaf0" stroke="#3d2c2e" stroke-width="1.4"/><path d="M2.5 6.5h15" stroke="#3d2c2e" stroke-width="1.2"/><rect x="2.5" y="3.5" width="15" height="3" fill="#cdb4db"/>',
};
const rdpKind = (name: string) =>
  /Papierkorb/.test(name) ? 'bin'
  : /xlsx|Excel/.test(name) ? 'sheet'
  : /docx/.test(name) ? 'doc'
  : /\.txt/.test(name) ? 'txt'
  : /Ordner/.test(name) ? 'folder'
  : /Internet/.test(name) ? 'globe'
  : 'app';
const rdpIcon = (name: string) => {
  const pic = h('span', { class: 'rdp-ipic', 'aria-hidden': 'true' });
  // Verknüpfungen bekommen den kleinen Pfeil unten links
  const arrow = /\.lnk/.test(name) ? '<rect x="1" y="12" width="7" height="7" rx="1" fill="#fff" stroke="#3d2c2e" stroke-width="1"/><path d="M3 17l3-3M4 14h2v2" fill="none" stroke="#3a6fd8" stroke-width="1.2"/>' : '';
  pic.innerHTML = `<svg viewBox="0 0 20 20">${RDP_ICON_SVG[rdpKind(name)]}${arrow}</svg>`;
  return h('span', { class: 'rdp-icon' }, [pic, h('span', { class: 'rdp-iname', text: name })]);
};

/** System, das gerade zu sehen ist (core/os.ts shownOs; createWork setzt den Spielstand): Browser- und Terminalname im Fenstertitel */
let shownOsDef = () => osOf(FALLBACK_OS);
/** erfundener Browsername für Fenstertitel („Seite – Browser“), je System */
const browserName = () => shownOsDef().browser;
/** Ticketsystem (Web-App), steht auch im Browser-Tab */
const TICKET_APP = BROWSER_TABS[0]!.title;
/** Menü links im Webinterface eines Geräts */
const WEB_MENU = ['Status', 'Netzwerk', 'WLAN', 'Sicherheit', 'System'];
/** Modellwahl oben im KI-Assistenten */
const AI_MODEL = 'Schnell & Selbstbewusst';
/** Server für Fernwartung bei Server-Tickets */
const SERVERS = ['SRV-FILE-02', 'SRV-DC-01', 'SRV-PRINT-01', 'SRV-MAIL-01', 'srv-legacy01'];
/** Desktop-Symbole auf einem Server (statt Excel und Passwörter.txt) */
const RDP_SERVER_ICONS = ['Serververwaltung.lnk', 'Ereignisanzeige.lnk', 'Backup (alt)', 'Neuer Ordner (3)'];

const avatar = (who: string, cls = '') => h('span', { class: `av ${cls}`.trim(), text: initials(who) || '?' });

const row = (label: string, value: string, cls = '') =>
  h('div', { class: `work-row ${cls}`.trim() }, [h('span', { class: 'work-key', text: label }), h('span', { class: 'work-val', text: value })]);

const PROGRAMS: Record<Kind, Program> = {
  mail: {
    weight: 3,
    title: () => fresh('MAIL_TITLES', MAIL_TITLES),
    // Verfassen wie in Outlook: großer „Senden“-Knopf vorn, darunter An/Cc/Betreff
    head: (t) => [
      h('div', { class: 'mail-tools' }, [
        h('span', { class: 'mail-tool mail-send', text: '✉︎ Senden' }),
        ...['📎︎ Anhängen', '! Wichtig'].map((x) => h('span', { class: 'mail-tool', text: x })),
      ]),
      h('div', { class: 'mail-fields' }, [row('An:', t.who), row('Cc:', '', 'mail-cc'), row('Betreff:', `Re: ${t.full}`)]),
    ],
    lines: (t) => [t.line.answer],
    extra: () => [h('div', { class: 'mail-sig', text: fresh('MAIL_SIGS', MAIL_SIGS) })],
    log: (t, x) => `mail[25]: Re: ${t.subject} → ${t.who}: „${x}“`,
    // Gesendet-Leiste statt Werkzeugleiste (gleicher Platz, nichts springt)
    ready: (t, head) => swap(head.querySelector('.mail-tools'), note(`✓ Gesendet an ${t.who}`)),
  },
  ticket: {
    weight: 3,
    // Web-App: läuft im Browser
    title: () => `${TICKET_APP} – ${browserName()}`,
    head: (t) => [
      browser(`ticketdesk.intern/ticket/${ticketId(t.no).replace('#', '')}`, true, 'ticket'),
      h('div', { class: 'tk-nav' }, [h('span', { class: 'tk-app', text: 'TicketDesk' }), h('span', { class: 'tk-queue', text: `Queue: ${randInt(400, 4_812)} offen` })]),
      h('div', { class: 'tk-card' }, [
        h('div', { class: 'tk-chips' }, [
          h('span', { class: 'tk-id', text: ticketId(t.no) }),
          h('span', { class: 'tk-status', text: fresh('TICKET_OPEN_STATES', TICKET_OPEN_STATES) }),
          h('span', { class: 'tk-prio', text: t.prio }),
        ]),
        h('div', { class: 'tk-who' }, [avatar(t.who, 'small'), h('span', { text: `${t.who} · vor ${randInt(2, 59)} Min.` })]),
        h('div', { class: 'tk-problem', text: t.full }),
      ]),
    ],
    label: 'Kommentar:',
    lines: (t) => [t.line.answer],
    extra: () => [h('div', { class: 'tk-actions' }, ['Antworten', 'Schließen', 'Eskalieren'].map((x, i) => h('span', { class: `tk-btn tk-btn-${i}`, text: x })))],
    log: (t, x) => `ticket[8080]: ${ticketId(t.no)} kommentiert: „${x}“`,
    ready: (_t, head, extra) => {
      const status = head.querySelector('.tk-status');
      if (status) {
        status.textContent = 'Gelöst';
        status.classList.add('done');
      }
      swap(extra.querySelector('.tk-actions'), note('✓ Kommentar gespeichert · Du · gerade eben'));
    },
  },
  term: {
    weight: 2,
    // SSH-Sitzung wie im System üblich (98 Telnet, XP PuTTY …)
    title: (t) => fill(shownOsDef().terminal, { host: t.host }),
    head: (t) => [h('div', { class: 'work-comment', text: `# ${t.who}: ${t.full}` })],
    lines: (t) => topicPool(t.line.topic, 'cmds'),
    log: (t, x) => `root@${t.host}:~$ ${x}`,
    ready: (_t, _head, extra) => extra.append(h('div', { class: 'term-out opt', text: fresh('TERM_OUT', TERM_OUT) }), h('div', { class: 'term-out term-next opt', text: (document.querySelector('.typed-prompt')?.textContent ?? '$ ').trimEnd() })),
  },
  chat: {
    weight: 2,
    title: () => 'Firmen-Chat',
    head: (t) => [
      // Kopfleiste der Chat-App mit Reitern (wie bei bekannten Firmen-Messengern)
      h('div', { class: 'chat-app' }, ['Aktivität', 'Chat', 'Teams', 'Anrufe'].map((x) => h('span', { class: `chat-app-tab${x === 'Chat' ? ' on' : ''}`, text: x }))),
      h('div', { class: 'chat-top' }, [
        avatar(t.who),
        h('span', { class: 'chat-name' }, [t.who, h('span', { class: 'chat-status', text: fresh('CHAT_STATES', CHAT_STATES) })]),
      ]),
      h('div', { class: 'chat-msg' }, [
        avatar(t.who, 'small'),
        h('span', { class: 'chat-bubble' }, [t.full, h('span', { class: 'chat-time', text: hhmm() })]),
      ]),
    ],
    lines: (t) => withPrefix(CHAT_LINES, t.line.answer, 0.2),
    log: (t, x) => `chat[443]: an ${t.who}: „${x}“`,
    // Nachricht steht als eigene Blase im Verlauf, das Eingabefeld darunter ist wieder leer
    ready: (_t, head, extra, reply) => {
      extra.append(h('div', { class: 'chat-input-empty opt', text: 'Nachricht schreiben …' }));
      return toHistory(head, h('span', { class: 'me-bubble' }, [reply, h('span', { class: 'me-ticks', text: '✓✓' })])) ?? undefined;
    },
  },
  call: {
    weight: 1,
    title: (t) => `Videocall – ${t.who} (3 Teilnehmer, 2 stumm)`,
    // Meeting-App: dunkle Bühne, wer spricht, hat den Ring; man selbst klein in der Ecke; unten die Knöpfe
    head: (t) => [
      h('div', { class: 'call-stage' }, [
        h('span', { class: 'call-time', text: `● ${String(randInt(0, 59)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}` }),
        h('span', { class: 'call-people', text: '👥︎ 3 · Raum 2.14 stumm' }),
        h('div', { class: 'call-speaker speaking' }, [
          h('span', { class: 'call-avatar', text: initials(t.who) || '?' }),
          h('span', { class: 'call-name', text: `🎙︎ ${t.who}` }),
        ]),
        h('div', { class: 'call-self' }, [h('span', { class: 'call-avatar small', text: 'Du' }), h('span', { class: 'call-name', text: 'Kamera aus' })]),
      ]),
    ],
    label: 'Live-Untertitel · Du:',
    extra: () => [
      h('div', { class: 'call-controls', 'aria-hidden': 'true' }, [
        ...['🎙︎', '📷︎', '⬆︎', '✋︎', '⋯'].map((x) => h('span', { class: 'call-btn', text: x })),
        h('span', { class: 'call-btn call-leave', text: '📞︎ Verlassen' }),
      ]),
    ],
    lines: (t) => withPrefix(CALL_LINES, t.line.answer, 0.3),
    log: (t, x) => `call[3478]: zu ${t.who}: „${x}“${Math.random() < 0.3 ? ' (Mikro war aus)' : ''}`,
    // jetzt spricht man selbst: Ring wandert in die eigene Kachel
    ready: (t, head) => {
      const speaker = head.querySelector('.call-speaker');
      const self = head.querySelector<HTMLElement>('.call-self');
      speaker?.classList.remove('speaking');
      if (self && self.offsetParent !== null) self.classList.add('speaking');
      // eigene Kachel im engen Fenster ausgeblendet: die große Kachel sagt, wer spricht
      else speaker?.querySelector('.call-name')?.replaceChildren(`🎙︎ Du · ${t.who} hört zu`);
    },
  },
  rdp: {
    weight: 1,
    title: (t) => `Remotedesktopverbindung – ${t.target}`,
    // Ziel ist ein Server: Desktop im klassischen Server-Look (grau, kantig); sonst ein normaler PC
    head: (t) => [
      h('div', { class: 'rdp-conn' }, [h('span', { class: 'rdp-pin', text: '📌︎' }), h('span', { text: `${t.target} (sehr langsam)` }), h('span', { class: 'rdp-win', text: '–  ▢  ×' })]),
      h('div', { class: `rdp-desk${t.server ? ' rdp-server' : ''}` }, [
        h('div', { class: 'rdp-icons' }, ['Papierkorb', ...shuffle(t.server ? RDP_SERVER_ICONS : RDP_ICONS).slice(0, 2)].map(rdpIcon)),
        h('div', { class: 'rdp-dialog' }, [
          h('div', { class: 'rdp-dtitle' }, [h('span', { text: 'Fehler' }), h('span', { text: '×' })]),
          h('div', { class: 'rdp-dbody' }, [
            h('span', { class: 'rdp-x', 'aria-hidden': 'true', text: '✕' }),
            h('span', { class: 'rdp-err', text: fresh('RDP_ERRORS', RDP_ERRORS) }),
            h('span', { class: 'rdp-ok', text: 'OK' }),
          ]),
        ]),
      ]),
    ],
    label: 'Öffnen:',
    extra: (t) => [
      h('div', { class: `rdp-taskbar${t.server ? ' rdp-server' : ''}` }, [
        h('span', { class: 'rdp-start', text: t.server ? 'Start' : 'start' }),
        h('span', { class: 'rdp-task', text: 'Ausführen' }),
        h('span', { class: 'rdp-task rdp-task-dim', text: 'Excel (alt) – Keine Rückmeldung' }),
        h('span', { class: 'rdp-tray', 'aria-hidden': 'true', text: '🔈︎ ⇅' }),
        h('span', { class: 'rdp-clock', text: hhmm() }),
      ]),
    ],
    lines: (t) => topicPool(t.line.topic, 'rdp'),
    log: (t, x) => `rdp[3389]: ${t.target}> ${x}`,
    // „Ausführen“ schließt sich, die Fehlermeldung ist weg
    ready: (_t, head) => swap(head.querySelector('.rdp-dialog'), note('✓ Ausgeführt. Kein Fehler. Diesmal.')),
  },
  web: {
    weight: 1,
    title: (t) => `${t.target} – Admin – ${browserName()}`,
    head: (t) => [
      browser(`192.168.1.${10 + (t.no % 200)}/admin`, false, 'web', undefined, { site: 'web', title: `${t.target} – Admin` }),
      // Gerätemenü links wie auf Router-Seiten, ein Punkt ist gerade offen
      h('nav', { class: 'web-nav' }, WEB_MENU.map((x, i) => h('span', { class: `web-nav-item${i === t.no % WEB_MENU.length ? ' on' : ''}`, text: x }))),
      h('div', { class: 'web-page' }, [
        h('div', { class: 'web-brand', text: `⚙ ${t.target} · Administration` }),
        h('div', { class: 'web-login', text: 'Angemeldet als: admin (Passwort: admin)' }),
      ]),
    ],
    label: 'Wert:',
    extra: () => [
      h('div', { class: 'web-actions' }, [h('span', { class: 'web-btn save', text: 'Speichern' }), h('span', { class: 'web-btn', text: 'Abbrechen' })]),
      h('div', { class: 'web-foot', text: fresh('WEB_FOOTERS', WEB_FOOTERS) }),
    ],
    lines: (t) => (Math.random() < 0.25 || !t.device ? WEB_GENERIC : DEVICE_SETTINGS[t.device]),
    log: (t, x) => `web[80]: ${t.target}: ${x} – gespeichert`,
    ready: (_t, _head, extra) => {
      extra.querySelector('.web-btn.save')?.classList.add('pressed');
      swap(extra.querySelector('.web-foot'), note('✓ Einstellungen gespeichert'));
    },
  },
  // KI-Assistent: Problem stumpf in einen Prompt kippen, die KI antwortet sehr selbstbewusst
  ai: {
    weight: 1,
    // Web-App: läuft im Browser
    title: (t) => `${t.app} – ${browserName()}`,
    head: (t) => [browser('chatki.example', true, 'ai', t.app), h('div', { class: 'ai-model', text: `Modell: ${AI_MODEL} ▾` }), aiRow(fresh('AI_GREETINGS', AI_GREETINGS))],
    // ganzer Betreff, wenn er nicht zu lang ist; nach „…?“ kein zusätzlicher Punkt
    lines: (t) =>
      AI_PROMPTS.map((p) => fill(p, { subject: t.full.length <= 80 ? t.full : t.subject, who: t.who }).replace(/([.!?…])“\./g, '$1“')),
    extra: () => [h('div', { class: 'ai-foot', text: fresh('AI_FOOTERS', AI_FOOTERS) })],
    log: (t, x) => `ai[{pid}]: Prompt zu ${ticketId(t.no)}: „${x}“`,
    // Antwort kommt als neue Blase unter dem Prompt: selbstbewusst, mit der echten Ursache des Tickets
    ready: (t, head, extra, reply) => {
      const answer = fill(fresh('AI_REPLIES', AI_REPLIES), { cause: t.line.cause });
      const undo = toHistory(head, h('span', { class: 'me-bubble', text: reply }), [aiRow(answer, true)]);
      // eng: wie früher, die Antwort steht an Stelle der Begrüßung
      const inPlace = () => head.replaceChildren(aiRow(answer, true));
      if (!undo) return inPlace();
      // ist es zu eng, weicht erst das leere Eingabefeld, dann die Begrüßung
      head.firstElementChild?.classList.add('opt');
      extra.prepend(h('div', { class: 'chat-input-empty ai-input opt', text: 'Noch eine Frage? Ich hab Zeit. Und Strom.' }));
      return () => {
        undo();
        inPlace();
      };
    },
  },
  search: {
    weight: 2,
    title: () => `Sucher – Websuche – ${browserName()}`,
    head: () => [
      browser('www.sucher.example', true, 'search'),
      h('div', { class: 'search-logo' }, [...'Sucher'].map((c, i) => h('span', { class: `sl${i % 4}`, text: c }))),
    ],
    extra: () => [
      h(
        'div',
        { class: 'search-hits' },
        shuffle(SEARCH_RESULTS).slice(0, 3).map((r) =>
          h('div', { class: 'search-hit' }, [h('span', { class: 'hit-url', text: pick(['forum.example', 'stackoverflow.example', 'support.example', 'video.example']) }), h('span', { class: 'hit-text', text: r })]),
        ),
      ),
    ],
    lines: (t) => topicPool(t.line.topic, 'searches'),
    log: (_t, x) => `browser[42]: gesucht: „${x}“ – ${fresh('SEARCH_RESULTS', SEARCH_RESULTS)}`,
    ready: (_t, _head, extra) => {
      extra.querySelector('.search-hits')?.prepend(h('div', { class: 'search-count', text: `Ungefähr ${randInt(2, 900).toLocaleString('de-DE')}.000 Ergebnisse (0,${randInt(10, 99)} Sekunden)` }));
      // angeklickter Treffer (keine Anzeige): wird lila wie besucht
      [...extra.querySelectorAll('.search-hit')].find((x) => !x.textContent?.includes('Anzeige'))?.classList.add('picked');
    },
  },
};

/**
 * Arbeitsfenster auf dem Desktop: wechselt zwischen Mail, Ticketsystem, Shell, Chat, Videocall,
 * Fernwartung, Webinterface und Websuche. Jeder Anschlag tippt die Antwort weiter, fertig = gelöst.
 * Wer eine Weile nichts tippt, scrollt heimlich durch Memes.
 */
export function createWork(
  ctx: AppContext,
  currentCall: () => Call | null,
  /** gelöst: Serie und Stempel (für Bonus und Effekte am Schreibtisch) */
  onSolved: (streak: number, stamp: HTMLElement, presses: number) => void,
) {
  shownOsDef = () => osOf(shownOs(ctx.state));
  let task: Task = { kind: 'ticket', who: '', subject: '', full: '', no: 0, line: QUEUE_LINE, call: null, device: null, target: '', prio: 'mittel', app: '', server: false, host: '' };
  let reply = '';
  let typedLen = 0;
  /** Arbeit am aktuellen Ticket und Anschläge dafür */
  let progress = 0;
  let presses = 0;
  let memes = false;
  /** Antwort fertig: Fenster bleibt kurz mit „Gelöst!“ stehen, dann kommt das nächste */
  let sentTimer = 0;
  /** Antwort ist abgeschickt und steht da; der nächste Anschlag löst und holt das nächste Ticket */
  let ready = false;
  /** abgeschickt mit Verlauf: wie er sich zurücknehmen lässt, falls das Fenster später kleiner wird */
  let readyFallback: (() => void) | undefined;
  /** „Abgeschickt“-Ansicht fürs aktuelle Ticket schon gezeichnet */
  let readyDrawn = false;
  /**
   * Zeichnen: die Spiellogik ändert nur Zustand und ruft invalidate(), draw() bringt das Fenster auf Stand.
   * Innerhalb von batch() (jeder Anschlag, Espresso: alle Anschläge eines Bilds) einmal am Ende,
   * sonst baut das Handy unter Espresso bis zu 40 Ticketfenster pro Sekunde, von denen man keins sieht.
   */
  let batchDepth = 0;
  let dirty = false;
  /** Ticket, das gerade im Fenster steht; ein anderes wird neu aufgebaut */
  let drawnTask: Task | null = null;
  /** Fenster neu ausmessen (nach den Memes) */
  let fitPending = false;
  /** Stempel soll neu aufspringen: 'big' mit Serien-Spruch */
  let stampPending: '' | 'show' | 'big' = '';
  /** Nachmessen im nächsten Bild: höchstens eins vormerken */
  let settleFrame = 0;
  /** gelöste Tickets in Folge; reißt nach SOLVE.breakMs ohne Anschlag */
  let streak = 0;
  /** eine Zeile: passt der Text nicht, wird die Schrift kleiner statt abgeschnitten */
  const setStatus = (text: string) => {
    setText(last, text);
    last.style.fontSize = '';
    // nur etwas kleiner, dann lieber „…“ am Ende als Ameisenschrift
    for (let size = 11; size > 10 && last.scrollWidth > last.clientWidth + 1; size -= 0.5) last.style.fontSize = `${size - 0.5}px`;
  };
  const vars = () => ({ who: task.who, target: task.target });
  /** Anruf, dessen Antwort abgeschickt ist */
  let answered: Call | null = null;
  /** zuletzt bearbeitete Anliegen (Anrufe und Warteschlange), damit sich Betreffe nicht gleich wiederholen */
  const recent: string[] = [];
  const remember = (text: string) => {
    recent.push(text);
    if (recent.length > 20) recent.shift();
  };
  /** Ticket aus der Warteschlange: jemand anderes als der aktuelle Anrufer, nichts gerade Bearbeitetes */
  const queued = (current: Call) => {
    const others = availableCallers(ctx.state).filter((c) => !current.who.startsWith(c.who));
    const taken = (l: Line) => recent.includes(l.text) || l.text === current.text || l.text === current.about;
    // gleicher Stapel wie am Telefon (desk.ts): was jemand schon gesagt hat, kommt auch hier erst in der nächsten Runde
    const next = () => {
      const c = pick(others);
      return { c, line: fresh(`call:${c.who}`, c.lines, { key: (l) => l.text }) };
    };
    let { c, line } = next();
    for (let i = 0; i < 8 && taken(line); i++) ({ c, line } = next());
    return { who: c.who, line };
  };

  const title = h('span', { class: 'work-title' });
  const head = h('div', { class: 'work-head' });
  const label = h('span', { class: 'work-label' });
  const promptSlot = h('span', { class: 'typed-prompt', text: '$ ' });
  const typedEl = h('span', { class: 'typed' });
  /** Rest der Antwort, unsichtbar: der Text steht von Anfang an fest, nichts bricht beim Tippen neu um */
  const restEl = h('span', { class: 'typed-rest', 'aria-hidden': 'true' });
  const cursorEl = h('span', { class: 'cursor', 'aria-hidden': 'true' });
  const body = h('div', { class: 'work-body' }, [label, promptSlot, typedEl, cursorEl, restEl]);
  const extra = h('div', { class: 'work-extra' });
  const last = h('div', { class: 'last-closed', 'aria-live': 'polite' });
  // Memes: Browser mit Tabs, wechselt zwischen Forum (hell) und Bilderseite (dunkel); Parodien, keine echten Logos
  const forumFeed = h('div', { class: 'meme-feed meme-feed-forum' });
  const gagFeed = h('div', { class: 'meme-feed meme-feed-gag' });
  // derselbe Browser wie bei den Web-Werkzeugen: alle Tabs offen, readit oder 404GAG aktiv
  const memeTabs = browserTabs('forum');
  const memeAddr = h('span', { class: 'br-addr' });
  // Kopfleiste der Seite wie beim Vorbild: readit mit orangem Schriftzug, Suche, Anmelden; 404GAG mit Rubriken und blauem „Post“
  const memeSiteHead = h('div', { class: 'meme-site' }, [
    h('div', { class: 'ms-forum' }, [h('b', { class: 'ms-logo', text: 'readit' }), h('span', { class: 'ms-search', text: '⌕ Suchen' }), h('span', { class: 'ms-login', text: 'Anmelden' })]),
    h('div', { class: 'ms-gag' }, [h('b', { class: 'ms-logo', text: '404GAG' }), h('span', { class: 'ms-tab', text: '⤮ Shuffle' }), h('span', { class: 'ms-tab', text: 'Memeland' }), h('span', { class: 'ms-fill' }), h('span', { class: 'ms-search', text: '⌕' }), h('span', { class: 'ms-login', text: '✎ Post' })]),
  ]);
  // Desktop-Ansicht: links Navigation, in der Mitte der schmalere Feed, rechts (wenn Platz) Infokasten
  const sideItems = (items: string[], on: number) => items.map((x, i) => h('span', { class: `side-item${i === on ? ' on' : ''}`, text: x }));
  const memeSideLeft = h('div', { class: 'meme-side meme-side-left' }, [
    h('div', { class: 'side-forum' }, [
      ...sideItems(['⌂︎ Startseite', '↗︎ Beliebt', '◎︎ Alle'], 2),
      h('span', { class: 'side-head', text: 'Communitys' }),
      ...sideItems(['r/sysadmin', 'r/homelab', 'r/devops'], -1),
    ]),
    h('div', { class: 'side-gag' }, [
      ...sideItems(['⌂︎ Home', '▮︎ Top', '↗︎ Trending', '◷︎ Fresh'], 2),
      h('span', { class: 'side-head', text: 'Interests' }),
      ...sideItems(['Humor', 'Memes', 'Old Meme', 'Coding'], -1),
    ]),
  ]);
  const memeSideRight = h('div', { class: 'meme-side meme-side-right' }, [
    h('div', { class: 'side-forum' }, [h('b', { text: 'r/all' }), h('span', { text: 'Die beliebtesten Beiträge aus allen Communitys.' }), h('span', { class: 'side-btn', text: 'Beitreten' })]),
    h('div', { class: 'side-gag' }, [h('b', { text: 'New to 404GAG?' }), h('span', { text: 'Sign up now to see more content!' }), h('span', { class: 'side-btn', text: 'Sign up' })]),
  ]);
  const memeScroll = h('div', { class: 'meme-scroll' }, [forumFeed, gagFeed]);
  const memePage = h('div', { class: 'meme-page' }, [memeSideLeft, memeScroll, memeSideRight]);
  const memeWindow = h('div', { class: 'meme-window', 'aria-hidden': 'true' }, [
    h('div', { class: 'browser meme-browser' }, [
      h('div', { class: 'br-tabs' }, [...memeTabs, h('span', { class: 'br-new', text: '+' })]),
      browserTools(),
      h('div', { class: 'br-bar' }, [
        h('span', { class: 'br-nav', text: '‹ › ↻' }),
        h('span', { class: 'br-url' }, [h('span', { class: 'br-lock', text: '🔒︎' }), memeAddr]),
      ]),
    ]),
    memeSiteHead,
    memePage,
  ]);
  let scrollRaf = 0;
  let scrollWait = 0;
  /** Fenstertitel der aktuellen Aufgabe: einmal gewürfelt, bleibt auch nach der Meme-Pause */
  let taskTitle = '';
  // eigenes Element statt ::after: blendet über dem nächsten Ticket weiter aus
  const stamp = h('div', { class: 'solved-stamp', 'aria-hidden': 'true' });
  const stampText = h('span', { class: 'ss-text' });
  const stampStreak = h('span', { class: 'ss-streak' });
  const stampLine = h('span', { class: 'ss-line' });
  stamp.append(stampText, stampStreak, stampLine);
  const el = h('div', { class: 'work' }, [
    // Titelleiste wie bei XP: Programmsymbol (Farbe je Programm), Titel, rechts _ □ × (nur Deko)
    h('div', { class: 'work-bar' }, [
      h('span', { class: 'term-dots', 'aria-hidden': 'true' }),
      title,
      h('span', { class: 'win-btns', 'aria-hidden': 'true' }, [h('span', { text: '–' }), h('span', { text: '□' }), h('span', { class: 'win-x', text: '×' })]),
    ]),
    head,
    body,
    extra,
    memeWindow,
    stamp,
  ]);

  /** Antwort passt trotz Anpassung nicht ganz: beim Tippen zum Cursor scrollen */
  let scrolls = false;
  /** Passt nicht: Fenster läuft über oder die Antwort im Feld (außer sie wird ohnehin mitgescrollt) */
  const overflows = (ignoreBodyWhenScrolling = false) =>
    el.scrollHeight > el.clientHeight + 1 || (!(ignoreBodyWhenScrolling && scrolls) && body.scrollHeight > body.clientHeight + 1);
  /** Ganze Antwort muss ins Feld passen (lesen vor dem letzten Anschlag): sonst Schrift etwas kleiner */
  const fitBody = () => {
    // während der Memes ist das Fenster versteckt: messen erst beim Zurückkommen
    if (memes) return showTyped();
    // abgeschickt (Größe ändert sich, z. B. Handy gedreht): Ergebnis bleibt stehen, nur enger machen;
    // reicht „eng“ nicht, zuerst den Verlauf zurücknehmen (sonst blendet „enger“ die Nachricht davor aus).
    // Zählt, was im Fenster steht: abgeschickt, aber noch nicht gezeichnet, wird wie ein frisches Ticket gemessen.
    if (readyDrawn) {
      const over = () => overflows(true);
      el.classList.remove('tight', 'tighter');
      body.style.fontSize = '';
      if (over()) el.classList.add('tight');
      if (over() && readyFallback) {
        readyFallback();
        readyFallback = undefined;
      }
      if (over()) el.classList.add('tighter');
      if (over()) {
        const base = parseFloat(getComputedStyle(body).fontSize);
        for (let size = base - 0.5; size >= 9.5 && over(); size -= 0.5) body.style.fontSize = `${size}px`;
      }
      return showTyped();
    }
    const over = () => overflows();
    el.classList.remove('tight', 'tighter');
    body.style.fontSize = '';
    // eng (niedrige Displays): erst Deko im Fenster weglassen, dann Kopfzeilen, zuletzt kleinere Schrift
    if (over()) el.classList.add('tight');
    if (over()) el.classList.add('tighter');
    if (over()) {
      const base = parseFloat(getComputedStyle(body).fontSize);
      for (let size = base - 0.5; size >= 9.5 && over(); size -= 0.5) body.style.fontSize = `${size}px`;
    }
    // Länge steht fest (Rest unsichtbar): nur wenn es trotzdem nicht passt, muss beim Tippen mitgescrollt werden
    scrolls = body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
    showTyped();
  };
  const showTyped = () => {
    // Füllstand der Statuszeile = Arbeit am Ticket
    last.style.setProperty('--p', Math.min(1, progress / ticketWork(ctx.state)).toFixed(3));
    setText(typedEl, reply.slice(0, typedLen));
    setText(restEl, reply.slice(typedLen));
    body.classList.toggle('empty', typedLen === 0);
    if (!scrolls) return;
    // wie ein echtes Eingabefeld: nur weiterscrollen, wenn der Cursor sonst rausläuft (neue Zeile bzw. Feldende)
    const b = body.getBoundingClientRect();
    const c = cursorEl.getBoundingClientRect();
    if (c.bottom > b.bottom) body.scrollTop += c.bottom - b.bottom + 2;
    else if (c.top < b.top) body.scrollTop -= b.top - c.top;
    if (c.right > b.right - 8) body.scrollLeft += c.right - b.right + 40;
  };

  /** Nächste Aufgabe: anderes Programm; erst der aktuelle Anrufer, dann Tickets aus der Warteschlange */
  const newTask = () => {
    // neues Ticket (z. B. erstes nach dem Login): Memes sind vorbei; gezeichnet wird unten einmal fürs neue Ticket
    if (memes) endMemes();
    clearTimeout(sentTimer);
    sentTimer = 0;
    const call = currentCall();
    // Erst bekommt der Anrufer seine Antwort (zählt erst beim Abschicken), danach geht es mit der Warteschlange weiter
    const q = call && call === answered ? queued(call) : null;
    // vor dem ersten Anruf: der Chef wundert sich über die volle Warteschlange
    const who = q?.who ?? call?.who.replace(/ \(Rückruf\)$/, '') ?? 'Chef';
    const line = q?.line ?? call ?? QUEUE_LINE;
    // Rückruf: Betreff bleibt das ursprüngliche Anliegen
    const text = q ? line.text : (call?.about ?? line.text);
    // Fragen werden beantwortet, Probleme auch mit passendem Werkzeug gelöst
    const kinds = line.fix ? [...TALK, ...techFor(line)] : TALK;
    const choices = kinds.length > 1 ? kinds.filter((k) => k !== task.kind) : kinds;
    const kind = weightedPick(choices, (k) => PROGRAMS[k].weight);
    const device = kind === 'web' ? pick(devicesFor(line)) : null;
    const server = kind === 'rdp' && line.topic === 'server';
    task = {
      kind,
      who,
      subject: text.length > 42 ? `${text.slice(0, 40)}…` : text,
      full: text,
      no: nextTicketNo(ctx.state.clicks),
      line,
      call: q ? null : call,
      device,
      // Server-Tickets mit Fernwartung: auf einen Server, sonst auf den PC des Anrufers
      target: device ?? (server ? pick(SERVERS) : pcOf(who)),
      prio: BOSSES.includes(who) && Math.random() < 0.7 ? 'CHEF' : fresh('TICKET_PRIOS', TICKET_PRIOS),
      app: kind === 'ai' ? fresh('AI_TITLES', AI_TITLES) : '',
      host: companyOf(ctx.state.prestige.company).host,
      server,
    };
    const prog = PROGRAMS[kind];
    reply = fresh(`reply:${kind}`, prog.lines(task));
    typedLen = 0;
    progress = 0;
    presses = 0;
    ready = false;
    taskTitle = prog.title(task);
    invalidate();
  };
  /** Aktuelles Ticket ins Fenster: Programm, Kopf, Statuszeile, Platz ausmessen */
  const renderTask = () => {
    drawnTask = task;
    readyFallback = undefined;
    const prog = PROGRAMS[task.kind];
    body.scrollTop = 0;
    body.scrollLeft = 0;
    if (!memes) {
      el.dataset.kind = task.kind;
      setText(title, taskTitle);
    }
    head.replaceChildren(...prog.head(task));
    extra.replaceChildren(...(prog.extra?.(task) ?? []));
    setText(label, prog.label ?? '');
    el.classList.remove('sent', 'ready', 'moved');
    readyDrawn = false;
    // Statuszeile: Ticketnummer und Betreff, Füllstand zeigt den Fortschritt der Antwort
    setStatus(`${ticketId(task.no)} · ${task.full}`);
    fitBody();
    // Layout setzt sich manchmal erst im nächsten Frame (Sprechblase, Statuszeile): dann nochmal messen
    const no = task.no;
    cancelAnimationFrame(settleFrame);
    settleFrame = requestAnimationFrame(() => {
      if (task.no === no && !memes && !scrolls && overflows()) fitBody();
    });
  };
  /** Fenster auf den Stand der Spiellogik bringen: Ticket, Text, „Abgeschickt“, Stempel */
  const draw = () => {
    dirty = false;
    // neues Ticket: aufbauen und ausmessen (zeigt dabei auch den Text)
    if (drawnTask !== task) renderTask();
    else if (fitPending) fitBody();
    else showTyped();
    fitPending = false;
    if (ready && !readyDrawn) drawReady();
    if (sentTimer) el.classList.add('sent');
    if (stampPending) {
      stamp.classList.remove('show', 'big');
      void stamp.offsetWidth; // Animation neu starten
      stamp.classList.add('show');
      if (stampPending === 'big') stamp.classList.add('big');
      stampPending = '';
    }
  };
  const invalidate = () => {
    if (batchDepth) dirty = true;
    else draw();
  };

  /** Erfolg! Stempel springt auf, ab dem zweiten Ticket in Folge mit Zähler und höherem Ton */
  const setStreak = (n: number) => {
    streak = n;
    last.dataset.streak = n >= 2 ? `×${n}` : '';
  };
  /** großer Stempel mit Serien-Spruch: so lange läuft seine Animation (.solved-stamp.big), so lange bleibt er stehen */
  const STAMP_BIG_MS = 1_400;
  /** frühester Zeitpunkt für den nächsten Stempel mit Ton (nur unter Espresso gedrosselt) */
  let nextCelebrate = -Infinity;
  const celebrate = () => {
    setStreak(streak + 1);
    const lines = STREAK_LINES[streak];
    const line = lines ? fresh(`STREAK_LINES:${streak}`, lines) : '';
    setText(stampStreak, streak >= 2 ? `×${streak}` : '');
    const now = performance.now();
    // Espresso löst schneller, als man feiern kann: dann nur der Zähler, solange der letzte Stempel noch steht.
    // Serien-Sprüche kommen immer und bleiben stehen, bis man sie lesen konnte.
    if (line || !espressoActive(ctx.state) || now >= nextCelebrate) {
      nextCelebrate = now + (line ? STAMP_BIG_MS : CONFIG.espresso.celebrateGapMs);
      setText(stampText, `✓ ${task.line.fix ? fresh('FIX_STAMPS', FIX_STAMPS) : fresh('STAMPS', STAMPS)}`);
      setText(stampLine, line);
      stampPending = line ? 'big' : 'show';
      invalidate();
      // Espresso gehalten: die Melodie spielt, der Lös-Ton alle 120 ms läge sonst als Tonleiter darunter
      // (Serien-Sprüche bleiben hörbar, die kommen selten)
      if (line || !ctx.sfx.melodyPlaying) ctx.sfx.solved(streak);
      ctx.haptic('tap');
    }
    onSolved(streak, stamp, presses);
  };

  /** Abgeschickt: wie im echten Programm, Cursor weg; gelöst wird erst beim nächsten Anschlag */
  const showReady = () => {
    if (ready) return;
    ready = true;
    invalidate();
  };
  const drawReady = () => {
    readyDrawn = true;
    el.classList.add('ready');
    const fallback = PROGRAMS[task.kind].ready?.(task, head, extra, reply);
    readyFallback = fallback || undefined;
    // kein neues Ausmessen (sonst springt das Fenster): was nicht mehr passt, fällt weg (von unten nach oben)
    const dropOptional = () => {
      const dropped: [Element, Node, Node | null][] = [];
      for (const o of [...el.querySelectorAll('.opt')].reverse()) {
        if (!overflows(true) || !o.parentNode) continue;
        dropped.push([o, o.parentNode, o.nextSibling]);
        o.remove();
      }
      return dropped;
    };
    const dropped = dropOptional();
    if (fallback && overflows(true)) {
      // Verlauf passt trotzdem nicht: Nachricht bleibt wie früher im Eingabefeld; Weggefallenes bekommt eine neue Chance
      for (const [o, parent, next] of dropped.reverse()) parent.insertBefore(o, next?.parentNode === parent ? next : null);
      fallback();
      readyFallback = undefined;
      dropOptional();
    }
  };

  /** Gelöst: Stempel, Karte in den Ticketverlauf. Stand die Antwort schon abgeschickt da, kommt sofort das nächste. */
  const send = () => {
    typedLen = reply.length;
    const wasReady = ready;
    if (task.call) answered = task.call;
    remember(task.full);
    ctx.log.write('ok', PROGRAMS[task.kind].log(task, reply));
    ctx.history.add({
      id: ticketId(task.no),
      subject: task.full,
      who: task.who,
      channel: fill(CHANNELS[task.kind], vars()),
      prio: task.prio,
      status: fresh('TICKET_STATES', TICKET_STATES),
      reply,
      replyLabel: REPLY_LABELS[task.kind],
      cause: task.line.cause,
      // Fragen: Notiz zum Gespräch; Probleme: Notiz zur Reparatur
      note: fill(task.line.fix ? fresh(`notes:${task.line.topic}`, topicPool(task.line.topic, 'notes')) : fresh('TALK_NOTES', TALK_NOTES), vars()),
      solution: fill(fresh(`DONE_LINES:${task.kind}`, DONE_LINES[task.kind]), vars()),
    });
    celebrate();
    if (wasReady) {
      newTask();
      return;
    }
    // mit einem Anschlag gelöst: das Abgeschickte kurz zeigen, der nächste Anschlag wartet nicht darauf
    sentTimer = window.setTimeout(() => {
      sentTimer = 0;
      newTask();
    }, SENT_HOLD_MS);
    showReady();
  };

  // --- Memes beim Nichtstun ---
  type Site = 'forum' | 'gag';
  /**
   * Jede Seite ist ein eigener, endloser Feed: unten kommen beim Scrollen neue Beiträge dazu (oben fallen alte weg),
   * und beim Tab-Wechsel bleibt die Stelle stehen. So kommt beim Zurückwechseln nichts doppelt.
   * Beide Seiten ziehen aus einem gemeinsamen Stapel: kein Meme auf readit und gleich danach auf 404GAG.
   */
  const feeds: Record<Site, { el: HTMLElement; top: number }> = { forum: { el: forumFeed, top: 0 }, gag: { el: gagFeed, top: 0 } };
  const memeKey = (p: MemePost) => p.title;
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} Tsd.` : String(n));
  const kEn = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
  // readit: Unterforum mit rundem Bild, Zeit, Titel, Flair, Bild oder Text, graue Knöpfe
  const forumCard = (p: MemePost) =>
    h('div', { class: `meme meme-forum meme-${p.t}`, 'data-key': p.title }, [
      h('div', { class: 'meme-head' }, [h('span', { class: 'meme-src', text: p.sub ?? fresh('MEME_SUBS', MEME_SUBS) }), h('span', { class: 'meme-meta', text: `• vor ${randInt(1, 23)} Std.` })]),
      h('div', { class: 'meme-title', text: p.title }),
      ...(p.t === 'text'
        ? [...(p.flair ? [h('span', { class: 'meme-flair', text: p.flair })] : []), h('div', { class: 'meme-body', text: p.body })]
        : [h('div', { class: 'meme-img' }, [memeImage(p)])]),
      h('div', { class: 'meme-foot' }, [
        h('span', { class: 'meme-pill' }, [h('b', { class: 'up', text: '⇧' }), ` ${k(randInt(120, 48_000))} `, h('b', { class: 'down', text: '⇩' })]),
        h('span', { class: 'meme-pill', text: `💬︎ ${k(randInt(12, 2_400))}` }),
        h('span', { class: 'meme-pill', text: '↗︎ Teilen' }),
      ]),
    ]);
  // 404GAG: Rubrik mit Symbol, Zeit, großer Titel, Bild über die volle Breite, Tags, Knöpfe mit Rahmen
  const gagCard = (p: ImagePost) =>
    h('div', { class: `meme meme-gag meme-${p.t}`, 'data-key': p.title }, [
      h('div', { class: 'meme-head' }, [h('span', { class: 'meme-src', text: GAG_SECTION[p.t] }), h('span', { class: 'meme-meta', text: `· ${randInt(1, 23)}h` })]),
      h('div', { class: 'meme-title', text: p.title }),
      h('div', { class: 'meme-img' }, [memeImage(p)]),
      h('div', { class: 'meme-tags' }, [fresh('GAG_TAGS', GAG_TAGS), fresh('GAG_TAGS', GAG_TAGS)].map((t) => h('span', { text: t }))),
      h('div', { class: 'meme-foot' }, [
        h('span', { class: 'meme-pill' }, [h('b', { class: 'up', text: '⬆︎' }), ` ${kEn(randInt(120, 48_000))}`]),
        h('span', { class: 'meme-pill' }, [h('b', { class: 'down', text: '⬇︎' })]),
        h('span', { class: 'meme-pill', text: `💬︎ ${kEn(randInt(12, 2_400))}` }),
        h('span', { class: 'meme-pill meme-share', text: '↗︎ Share' }),
      ]),
    ]);
  /** Ein paar neue Beiträge unten anhängen; nichts, was gerade auf einer der beiden Seiten steht */
  const addPosts = (site: Site, n: number) => {
    const shown = new Set([...forumFeed.children, ...gagFeed.children].map((c) => (c as HTMLElement).dataset.key));
    const items: readonly MemePost[] = site === 'forum' ? MEME_POSTS : IMAGE_POSTS;
    for (let i = 0; i < n; i++) {
      let p = fresh('memes', items, { key: memeKey });
      for (let tries = 0; shown.has(p.title) && tries < 20; tries++) p = fresh('memes', items, { key: memeKey });
      if (shown.has(p.title)) p = items.find((x) => !shown.has(x.title)) ?? p;
      shown.add(p.title);
      feeds[site].el.append(site === 'forum' ? forumCard(p) : gagCard(p as ImagePost));
    }
  };
  const fillFeed = () => {
    for (const site of ['forum', 'gag'] as const) {
      feeds[site].el.replaceChildren();
      feeds[site].top = 0;
      addPosts(site, MEMES_PER_SITE);
    }
  };
  const currentSite = (): Site => (memeWindow.dataset.site === 'gag' ? 'gag' : 'forum');
  /** Aktiver Tab: Forum oder Bilderseite; beim Wechsel steht die andere Seite noch da, wo man aufgehört hat */
  const showSite = (site: Site) => {
    const old = memeWindow.dataset.site as Site | undefined;
    if (old && old !== site) feeds[old].top = memeScroll.scrollTop;
    memeWindow.dataset.site = site;
    memeScroll.scrollTop = feeds[site].top;
    for (const t of memeTabs) t.classList.toggle('on', t.dataset.site === site);
    memeAddr.replaceChildren(...addrParts(site === 'forum' ? 'readit.example/r/all/hot' : '404gag.example/hot'));
    // Fenstertitel wie bei XP: Seite – Browser
    if (memes) setText(title, `${BROWSER_TABS.find((x) => x.site === site)!.title} – ${browserName()}`);
  };
  /** Wann zum anderen Tab gewechselt wird (nur zwischen zwei Wischern, nie mitten im Lesen) */
  let switchAt = 0;
  const planSwitch = () => {
    switchAt = performance.now() + randInt(25_000, 45_000);
  };
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /** Lesezeit nach Textmenge: Bildtexte, Titel, Code – kurze Memes kurz, lange länger */
  const readMs = (card: HTMLElement | undefined, share: number) => {
    const chars = (card?.querySelector('.meme-title')?.textContent?.length ?? 0) + (card?.querySelector('.meme-img, .meme-body')?.textContent?.length ?? 0) * share;
    return Math.min(12_000, Math.max(3_500, 2_200 + chars * 45)) + randInt(0, 1_500);
  };
  /**
   * Scrollen wie mit dem Daumen: einen Beitrag lesen, zum nächsten wischen (bremst ab).
   * Jeder Halt zeigt den Beitrag von oben (lieber ein Stück vom vorigen mit als oben abgeschnitten);
   * hohe Beiträge werden in Etappen gelesen, bis ihr Ende zu sehen ist.
   */
  const startScrolling = () => {
    stopScrolling();
    // Lesepausen per Timer, Animation nur während des Wischens (spart Akku beim Herumliegen)
    const read = (ms: number) => {
      scrollWait = window.setTimeout(flick, ms);
    };
    const flick = () => {
      if (!memes) return;
      if (!reducedMotion() && performance.now() >= switchAt) {
        showSite(currentSite() === 'forum' ? 'gag' : 'forum');
        planSwitch();
        // die andere Seite steht noch beim zuletzt gelesenen Beitrag: kurz orientieren, dann weiter
        return read(randInt(1_500, 2_500));
      }
      const site = currentSite();
      const feed = feeds[site].el;
      const view = memeScroll.clientHeight;
      let cards = [...feed.children] as HTMLElement[];
      // unten nachladen, oben Gelesenes wegnehmen (Stelle bleibt dabei optisch gleich)
      const from0 = memeScroll.scrollTop;
      if (cards.filter((c) => c.offsetTop > from0 + view).length < 3) addPosts(site, 4);
      const above = cards.filter((c) => c.offsetTop + c.offsetHeight < from0 - 20);
      if (above.length > 6) {
        const gone = above.slice(0, above.length - 4);
        const shift = gone.at(-1)!.offsetTop + gone.at(-1)!.offsetHeight - gone[0]!.offsetTop;
        for (const c of gone) c.remove();
        memeScroll.scrollTop = from0 - shift;
      }
      cards = [...feed.children] as HTMLElement[];
      const from = memeScroll.scrollTop;
      // Beitrag, der gerade oben steht, und ob sein Ende schon zu sehen ist
      const cur = cards.filter((c) => c.offsetTop <= from + 12).at(-1);
      const curEnd = cur ? cur.offsetTop + cur.offsetHeight : 0;
      const step = Math.max(120, Math.round(view * 0.75));
      let to: number;
      let next: HTMLElement | undefined;
      let share = 1;
      if (cur && curEnd > from + view + 4) {
        // Ende noch nicht zu sehen: ein Stück weiter, höchstens bis das Ende unten steht
        to = Math.min(from + step, curEnd - view + 6);
        next = cur;
        share = Math.min(1, view / cur.offsetHeight);
      } else {
        next = cards.find((c) => c.offsetTop > from + 12);
        // nicht pixelgenau, aber nie über den Anfang hinaus
        to = next ? next.offsetTop - 6 - (Math.random() < 0.3 ? randInt(0, 24) : 0) : from + step;
        if (next && next.offsetHeight > view) share = view / next.offsetHeight;
      }
      to = Math.max(0, to);
      const pause = readMs(next, share);
      if (reducedMotion()) {
        memeScroll.scrollTop = to;
        return read(Math.max(pause, 8_000));
      }
      const dur = Math.min(1_100, 380 + Math.abs(to - from) * 1.6);
      const start = performance.now();
      const frame = (now: number) => {
        if (!memes) return;
        const t = Math.min(1, (now - start) / dur);
        memeScroll.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
        if (t < 1) scrollRaf = requestAnimationFrame(frame);
        else read(pause);
      };
      scrollRaf = requestAnimationFrame(frame);
    };
    // erster Beitrag: erst mal lesen
    read(readMs(feeds[currentSite()].el.firstElementChild as HTMLElement | undefined, 1));
  };
  const stopScrolling = () => {
    clearTimeout(scrollWait);
    cancelAnimationFrame(scrollRaf);
  };

  const enterMemes = () => {
    memes = true;
    fillFeed();
    el.dataset.kind = 'memes';
    delete memeWindow.dataset.site;
    showSite(Math.random() < 0.5 ? 'forum' : 'gag');
    planSwitch();
    startScrolling();
    ctx.log.write('info', fresh('MEME_ENTER_LINES', MEME_ENTER_LINES));
  };
  /** Memes beenden, ohne neu zu zeichnen */
  const endMemes = () => {
    memes = false;
    stopScrolling();
    ctx.log.write('info', fresh('MEME_LEAVE_LINES', MEME_LEAVE_LINES));
  };
  const leaveMemes = () => {
    endMemes();
    el.dataset.kind = task.kind;
    setText(title, taskTitle);
    fitPending = true;
    invalidate();
  };

  // Drehen, Fenstergröße, nachgeladene Schrift: Platz neu ausmessen (nur bei echter Größenänderung, sonst Schleife)
  let fitSize = '';
  let fitFrame = 0;
  const refit = () => {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const size = `${el.clientWidth}x${el.clientHeight}`;
      if (size === fitSize || !el.isConnected) return;
      fitSize = size;
      fitBody();
    });
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(refit).observe(el);
  void document.fonts?.ready.then(() => {
    fitSize = '';
    refit();
  });

  return {
    el,
    /** Hat dieser Anruf seine Antwort schon bekommen? Vorher geht das Telefon nicht weiter. */
    isAnswered: (c: Call | null) => !c || c === answered,
    /** Zuletzt geschlossenes Ticket: eine feste Zeile unter dem Fenster, gleich für alle Programme */
    last,
    promptSlot,
    newTask,
    /** Anschläge (auch verschachtelt, Espresso: alle eines Bilds): danach einmal zeichnen, was am Ende zu sehen ist */
    batch(fn: () => void) {
      batchDepth++;
      try {
        fn();
      } finally {
        if (--batchDepth === 0 && dirty) draw();
      }
    },
    /** Ein Anschlag bringt `work` Arbeit; der Text läuft im selben Verhältnis mit. Fertig = gelöst. */
    typeMore(work: number) {
      // nicht auf den Stempel warten: nächster Anschlag beginnt gleich das nächste Ticket
      if (sentTimer) newTask();
      // ShellCheck (Bash Stufe 3): Tab-Vervollständigung, Terminal-Tickets brauchen halb so viele Anschläge
      if (task.kind === 'term' && ctx.state.upgrades['bash-3']) work *= 2;
      progress += work;
      presses++;
      const need = ticketWork(ctx.state);
      // Text ist einen Anschlag vor dem Lösen komplett da: Zeit zum Lesen, bevor der Stempel kommt
      const full = Math.max(work, need - work);
      typedLen = Math.min(reply.length, Math.round((reply.length * progress) / full));
      if (progress >= need - 1e-9) send();
      else if (typedLen >= reply.length) showReady();
    },
    /** Nach jedem Anschlag: Memes zu, Anzeige auffrischen */
    afterKey() {
      if (memes) leaveMemes();
      invalidate();
    },
    /** Pro Frame: lange nichts getippt → Memes */
    idle(sinceLastKeyMs: number) {
      if (streak > 0 && sinceLastKeyMs > SOLVE.breakMs) setStreak(0);
      if (!memes && sinceLastKeyMs > IDLE_MEMES_MS) enterMemes();
    },
  };
}
