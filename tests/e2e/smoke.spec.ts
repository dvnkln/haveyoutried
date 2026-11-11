import { expect, test } from '@playwright/test';
import { PATCH_DEPARTMENTS } from '../../src/content/incidents';
import { SOLVE } from '../../src/config';

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: import('@playwright/test').Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
/** App über Start → Launcher öffnen */
const openApp = async (page: import('@playwright/test').Page, id: string) => {
  await page.locator('.taskbar-start').tap();
  await page.locator(`.launcher .app-${id}`).tap();
};
const tickets = async (page: import('@playwright/test').Page) =>
  Number((await page.locator('.counter-value').textContent())?.replace(/[^\d.]/g, ''));

test('Kern-Loop: tippen, kaufen, produzieren, speichern', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Startkapital für den ersten Praktikanten (15 Tickets), ein Ticket kommt gleich dazu
  const save = { version: 1, tickets: 14, ticketsTotal: 14, clicks: 0, lastTick: Date.now(), flags: { 'tut:off': 1 } };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  await expect(page.locator('.close-btn')).toBeVisible();
  // Ticketverlauf läuft im Hintergrund mit (App „Tickets“), auf dem Desktop steht das Arbeitsfenster
  await expect(page.locator('.history')).toBeAttached();
  await expect(page.locator('.work')).toBeVisible();

  // Button liegt in der unteren Bildschirmhälfte (Daumenzone)
  const box = (await page.locator('.close-btn').boundingBox())!;
  expect(box.y + box.height / 2).toBeGreaterThan(740 / 2);

  // Tippen bringt noch keine Tickets, erst das gelöste Ticket (SOLVE.work Anschläge)
  for (let i = 0; i < 24; i++) await page.locator('.key[data-key="Q"]').tap();
  await expect(page.locator('.counter-value')).toHaveText('14');
  await expect(page.locator('.history .hist')).toHaveCount(0);
  await page.locator('.close-btn').tap();
  await expect(page.locator('.counter-value')).toHaveText('15');
  // gelöst: Erfolgsstempel (bleibt im DOM, also kein Wettlauf mit der kurzen Pause), Statuszeile zeigt weiter das Ticket
  await expect(page.locator('.solved-stamp')).toHaveClass(/show/);
  await expect(page.locator('.solved-stamp')).toContainText('✓');
  await expect(page.locator('.last-closed')).toContainText('#INC-');
  // Ticketverlauf: genau eine Karte für das abgeschickte Ticket, mit interner Notiz
  await expect(page.locator('.history .hist')).toHaveCount(1);
  await expect(page.locator('.history .hist-note')).not.toBeEmpty();
  await expect(page.locator('.history .hist-solution')).not.toBeEmpty();
  await shot(page, '1-queue');

  await openApp(page, 'infra');
  const buy = page.locator('button.buy[data-gen="intern"]');
  await expect(buy).toBeEnabled();
  await buy.tap();
  await expect(page.locator('.gen[data-gen="intern"] .gen-owned')).toHaveText('×1');
  await expect(page.locator('.rate')).toHaveText('+0.02/s');
  // Bash-Skript ist ab 50 Tickets sichtbar, vorher Teaser
  await expect(page.locator('.gen[data-gen="bash"]')).toBeHidden();
  await expect(page.locator('.gen-locked')).toBeVisible();
  await shot(page, '2-infra');

  // App-Fenster schließen, dann die nächste App vom Desktop öffnen
  await page.locator('.sheet-close').tap();
  await expect(page.locator('.sheet')).toBeHidden();
  await openApp(page, 'system');
  await expect(page.locator('#panel-system .stats')).toContainText('Von Hand gelöst');
  await shot(page, '3-system');

  // Reload: Stand bleibt (pagehide-Save)
  await page.reload();
  await openApp(page, 'infra');
  await expect(page.locator('.gen[data-gen="intern"] .gen-owned')).toHaveText('×1');
  expect(errors).toEqual([]);
});

