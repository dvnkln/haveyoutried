import { INCIDENTS, type IncidentId } from '../../config';
import { DONE_LABELS, INCIDENT_BRIEF, INCIDENT_TEXT, RUNBOOK_GO, TAKE_LABELS, WIKI_EDITED } from '../../content/incidents';
import { bus } from '../../core/bus';
import { rates } from '../../core/economy';
import { endIncident, isSolved, resolveIncident, setForgivenMistakes } from '../../core/incidents';
import { pad2 as p2, pick } from '../../util';
import type { AppContext } from '../app';
import { armButton, h, setText } from '../dom';
import { describeEffect } from '../pager';
import { raidGame } from './raid';
import { servicesGame } from './services';
import { spamGame } from './spam';
import { logGrepGame } from './loggrep';
import { networkGame } from './network';
import { patchGame } from './patch';
import { diskFullGame } from './diskfull';
import { certsGame } from './certs';
import { upsGame } from './ups';
import { coolingGame } from './cooling';
import { rackGame } from './rack';
import { untangleGame } from './untangle';
import { tapesGame } from './tapes';
import { jamGame } from './jam';
import type { Minigame } from './types';

const GAMES: Record<IncidentId, () => Minigame> = {
  raid: raidGame,
  spam: spamGame,
  services: servicesGame,
  loggrep: logGrepGame,
  network: networkGame,
  patch: patchGame,
  diskfull: diskFullGame,
  certs: certsGame,
  ups: upsGame,
  cooling: coolingGame,
  rack: rackGame,
  untangle: untangleGame,
  tapes: tapesGame,
  jam: jamGame,
};

/** Logo des Wikis: eine verknotete Schleife (Konfusion eben) */
const wikiLogo = () => {
  const el = h('span', { class: 'wiki-logo', 'aria-hidden': 'true' });
  el.innerHTML = WIKI_LOGO;
  return el;
};
const WIKI_LOGO =
  '<svg viewBox="0 0 24 24"><path d="M4 16c3-9 9 4 13-5 2-5-4-7-6-3s3 9 9 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>';
const hhmmss = (d = new Date()) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
/** feste interne Adresse je Host (sieht echt aus, ändert sich nicht zwischen Alarmen) */
const hostIp = (host: string) => {
  let x = 7;
  for (const c of host) x = (x * 31 + c.charCodeAt(0)) % 65_521;
  return `10.0.${(x >> 8) % 250}.${(x % 250) + 2}`;
};

type RowState = 'crit' | 'warn' | 'ok' | 'esc';
const STATE_LABEL: Record<RowState, string> = { crit: 'CRITICAL', warn: 'WARNING', ok: 'OK', esc: 'ESCALATED' };

/** Eine Zeile der Service-Liste: Status-Badge, Host/Service, Dauer, Plugin-Ausgabe */
const monRow = (state: RowState, host: string, service: string, output: string, since: string, main = false) =>
  h('div', { class: `mon-row s-${state}${main ? ' main' : ''}` }, [
    h('span', { class: 'mon-state' }, [h('b', { text: STATE_LABEL[state] }), h('small', { text: since })]),
    h('span', { class: 'mon-what' }, [
      h('span', { class: 'mon-svc' }, [h('b', { text: service }), ` auf ${host}`]),
      h('span', { class: 'mon-out', text: output }),
    ]),
  ]);

/** Zähler oben: so sehen Monitoring-Startseiten immer aus */
const summary = (crit: number, warn: number) =>
  h('div', { class: 'mon-summary' }, [
    h('span', { class: `mon-chip s-crit${crit ? '' : ' zero'}`, text: `${crit} Critical` }),
    h('span', { class: 'mon-chip s-warn', text: `${warn} Warning` }),
    h('span', { class: 'mon-chip s-ok', text: '147 OK' }),
    h('span', { class: 'mon-chip s-unk', text: '1 Unknown (seit 2019)' }),
  ]);

/**
 * Vollbild-Overlay für Incidents: Monitoring-Alarm (Vorwarnung) → Minispiel → RECOVERY.
 * Eigene rAF-Schleife: pausiert mit dem Tab, damit Hintergrundzeit nicht zählt.
 */
