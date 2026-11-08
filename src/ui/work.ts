import { CALLERS, QUEUE_LINE, type Call, type Line } from '../content/callers';
import { CALL_LINES, CHAT_LINES, MEME_ACCOUNTS, MEMES, RDP_ERRORS, SEARCH_RESULTS, TICKET_PRIOS, WEB_GENERIC, DONE_LINES, TICKET_STATES } from '../content/work';
import { DEVICE_SETTINGS, GENERIC, TALK_NOTES, topicPool, type Device, type Topic } from '../content/topics';
import { pick, randInt, weightedPick } from '../util';
import type { AppContext } from './app';
import { h, setText } from './dom';
import { nextTicketNo, ticketId } from './history';

/** Ohne Anschlag so lange, dann wird heimlich durch Memes gescrollt */
const IDLE_MEMES_MS = 15_000;
/** So viele Zeichen des Getippten bleiben sichtbar (der Anfang rutscht raus) */
const TYPED_VISIBLE = 88;

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
};
/** Rechnername passend zur Abteilung, z. B. „PC-BUCHH-07“; Chefetage hat Laptops */
const pcOf = (who: string) =>
  /Chef|Geschäftsführung|Vorstand/.test(who)
    ? 'LAPTOP-CHEF'
    : `PC-${who.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/[^A-Z]/g, '').slice(0, 5)}-${String(randInt(1, 12)).padStart(2, '0')}`;
/** ab und zu programmtypisches Geplänkel vor der eigentlichen Antwort */
const withPrefix = (prefixes: readonly string[], answer: string, share: number) => [Math.random() < share ? `${pick(prefixes)} ${answer}` : answer];
/** Antworten geht immer */
const TALK: Kind[] = ['mail', 'ticket', 'chat', 'call'];
/** Wo man technisch ran muss: welche Werkzeuge zum Thema passen */
const TECH: Record<Topic, Kind[]> = {
  drucker: ['term', 'rdp', 'web', 'search'],
  passwort: ['term', 'rdp', 'web'],
  netz: ['term', 'rdp', 'web', 'search'],
  mail: ['term', 'rdp', 'web'],
  office: ['rdp', 'search'],
  hardware: ['rdp', 'search'],
  server: ['term', 'web', 'search'],
  sicherheit: ['term', 'web'],
  wunsch: ['rdp', 'web'],
  allgemein: ['rdp', 'search'],
};
/** so lange bleibt ein gelöstes Ticket stehen; der nächste Anschlag wartet nicht darauf */
const SENT_HOLD_MS = 450;
/** Tickets in Folge, wenn zwischen zwei Lösungen höchstens so viel Zeit liegt */
const STREAK_GAP_MS = 6_000;
/** Erfolgsstempel: meistens „Gelöst!“, ab und zu Abwechslung */
const STAMPS = ['Gelöst!', 'Gelöst!', 'Gelöst!', 'Ticket gelöst!', 'Erledigt!', 'Gefixt!', 'Läuft wieder!'];
const initials = (who: string) =>
  who
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

type Kind = 'mail' | 'ticket' | 'term' | 'chat' | 'call' | 'rdp' | 'web' | 'search';

interface Task {
  kind: Kind;
  who: string;
  subject: string;
  /** ganzer Anliegen-Text (subject ist gekürzt) */
  full: string;
  no: number;
  /** das Anliegen: Thema, Ursache, passende Antwort */
  line: Line;
  /** Gerät, PC oder Ähnliches, je nach Programm */
  target: string;
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
}

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

const avatar = (who: string, cls = '') => h('span', { class: `av ${cls}`.trim(), text: initials(who) || '?' });

const row = (label: string, value: string, cls = '') =>
  h('div', { class: `work-row ${cls}`.trim() }, [h('span', { class: 'work-key', text: label }), h('span', { class: 'work-val', text: value })]);

