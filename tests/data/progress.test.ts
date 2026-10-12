// Sessions, adaptive levels and rewards over Dexie (fake IndexedDB): R-SES-2/3/5/7, R-ADP, R-RWD-1…3.
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type Attempt } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import { createAssignment } from '../../src/data/assignments';
import {
  assignmentProgress,
  assignmentSummary,
  finishAttempt,
  homeSnapshot,
  nextAssignmentQuestion,
  topicLevel,
  type FinishContext,
} from '../../src/data/progress';
import { saveSettings } from '../../src/data/settings';
import type { AssignmentDraft } from '../../src/engine/session';
import type { TopicId } from '../../src/engine/config';

const ADAPTIVE: FinishContext = { adaptive: true, rewarded: true };
let clock = 0;

/** A finished attempt: clean (first try, no hint) by default; finishAttempt sets its stars. */
function finished(topic: TopicId, level: number, o: Partial<Attempt> = {}): Attempt {
  const a = newAttempt({ topic, level, generatorId: 'test', seed: 1, params: {} });
  clock++;
  return {
    ...a,
    finishedAt: new Date(Date.now() + clock).toISOString(),
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

/** An assignment from a spec like 'EQ:1,PC:1,RD:1@4' (`@n` locks the level), added to the queue. */
const add = (assign: string, extra: Partial<AssignmentDraft> = {}) =>
  createAssignment(draft(assign, extra), false);

const draft = (assign: string, extra: Partial<AssignmentDraft> = {}): AssignmentDraft => ({
  items: assign.split(',').map((p) => {
    const [t, c, lock] = p.split(/[:@]/);
    return { topic: t as TopicId, count: Number(c), ...(lock ? { levelLock: Number(lock) } : {}) };
  }),
  seed: 3,
  order: 'grouped',
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
    const a = await add('EQ:2', { title: 'Mon' });
    const b = await add('PC:1');
    expect(a).toMatchObject({ status: 'active', position: 0, title: 'Mon', order: 'grouped', seed: 3 });
    expect(a.activatedAt).toBeDefined();
    expect(b).toMatchObject({ status: 'queued', position: 1 });
    expect(b.activatedAt).toBeUndefined();
  });

  it('levels: EQ starts at 2, number topics at 1; a lock wins and is not adaptive (R-SES-3)', async () => {
    const a = await add('EQ:1,PC:1,RD:1@4');
    expect(await nextAssignmentQuestion(a)).toMatchObject({
      topic: 'EQ',
      level: 2,
      adaptive: true,
      index: 0,
    });
    await answerNext(a.id);
    expect(await nextAssignmentQuestion(a)).toMatchObject({ topic: 'PC', level: 1, index: 1 });
    await answerNext(a.id);
    expect(await nextAssignmentQuestion(a)).toMatchObject({ topic: 'RD', level: 4, adaptive: false });
  });

  it('resume (R-SES-5): an unfinished attempt changes nothing; the same question comes back', async () => {
    const a = await add('PC:3', { order: 'mixed' });
    await answerNext(a.id);
    const before = await nextAssignmentQuestion(a);
    await db.attempts.put({ ...finished('PC', 1), finishedAt: undefined, assignmentId: a.id, itemIndex: 0 });
    expect(await nextAssignmentQuestion(a)).toEqual(before);
    expect((await assignmentProgress(a)).done).toEqual([1]);
  });

  it('after a walkthrough, the next question is the same item and level (R-HELP-6)', async () => {
    const a = await add('EQ:2,PC:2', { order: 'mixed', seed: 1 });
    const { q } = await answerNext(a.id, { maxHint: 3, clean: false });
    expect(await nextAssignmentQuestion(a)).toMatchObject({ itemIndex: q.itemIndex, level: q.level });
  });
});

