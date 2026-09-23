// R-TEST-3: every §7.5 acceptance example is a named test; every diagnostic has ≥ 2 positive
// and ≥ 2 negative cases.
import { describe, expect, it } from 'vitest';
import { checkStep, stageOf, type StepResult } from '../../src/engine/eq/stepChecker';
import { linearize } from '../../src/engine/eq/linear';
import { parseEquation } from '../../src/engine/eq/parse';

const M = '−';
/** Tests are written with ASCII '-'; convert to the true minus the keypad produces. */
const u = (s: string) => s.replace(/-/g, M);

function check(
  prev: string,
  next: string,
  opts: { level?: number; allowSkipping?: boolean } = {},
): StepResult {
  const variable = /[a-z]/.exec(prev)![0];
  return checkStep(u(prev), u(next), {
    variable,
    level: opts.level ?? 3,
    allowSkipping: opts.allowSkipping ?? false,
  });
}

const outcome = (r: StepResult): string =>
  r.accepted ? `${r.stepType}${r.solved ? '+solved' : ''}` : r.code;

describe('§7.5 acceptance examples', () => {
  describe('previous line 3a + 3 = a + 23', () => {
    const P = '3a + 3 = a + 23';
    it('3a − a = 23 − 3 → SEPARATE', () => expect(outcome(check(P, '3a - a = 23 - 3'))).toBe('SEPARATE'));
    it('a − 3a = 3 − 23 → SEPARATE (orientation)', () =>
      expect(outcome(check(P, 'a - 3a = 3 - 23'))).toBe('SEPARATE'));
    it('−a + 3a = −3 + 23 → SEPARATE (term order irrelevant)', () =>
      expect(outcome(check(P, '-a + 3a = -3 + 23'))).toBe('SEPARATE'));
    it('3a − a = 20 → SEPARATE (partial combine, R-EQ-CHK-2)', () => {
      const r = check(P, '3a - a = 20');
      expect(outcome(r)).toBe('SEPARATE');
      expect(r.accepted && r.label).toBe('movedPartial');
    });
    it('3a + a = 23 − 3 → EQ-D4 (sign of a)', () => {
      const r = check(P, '3a + a = 23 - 3');
      expect(outcome(r)).toBe('EQ-D4');
      expect(!r.accepted && r.params).toEqual({ term: 'a', from: 'right', op: 'subtract', amount: 'a' });
      expect(!r.accepted && r.span).toEqual({ start: 5, end: 6 });
    });
    it('3a − a = 23 + 3 → EQ-D4 (sign of 3)', () => {
      const r = check(P, '3a - a = 23 + 3');
      expect(outcome(r)).toBe('EQ-D4');
      expect(!r.accepted && r.params).toEqual({ term: '3', from: 'left', op: 'subtract', amount: '3' });
    });
    it('2a = 20 → skip rule (R-EQ-CHK-3)', () => expect(outcome(check(P, '2a = 20'))).toBe('R-EQ-CHK-3'));
    it('3a = a + 20 → EQ-D11 (equivalent, but not separated)', () =>
      expect(outcome(check(P, '3a = a + 20'))).toBe('EQ-D11'));
    it('6a + 6 = 2a + 46 → EQ-D6 (scaled)', () =>
      expect(outcome(check(P, '6a + 6 = 2a + 46'))).toBe('EQ-D6'));
  });

  describe('from 3a − a = 23 − 3', () => {
    const P = '3a - a = 23 - 3';
    it('2a = 20 → SIMPLIFY', () => expect(outcome(check(P, '2a = 20'))).toBe('SIMPLIFY'));
    it('2a = 26 → EQ-D7 (right side)', () => {
      const r = check(P, '2a = 26');
      expect(outcome(r)).toBe('EQ-D7');
      expect(!r.accepted && r.params.expression).toBe(u('23 - 3'));
    });
    it('4a = 20 → EQ-D7 (left side)', () => {
      const r = check(P, '4a = 20');
      expect(outcome(r)).toBe('EQ-D7');
      expect(!r.accepted && r.params.expression).toBe(u('3a - a'));
    });
  });

  describe('from 2a = 20', () => {
    const P = '2a = 20';
    it('a = 10 → SOLVE', () => expect(outcome(check(P, 'a = 10'))).toBe('SOLVE+solved'));
    it('10 = a → SOLVE', () => expect(outcome(check(P, '10 = a'))).toBe('SOLVE+solved'));
    it('a = 20/2 → R-EQ-CHK-5', () => {
      const r = check(P, 'a = 20/2');
      expect(outcome(r)).toBe('R-EQ-CHK-5');
      expect(!r.accepted && r.params.written).toBe('20/2');
    });
    it('a = 18 → EQ-D8', () => expect(outcome(check(P, 'a = 18'))).toBe('EQ-D8'));
  });

  describe('previous 7 − 3z = 13', () => {
    const P = '7 - 3z = 13';
    it('−3z = 13 − 7 → SEPARATE', () => expect(outcome(check(P, '-3z = 13 - 7'))).toBe('SEPARATE'));
    it('7 − 13 = 3z → SEPARATE', () => expect(outcome(check(P, '7 - 13 = 3z'))).toBe('SEPARATE'));
    it('3z = 13 − 7 → EQ-D4 (sign of 3z)', () => {
      const r = check(P, '3z = 13 - 7');
      expect(outcome(r)).toBe('EQ-D4');
      expect(!r.accepted && r.params.term).toBe('3z');
    });
    it('then −3z = 6 → SIMPLIFY', () => expect(outcome(check('-3z = 13 - 7', '-3z = 6'))).toBe('SIMPLIFY'));
    it('then z = −2 → SOLVE', () => expect(outcome(check('-3z = 6', 'z = -2'))).toBe('SOLVE+solved'));
  });

  describe('previous 3(y − 2) = y + 8', () => {
    const P = '3(y - 2) = y + 8';
    it('3y − 6 = y + 8 → EXPAND', () => expect(outcome(check(P, '3y - 6 = y + 8'))).toBe('EXPAND'));
    it('3y − 2 = y + 8 → EQ-D9', () => expect(outcome(check(P, '3y - 2 = y + 8'))).toBe('EQ-D9'));
    it('then 3y − y = 8 + 6 → SEPARATE', () =>
      expect(outcome(check('3y - 6 = y + 8', '3y - y = 8 + 6'))).toBe('SEPARATE'));
    it('then 2y = 14 → SIMPLIFY', () => expect(outcome(check('3y - y = 8 + 6', '2y = 14'))).toBe('SIMPLIFY'));
    it('then y = 7 → SOLVE', () => expect(outcome(check('2y = 14', 'y = 7'))).toBe('SOLVE+solved'));
  });

  describe('previous x/4 + 1 = 3', () => {
    const P = 'x/4 + 1 = 3';
    it('x + 4 = 12 → CLEAR_FRACTIONS', () => expect(outcome(check(P, 'x + 4 = 12'))).toBe('CLEAR_FRACTIONS'));
    it('x/4 = 3 − 1 → SEPARATE', () => expect(outcome(check(P, 'x/4 = 3 - 1'))).toBe('SEPARATE'));
    it('x/4 = 2 → SIMPLIFY', () => expect(outcome(check('x/4 = 3 - 1', 'x/4 = 2'))).toBe('SIMPLIFY'));
    it('x = 8 → SOLVE', () => expect(outcome(check('x/4 = 2', 'x = 8'))).toBe('SOLVE+solved'));
  });

  describe('previous 3x + 1 = 8', () => {
    it('3x = 7 → SIMPLIFY (after 3x = 8 − 1)', () => {
      expect(outcome(check('3x + 1 = 8', '3x = 8 - 1'))).toBe('SEPARATE');
      expect(outcome(check('3x = 8 - 1', '3x = 7'))).toBe('SIMPLIFY');
    });
    it('x = 7/3 → SOLVE', () => expect(outcome(check('3x = 7', 'x = 7/3'))).toBe('SOLVE+solved'));
    it('x = 2.33 → R-EQ-CHK-6', () => expect(outcome(check('3x = 7', 'x = 2.33'))).toBe('R-EQ-CHK-6'));
    it('x = 14/6 → R-EQ-CHK-5', () => expect(outcome(check('3x = 7', 'x = 14/6'))).toBe('R-EQ-CHK-5'));
  });
});

