import type { Saver } from '../core/save';
import type { GameState } from '../core/state';
import { bus } from '../core/bus';
import { bossProgress } from '../core/boss';
import { activeOs } from '../core/os';
import type { OsId } from '../content/systems';
import { productionPerSec, rates } from '../core/economy';
import { addTickets } from '../core/state';
import type { Sfx } from './audio';
import { createDesk } from './desk';
import { h, juice, POP, quip, setFlag, setText } from './dom';
import { formatNumber, formatRate } from './format';
import type { HapticKind } from './haptics';
import { Fx } from './juice';
import type { SysLog } from './log';
import type { TicketHistory } from './history';
import { createPager } from './pager';
import { createProps } from './props';
import { createToaster, type ToastKind } from './toast';
import { BUFF_HELP, BUFF_LABELS } from '../content/events';
import { companyOf } from '../content/companies';
import { TRASH_LINES } from '../content/props';
import { POWER_HINT, WALLPAPER_MARKS } from '../content/boot';
import { paintWall } from './wallpaper';
import { setThemeColor, themeLight } from './power';
import { achievementCount } from '../core/achievements';
import { pick } from '../util';
import { gameBlocked } from './blocked';

/** Neustart (crt-restart, 1,4 s): bei diesem Zeitpunkt ist das Bild ganz dunkel */
const OS_SWAP_MS = 500;

export interface AppContext {
  state: GameState;
  log: SysLog;
  /** App „Tickets“: erledigte Fenster, Pager, Incidents */
  history: TicketHistory;
  saver: Saver;
  sfx: Sfx;
  haptic: (kind: HapticKind) => void;
}

/** Eine App auf dem Desktop: Icon antippen öffnet sie als großes Fenster. */
export interface Tab {
  id: string;
  label: string;
  icon: string;
  mount(ctx: AppContext): HTMLElement;
  render(): void;
  onShow?(): void;
  /** Punkt an der App, z. B. „hier gibt es was zu kaufen“: 0 = nichts, 1 = Punkt, 2 = kräftiger Punkt („jetzt wirklich“) */
  badge?(): 0 | 1 | 2;
}

export interface App {
  /** Monitor ist an: Desktop steht; open = Werkzeug gleich öffnen (sonst mit dem ersten Anschlag) */
  start(open?: boolean): void;
  render(): void;
  popCounter(): void;
  toast(title: string, text: string, kind?: ToastKind): void;
}