test('Abwesenheit: erste Stunde voll, dann ein Fünftel, höchstens 8 h; der Chef schreibt', async ({ page, context }) => {
  const twoDaysAgo = Date.now() - 48 * 3600_000;
  // 4 Bash-Skripte à 0.25/s = 1/s
  const save = { version: 1, tickets: 0, generators: { bash: { owned: 4 } }, lastTick: twoDaysAgo };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  const modal = page.locator('dialog.modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('8.64 K'); // (1 h + 7 h × 0,2) × 1/s
  await expect(modal).toContainText('Neue Mail vom Chef');
  await expect(modal).toContainText('Wochenende');
  await shot(page, '4-offline');
  await modal.locator('.modal-actions .btn').tap();
  await expect(modal).toBeHidden();
  expect(await tickets(page)).toBeGreaterThanOrEqual(8.6);
});

test('Upgrades: Badge, Kauf, Wirkung; Sound-Schalter', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const save = { version: 1, tickets: 5000, ticketsTotal: 5000, clicks: 30, lastTick: Date.now(), flags: { 'tut:off': 1 } };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  // was zu kaufen: Upgrades steht im Tray der Taskleiste, mit Punkt
  const tab = page.locator('.tray-app.app-upgrades');
  await expect(tab).toBeVisible();
  await expect(tab).toHaveClass(/has-badge/);
  // Upgrades stehen sichtbar auf dem Schreibtisch: vor dem Kauf kein Kaffeebecher
  await expect(page.locator('.mug')).toBeHidden();
  await tab.tap();
  await page.locator('button[data-upgrade="coffee"]').tap();
  await expect(page.locator('.upgrades-done')).toContainText('Kaffeemaschine');
  await shot(page, '5-upgrades');

  // Fenster zu, zurück an die Tastatur
  await page.locator('.sheet-close').tap();
  await expect(page.locator('.mug')).toBeVisible();
  // Kaffeemaschine: doppeltes Tempo, ein Ticket braucht nur noch halb so viele Anschläge
  for (let i = 0; i < 13; i++) await page.locator('.close-btn').tap();
  await expect(page.locator('.solved-stamp')).toHaveClass(/show/);

  await openApp(page, 'system');
  const sound = page.getByRole('switch', { name: 'Sound' });
  await sound.tap();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await expect(sound).toHaveClass(/off/);
  await shot(page, '6-system');
  expect(errors).toEqual([]);
});

test('Layout bleibt bildschirmbreit, auch bei langen Texten', async ({ page }) => {
  await page.goto('/');
  await page.locator('.close-btn').tap();
  const r = await page.evaluate(() => {
    document.querySelector('.last-closed')!.textContent = '#INC-004769 → ' + 'Bekanntes Problem, Fix kommt im nächsten Release '.repeat(3);
    document.querySelector('.counter-value')!.textContent = '999.99e123';
    document.querySelector('.caller-who')!.textContent = 'X'.repeat(80);
    return {
      vw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
      lastTabRight: document.querySelector('.taskbar')!.getBoundingClientRect().right,
    };
  });
  expect(r.sw).toBe(r.vw);
  expect(r.lastTabRight).toBeLessThanOrEqual(r.vw);
});

