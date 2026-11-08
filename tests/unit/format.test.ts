import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber, formatRate } from '../../src/ui/format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [7.9, '7'],
    [999, '999'],
    [999.99, '999'],
    [1000, '1.00 K'],
    [1234, '1.23 K'],
    [12_345, '12.3 K'],
    [123_456, '123 K'],
    [999_999, '999 K'],
    [1e6, '1.00 M'],
    [1.5e9, '1.50 G'],
    [1e12, '1.00 T'],
    [1e15, '1.00 P'],
    [1e18, '1.00 E'],
    [1e30, '1.00 Q'],
    [9.99e32, '999 Q'],
    [1.23e33, '1.23e33'],
  ])('%d → %s', (n, s) => {
    expect(formatNumber(n)).toBe(s);
  });

  it('rundet nie auf (kein „1.00 M“ bei 999 999)', () => {
    expect(formatNumber(999_950)).toBe('999 K');
  });

  it('Sonderwerte', () => {
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(-1234)).toBe('-1.23 K');
  });
});

describe('formatRate / formatDuration', () => {
  it('Raten mit einer Nachkommastelle', () => {
    expect(formatRate(0.1)).toBe('0.10');
    expect(formatRate(0.025)).toBe('0.02');
    expect(formatRate(4.56)).toBe('4.5');
    expect(formatRate(150)).toBe('150');
    expect(formatRate(2500)).toBe('2.50 K');
  });
  it('Dauer', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(3 * 3600_000 + 12 * 60_000)).toBe('3h 12m');
    expect(formatDuration(26 * 3600_000)).toBe('1d 2h');
  });
});
