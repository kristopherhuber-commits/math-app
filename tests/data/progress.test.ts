// Sessions, adaptive levels and rewards over Dexie (fake IndexedDB): R-SES-2/3/5/7, R-ADP, R-RWD-1…3.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type Attempt } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import {
  addAssignmentFromLink,
  assignmentProgress,
  assignmentSummary,
  finishAttempt,
  homeSnapshot,
  nextAssignmentQuestion,
  topicLevel,
  type FinishContext,
} from '../../src/data/progress';
import { saveSettings } from '../../src/data/settings';
import type { AssignmentLink } from '../../src/engine/session';
import type { TopicId } from '../../src/engine/config';

const ADAPTIVE: FinishContext = { adaptive: true, rewarded: true };
let clock = 0;

/** A finished attempt: clean 3 ★ by default. */
function finished(topic: TopicId, level: number, o: Partial<Attempt> = {}): Attempt {
  const a = newAttempt({ topic, level, generatorId: 'test', seed: 1, params: {} });
  clock++;
  return {
    ...a,
    finishedAt: new Date(Date.now() + clock).toISOString(),
    stars: 3,
    wrongTries: 0,
    clean: true,
    ...o,
  };
}

/** Answer the assignment's next question with the given outcome. */
async function answerNext(assignmentId: string, o: Partial<Attempt> = {}) {
  const a = (await db.assignments.get(assignmentId))!;
  const q = (await nextAssignmentQuestion(a))!;
  const attempt = finished(q.topic, q.level, { assignmentId, itemIndex: q.itemIndex, seed: q.seed, ...o });
  return { q, events: await finishAttempt(attempt, { adaptive: q.adaptive, rewarded: true }) };
}

const link = (assign: string, extra: Partial<AssignmentLink> = {}): AssignmentLink => ({
  items: assign.split(',').map((p) => {
    const [t, c, lock] = p.split(/[:@]/);
    return { topic: t as TopicId, count: Number(c), ...(lock ? { levelLock: Number(lock) } : {}) };
  }),
  seed: 3,
  ...extra,
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 23, 16, 0));
  await db.delete();
  await db.open();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('assignments (R-SES-1…3)', () => {
  it('the first is active, later ones queue in order (R-SES-2)', async () => {
    const a = await addAssignmentFromLink(link('EQ:2', { title: 'Mon' }));
    const b = await addAssignmentFromLink(link('PC:1'));
    expect(a).toMatchObject({ status: 'active', position: 0, title: 'Mon', order: 'grouped', seed: 3 });
    expect(a.activatedAt).toBeDefined();
    expect(b).toMatchObject({ status: 'queued', position: 1 });
    expect(b.activatedAt).toBeUndefined();
  });

  it('levels: EQ starts at 3, number topics at 1; a lock wins and is not adaptive (R-SES-3)', async () => {
    const a = await addAssignmentFromLink(link('EQ:1,PC:1,RD:1@4'));
    expect(await nextAssignmentQuestion(a)).toMatchObject({
      topic: 'EQ',
      level: 3,
      adaptive: true,
      index: 0,
    });
    await answerNext(a.id);
    expect(await nextAssignmentQuestion(a)).toMatchObject({ topic: 'PC', level: 1, index: 1 });
    await answerNext(a.id);
    expect(await nextAssignmentQuestion(a)).toMatchObject({ topic: 'RD', level: 4, adaptive: false });
  });

  it('resume (R-SES-5): an unfinished attempt changes nothing; the same question comes back', async () => {
    const a = await addAssignmentFromLink(link('PC:3', { order: 'mixed' }));
    await answerNext(a.id);
    const before = await nextAssignmentQuestion(a);
    await db.attempts.put({ ...finished('PC', 1), finishedAt: undefined, assignmentId: a.id, itemIndex: 0 });
    expect(await nextAssignmentQuestion(a)).toEqual(before);
    expect((await assignmentProgress(a)).done).toEqual([1]);
  });

  it('after a walkthrough, the next question is the same item and level (R-HELP-6)', async () => {
    const a = await addAssignmentFromLink(link('EQ:2,PC:2', { order: 'mixed', seed: 1 }));
    const { q } = await answerNext(a.id, { maxHint: 3, stars: 1, clean: false });
    expect(await nextAssignmentQuestion(a)).toMatchObject({ itemIndex: q.itemIndex, level: q.level });
  });
});

