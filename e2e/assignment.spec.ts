// M4 (R-TEST-5, requirements §12 "assignment completes with summary"): an assignment from the
// parent's link, answered through every question to its summary; resume after leaving; a level
// up; the keyboard path. Answers come from the engine with the assignment's question seeds.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { questionSeed } from '../src/engine/session';
import { generatePc } from '../src/engine/topics/pc/generator';
import { generateRd } from '../src/engine/topics/rd/generator';
import { generateEq } from '../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../src/engine/topics/eq/hints';
import type { McQuestion } from '../src/engine/topics/mc';

async function press(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

const correctIndex = (q: McQuestion) => q.options.findIndex((o) => o.code === 'correct');

async function answerMc(page: Page, q: McQuestion, touch: boolean) {
  await press(page.locator('.mc-option').nth(correctIndex(q)), touch);
  await press(page.getByRole('button', { name: 'Check' }), touch);
  await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
}

const next = (page: Page, touch: boolean) =>
  press(page.getByRole('button', { name: 'Next question' }), touch);

test('an assignment from the link, through every question, to its summary (R-SES-1/5/7, R-RWD)', async ({
  page,
  hasTouch,
}) => {
  const seed = 5;
  await page.goto(`./?assign=PC:2,RD:1,EQ:1@3&title=Test%20day&seed=${seed}`);
  await expect(page.getByRole('heading', { name: 'Test day' })).toBeVisible();
  await expect(page).toHaveURL(/\/math-app\/$/);
  const items = page.locator('.assignment-item');
  await expect(items).toHaveText([
    /Price changes\s*0 \/ 2/,
    /Repeating decimals\s*0 \/ 1/,
    /Equations\s*0 \/ 1/,
  ]);
  await expect(page.getByText('0 of 4 done')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Price changes, locked' })).toBeDisabled();

  await press(page.getByRole('button', { name: 'Start ›' }), hasTouch);

  // Grouped: both price changes, then the decimal, then the equation (levels 1, 1 and locked 3).
  await expect(page.getByText('Question 1 of 2')).toBeVisible();
  await expect(page.getByText('Price changes · Level 1')).toBeVisible();
  await answerMc(page, generatePc(1, questionSeed(seed, 0), '$'), hasTouch);
  await expect(page.getByText('+3 shells')).toBeVisible();
  await expect(page.getByRole('status', { name: '3 stars', exact: true })).toBeVisible();
  await expect(page.getByText('New badge: First question solved')).toBeVisible();
  await next(page, hasTouch);

  await expect(page.getByText('Question 2 of 2')).toBeVisible();
  await answerMc(page, generatePc(1, questionSeed(seed, 1), '$'), hasTouch);
  await next(page, hasTouch);

  await expect(page.getByText('Repeating decimals · Level 1')).toBeVisible();
  await expect(page.getByText('Question 1 of 1')).toBeVisible();
  await answerMc(page, generateRd(1, questionSeed(seed, 2)), hasTouch);
  await next(page, hasTouch);

  await expect(page.getByText('Equations · Level 3')).toBeVisible();
  const q = generateEq(3, questionSeed(seed, 3));
  const input = page.getByRole('textbox', { name: 'Your next line' });
  for (const s of eqWalkthrough(q.text, q.variable).filter((w) => w.kind !== 'CHECK')) {
    await input.fill(s.line);
    await input.press('Enter');
  }
  await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
  await next(page, hasTouch);

  // The summary: stars by topic, as counts (R-SES-7), and the badges earned on the way.
  await expect(page.getByRole('heading', { name: 'Assignment done!' })).toBeVisible();
  await expect(page.getByText('Test day · 4 questions')).toBeVisible();
  await expect(page.getByText('12 stars · +12 shells')).toBeVisible();
  await expect(page.locator('.summary-row')).toHaveText([
    /Price changes\s*★★★ ×2/,
    /Repeating decimals\s*★★★ ×1/,
    /Equations\s*★★★ ×1/,
  ]);
  await expect(page.getByText('New badge: A perfect assignment')).toBeVisible();
  await expect(page.getByText('%')).toHaveCount(0);

  // Free practice is open now (R-SES-6).
  await press(page.getByRole('button', { name: 'Free practice ›' }), hasTouch);
  await expect(page.getByRole('button', { name: 'Number sets', exact: true })).toBeFocused();
  await expect(page.getByText('No assignment right now.')).toBeVisible();
  await expect(page.locator('.home-counter')).toHaveText([/1 day\s*streak/, /12\s*shells/]);
});

test('leave mid-assignment, reload, and Keep going resumes at the same question (R-SES-5)', async ({
  page,
}) => {
  const seed = 9;
  await page.goto(`./?assign=PC:3&seed=${seed}`);
  await page.getByRole('button', { name: 'Start ›' }).click();
  await answerMc(page, generatePc(1, questionSeed(seed, 0), '$'), false);
  await next(page, false);
  await expect(page.getByText('Question 2 of 3')).toBeVisible();
  const second = generatePc(1, questionSeed(seed, 1), '$');
  // Leave with the second question half done: one option tried.
  await page
    .locator('.mc-option')
    .nth((correctIndex(second) + 1) % 5)
    .click();
  await page.getByRole('button', { name: '‹ Home' }).click();
  await expect(page.locator('.assignment-item')).toHaveText([/1 \/ 3/]);
  await page.reload();
  await page.getByRole('button', { name: 'Keep going ›' }).click();
  await expect(page.getByText('Question 2 of 3')).toBeVisible();
  await expect(page.getByRole('status', { name: '3 stars', exact: true })).toBeVisible();
  await answerMc(page, second, false);
});

test('four clean answers out of five level up, and Pip says so (R-ADP-2, R-ADP-6)', async ({ page }) => {
  const seed = 3;
  await page.goto(`./?assign=PC:6&seed=${seed}`);
  await page.getByRole('button', { name: 'Start ›' }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Question ${i + 1} of 6`)).toBeVisible();
    await answerMc(page, generatePc(1, questionSeed(seed, i), '$'), false);
    if (i < 4) {
      await expect(page.getByText('Level up!')).toHaveCount(0);
      await next(page, false);
    }
  }
  await expect(page.getByText('Level up!')).toBeVisible();
  await next(page, false);
  await expect(page.getByText('Price changes · Level 2')).toBeVisible();
  await answerMc(page, generatePc(2, questionSeed(seed, 5), '$'), false);
});

test('keyboard only: start, answer with 1–5 and Enter, next (design.md §10)', async ({ page }) => {
  const seed = 21;
  await page.goto(`./?assign=RD:2&seed=${seed}`);
  await page.getByRole('button', { name: 'Start ›' }).focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 2; i++) {
    await expect(page.getByText(`Question ${i + 1} of 2`)).toBeVisible();
    const q = generateRd(1, questionSeed(seed, i));
    await page.keyboard.press(String(correctIndex(q) + 1));
    await page.keyboard.press('Enter');
    await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Assignment done!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Free practice ›' })).toBeFocused();
});

test('a link that cannot be read adds nothing and says so', async ({ page }) => {
  await page.goto('./?assign=XY:3');
  await expect(page.getByText("That assignment link couldn't be read.")).toBeVisible();
  await expect(page.getByText('No assignment right now.')).toBeVisible();
});
