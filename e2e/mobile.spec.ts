import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('phones get a one-row header, a bottom tab bar and an account menu', async ({ page }) => {
  // Guest: logo + Sign in on top, Home / Computer / Rules at the bottom.
  await page.goto('/');
  const tabs = page.getByRole('navigation', { name: 'Main' });
  await expect(tabs.getByRole('link')).toHaveText(['Home', 'Computer', 'Rules']);
  expect((await page.locator('header').boundingBox())!.height).toBeLessThan(60);

  await page.goto('/login');
  await page.getByLabel('Email').fill(`phone${Date.now()}@example.com`);
  await page.getByLabel('Display name').fill('Phone Player');
  await page.getByRole('button', { name: 'Sign in without Google' }).click();

  // Signed in: four tabs, current one marked, header still a single row.
  await expect(tabs.getByRole('link')).toHaveText(['Lobby', 'Computer', 'Leaderboard', 'My games']);
  await expect(tabs.getByRole('link', { name: 'Lobby' })).toHaveAttribute('aria-current', 'page');
  expect((await page.locator('header').boundingBox())!.height).toBeLessThan(60);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

  await tabs.getByRole('link', { name: 'Leaderboard' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

  // Account menu holds the less frequent actions.
  await page.getByRole('button', { name: /Account menu/ }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByText('Phone Player')).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Rules & strategy' })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(tabs.getByRole('link')).toHaveText(['Home', 'Computer', 'Rules']);
});
