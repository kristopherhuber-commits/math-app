// R-TEST-4: table-driven promote / demote / window-reset tests (R-ADP-1…5).
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  adapt,
  freeAdapt,
  freeStart,
  rightFirstTime,
  type FreeState,
  clampLevel,
  initialState,
  summarize,
  type AdaptiveState,
  type AttemptSummary,
  type LevelBounds,
} from '../../src/engine/adaptive';

// One letter per attempt: C = clean, X = needed H3 or a second wrong answer, o = neither.
const att = (c: string, i: number): AttemptSummary => ({
  attemptId: `a${i}`,
  clean: c === 'C',
  needsDemote: c === 'X',
});
const seq = (s: string) => [...s].map(att);

/** Feed the attempts one by one from `level`; return the final state and every change. */
function run(level: number, attempts: string, bounds: LevelBounds = { min: 1, max: 5 }) {
  let state: AdaptiveState = { level, window: [] };
  const changes: string[] = [];
  for (const a of seq(attempts)) {
    const r = adapt(state, a, bounds);
    if (r.change) changes.push(`${r.change}@${r.level}`);
    state = { level: r.level, window: r.window };
  }
  return { ...state, changes };
}

describe('adapt (R-ADP-2…4)', () => {
  const table: [string, number, string, number, string[], number][] = [
    // name, start level, attempts, final level, changes, final window length
    ['promote at 4 of 5 clean with 5 attempts', 2, 'CCCoC', 3, ['promote@3'], 0],
    ['promote at 5 of 5 clean', 2, 'CCCCC', 3, ['promote@3'], 0],
    ['promote with the struggle first', 2, 'XCCCC', 3, ['promote@3'], 0],
    ['no promotion at 4 of 4 (needs 5 attempts)', 2, 'CCCC', 2, [], 4],
    ['no promotion at 3 of 5 clean', 2, 'CCoCo', 2, [], 5],
    ['sliding window: only the last 5 count', 2, 'CoCoCo', 2, [], 5],
    ['the 6th attempt pushes the X out and promotes', 2, 'XCCoCC', 3, ['promote@3'], 0],
    ['demote at 3 needing help out of 5', 3, 'XoXoX', 2, ['demote@2'], 0],
    ['demote after only 3 attempts', 3, 'XXX', 2, ['demote@2'], 0],
    ['no demotion at 2 of 5', 3, 'XooXo', 3, [], 5],
    ['a demotion needs the bad ones inside the last 5', 3, 'XXooooX', 3, [], 5],
    ['never below the minimum', 1, 'XXXXX', 1, [], 5],
    ['never above the maximum', 5, 'CCCCC', 5, [], 5],
    ['the window resets after a promotion', 2, 'CCCCCCCC', 3, ['promote@3'], 3],
    ['two promotions need two full windows', 1, 'CCCCCCCCCC', 3, ['promote@2', 'promote@3'], 0],
    ['the window resets after a demotion', 3, 'XXXCCCC', 2, ['demote@2'], 4],
    ['a clean 5th after a demotion window promotes back', 3, 'XXXCCCCC', 3, ['demote@2', 'promote@3'], 0],
  ];
  it.each(table)('%s', (_name, start, attempts, level, changes, windowLength) => {
    const r = run(start, attempts);
    expect(r.level).toBe(level);
    expect(r.changes).toEqual(changes);
    expect(r.window).toHaveLength(windowLength);
  });

  it('R-ADP-5: bounds limit both directions', () => {
    expect(run(2, 'CCCCC', { min: 1, max: 2 }).level).toBe(2);
    expect(run(3, 'XXX', { min: 3, max: 5 }).level).toBe(3);
    expect(run(3, 'CCCCC', { min: 3, max: 4 }).level).toBe(4);
  });

  it('bounds moved past the level: clamp, reset the window, skip the stale attempt', () => {
    const r = adapt({ level: 5, window: seq('CCC') }, att('C', 9), { min: 1, max: 3 });
    expect(r).toEqual({ level: 3, window: [], change: null });
    expect(adapt({ level: 1, window: [] }, att('X', 0), { min: 2, max: 5 })).toEqual({
      level: 2,
      window: [],
      change: null,
    });
  });

  it('property: the level stays within bounds and the window never exceeds 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.array(fc.constantFrom('C', 'X', 'o'), { maxLength: 60 }),
        (start, a, b, attempts) => {
          const bounds = { min: Math.min(a, b), max: Math.max(a, b) };
          const r = run(clampLevel(start, bounds), attempts.join(''), bounds);
          return r.level >= bounds.min && r.level <= bounds.max && r.window.length <= 5;
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe('summarize (R-ADP-1, R-ADP-3)', () => {
  it.each([
    [{ clean: true, maxHint: 0, wrongTries: 0 }, true, false],
    [{ clean: true, maxHint: 1, wrongTries: 0 }, true, false],
    [{ clean: false, maxHint: 2, wrongTries: 0 }, false, false],
    [{ clean: false, maxHint: 0, wrongTries: 1 }, false, false],
    [{ clean: false, maxHint: 1, wrongTries: 2 }, false, true],
    [{ clean: false, maxHint: 3, wrongTries: 0 }, false, true],
  ] as const)('%o → clean %s, needsDemote %s', (o, clean, needsDemote) => {
    expect(summarize('x', o)).toEqual({ attemptId: 'x', clean, needsDemote });
  });
});

describe('initialState', () => {
  it('EQ starts at level 3, the number topics at 1; bounds apply', () => {
    expect(initialState('EQ')).toEqual({ level: 3, window: [] });
    expect(initialState('PC')).toEqual({ level: 1, window: [] });
    expect(initialState('EQ', { min: 1, max: 2 }).level).toBe(2);
    expect(initialState('NC', { min: 2, max: 5 }).level).toBe(2);
  });
});

// Free practice, Adaptive (parent decision 2026-09-25): start at 3, up after 3 right in a row,
// down when 2 of the last 3 had a mistake or help.
describe('free-practice adaptive', () => {
  const B: LevelBounds = { min: 1, max: 5 };
  /** Run a sequence of right (R) / not right (x) answers from a state. */
  const run = (seq: string, from: FreeState = freeStart(B), bounds = B) => {
    const levels: number[] = [];
    let s = from;
    for (const c of seq) {
      s = freeAdapt(s, c === 'R', bounds);
      levels.push(s.level);
    }
    return { s, levels };
  };

  it('starts at level 3, within the bounds', () => {
    expect(freeStart(B)).toEqual({ level: 3, recent: [] });
    expect(freeStart({ min: 1, max: 2 }).level).toBe(2);
    expect(freeStart({ min: 4, max: 6 }).level).toBe(4);
  });

  it.each([
    ['RRR', [3, 3, 4]],
    ['RRRRRR', [3, 3, 4, 4, 4, 5]],
    ['xx', [3, 2]],
    ['xRx', [3, 3, 2]],
    ['RxR', [3, 3, 3]],
    ['RxRR', [3, 3, 3, 3]],
    ['RxRRR', [3, 3, 3, 3, 4]],
    ['xRRx', [3, 3, 3, 3]],
    ['RRxRR', [3, 3, 3, 3, 3]],
    ['xxxx', [3, 2, 2, 1]],
    ['RRRRRRRRRR', [3, 3, 4, 4, 4, 5, 5, 5, 5, 5]],
  ])('%s → levels %o', (seq, levels) => {
    expect(run(seq).levels).toEqual(levels);
  });

  it('a change starts a new window: one miss right after a promotion does not demote', () => {
    expect(run('RRRx').levels).toEqual([3, 3, 4, 4]);
    expect(run('xxRx').levels).toEqual([3, 2, 2, 2]);
  });

  it('right means first try with no hint at all (H1 counts as help)', () => {
    expect(rightFirstTime({ maxHint: 0, wrongTries: 0 })).toBe(true);
    expect(rightFirstTime({ maxHint: 1, wrongTries: 0 })).toBe(false);
    expect(rightFirstTime({ maxHint: 0, wrongTries: 1 })).toBe(false);
    expect(rightFirstTime({ maxHint: 3, wrongTries: 0 })).toBe(false);
  });

  it('property: the level stays in bounds, moves by at most one, and the window holds at most 3', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { maxLength: 60 }),
        fc.integer({ min: 1, max: 6 }),
        (answers, max) => {
          const bounds = { min: 1, max };
          let s = freeStart(bounds);
          for (const a of answers) {
            const next = freeAdapt(s, a, bounds);
            expect(Math.abs(next.level - s.level)).toBeLessThanOrEqual(1);
            expect(next.level).toBeGreaterThanOrEqual(1);
            expect(next.level).toBeLessThanOrEqual(max);
            expect(next.recent.length).toBeLessThanOrEqual(3);
            s = next;
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