const PROGRAMS: Record<Kind, Program> = {
  mail: {
    weight: 3,
    title: () => 'Posteingang (4.812 ungelesen)',
    head: (t) => [
      h('div', { class: 'mail-tools' }, ['↩ Antworten', '↪ Weiterleiten', '🗑︎ Löschen'].map((x) => h('span', { class: 'mail-tool', text: x }))),
      h('div', { class: 'mail-fields' }, [row('An:', t.who), row('Betreff:', `Re: ${t.subject}`)]),
    ],
    lines: (t) => [t.line.answer],
    extra: () => [h('div', { class: 'mail-sig', text: '-- Mit freundlichen Grüßen, Ihre IT (Durchwahl -666)' })],
    log: (t, x) => `mail[25]: Re: ${t.subject} → ${t.who}: „${x}“`,
  },
  ticket: {
    weight: 3,
    title: () => 'Ticketsystem 3.1 (Legacy)',
    head: (t) => [
      h('div', { class: 'tk-nav' }, [h('span', { class: 'tk-app', text: 'TicketDesk' }), h('span', { class: 'tk-queue', text: `Queue: ${randInt(400, 4_812)} offen` })]),
      h('div', { class: 'tk-card' }, [
        h('div', { class: 'tk-chips' }, [
          h('span', { class: 'tk-id', text: ticketId(t.no) }),
          h('span', { class: 'tk-status', text: pick(['Neu', 'In Bearbeitung', 'Wieder geöffnet (3×)']) }),
          h('span', { class: 'tk-prio', text: pick(TICKET_PRIOS) }),
        ]),
        h('div', { class: 'tk-who' }, [avatar(t.who, 'small'), h('span', { text: `${t.who} · vor ${randInt(2, 59)} Min.` })]),
        h('div', { class: 'tk-problem', text: t.subject }),
      ]),
    ],
    label: 'Kommentar:',
    lines: (t) => [t.line.answer],
    extra: () => [h('div', { class: 'tk-actions' }, ['Antworten', 'Schließen', 'Eskalieren'].map((x, i) => h('span', { class: `tk-btn tk-btn-${i}`, text: x })))],
    log: (t, x) => `ticket[8080]: ${ticketId(t.no)} kommentiert: „${x}“`,
  },
  term: {
    weight: 2,
    title: () => 'Terminal — bash',
    head: (t) => [h('div', { class: 'work-comment', text: `# ${t.who}: ${t.subject}` })],
    lines: (t) => topicPool(t.line.topic, 'cmds'),
    log: (_t, x) => `you@helpdesk:~$ ${x}`,
  },
  chat: {
    weight: 2,
    title: () => 'Firmen-Chat',
    head: (t) => [
      h('div', { class: 'chat-top' }, [
        avatar(t.who),
        h('span', { class: 'chat-name' }, [t.who, h('span', { class: 'chat-status', text: pick(['● online', '● beschäftigt', '● „im Meeting“']) })]),
      ]),
      h('div', { class: 'chat-msg' }, [
        avatar(t.who, 'small'),
        h('span', { class: 'chat-bubble' }, [t.subject, h('span', { class: 'chat-time', text: clock() })]),
      ]),
    ],
    lines: (t) => withPrefix(CHAT_LINES, t.line.answer, 0.2),
    log: (t, x) => `chat[443]: an ${t.who}: „${x}“`,
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
  },
  rdp: {
    weight: 1,
    title: (t) => `Remotedesktopverbindung — ${t.target}`,
    head: (t) => [
      h('div', { class: 'rdp-conn' }, [h('span', { class: 'rdp-pin', text: '📌︎' }), h('span', { text: `${t.target} (sehr langsam)` }), h('span', { class: 'rdp-win', text: '–  ▢  ×' })]),
      h('div', { class: 'rdp-desk' }, [
        h('div', { class: 'rdp-icons' }, ['Papierkorb', 'Excel (alt)', 'NEU NEU.docx'].map((n) => h('span', { class: 'rdp-icon', text: n }))),
        h('div', { class: 'rdp-dialog' }, [
          h('div', { class: 'rdp-dtitle' }, [h('span', { text: 'Fehler' }), h('span', { text: '×' })]),
          h('div', { class: 'rdp-dbody' }, [h('span', { class: 'rdp-err', text: pick(RDP_ERRORS) }), h('span', { class: 'rdp-ok', text: 'OK' })]),
        ]),
      ]),
    ],
    label: 'Öffnen:',
    extra: () => [h('div', { class: 'rdp-taskbar' }, [h('span', { class: 'rdp-start', text: 'Start' }), h('span', { class: 'rdp-task', text: 'Ausführen' }), h('span', { class: 'rdp-clock', text: clock() })])],
    lines: (t) => topicPool(t.line.topic, 'rdp'),
    log: (t, x) => `rdp[3389]: ${t.target}> ${x}`,
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
      h('div', { class: 'web-foot', text: '© 2009 · Firmware 1.0 · Best viewed with IE 6' }),
    ],
    lines: (t) => (Math.random() < 0.25 ? WEB_GENERIC : (DEVICE_SETTINGS[t.target as Device] ?? WEB_GENERIC)),
    log: (t, x) => `web[80]: ${t.target}: ${x} – gespeichert`,
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
        [...SEARCH_RESULTS].sort(() => Math.random() - 0.5).slice(0, 3).map((r) =>
          h('div', { class: 'search-hit' }, [h('span', { class: 'hit-url', text: pick(['forum.example', 'stackoverflow.example', 'support.example', 'video.example']) }), h('span', { class: 'hit-text', text: r })]),
        ),
      ),
    ],
    lines: (t) => topicPool(t.line.topic, 'searches'),
    log: (_t, x) => `browser[42]: gesucht: „${x}“ – ${pick(SEARCH_RESULTS)}`,
  },
};

