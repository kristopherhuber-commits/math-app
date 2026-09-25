import { test } from '@playwright/test';
import { generateRd } from '../src/engine/topics/rd/generator';
import { generatePc } from '../src/engine/topics/pc/generator';
import { generateEq } from '../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../src/engine/topics/eq/hints';
import { questionSeed } from '../src/engine/session';
import { assignment, attemptRow, openHome, PIN } from './helpers';
import { mulberry32 } from '../src/engine/rng';
import { TOPICS } from '../src/engine/config';

const OUT = process.env.SHOTS ?? '';

test.skip(!OUT, 'screenshots only on demand');

test('screens', async ({ page }, info) => {
  const tag = info.project.name;
  await page.goto('./');
  await page.screenshot({ path: `${OUT}/${tag}-setup.png` });
  await openHome(page);
  await page.screenshot({ path: `${OUT}/${tag}-home.png` });
  await page.goto('./?level=4&seed=2024');
  const input = page.getByRole('textbox', { name: 'Your next line' });
  await input.fill('5w + 40 = 2w - 1');
  await input.press('Enter');
  await input.fill('5w + 2w = -1 - 40');
  await input.press('Enter');
  await page.screenshot({ path: `${OUT}/${tag}-feedback.png` });
  await page.getByRole('button', { name: 'Help' }).click();
  await page.screenshot({ path: `${OUT}/${tag}-hint.png`, fullPage: true });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: `${OUT}/${tag}-portrait.png`, fullPage: true });
});

test('number topic screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = async (name: string) => {
    await page.waitForTimeout(450); // let the line-in animations finish
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
  };
  for (const [topic, level, seed] of [
    ['RD', 3, 7],
    ['RD', 1, 3],
    ['FDP', 4, 5],
    ['FDP', 3, 9],
    ['PC', 3, 4],
    ['NC', 3, 2],
    ['NC', 4, 1],
  ] as const) {
    await page.goto(`./?topic=${topic}&level=${level}&seed=${seed}`);
    await shot(`${topic}${level}`);
  }
  // The longest option text: RD level 5, F→D over 7 (block of 6, shown 3 times).
  let s7 = 0;
  while (generateRd(5, s7).params.shape !== 'f2d7') s7++;
  await page.goto(`./?topic=RD&level=5&seed=${s7}`);
  await shot('RD5-sevenths');
  // Wrong answers, the hint and the walkthrough with a mini-question (RD level 3, seed 7).
  const q = generateRd(3, 7);
  const wrong = q.options.findIndex((o) => o.code !== 'correct');
  await page.goto('./?topic=RD&level=3&seed=7');
  await page.keyboard.press(`${wrong + 1}`);
  await page.getByRole('button', { name: 'Check' }).click();
  await shot('rd-wrong');
  const wrong2 = q.options.findIndex((o, i) => o.code !== 'correct' && i !== wrong);
  await page.keyboard.press(`${wrong2 + 1}`);
  await page.getByRole('button', { name: 'Check' }).click();
  await shot('rd-hint');
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  for (let i = 0; i < 3; i++) {
    const chips = page.locator('.mini-chip:not([disabled])');
    if ((await chips.count()) > 0) await chips.first().click();
    if (await page.getByRole('button', { name: /Next|Done/ }).isEnabled()) {
      await page.getByRole('button', { name: /Next|Done/ }).click();
    }
  }
  await shot('rd-walk');
  await page.goto('./?topic=NC&level=4&seed=1');
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await shot('nc-walk');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('./?topic=FDP&level=3&seed=9');
  await shot('fdp-portrait');
  await page.goto('./?topic=NC&level=3&seed=2');
  await shot('nc-portrait');
});

