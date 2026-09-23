// Shared e2e set-up. A fresh browser context starts at the first-run setup (R-PAR-1); most specs
// skip it by writing a set-up profile straight into IndexedDB, and write assignments with a known
// seed the same way (the ?assign= link is gone since M5; the parent flow itself is in parent.spec).
import { createHash, randomBytes } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { TopicId } from '../src/engine/config';

export const PIN = '2468';

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

/** `'PC:2,RD:1,EQ:1@3'` → assignment items (`@n` locks the level). */
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
  rows: { assignments?: object[]; topicStates?: object[]; settings?: object } = {},
): Promise<void> {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Hello, grown-up!' })).toBeVisible();
  await putRows(page, {
    settings: [{ profileId: 'default', pinHash: pinHash(), ...rows.settings }],
    ...(rows.assignments ? { assignments: rows.assignments } : {}),
    ...(rows.topicStates ? { topicStates: rows.topicStates } : {}),
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hi there!' })).toBeVisible();
}
