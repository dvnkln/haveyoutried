// Rendert die PNG-Icons aus den SVGs in public/ (Chromium, damit es genau wie im Browser aussieht).
// Aufruf: node werkzeug/icons.mjs
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const jobs = [
  ['public/icon.svg', 'public/icon-192.png', 192],
  ['public/icon.svg', 'public/icon-512.png', 512],
  ['public/icon-maskable.svg', 'public/icon-maskable-512.png', 512],
  ['public/icon-maskable.svg', 'public/apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = await readFile(src, 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(out);
}
await browser.close();
