import { INCIDENTS } from '../../config';
import { progressScore } from '../../core/incidents';
import { RACK_BLANK, RACK_NEW, RACK_ODD, RACK_OLD, RACK_UPS, type RackDevice } from '../../content/incidents';
import { pick, shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.rack;
type Cfg = typeof CFG;

export interface Mounted {
  dev: RackDevice;
  /** unterste belegte HE, 0-basiert (0 = ganz unten) */
  bottom: number;
}

export interface Parcel {
  id: number;
  dev: RackDevice;
  /** eingebaut ab dieser HE (0-basiert) oder null */
  at: number | null;
}

export interface Run {
  bottom: number;
  size: number;
}

export type PlaceResult = 'ok' | 'nofit' | 'heavy' | 'odd' | 'none';

/** Spiellogik ohne DOM. */
export class RackSim {
  /** fest verbaut: USV, Bestandsgeräte, Blenden */
  fixed: Mounted[] = [];
  parcels: Parcel[];
  odd: { name: string; what: string; desc: string; returned: boolean };
  wrong = 0;

  constructor(
    private cfg: Cfg = CFG,
    rnd: () => number = Math.random,
  ) {
    // Lieferung: ein schweres Gerät plus leichtere, zusammen höchstens so viel, dass Bestand dazwischen passt
    const heavy = pick(
      RACK_NEW.filter((d) => d.heavy),
      rnd,
    );
    const free = cfg.heights - cfg.upsHe;
    let light: RackDevice[] = [];
    for (let i = 0; i < 20; i++) {
      light = shuffle(
        RACK_NEW.filter((d) => !d.heavy),
        rnd,
      ).slice(0, cfg.deliveries - 1);
      if (heavy.he + light.reduce((s, d) => s + d.he, 0) <= free - 3) break;
    }
    const newHe = heavy.he + light.reduce((s, d) => s + d.he, 0);

    // Bestand auffüllen, Rest mit Blenden (je 1 HE)
    const old: RackDevice[] = [];
    let left = free - newHe;
    for (const d of shuffle(RACK_OLD, rnd)) {
      if (d.he <= left) {
        old.push(d);
        left -= d.he;
      }
    }
    while (left-- > 0) old.push(RACK_BLANK);
    const oldQueue = shuffle(old, rnd);

    // Lücken = Gruppen neuer Geräte; manche Lücke nimmt zwei Geräte auf (das macht das Puzzle)
    const groups: RackDevice[][] = [];
    const rest = [...light];
    while (rest.length) groups.push(rest.splice(0, rnd() < 0.5 && rest.length > 1 ? 2 : 1));
    const heavyGroup: RackDevice[] = [heavy];
    // genug Bestand als Trenner zwischen den Lücken, sonst Lücken zusammenlegen
    while (groups.length > oldQueue.length - 1 && groups.length > 1) {
      const last = groups.pop()!;
      groups[groups.length - 1]!.push(...last);
    }

    // Aufbau von unten: USV, evtl. ein Bestandsgerät, schwere Lücke (bleibt unter der Linie), dann abwechselnd
    let pos = 0;
    const mount = (d: RackDevice) => {
      this.fixed.push({ dev: d, bottom: pos });
      pos += d.he;
    };
    mount(RACK_UPS);
    if (rnd() < 0.5 && oldQueue.length > groups.length) mount(oldQueue.shift()!);
    pos += heavyGroup.reduce((s, d) => s + d.he, 0);
    for (const g of shuffle(groups, rnd)) {
      if (oldQueue.length) mount(oldQueue.shift()!);
      pos += g.reduce((s, d) => s + d.he, 0);
    }
    while (oldQueue.length) mount(oldQueue.shift()!);

    this.parcels = shuffle([heavy, ...light], rnd).map((dev, id) => ({ id, dev, at: null }));
    this.odd = { ...pick(RACK_ODD, rnd), returned: false };
  }

  /** belegte HE (0..heights-1) */
  private occupied(): boolean[] {
    const occ = Array<boolean>(this.cfg.heights).fill(false);
    const fill = (bottom: number, he: number) => {
      for (let i = bottom; i < bottom + he; i++) occ[i] = true;
    };
    for (const m of this.fixed) fill(m.bottom, m.dev.he);
    for (const p of this.parcels) if (p.at !== null) fill(p.at, p.dev.he);
    return occ;
  }

  /** freie Lücken von unten nach oben */
  runs(): Run[] {
    const occ = this.occupied();
    const out: Run[] = [];
    for (let i = 0; i < occ.length; i++) {
      if (occ[i]) continue;
      const start = i;
      while (i < occ.length && !occ[i]) i++;
      out.push({ bottom: start, size: i - start });
      i--;
    }
    return out;
  }

  /** Paket in die Lücke einbauen (sitzt dort ganz unten) */
  place(id: number | 'odd', runBottom: number): PlaceResult {
    if (id === 'odd') {
      this.wrong++;
      return 'odd';
    }
    const p = this.parcels[id];
    const run = this.runs().find((r) => r.bottom === runBottom);
    if (!p || p.at !== null || !run) return 'none';
    if (p.dev.he > run.size) return 'nofit';
    // schwer über der Linie: abgelehnt, aber kein Fehlgriff (die Lücke leuchtet dafür gar nicht erst)
    if (p.dev.heavy && run.bottom + p.dev.he > this.cfg.half) return 'heavy';
    p.at = run.bottom;
    return 'ok';
  }

  /** Darf das Paket in diese Lücke? (Größe und bei Schwerem die Linie) */
  fits(id: number, r: Run): boolean {
    const p = this.parcels[id];
    if (!p) return false;
    return p.dev.he <= r.size && !(p.dev.heavy && r.bottom + p.dev.he > this.cfg.half);
  }

  /** wieder ausbauen (kostet nichts) */
  unplace(id: number): void {
    const p = this.parcels[id];
    if (p) p.at = null;
  }

  /** in die Retoure: richtig nur für das Gerät ohne Rackschienen */
  sendBack(id: number | 'odd'): boolean {
    if (id === 'odd') {
      this.odd.returned = true;
      return true;
    }
    this.wrong++;
    return false;
  }

  get doneCount(): number {
    return this.parcels.filter((p) => p.at !== null).length + (this.odd.returned ? 1 : 0);
  }

  get total(): number {
    return this.parcels.length + 1;
  }

  get done(): boolean {
    return this.doneCount === this.total;
  }

  score(): number {
    return progressScore(this.doneCount, this.total, this.wrong);
  }
}

/** Sackkarre von der Seite: Griff, Rahmen, Schaufel, Rad; dazu ein Paket, das erst bei der Retoure sichtbar wird */
const CART_SVG =
  '<svg viewBox="0 0 40 48"><g class="rk-cart-box"><rect x="15" y="17" width="19" height="19" rx="1.5" fill="#d8a868" stroke="#3d2c2e" stroke-width="1.6"/><rect x="22.5" y="17" width="4" height="19" fill="#e9c58f"/></g>' +
  '<rect x="4" y="1.5" width="10" height="4.5" rx="2.2" fill="#e05d4e" stroke="#3d2c2e" stroke-width="1.4"/>' +
  '<path d="M9 6l3 32" stroke="#3d2c2e" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M10.2 15h4.5M11 25h4.5" stroke="#3d2c2e" stroke-width="2.2" stroke-linecap="round"/>' +
  '<path d="M12 38h22" stroke="#e05d4e" stroke-width="3.4" stroke-linecap="round"/>' +
  '<circle cx="13" cy="42" r="5.2" fill="#3a3f4b" stroke="#3d2c2e" stroke-width="1.6"/><circle cx="13" cy="42" r="1.8" fill="#c9cdd6"/></svg>';

export function rackGame(): Minigame {
  const sim = new RackSim();
  let api: GameApi | null = null;
  let selected: number | 'odd' | null = null;
  let jokeShown = false;
  const H = CFG.heights;
  const cab = h('div', { class: 'rk-cab' });
  const cards = new Map<number | 'odd', HTMLButtonElement>();
  const info = h('div', { class: 'rk-info' });
  const pct = (he: number) => `${(he / H) * 100}%`;

  const tell = (cls: '' | 'warn' | 'ok', text: string) => {
    setText(info, text);
    info.dataset.kind = cls;
  };

  const select = (id: number | 'odd' | null) => {
    selected = id;
    for (const [k, c] of cards) c.classList.toggle('selected', k === id);
    renderRack();
  };

  const fail = (el: HTMLElement, text: string, penalty: boolean) => {
    if (!api) return;
    api.sfx.error();
    api.haptic('error');
    if (penalty) api.penalize(CFG.wrongPenaltyMs);
    juice(el, SHAKE, 240);
    tell('warn', text);
  };

  /** Name links, rechts eine angedeutete Front (Ports, Schächte, Display …) nach Gerätetyp */
  const devFace = (d: RackDevice) => [
    h('span', { class: 'rk-face' }, [h('b', { text: d.name }), h('small', { text: d.what })]),
    h('span', { class: 'rk-deco', 'aria-hidden': 'true' }),
  ];

  const renderRack = () => {
    const parts: HTMLElement[] = [];
    for (const m of sim.fixed) {
      const blank = m.dev === RACK_BLANK;
      parts.push(
        h('div', { class: `rk-dev look-${m.dev.look}`, style: `bottom:${pct(m.bottom)};height:${pct(m.dev.he)}` }, blank ? [h('span', { class: 'rk-deco', 'aria-hidden': 'true' })] : devFace(m.dev)),
      );
    }
    for (const p of sim.parcels) {
      if (p.at === null) continue;
      const el = h(
        'button',
        { class: `rk-dev new look-${p.dev.look}`, type: 'button', style: `bottom:${pct(p.at)};height:${pct(p.dev.he)}`, 'aria-label': `${p.dev.name} wieder ausbauen` },
        devFace(p.dev),
      );
      el.addEventListener('click', () => {
        if (!api) return;
        sim.unplace(p.id);
        api.sfx.tick();
        tell('', `${p.dev.name} wieder ausgebaut.`);
        renderAll();
      });
      parts.push(el);
    }
    for (const r of sim.runs()) {
      const fits = typeof selected === 'number' && sim.fits(selected, r);
      const el = h(
        'button',
        { class: `rk-gap${fits ? ' fit' : ''}${selected !== null && !fits ? ' nofit' : ''}`, type: 'button', style: `bottom:${pct(r.bottom)};height:${pct(r.size)}`, 'aria-label': `${r.size} HE frei` },
        [h('span', { text: `${r.size} HE frei` })],
      );
      el.addEventListener('click', () => onGap(r, el));
      parts.push(el);
    }
    cab.replaceChildren(
      ...parts,
      h('div', { class: 'rk-half', style: `bottom:${pct(CFG.half)}`, 'aria-hidden': 'true' }),
    );
  };

  const renderCards = () => {
    for (const p of sim.parcels) {
      const c = cards.get(p.id)!;
      c.disabled = p.at !== null;
      c.classList.toggle('placed', p.at !== null);
    }
    const o = cards.get('odd')!;
    o.disabled = sim.odd.returned;
    o.classList.toggle('placed', sim.odd.returned);
  };

  const renderAll = () => {
    renderCards();
    renderRack();
  };

  const onGap = (r: Run, el: HTMLElement) => {
    if (!api) return;
    if (selected === null) {
      api.sfx.tick();
      tell('', 'Erst ein Gerät rechts antippen, dann die Lücke.');
      return;
    }
    const id = selected;
    const res = sim.place(id, r.bottom);
    if (res === 'odd') {
      fail(el, `${sim.odd.name}: ${sim.odd.desc} Ab in die Retoure.`, true);
      return;
    }
    if (res === 'nofit') {
      api.sfx.tick();
      juice(el, SHAKE, 200);
      const d = sim.parcels[id as number]!.dev;
      tell('', `Passt nicht: ${d.name} braucht ${d.he} HE, hier sind ${r.size} frei.`);
      return;
    }
    if (res === 'heavy') {
      const d = sim.parcels[id as number]!.dev;
      api.sfx.tick();
      juice(el, SHAKE, 200);
      tell('warn', `${d.kg} kg so weit oben? Kippgefahr. Schweres gehört unter die Linie.`);
      return;
    }
    if (res !== 'ok') return;
    const d = sim.parcels[id as number]!.dev;
    api.sfx.tap();
    setTimeout(() => api?.sfx.release(), 70);
    api.haptic('tap');
    // der Käfigmutter-Gag nur beim allerersten Einbau (auch nach Aus- und Wiedereinbau nicht nochmal)
    tell('ok', jokeShown ? `${d.name} eingebaut.` : `${d.name} eingebaut. Vier Käfigmuttern, eine davon im Daumen.`);
    jokeShown = true;
    selected = null;
    for (const c of cards.values()) c.classList.remove('selected');
    renderAll();
    check();
  };

  const check = () => {
    if (sim.done) {
      api?.sfx.good();
      api?.finish();
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const tray = h('div', { class: 'rk-tray' });
      for (const p of sim.parcels) {
        // Lieferung sieht schon aus wie das Gerät; Höhe wächst mit den HE (größer als im Rack, damit man gut trifft)
        const c = h(
          'button',
          { class: `rk-card look-${p.dev.look}${p.dev.heavy ? ' heavy' : ''}`, type: 'button', style: `height:${18 + p.dev.he * 16}px`, 'aria-label': `${p.dev.name}, ${p.dev.he} HE, ${p.dev.kg} kg` },
          [
            h('span', { class: 'rk-card-text' }, [
              h('b', { text: p.dev.name }),
              h('span', { class: 'rk-spec' }, [`${p.dev.he} HE · ${p.dev.kg} kg`, ...(p.dev.heavy ? [h('em', { text: 'schwer ↓' })] : [])]),
            ]),
            h('span', { class: 'rk-deco', 'aria-hidden': 'true' }),
          ],
        );
        c.addEventListener('click', () => {
          gameApi.sfx.tick();
          select(selected === p.id ? null : p.id);
          tell('', `${p.dev.name}: ${p.dev.he} HE${p.dev.heavy ? ', schwer – nach unten' : ''}. Jetzt eine leuchtende Lücke antippen.`);
        });
        cards.set(p.id, c);
        tray.append(c);
      }
      // echter Versandkarton: Klebeband, „oben“-Pfeile, Aufkleber mit Strichcode
      const odd = h('button', { class: 'rk-box odd', type: 'button', 'aria-label': `${sim.odd.name}, ${sim.odd.what}, keine Rackschienen` }, [
        h('b', { text: sim.odd.name }),
        h('small', { text: sim.odd.what }),
        h('span', { class: 'rk-spec', text: 'keine Rackschienen' }),
        h('span', { class: 'rk-up', 'aria-hidden': 'true', text: '↑↑' }),
        h('span', { class: 'rk-label', 'aria-hidden': 'true' }),
      ]);
      odd.addEventListener('click', () => {
        gameApi.sfx.tick();
        select(selected === 'odd' ? null : 'odd');
        tell('', `${sim.odd.name}: ${sim.odd.desc}`);
      });
      cards.set('odd', odd);
      tray.append(odd);
      // Retoure = Sackkarre (das Paket steht drauf, sobald es zurückgeht)
      const cart = h('span', { class: 'rk-cart', 'aria-hidden': 'true' });
      cart.innerHTML = CART_SVG;
      const ret = h('button', { class: 'rk-return', type: 'button', 'aria-label': 'Retoure: zurück an den Absender' }, [
        cart,
        h('span', { class: 'rk-return-text' }, [h('b', { text: 'Retoure' }), h('small', { text: 'zurück an den Absender' })]),
      ]);
      ret.addEventListener('click', () => {
        if (selected === null) {
          gameApi.sfx.tick();
          tell('', 'Erst antippen, was zurückgehen soll.');
          return;
        }
        if (sim.sendBack(selected)) {
          ret.classList.add('loaded');
          gameApi.sfx.tap();
          setTimeout(() => gameApi.sfx.release(), 70);
          gameApi.haptic('tap');
          tell('ok', `${sim.odd.name} geht zurück. Der Einkauf ist beleidigt, das Rack nicht.`);
          select(null);
          renderAll();
          check();
        } else {
          fail(ret, 'Das war Hardware fürs Rack. Der Einkauf holt sie zurück und guckt dich lange an.', true);
        }
      });
      tray.append(ret);

      const rail = h(
        'div',
        { class: 'rk-rail', 'aria-hidden': 'true' },
        Array.from({ length: H }, (_, i) => h('span', { text: String(H - i) })),
      );
      tell('', 'Gerät rechts antippen, dann eine leuchtende Lücke.');
      root.append(h('div', { class: 'rk' }, [h('div', { class: 'rk-body' }, [h('div', { class: 'rk-frame' }, [rail, cab, h('div', { class: 'rk-legend', text: '- - - Schweres nur darunter' })]), tray]), info]));
      renderAll();
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `eingebaut: ${sim.doneCount}/${sim.total} · Fehlgriffe: ${sim.wrong}`,
  };
}
