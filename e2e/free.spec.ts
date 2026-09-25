// Free practice with a picked level or Adaptive (parent decision, 2026-09-25): Adaptive starts at
// level 3, goes up after 3 right in a row and down when 2 of the last 3 had a mistake or help.
// Free-practice seeds are random, so each question's seed is read from its stored attempt.
import { expect, test, type Page } from '@playwright/test';
import { generatePc } from '../src/engine/topics/pc/generator';
import { current, openHome } from './helpers';

async function answer(page: Page, right: boolean) {
  const { level, seed } = await current(page);
  const q = generatePc(level, seed, '$');
  const correct = q.options.findIndex((o) => o.code === 'correct');
  if (!right) {
    await page
      .locator('.mc-option')
      .nth((correct + 1) % 5)
      .click();
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Not quite.')).toBeVisible();
  }
  await page.locator('.mc-option').nth(correct).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(right ? '3 stars! Brilliant!' : '2 stars! Nice work!')).toBeVisible();
}

const next = (page: Page) => page.getByRole('button', { name: 'Next question' }).click();

test('Adaptive: level 3, up after 3 right, down after 2 of 3 with a mistake', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Adaptive/ }).click();
  await expect(page.getByText('Price changes · Level 3')).toBeVisible();

  for (let i = 0; i < 3; i++) {
    await answer(page, true);
    if (i < 2) {
      await expect(page.getByText('Level up!')).toHaveCount(0);
      await next(page);
    }
  }
  await expect(page.getByText('Level up!')).toBeVisible();
  await next(page);
  await expect(page.getByText('Price changes · Level 4')).toBeVisible();

  // One mistake: stays. A second in the last three: down one, silently (R-ADP-6).
  await answer(page, false);
  await next(page);
  await expect(page.getByText('Price changes · Level 4')).toBeVisible();
  await answer(page, true);
  await next(page);
  await answer(page, false);
  await next(page);
  await expect(page.getByText('Price changes · Level 3')).toBeVisible();
});

test('Adaptive starts at level 3 again the next time; a picked level stays put', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Level 2/ }).click();
  for (let i = 0; i < 3; i++) {
    await answer(page, true);
    await next(page);
  }
  await expect(page.getByText('Price changes · Level 2')).toBeVisible();
  await page.getByRole('button', { name: '‹ Home' }).click();
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Adaptive/ }).click();
  await expect(page.getByText('Price changes · Level 3')).toBeVisible();
});
