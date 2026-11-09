import { SOLVE } from '../config';
import { ticketWork } from '../core/economy';
import { CALLERS, QUEUE_LINE, type Call, type Line } from '../content/callers';
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
  MEME_SUBS,
  MEME_USERS,
  MEMES,
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
import { DEVICE_SETTINGS, TALK_NOTES, TOPICS, topicPool, type Device } from '../content/topics';
import { fill, pick, randInt, shuffle, weightedPick } from '../util';
import type { AppContext } from './app';
import { h, setText } from './dom';
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
  /** Abgeschickt (letzter Zustand vor „Gelöst“): Fenster zeigt das Ergebnis wie im echten Programm */
  ready?: (t: Task, head: HTMLElement, extra: HTMLElement) => void;
}

/** kleine grüne Bestätigung unter dem Eingabefeld */
const note = (text: string) => h('div', { class: 'sent-note', text });
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

const clock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Browser-Rahmen: Tab-Leiste und Adresszeile (Schloss bzw. „Nicht sicher“) */
const browser = (url: string, tab: string, secure: boolean) =>
  h('div', { class: 'browser' }, [
    h('div', { class: 'br-tabs' }, [
      h('span', { class: 'br-tab' }, [h('span', { class: 'br-tab-title', text: tab }), h('span', { class: 'br-x', text: '×' })]),
      h('span', { class: 'br-new', text: '+' }),
    ]),
    h('div', { class: 'br-bar' }, [
      h('span', { class: 'br-nav', text: '‹ › ↻' }),
      h('span', { class: `br-url${secure ? '' : ' insecure'}` }, [
        h('span', { class: 'br-lock', text: secure ? '🔒︎' : '⚠ Nicht sicher' }),
        h('span', { class: 'br-addr', text: url }),
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

const avatar = (who: string, cls = '') => h('span', { class: `av ${cls}`.trim(), text: initials(who) || '?' });

const row = (label: string, value: string, cls = '') =>
  h('div', { class: `work-row ${cls}`.trim() }, [h('span', { class: 'work-key', text: label }), h('span', { class: 'work-val', text: value })]);

const PROGRAMS: Record<Kind, Program> = {
  mail: {
    weight: 3,
    title: () => pick(MAIL_TITLES),
    head: (t) => [
      h('div', { class: 'mail-tools' }, ['↩ Antworten', '↪ Weiterleiten', '🗑︎ Löschen'].map((x) => h('span', { class: 'mail-tool', text: x }))),
      h('div', { class: 'mail-fields' }, [row('An:', t.who), row('Betreff:', `Re: ${t.subject}`)]),
    ],
    lines: (t) => [t.line.answer],
    extra: () => [h('div', { class: 'mail-sig', text: pick(MAIL_SIGS) })],
    log: (t, x) => `mail[25]: Re: ${t.subject} → ${t.who}: „${x}“`,
    // Gesendet-Leiste statt Werkzeugleiste (gleicher Platz, nichts springt)
    ready: (t, head) => swap(head.querySelector('.mail-tools'), note(`✓ Gesendet an ${t.who}`)),
  },
  ticket: {
    weight: 3,
    title: () => 'Ticketsystem 3.1 (Legacy)',
    head: (t) => [
      h('div', { class: 'tk-nav' }, [h('span', { class: 'tk-app', text: 'TicketDesk' }), h('span', { class: 'tk-queue', text: `Queue: ${randInt(400, 4_812)} offen` })]),
      h('div', { class: 'tk-card' }, [
        h('div', { class: 'tk-chips' }, [
          h('span', { class: 'tk-id', text: ticketId(t.no) }),
          h('span', { class: 'tk-status', text: pick(TICKET_OPEN_STATES) }),
          h('span', { class: 'tk-prio', text: t.prio }),
        ]),
        h('div', { class: 'tk-who' }, [avatar(t.who, 'small'), h('span', { text: `${t.who} · vor ${randInt(2, 59)} Min.` })]),
        h('div', { class: 'tk-problem', text: t.subject }),
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
    title: () => 'Terminal — bash',
    head: (t) => [h('div', { class: 'work-comment', text: `# ${t.who}: ${t.subject}` })],
    lines: (t) => topicPool(t.line.topic, 'cmds'),
    log: (_t, x) => `you@helpdesk:~$ ${x}`,
    ready: (_t, _head, extra) => extra.append(h('div', { class: 'term-out opt', text: pick(TERM_OUT) }), h('div', { class: 'term-out term-next opt', text: (document.querySelector('.typed-prompt')?.textContent ?? '$ ').trimEnd() })),
  },
  chat: {
    weight: 2,
    title: () => 'Firmen-Chat',
    head: (t) => [
      h('div', { class: 'chat-top' }, [
        avatar(t.who),
        h('span', { class: 'chat-name' }, [t.who, h('span', { class: 'chat-status', text: pick(CHAT_STATES) })]),
      ]),
      h('div', { class: 'chat-msg' }, [
        avatar(t.who, 'small'),
        h('span', { class: 'chat-bubble' }, [t.subject, h('span', { class: 'chat-time', text: clock() })]),
      ]),
    ],
    lines: (t) => withPrefix(CHAT_LINES, t.line.answer, 0.2),
    log: (t, x) => `chat[443]: an ${t.who}: „${x}“`,
    // Nachricht steht als eigene Blase im Verlauf, das Eingabefeld darunter ist wieder leer
    ready: (_t, _head, extra) => extra.append(h('div', { class: 'chat-input-empty opt', text: 'Nachricht schreiben …' })),
  },
  call: {
    weight: 1,
    title: (t) => `Videocall — ${t.who} (3 Teilnehmer, 2 stumm)`,
    head: (t) => [
      h('div', { class: 'call-tiles' }, [
        h('div', { class: 'call-tile' }, [h('span', { class: 'call-avatar', text: initials(t.who) || '?' }), h('span', { class: 'call-name', text: t.who })]),
        h('div', { class: 'call-tile call-me' }, [h('span', { class: 'call-avatar', text: 'Du' }), h('span', { class: 'call-name', text: 'Kamera aus' })]),
        h('div', { class: 'call-tile call-room' }, [h('span', { class: 'call-avatar', text: '2.14' }), h('span', { class: 'call-name', text: 'Raum 2.14 (stumm)' })]),
      ]),
    ],
    label: 'Du sagst:',
    lines: (t) => withPrefix(CALL_LINES, t.line.answer, 0.3),
    log: (t, x) => `call[3478]: zu ${t.who}: „${x}“${Math.random() < 0.3 ? ' (Mikro war aus)' : ''}`,
    ready: (_t, head) => head.querySelector('.call-me .call-name')?.replaceChildren('🎙︎ spricht'),
  },
  rdp: {
    weight: 1,
    title: (t) => `Remotedesktopverbindung — ${t.target}`,
    head: (t) => [
      h('div', { class: 'rdp-conn' }, [h('span', { class: 'rdp-pin', text: '📌︎' }), h('span', { text: `${t.target} (sehr langsam)` }), h('span', { class: 'rdp-win', text: '–  ▢  ×' })]),
      h('div', { class: 'rdp-desk' }, [
        h('div', { class: 'rdp-icons' }, ['Papierkorb', ...shuffle(RDP_ICONS).slice(0, 2)].map(rdpIcon)),
        h('div', { class: 'rdp-dialog' }, [
          h('div', { class: 'rdp-dtitle' }, [h('span', { text: 'Fehler' }), h('span', { text: '×' })]),
          h('div', { class: 'rdp-dbody' }, [
            h('span', { class: 'rdp-x', 'aria-hidden': 'true', text: '✕' }),
            h('span', { class: 'rdp-err', text: pick(RDP_ERRORS) }),
            h('span', { class: 'rdp-ok', text: 'OK' }),
          ]),
        ]),
      ]),
    ],
    label: 'Öffnen:',
    extra: () => [
      h('div', { class: 'rdp-taskbar' }, [
        h('span', { class: 'rdp-start', text: 'Start' }),
        h('span', { class: 'rdp-task', text: 'Ausführen' }),
        h('span', { class: 'rdp-task rdp-task-dim', text: 'Excel (alt) – Keine Rückmeldung' }),
        h('span', { class: 'rdp-tray', 'aria-hidden': 'true', text: '🔈︎ ⇅' }),
        h('span', { class: 'rdp-clock', text: clock() }),
      ]),
    ],
    lines: (t) => topicPool(t.line.topic, 'rdp'),
    log: (t, x) => `rdp[3389]: ${t.target}> ${x}`,
    // „Ausführen“ schließt sich, die Fehlermeldung ist weg
    ready: (_t, head) => swap(head.querySelector('.rdp-dialog'), note('✓ Ausgeführt. Kein Fehler. Diesmal.')),
  },
  web: {
    weight: 1,
    title: () => 'Browser',
    head: (t) => [
      browser(`192.168.1.${10 + (t.no % 200)}/admin`, `${t.target} – Admin`, false),
      h('div', { class: 'web-page' }, [
        h('div', { class: 'web-brand', text: `⚙ ${t.target} · Administration` }),
        h('div', { class: 'web-login', text: 'Angemeldet als: admin (Passwort: admin)' }),
      ]),
    ],
    label: 'Wert:',
    extra: () => [
      h('div', { class: 'web-actions' }, [h('span', { class: 'web-btn save', text: 'Speichern' }), h('span', { class: 'web-btn', text: 'Abbrechen' })]),
      h('div', { class: 'web-foot', text: pick(WEB_FOOTERS) }),
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
    title: () => pick(AI_TITLES),
    head: () => [
      h('div', { class: 'ai-row' }, [
        h('span', { class: 'ai-bot', 'aria-hidden': 'true', text: '{•_•}' }),
        h('span', { class: 'ai-bubble', text: pick(AI_GREETINGS) }),
      ]),
    ],
    // ganzer Betreff, wenn er nicht zu lang ist; nach „…?“ kein zusätzlicher Punkt
    lines: (t) =>
      AI_PROMPTS.map((p) => fill(p, { subject: t.full.length <= 80 ? t.full : t.subject, who: t.who }).replace(/([.!?…])“\./g, '$1“')),
    extra: () => [h('div', { class: 'ai-foot', text: pick(AI_FOOTERS) })],
    log: (t, x) => `ai[{pid}]: Prompt zu ${ticketId(t.no)}: „${x}“`,
    // Antwort kommt: selbstbewusst, mit der echten Ursache des Tickets
    ready: (t, head) => {
      const bubble = head.querySelector('.ai-bubble');
      if (!bubble) return;
      bubble.textContent = fill(pick(AI_REPLIES), { cause: t.line.cause });
      bubble.classList.add('answered');
    },
  },
  search: {
    weight: 2,
    title: () => 'Browser',
    head: () => [
      browser('www.sucher.example', 'Sucher – Websuche', true),
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
    log: (_t, x) => `browser[42]: gesucht: „${x}“ – ${pick(SEARCH_RESULTS)}`,
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
  let task: Task = { kind: 'ticket', who: '', subject: '', full: '', no: 0, line: QUEUE_LINE, call: null, device: null, target: '', prio: 'mittel' };
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
  /** gelöste Tickets in Folge; reißt nach SOLVE.breakMs ohne Anschlag */
  let streak = 0;
  /** eine Zeile: passt der Text nicht, wird die Schrift kleiner statt abgeschnitten */
  const setStatus = (text: string) => {
    setText(last, text);
    last.style.fontSize = '';
    for (let size = 11; size > 8 && last.scrollWidth > last.clientWidth + 1; size -= 0.5) last.style.fontSize = `${size - 0.5}px`;
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
    const others = CALLERS.filter((c) => !current.who.startsWith(c.who));
    const taken = (l: Line) => recent.includes(l.text) || l.text === current.text || l.text === current.about;
    let c = pick(others);
    let line = pick(c.lines);
    for (let i = 0; i < 8 && taken(line); i++) {
      c = pick(others);
      line = pick(c.lines);
    }
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
  const memeTab = (site: string, text: string) =>
    h('span', { class: 'br-tab', 'data-site': site }, [h('span', { class: 'br-fav' }), h('span', { class: 'br-tab-title', text }), h('span', { class: 'br-x', text: '×' })]);
  const memeTabs = [memeTab('forum', 'r/all – readit'), memeTab('gag', '404GAG – Hot'), memeTab('alibi', 'Ticketsystem 3.1 (Legacy)')];
  const memeAddr = h('span', { class: 'br-addr' });
  const memePage = h('div', { class: 'meme-page' }, [forumFeed, gagFeed]);
  const memeWindow = h('div', { class: 'meme-window', 'aria-hidden': 'true' }, [
    h('div', { class: 'browser meme-browser' }, [
      h('div', { class: 'br-tabs' }, [...memeTabs, h('span', { class: 'br-new', text: '+' })]),
      h('div', { class: 'br-bar' }, [
        h('span', { class: 'br-nav', text: '‹ › ↻' }),
        h('span', { class: 'br-url' }, [h('span', { class: 'br-lock', text: '🔒︎' }), memeAddr]),
      ]),
    ]),
    memePage,
  ]);
  let siteTimer = 0;
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
    h('div', { class: 'work-bar' }, [h('span', { class: 'term-dots', 'aria-hidden': 'true' }), title]),
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
    task = {
      kind,
      who,
      subject: text.length > 42 ? `${text.slice(0, 40)}…` : text,
      full: text,
      no: nextTicketNo(ctx.state.clicks),
      line,
      call: q ? null : call,
      device,
      target: device ?? pcOf(who),
      prio: BOSSES.includes(who) && Math.random() < 0.7 ? 'CHEF' : pick(TICKET_PRIOS),
    };
    const prog = PROGRAMS[kind];
    reply = pick(prog.lines(task));
    body.scrollTop = 0;
    body.scrollLeft = 0;
    typedLen = 0;
    progress = 0;
    presses = 0;
    if (!memes) el.dataset.kind = kind;
    taskTitle = prog.title(task);
    setText(title, taskTitle);
    head.replaceChildren(...prog.head(task));
    extra.replaceChildren(...(prog.extra?.(task) ?? []));
    setText(label, prog.label ?? '');
    el.classList.remove('sent', 'ready');
    ready = false;
    // Statuszeile: Ticketnummer und Betreff, Füllstand zeigt den Fortschritt der Antwort
    setStatus(`${ticketId(task.no)} · ${task.subject}`);
    fitBody();
    // Layout setzt sich manchmal erst im nächsten Frame (Sprechblase, Statuszeile): dann nochmal messen
    const no = task.no;
    requestAnimationFrame(() => {
      if (task.no === no && !memes && !scrolls && overflows()) fitBody();
    });
  };

  /** Erfolg! Stempel springt auf, ab dem zweiten Ticket in Folge mit Zähler und höherem Ton */
  const setStreak = (n: number) => {
    streak = n;
    last.dataset.streak = n >= 2 ? `×${n}` : '';
  };
  const celebrate = () => {
    setStreak(streak + 1);
    const lines = STREAK_LINES[streak];
    const line = lines ? pick(lines) : '';
    setText(stampText, `✓ ${pick(task.line.fix ? FIX_STAMPS : STAMPS)}`);
    setText(stampStreak, streak >= 2 ? `×${streak}` : '');
    setText(stampLine, line);
    stamp.classList.remove('show', 'big');
    void stamp.offsetWidth; // Animation neu starten
    stamp.classList.add('show');
    if (line) stamp.classList.add('big');
    ctx.sfx.solved(streak);
    ctx.haptic('tap');
    onSolved(streak, stamp, presses);
  };

  /** Abgeschickt: wie im echten Programm, Cursor weg; gelöst wird erst beim nächsten Anschlag */
  const showReady = () => {
    if (ready) return;
    ready = true;
    el.classList.add('ready');
    PROGRAMS[task.kind].ready?.(task, head, extra);
    // kein neues Ausmessen (sonst springt das Fenster): was nicht mehr passt, fällt weg
    const optional = [...el.querySelectorAll('.opt')].reverse();
    for (const o of optional) if (overflows(true)) o.remove();
  };

  /** Gelöst: Stempel, Karte in den Ticketverlauf. Stand die Antwort schon abgeschickt da, kommt sofort das nächste. */
  const send = () => {
    typedLen = reply.length;
    const wasReady = ready;
    showTyped();
    if (task.call) answered = task.call;
    remember(task.full);
    ctx.log.write('ok', PROGRAMS[task.kind].log(task, reply));
    ctx.history.add({
      id: ticketId(task.no),
      subject: task.full,
      who: task.who,
      channel: fill(CHANNELS[task.kind], vars()),
      prio: task.prio,
      status: pick(TICKET_STATES),
      reply,
      replyLabel: REPLY_LABELS[task.kind],
      cause: task.line.cause,
      // Fragen: Notiz zum Gespräch; Probleme: Notiz zur Reparatur
      note: fill(pick(task.line.fix ? topicPool(task.line.topic, 'notes') : TALK_NOTES), vars()),
      solution: fill(pick(DONE_LINES[task.kind]), vars()),
    });
    celebrate();
    if (wasReady) {
      newTask();
      return;
    }
    // mit einem Anschlag gelöst: das Abgeschickte kurz zeigen, der nächste Anschlag wartet nicht darauf
    showReady();
    el.classList.add('sent');
    sentTimer = window.setTimeout(() => {
      sentTimer = 0;
      newTask();
    }, SENT_HOLD_MS);
  };

  // --- Memes beim Nichtstun ---
  const fillFeed = () => {
    const cards = shuffle(MEMES).slice(0, 2 * MEMES_PER_SITE);
    const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} Tsd.` : String(n));
    // Forum: hell, Unterforen, Abstimmpfeile; Bilderseite: dunkel
    const card = (m: (typeof MEMES)[number], i: number, forum: boolean) => {
      return h('div', { class: `meme ${forum ? 'meme-forum' : 'meme-gag'}` }, [
        h('div', { class: 'meme-head' }, [
          h('span', { class: 'meme-src', text: forum ? pick(MEME_SUBS) : '404GAG' }),
          h('span', { class: 'meme-meta', text: forum ? ` · ${pick(MEME_USERS)} · ${randInt(1, 23)} Std.` : ` · Hot · ${randInt(1, 59)} Min.` }),
        ]),
        h('div', { class: `meme-img meme-bg-${i % 4}` }, [
          h('span', { class: 'meme-top', text: m.top }),
          h('span', { class: 'meme-face', 'aria-hidden': 'true', text: m.face }),
          h('span', { class: 'meme-bottom', text: m.bottom }),
        ]),
        h('div', { class: 'meme-foot' }, [
          h('span', { class: 'meme-votes' }, [h('b', { class: 'up', text: '▲' }), ` ${k(randInt(120, 48_000))} `, h('b', { class: 'down', text: '▼' })]),
          h('span', { text: `${k(randInt(12, 2_400))} Kommentare` }),
          ...(forum ? [h('span', { text: 'Teilen' })] : []),
        ]),
      ]);
    };
    // je Seite einige Karten, doppelt, damit das Endlos-Scrollen nahtlos läuft
    const renderFeed = (target: HTMLElement, list: typeof cards, forum: boolean) => {
      const once = list.map((m, i) => card(m, i, forum));
      target.replaceChildren(...once, ...once.map((n) => n.cloneNode(true)));
    };
    renderFeed(forumFeed, cards.slice(0, MEMES_PER_SITE), true);
    renderFeed(gagFeed, cards.slice(MEMES_PER_SITE), false);
  };
  /** Aktiver Tab: Forum oder Bilderseite; ab und zu wird umgeschaltet (Seite lädt dann von oben) */
  const showSite = (site: 'forum' | 'gag') => {
    memeWindow.dataset.site = site;
    // neue Seite lädt von oben, erst mal lesen
    memePage.scrollTop = 0;
    if (memes) startScrolling();
    for (const t of memeTabs) t.classList.toggle('on', t.dataset.site === site);
    setText(memeAddr, site === 'forum' ? 'readit.example/r/all/hot' : '404gag.example/hot');
  };
  const nextSite = () => {
    // kein ständiger Hell-dunkel-Wechsel für alle, die weniger Bewegung wollen
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    siteTimer = window.setTimeout(() => {
      showSite(memeWindow.dataset.site === 'forum' ? 'gag' : 'forum');
      nextSite();
    }, randInt(20_000, 35_000));
  };
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /**
   * Scrollen wie mit dem Daumen: kurz lesen, zum nächsten Meme wischen (bremst ab),
   * nicht immer genau auf Kante, ab und zu ein Stück zurück. Endlos dank doppelter Kartenliste.
   */
  const startScrolling = () => {
    stopScrolling();
    // Lesepausen per Timer, Animation nur während des Wischens (spart Akku beim Herumliegen)
    const read = (ms: number) => {
      scrollWait = window.setTimeout(flick, ms);
    };
    const flick = () => {
      if (!memes) return;
      const cards = [...(memeWindow.dataset.site === 'gag' ? gagFeed : forumFeed).children] as HTMLElement[];
      const half = cards.length / 2;
      const loop = half >= 1 ? cards[half]!.offsetTop - cards[0]!.offsetTop : 0;
      // zweite Hälfte = Kopie der ersten: unbemerkt zurückspringen
      if (loop > 0 && memePage.scrollTop >= loop) memePage.scrollTop -= loop;
      const from = memePage.scrollTop;
      const next = cards.find((c) => c.offsetTop > from + 12);
      let target = next ? next.offsetTop - 8 : from + 200;
      if (from > 80 && Math.random() < 0.12) target = from - randInt(40, 90); // nochmal gucken
      else if (Math.random() < 0.3) target += randInt(-30, 40); // Daumen ist nicht pixelgenau
      const to = Math.max(0, target);
      // Lesezeit danach: mal schnell weiter, mal länger hängen bleiben
      const pause = reducedMotion() ? 8_000 : Math.random() < 0.2 ? randInt(7_000, 11_000) : randInt(3_000, 6_000);
      if (reducedMotion()) {
        memePage.scrollTop = to;
        return read(pause);
      }
      const dur = Math.min(1_100, 380 + Math.abs(to - from) * 1.6);
      const start = performance.now();
      const frame = (now: number) => {
        if (!memes) return;
        const t = Math.min(1, (now - start) / dur);
        memePage.scrollTop = from + (to - from) * (1 - (1 - t) ** 3);
        if (t < 1) scrollRaf = requestAnimationFrame(frame);
        else read(pause);
      };
      scrollRaf = requestAnimationFrame(frame);
    };
    read(randInt(1_500, 3_000));
  };
  const stopScrolling = () => {
    clearTimeout(scrollWait);
    cancelAnimationFrame(scrollRaf);
  };

  const enterMemes = () => {
    memes = true;
    fillFeed();
    el.dataset.kind = 'memes';
    showSite(Math.random() < 0.5 ? 'forum' : 'gag');
    nextSite();
    setText(title, 'Browser');
    ctx.log.write('info', pick(MEME_ENTER_LINES));
  };
  const leaveMemes = () => {
    memes = false;
    clearTimeout(siteTimer);
    stopScrolling();
    el.dataset.kind = task.kind;
    setText(title, taskTitle);
    fitBody();
    ctx.log.write('info', pick(MEME_LEAVE_LINES));
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
    /** Ein Anschlag bringt `work` Arbeit; der Text läuft im selben Verhältnis mit. Fertig = gelöst. */
    typeMore(work: number) {
      // nicht auf den Stempel warten: nächster Anschlag beginnt gleich das nächste Ticket
      if (sentTimer) newTask();
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
      showTyped();
    },
    /** Pro Frame: lange nichts getippt → Memes */
    idle(sinceLastKeyMs: number) {
      if (streak > 0 && sinceLastKeyMs > SOLVE.breakMs) setStreak(0);
      if (!memes && sinceLastKeyMs > IDLE_MEMES_MS) enterMemes();
    },
  };
}
