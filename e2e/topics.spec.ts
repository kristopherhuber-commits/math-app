import { expect, test, type Locator, type Page } from '@playwright/test';
import { generateRd } from '../src/engine/topics/rd/generator';
import { rdWalkthrough } from '../src/engine/topics/rd/hints';
import { generateFdp } from '../src/engine/topics/fdp/generator';
import { generatePc } from '../src/engine/topics/pc/generator';
import { generateNc } from '../src/engine/topics/nc/generator';
import { NC_SETS, ncMembership } from '../src/engine/topics/nc/checker';
import type { McQuestion } from '../src/engine/topics/mc';

// M3 (R-TEST-5): one question per number topic by mouse (or touch on the tablet project) and by
// keyboard; wrong answers, the hint ladder, the RD walkthrough with its mini-questions, NC outlines.

/** Tap on the touch project, click elsewhere (R-PLAT-5). */
async function press(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

const correctIndex = (q: McQuestion) => q.options.findIndex((o) => o.code === 'correct');
const setNames: Record<string, string> = {
  natural: 'Natural',
  whole: 'Whole',
  integer: 'Integer',
  rational: 'Rational',
  irrational: 'Irrational',
  real: 'Real',
};

async function answerMc(page: Page, q: McQuestion, touch: boolean) {
  await press(page.locator('.mc-option').nth(correctIndex(q)), touch);
  await press(page.getByRole('button', { name: 'Check' }), touch);
  await expect(page.getByText("Yes! That's it.")).toBeVisible();
}

for (const [topic, level, seed, gen] of [
  ['RD', 3, 7, generateRd],
  ['FDP', 4, 5, generateFdp],
  ['PC', 3, 4, generatePc],
] as const) {
  test(`${topic}: one question by mouse or touch, then the next`, async ({ page, hasTouch }) => {
    await page.goto(`./?topic=${topic}&level=${level}&seed=${seed}`);
    await expect(page.getByText(new RegExp(`· Level ${level}`))).toBeVisible();
    await answerMc(page, gen(level, seed), hasTouch);
    await press(page.getByRole('button', { name: 'Next question' }), hasTouch);
    await expect(page.getByText('Question 2')).toBeVisible();
  });
}

test('RD: keyboard only, 1–5 then Enter (design.md §10)', async ({ page }) => {
  const q = generateRd(2, 13);
  await page.goto('./?topic=RD&level=2&seed=13');
  await page.keyboard.press(`${correctIndex(q) + 1}`);
  await expect(page.locator('.mc-option.selected')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByText("Yes! That's it.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
});

test('NC: tick exactly the right sets by mouse or touch', async ({ page, hasTouch }) => {
  const q = generateNc(3, 2);
  const m = ncMembership(q.value, false);
  await page.goto('./?topic=NC&level=3&seed=2');
  for (const set of NC_SETS.filter((s) => m[s]))
    await press(page.getByRole('checkbox', { name: new RegExp(`^${setNames[set]}`) }), hasTouch);
  await press(page.getByRole('button', { name: 'Check' }), hasTouch);
  await expect(page.getByText("Yes! That's it.")).toBeVisible();
});

test('NC: keyboard only, Tab and Space, Enter checks', async ({ page }) => {
  const q = generateNc(1, 4);
  const m = ncMembership(q.value, false);
  await page.goto('./?topic=NC&level=1&seed=4');
  const cards = page.getByRole('checkbox');
  await cards.first().focus();
  for (const set of NC_SETS) {
    if (m[set]) await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
  }
  await cards.last().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText("Yes! That's it.")).toBeVisible();
});

test('wrong answers: "Not quite" with the misconception line, then the hint (R-HELP-1/1a/2)', async ({
  page,
}) => {
  const q = generateRd(3, 7);
  const wrong = q.options.map((o, i) => [o, i] as const).filter(([o]) => o.code !== 'correct');
  await page.goto('./?topic=RD&level=3&seed=7');
  await page.locator('.mc-option').nth(wrong[0]![1]).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.feedback-toast')).toContainText('Not quite.');
  await expect(page.locator('.mc-option.tried')).toHaveCount(1);
  await expect(page.getByLabel(/Hint 1 of 3/)).toHaveCount(0);
  await page.locator('.mc-option').nth(wrong[1]![1]).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByLabel('Hint 1 of 3')).toBeVisible();
  await expect(page.locator('.btn-help.pulsing')).toHaveCount(1);
});

test('RD walkthrough: mini-questions gate Next, and it ends the question (R-HELP-4/6)', async ({
  page,
  hasTouch,
}) => {
  const q = generateRd(3, 7);
  const steps = rdWalkthrough(q);
  await page.goto('./?topic=RD&level=3&seed=7');
  await press(page.getByRole('button', { name: 'Help' }), hasTouch);
  await press(page.getByRole('button', { name: 'Show me step by step' }), hasTouch);
  await expect(page.getByText("Let's do it together")).toBeVisible();
  for (const [i, step] of steps.entries()) {
    await expect(page.getByText(`step ${i + 1} of ${steps.length}`)).toBeVisible();
    const next = page.getByRole('button', { name: i === steps.length - 1 ? 'Done' : 'Next ›' });
    if (step.mini) {
      await expect(next).toBeDisabled();
      const wrongChip = [0, 1, 2].find((k) => k !== step.mini!.correct)!;
      await press(page.locator('.mini-chip').nth(wrongChip), hasTouch);
      await expect(page.locator('.mini-feedback')).toHaveText('Not quite.');
      await press(page.locator('.mini-chip').nth(step.mini.correct), hasTouch);
    }
    await expect(next).toBeEnabled();
    await press(next, hasTouch);
  }
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
});

test('NC: the second wrong Check outlines the mismatched cards (R-NC-3)', async ({ page }) => {
  const q = generateNc(3, 2);
  const m = ncMembership(q.value, false);
  await page.goto('./?topic=NC&level=3&seed=2');
  await page.getByRole('checkbox', { name: /^Irrational/ }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.set-card.flagged')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check' }).click();
  const mismatched = NC_SETS.filter((s) => m[s] !== (s === 'irrational')).length;
  await expect(page.locator('.set-card.flagged')).toHaveCount(mismatched);
  await expect(page.getByLabel('Hint 1 of 3')).toBeVisible();
});

test('Home: pick a topic and a level, then start', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /Price changes/ }).click();
  await page.getByRole('radio', { name: /Level 2/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Price changes · Level 2')).toBeVisible();
  await page.getByRole('button', { name: '‹ Home' }).click();
  await page.getByRole('radio', { name: /Number sets/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Number sets · Level 1')).toBeVisible();
});
