// design.md §8 sounds and R-PAR-5 "sounds on/off": which sounds play, and none when the setting is off.
// The page records what it plays in `window.__soundLog` (a test hook in src/ui/sound.ts).
import { expect, test, type Page } from '@playwright/test';
import { generatePc } from '../src/engine/topics/pc/generator';
import { current, openHome } from './helpers';

const log = (page: Page) => page.evaluate(() => window.__soundLog ?? []);

async function answerWrongThenRight(page: Page) {
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Level 1/ }).click();
  const { level, seed } = await current(page);
  const correct = generatePc(level, seed, '$').options.findIndex((o) => o.code === 'correct');
  await page
    .locator('.mc-option')
    .nth((correct + 1) % 5)
    .click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Not quite.')).toBeVisible();
  await page.locator('.mc-option').nth(correct).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('2 stars! Nice work!')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__soundLog = [];
  });
});

test('sounds on: a tick on choosing, a soft note on Not quite, the chime and a sparkle per star', async ({
  page,
}) => {
  await openHome(page);
  await answerWrongThenRight(page);
  await expect.poll(() => log(page)).toEqual(['select', 'notQuite', 'select', 'correct', 'stars']);
});

test('sounds off in the parent settings: nothing plays', async ({ page }) => {
  await openHome(page, { settings: { sound: false } });
  await answerWrongThenRight(page);
  expect(await log(page)).toEqual([]);
});
