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

describe('stars (R-RWD-1, M7)', () => {
  it('full stars by level: 1, 2, 4, 6, 8', () => {
    expect([1, 2, 3, 4, 5].map(fullStars)).toEqual([1, 2, 4, 6, 8]);
  });

  it.each([
    // [paysAs, currentLevel, wrongTries, maxHint, stars]: an EQ L6 review question
    [3, undefined, 0, 0, 4], // reviews level 3: full = 4
    [4, undefined, 0, 1, 6], // reviews level 4, H1: 6
    [5, undefined, 0, 0, 8], // reviews level 5: 8
    [5, undefined, 1, 0, 1], // second try: 1
    [5, undefined, 0, 3, 0], // walkthrough: 0
    [3, 6, 0, 0, 4], // at current level 6: the below-level rule compares 6, not 3
    [3, 7, 0, 0, 1], // hypothetically one below: at most 1
  ] as const)(
    'EQ L6 pays as level %s (current %s, %i wrong, H%i) → %i ★',
    (paysAs, currentLevel, wrongTries, maxHint, stars) => {
      expect(
        starsFor({ level: 6, paysAs, wrongTries, maxHint, ...(currentLevel ? { currentLevel } : {}) }),
      ).toBe(stars);
    },
  );

  // rows: wrongTries 0…3; columns: maxHint 0…3. F = full, 1 = one star, 0 = none.
  const quality = [
    ['full', 'full', 'one', 'none'],
    ['one', 'one', 'one', 'none'],
    ['none', 'none', 'none', 'none'],
    ['none', 'none', 'none', 'none'],
  ] as const;
  for (let wrongTries = 0; wrongTries <= 3; wrongTries++)
    for (let maxHint = 0; maxHint <= 3; maxHint++) {
      const q = quality[wrongTries]![maxHint]!;
      it(`${wrongTries} wrong tries, H${maxHint} → ${q}`, () => {
        expect(answerQuality({ wrongTries, maxHint })).toBe(q);
        for (let level = 1; level <= 5; level++)
          expect(starsFor({ level, wrongTries, maxHint })).toBe(
            q === 'full' ? fullStars(level) : q === 'one' ? 1 : 0,
          );
      });
    }

  it.each([
    // [level, currentLevel, locked, wrongTries, maxHint, stars]
    [4, 4, false, 0, 0, 6], // at the current level: full
    [5, 4, false, 0, 0, 8], // above it: full for that level
    [3, 4, false, 0, 0, 1], // one below: at most 1
    [3, 4, false, 1, 0, 1], // one below, second try: 1
    [3, 4, false, 2, 0, 0], // one below, third try: 0
    [2, 4, false, 0, 0, 0], // two below: 0
    [1, 4, false, 0, 0, 0],
    [2, 4, true, 0, 0, 2], // a parent's level lock pays normally
    [4, 4, false, 0, 3, 0], // walkthrough: 0
    [4, 4, false, 0, 1, 6], // H1 still full
    [4, 4, false, 0, 2, 1], // H2: 1
  ])(
    'level %i, current %i, locked %s, %i wrong, H%i → %i ★',
    (level, currentLevel, locked, wrongTries, maxHint, stars) => {
      expect(starsFor({ level, currentLevel, locked, wrongTries, maxHint })).toBe(stars);
    },
  );

  it('fixed-level links (no current level) skip the below-level rule', () => {
    expect(starsFor({ level: 1, wrongTries: 0, maxHint: 0 })).toBe(1);
  });

  it('blind guessing at level 5 pays less than honest first tries at level 2', () => {
    // 5 options: right on the first try 1 in 5, on the second 1 in 5; after that 0.
    const guess =
      0.2 * starsFor({ level: 5, wrongTries: 0, maxHint: 0 }) +
      0.2 * starsFor({ level: 5, wrongTries: 1, maxHint: 0 });
    expect(guess).toBeLessThan(starsFor({ level: 2, wrongTries: 0, maxHint: 0 }));
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
  const levels = { NC: 1, RD: 1, FDP: 1, PC: 1, EQ: 3 };
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
    expect(earned({ levels: { ...levels, EQ: 6 } })).toEqual(['max-level-EQ']);
    expect(earned({ levels: { ...levels, NC: 5, PC: 5 } })).toEqual(['max-level-NC', 'max-level-PC']);
    expect(earned({ levels: { ...levels, EQ: 5 } })).toEqual([]);
  });

  it('never twice', () => {
    const all: BadgeFacts = {
      have: [],
      attempt: { topic: 'PC', maxHint: 0, params: { kind: 'successive' } },
      eqRun: 10,
      streak: 30,
      levels: { NC: 5, RD: 5, FDP: 5, PC: 5, EQ: 6 },
      assignmentDone: { perfect: true },
    };
    const first = newBadges(all);
    expect(newBadges({ ...all, have: first })).toEqual([]);
  });
});