/**
 * Arbeitsfenster auf dem Desktop: wechselt zwischen Mail, Ticketsystem, Shell, Chat, Videocall,
 * Fernwartung, Webinterface und Websuche. Jeder Anschlag tippt die Antwort weiter, Enter schickt ab.
 * Wer eine Weile nichts tippt, scrollt heimlich durch Memes.
 */
export function createWork(ctx: AppContext, currentCall: () => Call | null) {
  let task: Task = { kind: 'ticket', who: '', subject: '', full: '', no: 0, line: QUEUE_LINE, target: '' };
  let reply = '';
  let typedLen = 0;
  let memes = false;
  /** Antwort fertig: Fenster bleibt kurz mit „Gelöst!“ stehen, dann kommt das nächste */
  let sentTimer = 0;
  let streak = 0;
  let lastSolved = -Infinity;
  /** eine Zeile: passt der Text nicht, wird die Schrift kleiner statt abgeschnitten */
  const setStatus = (text: string) => {
    setText(last, text);
    last.style.fontSize = '';
    for (let size = 11; size > 8 && last.scrollWidth > last.clientWidth + 1; size -= 0.5) last.style.fontSize = `${size - 0.5}px`;
  };
  const fill = (t: string) => t.replaceAll('{who}', task.who).replaceAll('{target}', task.target);
  /** Anruf, der schon eine Antwort bekommen hat */
  let answered: Call | null = null;
  /** zuletzt aus der Warteschlange gezogen, damit sich Betreffe nicht gleich wiederholen */
  const recentQueue: string[] = [];
  /** Ticket aus der Warteschlange: jemand anderes als der aktuelle Anrufer */
  const queued = (notWho: string) => {
    const others = CALLERS.filter((c) => !notWho.startsWith(c.who));
    let c = pick(others);
    let line = pick(c.lines);
    for (let i = 0; i < 6 && recentQueue.includes(line.text); i++) {
      c = pick(others);
      line = pick(c.lines);
    }
    recentQueue.push(line.text);
    if (recentQueue.length > 20) recentQueue.shift();
    return { who: c.who, line };
  };

  const title = h('span', { class: 'work-title' });
  const head = h('div', { class: 'work-head' });
  const label = h('span', { class: 'work-label' });
  const promptSlot = h('span', { class: 'typed-prompt', text: '$ ' });
  const typedEl = h('span', { class: 'typed' });
  const extra = h('div', { class: 'work-extra' });
  const last = h('div', { class: 'last-closed', 'aria-live': 'polite' });
  const feed = h('div', { class: 'meme-feed', 'aria-hidden': 'true' });
  // eigenes Element statt ::after: blendet über dem nächsten Ticket weiter aus
  const stamp = h('div', { class: 'solved-stamp', 'aria-hidden': 'true' });
  const stampText = h('span', { class: 'ss-text' });
  const stampStreak = h('span', { class: 'ss-streak' });
  stamp.append(stampText, stampStreak);
  const el = h('div', { class: 'work' }, [
    h('div', { class: 'work-bar' }, [h('span', { class: 'term-dots', 'aria-hidden': 'true' }), title]),
    head,
    h('div', { class: 'work-body' }, [label, promptSlot, typedEl, h('span', { class: 'cursor', text: '▌' })]),
    extra,
    h('div', { class: 'meme-window' }, [feed]),
    stamp,
  ]);

  const showTyped = () => {
    last.style.setProperty('--p', reply ? (typedLen / reply.length).toFixed(3) : '0');
    const t = reply.slice(0, typedLen);
    setText(typedEl, t.length > TYPED_VISIBLE ? `…${t.slice(-TYPED_VISIBLE)}` : t);
  };

  /** Nächste Aufgabe: anderes Programm; erst der aktuelle Anrufer, dann Tickets aus der Warteschlange */
  const newTask = () => {
    clearTimeout(sentTimer);
    sentTimer = 0;
    const call = currentCall();
    // Erst bekommt der Anrufer seine Antwort, danach geht es mit der Warteschlange weiter
    const fromQueue = !!call && call === answered;
    if (call) answered = call;
    const q = fromQueue ? queued(call.who) : null;
    // vor dem ersten Anruf: der Chef wundert sich über die volle Warteschlange
    const who = q?.who ?? call?.who.replace(/ \(Rückruf\)$/, '') ?? 'Chef';
    const line = q?.line ?? call ?? QUEUE_LINE;
    // Rückruf: Betreff bleibt das ursprüngliche Anliegen
    const text = q ? line.text : (call?.about ?? line.text);
    // Fragen werden beantwortet, Probleme auch mit passendem Werkzeug gelöst
    const kinds = line.fix ? [...TALK, ...TECH[line.topic]] : TALK;
    const choices = kinds.length > 1 ? kinds.filter((k) => k !== task.kind) : kinds;
    const kind = weightedPick(choices, (k) => PROGRAMS[k].weight);
    task = {
      kind,
      who,
      subject: text.length > 42 ? `${text.slice(0, 40)}…` : text,
      full: text,
      no: nextTicketNo(ctx.state.clicks),
      line,
      target: kind === 'rdp' ? pcOf(who) : pick(topicPool(line.topic, 'devices')),
    };
    const prog = PROGRAMS[kind];
    reply = pick(prog.lines(task));
    typedLen = 0;
    if (!memes) el.dataset.kind = kind;
    setText(title, prog.title(task));
    head.replaceChildren(...prog.head(task));
    extra.replaceChildren(...(prog.extra?.(task) ?? []));
    setText(label, prog.label ?? '');
    el.classList.remove('sent');
    // Statuszeile: Ticketnummer und Betreff, Füllstand zeigt den Fortschritt der Antwort
    setStatus(`${ticketId(task.no)} · ${task.subject}`);
    showTyped();
  };

  /** Erfolg! Stempel springt auf, ab dem zweiten Ticket in Folge mit Zähler und höherem Ton */
  const celebrate = () => {
    const now = performance.now();
    streak = now - lastSolved < STREAK_GAP_MS ? streak + 1 : 1;
    lastSolved = now;
    setText(stampText, `✓ ${pick(STAMPS)}`);
    setText(stampStreak, streak >= 2 ? `×${streak}` : '');
    stamp.classList.remove('show');
    void stamp.offsetWidth; // Animation neu starten
    stamp.classList.add('show');
    ctx.sfx.solved(streak);
    ctx.haptic('tap');
  };

  /** Abschicken: Erfolgsstempel, Karte mit Abschluss-Spruch in den Ticketverlauf, kurz danach das nächste */
  const send = () => {
    // Enter, während der Stempel noch steht: gleich weiter
    if (sentTimer) return newTask();
    if (typedLen === 0) return newTask();
    typedLen = reply.length;
    showTyped();
    ctx.log.write('ok', PROGRAMS[task.kind].log(task, reply));
    ctx.history.add({
      id: ticketId(task.no),
      subject: task.full,
      who: task.who,
      channel: fill(CHANNELS[task.kind]),
      prio: pick(TICKET_PRIOS),
      status: pick(TICKET_STATES),
      reply,
      replyLabel: REPLY_LABELS[task.kind],
      cause: task.line.cause,
      // Fragen: Notiz zum Gespräch; Probleme: Notiz zur Reparatur
      note: fill(pick(task.line.fix ? topicPool(task.line.topic, 'notes') : Math.random() < 0.7 ? TALK_NOTES : GENERIC.notes)),
      solution: fill(pick(DONE_LINES[task.kind])),
    });
    el.classList.add('sent');
    celebrate();
    sentTimer = window.setTimeout(() => {
      sentTimer = 0;
      newTask();
    }, SENT_HOLD_MS);
  };

  // --- Memes beim Nichtstun ---
  const fillFeed = () => {
    const cards = [...MEMES].sort(() => Math.random() - 0.5).slice(0, 5);
    const card = (m: (typeof MEMES)[number], i: number) =>
      h('div', { class: `meme meme-${i % 4}` }, [
        h('div', { class: 'meme-acc', text: `${pick(MEME_ACCOUNTS)} · ${randInt(1, 23)} Std.` }),
        h('div', { class: 'meme-top', text: m.top }),
        h('div', { class: 'meme-bottom', text: m.bottom }),
        h('div', { class: 'meme-likes', text: `♥ ${randInt(2, 98) / 10} Tsd.` }),
      ]);
    // doppelt, damit das Endlos-Scrollen nahtlos läuft
    feed.replaceChildren(...cards.map(card), ...cards.map(card));
  };
  const enterMemes = () => {
    memes = true;
    fillFeed();
    el.dataset.kind = 'memes';
    setText(title, 'Memes (nur ganz kurz)');
    ctx.log.write('info', 'browser[42]: Pause. Nur ganz kurz Memes.');
  };
  const leaveMemes = () => {
    memes = false;
    el.dataset.kind = task.kind;
    setText(title, PROGRAMS[task.kind].title(task));
    ctx.log.write('info', pick(['browser[42]: Tab gewechselt. Der Chef kam vorbei.', 'browser[42]: Zurück an die Arbeit. Niemand hat was gesehen.']));
  };

  return {
    el,
    /** Zuletzt geschlossenes Ticket: eine feste Zeile unter dem Fenster, gleich für alle Programme */
    last,
    promptSlot,
    newTask,
    send,
    /** Ein Anschlag tippt ein paar Zeichen; mit Textbaustein ganze Wörter. Ende = abschicken. */
    typeMore() {
      // nicht auf den Stempel warten: nächster Anschlag beginnt gleich das nächste Ticket
      if (sentTimer) newTask();
      const step = ctx.state.upgrades.macro ? randInt(6, 10) : randInt(2, 4);
      typedLen = Math.min(reply.length, typedLen + step);
      if (typedLen >= reply.length) send();
    },
    /** Nach jedem Anschlag: Memes zu, Anzeige auffrischen */
    afterKey() {
      if (memes) leaveMemes();
      showTyped();
    },
    /** Pro Frame: lange nichts getippt → Memes */
    idle(sinceLastKeyMs: number) {
      if (!memes && sinceLastKeyMs > IDLE_MEMES_MS) enterMemes();
    },
  };
}
