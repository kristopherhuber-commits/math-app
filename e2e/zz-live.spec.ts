import { expect, test } from '@playwright/test';

// Smoke test of the deployed site. Runs only when LIVE_URL is set.
const LIVE = process.env.LIVE_URL ?? '';
test.skip(!LIVE, 'live check only on demand');

test('live site loads, is installable and works offline', async ({ page, context }) => {
  await page.goto(LIVE);
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest.start_url).toBe('/math-app/');
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active !== null);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: /Solve for/ })).toBeVisible();
  // M3: a number topic works offline too.
  await page.getByRole('button', { name: '‹ Home' }).click();
  await page.getByRole('radio', { name: /Repeating decimals/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: /Write this/ })).toBeVisible();
  await context.setOffline(false);
});