test('Zufallsevent: Pager → Entscheidung → Ergebnis', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const save = {
    version: 1,
    tickets: 500,
    ticketsTotal: 500,
    generators: { bash: { owned: 5 } },
    stats: { startedAt: Date.now(), playTimeMs: 60_000, offlineTickets: 0 },
    events: { nextAt: 61_000, active: null, lastId: '', seen: {} },
    lastTick: Date.now(),
  };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  // Pager liegt als Gerät auf dem Tisch (Banner nur bei offenem App-Fenster)
  const pager = page.locator('.pager-device');
  await expect(pager).toHaveClass(/alert/, { timeout: 5_000 });
  await expect(pager).toContainText(/\d+s/);
  await shot(page, '9-pager');
  await pager.tap();

  const dialog = page.locator('dialog.modal-event');
  await expect(dialog).toBeVisible();
  const first = dialog.locator('.modal-actions .btn').first();
  await expect(first).toBeEnabled(); // nach Sperrzeit
  await shot(page, '10-event');
  await first.tap();

  const result = page.locator('dialog.modal-result');
  await expect(result).toBeVisible();
  await expect(result.locator('.effect-line')).not.toBeEmpty();
  await shot(page, '11-result');
  await result.locator('.btn').tap();
  await expect(pager).not.toHaveClass(/alert/);
  // Pager-Einsatz landet als Karte im Ticketverlauf
  const card = page.locator('.history .hist').filter({ hasText: 'Pager' });
  await expect(card).toHaveCount(1);
  await expect(card.locator('.hist-reply')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

for (const id of ['raid', 'spam', 'services', 'loggrep', 'network', 'patch']) {
  test(`Incident ${id}: Alarm → Spiel → Ergebnis`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.clock.install();
    await page.goto(`/?incident=${id}`);
    await page.clock.runFor(1_500);

    const alert = page.locator('.incident[data-state="crit"] .mon-detail');
    await expect(alert).toBeVisible();
    await expect(alert.locator('.nag-title')).toContainText('** PROBLEM:');
    await expect(alert).toContainText('Assigned to: you');
    const take = page.locator('.nag-take');
    await expect(take).toBeDisabled(); // Sperre gegen Fehlgriffe
    await shot(page, `inc-${id}-1-alert`);
    // ohne Übernehmen startet nichts
    await page.clock.runFor(20_000);
    await expect(page.locator('.inc-game')).toHaveCount(0);
    await expect(take).toBeEnabled();
    await expect(alert.locator('.nag-task')).not.toBeEmpty();
    await take.click();
    // Countdown: Spielfeld sichtbar, aber gesperrt
    await expect(page.locator('.inc-ready')).toHaveText('3');
    await expect(page.locator('.inc-game')).toBeVisible();
    await page.clock.runFor(2_500);
    await shot(page, `inc-${id}-2-game`);

    await page.clock.runFor(30_000);
    const ack = page.locator('.nag-close');
    await expect(ack).toBeVisible();
    await expect(page.locator('.incident .effect-line').first()).not.toBeEmpty();
    await shot(page, `inc-${id}-3-result`);
    await page.clock.runFor(1_000);
    await ack.click();
    await expect(page.locator('.incident')).toBeHidden();
    await expect(page.locator('.history .hist').filter({ hasText: 'CRITICAL' })).toHaveCount(1);

    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(360);
    expect(errors).toEqual([]);
  });
}

test('Reload während eines Incidents gilt als Eskalation, kein sofortiger neuer Incident', async ({ page }) => {
  await page.goto('/?incident=raid');
  await expect(page.locator('.incident[data-state="crit"] .mon-detail')).toBeVisible({ timeout: 5_000 });
  // Incident läuft im Monitor, der Rest des Tischs ist gesperrt
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('.keyboard-wrap')!.inert)).toBe(true);
  await page.goto('/');
  await expect(page.locator('.buff-bad')).toBeVisible();
  await expect(page.locator('.history .hist').filter({ hasText: 'Eskaliert (Admin weg)' })).toHaveCount(1);
  await page.waitForTimeout(2_000);
  await expect(page.locator('.incident')).toBeHidden();
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('.keyboard-wrap')!.inert)).toBe(false);
});

test('Patchkabel: Antippen-Antippen und Ziehen verbinden, Uplink straft', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto('/?incident=patch');
  await page.clock.runFor(2_500);
  await page.clock.runFor(1_500);
  await page.locator('.nag-take').click();
  await page.clock.runFor(3_200);

  const vlan = (dept: string) => PATCH_DEPARTMENTS.find((d) => d.name === dept)!.vlan;
  const lefts = page.locator('.port-left');
  const n = await lefts.count();

  // Uplink: Strafe, nichts verbunden
  await lefts.nth(0).click();
  await page.locator('.port-right.uplink').click();
  await expect(page.locator('.patch-info')).toContainText('Spanning Tree');

  for (let i = 0; i < n; i++) {
    const dept = (await lefts.nth(i).locator('.port-label').textContent())!;
    const right = page.locator('.port-right', { hasText: `VLAN ${vlan(dept)}` });
    if (i % 2 === 0) {
      await lefts.nth(i).click();
      await right.click();
    } else {
      const a = (await lefts.nth(i).boundingBox())!;
      const b = (await right.boundingBox())!;
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
      await page.mouse.up();
    }
    // nach dem letzten Kabel ist das Spiel vorbei und das Feld weg – vorher zählen
    if (i < n - 1) {
      await expect(lefts.nth(i)).toHaveClass(/done/);
      await expect(page.locator('.patch-cable')).toHaveCount(i + 1);
      if (i === n - 2) await shot(page, 'inc-patch-played');
    }
  }
  await page.clock.runFor(500);
  await expect(page.locator('.nag-recovery')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Patchkabel: Ziehen und außerhalb loslassen hängt nicht, Fehlklick zählt einfach', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?incident=patch');
  await page.clock.runFor(4_000);
  await page.locator('.nag-take').click();
  await page.clock.runFor(3_200);

  const left = page.locator('.port-left').first();
  const a = (await left.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, 5, { steps: 4 }); // nach oben aus dem Board raus
  await page.mouse.up();
  await expect(page.locator('.patch-temp')).toHaveAttribute('d', '');

  // falscher Port: genau ein Fehlgriff
  const dept = (await left.locator('.port-label').textContent())!;
  const vlan = PATCH_DEPARTMENTS.find((d) => d.name === dept)!.vlan;
  const wrong = page.locator('.port-right:not(.uplink)').filter({ hasNotText: `VLAN ${vlan}` }).first();
  await left.click();
  await wrong.click();
  await page.clock.runFor(200);
  await expect(page.locator('.inc-status')).toContainText('Fehlgriffe: 1');
});

