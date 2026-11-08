import { expect, test } from '@playwright/test';

test('PWA: Manifest mit PNG-Icons, Service Worker, Offline-Start mit Spielstand', async ({ page, context, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}/${i.purpose}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192/any', '512x512/any', '512x512/maskable']));
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);

  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  for (let i = 0; i < 5; i++) await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('5');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.close-btn')).toBeVisible();
  await expect(page.locator('.counter-value')).toHaveText('5'); // pagehide hat gespeichert
  await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('6');
  await context.setOffline(false);
});
