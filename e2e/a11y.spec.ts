// R-TEST-6: axe on every screen, in the light and the dark theme (tokens.css defines both; the switch
// is v1.1, so the test sets data-theme), and 48 × 48 targets for everything interactive.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { generatePc } from '../src/engine/topics/pc/generator';
import { questionSeed } from '../src/engine/session';
import { assignment, attemptRow, current, openHome, PIN } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** axe in both themes, plus the target-size check; failures name the screen. */
async function check(page: Page, screen: string) {
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => {
      if (t === 'dark') document.documentElement.dataset.theme = 'dark';
      else delete document.documentElement.dataset.theme;
    }, theme);
    const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const found = r.violations.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 4)
          .join(' | ')}`,
    );
    expect(found, `${screen}, ${theme}`).toEqual([]);
  }
  await page.evaluate(() => delete document.documentElement.dataset.theme);
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, [role="checkbox"], [role="radio"], [role="switch"]',
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const hidden = r.width === 0 || style.visibility === 'hidden' || el.closest('.visually-hidden');
        return !hidden && (r.width < 47.5 || r.height < 47.5);
      })
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`,
      ),
  );
  expect(small, `${screen}: targets under 48 × 48`).toEqual([]);
}

// Measure final colours, not frames of a fade-in (axe counts opacity in contrast).
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function pin(page: Page, digits = PIN) {
  await page.keyboard.type(digits);
}

test('first run: PIN and naming', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  await check(page, 'setup PIN');
  await pin(page);
  await pin(page);
  await expect(page.getByRole('heading', { name: 'Meet your math friends!' })).toBeVisible();
  await check(page, 'naming');
});

test('Home, the level picker, the shop', async ({ page }) => {
  await openHome(page, {
    assignments: [assignment('PC:1,RD:1', { seed: 3, title: 'Today' })],
    rewards: [
      {
        profileId: 'default',
        shells: 180,
        spent: 150,
        streak: 2,
        badges: [{ id: 'first-solve', at: 'x' }],
        accessories: ['turtle-hat', 'penguin-scarf', 'turtle-sunglasses', 'penguin-hat'],
      },
    ],
  });
  await check(page, 'Home');
  await page.getByRole('button', { name: 'Equations', exact: true }).click();
  await check(page, 'level picker');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await check(page, 'shop');
});

test('questions: multiple choice, not quite and the hint, the walkthrough, the celebration', async ({
  page,
}) => {
  await page.goto('./?topic=PC&level=1&seed=4');
  const q = generatePc(1, 4, '$');
  const correct = q.options.findIndex((o) => o.code === 'correct');
  await expect(page.locator('.mc-option')).toHaveCount(5);
  await check(page, 'multiple choice');
  for (const k of [1, 2]) {
    await page
      .locator('.mc-option')
      .nth((correct + k) % 5)
      .click();
    await page.getByRole('button', { name: 'Check' }).click();
  }
  await expect(page.getByLabel('Hint 1 of 3')).toBeVisible();
  await check(page, 'not quite + hint');
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  await check(page, 'walkthrough');

  await page.goto('./?topic=PC&level=1&seed=4');
  await page.locator('.mc-option').nth(correct).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('3 stars! Brilliant!')).toBeVisible();
  await check(page, 'celebration');
});

test('questions: number sets, typed equation with feedback, tile builder', async ({ page }) => {
  await page.goto('./?topic=NC&level=2&seed=3');
  await expect(page.getByRole('checkbox').first()).toBeVisible();
  await check(page, 'number sets');

  await page.goto('./?level=4&seed=2024');
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill('5w + 40 = 2w - 1');
  await input.press('Enter');
  await check(page, 'typed equation with feedback');

  await page.goto('./?level=2&seed=11');
  await expect(page.locator('.tile-board')).toBeVisible();
  await check(page, 'tile builder');
});

test('the assignment summary', async ({ page }) => {
  const seed = 8;
  await openHome(page, { assignments: [assignment('PC:1', { seed })] });
  await page.getByRole('button', { name: 'Start ›' }).click();
  const q = generatePc(1, questionSeed(seed, 0), '$');
  await page
    .locator('.mc-option')
    .nth(q.options.findIndex((o) => o.code === 'correct'))
    .click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Next question' }).click();
  await expect(page.getByRole('heading', { name: 'Assignment done!' })).toBeVisible();
  await check(page, 'summary');
});

test('the parent area: gate, reset, and every page', async ({ page }) => {
  const now = Date.now();
  await openHome(page, {
    assignments: [
      assignment('EQ:3,PC:2@2', { seed: 1, title: 'Monday' }),
      assignment('RD:4', { seed: 2, title: 'Tuesday', status: 'queued', position: 1 }),
    ],
    attempts: Array.from({ length: 6 }, (_, i) =>
      attemptRow({
        topic: 'EQ',
        level: 3,
        generatorId: 'eq.v1',
        seed: i + 1,
        finishedAt: new Date(now - i * 3_600_000).toISOString(),
        maxHint: i % 2 ? 3 : 0,
        clean: i % 2 === 0,
        tries: [
          { at: new Date(now).toISOString(), answer: 'x = 1', verdict: 'stepRejected', diagnostic: 'EQ-D8' },
        ],
      }),
    ),
  });
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await check(page, 'PIN gate');
  await page.getByRole('button', { name: 'Forgot PIN?' }).click();
  await check(page, 'PIN reset');
  await page.reload();
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await pin(page);
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
  await page.getByRole('button', { name: '+ Add topic' }).click();
  await page.getByRole('group', { name: 'Which topic?' }).getByRole('button', { name: 'Equations' }).click();
  await page.locator('.item-name', { hasText: 'Equations' }).click();
  await check(page, 'assignments with the level lock open');
  for (const name of ['Progress', 'Missed questions', 'Rewards', 'Settings', 'Data']) {
    await page.getByRole('navigation').getByRole('button', { name }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    if (name === 'Missed questions') await page.locator('.missed-row').first().click();
    await check(page, name);
  }
});

test('the free-practice question after picking Adaptive', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Price changes', exact: true }).click();
  await page.getByRole('button', { name: /^Adaptive/ }).click();
  await current(page);
  await check(page, 'free practice');
});
