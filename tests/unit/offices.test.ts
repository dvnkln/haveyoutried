import { describe, expect, it } from 'vitest';
import { COMPANIES } from '../../src/content/companies';
import { OFFICES } from '../../src/content/offices';

describe('Büro-Stile', () => {
  it('jeder Stil wird von mindestens einer Firma benutzt', () => {
    for (const o of OFFICES) expect(COMPANIES.map((c) => c.office), o).toContain(o);
  });
});
