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

test('privacy policy and terms are public and linked from the footer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
  await expect(page).toHaveTitle(/Privacy Policy/);
  await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of service' })).toBeVisible();
});

test('the theme follows the system and the switch remembers a choice', async ({ browser }) => {
  const page = await (await browser.newContext({ colorScheme: 'dark' })).newPage();
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);

  const toggle = page.getByRole('button', { name: 'Dark theme' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(html).not.toHaveClass(/dark/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');

  // The explicit choice wins over the system setting, also on pre-rendered pages.
  await page.goto('/rules');
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});
