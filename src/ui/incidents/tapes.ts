import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { TAPE_JOBS } from '../../content/incidents';
import { pad2 as p2, randInt, shuffle, WEEKDAYS } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.tapes;
type Cfg = typeof CFG;

/** Vollsicherung, Inkrementelle, Vollsicherung der Woche davor, Reinigungsband */
export type TapeKind = 'full' | 'inc' | 'old' | 'clean';

export interface Tape {
  slot: number;
  barcode: string;
  kind: TapeKind;
  /** was laut Katalog drauf ist („Inkr · Di 12.11.“) */
  text: string;
  /** Platz in der Restore-Reihenfolge, -1 = wird nicht gebraucht */
  need: number;
  done: boolean;
  /** schon einmal im Laufwerk gewesen: Etikett ist bekannt */
  known: boolean;
}

export interface TapeJob {
  path: string;
  why: string;
  /** Stand, auf den zurückgespielt wird (letztes benötigtes Band) */
  until: string;
}

export type TapePhase = 'show' | 'recall' | 'pause' | 'done';
export type InsertResult = 'ok' | 'wrong' | 'busy' | 'locked' | 'used';

const dayText = (d: Date) => `${WEEKDAYS[d.getDay()]} ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Sonntag der letzten ganz vergangenen Woche (deren Bänder liegen im Magazin) */
export function weekStart(today: Date): Date {
  return addDays(today, -today.getDay() - 7);
}

/**
 * Spiellogik ohne DOM, wie Simon: Der Katalog spielt die Bänder in Restore-Reihenfolge vor,
 * dann wird nachgelegt. Jeder Auftrag braucht dieselben Bänder wie der vorige plus eins (späterer Stichtag).
 */
export class TapeSim {
  round = 0;
  phase: TapePhase = 'show';
  tapes: Tape[] = [];
  job!: TapeJob;
  /** so viele Bänder dieses Auftrags sind zurückgespielt */
  step = 0;
  restored = 0;
  wrong = 0;
  /** Laufwerk belegt: lädt ein richtiges Band oder wirft ein falsches aus */
  busy: { slot: number; left: number; ok: boolean } | null = null;
  /** Vorspielen: Zeit seit Beginn */
  private showT = 0;
  private pauseLeft = 0;
  private sun: Date;
  private jobs: { path: string; why: string }[];
  private events: { loaded: number[]; ejected: number[]; roundDone: boolean; lit: number[] } = { loaded: [], ejected: [], roundDone: false, lit: [] };
  private lastLit: number | null = null;

  constructor(
    private cfg: Cfg = CFG,
    rnd: () => number = Math.random,
    today: Date = new Date(),
  ) {
    this.jobs = shuffle(TAPE_JOBS, rnd);
    this.sun = weekStart(today);
    // eindeutige Strichcodes (sechs Ziffern, Generation L8; Reinigungsband nach Norm CLN…)
    const codes = new Set<string>();
    const code = () => {
      let c = '';
      do c = `${p2(randInt(0, 99, rnd))}${p2(randInt(0, 99, rnd))}${p2(randInt(0, 99, rnd))}L8`;
      while (codes.has(c));
      codes.add(c);
      return c;
    };
    const t = (kind: TapeKind, text: string, need: number): Omit<Tape, 'slot'> => ({ barcode: code(), kind, text, need, done: false, known: false });
    const defs = [
      t('full', `Voll · ${dayText(this.sun)}`, 0),
      ...[1, 2, 3, 4, 5].map((d) => t('inc', `Inkr · ${dayText(addDays(this.sun, d))}`, d)),
      t('old', `Voll · ${dayText(addDays(this.sun, -7))}`, -1),
      { barcode: 'CLN010CU', kind: 'clean' as const, text: 'Reinigungsband', need: -1, done: false, known: false },
    ];
    // eine Woche (Voll + Mo–Fr), die Vollsicherung davor, ein Reinigungsband: 8 Fächer wie beim echten 1/8-Autoloader
    this.tapes = shuffle(defs, rnd).map((x, slot) => ({ ...x, slot }));
    this.startRound();
  }

  get rounds(): number {
    return this.cfg.rounds.length;
  }

  get total(): number {
    return this.cfg.rounds.reduce((s, n) => s + n, 0);
  }

  get needed(): number {
    return this.cfg.rounds[this.round] ?? 0;
  }

  /** dieses Band will das Laufwerk als Nächstes */
  get next(): Tape | undefined {
    return this.phase === 'recall' ? this.tapes.find((t) => t.need === this.step) : undefined;
  }

  get done(): boolean {
    return this.phase === 'done';
  }

  /** gerade hell beim Vorspielen: Band und Platz in der Reihenfolge */
  get lit(): Tape | null {
    if (this.phase !== 'show') return null;
    const t = this.showT - this.cfg.leadMs;
    if (t < 0) return null;
    const per = this.cfg.litMs + this.cfg.gapMs;
    const k = Math.floor(t / per);
    if (t - k * per >= this.cfg.litMs) return null;
    return k < this.needed ? (this.tapes.find((x) => x.need === k) ?? null) : null;
  }

  /** Dauer des Vorspielens */
  showMs(): number {
    const n = this.needed;
    return this.cfg.leadMs + n * this.cfg.litMs + Math.max(0, n - 1) * this.cfg.gapMs;
  }

  private startRound(): void {
    // alle Bänder zurück ins Magazin: was drauf ist, weiß man nur noch aus dem Kopf
    for (const t of this.tapes) {
      t.done = false;
      t.known = false;
    }
    const job = this.jobs[this.round % this.jobs.length]!;
    this.job = { ...job, until: dayText(addDays(this.sun, this.needed - 1)) };
    this.step = 0;
    this.phase = 'show';
    this.showT = 0;
    this.lastLit = null;
  }

  insert(slot: number): InsertResult {
    const t = this.tapes[slot];
    if (!t || this.phase !== 'recall') return 'locked';
    if (this.busy) return 'busy';
    if (t.done) return 'used';
    const ok = t.need === this.step;
    this.busy = { slot, left: ok ? this.cfg.loadMs : this.cfg.ejectMs, ok };
    if (!ok) this.wrong++;
    return ok ? 'ok' : 'wrong';
  }

  update(dt: number): void {
    if (this.phase === 'done') return;
    if (this.phase === 'show') {
      this.showT += dt;
      const lit = this.lit?.slot ?? null;
      if (lit !== null && lit !== this.lastLit) this.events.lit.push(lit);
      this.lastLit = lit;
      if (this.showT >= this.showMs()) this.phase = 'recall';
      return;
    }
    if (this.phase === 'pause') {
      this.pauseLeft -= dt;
      if (this.pauseLeft > 0) return;
      this.round++;
      this.startRound();
      return;
    }
    if (!this.busy) return;
    this.busy.left -= dt;
    if (this.busy.left > 0) return;
    const { slot, ok } = this.busy;
    this.busy = null;
    const t = this.tapes[slot]!;
    t.known = true;
    if (!ok) {
      // Pech: kein zweites Vorspielen, das gesuchte Band muss trotzdem noch gefunden werden
      this.events.ejected.push(slot);
      return;
    }
    t.done = true;
    this.restored++;
    this.step++;
    this.events.loaded.push(slot);
    if (this.step >= this.needed) {
      this.events.roundDone = true;
      if (this.round + 1 >= this.rounds) this.phase = 'done';
      else {
        this.phase = 'pause';
        this.pauseLeft = this.cfg.pauseMs;
      }
    }
  }

  drain(): { loaded: number[]; ejected: number[]; roundDone: boolean; lit: number[] } {
    const out = this.events;
    this.events = { loaded: [], ejected: [], roundDone: false, lit: [] };
    return out;
  }

  score(): number {
    // läuft beim Abpfiff gerade das richtige Band, zählt es (es war ja gefunden)
    const loading = this.busy?.ok ? 1 : 0;
    return progressScore(this.restored + loading, this.total, this.wrong);
  }
}

/** Farbige Strichcode-Etiketten wie bei echten LTO-Bändern: jede Ziffer hat ihre Farbe */
const DIGIT_COLORS = ['#e05252', '#f0c63d', '#4caf6a', '#3f86d6', '#e9873a', '#9b6ad6', '#e070b0', '#4ec2c2', '#8a8f99', '#c9a06b'];

const label = (barcode: string) =>
  h('span', { class: 'bk-label', 'aria-hidden': 'true' }, [
    h(
      'span',
      { class: 'bk-chars' },
      [...barcode].map((c) => {
        const d = Number(c);
        return h('span', { text: c, style: Number.isNaN(d) || c === ' ' ? '' : `background:${DIGIT_COLORS[d]}` });
      }),
    ),
    h('span', { class: 'bk-bars' }),
  ]);

const ORDER = ['①', '②', '③', '④', '⑤', '⑥'];

export function tapesGame(): Minigame {
  const sim = new TapeSim();
  let api: GameApi | null = null;
  let over = false;
  /** vor dem Start (Countdown) spielt der Katalog noch nichts vor */
  let running = false;
  let shownRound = -1;
  const rows: HTMLButtonElement[] = [];
  const infos: HTMLElement[] = [];
  const badges: HTMLElement[] = [];
  const lcd1 = h('span', { class: 'bk-lcd-1' });
  const lcd2 = h('span', { class: 'bk-lcd-2' });
  const drive = h('span', { class: 'bk-drive', 'aria-hidden': 'true' }, [h('span', { class: 'bk-slit' }), h('span', { class: 'bk-led' })]);
  const jobPath = h('b', { class: 'bk-path' });
  const jobWhy = h('span', { class: 'bk-why' });
  const reply = h('div', { class: 'bk-reply' });
  /** Greifer des Bandwechslers: fährt beim Vorspielen von Fach zu Fach */
  const picker = h('span', { class: 'bk-picker', 'aria-hidden': 'true' }, [h('span', { class: 'bk-claw' })]);
  let pickerAt: number | null = null;

  const render = () => {
    if (shownRound !== sim.round) {
      shownRound = sim.round;
      setText(jobPath, sim.job.path);
      setText(jobWhy, sim.job.why);
    }
    const lit = running ? sim.lit : null;
    sim.tapes.forEach((t, i) => {
      const row = rows[i]!;
      const on = lit === t;
      setText(infos[i]!, on || t.known || t.done ? t.text : '');
      setText(badges[i]!, t.done ? '✓' : on ? ORDER[t.need]! : '');
      row.classList.toggle('lit', on);
      row.classList.toggle('done', t.done);
      row.classList.toggle('known', t.known && !t.done);
      // falsch eingelegt und in diesem Auftrag gar nicht gebraucht: rot; später noch gebraucht: nur das Etikett
      row.classList.toggle('useless', t.known && (t.need < 0 || t.need >= sim.needed));
      row.classList.toggle('loading', sim.busy?.slot === i);
      row.disabled = !running || sim.phase !== 'recall' || t.done;
    });
    const showing = running && sim.phase === 'show';
    if (lit && pickerAt !== lit.slot) {
      const row = rows[lit.slot]!;
      // erster Halt: ohne Fahrt erscheinen, danach gleitet er
      picker.classList.toggle('glide', pickerAt !== null);
      picker.style.transform = `translateY(${row.offsetTop - 2}px)`;
      picker.style.height = `${row.offsetHeight + 4}px`;
      picker.style.left = `${row.offsetLeft - 2}px`;
      picker.style.width = `${row.offsetWidth + 4}px`;
      pickerAt = lit.slot;
    }
    if (!showing) pickerAt = null;
    picker.classList.toggle('on', showing && pickerAt !== null);
    drive.classList.toggle('busy', !!sim.busy);
    drive.classList.toggle('bad', !!sim.busy && !sim.busy.ok);
    const n = sim.needed;
    setText(lcd1, `Auftrag ${sim.round + 1}/${sim.rounds} · Stand ${sim.job.until}`);
    if (!running) setText(lcd2, 'Katalog wird geladen …');
    else if (sim.phase === 'show') setText(lcd2, lit ? `Katalog zeigt: Band ${lit.need + 1} von ${n} → Fach ${lit.slot + 1}` : 'Katalog zeigt die Reihenfolge …');
    else if (sim.phase === 'pause') setText(lcd2, 'Fertig. Nächster Auftrag …');
    else if (sim.phase === 'done') setText(lcd2, `RESTORE OK · ${sim.restored} Bänder`);
    else if (sim.busy) setText(lcd2, sim.busy.ok ? `Spiele zurück: ${sim.tapes[sim.busy.slot]!.text}` : 'Falsches Band. Auswurf.');
    else setText(lcd2, `Jetzt du: Band ${sim.step + 1} von ${n}`);
  };

  const onTape = (slot: number) => {
    if (!api) return;
    const res = sim.insert(slot);
    if (res === 'busy') {
      api.sfx.tick();
      setText(reply, 'Das Laufwerk ist noch beschäftigt. Einen Moment.');
      return;
    }
    if (res !== 'ok' && res !== 'wrong') return;
    // richtig: derselbe Ton wie beim Vorspielen; falsch: nur das Klacken, der Fehlerton kommt beim Auswurf
    if (res === 'ok') api.sfx.slot(slot);
    else {
      api.sfx.tap();
      // Zeitstrafe sofort beim Fehlgriff (wie in den anderen Spielen), nicht erst nach dem Auswurf
      api.penalize(CFG.wrongPenaltyMs);
    }
    api.haptic('tap');
    setText(reply, '');
    render();
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const mags = [h('div', { class: 'bk-mag' }, [h('span', { class: 'bk-mag-cap', text: 'Magazin links' })]), h('div', { class: 'bk-mag' }, [h('span', { class: 'bk-mag-cap', text: 'Magazin rechts' })])];
      for (const t of sim.tapes) {
        const info = h('span', { class: 'bk-info' });
        const badge = h('span', { class: 'bk-badge' });
        const row = h('button', { class: `bk-tape k-${t.kind}`, type: 'button', 'aria-label': `Fach ${t.slot + 1}, Band ${t.barcode}` }, [
          h('span', { class: 'bk-slot', text: String(t.slot + 1) }),
          h('span', { class: 'bk-cart', 'aria-hidden': 'true' }, [label(t.barcode)]),
          info,
          badge,
        ]);
        row.addEventListener('click', () => onTape(t.slot));
        rows.push(row);
        infos.push(info);
        badges.push(badge);
        mags[t.slot < sim.tapes.length / 2 ? 0 : 1]!.append(row);
      }
      render();
      root.append(
        h('div', { class: 'bk' }, [
          h('div', { class: 'bk-box' }, [
            h('div', { class: 'bk-brand', 'aria-hidden': 'true' }, [h('b', { text: 'StoreNever' }), ' 1/8 Autoloader · Backup Exit 12']),
            h('div', { class: 'bk-front' }, [h('div', { class: 'bk-lcd', role: 'status' }, [lcd1, lcd2]), drive]),
          ]),
          h('div', { class: 'bk-job' }, [jobPath, jobWhy]),
          h('div', { class: 'bk-mags' }, [...mags, picker]),
          reply,
        ]),
      );
    },
    update(dt) {
      running = true;
      sim.update(dt);
      const ev = sim.drain();
      for (const slot of ev.lit) api?.sfx.slot(slot);
      for (const slot of ev.ejected) {
        const t = sim.tapes[slot]!;
        api?.sfx.error();
        api?.haptic('error');
        juice(rows[slot]!, SHAKE, 260);
        setText(reply, `Fach ${slot + 1} war „${t.text}“. Ausgeworfen. Gesucht ist weiter Band ${sim.step + 1}.`);
      }
      for (const slot of ev.loaded) {
        setText(reply, '');
        juice(rows[slot]!, [{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }], 200);
      }
      // der letzte Auftrag: den Erfolgston spielt das Overlay beim Beenden
      if (ev.roundDone && !sim.done) api?.sfx.good();
      if (ev.roundDone && !sim.done) setText(reply, `${sim.job.path} ist wieder da. Nächster Auftrag: ein Tag später, ein Band mehr.`);
      if (sim.phase === 'show' && sim.step === 0 && sim.round > 0 && ev.lit.length) setText(reply, '');
      render();
      if (!over && sim.done) {
        over = true;
        setText(reply, 'Alles zurückgespielt. Die Bänder gehen wieder in den Tresor. Der ist ein Schuhkarton.');
        // kurz stehen lassen: letztes Band und Meldung sollen noch zu sehen sein
        setTimeout(() => api?.finish(), 900);
      }
    },
    score: () => sim.score(),
    status: () => `zurückgespielt: ${sim.restored}/${sim.total} · Fehlgriffe: ${sim.wrong}`,
  };
}