const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>`;
const svgTile = (markup: string) => {
  const el = h('span', { class: 'app-tile tile-trash', 'aria-hidden': 'true' });
  el.innerHTML = markup;
  return el;
};
/** „[≡]“ → „≡“: Klammern passen nicht auf die Kachel */
const glyph = (icon: string) => icon.replace(/[[\]()]/g, '');

/** Papierkorb: so viele Tickets bis „voll“, Bonus wie ein kleines Dringend-Ticket */
const TRASH_FULL = 150;
const TRASH_BONUS_SEC = 30;
const TRASH_BONUS_CLICKS = 15;

const WOBBLE: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-1deg) scale(1.01)' },
  { transform: 'rotate(.8deg)' },
  { transform: 'rotate(-.3deg)' },
  { transform: 'rotate(0)' },
];

/**
 * Schreibtisch-Layout: Wand mit Zähler oben, Röhrenmonitor mit Desktop (App-Icons und Arbeitsfenster),
 * Anrufer, Tastatur unten. Apps öffnen als großes Fenster über allem; × oder Zurück schließt es.
 */
export function mountApp(root: HTMLElement, ctx: AppContext, tabs: Tab[]): App {
  const fx = new Fx();
  const props = createProps(ctx);

  // --- Wand ---
  const tickets = h('span', { class: 'counter-value', text: '0' });
  const rate = h('span', { class: 'rate', text: '+0.0/s' });
  const buffsEl = h('span', { class: 'buffs', 'aria-live': 'polite' });
  // Aufgabe vom Chef: Fortschritt als kleiner Zettel neben der Rate, Antippen zeigt die ganze Aufgabe
  const bossChip = h('button', { class: 'boss-chip', type: 'button', hidden: '' });
  bossChip.addEventListener('click', () => {
    const b = ctx.state.boss;
    if (!b.kind) return;
    const left = Math.max(0, Math.ceil((b.until - ctx.state.stats.playTimeMs) / 1_000));
    quip(bossChip, `Chef: ${b.text} (noch ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} Min.)`);
  });
  // Boost-Chips antippen: was tut das eigentlich?
  buffsEl.addEventListener('click', (e) => {
    const chip = (e.target as Element).closest('.buff');
    const i = chip ? buffChips.indexOf(chip as HTMLElement) : -1;
    const b = ctx.state.buffs[i];
    if (!chip || !b) return;
    quip(chip, `${BUFF_HELP[b.id] ?? BUFF_LABELS[b.id] ?? b.id} Noch ${Math.ceil(b.remainingMs / 1_000)} s.`);
  });
  let buffSig = '';
  let buffChips: HTMLElement[] = [];
  /** Startdauer je Chip (für den Füllstand) */
  let buffTotal: number[] = [];
  /** große Zahlen passen nicht immer: erst „Tickets“ weglassen, dann die Schrift verkleinern, nie abschneiden */
  const fitCounter = () => {
    const box = tickets.parentElement;
    if (!box) return;
    box.style.fontSize = '';
    box.classList.remove('no-unit');
    const over = () => box.scrollWidth > box.clientWidth + 1;
    if (over()) box.classList.add('no-unit');
    for (let size = parseFloat(getComputedStyle(box).fontSize) - 1; size >= 14 && over(); size--) box.style.fontSize = `${size}px`;
  };
  window.addEventListener('resize', fitCounter);
  const header = h('header', { class: 'wall' }, [
    h('div', { class: 'sign counter-sign' }, [
      h('div', { class: 'counter' }, [tickets, h('span', { class: 'counter-unit', text: ' Tickets' })]),
      h('div', { class: 'rate-row' }, [rate, bossChip, buffsEl]),
    ]),
    props.calendar,
    props.incidentSign,
  ]);

  // --- Monitor mit Desktop ---
  const promptUser = h('span', { class: 'prompt-user' });
  // Taskleiste: Start öffnet den Launcher mit allen Apps; im Tray stehen nur Apps, bei denen gerade was zu tun ist
  const startBtn = h('button', { class: 'taskbar-start', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'launcher' }, [
    h('span', { class: 'start-glyph', 'aria-hidden': 'true', text: '▶' }),
    h('span', { class: 'start-label', text: 'start' }),
  ]);
  const tray = h('div', { class: 'tray' });
  // Uhr in zwei Teilen: an einer senkrechten Leiste stehen Stunden und Minuten untereinander
  const clockH = h('span');
  const clockM = h('span');
  const clockEl = h('span', { class: 'taskbar-clock', 'aria-hidden': 'true' }, [clockH, h('span', { class: 'clock-sep', text: ':' }), clockM]);
  // Infobereich rechts (wie bei XP): Tray-Apps und Uhr auf eigenem Feld
  const taskbar = h('div', { class: 'taskbar' }, [startBtn, h('div', { class: 'tray-area' }, [tray, clockEl])]);
  const icons = h('nav', { class: 'launcher-grid', 'aria-label': 'Programme' });
  const launcher = h('div', { class: 'launcher', id: 'launcher', hidden: '' }, [icons]);
  const screen = h('div', { class: 'screen' });
  const desk = createDesk(ctx, fx, () => root, () => screen);
  desk.promptSlot.replaceChildren(promptUser, ':~$ ');
  // Hintergrundbild: je Firma oder aus der Sammlung (System), dazu ein Wasserzeichen, das bei jedem Start ein anderes Problem meldet
  const [markTitle, markText] = pick(WALLPAPER_MARKS);
  const wallpaper = h('div', { class: 'wallpaper', 'aria-hidden': 'true' }, [
    h('div', { class: 'wp-mark' }, [h('b', { text: markTitle }), h('span', { text: markText })]),
  ]);
  let wallKey = '';
  let wallChecked = '';
  /** zuletzt gezeigter Büro-Stil (Firma + Keller-Upgrade) */
  let wallKeyShown = '';
  // bis zum ersten Anschlag ist kein Werkzeug offen: nur Hintergrundbild und Apps
  screen.append(
    h('div', { class: 'desktop no-tool' }, [wallpaper, desk.work, desk.lastClosed, taskbar, launcher]),
    desk.loginEl,
    h('div', { class: 'scanlines', 'aria-hidden': 'true' }),
  );

  const led = h('span', { class: 'led', 'aria-hidden': 'true' });
  // Monitor-Upgrade: neues Modell statt zweitem Bildschirm
  const brand = h('span', { class: 'brand', text: 'HYT-2000' });
  const monitor = h('div', { class: 'monitor' }, [
    screen,
    h('div', { class: 'chin' }, [
      h('span', { class: 'vents', 'aria-hidden': 'true' }),
      brand,
      led,
      // Netzschalter: schaltet den Monitor ein und aus (power.ts), Hinweis darauf erst, wenn jemand ihn sucht
      h('button', { class: 'mon-power', type: 'button', 'aria-label': 'Monitor ein/aus' }),
      h('span', { class: 'tap-hint power-hint', 'aria-hidden': 'true', text: POWER_HINT }),
    ]),
    h('div', { class: 'frost', 'aria-hidden': 'true' }),
  ]);
  const monitorArea = h('section', { class: 'monitor-area' }, [
    props.cables,
    props.dust,
    props.kNote,
    props.beacon,
    monitor,
    desk.phone,
    ...props.notes,
    props.duck,
  ]);

  // --- Schreibtisch ---
  const pager = createPager(ctx);
  const deskbar = h('div', { class: 'deskbar' }, [
    desk.callerEl,
    props.plant,
    h('div', { class: 'mug-spot' }, [props.mug, props.book]),
    props.mate,
    pager.device,
  ]);
  // Maus rechts neben der Tastatur
  desk.keyboard.append(props.mouse);

  // --- App-Fenster (Sheet) ---
  const sheetIcon = h('span', { class: 'app-tile', 'aria-hidden': 'true' });
  const sheetTitle = h('h2', { class: 'sheet-title', id: 'sheet-title' });
  const sheetClose = h('button', { class: 'sheet-close', type: 'button', 'aria-label': 'Fenster schließen', text: '×' });
  const sheetBody = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title', hidden: '' }, [
    h('div', { class: 'sheet-bar' }, [sheetIcon, sheetTitle, sheetClose]),
    sheetBody,
  ]);

  const toaster = createToaster();

  /** Mini-Kachel im Tray: nur sichtbar, solange die App einen Punkt hat */
  const trayItem = (cls: string, label: string, tile: HTMLElement) => {
    const el = h('button', { class: cls, type: 'button', 'aria-label': label, hidden: '' }, [tile, h('span', { class: 'nav-badge', 'aria-hidden': 'true' })]);
    tray.append(el);
    return el;
  };

  const mounted = tabs.map((tab) => {
    const panel = h('section', { class: `panel panel-${tab.id}`, id: `panel-${tab.id}`, hidden: '' });
    panel.append(tab.mount(ctx));
    sheetBody.append(panel);
    const btn = h('button', { class: `app-icon app-${tab.id}`, type: 'button', 'aria-haspopup': 'dialog' }, [
      h('span', { class: `app-tile tile-${tab.id}`, 'aria-hidden': 'true', text: glyph(tab.icon) }),
      h('span', { class: 'app-label', text: tab.label }),
      h('span', { class: 'nav-badge', 'aria-hidden': 'true' }),
    ]);
    icons.append(btn);
    const trayBtn = trayItem(`tray-app app-${tab.id}`, tab.label, h('span', { class: `app-tile tile-${tab.id}`, 'aria-hidden': 'true', text: glyph(tab.icon) }));
    return { tab, panel, btn, trayBtn };
  });
  // Papierkorb: reiner Gag
  const trash = h('button', { class: 'app-icon app-trash', type: 'button' }, [
    svgTile(TRASH_SVG),
    h('span', { class: 'app-label', text: 'Papierkorb' }),
    h('span', { class: 'nav-badge', 'aria-hidden': 'true' }),
  ]);
  // voll: auch im Tray, vor System (wie im Launcher)
  const trashTray = trayItem('tray-app app-trash', 'Papierkorb', svgTile(TRASH_SVG));
  // Papierkorb füllt sich mit erledigten Tickets; voll geleert gibt es Altpapier-Pfand
  let trashCount = 0;
  bus.on('click', () => trashCount++);
  const emptyTrash = (tapped: HTMLElement) => {
    closeLauncher();
    // aus dem (jetzt zugeklappten) Launcher: Blase und Zahl an der Tray-Kachel bzw. am Start-Knopf zeigen
    const from = tapped === trash ? (trashTray.hidden ? startBtn : trashTray) : tapped;
    juice(from, POP, 240);
    const fill = Math.min(1, trashCount / TRASH_FULL);
    if (fill < 1) {
      ctx.sfx.tick();
      const msg = `${Math.round(fill * 100)} % voll. Erst leeren, wenn er überquillt. So steht es in der Hausordnung.`;
      ctx.log.write('info', `trash[99]: ${msg}`);
      quip(from, msg);
      return;
    }
    const r = rates(ctx.state);
    const bonus = Math.max(r.pps * TRASH_BONUS_SEC, r.click * TRASH_BONUS_CLICKS);
    addTickets(ctx.state, bonus);
    trashCount = 0;
    const line = pick(TRASH_LINES);
    ctx.log.write('info', line);
    quip(from, `${line} Altpapier-Pfand: +${formatNumber(bonus)} Tickets.`);
    ctx.log.write('ok', `trash[99]: Altpapier-Pfand eingelöst: +${formatNumber(bonus)} Tickets.`);
    const p = fx.rel(from);
    fx.floater(p.x + p.w / 2, p.y + p.h / 2, `+${formatNumber(bonus)}`, true);
    ctx.sfx.crumple();
    ctx.haptic('milestone');
    juice(tickets, POP, 320);
  };
  trash.addEventListener('click', () => emptyTrash(trash));
  trashTray.addEventListener('click', () => emptyTrash(trashTray));
  // System ganz nach rechts (wie die Einstellungen am Ende der Leiste), Papierkorb davor
  icons.insertBefore(trash, mounted.find((m) => m.tab.id === 'system')?.btn ?? null);
  tray.insertBefore(trashTray, mounted.find((m) => m.tab.id === 'system')?.trayBtn ?? null);

  // --- Launcher: geht im Bildschirm auf, schließt bei App-Wahl, Tipp daneben, Esc, Zurück oder Start ---
  let launcherOpen = false;
  /** eigener history.back() beim Schließen: das folgende popstate nicht noch einmal auswerten */
  let ownBack = false;
  const showLauncher = () => {
    launcherOpen = true;
    launcher.hidden = false;
    startBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('launcher-open');
    history.pushState({ launcher: 1 }, '');
  };
  const hideLauncher = () => {
    if (!launcherOpen) return;
    launcherOpen = false;
    launcher.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
    root.classList.remove('launcher-open');
  };
  /** sofort zu (damit nichts mehr hineintippt), Verlaufseintrag hinterher abbauen */
  const closeLauncher = () => {
    if (!launcherOpen) return;
    hideLauncher();
    if (history.state?.launcher) {
      ownBack = true;
      history.back();
    }
  };
  startBtn.addEventListener('click', () => {
    ctx.haptic('tap');
    ctx.sfx.tick();
    if (launcherOpen) closeLauncher();
    else showLauncher();
  });
  // Tipp außerhalb schließt; der Tipp selbst geht trotzdem durch (z. B. auf die Tastatur)
  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target as Element;
      // Tray-Kacheln öffnen selbst (und übernehmen dabei den Verlaufseintrag des Launchers)
      if (launcherOpen && !launcher.contains(t) && !startBtn.contains(t) && !t.closest?.('.tray-app')) closeLauncher();
    },
    { capture: true },
  );

  let active: (typeof mounted)[number] | null = null;
  /** von hier wurde das Fenster geöffnet: danach kommt der Fokus dorthin zurück */
  let opener: HTMLElement | null = null;
  const showSheet = (m: (typeof mounted)[number]) => {
    for (const x of mounted) x.panel.hidden = x !== m;
    active = m;
    setText(sheetIcon, glyph(m.tab.icon));
    sheetIcon.className = `app-tile tile-${m.tab.id}`;
    setText(sheetTitle, m.tab.label);
    sheet.hidden = false;
    root.classList.add('sheet-open');
    // Hintergrund für Tastatur und Screenreader stilllegen, Fokus ins Fenster
    for (const el of background) el.inert = true;
    m.tab.onShow?.();
    m.tab.render();
    sheetBody.scrollTop = 0;
    sheetClose.focus({ preventScroll: true });
  };
  const hideSheet = () => {
    if (!active) return;
    sheet.hidden = true;
    root.classList.remove('sheet-open');
    for (const el of background) el.inert = false;
    // Launcher-Knopf ist nach dem Schließen unsichtbar: dann zum Start-Knopf
    const back = opener && opener.isConnected && opener.getClientRects().length ? opener : startBtn;
    back.focus({ preventScroll: true });
    active = null;
  };
  // Android-Zurück schließt das Fenster: beim Öffnen einen Verlaufseintrag anlegen
  const closeSheet = () => {
    if (active && history.state?.sheet === active.tab.id) history.back();
    else hideSheet();
  };
  // Nach Neuladen kann noch ein alter Fenster-Eintrag im Verlauf stehen: neutralisieren
  if (history.state?.sheet || history.state?.launcher) history.replaceState(null, '');
  window.addEventListener('popstate', () => {
    if (ownBack) {
      ownBack = false;
      return;
    }
    hideLauncher();
    hideSheet();
  });
  const openApp = (m: (typeof mounted)[number], from: HTMLElement) => {
    opener = from;
    ctx.haptic('tap');
    ctx.sfx.tick();
    // aus dem Launcher: dessen Verlaufseintrag wird zum Fenster-Eintrag (ein Zurück schließt das Fenster)
    if (launcherOpen && history.state?.launcher) history.replaceState({ sheet: m.tab.id }, '');
    else if (!active) history.pushState({ sheet: m.tab.id }, '');
    hideLauncher();
    showSheet(m);
  };
  for (const m of mounted) {
    m.btn.addEventListener('click', () => openApp(m, m.btn));
    m.trayBtn.addEventListener('click', () => openApp(m, m.trayBtn));
  }
  sheetClose.addEventListener('click', closeSheet);
  // Esc schließt das Fenster, bevor die Panik-Taste es abfängt
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      if (launcherOpen) {
        e.preventDefault();
        closeLauncher();
      } else if (active) {
        e.preventDefault();
        closeSheet();
      }
    },
    { capture: true },
  );

  root.replaceChildren(header, monitorArea, deskbar, desk.keyboard, sheet, pager.el, toaster.el, fx.el);
  const background = [header, monitorArea, deskbar, desk.keyboard];

  // Toasts enden über der Tastatur
  const kbHeight = () => root.style.setProperty('--kb-h', `${desk.keyboard.offsetHeight}px`);
  kbHeight();
  if (typeof ResizeObserver === 'function') new ResizeObserver(kbHeight).observe(desk.keyboard);

  // --- Bildschirm-Effekte über Spielereignisse ---
  const blink = () => {
    led.classList.remove('blink');
    void led.offsetWidth;
    led.classList.add('blink');
  };
  const wobble = () => {
    juice(monitor, WOBBLE, 420);
    blink();
  };
  bus.on('milestone', ({ owned }) => owned > 1 && wobble());
  bus.on('upgrade', wobble);
  bus.on('eventIncoming', blink);

  let lastConfetti = 0;
  const confettiAt = (n: number) => {
    const s = fx.rel(screen);
    fx.confetti(s.x + s.w / 2, s.y + s.h * 0.55, n);
  };
  bus.on('achievement', () => {
    // mehrere auf einmal: einmal Konfetti reicht
    const now = performance.now();
    if (now - lastConfetti < 800) return;
    lastConfetti = now;
    confettiAt(12);
  });
  /** gezeigtes System; weicht die Wahl davon ab, startet der Rechner neu, sobald kein Fenster mehr offen ist */
  let shownOs: OsId | null = null;
  /** Neustart läuft: die Optik springt erst um, wenn das Bild dunkel ist */
  let osSwap = 0;
  const applyOs = (os: OsId) => {
    shownOs = os;
    document.documentElement.dataset.os = os;
  };
  // „Have you tried turning it off and on again?“ Bild aus, kurz dunkel, wieder an (Kündigen, anderes System)
  const restart = () => {
    closeLauncher();
    // Sprechblasen aus den Einstellungen gehören zum alten Bild
    for (const q of document.querySelectorAll('.quip')) q.remove();
    screen.classList.remove('crt-restart');
    void screen.offsetWidth;
    screen.classList.add('crt-restart');
    clearTimeout(osSwap);
    osSwap = window.setTimeout(() => {
      osSwap = 0;
      applyOs(activeOs(ctx.state));
    }, OS_SWAP_MS);
  };
  bus.on('jobQuit', () => {
    if (active) closeSheet();
    restart();
    setTimeout(() => confettiAt(20), 900);
  });
  screen.addEventListener('animationend', (e) => {
    if (e.animationName === 'crt-restart') screen.classList.remove('crt-restart');
  });

  /** Punkte: an der App im Launcher und als Kachel im Tray (Start bleibt ohne: der Tray zeigt schon alles) */
  const mark = (btn: HTMLElement, trayBtn: HTMLElement, level: number) => {
    for (const el of [btn, trayBtn]) {
      setFlag(el, 'has-badge', level > 0);
      setFlag(el, 'badge-strong', level > 1);
    }
    if (trayBtn.hidden !== (level === 0)) trayBtn.hidden = level === 0;
  };
  let clockMinute = -1;

  return {
    start(open = false) {
      desk.start(open);
    },
    render() {
      const s = ctx.state;
      // Büro-Stil der Firma: Wand und Schreibtisch; die Statusleiste nimmt die neue Wandfarbe an (bei Licht an)
      const office = companyOf(s.prestige.company).office;
      const officeKey = `${office}|${!!s.upgrades.basement}`;
      if (wallKeyShown !== officeKey) {
        wallKeyShown = officeKey;
        document.documentElement.dataset.office = office;
        setFlag(document.documentElement, 'basement', !!s.upgrades.basement);
        const wall = themeLight();
        if (wall && !root.classList.contains('afk')) setThemeColor(wall);
      }
      // nur neu zeichnen, wenn sich Auswahl, Firma oder Freischaltungen geändert haben (läuft jeden Frame)
      const wallSig = `${s.settings.wallpaper}|${s.prestige.company}|${achievementCount(s)}`;
      if (wallSig !== wallChecked) {
        wallChecked = wallSig;
        wallKey = paintWall(wallpaper, s, s.settings.wallpaper, wallKey);
      }
      const shown = formatNumber(s.tickets);
      if (tickets.textContent !== shown) {
        // nur bei anderer Länge neu messen (sonst jeden Frame ein Reflow)
        const relayout = shown.length !== (tickets.textContent ?? '').length;
        setText(tickets, shown);
        if (relayout) fitCounter();
      }
      const host = companyOf(s.prestige.company).host;
      setText(promptUser, `root@${host}`);
      setText(rate, `+${formatRate(productionPerSec(s))}/s`);
      if (root.dataset.taskbar !== s.settings.taskbar) root.dataset.taskbar = s.settings.taskbar;
      // Betriebssystem (nur Optik, main.css unter html[data-os=…]); an <html> wie der Büro-Stil.
      // Andere Wahl im System-Tab: Neustart erst, wenn die Einstellungen zu sind
      const os = activeOs(s);
      if (shownOs === null) applyOs(os);
      else if (os !== shownOs && !osSwap && !active) {
        restart();
        bus.emit('osChanged', { os });
      }
      // Uhr nur, wenn eine neue Minute angefangen hat (render läuft jeden Frame)
      const minute = Math.floor(Date.now() / 60_000);
      if (minute !== clockMinute) {
        clockMinute = minute;
        const now = new Date();
        setText(clockH, String(now.getHours()).padStart(2, '0'));
        setText(clockM, String(now.getMinutes()).padStart(2, '0'));
      }
      // Incident, Dialog, Monitor oder Licht aus: Launcher zu
      if (launcherOpen && gameBlocked()) closeLauncher();
      for (const m of mounted) mark(m.btn, m.trayBtn, m.tab.badge?.() ?? 0);
      const fill = Math.min(1, trashCount / TRASH_FULL);
      trash.style.setProperty('--fill', fill.toFixed(2));
      trashTray.style.setProperty('--fill', fill.toFixed(2));
      mark(trash, trashTray, fill >= 1 ? 1 : 0);
      pager.render();
      props.render();
      desk.render(s);
      // Keller-Upgrade: Ziegelwand für jede Firma (an <html>, damit auch Incident-Hintergrund und Statusleiste sie kennen)
      setFlag(document.documentElement, 'basement', !!s.upgrades.basement);
      setFlag(monitor, 'frozen', !!s.upgrades.freeze);
      setFlag(monitor, 'pro', !!s.upgrades.monitor2);
      setText(brand, `${s.upgrades.monitor2 ? 'HYT-3000 PRO' : 'HYT-2000'}${s.upgrades.smartoffice ? ' smart' : ''}`);
      // Smart-Office-Bridge: Netzschalter mit blauem Leuchtring
      setFlag(root, 'smart', !!s.upgrades.smartoffice);

      // Boost-Chips: nur neu bauen, wenn sich die Menge ändert
      const buffs = s.buffs;
      const sig = buffs.map((b) => b.id).join();
      if (sig !== buffSig) {
        buffSig = sig;
        // Name + Faktor; die Restzeit läuft als Füllstand leer (kürzer als Sekunden, passt auch auf schmale Handys)
        buffChips = buffs.map((b) =>
          h('span', { class: `buff ${b.mult >= 1 ? 'buff-good' : 'buff-bad'}`, title: `${Math.ceil(b.remainingMs / 1_000)} s` }, [
            h('span', { class: 'buff-name', text: BUFF_LABELS[b.id] ?? b.id }),
            // Espresso hat keinen Faktor: der Chip sagt, was zu tun ist
            h('span', { class: 'buff-mult', text: b.id === 'espresso' ? ' · halten' : ` ×${b.mult}` }),
          ]),
        );
        buffTotal = buffs.map((b) => b.remainingMs);
        buffsEl.replaceChildren(...buffChips);
        // nur der neueste Chip passt an die Wand, die übrigen als „+n“
        buffsEl.dataset.more = buffs.length > 1 ? `+${buffs.length - 1}` : '';
        setFlag(screen, 'brake', buffs.some((b) => b.mult < 1));
      }
      // Wirkung am Ort zeigen: schnellere Produktion leuchtet an der Rate, schnelleres Tippen an der Tastatur
      setFlag(root, 'boost-prod', buffs.some((b) => b.target === 'prod' && b.mult > 1));
      setFlag(root, 'boost-click', buffs.some((b) => b.target === 'click' && (b.mult > 1 || b.id === 'espresso')));
      // Aufgabe vom Chef
      const boss = s.boss;
      bossChip.hidden = !boss.kind;
      if (boss.kind) {
        const p = Math.min(boss.target, bossProgress(s));
        const fmt = (n: number) => (boss.kind === 'earn' ? formatNumber(n) : String(Math.floor(n)));
        setText(bossChip, `☑︎ ${fmt(p)}/${fmt(boss.target)}`);
        bossChip.setAttribute('aria-label', `Aufgabe vom Chef: ${boss.text}`);
      }
      buffs.forEach((b, i) => {
        const chip = buffChips[i];
        if (!chip) return;
        // kurz vor Schluss: sichtbar, dass es gleich vorbei ist
        setFlag(chip, 'ending', b.remainingMs < 5_000);
        buffTotal[i] = Math.max(buffTotal[i] ?? 0, b.remainingMs);
        chip.style.setProperty('--left', (b.remainingMs / (buffTotal[i] || 1)).toFixed(3));
        chip.title = `noch ${Math.ceil(b.remainingMs / 1_000)} s`;
      });
      active?.tab.render();
    },
    popCounter() {
      juice(tickets, POP, 320);
    },
    toast: toaster.show,
  };
}
