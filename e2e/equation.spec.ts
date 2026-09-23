// R-TEST-5 (M1 subset): complete a typed EQ by mouse, by touch and by keyboard; hint ladder;
// attempts persisted to IndexedDB.
import { expect, test, type Page } from '@playwright/test';
import { generateEq } from '../src/engine/topics/eq/generator';
import { openHome } from './helpers';
import { eqWalkthrough } from '../src/engine/topics/eq/hints';

const LEVEL = 4;
const SEED = 2024;
const q = generateEq(LEVEL, SEED);
const lines = eqWalkthrough(q.text, q.variable)
  .filter((s) => s.kind !== 'CHECK')
  .map((s) => s.line);

const KEY_NAMES: Record<string, string> = {
  '−': 'minus',
  '+': 'plus',
  '=': 'equals',
  '(': 'open bracket',
  ')': 'close bracket',
  '/': 'fraction',
};

async function enterByKeypad(page: Page, line: string, how: 'click' | 'tap') {
  for (const ch of line.replace(/ /g, '')) {
    const key = page.getByRole('button', { name: KEY_NAMES[ch] ?? ch, exact: true });
    if (how === 'tap') await key.tap();
    else await key.click();
  }
  const check = page.getByRole('button', { name: 'Check step' });
  if (how === 'tap') await check.tap();
  else await check.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(`./?level=${LEVEL}&seed=${SEED}`);
  await expect(page.getByRole('heading', { name: /Solve for/ })).toBeVisible();
});

test('solve a typed equation with the on-screen keypad (mouse or touch)', async ({ page }, info) => {
  const how = info.project.use.hasTouch ? 'tap' : 'click';
  for (const line of lines) await enterByKeypad(page, line, how);
  await expect(page.getByText('Solved!')).toBeVisible();
  await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
  await expect(page.locator('.step-line')).toHaveCount(lines.length + 1);
});

test('solve with the physical keyboard, including a rejected line', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill('1 + 1 = 5');
  await input.press('Enter');
  await expect(page.locator('.step-feedback')).toContainText("isn't balanced");
  for (const line of lines) {
    await input.fill(line.replace(/−/g, '-'));
    await input.press('Enter');
  }
  await expect(page.getByText('Solved!')).toBeVisible();
});

test('hint ladder: Help opens H1, then H2; Esc closes it', async ({ page }) => {
  await page.getByRole('button', { name: 'Help' }).click();
  await expect(page.getByText('Hint 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Another hint' }).click();
  await expect(page.getByText('Hint 2 of 3')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Hint 2 of 3')).toBeHidden();
});

test('attempts are saved to IndexedDB after every step (R-SES-5)', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill(lines[0]!);
  await input.press('Enter');
  await expect(page.locator('.step-line')).toHaveCount(2);
  const tries = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('turtle-penguin-math');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('attempts').objectStore('attempts').getAll();
          req.onsuccess = () =>
            resolve((req.result as { tries: unknown[] }[]).reduce((n, a) => n + a.tries.length, 0));
        };
      }),
  );
  expect(tries).toBeGreaterThanOrEqual(1);
});

test('Home: the Equations tile opens free practice at the adaptive level, 3 to start', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Equations', exact: true }).click();
  await expect(page.getByText('Equations · Level 3')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your next line' })).toBeVisible();
});