test('Karriere: kündigen, neue Firma, Achievement-Toast', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const save = {
    version: 1,
    // 100 Punkt-Schwellen à 250 K = 10 Punkte Berufserfahrung
    tickets: 5e6,
    ticketsTotal: 2.5e7,
    ticketsAllTime: 2.5e7,
    clicks: 5,
    generators: { cron: { owned: 12 } },
    lastTick: Date.now(),
  };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));

  await page.goto('/');
  await expect(page.locator('.prompt-user')).toHaveText('root@mueller-spedition');
  // 0 → 10 Punkte Erfahrung: lohnt sich richtig, kräftiger Punkt im Tray
  const career = page.locator('.tray-app.app-career');
  await expect(career).toHaveClass(/badge-strong/);
  await career.tap();
  await expect(page.locator('.career')).toContainText('+10');
  await shot(page, 'career-1');
  await page.getByRole('button', { name: 'Kündigen', exact: true }).tap();
  const confirm = page.getByRole('button', { name: 'Kündigen. Ernsthaft.' });
  await expect(confirm).toBeEnabled();
  await confirm.tap();
  // Meldung in zwei Teilen: alter Job (Abschied, Erfahrung), neuer Job (Begrüßung, Eigenheit)
  const modal = page.locator('dialog.modal');
  await expect(modal).toContainText('Jobwechsel');
  await expect(modal.locator('.job-old')).toContainText('Müller & Söhne');
  await expect(modal.locator('.job-old')).toContainText('+10 Berufserfahrung');
  await expect(modal.locator('.job-new')).toContainText('Erster Tag');
  await expect(modal.locator('.job-new')).not.toContainText('Müller & Söhne');
  await shot(page, 'career-quit');
  await page.getByRole('button', { name: 'Na dann.' }).tap();
  // neuer Job, neuer Account: Anmeldung mit dem Host der neuen Firma
  await expect(page.locator('.login')).toBeVisible();
  await expect(page.locator('.login-host')).not.toHaveText('mueller-spedition');
  await expect(page.locator('.login-host')).toHaveText((await page.locator('.prompt-user').textContent())!.replace('root@', ''));

  await expect(page.locator('.prompt-user')).not.toHaveText('root@mueller-spedition');
  await expect(page.locator('.counter-value')).toHaveText('0');
  // Meldungen kommen nacheinander: vor dieser stehen evtl. noch andere Achievements an
  await expect(page.locator('.toasts')).toContainText('Neuer Job, alte Probleme', { timeout: 20_000 });
  await shot(page, 'career-2');
  expect(await page.locator('.ach.done').count()).toBeGreaterThanOrEqual(2);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
  expect(errors).toEqual([]);
});

