// R-SES-1…5, R-HELP-6, R-PAR-2: the builder's draft and edit rules, question order, and resume.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  cleanDraft,
  editAllowed,
  itemProgress,
  nextSlot,
  questionSeed,
  type AssignmentDraft,
  type AssignmentItem,
  type Order,
} from '../../src/engine/session';

const draft = (o: Partial<AssignmentDraft> = {}): AssignmentDraft => ({
  items: [{ topic: 'EQ', count: 10 }],
  order: 'grouped',
  ...o,
});

describe('cleanDraft (R-SES-1, R-PAR-2)', () => {
  it('keeps items, level locks, order, due date and seed; trims the title', () => {
    expect(
      cleanDraft({
        items: [
          { topic: 'EQ', count: 10 },
          { topic: 'PC', count: 5, levelLock: 2 },
        ],
        order: 'mixed',
        title: '  Monday   practice ',
        dueDate: '2026-09-30',
        seed: 7,
      }),
    ).toEqual({
      items: [
        { topic: 'EQ', count: 10 },
        { topic: 'PC', count: 5, levelLock: 2 },
      ],
      order: 'mixed',
      title: 'Monday practice',
      dueDate: '2026-09-30',
      seed: 7,
    });
  });

  it('drops an empty title and shortens a long one', () => {
    expect(cleanDraft(draft({ title: '   ' }))).toEqual(draft());
    expect(cleanDraft(draft({ title: 'x'.repeat(80) }))?.title).toHaveLength(60);
  });

  it.each([
    ['no items', draft({ items: [] })],
    ['an unknown topic', draft({ items: [{ topic: 'XY' as never, count: 3 }] })],
    ['a count of 0', draft({ items: [{ topic: 'EQ', count: 0 }] })],
    ['a count of 101', draft({ items: [{ topic: 'EQ', count: 101 }] })],
    ['a fractional count', draft({ items: [{ topic: 'EQ', count: 2.5 }] })],
    ['EQ locked at 7', draft({ items: [{ topic: 'EQ', count: 3, levelLock: 7 }] })],
    ['PC locked at 6', draft({ items: [{ topic: 'PC', count: 3, levelLock: 6 }] })],
    ['a lock of 0', draft({ items: [{ topic: 'EQ', count: 3, levelLock: 0 }] })],
    ['an unknown order', draft({ order: 'random' as never })],
    ['a due date in words', draft({ dueDate: 'tomorrow' })],
    ['31 February', draft({ dueDate: '2026-02-31' })],
  ])('rejects %s', (_, d) => {
    expect(cleanDraft(d)).toBeNull();
  });
});

describe('editAllowed (R-PAR-2)', () => {
  const before: AssignmentItem[] = [
    { topic: 'EQ', count: 5 },
    { topic: 'PC', count: 3, levelLock: 2 },
    { topic: 'RD', count: 2 },
  ];

  it('before any question is done, anything goes', () => {
    expect(editAllowed(before, [0, 0, 0], [{ topic: 'NC', count: 1 }])).toBe(true);
  });

  it('once started: counts change (not below what is done), new items append', () => {
    const done = [2, 0, 0];
    expect(editAllowed(before, done, [{ topic: 'EQ', count: 2 }, before[1]!, before[2]!])).toBe(true);
    expect(editAllowed(before, done, [...before, { topic: 'NC', count: 4 }])).toBe(true);
    // An item not started yet may change its level lock.
    expect(editAllowed(before, done, [before[0]!, { topic: 'PC', count: 3 }, before[2]!])).toBe(true);
  });

  it.each([
    ['below what is done', [{ topic: 'EQ', count: 1 }, before[1]!, before[2]!]],
    ['an item removed', [before[0]!, before[1]!]],
    ['items reordered', [before[1]!, before[0]!, before[2]!]],
    ['a topic changed', [{ topic: 'NC', count: 5 }, before[1]!, before[2]!]],
    ['a started item locked', [{ topic: 'EQ', count: 5, levelLock: 4 }, before[1]!, before[2]!]],
  ] as [string, AssignmentItem[]][])('once started, refuses %s', (_, after) => {
    expect(editAllowed(before, [2, 0, 0], after)).toBe(false);
  });
});

