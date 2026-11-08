export function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error('pick() on empty list');
  return item;
}

/** Ganzzahl in [min, max] */
export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in vars ? String(vars[key]) : key === 'pid' ? String(randInt(300, 32_767)) : m,
  );
}
