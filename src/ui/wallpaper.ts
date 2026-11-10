import { companyOf } from '../content/companies';
import { COLLECT_WALLS, COMPANY_WALLS, SCENE_TEXT, type Scene } from '../content/wallpapers';
import type { GameState } from '../core/state';
import { h } from './dom';

/** Auswahl in den Einstellungen: 'auto' = Bild der aktuellen Firma, 'firma:<id>', sonst eine Sammel-ID */
export const AUTO_WALL = 'auto';
const FIRM = 'firma:';

export interface WallChoice {
  id: string;
  name: string;
  /** noch nicht freigeschaltet: Hinweis, wie es dazu kommt */
  locked?: string;
  /** kleine Zusatzzeile */
  note?: string;
}

const firmWall = (companyId: string) => COMPANY_WALLS[companyId] ?? COMPANY_WALLS.mueller!;

/** Firmen, bei denen man schon war (inkl. der aktuellen) */
const visited = (s: GameState) => {
  const ids = new Set([s.prestige.company]);
  for (const k of Object.keys(s.flags)) if (k.startsWith('company:')) ids.add(k.slice(8));
  return [...ids].filter((id) => COMPANY_WALLS[id]);
};

/** Was in den Einstellungen zur Wahl steht, gesperrte mit Hinweis */
export function wallChoices(s: GameState, achievementName: (id: string) => string): WallChoice[] {
  return [
    // aktuelle Firma nur einmal: als „automatisch“ (wechselt beim Jobwechsel mit), frühere Firmen einzeln
    { id: AUTO_WALL, name: shortName(companyOf(s.prestige.company).name), note: 'Aktuelle Firma, wechselt mit.' },
    ...visited(s)
      .filter((id) => id !== s.prestige.company)
      .map((id) => ({ id: FIRM + id, name: shortName(companyOf(id).name) })),
    ...COLLECT_WALLS.map((w) => ({
      id: w.id,
      name: w.name,
      locked: w.achievement && !s.achievements[w.achievement] ? `Achievement „${achievementName(w.achievement)}“` : undefined,
    })),
  ];
}

/** Gespeicherte Auswahl, die es (noch) gibt; sonst automatisch */
export function validWall(s: GameState, id: string): string {
  if (id.startsWith(FIRM)) {
    const company = id.slice(FIRM.length);
    // die aktuelle Firma steht als „automatisch“ in der Auswahl
    return company !== s.prestige.company && visited(s).includes(company) ? id : AUTO_WALL;
  }
  const c = COLLECT_WALLS.find((w) => w.id === id);
  return c && (!c.achievement || s.achievements[c.achievement]) ? id : AUTO_WALL;
}

/** „Konzern AG, Service-Desk …“ → „Konzern AG“ */
const shortName = (name: string) => name.split(/[,(]/)[0]!.trim();
const initials = (name: string) =>
  shortName(name)
    .split(/[\s&.-]+/)
    .filter((w) => /^[A-ZÄÖÜ0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || name[0]!;

const span = (cls: string, text?: string) => h('span', { class: cls, ...(text ? { text } : {}) });

/** Kinder einer Szene (gezeichnet mit CSS, Größen relativ zum Bild) */
function scene(kind: Scene, companyId: string): HTMLElement[] {
  switch (kind) {
    case 'huegel':
      return [span('wp-sun'), span('wp-cloud'), span('wp-hill wp-hill-back'), span('wp-hill wp-hill-front')];
    case 'corp': {
      const c = companyOf(companyId);
      return [
        span('wp-corp-ring'),
        h('div', { class: 'wp-corp' }, [span('wp-logo', initials(c.name)), span('wp-corp-name', shortName(c.name)), span('wp-slogan', firmWall(companyId).slogan)]),
      ];
    }
    case 'bsod':
      return [
        h('div', { class: 'wp-bsod' }, [span('wp-bsod-face', SCENE_TEXT.bsod.face), span('wp-bsod-text', SCENE_TEXT.bsod.text), span('wp-bsod-prog', SCENE_TEXT.bsod.progress)]),
      ];
    case 'poster':
      return [
        span('wp-sunset'),
        span('wp-sea'),
        h('div', { class: 'wp-poster' }, [span('wp-poster-title', SCENE_TEXT.poster.title), span('wp-poster-text', SCENE_TEXT.poster.text)]),
      ];
    case 'serverraum':
      return [h('div', { class: 'wp-racks' }, [span('wp-rack'), span('wp-rack'), span('wp-rack')]), span('wp-floor')];
    case 'nacht':
      return [span('wp-stars'), span('wp-moon'), span('wp-hill wp-hill-night')];
    case 'plaid':
      return [span('wp-plaid-text', SCENE_TEXT.plaid)];
    case 'katze':
      return [span('wp-branch'), h('div', { class: 'wp-cat' }, [span('wp-cat-body'), span('wp-cat-head')]), span('wp-cat-text', SCENE_TEXT.katze)];
  }
}

/** Welche Szene zeigt eine Auswahl? */
function resolve(s: GameState, id: string): { kind: Scene; company: string; color?: string } {
  const choice = validWall(s, id);
  if (choice === AUTO_WALL || choice.startsWith(FIRM)) {
    const company = choice === AUTO_WALL ? s.prestige.company : choice.slice(FIRM.length);
    const w = firmWall(company);
    return { kind: w.scene ?? 'corp', company, color: w.color };
  }
  return { kind: COLLECT_WALLS.find((w) => w.id === choice)!.scene, company: s.prestige.company };
}

/** Füllt ein Bild-Element mit der Szene zur Auswahl; gibt einen Schlüssel zurück (gleich = nichts zu tun) */
export function paintWall(el: HTMLElement, s: GameState, id: string, prevKey = ''): string {
  const r = resolve(s, id);
  const key = `${r.kind}:${r.company}`;
  if (key === prevKey) return key;
  el.dataset.scene = r.kind;
  el.style.setProperty('--brand', r.color ?? '');
  for (const old of el.querySelectorAll(':scope > [data-scene-part]')) old.remove();
  const parts = scene(r.kind, r.company);
  for (const p of parts) p.dataset.scenePart = '';
  el.prepend(...parts);
  return key;
}

/** Bild leeren (gesperrte Vorschau) */
export function clearWall(el: HTMLElement): void {
  delete el.dataset.scene;
  el.style.removeProperty('--brand');
  for (const old of el.querySelectorAll(':scope > [data-scene-part]')) old.remove();
}
