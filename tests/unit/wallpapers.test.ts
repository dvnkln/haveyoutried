import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../src/content/achievements';
import { COMPANIES } from '../../src/content/companies';
import { COLLECT_WALLS, COMPANY_WALLS } from '../../src/content/wallpapers';

describe('Hintergrundbilder', () => {
  it('jede Firma hat ihr eigenes', () => {
    for (const c of COMPANIES) expect(COMPANY_WALLS[c.id], c.id).toBeDefined();
    for (const id of Object.keys(COMPANY_WALLS)) expect(COMPANIES.some((c) => c.id === id), id).toBe(true);
  });
  it('Sammelbilder hängen an echten Achievements, IDs eindeutig', () => {
    for (const w of COLLECT_WALLS) if (w.achievement) expect(ACHIEVEMENTS.some((a) => a.id === w.achievement), w.id).toBe(true);
    expect(new Set(COLLECT_WALLS.map((w) => w.id)).size).toBe(COLLECT_WALLS.length);
  });
});
