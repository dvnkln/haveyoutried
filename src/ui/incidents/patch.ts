import { INCIDENTS } from '../../config';
import { PATCH_DEPARTMENTS } from '../../content/incidents';
import { shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.patch;
export const UPLINK = 'UPLINK';
const SVG_NS = 'http://www.w3.org/2000/svg';

export type PatchResult = 'ok' | 'wrong' | 'uplink' | 'taken';

/** Spiellogik ohne DOM. */
export class PatchSim {
  /** Abteilungen dieser Runde (Dosen links, in dieser Reihenfolge) */
  left: string[];
  /** Switch-Ports rechts: Abteilungen gemischt + Uplink */
  right: string[];
  connected = new Map<string, string>();
  wrong = 0;
  uplinkHits = 0;

  constructor(
    private cables: number = CFG.cables,
    rnd: () => number = Math.random,
  ) {
    const depts = shuffle(PATCH_DEPARTMENTS, rnd).slice(0, cables).map((d) => d.name);
    this.left = depts;
    this.right = shuffle([...depts, UPLINK], rnd);
  }

  get done(): boolean {
    return this.connected.size >= this.cables;
  }

  isRightTaken(right: string): boolean {
    return [...this.connected.values()].includes(right);
  }

  connect(left: string, right: string): PatchResult {
    if (right === UPLINK) {
      this.wrong++;
      this.uplinkHits++;
      return 'uplink';
    }
    if (this.connected.has(left) || this.isRightTaken(right)) return 'taken';
    if (left !== right) {
      this.wrong++;
      return 'wrong';
    }
    this.connected.set(left, right);
    return 'ok';
  }

  score(): number {
    return (this.connected.size / this.cables) * Math.max(0.4, 1 - this.wrong * 0.1);
  }
}

const vlanOf = (dept: string) => PATCH_DEPARTMENTS.find((d) => d.name === dept)?.vlan ?? dept;

export function patchGame(): Minigame {
  const sim = new PatchSim();
  let api: GameApi | null = null;
  const leftEls = new Map<string, HTMLButtonElement>();
  const rightEls = new Map<string, HTMLButtonElement>();
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'patch-svg');
  const temp = document.createElementNS(SVG_NS, 'path');
  temp.setAttribute('class', 'patch-temp');
  const board = h('div', { class: 'patch-board' });
  const info = h('div', { class: 'patch-info', 'aria-live': 'polite' });
  let selected: string | null = null;
  let dragging = false;

  /** Mittelpunkt einer Port-Kante relativ zum Board */
  const anchor = (el: HTMLElement, side: 'left' | 'right') => {
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (side === 'right' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
  };
  const curve = (a: { x: number; y: number }, z: { x: number; y: number }) => {
    const dx = Math.max(30, (z.x - a.x) / 2);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${z.x - dx} ${z.y}, ${z.x} ${z.y}`;
  };

  const drawCables = () => {
    svg.querySelectorAll('.patch-cable').forEach((p) => p.remove());
    for (const [l, r] of sim.connected) {
      const a = leftEls.get(l);
      const z = rightEls.get(r);
      if (!a || !z) continue;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'patch-cable');
      path.setAttribute('d', curve(anchor(a, 'right'), anchor(z, 'left')));
      svg.append(path);
    }
  };

  const select = (dept: string | null) => {
    selected = dept;
    for (const [d, el] of leftEls) el.classList.toggle('selected', d === dept);
  };

  const tryConnect = (right: string) => {
    if (!api || !selected) return;
    const left = selected;
    const res = sim.connect(left, right);
    const rightEl = rightEls.get(right)!;
    if (res === 'ok') {
      leftEls.get(left)!.classList.add('done');
      rightEl.classList.add('done');
      select(null);
      drawCables();
      setText(info, `${left} ↔ VLAN ${vlanOf(right)}: Link up.`);
      api.sfx.tap();
      setTimeout(() => api?.sfx.release(), 70);
      api.haptic('tap');
      if (sim.done) {
        api.sfx.good();
        api.finish();
      }
    } else if (res === 'uplink') {
      api.sfx.error();
      api.haptic('error');
      api.penalize(CFG.uplinkPenaltyMs);
      juice(rightEl, SHAKE, 300);
      setText(info, 'Spanning Tree sagt nein. Broadcast-Sturm im ganzen Haus. Kabel schnell wieder raus.');
    } else if (res === 'wrong') {
      api.sfx.error();
      api.haptic('error');
      api.penalize(CFG.wrongPenaltyMs);
      juice(rightEl, SHAKE, 240);
      setText(info, `${left} im VLAN ${vlanOf(right)}? Da sieht die ${left} gleich Dinge, die sie nicht sehen sollte.`);
    }
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      const leftCol = h('div', { class: 'patch-col' }, [h('div', { class: 'patch-head', text: 'Patchfeld' })]);
      const rightCol = h('div', { class: 'patch-col' }, [h('div', { class: 'patch-head', text: 'sw-core01' })]);

      sim.left.forEach((dept, i) => {
        const el = h('button', { class: 'port port-left', type: 'button' }, [
          h('span', { class: 'port-id', text: `Dose 2.${11 + i}` }),
          h('span', { class: 'port-label', text: dept }),
        ]);
        el.addEventListener('pointerdown', (e) => {
          if (sim.connected.has(dept)) return;
          e.preventDefault();
          select(dept);
          dragging = true;
        });
        // Tastatur (Enter/Space): auswählen, dann Switch-Port wählen
        el.addEventListener('click', (e) => {
          if (e.detail === 0 && !sim.connected.has(dept)) select(dept);
        });
        leftEls.set(dept, el);
        leftCol.append(el);
      });

      sim.right.forEach((dept, i) => {
        const uplink = dept === UPLINK;
        const el = h('button', { class: `port port-right${uplink ? ' uplink' : ''}`, type: 'button' }, [
          h('span', { class: 'port-id', text: uplink ? 'Te1/1/1' : `Gi1/0/${3 + i * 2}` }),
          h('span', { class: 'port-label', text: uplink ? 'UPLINK – NICHT ANFASSEN' : `VLAN ${vlanOf(dept)}` }),
        ]);
        // Antippen nach Auswahl links (Tap-Tap)
        el.addEventListener('click', () => {
          if (selected) tryConnect(dept);
        });
        rightEls.set(dept, el);
        rightCol.append(el);
      });

      // Ziehen: Linie folgt dem Finger, Loslassen über einem Switch-Port verbindet
      const move = (e: PointerEvent) => {
        if (!dragging || !selected) return;
        const from = leftEls.get(selected);
        if (!from) return;
        const b = board.getBoundingClientRect();
        temp.setAttribute('d', curve(anchor(from, 'right'), { x: e.clientX - b.left, y: e.clientY - b.top }));
      };
      const up = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        temp.setAttribute('d', '');
        const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.port-right');
        const dept = [...rightEls].find(([, el]) => el === target)?.[0];
        if (dept) tryConnect(dept);
      };
      board.addEventListener('pointermove', move);
      board.addEventListener('pointerup', up);
      board.addEventListener('pointercancel', () => {
        dragging = false;
        temp.setAttribute('d', '');
      });

      svg.append(temp);
      board.append(leftCol, rightCol, svg);
      root.append(h('div', { class: 'patch' }, [board, info]));
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `gepatcht: ${sim.connected.size}/${CFG.cables} · Fehlgriffe: ${sim.wrong}`,
  };
}
