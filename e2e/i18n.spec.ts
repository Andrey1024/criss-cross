import { expect, test } from '@playwright/test';

test('Russian pages are pre-rendered and links stay in Russian', async ({ page }) => {
  await page.goto('/ru');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru-RU');
  await expect(page.getByRole('heading', { level: 1, name: 'Пять в ряд онлайн' })).toBeVisible();
  await expect(page).toHaveTitle(/Пять в ряд онлайн/);

  await page.getByRole('navigation').getByRole('link', { name: 'Правила' }).click();
  await expect(page).toHaveURL(/\/ru\/rules$/);
  await expect(page.getByRole('heading', { level: 1, name: /Как играть/ })).toBeVisible();

  await page.getByRole('navigation').getByRole('link', { name: 'Игра с компьютером' }).click();
  await expect(page).toHaveURL(/\/ru\/play\/computer$/);
  await page.getByRole('button', { name: /^Лёгкий/ }).click();
  await page.getByRole('button', { name: 'Играть за X' }).click();
  await page.getByRole('button', { name: 'Начать' }).click();
  await page.locator('[data-x="7"][data-y="7"]').click();
  await expect(page.locator('[role="gridcell"][aria-label$=": O"]')).toHaveCount(1);
  await expect(page.getByText('Ваш ход')).toBeVisible();
});

test('the language switch keeps the page and remembers the choice', async ({ page }) => {
  await page.goto('/rules');
  await page.getByRole('button', { name: 'Language: Русский' }).click();
  await expect(page).toHaveURL(/\/ru\/rules$/);
  await expect(page.getByRole('heading', { level: 1, name: /Как играть/ })).toBeVisible();

  // An English link now opens the Russian version.
  await page.goto('/play/computer');
  await expect(page).toHaveURL(/\/ru\/play\/computer$/);

  await page.getByRole('button', { name: 'Язык: English' }).click();
  await expect(page).toHaveURL(/\/play\/computer$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Play five in a row against the computer' })).toBeVisible();
});

test('a Russian browser is offered the Russian site, never redirected', async ({ browser }) => {
  const page = await (await browser.newContext({ locale: 'ru-RU' })).newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Play five in a row online' })).toBeVisible();
  await page.getByRole('button', { name: 'Перейти на русский' }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.getByText('Сайт доступен на русском языке.')).toHaveCount(0);
});

test('signed-in play works in Russian', async ({ page }) => {
  await page.goto('/ru/login');
  await page.getByLabel('Email').fill(`ru${Date.now()}@example.com`);
  await page.getByLabel('Имя').fill('Алиса');
  await page.getByRole('button', { name: 'Войти без Google' }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.getByText('Открытые комнаты')).toBeVisible();
  await expect(page.getByLabel('Название комнаты')).toHaveValue('Комната (Алиса)');
  await page.getByRole('button', { name: 'Создать комнату' }).click();
  await expect(page).toHaveURL(/\/ru\/room\//);
  await expect(page.getByText('Ждём соперника…')).toBeVisible();
});
