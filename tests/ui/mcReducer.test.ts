// Multiple-choice and select-all flows (R-HELP-1…6, R-NC-2/3, R-ANS-1), without a browser.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mcReducer, startMc, type McState } from '../../src/ui/practice/mcReducer';
import { ncReducer, startNc } from '../../src/ui/practice/ncReducer';
import { CORRECT } from '../../src/engine/topics/mc';
import { NC_SETS, ncMembership } from '../../src/engine/topics/nc/checker';

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
    ['second try', 1, false, 2],
    ['H1 only', 0, true, 2],
    ['second try with H1', 1, true, 2],
    ['third try (H1 opened by the second wrong)', 2, false, 1],
  ] as const)('stars on solve: %s → %i ★ (R-RWD-1)', (_n, wrong, h1, stars) => {
    let s = startMc('PC', 2, 5);
    if (h1) s = mcReducer(s, { type: 'help' });
    for (const id of wrongIds(s).slice(0, wrong)) s = pick(s, id);
    s = pick(s, rightId(s));
    expect(s.attempt).toMatchObject({ stars, wrongTries: wrong });
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

  it('correct first time is a clean solve with 3 stars (R-ADP-1, R-RWD-1)', () => {
    let s = startMc('PC', 1, 3);
    s = pick(s, rightId(s));
    expect(s.solved).toBe(true);
    expect(s.attempt.clean).toBe(true);
    expect(s.attempt.tries).toEqual([expect.objectContaining({ verdict: 'correct' })]);
    expect(s.attempt).toMatchObject({ stars: 3, wrongTries: 0 });
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

describe('select-all (NC)', () => {
  const answer = (level: number, seed: number) => {
    const s = startNc(level, seed);
    const m = ncMembership(s.question.value, false);
    return { s, right: NC_SETS.filter((x) => m[x]) };
  };
  const tick = (s: ReturnType<typeof startNc>, sets: readonly string[]) =>
    sets.reduce((acc, set) => ncReducer(acc, { type: 'toggle', set: set as never }), s);

  it('exactly the right boxes solve it; nothing is ticked for the learner (R-NC-2/4)', () => {
    const { s, right } = answer(3, 5);
    expect(s.ticked).toEqual([]);
    const done = ncReducer(tick(s, right), { type: 'check' });
    expect(done.solved).toBe(true);
  });

  it('second wrong outlines the mismatched boxes, without direction (R-NC-3)', () => {
    const { s, right } = answer(3, 5);
    // Level 3 numbers are rational, so Irrational alone misses every right box and adds one.
    let t = ncReducer(tick(s, ['irrational']), { type: 'check' });
    expect(t.flagged).toEqual([]); // first wrong: "Not quite" only
    expect(t.feedback).not.toBeNull();
    t = ncReducer(t, { type: 'check' });
    expect(t.flagged.sort()).toEqual([...right, 'irrational'].sort());
    expect(t.hintOpen).toBe(true);
    // Toggling a flagged box clears its outline.
    t = ncReducer(t, { type: 'toggle', set: t.flagged[0]! });
    expect(t.flagged).toHaveLength(right.length);
  });

  it('the natural-numbers setting changes the answer for 0 (§6.1)', () => {
    let s = startNc(1, 0);
    // Find a seed whose number is 0.
    for (let seed = 0; seed < 500 && !(s.question.form === 'zero'); seed++) s = startNc(1, seed);
    expect(s.question.form).toBe('zero');
    const withZero = ncReducer(s, { type: 'naturalIncludesZero', value: true });
    const ticked = tick(withZero, ['natural', 'whole', 'integer', 'rational']);
    expect(ncReducer(ticked, { type: 'check' }).solved).toBe(true);
    const ticked2 = tick(s, ['natural', 'whole', 'integer', 'rational']);
    expect(ncReducer(ticked2, { type: 'check' }).solved).toBe(false);
  });
});
