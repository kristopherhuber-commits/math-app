// M5 parent area (R-TEST-5 "the parent PIN plus assignment creation"): first-run setup and naming,
// the PIN gate and reset, the assignment builder and queue, settings, dashboard, missed-question
// review, and data export / import / reset. Runs on desktop (mouse) and tablet (touch).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { assignment, openHome, PIN } from './helpers';

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

test('R-TEST-5: the parent builds an assignment and the learner starts it (R-PAR-2, R-SES-1/3/4)', async ({
  page,
  hasTouch,
}) => {
  await openHome(page);
  await expect(page.getByText('No assignment right now.')).toBeVisible();
  // Free practice is open by default (R-SES-6, parent decision).
  await expect(page.getByRole('button', { name: 'Equations', exact: true })).toBeEnabled();
  await unlock(page, hasTouch);
  await expect(page.getByRole('heading', { name: 'New assignment' })).toBeVisible();

  await page.getByLabel('Title (optional)').fill('Tuesday practice');
  const which = page.getByRole('group', { name: 'Which topic?' });
  await press(page.getByRole('button', { name: '+ Add topic' }), hasTouch);
  await press(which.getByRole('button', { name: 'Equations' }), hasTouch);
  // Count: 5 by default, down to 2.
  for (let i = 0; i < 3; i++)
    await press(page.getByRole('button', { name: 'Fewer Equations questions' }), hasTouch);
  await expect(page.getByRole('group', { name: 'Equations: number of questions' })).toContainText('2');
  await press(page.getByRole('button', { name: '+ Add topic' }), hasTouch);
  await press(which.getByRole('button', { name: 'Price changes' }), hasTouch);
  for (let i = 0; i < 4; i++)
    await press(page.getByRole('button', { name: 'Fewer Price changes questions' }), hasTouch);
  // Level lock: tap the item, pick Level 2.
  const pcItem = page.locator('.item-name', { hasText: 'Price changes' });
  await press(pcItem, hasTouch);
  await press(
    page.getByRole('group', { name: 'Price changes: level' }).getByRole('button', { name: /^Level 2/ }),
    hasTouch,
  );
  await expect(pcItem).toContainText('Level 2 (locked)');
  await expect(page.locator('.item-name', { hasText: 'Equations' })).toContainText('Adaptive');
  await page.getByLabel('Due (optional)').fill('2026-10-02');
  await press(page.getByRole('button', { name: 'Save & make active' }), hasTouch);

  const queue = page.getByRole('region', { name: 'Queue' });
  await expect(queue.locator('.queue-card.active')).toContainText('Tuesday practice');
  await expect(queue.locator('.queue-card.active')).toContainText('Active · 0 / 3 · due 2026-10-02');
  await expect(page.getByLabel('Title (optional)')).toHaveValue('');

  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Tuesday practice' })).toBeVisible();
  await expect(page.locator('.assignment-item')).toHaveText([/Equations\s*0 \/ 2/, /Price changes\s*0 \/ 1/]);
  await press(page.getByRole('button', { name: 'Start ›' }), hasTouch);
  await expect(page.getByText('Equations · Level 3')).toBeVisible();
  await expect(page.getByText('Question 1 of 2')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your next line' })).toBeVisible();
});

test('the queue: add to queue, reorder by keyboard, make active, mark complete, delete, edit (R-PAR-2, R-SES-2)', async ({
  page,
}) => {
  await openHome(page);
  await unlock(page, false);
  const add = async (title: string, topic: string) => {
    await page.getByLabel('Title (optional)').fill(title);
    await page.getByRole('button', { name: '+ Add topic' }).click();
    await page.getByRole('group', { name: 'Which topic?' }).getByRole('button', { name: topic }).click();
    await page.getByRole('button', { name: 'Add to queue' }).click();
    await expect(page.locator('.queue-card', { hasText: title })).toBeVisible();
  };
  await add('Alpha', 'Number sets');
  await add('Bravo', 'Repeating decimals');
  await add('Charlie', 'Price changes');
  const queue = page.getByRole('region', { name: 'Queue' });
  const queued = queue.locator('.queue-card:not(.active) strong');
  await expect(queue.locator('.queue-card.active')).toContainText('Alpha');
  await expect(queued).toHaveText(['Bravo', 'Charlie']);

  // Keyboard reorder: Charlie up.
  await page.getByRole('button', { name: /^Reorder Charlie/ }).focus();
  await page.keyboard.press('ArrowUp');
  await expect(queued).toHaveText(['Charlie', 'Bravo']);
  await expect(page.getByRole('button', { name: /^Reorder Charlie/ })).toBeFocused();

  // Make Bravo active: Alpha goes back to the front of the queue.
  await queue
    .locator('.queue-card', { hasText: 'Bravo' })
    .getByRole('button', { name: 'Make active' })
    .click();
  await expect(queue.locator('.queue-card.active')).toContainText('Bravo');
  await expect(queued).toHaveText(['Alpha', 'Charlie']);

  // Mark Bravo complete early: Alpha takes over.
  await queue.locator('.queue-card.active').getByRole('button', { name: 'Mark complete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes' }).click();
  await expect(queue.locator('.queue-card.active')).toContainText('Alpha');
  await expect(page.locator('.done-list')).toContainText('Bravo');

  // Delete Charlie (asked first; No keeps it).
  const charlie = queue.locator('.queue-card', { hasText: 'Charlie' });
  await charlie.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'No' }).click();
  await charlie.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes' }).click();
  await expect(queue.locator('.queue-card', { hasText: 'Charlie' })).toHaveCount(0);

  // Edit Alpha: rename and one more question.
  await queue.locator('.queue-card.active').getByRole('button', { name: 'Edit Alpha' }).click();
  await expect(page.getByRole('heading', { name: 'Edit assignment' })).toBeVisible();
  await page.getByLabel('Title (optional)').fill('Alpha two');
  await page.getByRole('button', { name: 'More Number sets questions' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(queue.locator('.queue-card.active')).toContainText('Alpha two');
  await expect(queue.locator('.queue-card.active')).toContainText('0 / 6');
});

test('the queue reorders by mouse drag', async ({ page }) => {
  await openHome(page, {
    assignments: [
      assignment('NC:1', { seed: 1, title: 'One' }),
      assignment('RD:1', { seed: 2, title: 'Two', status: 'queued', position: 1 }),
      assignment('PC:1', { seed: 3, title: 'Three', status: 'queued', position: 2 }),
    ],
  });
  await unlock(page, false);
  const queue = page.getByRole('region', { name: 'Queue' });
  const queued = queue.locator('.queue-card:not(.active) strong');
  await expect(queued).toHaveText(['Two', 'Three']);
  const handle = page.getByRole('button', { name: /^Reorder Three/ });
  await handle.scrollIntoViewIfNeeded();
  const h = (await handle.boundingBox())!;
  const t = (await queue.locator('.queue-card', { hasText: 'Two' }).boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, t.y + 4, { steps: 8 });
  await page.mouse.up();
  await expect(queued).toHaveText(['Three', 'Two']);
});

test('settings: free practice, names, level range, allow skipping, PIN (R-PAR-5, R-SES-6, R-ADP-5)', async ({
  page,
  hasTouch,
}) => {
  await openHome(page, { assignments: [assignment('PC:2', { seed: 4, title: 'Today' })] });
  await unlock(page, hasTouch);
  await press(page.getByRole('navigation').getByRole('button', { name: 'Settings' }), hasTouch);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const free = page.getByRole('radiogroup', { name: 'Free practice' });
  await expect(free.getByRole('radio', { name: 'Always' })).toHaveAttribute('aria-checked', 'true');
  await press(free.getByRole('radio', { name: 'After the assignment' }), hasTouch);
  await expect(page.getByText('Saved.')).toBeVisible();

  // Price changes can't go below level 2.
  await press(page.getByRole('button', { name: 'Raise Price changes, lowest level' }), hasTouch);
  await expect(page.getByRole('group', { name: 'Price changes, lowest level' })).toContainText('2');

  const skip = page.getByRole('switch', { name: 'Allow skipping steps (typed equations)' });
  await expect(skip).toHaveAttribute('aria-checked', 'false');
  await press(skip, hasTouch);
  await expect(skip).toHaveAttribute('aria-checked', 'true');

  await page.getByLabel('Penguin (celebrations)').fill('Waddles');
  await page.getByLabel('Turtle (help)').click();

  await page.getByLabel('New PIN (4 digits)').fill('12');
  await press(page.getByRole('button', { name: 'Change PIN' }), hasTouch);
  await expect(page.getByText('A PIN is 4 digits.')).toBeVisible();
  await page.getByLabel('New PIN (4 digits)').fill('8642');
  await press(page.getByRole('button', { name: 'Change PIN' }), hasTouch);
  await expect(page.getByText('PIN changed.')).toBeVisible();

  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await expect(page.getByText("Waddles: Price changes today? Let's go!")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Price changes, locked' })).toBeDisabled();
  await expect(page.getByText("unlocks when today's assignment is done")).toBeVisible();
  // The level range holds: the assignment's price change starts at level 2.
  await press(page.getByRole('button', { name: 'Start ›' }), hasTouch);
  await expect(page.getByText('Price changes · Level 2')).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Home' }), hasTouch);

  // The new PIN opens the parent area; the old one doesn't.
  await unlock(page, hasTouch);
  await expect(page.getByText("That's not the PIN. Try again.")).toBeVisible();
  await tapPin(page, '8642', hasTouch);
  await press(page.getByRole('navigation').getByRole('button', { name: 'Settings' }), hasTouch);
  await press(
    page.getByRole('radiogroup', { name: 'Free practice' }).getByRole('radio', { name: 'Never' }),
    hasTouch,
  );
  await expect(page.getByText('Saved.')).toBeVisible();
  await press(page.getByRole('button', { name: '‹ Back to learner' }), hasTouch);
  await expect(page.getByText('not open right now')).toBeVisible();
});

test('settings: reduce motion marks the page for the CSS (R-PAR-5, R-NF-3)', async ({ page }) => {
  await openHome(page);
  await expect(page.locator('html')).not.toHaveAttribute('data-reduce-motion');
  await unlock(page, false);
  await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion');
});
