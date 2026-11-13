import { expect, test, type Page } from '@playwright/test';
import { ACHIEVEMENTS } from '../../src/content/achievements';
import { HINTS } from '../../src/content/tutorial';

const seed = async (page: Page, save: object) => {
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify({ version: 1, clicks: 30, lastTick: Date.now(), ...save }));
};
const rect = (page: Page, sel: string) => page.locator(sel).evaluate((e) => e.getBoundingClientRect().toJSON() as DOMRect);

test('Taskleiste: Start öffnet den Launcher, Esc, Zurück und Tipp daneben schließen ihn', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seed(page, { flags: { 'tut:off': 1 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  const start = page.locator('.taskbar-start');
  const launcher = page.locator('.launcher');
  await expect(launcher).toBeHidden();

  await start.tap();
  await expect(launcher).toBeVisible();
  await expect(start).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(launcher).toBeHidden();

  await start.tap();
  await page.goBack();
  await expect(launcher).toBeHidden();

  await start.tap();
  await page.locator('.counter').tap();
  await expect(launcher).toBeHidden();

  // App aus dem Launcher: ein Zurück schließt das Fenster (kein leerer Launcher-Schritt dazwischen)
  await start.tap();
  await page.locator('.launcher .app-system').tap();
  await expect(launcher).toBeHidden();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.sheet')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Launcher: Papierkorb darin hinterlässt keinen Verlaufseintrag, Tray-Tipp bei offenem Launcher öffnet die App', async ({ page }) => {
  await seed(page, { tickets: 5000, ticketsTotal: 5000, flags: { 'tut:off': 1 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  const depth = () => page.evaluate(() => history.length);
  const start = await depth();
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-trash').tap();
  await expect(page.locator('.launcher')).toBeHidden();
  // Blase sitzt sichtbar an der Leiste, nicht oben links
  const quip = await rect(page, '.quip');
  expect(quip.top).toBeGreaterThan(100);
  await expect.poll(async () => page.evaluate(() => history.state)).toBeNull();
  // Launcher offen, dann direkt auf die Upgrades-Kachel im Tray: Fenster bleibt offen
  await page.locator('.taskbar-start').tap();
  await page.locator('.tray-app.app-upgrades').tap();
  await page.waitForTimeout(400);
  await expect(page.locator('.launcher')).toBeHidden();
  await expect(page.locator('#panel-upgrades')).toBeVisible();
  // ein Zurück schließt das Fenster, danach steht der Verlauf wieder am Anfang
  await page.goBack();
  await expect(page.locator('.sheet')).toBeHidden();
  expect(await page.evaluate(() => history.state)).toBeNull();
  expect(await depth()).toBeGreaterThanOrEqual(start);
});

for (const pos of ['bottom', 'top', 'left', 'right'] as const) {
  test(`Taskleiste ${pos}: Leiste an der Kante, Launcher ganz im Bildschirm (kleines Handy)`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await seed(page, { flags: { 'tut:off': 1 }, settings: { taskbar: pos } });
    await page.goto('/');
    await page.locator('.key[data-key="Q"]').tap();
    await page.locator('.taskbar-start').tap();
    const screen = await rect(page, '.screen');
    const bar = await rect(page, '.taskbar');
    const menu = await rect(page, '.launcher');
    for (const r of [bar, menu]) {
      expect(r.left).toBeGreaterThanOrEqual(screen.left);
      expect(r.right).toBeLessThanOrEqual(screen.right);
      expect(r.top).toBeGreaterThanOrEqual(screen.top);
      expect(r.bottom).toBeLessThanOrEqual(screen.bottom);
    }
    const edge = { bottom: screen.bottom - bar.bottom, top: bar.top - screen.top, left: bar.left - screen.left, right: screen.right - bar.right }[pos];
    expect(edge).toBeLessThan(14);
  });
}

test('Taskleiste: Position in den Einstellungen wählen, bleibt nach Neuladen', async ({ page }) => {
  await seed(page, { flags: { 'tut:off': 1 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-taskbar', 'bottom');
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-system').tap();
  const left = page.getByRole('radio', { name: 'Taskleiste links' });
  await left.tap();
  await expect(left).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#app')).toHaveAttribute('data-taskbar', 'left');
  await page.locator('.sheet-close').tap();
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-taskbar', 'left');
});

test('Lautstärke: ↺ erscheint nach dem Verstellen und setzt zurück', async ({ page }) => {
  await seed(page, { flags: { 'tut:off': 1 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-system').tap();
  const reset = page.getByRole('button', { name: 'Lautstärke Tastatur und Spiel zurücksetzen' });
  await expect(reset).toBeHidden();
  await page.getByRole('slider', { name: 'Lautstärke Tastatur und Spiel' }).fill('0.3');
  await expect(reset).toBeVisible();
  await reset.tap();
  await expect(page.getByRole('slider', { name: 'Lautstärke Tastatur und Spiel' })).toHaveValue('0.7');
  await expect(reset).toBeHidden();
});

test('Hinweis vom Vorgänger findet Apps im Launcher: erst Start, dann die App', async ({ page }) => {
  // nur der Upgrades-Hinweis ist offen (Nochmal-Lesen), es gibt nichts zu kaufen: keine Kachel im Tray
  const flags: Record<string, number> = { 'tut:replay': 1 };
  for (const x of HINTS) if (x.id !== 'upgrades') flags[`tut:seen:${x.id}`] = 1;
  await seed(page, { flags });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  const note = page.locator('.tut-note');
  await expect(note).toBeVisible();
  await expect(note).toContainText('Upgrades');
  const near = async (sel: string) => {
    const spot = await rect(page, '.tut-spot');
    const el = await rect(page, sel);
    return Math.abs(spot.left + spot.width / 2 - (el.left + el.width / 2)) < 4 && Math.abs(spot.top + spot.height / 2 - (el.top + el.height / 2)) < 4;
  };
  await expect.poll(() => near('.taskbar-start')).toBe(true);
  // Start ist nur der Weg: Hinweis bleibt offen und springt auf die App im Launcher
  await page.locator('.taskbar-start').tap();
  await expect(page.locator('.launcher')).toBeVisible();
  await expect(note).toBeVisible();
  await expect.poll(() => near('.launcher .app-upgrades')).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hyt.save') ?? '{}').flags?.['tut:seen:upgrades'])).toBeFalsy();
  await page.locator('.launcher .app-upgrades').tap();
  await expect(note).toBeHidden();
  await expect(page.locator('#panel-upgrades')).toBeVisible();
});

test('Neue Achievements: oben unter „Geschafft“, kein Punkt an Karriere, „Alle gelesen“', async ({ page }) => {
  const now = Date.now();
  const [a, b] = ACHIEVEMENTS;
  await seed(page, { flags: { 'tut:off': 1, 'ach:seen': now - 60_000 }, achievements: { [a!.id]: now - 1_000, [b!.id]: now - 500 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  // nur Achievements, nichts zu kündigen: kein Punkt
  await expect(page.locator('.launcher .app-career')).not.toHaveClass(/has-badge/);
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-career').tap();
  await expect(page.locator('.chip-done')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.ach-news')).toContainText('neue Achievements');
  const fresh = page.locator('.ach.new');
  expect(await fresh.count()).toBeGreaterThanOrEqual(2);
  // neue stehen ganz oben
  await expect(page.locator('.achievements .ach:not([hidden])').first()).toHaveClass(/\bnew\b/);
  await page.getByRole('button', { name: 'Alle gelesen' }).tap();
  await expect(page.locator('.ach-news')).toBeHidden();
  expect(await page.locator('.ach.new:not(.read)').count()).toBe(0);
  // beim nächsten Öffnen nichts mehr neu
  await page.locator('.sheet-close').tap();
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-career').tap();
  await expect(page.locator('.ach.new')).toHaveCount(0);
});

test('Neue Achievements: im Blick = gelesen, Hervorhebung bleibt bis zum nächsten Öffnen', async ({ page }) => {
  const now = Date.now();
  const [a] = ACHIEVEMENTS;
  await seed(page, { flags: { 'tut:off': 1, 'ach:seen': now - 60_000 }, achievements: { [a!.id]: now - 1_000 } });
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-career').tap();
  const li = page.locator(`.ach[data-ach="${a!.id}"]`);
  await li.scrollIntoViewIfNeeded();
  // länger als die Lesezeit im Blick: bleibt trotzdem hervorgehoben, solange das Fenster offen ist
  await page.waitForTimeout(2_500);
  await expect(li).toHaveClass(/\bnew\b/);
  await expect(li).not.toHaveClass(/\bread\b/);
  await expect(page.locator('.ach-news')).toBeVisible();
  // beim nächsten Öffnen nicht mehr neu
  await page.locator('.sheet-close').tap();
  await page.locator('.taskbar-start').tap();
  await page.locator('.launcher .app-career').tap();
  await expect(page.locator('.ach.new')).toHaveCount(0);
});
