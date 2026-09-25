// M6 rewards (R-RWD-4 as the parent reshaped it): cosmetics unlock from lifetime shells and are
// worn at once; the shop sells real rewards for shells to spend; the parent gives or cancels them;
// the badge shelf and shells on the beach. Desktop (mouse) and tablet (touch).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { generatePc } from '../src/engine/topics/pc/generator';
import { current, openHome, PIN } from './helpers';

async function press(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

const rewardsRow = (shells: number, o: object = {}) => ({
  profileId: 'default',
  shells,
  spent: 0,
  streak: 0,
  badges: [],
  accessories: [],
  ...o,
});

async function unlock(page: Page, touch: boolean) {
  await press(page.getByRole('button', { name: 'Parent', exact: true }), touch);
  const pad = page.getByRole('group', { name: 'PIN pad' });
  for (const d of PIN) await press(pad.getByRole('button', { name: d, exact: true }), touch);
  await press(page.getByRole('navigation').getByRole('button', { name: 'Rewards' }), touch);
}

test('crossing 20 lifetime shells unlocks a hat for Shelly, worn at once; she can take it off', async ({
  page,
  hasTouch,
}) => {
  await openHome(page, { rewards: [rewardsRow(18)] });
  await expect(page.getByText('Next to unlock: a hat for Shelly')).toBeVisible();
  await expect(page.locator('.beach-turtle .accessory-hat')).toHaveCount(0);
  await press(page.getByRole('button', { name: 'Price changes', exact: true }), hasTouch);
  await press(page.getByRole('button', { name: /^Level 1/ }), hasTouch);
  const { level, seed } = await current(page);
  const q = generatePc(level, seed, '$');
  await press(page.locator('.mc-option').nth(q.options.findIndex((o) => o.code === 'correct')), hasTouch);
  await press(page.getByRole('button', { name: 'Check' }), hasTouch);
  await expect(page.getByText('New for Shelly: a hat!')).toBeVisible();

  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);
  await expect(page.locator('.beach-turtle .accessory-hat')).toHaveCount(1);
  const hat = page.getByRole('button', { name: 'a hat for Shelly' });
  await expect(hat).toHaveAttribute('aria-pressed', 'true');
  await press(hat, hasTouch);
  await expect(hat).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.beach-turtle .accessory-hat')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'a hat for Shelly' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByText('Next to unlock: a scarf for Pip')).toBeVisible();
});

test('the shop: buy the treat, it waits for a grown-up, the parent marks it given (R-RWD-4)', async ({
  page,
  hasTouch,
}) => {
  await openHome(page, { rewards: [rewardsRow(200, { badges: [{ id: 'first-solve', at: 'x' }] })] });
  await expect(page.locator('.home-counter').nth(1)).toContainText('200');
  await expect(page.locator('.beach-shell')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: 'Badges: 1 of 12' })).toBeVisible();

  await press(page.getByRole('button', { name: 'Shop', exact: true }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  const robux = page.locator('.shop-card', { hasText: 'Roblox gift card, 2,000 Robux' });
  await expect(robux).toContainText('1500 shells');
  await expect(robux).toContainText('1300 more shells to go');
  const treat = page.locator('.shop-card', { hasText: 'Strawberry Açaí Lemonade Refresher' });
  await press(treat.getByRole('button', { name: 'Buy' }), hasTouch);
  await press(page.getByRole('button', { name: 'Not now' }), hasTouch);
  await press(treat.getByRole('button', { name: 'Buy' }), hasTouch);
  await expect(page.getByRole('alertdialog')).toContainText(
    'Buy Strawberry Açaí Lemonade Refresher for 150 shells?',
  );
  await press(page.getByRole('button', { name: 'Yes, buy it' }), hasTouch);
  await expect(
    page.getByText('Done! A grown-up will get you Strawberry Açaí Lemonade Refresher.'),
  ).toBeVisible();
  await expect(page.locator('.home-counter')).toContainText('50');
  await expect(treat).toContainText('100 more shells to go');
  await expect(page.getByRole('region', { name: 'Waiting for a grown-up' })).toContainText(
    'Strawberry Açaí Lemonade Refresher',
  );

  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);
  await expect(page.getByText('1 reward waiting for a grown-up')).toBeVisible();
  await expect(page.locator('.beach-shell')).toHaveCount(12);

  await unlock(page, hasTouch);
  await expect(page.getByText('Shells to spend: 50 · earned in all: 200')).toBeVisible();
  const waiting = page.getByRole('region', { name: 'Waiting to be given' });
  await expect(waiting).toContainText('Strawberry Açaí Lemonade Refresher');
  await press(waiting.getByRole('button', { name: 'Mark given' }), hasTouch);
  await expect(waiting).toContainText('No requests right now.');
  await expect(page.getByRole('region', { name: 'Given and cancelled' })).toContainText('given');
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await expect(page.getByText(/waiting for a grown-up/)).toHaveCount(0);
});

