// R-RWD-1 stars, R-RWD-2 streaks, R-RWD-3 badges.
import { describe, expect, it } from 'vitest';
import {
  answerQuality,
  BADGE_IDS,
  fullStars,
  currentStreak,
  dayNumber,
  eqRunWithoutWalkthrough,
  hadActiveAssignment,
  isStreakMilestone,
  newBadges,
  starsFor,
  updateStreak,
  type ActiveInterval,
  type BadgeFacts,
} from '../../src/engine/scoring';

describe('stars (R-RWD-1, parent decision 2026-10-11)', () => {
  it('full stars: 2 × level, so 2, 4, 6, 8', () => {
    expect([1, 2, 3, 4].map(fullStars)).toEqual([2, 4, 6, 8]);
  });

  // Every level × wrong tries 0…4 × hint tier 0…3. Expected values are written out by hand from the
  // rule: 2 × level, −1 for hint 1, −2 more for hint 2, −2 per wrong try, never below 0; H3 → 0.
  const table: Record<number, number[][]> = {
    // rows: wrongTries 0…4; columns: maxHint 0, 1, 2, 3
    1: [
      [2, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    2: [
      [4, 3, 1, 0],
      [2, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    3: [
      [6, 5, 3, 0],
      [4, 3, 1, 0],
      [2, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    4: [
      [8, 7, 5, 0],
      [6, 5, 3, 0],
      [4, 3, 1, 0],
      [2, 1, 0, 0],
      [0, 0, 0, 0],
    ],
  };
  for (const level of [1, 2, 3, 4])
    table[level]!.forEach((row, wrongTries) =>
      row.forEach((stars, maxHint) => {
        const q = stars === 0 ? 'none' : stars === 2 * level ? 'full' : 'some';
        it(`level ${level}, ${wrongTries} wrong, H${maxHint} → ${stars} ★ (${q})`, () => {
          expect(starsFor({ level, wrongTries, maxHint })).toBe(stars);
          expect(answerQuality({ level, wrongTries, maxHint })).toBe(q);
        });
      }),
    );

  it('the examples the parent gave', () => {
    expect(starsFor({ level: 2, wrongTries: 0, maxHint: 0 })).toBe(4);
    expect(starsFor({ level: 4, wrongTries: 0, maxHint: 0 })).toBe(8);
    // Two hints and then right: 3 stars lost.
    expect(starsFor({ level: 4, wrongTries: 0, maxHint: 2 })).toBe(8 - 3);
  });

  it('never negative, for any level, tries and hints', () => {
    for (let level = 1; level <= 4; level++)
      for (let wrongTries = 0; wrongTries <= 20; wrongTries++)
        for (let maxHint = 0; maxHint <= 3; maxHint++)
          expect(starsFor({ level, wrongTries, maxHint })).toBeGreaterThanOrEqual(0);
  });

  it('blind guessing at the Challenge level pays no more than an honest first try at level 2', () => {
    // 5 options, each equally likely to be right on try 1…5. Sum over the 5 cases (exact integers)
    // against 5 × the honest stars: guessing 20 vs level 2 honest 20, level 3 honest 30.
    const guessTotal = [0, 1, 2, 3, 4].reduce(
      (sum, w) => sum + starsFor({ level: 4, wrongTries: w, maxHint: 0 }),
      0,
    );
    expect(guessTotal).toBe(8 + 6 + 4 + 2 + 0);
    expect(guessTotal).toBeLessThanOrEqual(5 * starsFor({ level: 2, wrongTries: 0, maxHint: 0 }));
    expect(guessTotal).toBeLessThan(5 * starsFor({ level: 3, wrongTries: 0, maxHint: 0 }));
  });
});

describe('streak (R-RWD-2)', () => {
  const always: ActiveInterval[] = [{ from: '2026-01-01' }];
  const none: ActiveInterval[] = [];

  it('dayNumber counts calendar days across month and year ends', () => {
    expect(dayNumber('2026-03-01') - dayNumber('2026-02-28')).toBe(1);
    expect(dayNumber('2027-01-01') - dayNumber('2026-12-31')).toBe(1);
    expect(dayNumber('2028-03-01') - dayNumber('2028-02-28')).toBe(2); // leap year
  });

  const table: [
    string,
    { streak: number; lastStreakDate?: string },
    string,
    ActiveInterval[],
    number,
    boolean,
  ][] = [
    ['first ever answer → 1', { streak: 0 }, '2026-09-23', always, 1, true],
    ['same day → unchanged', { streak: 4, lastStreakDate: '2026-09-23' }, '2026-09-23', always, 4, false],
    ['next day → +1', { streak: 4, lastStreakDate: '2026-09-22' }, '2026-09-23', always, 5, true],
    [
      'a missed day with an active assignment → 1',
      { streak: 4, lastStreakDate: '2026-09-21' },
      '2026-09-23',
      always,
      1,
      true,
    ],
    [
      'missed days without an active assignment → +1',
      { streak: 4, lastStreakDate: '2026-09-18' },
      '2026-09-23',
      none,
      5,
      true,
    ],
    [
      'gap covered only partly by an assignment → 1',
      { streak: 4, lastStreakDate: '2026-09-18' },
      '2026-09-23',
      [{ from: '2026-09-10', to: '2026-09-19' }, { from: '2026-09-23' }],
      1,
      true,
    ],
    [
      'the assignment ended the day before the gap began → +1',
      { streak: 4, lastStreakDate: '2026-09-18' },
      '2026-09-23',
      [{ from: '2026-09-10', to: '2026-09-18' }, { from: '2026-09-23' }],
      5,
      true,
    ],
    [
      'a clock set back doesn’t change it',
      { streak: 4, lastStreakDate: '2026-09-23' },
      '2026-09-20',
      always,
      4,
      false,
    ],
  ];
  it.each(table)('%s', (_n, s, today, intervals, streak, extended) => {
    const r = updateStreak(s, today, intervals);
    expect(r.streak).toBe(streak);
    expect(r.extended).toBe(extended);
    if (extended) expect(r.lastStreakDate).toBe(today);
  });

  it('hadActiveAssignment: inclusive on both ends, open-ended while active', () => {
    const i = [{ from: '2026-09-10', to: '2026-09-12' }];
    expect(
      ['2026-09-09', '2026-09-10', '2026-09-12', '2026-09-13'].map((d) => hadActiveAssignment(d, i)),
    ).toEqual([false, true, true, false]);
    expect(hadActiveAssignment('2030-01-01', always)).toBe(true);
  });

  it('currentStreak: kept today and tomorrow, 0 after a missed assignment day, kept over free days', () => {
    const s = { streak: 6, lastStreakDate: '2026-09-22' };
    expect(currentStreak(s, '2026-09-22', always)).toBe(6);
    expect(currentStreak(s, '2026-09-23', always)).toBe(6);
    expect(currentStreak(s, '2026-09-24', always)).toBe(0);
    expect(currentStreak(s, '2026-09-30', none)).toBe(6);
    expect(currentStreak({ streak: 0 }, '2026-09-30', always)).toBe(0);
  });

  it('milestones: the list, then every 10', () => {
    const hits = Array.from({ length: 60 }, (_, i) => i + 1).filter(isStreakMilestone);
    expect(hits).toEqual([3, 5, 7, 10, 14, 21, 30, 40, 50, 60]);
  });
});

describe('badges (R-RWD-3)', () => {
  const levels = { NC: 1, RD: 1, FDP: 1, PC: 1, EQ: 2 };
  const base: BadgeFacts = {
    have: [],
    attempt: { topic: 'NC', maxHint: 0, params: {} },
    eqRun: 0,
    streak: 0,
    levels,
  };
  const earned = (f: Partial<BadgeFacts>) => newBadges({ ...base, have: ['first-solve'], ...f });

  it('there are 12 badges', () => {
    expect(BADGE_IDS).toHaveLength(12);
    expect(new Set(BADGE_IDS).size).toBe(12);
  });

  it('first question solved', () => {
    expect(newBadges(base)).toEqual(['first-solve']);
    expect(earned({})).toEqual([]);
  });

  it('first perfect assignment, only when every answer was clean', () => {
    expect(earned({ assignmentDone: { perfect: true } })).toEqual(['perfect-assignment']);
    expect(earned({ assignmentDone: { perfect: false } })).toEqual([]);
  });

  it('10 EQ questions in a row without H3; one walkthrough resets the run', () => {
    expect(eqRunWithoutWalkthrough([0, 1, 2, 0, 0, 1, 0, 2, 0, 1])).toBe(10);
    expect(eqRunWithoutWalkthrough([0, 0, 0, 3, 0, 0])).toBe(2);
    expect(eqRunWithoutWalkthrough([])).toBe(0);
    expect(earned({ eqRun: 9 })).toEqual([]);
    expect(earned({ eqRun: 10 })).toEqual(['eq-no-walkthrough']);
  });

  it('first delayed repeating decimal: D→F delayed or F→D with a delayed answer', () => {
    expect(earned({ attempt: { topic: 'RD', maxHint: 0, params: { shape: 'delayed' } } })).toEqual([
      'first-delayed-rd',
    ]);
    expect(earned({ attempt: { topic: 'RD', maxHint: 3, params: { shape: 'f2dB' } } })).toEqual([
      'first-delayed-rd',
    ]);
    expect(earned({ attempt: { topic: 'RD', maxHint: 0, params: { shape: 'whole' } } })).toEqual([]);
    expect(earned({ attempt: { topic: 'FDP', maxHint: 0, params: { shape: 'delayed' } } })).toEqual([]);
  });

  it('the Challenge reverse of two changes also counts as a successive-change problem', () => {
    expect(earned({ attempt: { topic: 'PC', maxHint: 0, params: { kind: 'reverseSuccessive' } } })).toEqual([
      'first-successive-pc',
    ]);
    expect(earned({ attempt: { topic: 'PC', maxHint: 0, params: { kind: 'reverse' } } })).toEqual([]);
  });

  it('first successive-change problem', () => {
    expect(earned({ attempt: { topic: 'PC', maxHint: 0, params: { kind: 'successive' } } })).toEqual([
      'first-successive-pc',
    ]);
    expect(earned({ attempt: { topic: 'PC', maxHint: 0, params: { kind: 'reverse' } } })).toEqual([]);
  });

  it('7-day and 30-day streaks', () => {
    expect(earned({ streak: 6 })).toEqual([]);
    expect(earned({ streak: 7 })).toEqual(['streak-7']);
    expect(earned({ streak: 30, have: ['first-solve', 'streak-7'] })).toEqual(['streak-30']);
  });

  it("each topic's max level", () => {
    expect(earned({ levels: { ...levels, EQ: 4 } })).toEqual(['max-level-EQ']);
    expect(earned({ levels: { ...levels, NC: 4, PC: 4 } })).toEqual(['max-level-NC', 'max-level-PC']);
    expect(earned({ levels: { ...levels, EQ: 3 } })).toEqual([]);
  });

  it('never twice', () => {
    const all: BadgeFacts = {
      have: [],
      attempt: { topic: 'PC', maxHint: 0, params: { kind: 'successive' } },
      eqRun: 10,
      streak: 30,
      levels: { NC: 4, RD: 4, FDP: 4, PC: 4, EQ: 4 },
      assignmentDone: { perfect: true },
    };
    const first = newBadges(all);
    expect(newBadges({ ...all, have: first })).toEqual([]);
  });
});
