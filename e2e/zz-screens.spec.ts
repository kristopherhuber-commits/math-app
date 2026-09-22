import { test } from '@playwright/test';

const OUT = process.env.SHOTS ?? '';

test.skip(!OUT, 'screenshots only on demand');

test('screens', async ({ page }, info) => {
  const tag = info.project.name;
  await page.goto('./');
  await page.screenshot({ path: `${OUT}/${tag}-home.png` });
  await page.goto('./?level=4&seed=2024');
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill('5w + 40 = 2w - 1');
  await input.press('Enter');
  await input.fill('5w + 2w = -1 - 40');
  await input.press('Enter');
  await page.screenshot({ path: `${OUT}/${tag}-feedback.png` });
  await page.getByRole('button', { name: 'Help' }).click();
  await page.screenshot({ path: `${OUT}/${tag}-hint.png`, fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: `${OUT}/${tag}-portrait.png`, fullPage: true });
});
