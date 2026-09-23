// M5 parent area (R-TEST-5 "the parent PIN plus assignment creation"): first-run setup and naming,
// the PIN gate and reset, the assignment builder and queue, settings, dashboard, missed-question
// review, and data export / import / reset. Runs on desktop (mouse) and tablet (touch).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openHome, PIN } from './helpers';

async function press(target: Locator, touch: boolean) {
  if (touch) await target.tap();
  else await target.click();
}

/** Enter digits on the on-screen PIN pad. */
async function tapPin(page: Page, pin: string, touch: boolean) {
  const pad = page.getByRole('group', { name: 'PIN pad' });
  for (const d of pin) await press(pad.getByRole('button', { name: d, exact: true }), touch);
}

test('first run: the parent sets a PIN, the learner names the friends, Home uses the names (R-PAR-1, R-RWD-7)', async ({
  page,
  hasTouch,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  // Setup is required: a reload comes back to it.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();

  await tapPin(page, PIN, hasTouch);
  await expect(page.getByRole('heading', { name: 'Type the PIN again' })).toBeVisible();
  await tapPin(page, '1111', hasTouch);
  await expect(page.getByText("Those didn't match. Choose a PIN again.")).toBeVisible();
  await tapPin(page, PIN, hasTouch);
  await tapPin(page, PIN, hasTouch);

  await expect(page.getByRole('heading', { name: 'Meet your math friends!' })).toBeVisible();
  await expect(page.getByLabel("The turtle's name")).toHaveValue('Shelly');
  await page.getByLabel("The turtle's name").fill('Mossy');
  await page.getByLabel("The penguin's name").fill('  Captain   Flip ');
  await press(page.getByRole('button', { name: "Let's go ›" }), hasTouch);

  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  await expect(page.getByText("Captain Flip: Pick a topic. Let's play!")).toBeVisible();
  await expect(page.getByText("Mossy's here if you get stuck.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();

  // The turtle's name in the hint panel.
  await press(page.getByRole('button', { name: 'Equations', exact: true }), hasTouch);
  await press(page.getByRole('button', { name: 'Help' }), hasTouch);
  await expect(page.locator('.hint-name')).toContainText('Mossy');
});

test('first run by keyboard: digits and Backspace on the PIN pad', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  await page.keyboard.type('13');
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('status', { name: '1 of 4 digits entered' })).toBeVisible();
  await page.keyboard.type('579');
  await expect(page.getByRole('heading', { name: 'Type the PIN again' })).toBeVisible();
  await page.keyboard.type('1579');
  await expect(page.getByRole('heading', { name: 'Meet your math friends!' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  await expect(page.getByText("Pip: Pick a topic. Let's play!")).toBeVisible();
});

/** From Home, open the parent area with the PIN. */
async function unlock(page: Page, touch: boolean, pin = PIN) {
  await press(page.getByRole('button', { name: 'Parent', exact: true }), touch);
  await expect(page.getByRole('heading', { name: 'Parent area' })).toBeVisible();
  await tapPin(page, pin, touch);
}

test('the PIN gate: a wrong PIN, back to the learner, then in (R-PAR-1)', async ({ page, hasTouch }) => {
  await openHome(page);
  await unlock(page, hasTouch, '0000');
  await expect(page.getByText("That's not the PIN. Try again.")).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Back' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  await unlock(page, hasTouch);
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
  // Leaving locks it again.
  await press(page.getByRole('button', { name: 'Parent', exact: true }), hasTouch);
  await expect(page.getByRole('group', { name: 'PIN pad' })).toBeVisible();
});

test('PIN reset: answer the multiplication, set a new PIN twice (R-PAR-1)', async ({ page, hasTouch }) => {
  await openHome(page);
  await press(page.getByRole('button', { name: 'Parent', exact: true }), hasTouch);
  await press(page.getByRole('button', { name: 'Forgot PIN?' }), hasTouch);
  const question = page.locator('.reset-question .prompt');
  const answer = page.getByRole('textbox', { name: 'Answer' });
  await answer.fill('1');
  await press(page.getByRole('button', { name: 'Check' }), hasTouch);
  await expect(page.getByText("That's not it. Here's another one.")).toBeVisible();
  const [, a, b] = /What is (\d+) × (\d+)\?/.exec((await question.textContent()) ?? '')!;
  await answer.fill(String(Number(a) * Number(b)));
  await press(page.getByRole('button', { name: 'Check' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Choose a new PIN' })).toBeVisible();
  await tapPin(page, '9753', hasTouch);
  await tapPin(page, '9753', hasTouch);
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await unlock(page, hasTouch, PIN);
  await expect(page.getByText("That's not the PIN. Try again.")).toBeVisible();
  await tapPin(page, '9753', hasTouch);
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
});

test('the parent area locks itself after 10 minutes without input', async ({ page }) => {
  await page.clock.install();
  await openHome(page);
  await unlock(page, false);
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
  await page.clock.fastForward('09:00');
  await expect(page.getByRole('navigation', { name: 'Parent area' })).toBeVisible();
  await page.clock.fastForward('02:00');
  await expect(page.getByRole('group', { name: 'PIN pad' })).toBeVisible();
});