test('Tastatur: jede Taste zählt, auch Sondertasten, physische Tasten und die Maus; Ente zählt nicht', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Rubber Duck gekauft: steht dann auf dem Tisch
  const save = { version: 1, tickets: 0, ticketsTotal: 0, clicks: 0, upgrades: { duck: true }, lastTick: Date.now() };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));
  await page.goto('/');

  // Fortschritt am Ticket (Füllstand der Statuszeile) in Anschlägen; ohne Upgrades bringt jeder Anschlag 1 von SOLVE.work
  const presses = async () =>
    Math.round(Number(await page.locator('.last-closed').evaluate((e) => getComputedStyle(e).getPropertyValue('--p'))) * SOLVE.work);
  // verschiedene Tasten, auch Sondertasten und die Kaugummi-Taste
  for (const k of ['Q', 'A', 'CAPSLOCK', 'B', ' ']) await page.locator(`.key[data-key="${k}"]`).tap();
  await expect.poll(presses).toBe(5);
  // Alt+F4 schließt das Fenster samt Ticket; der nächste Anschlag öffnet das nächste, Enter tippt dann wie jede andere Taste
  await page.locator('.key[data-key="F4"]').tap();
  await expect(page.locator('.work')).toBeHidden();
  await page.locator('.key[data-key="ENTER"]').tap();
  await expect(page.locator('.work')).toBeVisible();
  await expect.poll(presses).toBe(0);
  await page.locator('.key[data-key="ENTER"]').tap();
  await expect.poll(presses).toBe(1);

  // Tippen schreibt eine echte Antwort ins Arbeitsfenster (Mail, Ticket oder Terminal)
  for (const k of ['W', 'E']) await page.locator(`.key[data-key="${k}"]`).tap();
  await expect(page.locator('.typed')).toHaveText(/^.{4,}$/);
  await expect(page.locator('.work')).toHaveAttribute('data-kind', /mail|ticket|term|chat|call|rdp|web|search|ai/);

  // physische Tastatur (Desktop): Buchstaben und unbekannte Zeichen zählen, Auto-Repeat nicht
  await page.locator('body').press('x');
  await page.locator('body').press('7');
  await expect.poll(presses).toBe(5);
  await page.dispatchEvent('body', 'keydown', { key: 'x', repeat: true });
  await expect.poll(presses).toBe(5);

  // Treffer zwischen die Tasten bzw. auf den Rahmen zählt auch (ganze Tastatur ist Tippfläche)
  const kb = (await page.locator('.keyboard').boundingBox())!;
  await page.touchscreen.tap(kb.x + 3, kb.y + 3);
  await expect.poll(presses).toBe(6);

  // Gummiente quietscht nur
  await page.locator('.duck').tap();
  await expect.poll(presses).toBe(6);
  await expect(page.locator('.quip').last()).toBeVisible();

  // Maus antippen zählt dagegen wie ein Tastendruck
  await page.locator('.mouse').tap();
  await expect.poll(presses).toBe(7);
  // Tickets gibt es erst beim Lösen
  await expect(page.locator('.counter-value')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('Ticketverlauf lässt sich scrollen, Antwort steht vor dem letzten Anschlag ganz da', async ({ page, context }) => {
  // alle Tempo-Upgrades: Tickets sind in wenigen Anschlägen gelöst
  const ups = ['coffee', 'mousepad', 'mouse', 'keyboard', 'answering', 'headset', 'macro'];
  const save = { version: 2, tickets: 1e5, ticketsTotal: 1e6, clicks: 5000, lastTick: Date.now(), flags: { 'tut:off': 1 }, upgrades: Object.fromEntries(ups.map((u) => [u, true])) };
  await context.addInitScript((json) => localStorage.setItem('hyt.save', json), JSON.stringify(save));
  await page.goto('/');
  const key = page.locator('.key[data-key="Q"]');
  let fullBeforeSolve = 0;
  for (let i = 0; i < 45; i++) {
    const before = await page.locator('.history .hist').count();
    const restBefore = await page.locator('.typed-rest').evaluate((e) => e.textContent ?? '');
    await key.dispatchEvent('pointerdown', { pointerId: 1, button: 0, isPrimary: true });
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 })));
    // dieser Anschlag hat gelöst: vorher war die Antwort schon komplett zu sehen
    if ((await page.locator('.history .hist').count()) > before && restBefore === '') fullBeforeSolve++;
  }
  expect(fullBeforeSolve).toBeGreaterThan(5);
  await openApp(page, 'log');
  const body = page.locator('.sheet-body');
  await expect.poll(() => body.evaluate((e) => e.scrollHeight > e.clientHeight * 2)).toBe(true);
  await body.evaluate((e) => (e.scrollTop = e.scrollHeight));
  expect(await body.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
});

