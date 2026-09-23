// M5 parent area (R-TEST-5 "the parent PIN plus assignment creation"): first-run setup and naming,
// the PIN gate and reset, the assignment builder and queue, settings, dashboard, missed-question
// review, and data export / import / reset. Runs on desktop (mouse) and tablet (touch).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PIN } from './helpers';

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
