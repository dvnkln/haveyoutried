import { INCIDENTS } from '../../config';
import { CERT_DOMAINS, CERT_SURPRISES } from '../../content/incidents';
import { shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import { termBar } from './term';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.certs;
type Cfg = typeof CFG;

export interface Cert {
  id: number;
  host: string;
  what: string;
  expiredText: string;
  /** Restlaufzeit in Tagen */
  days: number;
  /** Tage pro ms Spielzeit */
  rate: number;
  /** ab dieser Spielzeit sichtbar (0 = von Anfang an) */
  appearsAt: number;
  surprise: boolean;
  expired: boolean;
  /** Zertifikatsdaten fürs Auge: Zwischenzertifikat von Let's Encrypt, Schlüssel, weitere Namen */
  issuer: string;
  key: string;
  /** zusätzliche Namen im Zertifikat (Subject Alternative Names) */
  sans: string[];
}

export type RenewResult = 'started' | 'notdue' | 'busy' | 'hidden';

/** Spiellogik ohne DOM. */
export class CertSim {
  certs: Cert[];
  t = 0;
  expiredCount = 0;
  /** gerade laufender certbot: welches Zertifikat, wie lange noch */
  renewing: { id: number; left: number } | null = null;
  /** „not yet due“ hält certbot kurz auf */
  private stall = 0;
  /** seit dem letzten Abruf neu abgelaufen bzw. fertig erneuert (für Töne und Log) */
  private justExpired: number[] = [];
  private justRenewed: number[] = [];

  constructor(
    private cfg: Cfg = CFG,
    rnd: () => number = Math.random,
  ) {
    const between = (a: number, b: number) => a + rnd() * (b - a);
    const make = (d: (typeof CERT_DOMAINS)[number], i: number, appearsAt: number, surprise: boolean): Cert => {
      // wie bei Let's Encrypt: RSA kommt von R10/R11, ECDSA von E5/E6
      const ec = rnd() < 0.5;
      const issuer = ec ? (rnd() < 0.5 ? 'E5' : 'E6') : rnd() < 0.5 ? 'R10' : 'R11';
      const sub = d.host.split('.')[0]!;
      const sanPick = rnd();
      const sans = sanPick < 0.45 ? [`www.${d.host}`] : sanPick < 0.7 ? [`${sub}2.firma.de`, `${sub}-neu.firma.de`] : [];
      return {
      id: i,
      host: d.host,
      what: d.what,
      expiredText: d.expired,
      days: surprise ? between(cfg.arriveDaysMin, cfg.arriveDaysMax) : between(cfg.startDaysMin, cfg.startDaysMax),
      rate: cfg.maxDays / between(cfg.lifetimeMinMs, cfg.lifetimeMaxMs),
      appearsAt,
      surprise,
      expired: false,
      issuer,
      key: ec ? 'ECDSA P-256' : 'RSA 2048',
      sans,
    };
    };
    const base = shuffle(CERT_DOMAINS, rnd).slice(0, cfg.start);
    const extra = shuffle(CERT_SURPRISES, rnd).slice(0, cfg.arrivals.length);
    this.certs = [
      ...base.map((d, i) => make(d, i, 0, false)),
      ...extra.map((d, j) => make(d, base.length + j, cfg.arrivals[j]!, true)),
    ];
    // Start-Restlaufzeiten gleichmäßig verteilen (je eine aus jedem Abschnitt, gemischt):
    // sonst werden mehrere zugleich fällig und laufen zusammen ab, ohne dass man etwas tun kann
    const n = base.length;
    const slots = shuffle(
      base.map((_, i) => i),
      rnd,
    );
    this.certs.slice(0, n).forEach((c, i) => {
      const lo = cfg.startDaysMin + ((cfg.startDaysMax - cfg.startDaysMin) * slots[i]!) / n;
      c.days = lo + rnd() * ((cfg.startDaysMax - cfg.startDaysMin) / n) * 0.6;
    });
    // Tempo je Zertifikat so wählen, dass die Ablaufzeitpunkte auseinanderliegen
    for (const c of this.certs) this.space(c);
  }

  /** Spielzeit (ms), zu der dieses Zertifikat ohne Eingriff abläuft */
  private expiresAt(c: Cert): number {
    return Math.max(this.t, c.appearsAt) + c.days / c.rate;
  }

  /**
   * Tempo so wählen, dass das Zertifikat möglichst weit entfernt von den anderen abläuft.
   * Sonst holen schnelle die langsamen ein und mehrere laufen zugleich ab: das ist nicht zu schaffen.
   */
  private space(c: Cert): void {
    const others = this.certs.filter((o) => o !== c && !o.expired).map((o) => this.expiresAt(o));
    const { lifetimeMinMs: lo, lifetimeMaxMs: hi, maxDays } = this.cfg;
    const gapOf = (rate: number) => {
      const at = Math.max(this.t, c.appearsAt) + c.days / rate;
      return others.length ? Math.min(...others.map((o) => Math.abs(o - at))) : Infinity;
    };
    // gewürfeltes Tempo behalten, solange es weit genug von den anderen abläuft (bleibt abwechslungsreich);
    // nur wenn es zu dicht wird, das Tempo mit dem größten Abstand nehmen
    if (gapOf(c.rate) >= this.cfg.minGapMs) return;
    let best = c.rate;
    let bestGap = gapOf(c.rate);
    for (let k = 0; k <= 12; k++) {
      const rate = maxDays / (lo + ((hi - lo) * k) / 12);
      const gap = gapOf(rate);
      if (gap > bestGap) {
        bestGap = gap;
        best = rate;
      }
    }
    c.rate = best;
  }

  visible(c: Cert): boolean {
    return this.t >= c.appearsAt;
  }

  get busy(): boolean {
    return this.renewing !== null || this.stall > 0;
  }

  /** Zustand für die Anzeige */
  state(c: Cert): 'hidden' | 'ok' | 'due' | 'crit' | 'expired' | 'renewing' {
    if (!this.visible(c)) return 'hidden';
    if (this.renewing?.id === c.id) return 'renewing';
    if (c.expired) return 'expired';
    if (c.days <= this.cfg.dueDays / 3) return 'crit';
    if (c.days <= this.cfg.dueDays) return 'due';
    return 'ok';
  }

  update(dt: number): void {
    this.t += dt;
    if (this.stall > 0) this.stall = Math.max(0, this.stall - dt);
    for (const c of this.certs) {
      if (!this.visible(c) || c.expired || this.renewing?.id === c.id) continue;
      c.days -= c.rate * dt;
      if (c.days <= 0) {
        c.days = 0;
        c.expired = true;
        this.expiredCount++;
        this.justExpired.push(c.id);
      }
    }
    // erst danach fertig erneuern: das frische Zertifikat verliert in diesem Takt nichts
    if (this.renewing) {
      this.renewing.left -= dt;
      if (this.renewing.left <= 0) {
        const c = this.certs[this.renewing.id]!;
        c.days = this.cfg.maxDays;
        c.expired = false;
        this.space(c);
        this.justRenewed.push(c.id);
        this.renewing = null;
      }
    }
  }

  renew(id: number): RenewResult {
    const c = this.certs[id];
    if (!c || !this.visible(c)) return 'hidden';
    if (this.busy) return 'busy';
    if (!c.expired && c.days > this.cfg.dueDays) {
      this.stall = this.cfg.notDueMs;
      return 'notdue';
    }
    this.renewing = { id, left: this.cfg.renewMs };
    return 'started';
  }

  /** Neuigkeiten seit dem letzten Abruf */
  drain(): { expired: number[]; renewed: number[] } {
    const out = { expired: this.justExpired, renewed: this.justRenewed };
    this.justExpired = [];
    this.justRenewed = [];
    return out;
  }

  score(): number {
    return Math.max(0, 1 - this.expiredCount * this.cfg.expiredPenalty);
  }
}

const days = (d: number) => `${Math.ceil(d)} T`;

/** Kurzform für die Zeile: Aussteller · Schlüssel · weitere Namen (falls vorhanden) */
export const certMeta = (c: Cert): string =>
  [c.issuer, c.key, ...(c.sans.length === 0 ? [] : [c.sans.length === 1 && c.sans[0]!.startsWith('www.') ? '+www' : `+${c.sans.length} SANs`])].join(' · ');

/** Datum wie in der certbot-Ausgabe (YYYY-MM-DD), so viele Tage ab heute */
const isoIn = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

const LOCK =
  '<svg viewBox="0 0 10 12" aria-hidden="true"><rect x="1" y="5" width="8" height="6.4" rx="1.4" fill="currentColor"/><path d="M2.8 5.2V3.6a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

export function certsGame(): Minigame {
  const sim = new CertSim();
  let api: GameApi | null = null;
  const rows: HTMLButtonElement[] = [];
  const pills: HTMLElement[] = [];
  const dayEls: HTMLElement[] = [];
  const fills: HTMLElement[] = [];
  const shown: string[] = [];
  const term = h('div', { class: 'cert-term', 'aria-live': 'polite' });
  const reply = h('div', { class: 'cert-reply' });

  const say = (cls: string, text: string) => {
    term.append(h('div', { class: `cert-line ${cls}`, text }));
    while (term.childElementCount > 4) term.firstElementChild?.remove();
  };

  // Statusnamen wie in Uptime Kuma (Up/Down/Maintenance), dazwischen die Ablaufstufen
  const PILL: Record<string, string> = { ok: 'OK', due: 'FÄLLIG', crit: 'KNAPP', expired: 'DOWN', renewing: 'WARTUNG', hidden: '' };

  const render = () => {
    sim.certs.forEach((c, i) => {
      const st = sim.state(c);
      const row = rows[i]!;
      if (shown[i] !== st) {
        if (shown[i] === 'hidden' && st !== 'hidden') {
          say('warn', `Neues Zertifikat entdeckt: ${c.host}. Wer hat das angelegt?`);
          juice(row, [{ transform: 'scale(0.96)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], 260);
        }
        row.dataset.state = st;
        setText(pills[i]!, PILL[st]!);
        shown[i] = st;
      }
      setText(dayEls[i]!, c.expired ? 'abgelaufen' : `noch ${days(c.days)}`);
      fills[i]!.style.width = `${((c.days / CFG.maxDays) * 100).toFixed(1)}%`;
    });
    const busy = sim.busy ? '1' : '';
    if (rows[0]?.dataset.busy !== busy) rows.forEach((r) => (r.dataset.busy = busy));
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const list = h('div', { class: 'cert-list' });
      sim.certs.forEach((c, i) => {
        const pill = h('span', { class: 'cert-pill' });
        const day = h('span', { class: 'cert-days' });
        const fill = h('span', { class: 'cert-fill' });
        const row = h('button', { class: `cert-row${c.surprise ? ' surprise' : ''}`, type: 'button', 'aria-label': `${c.host} erneuern` }, [
          pill,
          h('span', { class: 'cert-name' }, [
            h('b', {}, [Object.assign(h('i', { class: 'cert-lock' }), { innerHTML: LOCK }), c.host]),
            h('small', { text: c.what }),
            h('span', { class: 'cert-meta', text: certMeta(c) }),
          ]),
          h('span', { class: 'cert-scan', text: 'Scan läuft …', 'aria-hidden': 'true' }),
          h('span', { class: 'cert-life' }, [
            day,
            h('span', { class: 'cert-bar' }, [fill, h('span', { class: 'cert-due', style: `left:${(CFG.dueDays / CFG.maxDays) * 100}%` })]),
          ]),
        ]);
        // später auftauchende Zeilen nehmen ihren Platz schon ein: nichts rutscht unter dem Finger
        // (unsichtbar per CSS, nicht aus dem Layout genommen)
        if (c.appearsAt > 0) row.dataset.state = 'hidden';
        shown[i] = c.appearsAt > 0 ? 'hidden' : '';
        row.addEventListener('click', () => {
          if (!api) return;
          const res = sim.renew(i);
          if (res === 'started') {
            api.sfx.tap();
            setTimeout(() => api?.sfx.release(), 70);
            api.haptic('tap');
            say('cmd', `$ certbot renew --cert-name ${c.host}`);
            const names = [c.host, ...c.sans];
            say('', `Renewing an existing certificate for ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : c.host}`);
            setText(reply, '');
          } else if (res === 'notdue') {
            api.sfx.tick();
            juice(row, SHAKE, 200);
            say('cmd', `$ certbot renew --cert-name ${c.host}`);
            say('dim', `Certificate not yet due for renewal (noch ${days(c.days)})`);
          } else if (res === 'busy') {
            api.sfx.tick();
            juice(row, SHAKE, 160);
          }
        });
        rows.push(row);
        pills.push(pill);
        dayEls.push(day);
        fills.push(fill);
        list.append(row);
      });
      say('dim', `# ${sim.certs.length - CFG.arrivals.length} Zertifikate im Monitoring. Erneuern ab ${CFG.dueDays} Tagen.`);
      root.append(
        h('div', { class: 'certs' }, [
          h('div', { class: 'cert-win' }, [
            h('div', { class: 'cert-head', 'aria-hidden': 'true' }, [
              h('span', { class: 'cert-logo', text: 'P' }),
              h('b', { text: 'Uptime Puma' }),
              h('span', { class: 'cert-tab', text: 'TLS-Zertifikate' }),
            ]),
            list,
          ]),
          h('div', { class: 'term-win' }, [termBar('root@web01: ~'), term]),
          reply,
        ]),
      );
      render();
    },
    update(dt) {
      sim.update(dt);
      const { expired, renewed } = sim.drain();
      for (const _ of renewed) {
        say('ok', 'Successfully received certificate.');
        say('dim', `This certificate expires on ${isoIn(CFG.maxDays)}.`);
        api?.sfx.good();
      }
      for (const id of expired) {
        const c = sim.certs[id]!;
        say('err', `${c.host}: NET::ERR_CERT_DATE_INVALID`);
        setText(reply, c.expiredText);
        api?.sfx.error();
        api?.haptic('error');
        juice(rows[id]!, SHAKE, 260);
      }
      render();
    },
    score: () => sim.score(),
    status: () => `abgelaufen: ${sim.expiredCount} · certbot: ${sim.renewing ? 'läuft' : 'bereit'}`,
  };
}
