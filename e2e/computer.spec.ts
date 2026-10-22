import { expect, test } from '@playwright/test';

test('play against the computer without touching the server', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`solo${Date.now()}@example.com`);
  await page.getByLabel('Display name').fill('Solo');
  await page.getByRole('button', { name: 'Sign in without Google' }).click();

  await page.getByRole('main').getByRole('link', { name: 'Play vs computer' }).click();
  await page.getByRole('button', { name: /^Easy/ }).click();
  await page.getByRole('button', { name: 'Play X' }).click();

  const apiCalls: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) apiCalls.push(req.url());
  });
  await page.getByRole('button', { name: 'Start' }).click();

  const xs = page.locator('[role="gridcell"][aria-label$=": X"]');
  const os = page.locator('[role="gridcell"][aria-label$=": O"]');

  await page.locator('[data-x="7"][data-y="7"]').click();
  await expect(xs).toHaveCount(1);
  await expect(os).toHaveCount(1); // the computer answered
  await expect(page.getByText('Your turn')).toBeVisible();

  await page.locator('[data-x="0"][data-y="0"]').click();
  await expect(os).toHaveCount(2);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(xs).toHaveCount(1);
  await expect(os).toHaveCount(1);

  expect(apiCalls).toEqual([]);
});

test('computer opens when the player chooses O', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`solo-o${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Sign in without Google' }).click();
  await expect(page.getByRole('link', { name: 'Lobby' })).toBeVisible();
  await page.goto('/play/computer');
  await page.getByRole('button', { name: /^Hard/ }).click();
  await page.getByRole('button', { name: 'Play O' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.locator('[data-x="7"][data-y="7"][aria-label$=": X"]')).toBeVisible();
  await expect(page.getByText('Your turn')).toBeVisible();
});

test('expert (Rapfi) loads in the browser and plays', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/play/computer');
  await page.getByRole('button', { name: /^Expert/ }).click();
  await expect(page.getByText('Engine ready.')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Play X' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  const os = page.locator('[role="gridcell"][aria-label$=": O"]');
  await page.locator('[data-x="7"][data-y="7"]').click();
  await expect(os).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByText('Your turn')).toBeVisible();
});

test('expert engine reads coordinates as column,row', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/play/computer');
  // Rapfi has four in a row on row 2 (columns 3-6) with column 2 blocked: only (7,2) wins.
  const reply = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const worker = new Worker('/engine/rapfi-worker.js');
        const send = (data: string) => worker.postMessage({ type: 'command', data });
        worker.onmessage = (e) => {
          const { type, data } = e.data;
          if (type === 'error') reject(new Error(data));
          if (type === 'ready') {
            for (const cmd of ['START 15', 'INFO RULE 0', 'INFO TIMEOUT_TURN 1000', 'INFO TIMEOUT_MATCH 100000000']) send(cmd);
            send('BOARD 3,2,1 2,2,2 4,2,1 10,10,2 5,2,1 11,11,2 6,2,1 12,10,2 DONE');
          }
          if (type === 'stdout' && /^\d+,\d+$/.test(data.trim())) resolve(data.trim());
        };
        worker.postMessage({ type: 'init', dir: '/engine/rapfi-3c94c2a/', script: 'rapfi-single-simd128.js' });
      }),
  );
  expect(reply).toBe('7,2');
});