export function mountIncidentOverlay(ctx: AppContext): void {
  // Läuft direkt im Röhrenmonitor auf dem Tisch: Monitoring-Oberfläche füllt den Bildschirm, der Rest wird dunkel
  const clock = h('span', { class: 'mon-clock' });
  const body = h('div', { class: 'mon-body' });
  const root = h('div', { class: 'incident', hidden: '', role: 'alertdialog', 'aria-modal': 'true' }, [
    h('div', { class: 'mon-top' }, [
      h('span', { class: 'mon-logo', text: 'nag' }),
      h('span', { class: 'mon-logo-2', text: 'mon' }),
      h('span', { class: 'mon-nav', text: 'Probleme' }),
      clock,
      h('span', { class: 'mon-user', text: 'you' }),
    ]),
    body,
  ]);
  const tickClock = () => {
    const d = new Date();
    setText(clock, `${p2(d.getHours())}:${p2(d.getMinutes())}`);
  };
  /** Inhalt im Monitor tauschen (Alarm → Spiel → Ergebnis) */
  const screen = (state: 'crit' | 'ok' | 'esc' | 'wiki', ...children: HTMLElement[]) => {
    root.dataset.state = state;
    body.replaceChildren(...children);
    body.scrollTop = 0;
    for (const c of children) moreObserver?.observe(c);
  };
  /** steht unter dem klebenden Knopf noch Text? Nur dann bekommt er den weichen Übergang nach oben */
  const markMore = () => body.classList.toggle('more', body.scrollHeight - body.scrollTop - body.clientHeight > 2);
  body.addEventListener('scroll', markMore, { passive: true });
  // misst auch, sobald der Alarm sichtbar wird (vorher 0 × 0) und wenn Schrift oder Inhalt die Höhe ändern
  const moreObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(markMore) : null;
  moreObserver?.observe(body);
  const app = document.getElementById('app');
  // Licht des Monitors an der Wand; die Abdunklung selbst ist eine Maske mit Loch in Monitorform
  const spot = h('div', { class: 'inc-spot', 'aria-hidden': 'true' });
  const dim = h('div', { class: 'inc-dim', 'aria-hidden': 'true' });
  /** Wechsel in/aus dem Monitor; ein späterer Wechsel macht einen noch wartenden ungültig */
  let moveSeq = 0;
  /**
   * Alarm und Ergebnis im Monitor (Rest abgedunkelt), das Spiel selbst bildschirmfüllend.
   * In den Monitor geht es erst, wenn die Abdunklungs-Maske fertig geladen ist (sonst blitzt der Raum kurz hell auf).
   */
  const inMonitor = (on: boolean): Promise<boolean> => {
    const seq = ++moveSeq;
    const screenEl = document.querySelector<HTMLElement>('#app .screen');
    if (on && screenEl) {
      return placeSpot().then(() => {
        if (seq !== moveSeq) return false;
        enterMonitor(screenEl);
        return true;
      });
    }
    if (root.parentElement !== document.body) document.body.append(root);
    spot.remove();
    dim.remove();
    return Promise.resolve(true);
  };
  const enterMonitor = (screenEl: HTMLElement) => {
    {
      // wie ein Programm, das auf Vollbild geht: wächst aus dem offenen Fenster heraus
      const from = screenEl.querySelector<HTMLElement>('.work')?.getBoundingClientRect();
      const to = screenEl.getBoundingClientRect();
      if (from && to.width && to.height) {
        root.style.setProperty('--max-x', `${from.left - to.left}px`);
        root.style.setProperty('--max-y', `${from.top - to.top}px`);
        root.style.setProperty('--max-sx', (from.width / to.width).toFixed(3));
        root.style.setProperty('--max-sy', (from.height / to.height).toFixed(3));
      }
      if (root.parentElement !== screenEl) screenEl.append(root);
      document.body.append(dim, spot);
    }
  };
  /**
   * SVG-Gegenstand (Telefon) als Maskenform: nur was wirklich zu sehen ist. In der Maske gilt das
   * Seiten-CSS nicht, darum werden Sichtbarkeit, Füllung und Linien aus den berechneten Stilen übernommen
   * (sonst tauchen nicht gekaufte Modelle/Headset auf und Linien mit var(--ink) fehlen).
   */
  const svgCover = (svg: SVGSVGElement) => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const orig = [...svg.querySelectorAll('*')];
    const dup = [...copy.querySelectorAll('*')];
    orig.forEach((o, i) => {
      const d = dup[i];
      if (!d) return;
      const cs = getComputedStyle(o);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
        d.remove();
        return;
      }
      d.setAttribute('fill', cs.fill);
      d.setAttribute('stroke', cs.stroke);
      d.setAttribute('stroke-width', cs.strokeWidth);
      const t = cs.transform;
      if (t && t !== 'none') d.setAttribute('style', `transform:${t};transform-box:${cs.transformBox};transform-origin:${cs.transformOrigin}`);
      else d.removeAttribute('style');
      d.removeAttribute('class');
    });
    const sb = svg.getBoundingClientRect();
    const n = (v: number) => v.toFixed(1);
    return `<svg x="${n(sb.left)}" y="${n(sb.top)}" width="${n(sb.width)}" height="${n(sb.height)}" viewBox="${svg.getAttribute('viewBox') ?? ''}" overflow="visible">${copy.innerHTML}</svg>`;
  };
  /** Kasten (Post-it, Ente): echte Größe, Ecken, Drehung und Skalierung aus dem berechneten Stil */
  const boxCover = (el: HTMLElement, cs: CSSStyleDeclaration, b: DOMRect) => {
    const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    const deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const sx = Math.hypot(m.a, m.b);
    const sy = Math.hypot(m.c, m.d);
    const ew = el.offsetWidth * sx;
    const eh = el.offsetHeight * sy;
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const r = (v: string) => Math.min(parseFloat(v) || 0, ew / 2, eh / 2);
    const [tl, tr, br, bl] = [r(cs.borderTopLeftRadius), r(cs.borderTopRightRadius), r(cs.borderBottomRightRadius), r(cs.borderBottomLeftRadius)];
    const x = cx - ew / 2;
    const y = cy - eh / 2;
    const n = (v: number) => v.toFixed(1);
    const d = `M${n(x + tl)} ${n(y)}H${n(x + ew - tr)}A${n(tr)} ${n(tr)} 0 0 1 ${n(x + ew)} ${n(y + tr)}V${n(y + eh - br)}A${n(br)} ${n(br)} 0 0 1 ${n(x + ew - br)} ${n(y + eh)}H${n(x + bl)}A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + eh - bl)}V${n(y + tl)}A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}Z`;
    return `<path d="${d}" transform="rotate(${n(deg)} ${n(cx)} ${n(cy)})"/>`;
  };
  /**
   * Ausgespart werden Monitor und Fuß. Was davor steht (Telefon, Post-its), bleibt dunkel:
   * es wird in der Maske wieder aufgemalt, in seiner echten Form.
   */
  let maskSeq = 0;
  const placeSpot = (): Promise<void> => {
    const monitor = document.querySelector<HTMLElement>('#app .monitor');
    if (!monitor) return Promise.resolve();
    const r = monitor.getBoundingClientRect();
    Object.assign(spot.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    // wie .inc-dim (inset: 0): ohne Scrollleiste, sonst wird die Maske gestaucht
    const w = document.documentElement.clientWidth;
    const hgt = document.documentElement.clientHeight;
    const n = (v: number) => v.toFixed(1);
    // abgerundetes Rechteck als Pfad (oben/unten eigene Radien)
    const rounded = (x: number, y: number, rw: number, rh: number, top: number, bottom: number) =>
      `M${n(x + top)} ${n(y)}H${n(x + rw - top)}A${top} ${top} 0 0 1 ${n(x + rw)} ${n(y + top)}V${n(y + rh - bottom)}A${bottom} ${bottom} 0 0 1 ${n(x + rw - bottom)} ${n(y + rh)}H${n(x + bottom)}A${bottom} ${bottom} 0 0 1 ${n(x)} ${n(y + rh - bottom)}V${n(y + top)}A${top} ${top} 0 0 1 ${n(x + top)} ${n(y)}Z`;
    let hole = rounded(r.left, r.top, r.width, r.height, 12, 8);
    // Fuß (::after unter dem Gehäuse): nur der Teil unterhalb, damit sich die Löcher nicht überlappen
    const foot = getComputedStyle(monitor, '::after');
    const cs = getComputedStyle(monitor);
    const bl = parseFloat(cs.borderLeftWidth) || 0;
    const bb = parseFloat(cs.borderBottomWidth) || 0;
    const fx = r.left + bl + (parseFloat(foot.left) || 0);
    const fw =
      parseFloat(foot.width) +
      (foot.boxSizing === 'border-box' ? 0 : (parseFloat(foot.borderLeftWidth) || 0) + (parseFloat(foot.borderRightWidth) || 0));
    const fBottom = r.bottom - bb - (parseFloat(foot.bottom) || 0);
    if (fw > 0 && fBottom > r.bottom + 1) hole += rounded(fx, r.bottom, fw, fBottom - r.bottom, 0, Math.min(6, fBottom - r.bottom));
    // Gegenstände vor dem Monitor (höherer z-index), die ins Loch ragen
    const mz = parseInt(cs.zIndex, 10) || 0;
    const covers: string[] = [];
    for (const el of monitor.parentElement?.children ?? []) {
      if (el === monitor || !(el instanceof HTMLElement)) continue;
      const ecs = getComputedStyle(el);
      if (ecs.display === 'none' || ecs.visibility === 'hidden' || (parseInt(ecs.zIndex, 10) || 0) <= mz) continue;
      const b = el.getBoundingClientRect();
      if (b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > fBottom) continue;
      const svg = el.querySelector<SVGSVGElement>(':scope > svg');
      if (svg) covers.push(svgCover(svg));
      else covers.push(boxCover(el, ecs, b));
    }
    const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><path fill-rule="evenodd" d="M0 0H${w}V${hgt}H0Z${hole}"/>${covers.join('')}</svg>`;
    const src = `data:image/svg+xml,${encodeURIComponent(mask)}`;
    // erst dekodieren, dann setzen: sonst ist die Abdunklung einen Moment weg (heller Blitz)
    const seq = ++maskSeq;
    const img = new Image();
    img.src = src;
    // höchstens kurz warten: hängt das Dekodieren, geht es trotzdem weiter (lieber einmal blinken als hängen)
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 150));
    return Promise.race([img.decode().catch(() => {}), timeout])
      .then(() => {
        if (seq !== maskSeq) return;
        dim.style.maskImage = `url("${src}")`;
        dim.style.setProperty('-webkit-mask-image', `url("${src}")`);
      });
  };
  // neu berechnen, wenn sich Fenster oder Schreibtisch ändern (gebündelt auf einen Frame)
  let spotFrame = 0;
  const queueSpot = () => {
    if (!dim.isConnected || spotFrame) return;
    spotFrame = requestAnimationFrame(() => {
      spotFrame = 0;
      void placeSpot();
    });
  };
  window.addEventListener('resize', queueSpot);
  const area = document.querySelector<HTMLElement>('#app .monitor-area');
  if (area && typeof ResizeObserver !== 'undefined') new ResizeObserver(queueSpot).observe(area);
  // Gegenstände vor dem Monitor, die sich bewegen (Telefon klingelt, neues Teil springt rein): Maske läuft mit
  let moving = 0;
  const follow = () => {
    queueSpot();
    if (moving > 0 && dim.isConnected) requestAnimationFrame(follow);
  };
  /** nur endliche Bewegungen außerhalb des Monitors (Dauerblinken der Rundumleuchte bewegt nichts) */
  const tracked = (e: AnimationEvent) =>
    !(e.target as Element).closest('.monitor') && !getComputedStyle(e.target as Element).animationIterationCount.includes('infinite');
  area?.addEventListener('animationstart', (e) => {
    if (!tracked(e)) return;
    if (moving++ === 0) follow();
  });
  const stop = (e: AnimationEvent) => {
    if (!tracked(e)) return;
    moving = Math.max(0, moving - 1);
    queueSpot();
  };
  area?.addEventListener('animationend', stop);
  area?.addEventListener('animationcancel', stop);
  /** alles außer dem Monitor-Bildschirm stilllegen */
  let frozen: HTMLElement[] = [];
  // Uhr läuft mit, solange der Monitor nagmon zeigt
  let clockTimer = 0;
  const show = () => {
    tickClock();
    clearInterval(clockTimer);
    clockTimer = window.setInterval(tickClock, 5_000);
    // offenes App-Fenster zu, sonst verdeckt es den Monitor
    const sheet = document.querySelector<HTMLElement>('.sheet');
    if (sheet && !sheet.hidden) document.querySelector<HTMLElement>('.sheet-close')?.click();
    root.classList.remove('no-grow');
    void inMonitor(true).then((ok) => ok && reveal());
  };
  /** Alarm sichtbar: alles außer dem Monitor stilllegen */
  const reveal = () => {
    root.hidden = false;
    frozen = [];
    // vom Bildschirm aus nach oben: jeweils die Geschwister stilllegen
    for (let el: HTMLElement | null = root; el && el !== app && el.parentElement; el = el.parentElement) {
      for (const sib of el.parentElement.children) {
        if (sib !== el && sib instanceof HTMLElement && !sib.inert) {
          sib.inert = true;
          frozen.push(sib);
        }
      }
    }
    app?.classList.add('incident-on');
  };
  const hide = () => {
    moveSeq++;
    clearInterval(clockTimer);
    root.hidden = true;
    body.replaceChildren();
    for (const el of frozen) el.inert = false;
    frozen = [];
    app?.classList.remove('incident-on');
    spot.remove();
    dim.remove();
    moving = 0;
  };

  const run = (id: IncidentId) => {
    const text = INCIDENT_TEXT[id];
    const game = GAMES[id]();
    // Service Mesh (Kubernetes Stufe 3): Selbstheilung verschafft 30 % mehr Zeit.
    // Nicht bei Spielen ums Durchhalten (survival: RAID, Zertifikate, Klima): mehr Zeit wäre dort eine Strafe.
    const cfg: { durationMs: number; survival?: boolean } = INCIDENTS.games[id];
    const duration = cfg.durationMs * (ctx.state.upgrades['k8s-3'] && !cfg.survival ? 1.3 : 1);
    // Doku gefunden (Server unterm Tisch Stufe 3): ein Fehlgriff zählt nicht, weder in der Wertung noch als Zeitstrafe
    const forgive = ctx.state.upgrades['undertable-3'] ? 1 : 0;
    setForgivenMistakes(forgive);
    let forgiveTimeLeft = forgive;

    // --- Phase 1: Monitoring-Alarm, wartet auf manuelles Übernehmen (nur die Meldung, die Aufgabe steht im Runbook) ---
    const brief = INCIDENT_BRIEF[id];
    const take = h('button', { class: 'btn btn-danger nag-ack nag-take', type: 'button', text: pick(TAKE_LABELS) });
    const alert = h('div', { class: 'mon-page mon-compact' }, [
      summary(1, 2),
      h('div', { class: 'mon-table' }, [monRow('crit', text.host, text.service, text.info, '0m 03s', true)]),
      h('div', { class: 'mon-detail' }, [
        h('div', { class: 'nag-title', text: `** PROBLEM: ${text.host}/${text.service} is CRITICAL **` }),
        h('div', { class: 'nag-facts', text: `${hostIp(text.host)} · HARD 3/3 · ${hhmmss()}` }),
        h('div', { class: 'nag-output' }, brief.detail.map((l) => h('div', { text: l }))),
        h('div', { class: 'nag-assign', text: 'Assigned to: you' }),
        take,
      ]),
    ]);
    root.classList.remove('playing');
    screen('crit', alert);
    show();
    ctx.sfx.alarm();
    ctx.haptic('milestone');
    // Button erst nach kurzer Sperre aktiv (gegen Fehlgriffe beim Dauertippen)
    armButton(take, INCIDENTS.ackArmMs);
    // Alarm wiederholen, bis jemand übernimmt
    const nag = setInterval(() => {
      // im Dunkeln (niemand da) piept es nicht die ganze Nacht
      if (!document.hidden && !app?.classList.contains('afk')) ctx.sfx.alarm();
    }, INCIDENTS.alarmRepeatMs);

    let phase: 'warn' | 'ready' | 'play' | 'done' = 'warn';
    let readyLeft = 0;
    let lastCount = -1;
    const readyEl = h('div', { class: 'inc-ready', 'aria-live': 'assertive' });
    let elapsed = 0;
    let penalty = 0;
    let finished = false;
    let last = performance.now();

    // --- Phase 2: Spiel ---
    const bar = h('div', { class: 'inc-bar' }, [h('div', { class: 'inc-bar-fill' })]);
    const status = h('div', { class: 'inc-status' });
    const stage = h('div', { class: 'inc-stage' });
    const gameRoot = h('div', { class: 'inc-game-root' });
    stage.append(gameRoot);
    /** Spielfeld passt sich dem Monitor an: zu hohe Spiele werden verkleinert statt den Monitor zu strecken */
    const fit = () => {
      if (!gameRoot.isConnected) return;
      gameRoot.style.zoom = '';
      // mehrfach messen: gestreckte Flex-Inhalte ändern ihre Höhe mit dem Zoom
      let z = 1;
      for (let i = 0; i < 4; i++) {
        const need = gameRoot.scrollHeight;
        const avail = gameRoot.clientHeight;
        if (need <= avail + 1) break;
        z = Math.max(0.45, z * (avail / need) * 0.99);
        gameRoot.style.zoom = String(z);
      }
    };
    window.addEventListener('resize', fit);

    // --- Phase 1b: Runbook im Firmen-Wiki, ohne Zeitdruck; erst der Knopf startet den Countdown ---
    const showRunbook = () => {
      clearInterval(nag);
      root.classList.add('playing');
      inMonitor(false);
      const rb = brief.runbook;
      // kurz gesperrt: ein doppelter Tipp auf „Übernehmen“ soll das Runbook nicht gleich überspringen
      const go = h('button', { class: 'btn btn-primary nag-ack wiki-go', type: 'button', text: pick(RUNBOOK_GO) });
      armButton(go, INCIDENTS.runbookArmMs);
      go.addEventListener('click', () => {
        ctx.sfx.tick();
        startGame();
        last = performance.now();
        requestAnimationFrame(frame);
      });
      screen(
        'wiki',
        h('div', { class: 'wiki' }, [
          h('div', { class: 'wiki-bar' }, [
            wikiLogo(),
            h('b', { text: 'Konfusion' }),
            h('span', { class: 'wiki-crumb', text: 'IT › Runbooks' }),
          ]),
          h('article', { class: 'wiki-page' }, [
            h('h2', { class: 'wiki-title', text: `Runbook: ${rb.title}` }),
            h('div', { class: 'wiki-meta', text: pick(WIKI_EDITED) }),
            h('div', { class: 'wiki-alert', text: `Ausgelöst von: ${text.host}/${text.service}` }),
            h('ol', { class: 'wiki-steps' }, rb.steps.map((st) => h('li', { text: st }))),
            h('div', { class: 'wiki-warn' }, [h('b', { text: 'Achtung: ' }), rb.warn]),
            h('div', { class: 'wiki-go-row' }, [go, h('small', { text: `Danach: ${INCIDENTS.readyMs / 1_000} Sekunden Countdown, dann läuft die Uhr.` })]),
            h('div', { class: 'wiki-comments' }, [
              h('div', { class: 'wiki-ch', text: '1 Kommentar' }),
              h('div', { class: 'wiki-comment' }, [
                h('span', { class: 'wiki-avatar', 'aria-hidden': 'true', text: rb.note.who.slice(0, 1) }),
                h('span', {}, [h('b', { text: rb.note.who }), h('span', { text: rb.note.text })]),
              ]),
            ]),
          ]),
        ]),
      );
      go.focus({ preventScroll: true });
    };

    const startGame = () => {
      elapsed = 0;
      // erst Countdown: Spielfeld sichtbar, aber eingefroren
      phase = 'ready';
      readyLeft = INCIDENTS.readyMs;
      screen(
        'crit',
        h('div', { class: 'inc-game' }, [
          h('div', { class: 'inc-head' }, [
            h('span', { class: 'inc-tag', text: 'CRITICAL' }),
            h('span', { class: 'inc-name', text: `${text.host}/${text.service}` }),
            h('span', { class: 'inc-ack', text: 'ACK' }),
          ]),
          bar,
          status,
          // Erinnerung aus dem Runbook (eine Quelle für die Regeln)
          h('div', { class: 'inc-goal', text: brief.runbook.warn }),
          stage,
        ]),
      );
      stage.append(readyEl);
      // eingefroren: auch Tastatur sperren, nicht nur Touch
      gameRoot.inert = true;
      game.mount(gameRoot, {
        finish: () => (finished = true),
        penalize: (ms) => {
          if (forgiveTimeLeft > 0) forgiveTimeLeft--;
          else penalty += ms;
        },
        sfx: ctx.sfx,
        haptic: ctx.haptic,
      });
      requestAnimationFrame(fit);
      // nach Schriftladen und Countdown noch einmal
      setTimeout(fit, 400);
      setTimeout(fit, INCIDENTS.readyMs + 100);
    };

    // --- Phase 3: RECOVERY ---
    const finish = () => {
      phase = 'done';
      const score = game.score();
      const results = resolveIncident(ctx.state, id, score, rates(ctx.state));
      const good = isSolved(score);
      const ack = h('button', { class: 'btn btn-primary nag-ack nag-close', type: 'button', text: pick(good ? DONE_LABELS.good : DONE_LABELS.bad) });
      armButton(ack, INCIDENTS.doneArmMs);
      ack.addEventListener('click', () => {
        window.removeEventListener('resize', fit);
        ctx.sfx.tick();
        hide();
        endIncident();
      });
      const pct = Math.round(score * 100);
      // erst zurück in den Monitor (wenn die Abdunklung bereit ist), dann das Ergebnis zeigen: kein Aufblitzen.
      // Nach dem Vollbild-Spiel kein erneutes Herauswachsen aus dem Programmfenster
      root.classList.add('no-grow');
      void inMonitor(true).then((ok) => {
        if (!ok) return;
        root.classList.remove('playing');
        showOutcome();
      });
      const showOutcome = () => screen(
        good ? 'ok' : 'esc',
        h('div', { class: 'mon-page mon-compact' }, [
          summary(good ? 0 : 1, 2),
          h('div', { class: 'mon-table' }, [
            monRow(good ? 'ok' : 'esc', text.host, text.service, good ? text.okInfo : 'eskaliert an: Kollege', good ? '0m 01s' : '0m 00s', true),
          ]),
          h('div', { class: `mon-detail ${good ? 'nag-recovery' : 'nag-problem'}` }, [
            h('div', {
              class: 'nag-title',
              text: good
                ? `** RECOVERY: ${text.host}/${text.service} is OK **`
                : `** ESCALATION: ${text.host}/${text.service} → Kollege **`,
            }),
            h('div', { class: 'mon-perf' }, [
              h('span', { class: 'nag-key', text: 'Leistung' }),
              h('span', { class: 'mon-perf-bar' }, [h('span', { class: 'mon-perf-fill', style: `width:${pct}%` })]),
              h('b', { text: `${pct} %` }),
            ]),
            h('p', { class: 'nag-comment', text: pick(good ? text.good : text.bad) }),
            ...results.map((r) => h('div', { class: `effect-line mood-${r.mood}`, text: describeEffect(r) })),
            ack,
          ]),
        ]),
      );
      if (good) ctx.sfx.good();
      else ctx.sfx.error();
    };

    const frame = (t: number) => {
      // Hintergrund-Tab: rAF pausiert, große Sprünge nicht mitzählen
      const dt = Math.min(100, Math.max(0, t - last));
      last = t;
      if (phase === 'warn') {
        /* wartet auf „Übernehmen“ */
      } else if (phase === 'ready') {
        readyLeft -= dt;
        const n = Math.ceil(readyLeft / 1_000);
        if (n !== lastCount) {
          lastCount = n;
          setText(readyEl, n > 0 ? String(n) : 'Los!');
          if (n > 0) ctx.sfx.tick();
          else ctx.sfx.unlockPing();
        }
        setText(status, game.status());
        if (readyLeft <= 0) {
          phase = 'play';
          gameRoot.inert = false;
          setTimeout(() => readyEl.remove(), 350);
          readyEl.classList.add('go');
        }
      } else if (phase === 'play') {
        elapsed += dt;
        game.update(dt);
        const used = elapsed + penalty;
        (bar.firstElementChild as HTMLElement).style.transform = `scaleX(${Math.max(0, 1 - used / duration)})`;
        setText(status, game.status());
        if (finished || used >= duration) finish();
      }
      if (phase !== 'done') requestAnimationFrame(frame);
    };
    take.addEventListener('click', () => {
      ctx.sfx.tick();
      showRunbook();
    });
  };

  bus.on('incidentStart', ({ id }) => {
    // nicht über einen offenen Dialog legen: warten, bis er zu ist
    const tryStart = () => {
      if (document.querySelector('dialog[open]')) setTimeout(tryStart, 500);
      else run(id);
    };
    tryStart();
  });
}