test('Erster Start: Splash, Zettel, winken = Licht, Knopf = Monitor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?boot');
  // alles aus, kein Werkzeug offen
  await expect(page.locator('#app')).toHaveClass(/screen-off/);
  await expect(page.locator('.lights-off')).toBeAttached();
  const power = page.locator('.splash-power');
  await expect(power).toBeVisible();
  await expect(page.locator('.splash-title')).toHaveText('Have You Tried Turning It Off and On Again?');
  await power.tap();
  await expect(page.locator('.splash')).toHaveCount(0);
  // erstes Mal: Zettel vom Vorgänger, Knopf erst nach kurzer Sperre
  const note = page.locator('dialog.handover-note');
  await expect(note).toBeVisible();
  await note.getByRole('button', { name: 'Gelesen. Ungefähr.' }).tap();
  await expect(note).toBeHidden();
  // winken: Licht an (langsam beim ersten Mal), Monitor bleibt aus
  await page.mouse.click(180, 200);
  await expect(page.locator('#app')).not.toHaveClass(/\bafk\b/);
  await expect(page.locator('#app')).toHaveClass(/screen-off/);
  await expect(page.locator('#app')).toHaveClass(/await-power/);
  // Hinweis auf den Knopf erst, wenn jemand sucht: Tastatur tippt bei aus-Monitor nicht, zeigt aber gleich auf den Knopf
  await expect(page.locator('.power-hint')).toBeHidden();
  await page.locator('.key[data-key="Q"]').tap();
  await expect(page.locator('#app')).toHaveClass(/screen-off/);
  await expect(page.locator('.power-hint')).toBeVisible();
  // Knopf am Monitor: an; erst die Anmeldung (jede Taste ein Kennwort-Punkt, zählt nicht als Anschlag)
  await page.locator('.mon-power').tap();
  await expect(page.locator('#app')).not.toHaveClass(/screen-off/);
  const login = page.locator('.login');
  await expect(login).toBeVisible();
  await expect(page.locator('.login-host')).toHaveText('mueller-spedition');
  for (let i = 0; i < 8; i++) await page.locator('.key[data-key="Q"]').tap();
  await expect(login).toContainText('Willkommen');
  await expect(login).toBeHidden();
  // dann nur Hintergrundbild und Taskleiste
  await expect(page.locator('.wp-mark')).toBeVisible();
  await expect(page.locator('.taskbar-start')).toBeVisible();
  await expect(page.locator('.work')).toBeHidden();
  // nächster Anschlag öffnet das Werkzeug, getippt wird danach
  await page.locator('.key[data-key="Q"]').tap();
  await expect(page.locator('.work')).toBeVisible();
  await expect(page.locator('.work-body')).toHaveClass(/empty/);
  await page.locator('.key[data-key="Q"]').tap();
  await expect(page.locator('.work-body')).not.toHaveClass(/empty/);
  // aus- und wieder einschalten (nach der langen Einschalt-Animation des ersten Starts): Werkzeug bleibt offen
  await expect(page.locator('#app')).not.toHaveClass(/power-busy/);
  await page.locator('.mon-power').tap();
  await expect(page.locator('#app')).toHaveClass(/screen-off/);
  await page.locator('.mon-power').tap();
  await expect(page.locator('#app')).not.toHaveClass(/screen-off/);
  await expect(page.locator('.work')).toBeVisible();

  expect(errors).toEqual([]);
});