describe('finishAttempt', () => {
  it('adds the stars as shells, once (a second call is a no-op) (R-RWD-1/4)', async () => {
    const at = finished('EQ', 2); // EQ starts at 2: full stars = 2 × 2 = 4
    expect(await finishAttempt(at, ADAPTIVE)).toMatchObject({
      stars: 4,
      quality: 'full',
      shells: 4,
      shellsEarned: 4,
      badges: ['first-solve'],
    });
    expect(await finishAttempt(at, ADAPTIVE)).toMatchObject({ stars: 4, shells: 4, badges: [] });
    expect((await db.rewards.get('default'))?.shells).toBe(4);
    expect(await db.attempts.get(at.id)).toMatchObject({ stars: 4, shellsEarned: 4 });
  });

  it('hints and mistakes cost stars; the walkthrough pays 0 (R-RWD-1, R-HELP-6)', async () => {
    // EQ level 2: 4 ★. One wrong try: 4 − 2 = 2. Hint 1 only: 4 − 1 = 3.
    expect(await finishAttempt(finished('EQ', 2, { clean: false, wrongTries: 1 }), ADAPTIVE)).toMatchObject({
      stars: 2,
      quality: 'some',
    });
    expect(await finishAttempt(finished('EQ', 2, { maxHint: 1 }), ADAPTIVE)).toMatchObject({
      stars: 3,
      quality: 'some',
    });
    expect(await finishAttempt(finished('EQ', 2, { clean: false, maxHint: 3 }), ADAPTIVE)).toMatchObject({
      stars: 0,
      quality: 'none',
      shellsEarned: 0,
    });
    expect((await db.rewards.get('default'))?.shells).toBe(5);
  });

  it('no below-level rule: every level pays 2 × level, whatever the stored level (R-RWD-1)', async () => {
    await db.topicStates.put({ profileId: 'default', topic: 'PC', level: 4, window: [] });
    const pay = { adaptive: false, rewarded: true };
    for (const [level, stars] of [
      [4, 8],
      [3, 6],
      [2, 4],
      [1, 2],
    ] as const) {
      const e = await finishAttempt(finished('PC', level), pay);
      expect(e).toMatchObject({ stars, quality: 'full', shellsEarned: stars });
      expect(e).not.toHaveProperty('capped');
    }
  });

  it('Challenge: hint 2 and a mistake leave 3 of 8; never below 0 (R-RWD-1)', async () => {
    const pay = { adaptive: false, rewarded: true };
    // 8 − 1 − 2 − 2 = 3
    expect(
      await finishAttempt(finished('EQ', 4, { clean: false, maxHint: 2, wrongTries: 1 }), pay),
    ).toMatchObject({ stars: 3, quality: 'some' });
    // 8 − 3 − 6 < 0 → 0
    expect(
      await finishAttempt(finished('EQ', 4, { clean: false, maxHint: 2, wrongTries: 3 }), pay),
    ).toMatchObject({ stars: 0, quality: 'none' });
  });

  it('free practice stores no level of its own for stars (R-ADP-7, R-RWD-1)', async () => {
    expect(await finishAttempt(finished('RD', 3), { adaptive: false, rewarded: true })).toMatchObject({
      stars: 6,
    });
    expect(await db.topicStates.toArray()).toEqual([]);
    expect(await topicLevel('RD')).toBe(1); // assignments keep their own level (R-ADP-7)
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
      events.push(await finishAttempt(finished('EQ', 2, { maxHint: 3, clean: false }), ADAPTIVE));
    expect(await topicLevel('EQ')).toBe(1);
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
    // Stars as usual (PC level 1: 2 ★), no shells.
    expect(e).toEqual({ stars: 2, quality: 'full', shells: 0, badges: [] });
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
      got.push(...(await finishAttempt(finished('EQ', 3, { clean: false, wrongTries: 1 }), ADAPTIVE)).badges);
    expect(got).toEqual(['first-solve', 'eq-no-walkthrough']);
  });
});

describe('assignment completion (R-SES-2, R-SES-7)', () => {
  it('finishing the last question completes it, activates the next, and reports it', async () => {
    const a = await add('PC:1,RD:1', { title: 'Test' });
    const b = await add('EQ:1');
    expect((await homeSnapshot()).freeOpen).toBe(true); // `always`, the default (R-SES-6, parent decision)
    await saveSettings({ freePractice: 'afterAssignment' });
    expect((await homeSnapshot()).freeOpen).toBe(false);
    const first = await answerNext(a.id, { clean: false, wrongTries: 1 });
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
      stars: 2, // PC level 1 on the second try: 2 − 2 = 0; RD level 1 first try: 2
      shells: 2,
      byTopic: [
        { topic: 'PC', stars: 0, questions: 1 },
        { topic: 'RD', stars: 2, questions: 1 },
      ],
    });
    expect(s?.badges).toContain('first-solve');
    expect(s?.badges).not.toContain('perfect-assignment');
  });

  it('first perfect assignment, then free practice opens (R-RWD-3, R-SES-6)', async () => {
    const a = await add('NC:2');
    await answerNext(a.id);
    const { events } = await answerNext(a.id);
    expect(events.badges).toContain('perfect-assignment');
    expect(await homeSnapshot()).toMatchObject({ freeOpen: true, shells: 4 }); // NC level 1: 2 ★ each
  });
});

describe('streak (R-RWD-2)', () => {
  it('grows by day with assignment answers, breaks on a missed assignment day, milestone at 3', async () => {
    const a = await add('PC:20');
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
