// R-RWD-1 stars, R-RWD-2 streaks, R-RWD-3 badges.
import { describe, expect, it } from 'vitest';
import {
  BADGE_IDS,
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

describe('starsFor (R-RWD-1)', () => {
  // rows: wrongTries 0…3; columns: maxHint 0…3
  const expected = [
    [3, 2, 1, 1],
    [2, 2, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ];
  for (let wrongTries = 0; wrongTries <= 3; wrongTries++)
    for (let maxHint = 0; maxHint <= 3; maxHint++)
      it(`${wrongTries} wrong tries, H${maxHint} → ${expected[wrongTries]![maxHint]} ★`, () => {
        expect(starsFor({ wrongTries, maxHint })).toBe(expected[wrongTries]![maxHint]);
      });

  it('never 0 stars', () => {
    for (let w = 0; w < 10; w++)
      for (let h = 0; h <= 3; h++) expect(starsFor({ wrongTries: w, maxHint: h })).toBeGreaterThan(0);
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

  it('first perfect assignment, only when it is all 3 ★', () => {
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