// ---- every diagnostic: ≥ 2 positive, ≥ 2 negative ----
const A = '3a + 3 = a + 23';
type Case = [prev: string, next: string];
const diagnostics: Record<string, { pos: Case[]; neg: Case[] }> = {
  'EQ-D1': {
    pos: [
      [A, '3a + = 5'],
      [A, '(3a = 5'],
      [A, '3a $ 3 = 5'],
      [A, 'a·a = 4'],
    ],
    neg: [
      [A, '3a+3=a+23'],
      [A, '3a - a = 23 - 3'],
    ],
  },
  'EQ-D2': {
    pos: [
      [A, '3a + 3'],
      [A, '3a = a = 2'],
    ],
    neg: [
      [A, '3a = 2'],
      [A, '3a + = 5'],
    ],
  },
  'EQ-D3': {
    pos: [
      [A, '3b - a = 20'],
      [A, '3x - x = 20'],
    ],
    neg: [
      [A, '3A - a = 23 - 3'],
      [A, '3a - a = 20'],
    ],
  },
  'EQ-D4': {
    pos: [
      [A, '3a + a = 23 - 3'],
      [A, '3a - a = 26'],
      ['7 - 3z = 13', '3z = 13 - 7'],
      ['3(y - 2) = y + 8', '3y + y = 8 + 6'],
    ],
    neg: [
      [A, '3a - a = 23 - 3'],
      [A, '3a - a = 23'],
      [A, '3a + a = 23'],
    ],
  },
  'EQ-D5': {
    pos: [
      [A, '3a - a = 23'],
      [A, '3a + 3 = 23'],
      [A, '3a - a + a = 23 - 3'],
    ],
    neg: [
      [A, '3a - a = 23 - 3'],
      [A, '3a + a = 23 - 3'],
    ],
  },
  'EQ-D6': {
    pos: [
      [A, '6a + 6 = 2a + 46'],
      [A, '4a = 40'],
      [A, '6a - 2a = 46 - 6'],
    ],
    neg: [
      [A, '3a - a = 20'],
      [A, '3a = a + 20'],
    ],
  },
  'EQ-D7': {
    pos: [
      ['3a - a = 23 - 3', '2a = 26'],
      ['3a - a = 23 - 3', '4a = 20'],
    ],
    neg: [
      ['3a - a = 23 - 3', '2a = 20'],
      ['3a - a = 23 - 3', '20 = 2a'],
    ],
  },
  'EQ-D8': {
    pos: [
      ['2a = 20', 'a = 18'],
      ['2a = 20', 'a = -10'],
      ['3x = 7', 'x = 3/7'],
    ],
    neg: [
      ['2a = 20', 'a = 10'],
      ['2a = 20', 'a = 20/2'],
    ],
  },
  'EQ-D9': {
    pos: [
      ['3(y - 2) = y + 8', '3y - 2 = y + 8'],
      ['3(y - 2) = y + 8', '3y + 6 = y + 8'],
      ['2(m - 3) = -(m + 12)', '2m - 3 = -(m + 12)'],
    ],
    neg: [
      ['3(y - 2) = y + 8', '3y - 6 = y + 8'],
      ['3(y - 2) = y + 8', '3(y - 2) = y + 8'],
      ['5(w + 8) = 2w - 1', '1 + 1 = 5'],
    ],
  },
  'EQ-D10': {
    pos: [
      [A, '5a = 7'],
      [A, 'a + 3 = 7'],
    ],
    neg: [
      [A, '3a = a + 20'],
      [A, '3a - a = 23 - 3'],
    ],
  },
  'EQ-D11': {
    pos: [
      [A, '3a = a + 20'],
      [A, 'a + 23 = 3a + 3'],
      [A, '3a + 3 - 23 = a'],
    ],
    neg: [
      [A, '3a - a = 23 - 3'],
      [A, '6a + 6 = 2a + 46'],
    ],
  },
};

