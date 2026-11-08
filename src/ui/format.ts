const PREFIXES = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'] as const;

/** Abrunden mit kleinem Epsilon gegen Float-Artefakte (1.23 * 100 = 122.999…). */
const floorTo = (x: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.floor(x * f + 1e-9) / f;
};

/**
 * Große Zahlen mit SI-Präfix und 3 signifikanten Stellen, immer abgerundet
 * (man soll nie mehr Tickets angezeigt bekommen, als man hat).
 * `decimals` gilt nur für Werte < 1000.
 */
export function formatNumber(n: number, decimals = 0): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return '-' + formatNumber(-n, decimals);

  if (n < 1_000) return floorTo(n, decimals).toFixed(decimals);

  let exp = Math.floor(Math.log10(n) / 3);
  // log10 kann an Grenzen (z. B. 1e15) knapp daneben liegen
  if (n / 1_000 ** exp < 1) exp--;
  if (n / 1_000 ** exp >= 1_000) exp++;

  if (exp >= PREFIXES.length) {
    const e = Math.floor(Math.log10(n));
    return `${floorTo(n / 10 ** e, 2).toFixed(2)}e${e}`;
  }

  const scaled = n / 1_000 ** exp;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${floorTo(scaled, digits).toFixed(digits)} ${PREFIXES[exp]}`;
}

/** Produktionsraten: unter 1 mit zwei, unter 100 mit einer Nachkommastelle (ein Praktikant schafft 0.03/s). */
export function formatRate(n: number): string {
  return formatNumber(n, n > 0 && n < 1 ? 2 : n < 100 ? 1 : 0);
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1_000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3_600);
  const m = Math.floor((s % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
