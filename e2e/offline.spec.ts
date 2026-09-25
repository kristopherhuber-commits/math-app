import { expect, test } from '@playwright/test';
import { generatePc } from '../src/engine/topics/pc/generator';
import { current, openHome } from './helpers';

// M0 done-when: the built app loads again with the network off (R-PLAT-3); M6: and a question can be
// completed offline (R-TEST-7).
test('reloads offline after the first load, and a question can be completed offline (R-TEST-7)', async ({
  page,
  context,
}) => {
  await openHome(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  // Make sure this page is controlled before cutting the network.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // R-TEST-7: with the network still off, complete a question and see its celebration.
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Level 1/ }).click();
  const { level, seed } = await current(page);
  const q = generatePc(level, seed, '$');
  await page
    .locator('.mc-option')
    .nth(q.options.findIndex((o) => o.code === 'correct'))
    .click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByText('Question 2', { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('manifest is installable', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(new URL(href!, page.url()).toString());
  const manifest = await res.json();
  expect(manifest.start_url).toBe('/math-app/');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});
