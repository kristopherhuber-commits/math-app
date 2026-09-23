// R-NF-5: the in-app error list (fake IndexedDB).
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearErrors, listErrors, logError } from '../../src/data/errors';
import { config } from '../../src/engine/config';

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await db.errors.clear();
});

describe('error list (R-NF-5)', () => {
  it('stores where, the message and the stack, newest first', async () => {
    await logError('saveAttempt', new Error('disk full'));
    await new Promise((r) => setTimeout(r, 2));
    await logError('promise', 'plain text');
    await new Promise((r) => setTimeout(r, 2));
    await logError('window', { code: 7 });
    const list = await listErrors();
    expect(list.map((e) => [e.where, e.message])).toEqual([
      ['window', '{"code":7}'],
      ['promise', 'plain text'],
      ['saveAttempt', 'disk full'],
    ]);
    expect(list[2]!.stack).toContain('disk full');
    expect(list[1]!.stack).toBeUndefined();
  });

  it(`keeps only the newest ${config.parent.errorLogMax}`, async () => {
    const base = Date.parse('2026-09-01T00:00:00Z');
    await db.errors.bulkAdd(
      Array.from({ length: config.parent.errorLogMax }, (_, i) => ({
        at: new Date(base + i * 1000).toISOString(),
        where: 'old',
        message: String(i),
      })),
    );
    await logError('new', 'latest');
    const list = await listErrors();
    expect(list).toHaveLength(config.parent.errorLogMax);
    expect(list[0]!.message).toBe('latest');
    expect(list.some((e) => e.message === '0')).toBe(false);
  });

  it('clears', async () => {
    await logError('x', 'y');
    await clearErrors();
    expect(await listErrors()).toEqual([]);
  });

  it('never throws when the database fails', async () => {
    const spy = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('closed') as never);
    await expect(logError('x', 'y')).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