test('the parent cancels a request (shells come back) and changes a price', async ({ page, hasTouch }) => {
  await openHome(page, { rewards: [rewardsRow(160)] });
  await press(page.getByRole('button', { name: 'Shop', exact: true }), hasTouch);
  await press(
    page.locator('.shop-card', { hasText: 'Strawberry' }).getByRole('button', { name: 'Buy' }),
    hasTouch,
  );
  await press(page.getByRole('button', { name: 'Yes, buy it' }), hasTouch);
  await expect(page.locator('.home-counter')).toContainText('10');
  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);

  await unlock(page, hasTouch);
  const waiting = page.getByRole('region', { name: 'Waiting to be given' });
  await press(waiting.getByRole('button', { name: 'Cancel and refund' }), hasTouch);
  await expect(page.getByRole('alertdialog')).toContainText('give back 150 shells');
  await press(page.getByRole('alertdialog').getByRole('button', { name: 'Yes' }), hasTouch);
  await expect(page.getByText('Shells to spend: 160 · earned in all: 160')).toBeVisible();

  const price = page.getByLabel('Price of Strawberry Açaí Lemonade Refresher, in shells');
  await price.fill('0');
  await press(page.locator('form', { has: price }).getByRole('button', { name: 'Save' }), hasTouch);
  await expect(page.getByText('A whole number from 1 to 100,000.')).toBeVisible();
  await price.fill('170');
  await press(page.locator('form', { has: price }).getByRole('button', { name: 'Save' }), hasTouch);
  await expect(page.locator('form', { has: price })).toContainText('Saved.');
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await press(page.getByRole('button', { name: 'Shop', exact: true }), hasTouch);
  await expect(page.locator('.shop-card', { hasText: 'Strawberry' })).toContainText('170 shells');
  await expect(page.locator('.shop-card', { hasText: 'Strawberry' })).toContainText('10 more shells to go');
});

// A 2 × 2 gold PNG, made here so no real picture is ever committed.
const GOLD_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgBXHAf9eMWwWQAAAABJRU5ErkJggg==',
  'base64',
);

test('the parent adds a picture; the shop shows it; it can be removed', async ({ page, hasTouch }) => {
  await openHome(page, { rewards: [rewardsRow(10)] });
  await press(page.getByRole('button', { name: 'Shop', exact: true }), hasTouch);
  const robux = page.locator('.shop-card', { hasText: 'Robux' });
  await expect(robux.locator('.gift-icon')).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);

  await unlock(page, hasTouch);
  await page.getByLabel('Choose a picture for Roblox gift card, 2,000 Robux').setInputFiles({
    name: 'robux.png',
    mimeType: 'image/png',
    buffer: GOLD_PNG,
  });
  const pictures = page.getByRole('region', { name: 'Pictures' });
  await expect(pictures.getByRole('img', { name: 'Picture of Roblox gift card, 2,000 Robux' })).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await press(page.getByRole('button', { name: 'Shop', exact: true }), hasTouch);
  const img = robux.locator('.shop-picture img');
  await expect(img).toBeVisible();
  expect(await img.getAttribute('src')).toMatch(/^data:image\/(webp|png);base64,/);
  await expect(page.locator('.shop-card', { hasText: 'Strawberry' }).locator('.gift-icon')).toBeVisible();

  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);
  await unlock(page, hasTouch);
  await press(pictures.getByRole('button', { name: 'Remove' }), hasTouch);
  await expect(pictures.getByText('Removed.')).toBeVisible();
});
