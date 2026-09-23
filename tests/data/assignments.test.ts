// R-PAR-2, R-SES-1/2: the parent's assignment queue over Dexie (fake IndexedDB).
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import {
  AssignmentError,
  completeEarly,
  createAssignment,
  deleteAssignment,
  loadQueue,
  makeActive,
  reorderQueue,
  updateAssignment,
} from '../../src/data/assignments';
import { finishAttempt, nextAssignmentQuestion } from '../../src/data/progress';
import type { AssignmentDraft } from '../../src/engine/session';

const draft = (title: string, o: Partial<AssignmentDraft> = {}): AssignmentDraft => ({
  title,
  items: [{ topic: 'PC', count: 2 }],
  order: 'grouped',
  seed: 1,
  ...o,
});

const status = async () =>
  Object.fromEntries((await db.assignments.toArray()).map((a) => [a.title, a.status]));

const queueTitles = async () => (await loadQueue()).queued.map((e) => e.assignment.title);

async function answerOne(id: string) {
  const a = (await db.assignments.get(id))!;
  const q = (await nextAssignmentQuestion(a))!;
  const at = newAttempt({ topic: q.topic, level: q.level, generatorId: 'test', seed: q.seed, params: {} });
  await finishAttempt(
    {
      ...at,
      assignmentId: id,
      itemIndex: q.itemIndex,
      finishedAt: new Date().toISOString(),
      stars: 3,
      clean: true,
      wrongTries: 0,
    },
    { adaptive: true, rewarded: true },
  );
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 23, 16, 0));
  await db.delete();
  await db.open();
});
afterEach(() => vi.useRealTimers());

describe('create (R-SES-1/2, mockup 11)', () => {
  it('"Add to queue" appends; the first one is active at once', async () => {
    const a = await createAssignment(draft('A'), false);
    await createAssignment(draft('B'), false);
    await createAssignment(draft('C', { title: '  C  ', dueDate: '2026-09-30' }), false);
    expect(await status()).toEqual({ A: 'active', B: 'queued', C: 'queued' });
    expect(a.activatedAt).toBeDefined();
    expect(await queueTitles()).toEqual(['B', 'C']);
    expect((await loadQueue()).queued[1]!.assignment.dueDate).toBe('2026-09-30');
  });

  it('"Save & make active" sends the active one to the front of the queue, progress kept', async () => {
    const a = await createAssignment(draft('A'), true);
    await createAssignment(draft('B'), false);
    await answerOne(a.id);
    await createAssignment(draft('New'), true);
    expect(await status()).toEqual({ A: 'queued', B: 'queued', New: 'active' });
    expect(await queueTitles()).toEqual(['A', 'B']);
    const q = await loadQueue();
    expect(q.queued[0]!.progress.doneTotal).toBe(1);
    expect(q.queued[0]!.assignment.activatedAt).toBeUndefined();
  });

  it('refuses an invalid draft and stores nothing', async () => {
    await expect(createAssignment(draft('X', { items: [] }), true)).rejects.toBeInstanceOf(AssignmentError);
    expect(await db.assignments.count()).toBe(0);
  });

  it('a new assignment gets a seed when the draft has none', async () => {
    const a = await createAssignment({ items: [{ topic: 'EQ', count: 1 }], order: 'mixed' }, false);
    expect(typeof a.seed).toBe('number');
    expect(a.order).toBe('mixed');
  });
});

describe('edit (R-PAR-2)', () => {
  it('before it starts, everything can change', async () => {
    const a = await createAssignment(draft('A', { dueDate: '2026-10-01' }), true);
    const b = await updateAssignment(a.id, {
      items: [{ topic: 'NC', count: 4, levelLock: 3 }],
      order: 'mixed',
    });
    expect(b).toMatchObject({
      items: [{ topic: 'NC', count: 4, levelLock: 3 }],
      order: 'mixed',
      status: 'active',
    });
    expect(b.title).toBeUndefined();
    expect(b.dueDate).toBeUndefined();
    expect(b.seed).toBe(a.seed);
  });

  it('once started: counts and new items, not removals; the order stays', async () => {
    const a = await createAssignment(draft('A', { items: [{ topic: 'PC', count: 3 }] }), true);
    await answerOne(a.id);
    const ok = await updateAssignment(a.id, {
      title: 'A',
      items: [
        { topic: 'PC', count: 1 },
        { topic: 'EQ', count: 2 },
      ],
      order: 'mixed',
    });
    expect(ok.items).toHaveLength(2);
    expect(ok.order).toBe('grouped');
    await expect(
      updateAssignment(a.id, { items: [{ topic: 'EQ', count: 2 }], order: 'grouped' }),
    ).rejects.toBeInstanceOf(AssignmentError);
  });

  it('a done assignment cannot be edited', async () => {
    const a = await createAssignment(draft('A'), true);
    await completeEarly(a.id);
    await expect(updateAssignment(a.id, draft('A'))).rejects.toBeInstanceOf(AssignmentError);
  });
});

describe('delete, reorder, make active, complete early (R-PAR-2, R-SES-2)', () => {
  it('deleting the active one activates the next; its attempts stay', async () => {
    const a = await createAssignment(draft('A'), true);
    await createAssignment(draft('B'), false);
    await answerOne(a.id);
    await deleteAssignment(a.id);
    expect(await status()).toEqual({ B: 'active' });
    expect(await db.attempts.where('assignmentId').equals(a.id).count()).toBe(1);
  });

  it('deleting a queued one leaves the active one alone', async () => {
    await createAssignment(draft('A'), true);
    const b = await createAssignment(draft('B'), false);
    await deleteAssignment(b.id);
    expect(await status()).toEqual({ A: 'active' });
  });

  it('reorders the queue', async () => {
    await createAssignment(draft('A'), true);
    const b = await createAssignment(draft('B'), false);
    const c = await createAssignment(draft('C'), false);
    const d = await createAssignment(draft('D'), false);
    await reorderQueue([d.id, b.id, c.id]);
    expect(await queueTitles()).toEqual(['D', 'B', 'C']);
    await reorderQueue([c.id]);
    expect(await queueTitles()).toEqual(['C', 'D', 'B']);
  });

  it('make active: the queued one takes over, the active one goes to the front of the queue', async () => {
    await createAssignment(draft('A'), true);
    await createAssignment(draft('B'), false);
    const c = await createAssignment(draft('C'), false);
    await makeActive(c.id);
    expect(await status()).toEqual({ A: 'queued', B: 'queued', C: 'active' });
    expect(await queueTitles()).toEqual(['A', 'B']);
  });

  it('complete early: done now, the next queued becomes active, finishing is recorded', async () => {
    const a = await createAssignment(draft('A'), true);
    await createAssignment(draft('B'), false);
    await completeEarly(a.id);
    expect(await status()).toEqual({ A: 'done', B: 'active' });
    const q = await loadQueue();
    expect(q.done.map((e) => e.assignment.title)).toEqual(['A']);
    expect(q.done[0]!.assignment.completedAt).toBeDefined();
    expect(q.active?.assignment.title).toBe('B');
  });

  it('completing a queued one early just closes it', async () => {
    await createAssignment(draft('A'), true);
    const b = await createAssignment(draft('B'), false);
    await completeEarly(b.id);
    expect(await status()).toEqual({ A: 'active', B: 'done' });
  });
});
