import { expect, test } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: import('@playwright/test').Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
const tickets = async (page: import('@playwright/test').Page) =>
  Number((await page.locator('.counter-value').textContent())?.replace(/[^\d.]/g, ''));

test('Kern-Loop: tippen, kaufen, produzieren, speichern', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('.close-btn')).toBeVisible();
  await expect(page.locator('.log .line').first()).toBeVisible();

  // Button liegt in der unteren Bildschirmhälfte (Daumenzone)
  const box = (await page.locator('.close-btn').boundingBox())!;
  expect(box.y + box.height / 2).toBeGreaterThan(740 / 2);

  for (let i = 0; i < 20; i++) await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('20');
  await expect(page.locator('.last-closed')).toContainText('#INC-004731');
  await shot(page, '1-queue');

  await page.getByRole('tab', { name: /Infra/ }).tap();
  const buy = page.locator('button.buy[data-gen="intern"]');
  await expect(buy).toBeEnabled();
  await buy.tap();
  await expect(page.locator('.gen[data-gen="intern"] .gen-owned')).toHaveText('×1');
  await expect(page.locator('.rate')).toHaveText('+0.1/s');
  // Bash-Skript ist ab 50 Tickets sichtbar, vorher Teaser
  await expect(page.locator('.gen[data-gen="bash"]')).toBeHidden();
  await expect(page.locator('.gen-locked')).toBeVisible();
  await shot(page, '2-infra');

  await page.getByRole('tab', { name: /System/ }).tap();
  await expect(page.locator('.stats')).toContainText('Von Hand geschlossen');
  await shot(page, '3-system');

  // Reload: Stand bleibt (pagehide-Save)
  await page.reload();
  await page.getByRole('tab', { name: /Infra/ }).tap();
  await expect(page.locator('.gen[data-gen="intern"] .gen-owned')).toHaveText('×1');
  expect(errors).toEqual([]);
});

test('Offline-Progress wird auf 8 h gedeckelt', async ({ page, context }) => {
  const twoDaysAgo = Date.now() - 48 * 3600_000;
  const save = { version: 1, tickets: 0, generators: { bash: { owned: 1 } }, lastTick: twoDaysAgo };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  const modal = page.locator('dialog.modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('28.8 K'); // 8 h * 1/s
  await expect(modal).toContainText('Wochenende');
  await shot(page, '4-offline');
  await modal.getByRole('button', { name: 'Zur Kenntnis genommen' }).tap();
  await expect(modal).toBeHidden();
  expect(await tickets(page)).toBeGreaterThanOrEqual(28.8);
});
