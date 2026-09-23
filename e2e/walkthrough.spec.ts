// R-TEST-5: the hint ladder reaches H3. The walkthrough runs from the learner's last line, one step
// per tap, ends with the substitution check, and the question then counts as done (R-HELP-6).
import { expect, test, type Page } from '@playwright/test';
import { generateEq } from '../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../src/engine/topics/eq/hints';

async function maxHints(page: Page): Promise<number[]> {
  return page.evaluate(
    () =>
      new Promise<number[]>((resolve, reject) => {
        const open = indexedDB.open('turtle-penguin-math');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('attempts').objectStore('attempts').getAll();
          req.onsuccess = () =>
            resolve((req.result as { maxHint: number; finishedAt?: string }[]).map((a) => a.maxHint));
        };
      }),
  );
}

async function runWalkthrough(page: Page, steps: number) {
  await expect(page.getByRole('heading', { name: "Let's do it together" })).toBeVisible();
  for (let k = 1; k <= steps; k++) {
    await expect(page.getByText(`Walkthrough · step ${k} of ${steps}`)).toBeVisible();
    await page.getByRole('button', { name: k === steps ? 'Done' : 'Next ›' }).click();
  }
  await expect(page.getByText(/Both sides match/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
}

test('typed: H1 → H2 → walkthrough from the last accepted line', async ({ page }) => {
  const q = generateEq(4, 2024);
  const full = eqWalkthrough(q.text, q.variable);
  await page.goto('./?level=4&seed=2024');
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill(full[0]!.line);
  await input.press('Enter');
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByText('Hint 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Another hint' }).click();
  await expect(page.getByText('Hint 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  const fromLast = eqWalkthrough(full[0]!.line, q.variable, q.text);
  await runWalkthrough(page, fromLast.length);
  expect(await maxHints(page)).toContain(3);
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByText('Equations · Level 4')).toBeVisible();
  await expect(page.getByText('Question 2')).toBeVisible();
});

test('tiles: walkthrough from the given equation, Back steps back', async ({ page }) => {
  const q = generateEq(2, 11);
  const steps = eqWalkthrough(q.text, q.variable);
  await page.goto('./?level=2&seed=11');
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: '‹ Back' }).click();
  await runWalkthrough(page, steps.length);
  await page.keyboard.press('Enter');
  await expect(page.getByText('Question 2')).toBeVisible();
  await expect(page.locator('.tile-board')).toBeVisible();
});
