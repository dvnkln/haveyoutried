import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Erzeugt dist/sw.js mit allen Build-Dateien als Precache; Version = Hash über alle Inhalte. */
function serviceWorker(): Plugin {
  return {
    name: 'haveyoutried-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const hash = createHash('sha256');
      const files = new Set<string>(['./']);
      for (const [name, out] of Object.entries(bundle)) {
        if (name.endsWith('.map')) continue;
        hash.update(name).update(out.type === 'chunk' ? out.code : out.source);
        if (name !== 'index.html') files.add(`./${name}`);
      }
      for (const name of readdirSync('public')) {
        hash.update(name).update(readFileSync(`public/${name}`));
        files.add(`./${name}`);
      }
      const list = [...files].sort();
      const version = hash.digest('hex').slice(0, 12);
      const source = readFileSync('src/pwa/sw.template.js', 'utf8')
        .replace('__VERSION__', JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(list));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022' },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
