import { expect, test } from '@playwright/test';
import { SOLVE } from '../../src/config';

test('PWA: Manifest mit PNG-Icons, Service Worker, Offline-Start mit Spielstand', async ({ page, context, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']));
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);

  // Hinweise vom Vorgänger aus: sie halten die Tastatur an, bis man sie bestätigt
  await page.addInitScript(() => {
    if (!localStorage.getItem('hyt.save')) localStorage.setItem('hyt.save', JSON.stringify({ version: 1, lastTick: Date.now(), flags: { 'tut:off': 1 } }));
  });
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // ein Ticket lösen (SOLVE.work Anschläge)
  for (let i = 0; i < SOLVE.work; i++) await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('1');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.close-btn')).toBeVisible();
  await expect(page.locator('.counter-value')).toHaveText('1'); // pagehide hat gespeichert
  for (let i = 0; i < SOLVE.work; i++) await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('2');
  await context.setOffline(false);
});
