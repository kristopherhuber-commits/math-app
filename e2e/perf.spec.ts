// R-NF-1: cold load ≤ 2 s on a mid-range tablet over a local network, approximated here as the local
// production preview with the CPU slowed 4× (Chrome DevTools throttling) and an empty cache; and the
// same again for a return visit to Home. Interactions respond within 100 ms.
import { expect, test, type Page } from '@playwright/test';
import { openHome } from './helpers';

const BUDGET_MS = 2000;

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

test('cold load to the first screen, and back to Home, within 2 s at 4× slower CPU', async ({ page }) => {
  await throttle(page);
  const t0 = Date.now();
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  const cold = Date.now() - t0;

  await openHome(page);
  const t1 = Date.now();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  const warm = Date.now() - t1;

  test.info().annotations.push({ type: 'R-NF-1', description: `cold ${cold} ms, Home again ${warm} ms` });
  expect(cold).toBeLessThanOrEqual(BUDGET_MS);
  expect(warm).toBeLessThanOrEqual(BUDGET_MS);
});

test('a tap on an answer shows as selected within 100 ms', async ({ page }) => {
  await page.goto('./?topic=PC&level=1&seed=4');
  await expect(page.locator('.mc-option')).toHaveCount(5);
  const ms = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const option = document.querySelectorAll<HTMLButtonElement>('.mc-option')[1]!;
        const t = performance.now();
        const obs = new MutationObserver(() => {
          if (option.classList.contains('selected')) {
            obs.disconnect();
            requestAnimationFrame(() => resolve(performance.now() - t));
          }
        });
        obs.observe(option, { attributes: true });
        option.click();
      }),
  );
  test.info().annotations.push({ type: 'R-NF-1', description: `selected after ${Math.round(ms)} ms` });
  expect(ms).toBeLessThan(100);
});
