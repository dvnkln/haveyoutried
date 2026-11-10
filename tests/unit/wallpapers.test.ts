import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/content/achievements';
import { COMPANIES } from '../../src/content/companies';
import { COLLECT_WALLS, COMPANY_WALLS } from '../../src/content/wallpapers';
import { WALLPAPER_MARKS } from '../../src/content/boot';

describe('Hintergrundbilder', () => {
  it('jede Firma hat ihr eigenes', () => {
    for (const c of COMPANIES) expect(COMPANY_WALLS[c.id], c.id).toBeDefined();
    for (const id of Object.keys(COMPANY_WALLS)) expect(COMPANIES.some((c) => c.id === id), id).toBe(true);
  });
  it('Sammelbilder hängen an echten Achievements, IDs eindeutig', () => {
    for (const w of COLLECT_WALLS) if (w.achievement) expect(ACHIEVEMENTS.some((a) => a.id === w.achievement), w.id).toBe(true);
    expect(new Set(COLLECT_WALLS.map((w) => w.id)).size).toBe(COLLECT_WALLS.length);
  });
  it('Wasserzeichen sind kurz (zwei Zeilen, ohne krummen Umbruch auf schmalen Handys)', () => {
    for (const [title, text] of WALLPAPER_MARKS) {
      expect(title.length, title).toBeLessThanOrEqual(32);
      expect(text.length, text).toBeLessThanOrEqual(40);
    }
  });
});
