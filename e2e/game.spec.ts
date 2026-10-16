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

test('two players play a full game, chat, and see it in their history', async ({ browser }) => {
  const tag = Date.now();
  const alice = await signIn(browser, `alice${tag}@example.com`, 'Alice');
  const bob = await signIn(browser, `bob${tag}@example.com`, 'Bob');

  const roomName = `E2E ${tag}`;
  await alice.getByLabel('Room name').fill(roomName);
  await alice.getByRole('button', { name: 'Create room' }).click();
  await expect(alice.getByText('Waiting for an opponent')).toBeVisible();

  const row = bob.locator('li', { hasText: roomName });
  await row.getByRole('button', { name: 'Join' }).click();
  await expect(alice.getByText('Your turn')).toBeVisible();
  await expect(bob.getByText("Opponent's turn")).toBeVisible();

  await bob.getByLabel('Chat message').fill('hello from bob');
  await bob.getByRole('button', { name: 'Send' }).click();
  await expect(alice.getByText('hello from bob')).toBeVisible();

  for (let i = 0; i < 4; i++) {
    await cell(alice, i, 7).click();
    await expect(bob.getByText('Your turn')).toBeVisible();
    await cell(bob, i, 8).click();
    await expect(alice.getByText('Your turn')).toBeVisible();
  }
  await cell(alice, 4, 7).click();
  await expect(alice.getByText(/You won/)).toBeVisible();
  await expect(bob.getByText(/You lost/)).toBeVisible();
  // Rating changes appear once the rated game is processed.
  await expect(alice.getByText(/^\+\d+$/)).toBeVisible();
  await expect(bob.getByText(/^−\d+$/)).toBeVisible();

  await bob.getByRole('link', { name: 'Leaderboard' }).click();
  await expect(bob.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await expect(bob.getByText(/Play 2 more rated games/)).toBeVisible();

  await alice.getByRole('link', { name: 'My games' }).click();
  await expect(alice.getByRole('cell', { name: 'Bob' })).toBeVisible();
  await expect(alice.getByText('Win', { exact: true }).first()).toBeVisible();
  await alice.getByRole('link', { name: 'Replay' }).first().click();
  await expect(alice.getByText('9 / 9')).toBeVisible();
});

test('players start a rematch in the same room with colours swapped', async ({ browser }) => {
  const tag = Date.now();
  const alice = await signIn(browser, `alice-r${tag}@example.com`, 'Alice');
  const bob = await signIn(browser, `bob-r${tag}@example.com`, 'Bob');

  const roomName = `Rematch ${tag}`;
  await alice.getByLabel('Room name').fill(roomName);
  await alice.getByRole('button', { name: 'Create room' }).click();
  await bob.locator('li', { hasText: roomName }).getByRole('button', { name: 'Join' }).click();
  await expect(alice.getByText('Your turn')).toBeVisible();

  await cell(alice, 7, 7).click();
  await expect(bob.getByText('Your turn')).toBeVisible();
  await bob.getByRole('button', { name: 'Resign' }).click();
  await bob.getByRole('button', { name: 'Resign' }).last().click();
  await expect(alice.getByText(/You won/)).toBeVisible();

  await bob.getByRole('button', { name: 'Rematch' }).click();
  await expect(bob.getByText('Waiting for Alice to accept…')).toBeVisible();
  await expect(alice.getByText('Bob wants a rematch.')).toBeVisible();
  await alice.getByRole('button', { name: 'Accept rematch' }).click();

  // Bob now plays X and moves first on an empty board.
  await expect(bob.getByText('Your turn')).toBeVisible();
  await expect(alice.getByText("Opponent's turn")).toBeVisible();
  await expect(alice.getByText('0 moves')).toBeVisible();
  await cell(bob, 3, 3).click();
  await expect(alice.getByText('Your turn')).toBeVisible();
});

test('the move timer counts down and turns off only when both players agree', async ({ browser }) => {
  const tag = Date.now();
  const alice = await signIn(browser, `alice-t${tag}@example.com`, 'Alice');
  const bob = await signIn(browser, `bob-t${tag}@example.com`, 'Bob');

  const roomName = `Timer ${tag}`;
  await alice.getByLabel('Room name').fill(roomName);
  await alice.getByRole('button', { name: 'Create room' }).click();
  await bob.locator('li', { hasText: roomName }).getByRole('button', { name: 'Join' }).click();
  await expect(alice.getByText(/^Your turn · 0:[23]\d$/)).toBeVisible();
  await expect(bob.getByText(/^Opponent's turn · 0:[23]\d$/)).toBeVisible();

  await alice.getByRole('button', { name: 'Turn off timer' }).click();
  await expect(alice.getByText('Waiting for Bob to agree…')).toBeVisible();
  await expect(bob.getByText('Alice wants to turn off the move timer.')).toBeVisible();
  await bob.getByRole('button', { name: 'Accept' }).click();
  await expect(alice.getByText('No timer')).toBeVisible();
  await expect(bob.getByText('No timer')).toBeVisible();
  await expect(alice.getByText('Your turn', { exact: true })).toBeVisible();

  // Turning it back on needs agreement too; a decline leaves it off.
  await bob.getByRole('button', { name: 'Turn on timer' }).click();
  await expect(alice.getByText('Bob wants to turn the move timer back on.')).toBeVisible();
  await alice.getByRole('button', { name: 'Decline' }).click();
  await expect(bob.getByRole('button', { name: 'Turn on timer' })).toBeVisible();
  await expect(alice.getByText('No timer')).toBeVisible();
  await cell(alice, 7, 7).click();
  await expect(bob.getByText('Your turn', { exact: true })).toBeVisible();
});
