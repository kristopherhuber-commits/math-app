// R-TEST-5 / M2 done-when: complete the tile builder (EQ levels 1–2) by mouse, by touch emulation
// and by keyboard alone (R-EQ-TILE-6, R-PLAT-5). The moves are computed from the engine's model of
// the same seeded question, so the test drives the UI exactly as a learner would.
import { expect, test, type Page } from '@playwright/test';
import { generateEq } from '../src/engine/topics/eq/generator';
import { correctSign, mustCross, newBoard, simplifyPlan, type Side } from '../src/engine/eq/tiles';
import { formatRational, type Rational } from '../src/engine/rational';
import { openHome } from './helpers';

const M = '−';

function planFor(level: number, seed: number) {
  const q = generateEq(level, seed);
  const board = newBoard(q.text, q.variable);
  const moves = board.tiles
    .filter((t) => mustCross(board, t.id))
    .map((t) => ({ id: t.id, to: (t.home === 'L' ? 'R' : 'L') as Side, sign: correctSign(t) }));
  return { q, moves };
}

/** The numbers to enter in Simplify and Solve, read off the recorded separated line. */
async function padValues(page: Page, variable: string): Promise<string[]> {
  const sep = (await page.locator('.tile-steps .step-line').first().getAttribute('data-line'))!;
  const p = simplifyPlan(sep, variable);
  const out: Rational[] = [];
  if (p.needVar) out.push(p.c);
  if (p.needConst) out.push(p.d);
  if (p.solve) out.push(p.solve.divisor, p.solve.answer);
  return out.map(formatRational);
}

async function zoneCenter(page: Page, side: Side) {
  const b = (await page.locator(`.drop-zone[data-side="${side}"]`).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height - 30 };
}

async function mouseDrag(page: Page, id: string, to: Side) {
  const b = (await page.locator(`[data-tile="${id}"]`).boundingBox())!;
  const target = await zoneCenter(page, to);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
}

/** Real touch events through CDP: Chrome turns them into pointer events of type "touch". */
async function touchDrag(page: Page, id: string, to: Side) {
  const cdp = await page.context().newCDPSession(page);
  const b = (await page.locator(`[data-tile="${id}"]`).boundingBox())!;
  const from = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const target = await zoneCenter(page, to);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 10; i++) {
    const p = { x: from.x + ((target.x - from.x) * i) / 10, y: from.y + ((target.y - from.y) * i) / 10 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function press(page: Page, name: string, touch: boolean) {
  const b = page.getByRole('button', { name, exact: true });
  if (touch) await b.tap();
  else await b.click();
}

async function enterNumber(page: Page, value: string, touch: boolean) {
  for (const ch of value.replace('/', '')) await press(page, ch === M ? 'minus' : ch, touch);
  await press(page, 'Check', touch);
}

async function readTries(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ stepType?: string; verdict: string; diagnostic?: string }[]>((resolve, reject) => {
        const open = indexedDB.open('turtle-penguin-math');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('attempts').objectStore('attempts').getAll();
          req.onsuccess = () => resolve((req.result as { tries: never[] }[]).flatMap((a) => a.tries));
        };
      }),
  );
}

for (const [level, seed] of [
  [1, 7],
  [2, 11],
] as const) {
  test(`solve a level ${level} tile question by ${'pointer'} (mouse, or touch on the tablet project)`, async ({
    page,
  }, info) => {
    const touch = !!info.project.use.hasTouch;
    const { q, moves } = planFor(level, seed);
    await page.goto(`./?level=${level}&seed=${seed}`);
    await expect(page.locator('.tile-board')).toBeVisible();
    for (const m of moves) {
      if (touch) await touchDrag(page, m.id, m.to);
      else await mouseDrag(page, m.id, m.to);
      await expect(page.locator('.sign-picker')).toBeVisible();
      await press(page, m.sign > 0 ? 'plus' : 'minus', touch);
      await expect(page.locator('.sign-picker')).toBeHidden();
    }
    await press(page, 'Done moving', touch);
    for (const value of await padValues(page, q.variable)) await enterNumber(page, value, touch);
    await expect(page.getByText('Solved!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
    const tries = await readTries(page);
    expect(tries.filter((t) => t.stepType === 'SIGN' && t.verdict === 'stepAccepted')).toHaveLength(
      moves.length,
    );
    expect(tries.filter((t) => t.stepType === 'MOVE')).toHaveLength(moves.length);
  });
}

test('solve a tile question with the keyboard alone (R-EQ-TILE-6)', async ({ page }) => {
  const { q, moves } = planFor(2, 11);
  await page.goto('./?level=2&seed=11');
  await expect(page.locator('.tile-board')).toBeVisible();
  for (const m of moves) {
    await page.locator(`[data-tile="${m.id}"]`).focus();
    await page.keyboard.press('Enter'); // pick up
    await page.keyboard.press(m.to === 'R' ? 'ArrowRight' : 'ArrowLeft');
    await page.keyboard.press('Enter'); // drop
    await expect(page.locator('.sign-picker')).toBeVisible();
    await page.keyboard.press(m.sign > 0 ? '+' : '-');
  }
  // Focus moves to Done moving once every tile is placed.
  await expect(page.getByRole('button', { name: 'Done moving' })).toBeFocused();
  await page.keyboard.press('Enter');
  for (const value of await padValues(page, q.variable)) {
    await page.keyboard.type(value.replace(M, '-'));
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Solved!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next question' })).toBeFocused();
});

test('a wrong sign shows the balance explanation and is stored as EQ-D4; Esc cancels a pick-up', async ({
  page,
}) => {
  const { moves } = planFor(2, 11);
  const m = moves[0]!;
  await page.goto('./?level=2&seed=11');
  const tile = page.locator(`[data-tile="${m.id}"]`);
  await tile.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press(m.to === 'R' ? 'ArrowRight' : 'ArrowLeft');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sign-picker')).toBeHidden();
  await mouseDrag(page, m.id, m.to);
  await page.getByRole('button', { name: m.sign > 0 ? 'minus' : 'plus', exact: true }).click();
  await expect(page.locator('.step-feedback')).toContainText('BOTH sides');
  await expect(page.locator('.sign-picker')).toBeVisible();
  expect((await readTries(page)).at(-1)).toMatchObject({ stepType: 'SIGN', diagnostic: 'EQ-D4' });
  await page.getByRole('button', { name: m.sign > 0 ? 'plus' : 'minus', exact: true }).click();
  await expect(page.locator('.balance-explainer')).toBeVisible();
});

test('free practice at a picked EQ level 2 opens the tile builder (R-ANS-5)', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Equations', exact: true }).click();
  await page.getByRole('button', { name: /^Level 2/ }).click();
  await expect(page.getByText('Equations · Level 2')).toBeVisible();
  await expect(page.locator('.tile-board')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your next line' })).toHaveCount(0);
});

test('reduced motion: the balance scale is two still frames (R-NF-3)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const m = planFor(2, 11).moves[0]!;
  await page.goto('./?level=2&seed=11');
  await mouseDrag(page, m.id, m.to);
  await page.getByRole('button', { name: m.sign > 0 ? 'plus' : 'minus', exact: true }).click();
  await expect(page.locator('.balance-explainer .balance-static .balance-frame')).toHaveCount(2);
});
