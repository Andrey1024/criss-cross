import { expect, test } from '@playwright/test';

test('a guest can read the landing page and rules and play the computer without signing in', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Play five in a row online' })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Rules' }).click();
  await expect(page).toHaveURL(/\/rules$/);
  await expect(page.getByRole('heading', { level: 1, name: /How to play five in a row/ })).toBeVisible();
  await expect(page).toHaveTitle(/Rules and Strategy/);

  await page.getByRole('navigation').getByRole('link', { name: 'Play vs computer' }).click();
  await page.getByRole('button', { name: /^Easy/ }).click();
  await page.getByRole('button', { name: 'Play X' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.locator('[data-x="7"][data-y="7"]').click();
  await expect(page.locator('[role="gridcell"][aria-label$=": O"]')).toHaveCount(1);
  await expect(page.getByText('You', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('protected pages send guests to sign in and back again', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fleaderboard$/);
  await page.getByLabel('Email').fill(`next${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Sign in without Google' }).click();
  await expect(page).toHaveURL(/\/leaderboard$/);
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

  // Signed in, "/" is the lobby rather than the landing page.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Open rooms/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Play five in a row online' })).toHaveCount(0);
});
