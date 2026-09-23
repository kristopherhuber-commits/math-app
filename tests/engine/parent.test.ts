// Parent area rules (requirements §9): the PIN-reset challenge (R-PAR-1), statistics (R-PAR-3), missed (R-PAR-4).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  attemptMinutes,
  checkChallenge,
  cleanTrend,
  dailyMinutes,
  isMissed,
  lastDays,
  observations,
  pinChallenge,
  topicStats,
  wrongTriesOf,
  type AttemptFacts,
} from '../../src/engine/parent';

describe('PIN-reset challenge (R-PAR-1)', () => {
  it('a 2-digit number times a teen, answer exact, same seed same challenge', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const c = pinChallenge(seed);
        expect(c.a).toBeGreaterThanOrEqual(21);
        expect(c.a).toBeLessThanOrEqual(99);
        expect(c.b).toBeGreaterThanOrEqual(11);
        expect(c.b).toBeLessThanOrEqual(19);
        // Independent check: repeated addition.
        let sum = 0;
        for (let i = 0; i < c.b; i++) sum += c.a;
        expect(c.answer).toBe(sum);
        expect(pinChallenge(seed)).toEqual(c);
      }),
      { numRuns: 1000 },
    );
  });

  it('accepts only the exact answer, digits with optional spaces', () => {
    const c = { a: 47, b: 13, answer: 611 };
    expect(checkChallenge(c, '611')).toBe(true);
    expect(checkChallenge(c, ' 6 11 ')).toBe(true);
    for (const t of ['610', '', '611.0', '-611', '6l1', '0611x']) expect(checkChallenge(c, t)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// R-PAR-3 statistics and the R-PAR-4 rule

const at = (o: Partial<AttemptFacts> = {}): AttemptFacts => ({
  topic: 'EQ',
  level: 3,
  startedAt: '2026-09-20T10:00:00.000Z',
  finishedAt: '2026-09-20T10:02:00.000Z',
  day: '2026-09-20',
  maxHint: 0,
  clean: true,
  wrongTries: 0,
  tries: [],
  ...o,
});

describe('missed questions (R-PAR-4)', () => {
  it.each([
    [{ maxHint: 2 as const }, true],
    [{ maxHint: 3 as const }, true],
    [{ wrongTries: 2 }, true],
    [{ maxHint: 1 as const, wrongTries: 1 }, false],
    [{}, false],
  ])('%o → %s', (o, missed) => {
    expect(isMissed(at(o))).toBe(missed);
  });

  it('older attempts without wrongTries count wrong answers, and 2 rejections as 1', () => {
    const t = (verdict: string) => ({ at: 'x', verdict });
    const old = (tries: { at: string; verdict: string }[]) => {
      const a = at({ tries });
      delete a.wrongTries;
      return a;
    };
    expect(wrongTriesOf(old([t('wrong'), t('wrong'), t('correct')]))).toBe(2);
    expect(wrongTriesOf(old([t('stepRejected'), t('stepRejected'), t('stepRejected')]))).toBe(1);
    expect(isMissed(old([t('stepRejected'), t('stepRejected'), t('stepRejected'), t('stepRejected')]))).toBe(
      true,
    );
  });
});

describe('dashboard statistics (R-PAR-3)', () => {
  it('per topic: questions, clean rate, hints by highest tier, average tries, capped minutes', () => {
    const list = [
      at(),
      at({ clean: false, maxHint: 1, wrongTries: 1 }),
      at({ clean: false, maxHint: 3, wrongTries: 2, finishedAt: '2026-09-20T11:00:00.000Z' }),
      at({ clean: false, maxHint: 2 }),
      at({ topic: 'PC' }),
      at({ finishedAt: undefined }),
      at({ fixed: true }),
    ];
    const s = topicStats(list, 'EQ');
    expect(s.attempts).toBe(4);
    expect(s.cleanRate).toBe(0.25);
    expect(s.hints).toEqual({ 1: 1, 2: 1, 3: 1 });
    expect(s.avgTries).toBe((1 + 2 + 3 + 1) / 4);
    // 2 + 2 + 10 (an hour, capped) + 2 minutes.
    expect(s.minutes).toBe(16);
    expect(topicStats(list, 'RD')).toEqual({
      topic: 'RD',
      attempts: 0,
      cleanRate: null,
      hints: { 1: 0, 2: 0, 3: 0 },
      avgTries: null,
      minutes: 0,
    });
  });

  it('minutes: a finish before the start, or no finish, counts 0', () => {
    expect(attemptMinutes(at({ finishedAt: '2026-09-20T09:00:00.000Z' }))).toBe(0);
    expect(attemptMinutes(at({ finishedAt: undefined }))).toBe(0);
    expect(attemptMinutes(at())).toBe(2);
  });

  it('the last n days, across month and year ends', () => {
    expect(lastDays('2026-03-02', 4)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(lastDays('2028-03-01', 2)).toEqual(['2028-02-29', '2028-03-01']);
    expect(lastDays('2027-01-01', 2)).toEqual(['2026-12-31', '2027-01-01']);
    expect(lastDays('2026-09-23', 30)).toHaveLength(30);
  });

  it('minutes per day and the clean trend, days without answers empty', () => {
    const days = ['2026-09-19', '2026-09-20', '2026-09-21'];
    const list = [at(), at({ clean: false }), at({ day: '2026-09-21' }), at({ day: '2026-08-01' })];
    expect(dailyMinutes(list, days)).toEqual([
      { day: '2026-09-19', minutes: 0 },
      { day: '2026-09-20', minutes: 4 },
      { day: '2026-09-21', minutes: 2 },
    ]);
    expect(cleanTrend(list, 'EQ', days).map((d) => d.rate)).toEqual([null, 0.5, 1]);
  });

  it('worth a look: H3 in at least half of the last 6 (needs 6)', () => {
    const series = (h3: number, n = 6) =>
      Array.from({ length: n }, (_, i) =>
        at({
          topic: 'PC',
          maxHint: i < h3 ? 3 : 0,
          finishedAt: `2026-09-20T10:${String(10 + i).padStart(2, '0')}:00.000Z`,
        }),
      );
    const now = '2026-09-21T00:00:00.000Z';
    expect(observations(series(3), now)).toEqual([{ kind: 'walkthroughs', topic: 'PC', n: 3, of: 6 }]);
    expect(observations(series(2), now)).toEqual([]);
    expect(observations(series(5, 5), now)).toEqual([]);
    // Only the last 6 count: 3 early walkthroughs then 6 clean.
    const older = series(3).map((a) => ({ ...a, finishedAt: a.finishedAt!.replace('T10', 'T09') }));
    expect(observations([...older, ...series(0)], now)).toEqual([]);
  });

  it('worth a look: an EQ diagnostic 5 times in 7 days', () => {
    const tries = (n: number, code: string, day: string) =>
      Array.from({ length: n }, () => ({
        at: `${day}T10:00:00.000Z`,
        verdict: 'stepRejected',
        diagnostic: code,
      }));
    const now = '2026-09-23T12:00:00.000Z';
    const list = [
      at({ tries: tries(3, 'EQ-D4', '2026-09-22') }),
      at({ tries: tries(2, 'EQ-D4', '2026-09-17') }),
      at({ tries: tries(4, 'EQ-D7', '2026-09-22') }),
      at({ tries: tries(9, 'EQ-D10', '2026-09-10') }),
      at({ fixed: true, tries: tries(9, 'EQ-D9', '2026-09-22') }),
    ];
    expect(observations(list, now)).toEqual([
      { kind: 'diagnostic', code: 'EQ-D4', n: 5, since: '2026-09-16T12:00:00.000Z' },
    ]);
  });
});
