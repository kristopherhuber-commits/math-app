// Shared e2e set-up. A fresh browser context starts at the first-run setup (R-PAR-1); most specs
// skip it by writing a set-up profile straight into IndexedDB, and write assignments with a known
// seed the same way (the ?assign= link is gone since M5; the parent flow itself is in parent.spec).
import { createHash, randomBytes } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { TopicId } from '../src/engine/config';
import { answerQuality, starsFor } from '../src/engine/scoring';
import { generateFdpTopic } from '../src/engine/topics/fdp/topic';
import type { McQuestion } from '../src/engine/topics/mc';
import { rewardStrings } from '../src/ui/strings';

export const PIN = '2468';

/**
 * The first seed from `from` whose FDP question at this level is a repeating-decimal one (RD is part
 * of FDP since 2026-10-11), optionally one that also passes `ok`. Its question is `generateRd(level, seed)`.
 */
export function rdSeed(level: number, from: number, ok: (q: McQuestion) => boolean = () => true): number {
  for (let seed = from; ; seed++) {
    const q = generateFdpTopic(level, seed);
    if (q.topic === 'RD' && ok(q)) return seed;
  }
}

/**
 * The celebration headline for an answer at this level (R-RWD-1: 2 × level, less 1 for H1, 2 more
 * for H2 and 2 per wrong try).
 */
export function starsText(level: number, wrongTries = 0, maxHint = 0): string {
  const o = { level, wrongTries, maxHint };
  return rewardStrings.celebrate.headline(starsFor(o), answerQuality(o));
}

/** The celebration headline for a first-try answer with no hint at this level (2, 4, 6, 8 ★). */
export const fullStarsText = (level: number): string => starsText(level);

/** The app's stored form (R-DATA-2): `sha256$<salt>$<sha256(salt:pin)>`. */
export function pinHash(pin: string = PIN): string {
  const salt = randomBytes(16).toString('hex');
  return `sha256$${salt}$${createHash('sha256').update(`${salt}:${pin}`).digest('hex')}`;
}

/** Put rows into the app's IndexedDB stores (the app must have opened the database already). */
export async function putRows(page: Page, rows: Record<string, object[]>): Promise<void> {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('turtle-penguin-math');
        open.onsuccess = () => {
          const tx = open.result.transaction(Object.keys(rows), 'readwrite');
          for (const [store, list] of Object.entries(rows))
            for (const r of list) tx.objectStore(store).put(r);
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
    rows,
  );
}

/** `'PC:2,FDP:1,EQ:1@3'` → assignment items (`@n` locks the level). */
export function items(spec: string): { topic: TopicId; count: number; levelLock?: number }[] {
  return spec.split(',').map((part) => {
    const [, topic, count, lock] = /^(\w+):(\d+)(?:@(\d+))?$/.exec(part)!;
    return { topic: topic as TopicId, count: Number(count), ...(lock ? { levelLock: Number(lock) } : {}) };
  });
}

export function assignment(
  spec: string,
  o: {
    seed: number;
    title?: string;
    order?: 'grouped' | 'mixed';
    status?: 'active' | 'queued';
    position?: number;
  },
) {
  const now = new Date().toISOString();
  const status = o.status ?? 'active';
  return {
    id: `test-${spec}-${o.seed}-${o.position ?? 0}`,
    profileId: 'default',
    items: items(spec),
    status,
    createdAt: now,
    position: o.position ?? 0,
    seed: o.seed,
    order: o.order ?? 'grouped',
    ...(o.title ? { title: o.title } : {}),
    ...(status === 'active' ? { activatedAt: now } : {}),
  };
}

/**
 * Open Home as a set-up app (PIN `PIN`, default names), optionally with assignments, topic
 * states and settings already stored.
 */
export async function openHome(
  page: Page,
  rows: {
    assignments?: object[];
    topicStates?: object[];
    attempts?: object[];
    rewards?: object[];
    settings?: object;
  } = {},
): Promise<void> {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  await putRows(page, {
    settings: [{ profileId: 'default', pinHash: pinHash(), ...rows.settings }],
    ...(rows.assignments ? { assignments: rows.assignments } : {}),
    ...(rows.topicStates ? { topicStates: rows.topicStates } : {}),
    ...(rows.attempts ? { attempts: rows.attempts } : {}),
    ...(rows.rewards ? { rewards: rows.rewards } : {}),
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
}

let attemptN = 0;

/** A finished attempt row (3 minutes, clean 3 ★ unless overridden). */
export function attemptRow(o: Record<string, unknown> & { topic: TopicId; finishedAt: string }) {
  const finished = Date.parse(o.finishedAt);
  return {
    id: `att-${++attemptN}-${finished}`,
    profileId: 'default',
    level: 1,
    generatorId: 'test',
    seed: 1,
    params: {},
    startedAt: new Date(finished - 3 * 60_000).toISOString(),
    tries: [],
    maxHint: 0,
    stars: 3,
    clean: true,
    wrongTries: 0,
    countedAt: o.finishedAt,
    ...o,
  };
}

/** The question on screen: its level and seed, from the attempt saved when it appeared (R-SES-5). */
export async function current(page: Page): Promise<{ level: number; seed: number }> {
  await expect(page.locator('.mc-option')).toHaveCount(5);
  return page.evaluate(
    () =>
      new Promise<{ level: number; seed: number }>((resolve, reject) => {
        const open = indexedDB.open('turtle-penguin-math');
        open.onsuccess = () => {
          const req = open.result.transaction('attempts').objectStore('attempts').getAll();
          req.onsuccess = () => {
            const open2 = (
              req.result as { startedAt: string; finishedAt?: string; level: number; seed: number }[]
            )
              .filter((a) => !a.finishedAt)
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
            open.result.close();
            if (open2) resolve({ level: open2.level, seed: open2.seed });
            else reject(new Error('no open attempt'));
          };
        };
        open.onerror = () => reject(open.error);
      }),
  );
}