describe('diagnostics (R-TEST-3)', () => {
  for (const [code, { pos, neg }] of Object.entries(diagnostics)) {
    describe(code, () => {
      it.each(pos)(`positive: %s → %s`, (prev, next) => expect(outcome(check(prev, next))).toBe(code));
      it.each(neg)(`negative: %s → %s`, (prev, next) => expect(outcome(check(prev, next))).not.toBe(code));
    });
  }
});

describe('additional rules', () => {
  it('R-EQ-CHK-3 with allowSkipping on: "Moved + simplified"', () => {
    const r = check(A, '2a = 20', { allowSkipping: true });
    expect(r.accepted && r.label).toBe('movedSimplified');
  });
  it('R-EQ-CHK-3: Solve can never be skipped at levels 3–4', () => {
    expect(outcome(check(A, 'a = 10', { allowSkipping: true, level: 4 }))).toBe('R-EQ-CHK-3');
    expect(outcome(check('3a - a = 23 - 3', 'a = 10', { allowSkipping: true, level: 4 }))).toBe(
      'R-EQ-CHK-3-SIMPLIFY',
    );
  });
  it('R-EQ-CHK-3: at levels 5–6 with allowSkipping, c·v = d → v = q merges with Simplify', () => {
    expect(outcome(check('3a - a = 23 - 3', 'a = 10', { allowSkipping: true, level: 5 }))).toBe(
      'SIMPLIFY+solved',
    );
  });
  it('approved rule: at level 6 a correct final answer is accepted from any line', () => {
    expect(outcome(check('4(w + 1) = 7w + 9', 'w = -5/3', { level: 6 }))).toBe('SOLVE+solved');
    expect(outcome(check('4w + 4 = 7w + 9', '-5/3 = w', { level: 6 }))).toBe('SOLVE+solved');
    expect(outcome(check('3a - a = 23 - 3', 'a = 10', { level: 6 }))).toBe('SOLVE+solved');
    const r = check('3a + 3 = a + 23', 'a = 10', { level: 6 });
    expect(r.accepted && r.label).toBe('solvedDirect');
  });
  it('approved rule: how the answer is written is still checked at level 6', () => {
    expect(outcome(check('4(w + 1) = 7w + 9', 'w = -10/6', { level: 6 }))).toBe('R-EQ-CHK-5');
    expect(outcome(check('3x + 1 = 8', 'x = 2.33', { level: 6 }))).toBe('R-EQ-CHK-6');
  });
  it('approved rule: a wrong answer or a partial step is checked as usual at level 6', () => {
    expect(outcome(check('3a + 3 = a + 23', 'a = 11', { level: 6 }))).not.toMatch(/SOLVE/);
    expect(outcome(check('3a + 3 = a + 23', '3a + a = 23 - 3', { level: 6 }))).toBe('EQ-D4');
    expect(outcome(check('3a + 3 = a + 23', '2a = 20', { level: 6 }))).toBe('R-EQ-CHK-3');
  });
  it('approved rule: levels 1–5 still need every step', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      expect(outcome(check('3a + 3 = a + 23', 'a = 10', { level }))).toBe('R-EQ-CHK-3');
      expect(outcome(check('3a - a = 23 - 3', 'a = 10', { level }))).toBe('R-EQ-CHK-3-SIMPLIFY');
    }
  });

  it('R-EQ-CHK-4: SIMPLIFY giving a = 20 also solves', () => {
    const r = check('3a - 2a = 23 - 3', 'a = 20');
    expect(outcome(r)).toBe('SIMPLIFY+solved');
  });
  it('R-EQ-CHK-4: −a = −20 still needs a SOLVE step', () => {
    expect(outcome(check('a - 2a = 3 - 23', '-a = -20'))).toBe('SIMPLIFY');
    expect(outcome(check('-a = -20', 'a = 20'))).toBe('SOLVE+solved');
  });
  it('R-EQ-CHK-6: an exact terminating decimal is accepted with a note', () => {
    const r = check('2x = 5', 'x = 2.5');
    expect(outcome(r)).toBe('SOLVE+solved');
    expect(r.accepted && r.note?.params.fraction).toBe('5/2');
  });
  it('negative fraction answers', () => {
    expect(outcome(check('-3w = 5', 'w = -5/3'))).toBe('SOLVE+solved');
  });
  it('fraction coefficients: 2p/3 − 1 = p/6 + 2 → 4p − 6 = p + 12 clears fractions', () => {
    expect(outcome(check('2p/3 - 1 = p/6 + 2', '4p - 6 = p + 12'))).toBe('CLEAR_FRACTIONS');
    expect(outcome(check('2p/3 - 1 = p/6 + 2', '(2p)/3 - p/6 = 2 + 1'))).toBe('SEPARATE');
  });
  it('clearing fractions straight to the answer is a skip', () => {
    expect(outcome(check('x/4 + 1 = 3', 'x = 8'))).toBe('R-EQ-CHK-3');
  });
  it('both sides expanded in turn: 2(m − 3) = −(m + 12)', () => {
    expect(outcome(check('2(m - 3) = -(m + 12)', '2m - 6 = -(m + 12)'))).toBe('EXPAND');
    expect(outcome(check('2m - 6 = -(m + 12)', '2m - 6 = -m - 12'))).toBe('EXPAND');
    expect(outcome(check('2m - 6 = -m - 12', '2m + m = -12 + 6'))).toBe('SEPARATE');
    expect(outcome(check('2m + m = -12 + 6', '3m = -6'))).toBe('SIMPLIFY');
    expect(outcome(check('3m = -6', 'm = -2'))).toBe('SOLVE+solved');
  });
  it('4(w + 1) = 7w + 9 solves to w = −5/3', () => {
    expect(outcome(check('4(w + 1) = 7w + 9', '4w + 4 = 7w + 9'))).toBe('EXPAND');
    expect(outcome(check('4w + 4 = 7w + 9', '4w - 7w = 9 - 4'))).toBe('SEPARATE');
    expect(outcome(check('4w - 7w = 9 - 4', '-3w = 5'))).toBe('SIMPLIFY');
    expect(outcome(check('-3w = 5', 'w = -5/3'))).toBe('SOLVE+solved');
  });
  it('partial simplify is accepted; repeating the line is not', () => {
    const r = check('3a - a = 23 - 3', '2a = 23 - 3');
    expect(r.accepted && r.label).toBe('simplifiedPartial');
    expect(outcome(check('3a - a = 23 - 3', '3a - a = 23 - 3'))).toBe('EQ-KEEP-GOING');
  });
  it('accepts the hyphen and the true minus sign alike', () => {
    expect(
      outcome(
        checkStep('3a + 3 = a + 23', '3a - a = 23 - 3', { variable: 'a', level: 3, allowSkipping: false }),
      ),
    ).toBe('SEPARATE');
  });
  it('runs within the 20 ms budget (R-NF-1)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) check(A, '3a + a = 23 - 3');
    expect((performance.now() - t0) / 100).toBeLessThan(20);
  });
});

describe('stageOf', () => {
  const stage = (text: string) => {
    const t = u(text);
    const r = parseEquation(t);
    if (!r.ok) throw new Error('parse');
    return stageOf(linearize(r.eq), t);
  };
  it.each([
    ['3(y - 2) = y + 8', 'EXPAND'],
    ['x/4 + 1 = 3', 'CLEAR_FRACTIONS'],
    ['3a + 3 = a + 23', 'SEPARATE'],
    ['3a - a = 23 - 3', 'SIMPLIFY'],
    ['2a = 20', 'SOLVE'],
    ['-a = -20', 'SOLVE'],
    ['a = 20/2', 'SOLVE'],
    ['a = 10', 'DONE'],
    ['w = -5/3', 'DONE'],
  ])('%s → %s', (text, expected) => expect(stage(text)).toBe(expected));
});
