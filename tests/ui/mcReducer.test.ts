// Multiple-choice and number-set flows (R-HELP-1…6, R-NC-2/3, R-ANS-1), without a browser.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mcReducer, startMc, type McState } from '../../src/ui/practice/mcReducer';
import { ncReducer, startNc, type NcState } from '../../src/ui/practice/ncReducer';
import { CORRECT } from '../../src/engine/topics/mc';
import { innermostSet, NC_SETS } from '../../src/engine/topics/nc/checker';
import { answerQuality, starsFor } from '../../src/engine/scoring';
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
    // Level 2 pays 4: −2 per wrong try, −1 for hint 1.
    ['first try', 0, false, 4, 'full'],
    ['second try', 1, false, 2, 'some'],
    ['H1 only', 0, true, 3, 'some'],
    ['second try with H1', 1, true, 1, 'some'],
  ] as const)('how it was answered at level 2: %s → %i ★, %s (R-RWD-1)', (_n, wrong, h1, stars, quality) => {
    let s = startMc('PC', 2, 5);
    if (h1) s = mcReducer(s, { type: 'help' });
    for (const id of wrongIds(s).slice(0, wrong)) s = pick(s, id);
    expect(s.walk).toBeNull();
    s = pick(s, rightId(s));
    expect(s.solved).toBe(true);
    expect(s.attempt.wrongTries).toBe(wrong);
    const how = { level: 2, wrongTries: s.attempt.wrongTries!, maxHint: s.attempt.maxHint };
    expect(starsFor(how)).toBe(stars);
    expect(answerQuality(how)).toBe(quality);
  });

  it('a wrong try only pulses Help: no hint opens and no star is charged for one (R-HELP-2, R-RWD-1)', () => {
    let s = startMc('FDP', 4, 11);
    const [a, b] = wrongIds(s);
    s = pick(s, a!);
    expect([s.hintOpen, s.hintTier, s.helpPulse, s.attempt.maxHint]).toEqual([false, 0, false, 0]);
    s = pick(s, b!);
    expect([s.hintOpen, s.hintTier, s.helpPulse, s.attempt.maxHint]).toEqual([false, 0, true, 0]);
    // Asking opens hint 1, and only then is it charged.
    s = mcReducer(s, { type: 'help' });
    expect([s.hintOpen, s.hintTier, s.helpPulse, s.attempt.maxHint]).toEqual([true, 1, false, 1]);
  });

  it('after hint 2, a wrong try highlights the walkthrough without starting it while stars are left', () => {
    let s = startMc('FDP', 4, 11); // 8 ★
    s = mcReducer(mcReducer(s, { type: 'help' }), { type: 'moreHint' }); // 8 − 3 = 5
    const [a, b] = wrongIds(s);
    s = pick(pick(s, a!), b!); // 5 − 4 = 1
    expect(s.walkOffered).toBe(true);
    expect(s.walk).toBeNull();
    expect(s.attempt.maxHint).toBe(2);
  });

  it('level 1: one wrong try leaves 0 ★, so the walkthrough starts by itself (R-RWD-1)', () => {
    let s = startMc('RD', 1, 4);
    s = pick(s, wrongIds(s)[0]!);
    expect(s.walk).not.toBeNull();
    expect(s.attempt.maxHint).toBe(3);
    expect(s.solved).toBe(false);
    // Picking an answer no longer works; the walkthrough to its end finishes the question.
    expect(pick(s, rightId(s)).solved).toBe(false);
    for (let i = 0; i < s.walk!.steps.length; i++) s = mcReducer(s, { type: 'walkNext' });
    expect(s.solved).toBe(true);
    expect(starsFor({ level: 1, wrongTries: s.attempt.wrongTries!, maxHint: s.attempt.maxHint })).toBe(0);
  });

  it('level 1: hint 2 costs the last stars (2 − 1 − 2 < 0), so the walkthrough starts', () => {
    let s = mcReducer(startMc('FDP', 1, 9), { type: 'help' });
    expect(s.walk).toBeNull(); // 1 ★ left
    s = mcReducer(s, { type: 'moreHint' });
    expect(s.walk).not.toBeNull();
    expect(s.attempt.maxHint).toBe(3);
  });

  it('level 2: the walkthrough starts after the second wrong try, not the first', () => {
    let s = startMc('PC', 2, 8);
    const [a, b] = wrongIds(s);
    s = pick(s, a!);
    expect(s.walk).toBeNull();
    s = pick(s, b!);
    expect(s.walk).not.toBeNull();
    expect(s.wrongTries).toBe(2);
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

  it('any seed: the walkthrough starts at the level-th wrong try (2 × level ★, 2 each); before that the right answer solves it', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('RD', 'FDP', 'PC' as const),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 0, max: 0xffffffff }),
        (topic, level, seed) => {
          let s = startMc(topic, level, seed);
          for (const id of wrongIds(s).slice(0, level - 1)) s = pick(s, id);
          expect(s.walk).toBeNull();
          expect(pick(s, rightId(s)).solved).toBe(true);
          s = pick(s, wrongIds(s)[level - 1]!);
          expect(s.tried).toHaveLength(level);
          expect(s.walk).not.toBeNull();
          expect(s.solved).toBe(false);
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

  it('a set it is not in says so; the second wrong pulses Help but opens no hint (R-HELP-2)', () => {
    let t = choose(startNc(3, 5), 'irrational'); // level 3: 6 ★
    expect(t.feedback?.code).toBe('NC-NOT-IN');
    expect([t.hintOpen, t.helpPulse]).toEqual([false, false]);
    t = choose(t, 'rational');
    expect([t.hintOpen, t.hintTier, t.helpPulse, t.attempt.maxHint]).toEqual([false, 0, true, 0]);
    expect(t.walk).toBeNull(); // 2 ★ left
  });

  it('level 1: one not-quite card leaves 0 ★, so the walkthrough starts by itself (R-RWD-1)', () => {
    const s = startNc(1, 3);
    const other = NC_SETS.find((x) => x !== innermostSet(s.question.value))!;
    const t = choose(s, other);
    expect(t.walk).not.toBeNull();
    expect(t.attempt.maxHint).toBe(3);
    expect(t.attempt.tries.some((x) => x.verdict === 'wrong')).toBe(true);
  });

  it('0 is whole, not natural (parent decision 2026-09-27)', () => {
    let s = startNc(1, 0);
    for (let seed = 0; seed < 500 && s.question.form !== 'zero'; seed++) s = startNc(1, seed);
    expect(s.question.form).toBe('zero');
    // Level 1: the miss is recorded as not in the set; then the walkthrough shows the answer.
    const missed = choose(s, 'natural').attempt.tries.find((x) => x.verdict === 'wrong');
    expect(missed?.diagnostic).toBe('NC-NOT-IN');
    expect(choose(s, 'whole').solved).toBe(true);
  });

  it('any seed: the walkthrough starts at the level-th not-quite card; before that the smallest set solves it', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 0xffffffff }), (level, seed) => {
        let s = startNc(level, seed);
        const smallest = innermostSet(s.question.value);
        const others = NC_SETS.filter((x) => x !== smallest);
        for (const set of others.slice(0, level - 1)) s = choose(s, set);
        expect(s.walk).toBeNull();
        expect(choose(s, smallest).solved).toBe(true);
        s = choose(s, others[level - 1]!);
        expect(s.tried).toHaveLength(level);
        expect(s.walk).not.toBeNull();
        expect(s.solved).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});