describe('questionSeed', () => {
  it('is deterministic and differs between questions', () => {
    expect(questionSeed(7, 3)).toBe(questionSeed(7, 3));
    const seeds = new Set(Array.from({ length: 200 }, (_, i) => questionSeed(7, i)));
    expect(seeds.size).toBe(200);
    expect(questionSeed(7, 0)).not.toBe(questionSeed(8, 0));
  });
});

describe('itemProgress', () => {
  it('counts finished attempts per item, capped at the count', () => {
    const items: AssignmentItem[] = [
      { topic: 'EQ', count: 2 },
      { topic: 'EQ', count: 3 },
    ];
    expect(itemProgress(items, [0, 1, 0, 0, 1, 9, -1])).toEqual([2, 2]);
  });
});

/** Play an assignment to the end, recording the item of each question. */
function play(items: AssignmentItem[], order: Order, seed: number, walkthroughAt: number[] = []) {
  const done = items.map(() => 0);
  const served: number[] = [];
  let last: { itemIndex: number; level: number; walkthrough: boolean } | undefined;
  for (;;) {
    const slot = nextSlot({ items, order, seed, done, ...(last ? { last } : {}) });
    if (!slot) break;
    expect(slot.index).toBe(served.length);
    expect(slot.seed).toBe(questionSeed(seed, slot.index));
    served.push(slot.itemIndex);
    done[slot.itemIndex]!++;
    last = { itemIndex: slot.itemIndex, level: 2, walkthrough: walkthroughAt.includes(slot.index) };
  }
  return served;
}

describe('nextSlot (R-SES-3/4, R-HELP-6)', () => {
  const items: AssignmentItem[] = [
    { topic: 'EQ', count: 3 },
    { topic: 'PC', count: 2 },
    { topic: 'RD', count: 2 },
  ];

  it('grouped: all of the first item, then the next', () => {
    expect(play(items, 'grouped', 1)).toEqual([0, 0, 0, 1, 1, 2, 2]);
  });

  it('mixed: interleaved, deterministic per seed', () => {
    const a = play(items, 'mixed', 42);
    expect(play(items, 'mixed', 42)).toEqual(a);
    expect(a).not.toEqual([0, 0, 0, 1, 1, 2, 2]);
  });

  it('property: mixed serves exactly each item’s count, for any seed', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 8 }), { minLength: 1, maxLength: 5 }),
        fc.nat(),
        (counts, seed) => {
          const its = counts.map((count) => ({ topic: 'EQ' as const, count }));
          const served = play(its, 'mixed', seed);
          return counts.every((c, i) => served.filter((x) => x === i).length === c);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('done: null', () => {
    expect(nextSlot({ items, order: 'grouped', seed: 1, done: [3, 2, 2] })).toBeNull();
  });

  it('after a walkthrough: same item and level while it has questions left', () => {
    const slot = nextSlot({
      items,
      order: 'mixed',
      seed: 5,
      done: [1, 0, 0],
      last: { itemIndex: 0, level: 4, walkthrough: true },
    });
    expect(slot).toMatchObject({ itemIndex: 0, level: 4, index: 1 });
  });

  it('after a walkthrough on an item that is finished: move on normally', () => {
    const slot = nextSlot({
      items,
      order: 'grouped',
      seed: 5,
      done: [3, 0, 0],
      last: { itemIndex: 0, level: 4, walkthrough: true },
    });
    expect(slot).toEqual({ itemIndex: 1, index: 3, seed: questionSeed(5, 3) });
  });

  it('mixed with walkthroughs still serves every count exactly', () => {
    const served = play(items, 'mixed', 9, [0, 1, 2, 4]);
    expect([0, 1, 2].map((i) => served.filter((x) => x === i).length)).toEqual([3, 2, 2]);
  });

  it('resume (R-SES-5): the same progress gives the same next question', () => {
    const input = { items, order: 'mixed' as const, seed: 11, done: [1, 1, 0] };
    expect(nextSlot(input)).toEqual(nextSlot({ ...input, done: [...input.done] }));
  });
});
