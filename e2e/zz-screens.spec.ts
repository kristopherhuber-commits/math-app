import { test } from '@playwright/test';
import { generateRd } from '../src/engine/topics/rd/generator';
import { generatePc } from '../src/engine/topics/pc/generator';
import { generateEq } from '../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../src/engine/topics/eq/hints';
import { questionSeed } from '../src/engine/session';

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

// M4: Home with an assignment, celebrations (3 ★ in MC, 1 ★ after a walkthrough, EQ with its
// check, level up), the summary, the streak overlay, and Home afterwards.
test('session and reward screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = async (name: string, wait = 1300) => {
    await page.waitForTimeout(wait); // let the celebration finish
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
  };
  const seed = 5;
  const answer = async (q: { options: { code: string }[] }) => {
    await page
      .locator('.mc-option')
      .nth(q.options.findIndex((o) => o.code === 'correct'))
      .click();
    await page.getByRole('button', { name: 'Check' }).click();
  };
  await page.goto(`./?assign=PC:5,RD:1,EQ:1@3&title=Monday%20practice&seed=${seed}`);
  await page.getByRole('button', { name: 'Start ›' }).waitFor();
  await shot('home-assignment', 200);
  await page.getByRole('button', { name: 'Start ›' }).click();
  for (let i = 0; i < 5; i++) {
    await answer(generatePc(1, questionSeed(seed, i), '$'));
    if (i === 0) await shot('celebrate-3');
    if (i < 4) await page.getByRole('button', { name: 'Next question' }).click();
  }
  await shot('celebrate-levelup');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  for (let i = 0; i < 12 && (await page.getByRole('button', { name: 'Next question' }).count()) === 0; i++) {
    const walkNext = page.getByRole('button', { name: /Next ›|Done/ });
    // A mini-question gates Next: try its choices until one is right.
    while (!(await walkNext.isEnabled())) await page.locator('.mini-chip:not([disabled])').first().click();
    await walkNext.click();
  }
  await shot('celebrate-walkthrough');
  await page.getByRole('button', { name: 'Next question' }).click();
  const q = generateEq(3, questionSeed(seed, 6));
  const input = page.getByRole('textbox', { name: 'Your next line' });
  for (const s of eqWalkthrough(q.text, q.variable).filter((w) => w.kind !== 'CHECK')) {
    await input.fill(s.line);
    await input.press('Enter');
  }
  await shot('celebrate-eq');
  await page.getByRole('button', { name: 'Next question' }).click();
  await shot('summary');
  await page.getByRole('button', { name: 'Home' }).click();
  await shot('home-after', 300);
  await page.setViewportSize({ width: 768, height: 1024 });
  await shot('home-portrait', 300);
});
