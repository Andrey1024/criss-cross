import { expect, test, type Browser, type Page } from '@playwright/test';

async function signIn(browser: Browser, email: string, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Sign in without Google' }).click();
  await expect(page.getByRole('link', { name: 'Lobby' })).toBeVisible();
  return page;
}

const cell = (page: Page, x: number, y: number) => page.locator(`[data-x="${x}"][data-y="${y}"]`);

test('a guest joins an unrated room by link with just a name', async ({ browser }) => {
  const tag = Date.now();
  const alice = await signIn(browser, `alice-u${tag}@example.com`, 'Alice');
  const bob = await signIn(browser, `bob-u${tag}@example.com`, 'Bob');

  const roomName = `Friendly ${tag}`;
  await alice.getByLabel('Room name').fill(roomName);
  await alice.getByLabel(/Unrated, invite only/).check();
  await alice.getByRole('button', { name: 'Create room' }).click();
  await expect(alice.getByText('Waiting for an opponent')).toBeVisible();
  await expect(alice.getByText('Unrated', { exact: true })).toBeVisible();
  const link = alice.url();

  // Not listed in the lobby, even for signed-in players.
  await bob.reload();
  await expect(bob.getByRole('heading', { name: 'Create a room' })).toBeVisible();
  await expect(bob.getByText(roomName)).toHaveCount(0);

  // A signed-out visitor opens the link and joins with a display name.
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(link);
  await expect(guest.getByText('Alice invited you to an unrated game')).toBeVisible();
  await guest.getByLabel('Your name').fill('Dana');
  await guest.getByRole('button', { name: 'Join game' }).click();
  await expect(guest.getByText("Opponent's turn")).toBeVisible();
  await expect(alice.getByText('Your turn')).toBeVisible();
  await expect(alice.getByText('· guest')).toBeVisible();

  await guest.getByLabel('Chat message').fill('hi from a guest');
  await guest.getByRole('button', { name: 'Send' }).click();
  await expect(alice.getByText('hi from a guest')).toBeVisible();

  await cell(alice, 0, 7).click();
  await expect(guest.getByText('Your turn')).toBeVisible();
  // Reloading keeps the guest's identity and seat.
  await guest.reload();
  await expect(guest.getByText('Your turn')).toBeVisible();
  await expect(guest.getByText('Dana (you)')).toBeVisible();
  await cell(guest, 0, 8).click();

  for (let i = 1; i < 5; i++) {
    await expect(alice.getByText('Your turn')).toBeVisible();
    await cell(alice, i, 7).click();
    if (i < 4) {
      await expect(guest.getByText('Your turn')).toBeVisible();
      await cell(guest, i, 8).click();
    }
  }
  await expect(alice.getByText(/You won/)).toBeVisible();
  await expect(guest.getByText(/You lost/)).toBeVisible();
  // Unrated: no rating changes, and the guest can offer a rematch like anyone else.
  await expect(alice.getByText(/^[+−]\d+$/)).toHaveCount(0);
  await guest.getByRole('button', { name: 'Rematch' }).click();
  await expect(alice.getByText('Dana wants a rematch.')).toBeVisible();

  // Rated rooms still need an account.
  await bob.getByLabel('Room name').fill(`Rated ${tag}`);
  await bob.getByRole('button', { name: 'Create room' }).click();
  await expect(bob.getByText('Waiting for an opponent')).toBeVisible();
  await guest.goto(bob.url());
  await expect(guest).toHaveURL(/\/login\?next=/);
});
