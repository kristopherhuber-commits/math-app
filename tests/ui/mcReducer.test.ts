// Multiple-choice and number-set flows (R-HELP-1…6, R-NC-2/3, R-ANS-1), without a browser.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mcReducer, startMc, type McState } from '../../src/ui/practice/mcReducer';
import { ncReducer, startNc, type NcState } from '../../src/ui/practice/ncReducer';
import { CORRECT } from '../../src/engine/topics/mc';
import { innermostSet, NC_SETS } from '../../src/engine/topics/nc/checker';
import { answerQuality } from '../../src/engine/scoring';
import type { NcSet } from '../../src/engine/topics/walk';

const wrongIds = (s: McState) => s.question.options.filter((o) => o.code !== CORRECT).map((o) => o.id);
const rightId = (s: McState) => s.question.options.find((o) => o.code === CORRECT)!.id;
const pick = (s: McState, id: string) => mcReducer(mcReducer(s, { type: 'select', id }), { type: 'check' });

describe('multiple choice (RD, FDP, PC)', () => {
  it('first wrong: "Not quite" with the code, option greyed, no hint yet (R-HELP-1/1a)', () => {
    let s = startMc('RD', 3, 7);
    const [w] = wrongIds(s);
    s = pick(s, w!);
    expect(s.tried).toEqual([w]);
    expect(s.feedback?.code).toMatch(/^RD-/);
    expect(s.selected).toBeNull();
    expect(s.hintOpen).toBe(false);
    expect(s.attempt.tries.at(-1)).toMatchObject({ verdict: 'wrong', diagnostic: s.feedback!.code });
    // A greyed option can't be chosen again.
    expect(mcReducer(s, { type: 'select', id: w! }).selected).toBeNull();
  });

  it.each([
    ['second try', 1, false, 'one'],
    ['H1 only', 0, true, 'full'],
    ['second try with H1', 1, true, 'one'],
    ['third try (H1 opened by the second wrong)', 2, false, 'none'],
  ] as const)('how it was answered: %s → %s (R-RWD-1)', (_n, wrong, h1, quality) => {
    let s = startMc('PC', 2, 5);
    if (h1) s = mcReducer(s, { type: 'help' });
    for (const id of wrongIds(s).slice(0, wrong)) s = pick(s, id);
    s = pick(s, rightId(s));
    expect(s.attempt.wrongTries).toBe(wrong);
    expect(answerQuality({ wrongTries: s.attempt.wrongTries!, maxHint: s.attempt.maxHint })).toBe(quality);
  });

  it('second wrong opens H1 and pulses Help; later wrongs advance and offer the walkthrough (R-HELP-2)', () => {
    let s = startMc('FDP', 2, 11);
    const [a, b, c] = wrongIds(s);
    s = pick(pick(s, a!), b!);
    expect([s.hintOpen, s.hintTier, s.helpPulse]).toEqual([true, 1, true]);
    s = pick(s, c!);
    expect(s.hintTier).toBe(2);
    s = pick(
      s,
      wrongIds(s).find((id) => !s.tried.includes(id))!,
    );
    expect(s.walkOffered).toBe(true);
    expect(s.attempt.maxHint).toBe(2);
  });

  it('correct first time is a clean solve (R-ADP-1; full stars, R-RWD-1)', () => {
    let s = startMc('PC', 1, 3);
    s = pick(s, rightId(s));
    expect(s.solved).toBe(true);
    expect(s.attempt.clean).toBe(true);
    expect(s.attempt.tries).toEqual([expect.objectContaining({ verdict: 'correct' })]);
    expect(s.attempt).toMatchObject({ wrongTries: 0, maxHint: 0 });
  });

  it('Help any time, then the walkthrough to the end counts as done (R-HELP-3/6)', () => {
    let s = startMc('RD', 4, 21);
    s = mcReducer(s, { type: 'help' });
    expect(s.hintTier).toBe(1);
    s = mcReducer(s, { type: 'walkStart' });
    expect(s.walk!.steps.length).toBeGreaterThan(1);
    expect(s.attempt.maxHint).toBe(3);
    for (let i = 0; i < s.walk!.steps.length; i++) s = mcReducer(s, { type: 'walkNext' });
    expect(s.solved).toBe(true);
    expect(s.attempt.clean).toBe(false);
  });

  it('any seed: at most 4 wrong tries, then the right answer solves it', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('RD', 'FDP', 'PC' as const),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 0xffffffff }),
        (topic, level, seed) => {
          let s = startMc(topic, level, seed);
          for (const id of wrongIds(s)) s = pick(s, id);
          expect(s.solved).toBe(false);
          expect(s.tried).toHaveLength(4);
          s = pick(s, rightId(s));
          expect(s.solved).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('number sets: the smallest set only (NC, R-NC-2/3, M7)', () => {
  const choose = (s: NcState, set: NcSet) =>
    ncReducer(ncReducer(s, { type: 'select', set }), { type: 'check' });

  it('the smallest set solves it; nothing is chosen for the learner', () => {
    const s = startNc(3, 5);
    expect(s.selected).toBeNull();
    const done = choose(s, innermostSet(s.question.value));
    expect(done.solved).toBe(true);
    expect(done.attempt.tries).toEqual([expect.objectContaining({ verdict: 'correct' })]);
  });

  it('a larger set that contains it is not quite: greyed, with the "smaller one" line (R-NC-3)', () => {
    const s = startNc(3, 5); // level 3: a disguised integer
    const smallest = innermostSet(s.question.value);
    const t = choose(s, 'rational');
    expect(smallest).not.toBe('rational');
    expect(t.solved).toBe(false);
    expect(t.tried).toEqual(['rational']);
    expect(t.feedback?.code).toBe('NC-CONTAINS');
    expect(t.attempt.tries.at(-1)).toMatchObject({
      answer: 'rational',
      verdict: 'wrong',
      diagnostic: 'NC-CONTAINS',
    });
    // A greyed card can't be chosen again.
    expect(ncReducer(t, { type: 'select', set: 'rational' }).selected).toBeNull();
  });

  it('a set it is not in says so; the second wrong opens H1 (R-HELP-2)', () => {
    let t = choose(startNc(3, 5), 'irrational');
    expect(t.feedback?.code).toBe('NC-NOT-IN');
    expect(t.hintOpen).toBe(false);
    t = choose(t, 'rational');
    expect([t.hintOpen, t.hintTier]).toEqual([true, 1]);
  });

  it('0 is whole, not natural (parent decision 2026-09-27)', () => {
    let s = startNc(1, 0);
    for (let seed = 0; seed < 500 && s.question.form !== 'zero'; seed++) s = startNc(1, seed);
    expect(s.question.form).toBe('zero');
    expect(choose(s, 'natural').feedback?.code).toBe('NC-NOT-IN');
    expect(choose(s, 'whole').solved).toBe(true);
  });

  it('any seed: at most 4 not-quite cards, then the smallest set solves it', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 0, max: 0xffffffff }), (level, seed) => {
        let s = startNc(level, seed);
        const smallest = innermostSet(s.question.value);
        for (const set of NC_SETS.filter((x) => x !== smallest)) s = choose(s, set);
        expect(s.solved).toBe(false);
        expect(s.tried).toHaveLength(4);
        expect(choose(s, smallest).solved).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
