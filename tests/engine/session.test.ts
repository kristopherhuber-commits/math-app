// R-SES-1…5, R-HELP-6: the assignment link, question order, and resume.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  itemProgress,
  nextSlot,
  parseAssignmentLink,
  questionSeed,
  type AssignmentItem,
  type Order,
} from '../../src/engine/session';

describe('parseAssignmentLink (R-SES-1)', () => {
  it('reads items, level locks, order, title, due date and seed', () => {
    expect(
      parseAssignmentLink({
        assign: 'EQ:10,pc:5@2',
        order: 'mixed',
        title: ' Monday practice ',
        due: '2026-09-30',
        seed: '7',
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

  it('only items are required', () => {
    expect(parseAssignmentLink({ assign: 'RD:3' })).toEqual({ items: [{ topic: 'RD', count: 3 }] });
  });

  it.each([
    [{}],
    [{ assign: '' }],
    [{ assign: 'XY:3' }],
    [{ assign: 'EQ:0' }],
    [{ assign: 'EQ:101' }],
    [{ assign: 'EQ:3@7' }],
    [{ assign: 'PC:3@6' }],
    [{ assign: 'EQ:3@0' }],
    [{ assign: 'EQ3' }],
    [{ assign: 'EQ:3,,PC:2' }],
    [{ assign: 'EQ:3', order: 'random' }],
    [{ assign: 'EQ:3', due: 'tomorrow' }],
    [{ assign: 'EQ:3', seed: '-1' }],
  ])('rejects %o', (q) => {
    expect(parseAssignmentLink(q)).toBeNull();
  });

  it('shortens a long title', () => {
    expect(parseAssignmentLink({ assign: 'EQ:1', title: 'x'.repeat(80) })?.title).toHaveLength(60);
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
