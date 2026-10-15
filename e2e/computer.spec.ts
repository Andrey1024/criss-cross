import { expect, test } from '@playwright/test';

test('play against the computer without touching the server', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(`solo${Date.now()}@example.com`);
  await page.getByLabel('Display name').fill('Solo');
  await page.getByRole('button', { name: 'Sign in without Google' }).click();

  await page.getByRole('link', { name: 'Play vs computer' }).click();
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
  await page.goto('/');
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