// M4: Home with an assignment, celebrations (3 ★ in MC, 1 ★ after a walkthrough, EQ with its
// check, level up), the summary, the streak overlay, and Home afterwards.
test('session and reward screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = async (name: string, wait = 1300) => {
    await page.waitForTimeout(wait); // let the celebration finish
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
  };
  const seed = 5;
  const answer = async (q: { options: { code: string }[] }) => {
    await page
      .locator('.mc-option')
      .nth(q.options.findIndex((o) => o.code === 'correct'))
      .click();
    await page.getByRole('button', { name: 'Check' }).click();
  };
  await openHome(page, {
    assignments: [assignment('PC:5,RD:1,EQ:1@3', { seed, title: 'Monday practice' })],
  });
  await page.getByRole('button', { name: 'Start ›' }).waitFor();
  await shot('home-assignment', 200);
  await page.getByRole('button', { name: 'Start ›' }).click();
  for (let i = 0; i < 5; i++) {
    await answer(generatePc(1, questionSeed(seed, i), '$'));
    if (i === 0) await shot('celebrate-3');
    if (i < 4) await page.getByRole('button', { name: 'Next question' }).click();
  }
  await shot('celebrate-levelup');
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('button', { name: 'Help' }).click();
  await page.getByRole('button', { name: 'Show me step by step' }).click();
  for (let i = 0; i < 12 && (await page.getByRole('button', { name: 'Next question' }).count()) === 0; i++) {
    const walkNext = page.getByRole('button', { name: /Next ›|Done/ });
    // A mini-question gates Next: try its choices until one is right.
    while (!(await walkNext.isEnabled())) await page.locator('.mini-chip:not([disabled])').first().click();
    await walkNext.click();
  }
  await shot('celebrate-walkthrough');
  await page.getByRole('button', { name: 'Next question' }).click();
  const q = generateEq(3, questionSeed(seed, 6));
  const input = page.getByRole('textbox', { name: 'Your next line' });
  for (const s of eqWalkthrough(q.text, q.variable).filter((w) => w.kind !== 'CHECK')) {
    await input.fill(s.line);
    await input.press('Enter');
  }
  await shot('celebrate-eq');
  await page.getByRole('button', { name: 'Next question' }).click();
  await shot('summary');
  await page.getByRole('button', { name: 'Home' }).click();
  await shot('home-after', 300);
  await page.setViewportSize({ width: 768, height: 1024 });
  await shot('home-portrait', 300);
});

test('parent screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = (name: string) =>
    page.screenshot({ path: `${OUT}/${tag}-parent-${name}.png`, fullPage: true });
  await openHome(page, {
    assignments: [
      assignment('EQ:10,PC:5@4,RD:5', { seed: 1, title: 'Monday practice' }),
      assignment('FDP:6', { seed: 2, title: 'Fractions review', status: 'queued', position: 1 }),
      assignment('EQ:8', { seed: 3, title: 'Weekend equations', status: 'queued', position: 2 }),
    ],
    attempts: sampleAttempts(),
    topicStates: TOPICS.map((topic, i) => ({ profileId: 'default', topic, level: 1 + (i % 3), window: [] })),
  });
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await shot('pin');
  await page.keyboard.type(PIN);
  await page.getByLabel('Title (optional)').fill('Tuesday practice');
  for (const t of ['Equations', 'Price changes', 'Repeating decimals']) {
    await page.getByRole('button', { name: '+ Add topic' }).click();
    await page.getByRole('group', { name: 'Which topic?' }).getByRole('button', { name: t }).click();
  }
  await page.locator('.item-name', { hasText: 'Price changes' }).click();
  await shot('builder');
  for (const p of ['Progress', 'Missed questions', 'Settings', 'Data']) {
    await page.getByRole('navigation').getByRole('button', { name: p }).click();
    await page.waitForTimeout(400);
    await shot(p.toLowerCase().replace(' ', '-'));
  }
});

/** Thirty days of made-up answers for the dashboard screenshots (seeded, so every run is the same). */
function sampleAttempts() {
  const rng = mulberry32(2026);
  const rows = [];
  for (let d = 29; d >= 0; d--) {
    if (rng.next() < 0.2) continue;
    for (let k = rng.int(2, 8); k > 0; k--) {
      const t = new Date(Date.now() - d * 86_400_000 - k * 600_000);
      const hint = rng.pick([0, 0, 0, 0, 1, 1, 2, 3] as const);
      const eq = rng.next() < 0.4;
      rows.push(
        attemptRow({
          topic: eq ? 'EQ' : rng.pick(['NC', 'RD', 'FDP', 'PC'] as const),
          finishedAt: t.toISOString(),
          maxHint: hint,
          clean: hint <= 1 && rng.next() < 0.8,
          wrongTries: hint >= 2 ? 1 : 0,
          tries:
            eq && hint >= 2
              ? [{ at: t.toISOString(), answer: 'x', verdict: 'stepRejected', diagnostic: 'EQ-D4' }]
              : [],
        }),
      );
    }
  }
  return rows;
}

test('rewards screens', async ({ page }, info) => {
  const tag = info.project.name;
  const shot = (name: string) => page.screenshot({ path: `${OUT}/${tag}-m6-${name}.png`, fullPage: true });
  await openHome(page, {
    rewards: [
      {
        profileId: 'default',
        shells: 420,
        spent: 150,
        streak: 3,
        badges: [
          { id: 'first-solve', at: 'x' },
          { id: 'first-delayed-rd', at: 'x' },
        ],
        accessories: ['turtle-hat', 'penguin-scarf', 'turtle-sunglasses', 'penguin-hat'],
      },
    ],
  });
  await page.waitForTimeout(300);
  await shot('home');
  await page.getByRole('button', { name: 'Shop', exact: true }).click();
  await page.waitForTimeout(200);
  await shot('shop');
});