test('Start mit Spielstand: Splash, Licht, Monitor, dann Chef-Mail statt Zettel', async ({ page, context }) => {
  const save = { version: 1, tickets: 0, clicks: 50, generators: { bash: { owned: 4 } }, lastTick: Date.now() - 48 * 3600_000 };
  await context.addInitScript((json) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hyt.save', json);
      sessionStorage.setItem('seeded', '1');
    }
  }, JSON.stringify(save));
  await page.goto('/?boot');
  await page.locator('.splash-power').tap();
  await expect(page.locator('.splash')).toHaveCount(0);
  // kein Zettel; die Chef-Mail kommt erst, wenn Licht und Monitor an sind
  await page.mouse.click(180, 200);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.locator('.mon-power').tap();
  await expect(page.locator('#app')).not.toHaveClass(/screen-off/);
  const mail = page.locator('dialog.boss-mail');
  await expect(mail).toBeVisible();
  await expect(page.locator('dialog.handover-note')).toHaveCount(0);
  await mail.locator('.modal-actions .btn').tap();
  await expect(page.locator('.work')).toBeHidden();
  await page.locator('.key[data-key="W"]').tap();
  await expect(page.locator('.work')).toBeVisible();
  // mit Spielstand klingelt gleich das Telefon
  await expect(page.locator('.caller')).not.toHaveClass(/quiet/);
});

test('Hinweis vom Vorgänger hält die Tastatur an, bis man ihn bestätigt', async ({ page }) => {
  await page.goto('/');
  // nach dem ersten gelösten Ticket kommt ein Hinweis
  const typedLen = () => page.locator('.typed').evaluate((e) => e.textContent?.length ?? 0);
  const note = page.locator('.tut-note:not([hidden])');
  for (let i = 0; i < 40 && !(await note.count()); i++) await page.locator('.key[data-key="Q"]').tap();
  await expect(note).toBeVisible();
  const before = await typedLen();
  await page.locator('.key[data-key="W"]').tap();
  await page.locator('body').press('x');
  expect(await typedLen()).toBe(before);
  // woanders tippen schließt ihn nicht
  await page.mouse.click(20, 20);
  await expect(note).toBeVisible();
  await note.locator('.tut-ok').tap();
  await expect(note).toHaveCount(0);
  await page.locator('.key[data-key="W"]').tap();
  await expect.poll(typedLen).not.toBe(before);
});

test('Wer im App-Fenster ist, macht keine Pause: danach keine Memes', async ({ page }) => {
  const save = { version: 1, clicks: 50, lastTick: Date.now(), flags: { 'tut:off': 1 } };
  await page.addInitScript((json) => localStorage.setItem('hyt.save', json), JSON.stringify(save));
  await page.clock.install();
  await page.goto('/');
  await page.locator('.key[data-key="Q"]').tap();
  // länger als die Meme-Schwelle (15 s) im Infra-Fenster
  await openApp(page, 'infra');
  await page.clock.runFor(17_000);
  await page.locator('.sheet-close').tap();
  await page.clock.runFor(1_000);
  await expect(page.locator('.work')).not.toHaveAttribute('data-kind', 'memes');
  // ohne Fenster und ohne Tippen kommen sie wie gewohnt
  await page.clock.runFor(16_000);
  await expect(page.locator('.work')).toHaveAttribute('data-kind', 'memes');
});

test('Büro-Geräusche: jedes Geräusch von nebenan spielt ohne Fehler', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('hyt.save', JSON.stringify({ version: 1, clicks: 50, lastTick: Date.now(), flags: { 'tut:off': 1 } })));
  await page.goto('/');
  // eine Geste gibt den Ton frei
  await page.locator('.key[data-key="Q"]').tap();
  const played = await page.evaluate(() => {
    const amb = (window as unknown as { hytAmbience: { play(kind: string): void } }).hytAmbience;
    for (const kind of ['typing', 'printer', 'phone', 'chair', 'water', 'coffee']) amb.play(kind);
    return true;
  });
  expect(played).toBe(true);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('Smart-Office: beim Start gehen Licht und Monitor von selbst an', async ({ page }) => {
  const save = { version: 1, clicks: 50, lastTick: Date.now(), flags: { 'tut:off': 1 }, upgrades: { smartoffice: true } };
  await page.addInitScript((json) => localStorage.setItem('hyt.save', json), JSON.stringify(save));
  // ohne Update-Aussetzer
  await page.goto('/?boot&noglitch');
  await page.locator('.splash-power').tap();
  await expect(page.locator('#app')).not.toHaveClass(/\bafk\b/, { timeout: 3_000 });
  await expect(page.locator('#app')).not.toHaveClass(/screen-off/, { timeout: 3_000 });
  await expect(page.locator('.brand')).toContainText('smart');
});
