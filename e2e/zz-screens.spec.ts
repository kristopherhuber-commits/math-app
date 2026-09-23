import { test } from '@playwright/test';
import { generateRd } from '../src/engine/topics/rd/generator';

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

test('number topic screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = async (name: string) => {
    await page.waitForTimeout(450); // let the line-in animations finish
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
  };
  for (const [topic, level, seed] of [
    ['RD', 3, 7],
    ['RD', 1, 3],
    ['FDP', 4, 5],
    ['FDP', 3, 9],
    ['PC', 3, 4],
    ['NC', 3, 2],
    ['NC', 4, 1],
  ] as const) {
    await page.goto(`./?topic=${topic}&level=${level}&seed=${seed}`);
    await shot(`${topic}${level}`);
  }
  // The longest option text: RD level 5, F→D over 7 (block of 6, shown 3 times).
  let s7 = 0;
  while (generateRd(5, s7).params.shape !== 'f2d7') s7++;
  await page.goto(`./?topic=RD&level=5&seed=${s7}`);
  await shot('RD5-sevenths');
  // Wrong answers, the hint and the walkthrough with a mini-question (RD level 3, seed 7).
  const q = generateRd(3, 7);
  const wrong = q.options.findIndex((o) => o.code !== 'correct');
  await page.goto('./?topic=RD&level=3&seed=7');
  await page.keyboard.press(`${wrong + 1}`);
  await page.getByRole('button', { name: 'Check' }).click();
  await shot('rd-wrong');
  const wrong2 = q.options.findIndex((o, i) => o.code !== 'correct' && i !== wrong);
  await page.keyboard.press(`${wrong2 + 1}`);
  await page.getByRole('button', { name: 'Check' }).click();
  await shot('rd-hint');
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  for (let i = 0; i < 3; i++) {
    const chips = page.locator('.mini-chip:not([disabled])');
    if ((await chips.count()) > 0) await chips.first().click();
    if (await page.getByRole('button', { name: /Next|Done/ }).isEnabled()) {
      await page.getByRole('button', { name: /Next|Done/ }).click();
    }
  }
  await shot('rd-walk');
  await page.goto('./?topic=NC&level=4&seed=1');
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await shot('nc-walk');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('./?topic=FDP&level=3&seed=9');
  await shot('fdp-portrait');
  await page.goto('./?topic=NC&level=3&seed=2');
  await shot('nc-portrait');
});