describe('finishAttempt', () => {
  it('adds the stars as shells, once (a second call is a no-op)', async () => {
    const at = finished('NC', 1, { stars: 2, clean: false, wrongTries: 1 });
    expect(await finishAttempt(at, ADAPTIVE)).toMatchObject({ stars: 2, shells: 2, badges: ['first-solve'] });
    expect(await finishAttempt(at, ADAPTIVE)).toMatchObject({ shells: 2, badges: [] });
    expect((await db.rewards.get('default'))?.shells).toBe(2);
    expect((await db.attempts.get(at.id))?.countedAt).toBeDefined();
  });

  it('promotes after 4 of 5 clean and says so (R-ADP-2, R-ADP-6); the window resets', async () => {
    const outcomes = [true, true, false, true, true];
    let last;
    for (const clean of outcomes) last = await finishAttempt(finished('PC', 1, { clean }), ADAPTIVE);
    expect(last?.levelUp).toBe(2);
    expect(await topicLevel('PC')).toBe(2);
    expect((await db.topicStates.toArray())[0]?.window).toEqual([]);
  });

  it('demotes silently after 3 walkthroughs (R-ADP-3, R-ADP-6)', async () => {
    const events = [];
    for (let i = 0; i < 3; i++)
      events.push(await finishAttempt(finished('EQ', 3, { maxHint: 3, clean: false, stars: 1 }), ADAPTIVE));
    expect(await topicLevel('EQ')).toBe(2);
    expect(events.every((e) => e.levelUp === undefined)).toBe(true);
  });

  it('attempts at another level, level-locked or fixed-level ones leave the level alone', async () => {
    await finishAttempt(finished('PC', 3), ADAPTIVE); // PC is at level 1
    await finishAttempt(finished('PC', 1), { adaptive: false, rewarded: true });
    await finishAttempt(finished('PC', 1), { adaptive: false, rewarded: false });
    const ts = await db.topicStates.toArray();
    expect(ts.flatMap((t) => t.window)).toEqual([]);
  });

  it('fixed-level practice earns nothing (assumption 4)', async () => {
    const e = await finishAttempt(finished('PC', 1), { adaptive: false, rewarded: false });
    expect(e).toEqual({ stars: 3, shells: 0, badges: [] });
    expect(await db.rewards.get('default')).toBeUndefined();
  });

  it('first successive-change badge (R-RWD-3)', async () => {
    await finishAttempt(finished('PC', 3), ADAPTIVE);
    const e = await finishAttempt(finished('PC', 3, { params: { kind: 'successive' } }), ADAPTIVE);
    expect(e.badges).toEqual(['first-successive-pc']);
  });

  it('10 EQ questions in a row without a walkthrough (R-RWD-3)', async () => {
    const got: string[] = [];
    for (let i = 0; i < 10; i++)
      got.push(
        ...(await finishAttempt(finished('EQ', 3, { stars: 2, clean: false, wrongTries: 1 }), ADAPTIVE))
          .badges,
      );
    expect(got).toEqual(['first-solve', 'eq-no-walkthrough']);
  });
});

describe('assignment completion (R-SES-2, R-SES-7)', () => {
  it('finishing the last question completes it, activates the next, and reports it', async () => {
    const a = await addAssignmentFromLink(link('PC:1,RD:1', { title: 'Test' }));
    const b = await addAssignmentFromLink(link('EQ:1'));
    expect((await homeSnapshot()).freeOpen).toBe(true); // `always`, the default (R-SES-6, parent decision)
    await saveSettings({ freePractice: 'afterAssignment' });
    expect((await homeSnapshot()).freeOpen).toBe(false);
    const first = await answerNext(a.id, { stars: 2, clean: false, wrongTries: 1 });
    expect(first.events.assignmentDone).toBeUndefined();
    const second = await answerNext(a.id);
    expect(second.events.assignmentDone).toBe(a.id);
    expect(await db.assignments.get(a.id)).toMatchObject({ status: 'done' });
    expect(await db.assignments.get(b.id)).toMatchObject({ status: 'active' });
    expect((await homeSnapshot()).assignment?.id).toBe(b.id);

    const s = await assignmentSummary(a.id);
    expect(s).toMatchObject({
      title: 'Test',
      questions: 2,
      stars: 5,
      byTopic: [
        { topic: 'PC', stars: { 3: 0, 2: 1, 1: 0 } },
        { topic: 'RD', stars: { 3: 1, 2: 0, 1: 0 } },
      ],
    });
    expect(s?.badges).toContain('first-solve');
    expect(s?.badges).not.toContain('perfect-assignment');
  });

  it('first perfect assignment, then free practice opens (R-RWD-3, R-SES-6)', async () => {
    const a = await addAssignmentFromLink(link('NC:2'));
    await answerNext(a.id);
    const { events } = await answerNext(a.id);
    expect(events.badges).toContain('perfect-assignment');
    expect(await homeSnapshot()).toMatchObject({ freeOpen: true, shells: 6 });
  });
});

describe('streak (R-RWD-2)', () => {
  it('grows by day with assignment answers, breaks on a missed assignment day, milestone at 3', async () => {
    const a = await addAssignmentFromLink(link('PC:20'));
    const day = async (d: number) => {
      vi.setSystemTime(new Date(2026, 8, d, 16, 0));
      return (await answerNext(a.id)).events.streak;
    };
    expect(await day(23)).toEqual({ days: 1, milestone: false });
    vi.setSystemTime(new Date(2026, 8, 23, 17, 0));
    expect((await answerNext(a.id)).events.streak).toBeUndefined();
    expect(await day(24)).toEqual({ days: 2, milestone: false });
    expect(await day(25)).toEqual({ days: 3, milestone: true });
    expect((await homeSnapshot()).streak).toBe(3);
    vi.setSystemTime(new Date(2026, 8, 27, 9, 0));
    expect((await homeSnapshot()).streak).toBe(0);
    expect(await day(27)).toEqual({ days: 1, milestone: false });
  });

  it('free practice does not count', async () => {
    const e = await finishAttempt(finished('PC', 1), ADAPTIVE);
    expect(e.streak).toBeUndefined();
  });
});
