import { expect, test, type Locator, type Page } from '@playwright/test';
import { generateRd } from '../src/engine/topics/rd/generator';
import { rdWalkthrough } from '../src/engine/topics/rd/hints';
import { generateFdp } from '../src/engine/topics/fdp/generator';
import { generatePc } from '../src/engine/topics/pc/generator';
import { generateNc } from '../src/engine/topics/nc/generator';
import { innermostSet, NC_SETS, ncMembership } from '../src/engine/topics/nc/checker';
import type { McQuestion } from '../src/engine/topics/mc';
import { fullStarsText, openHome } from './helpers';

// M3 (R-TEST-5): one question per number topic by mouse (or touch on the tablet project) and by
// keyboard; wrong answers, the hint ladder, the RD walkthrough with its mini-questions; NC's single
// answer, the smallest set (M7).

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
};

async function answerMc(page: Page, q: McQuestion, level: number, touch: boolean) {
  await press(page.locator('.mc-option').nth(correctIndex(q)), touch);
  await press(page.getByRole('button', { name: 'Check' }), touch);
  await expect(page.getByText(fullStarsText(level))).toBeVisible();
}

for (const [topic, level, seed, gen] of [
  ['RD', 3, 7, generateRd],
  ['FDP', 4, 5, generateFdp],
  ['PC', 3, 4, generatePc],
] as const) {
  test(`${topic}: one question by mouse or touch, then the next`, async ({ page, hasTouch }) => {
    await page.goto(`./?topic=${topic}&level=${level}&seed=${seed}`);
    await expect(page.getByText(new RegExp(`· Level ${level}`))).toBeVisible();
    await answerMc(page, gen(level, seed), level, hasTouch);
    await press(page.getByRole('button', { name: 'Next question' }), hasTouch);
    await expect(page.getByText('Question 2')).toBeVisible();
  });
}

test('RD: keyboard only, 1–5 then Enter (design.md §10)', async ({ page }) => {
  const q = generateRd(2, 13);
  await page.goto('./?topic=RD&level=2&seed=13');
  // The key handler is attached once the question is on screen.
  await expect(page.locator('.mc-option')).toHaveCount(5);
  await page.keyboard.press(`${correctIndex(q) + 1}`);
  await expect(page.locator('.mc-option.selected')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByText(fullStarsText(2))).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
});

const setCard = (page: Page, set: string) =>
  page.getByRole('radio', { name: new RegExp(`^\\d: ${setNames[set]},`) });

test('NC: the smallest set, by mouse or touch (R-NC-2)', async ({ page, hasTouch }) => {
  const q = generateNc(3, 2);
  await page.goto('./?topic=NC&level=3&seed=2');
  await expect(page.getByText('What is the smallest set this number belongs to?')).toBeVisible();
  await press(setCard(page, innermostSet(q.value)), hasTouch);
  await press(page.getByRole('button', { name: 'Check' }), hasTouch);
  await expect(page.getByText(fullStarsText(3))).toBeVisible();
});

test('NC: keyboard only, 1–5 then Enter', async ({ page }) => {
  const q = generateNc(1, 4);
  await page.goto('./?topic=NC&level=1&seed=4');
  await expect(page.locator('.set-card')).toHaveCount(5);
  await page.keyboard.press(`${NC_SETS.indexOf(innermostSet(q.value)) + 1}`);
  await expect(page.locator('.set-card.selected')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.getByText(fullStarsText(1))).toBeVisible();
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

test('NC: a card that is not quite is greyed out, with a line that doesn’t give the answer (R-NC-3)', async ({
  page,
}) => {
  const q = generateNc(3, 2); // a disguised integer: Rational contains it, Irrational doesn't
  expect(ncMembership(q.value).rational).toBe(true);
  await page.goto('./?topic=NC&level=3&seed=2');
  await setCard(page, 'irrational').click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.feedback-toast')).toContainText('Not quite. It isn’t in that set.');
  await expect(page.locator('.set-card.tried')).toHaveCount(1);
  await setCard(page, 'rational').click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.feedback-toast')).toContainText(
    'It is in that set, but there’s a smaller one.',
  );
  await expect(page.locator('.set-card.tried')).toHaveCount(2);
  await expect(page.getByLabel('Hint 1 of 3')).toBeVisible();
});

test('Home: a topic tile offers Adaptive and each level; the pick opens free practice (R-SES-6)', async ({
  page,
}) => {
  await openHome(page);
  await expect(page.getByText('No assignment right now.')).toBeVisible();
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  const picker = page.getByRole('group', { name: 'Price changes: how hard?' });
  await expect(picker.getByRole('button')).toHaveText([
    /^Adaptive/,
    /^Level 1/,
    /^Level 2/,
    /^Level 3/,
    /^Level 4/,
    /^Level 5/,
    'Close',
  ]);
  await expect(picker.getByRole('button', { name: /^Adaptive/ })).toBeFocused();
  await picker.getByRole('button', { name: /^Level 1/ }).click();
  await expect(page.getByText('Price changes · Level 1')).toBeVisible();
  await expect(page.getByText('Question 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '‹ Home' }).click();
  await page.getByRole('button', { name: 'Equations', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Equations: how hard?' }).getByRole('button', { name: /^Level/ }),
  ).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('group', { name: /how hard/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Number sets', exact: true }).click();
  await page.getByRole('button', { name: /^Adaptive/ }).click();
  await expect(page.getByText('Number sets · Level 3')).toBeVisible();
});
