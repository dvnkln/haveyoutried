export function pick<T>(items: readonly T[], rnd: () => number = Math.random): T {
  const item = items[Math.floor(rnd() * items.length)];
  if (item === undefined) throw new Error('pick() on empty list');
  return item;
}

/** Ganzzahl in [min, max] */
export function randInt(min: number, max: number, rnd: () => number = Math.random): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in vars ? String(vars[key]) : key === 'pid' ? String(randInt(300, 32_767)) : m,
  );
}

/** Zufälliges Element, Wahrscheinlichkeit proportional zu `weight(item)`. */
export function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rnd: () => number = Math.random): T {
  if (items.length === 0) throw new Error('weightedPick() on empty list');
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return items[Math.floor(rnd() * items.length)]!;
  let x = rnd() * total;
  for (const item of items) {
    x -= Math.max(0, weight(item));
    if (x < 0) return item;
  }
  return items[items.length - 1]!;
}

/** Gemischte Kopie (Fisher-Yates) */
export function shuffle<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
