// R-TEST-2 for EQ: ≥ 1000 seeds per level. The answer is verified by substitution (evaluate),
// independently of the linear form; the R-EQ-GEN invariants are checked from the text and values.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateEq, type EqQuestion } from '../../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../../src/engine/topics/eq/hints';
import { evaluate } from '../../src/engine/eq/evaluate';
import { parseEquation, type Expr } from '../../src/engine/eq/parse';
import { checkStep } from '../../src/engine/eq/stepChecker';
import { add, eq, isInteger, rat, sub, type Rational } from '../../src/engine/rational';
import { config } from '../../src/engine/config';

const RUNS = 1000;
const seedArb = fc.integer({ min: 0, max: 0xffffffff });

function sides(q: EqQuestion): { left: Expr; right: Expr } {
  const r = parseEquation(q.text, q.variable);
  if (!r.ok) throw new Error(`does not parse: ${q.text}`);
  return r.eq;
}

const diff = (q: EqQuestion, x: Rational) => {
  const { left, right } = sides(q);
  return sub(evaluate(left, x), evaluate(right, x));
};

/** Top-level chunks of one side, split on + and − outside parentheses. */
function chunks(side: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < side.length; i++) {
    const ch = side[i]!;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && (ch === '+' || ch === '−') && cur.trim() !== '') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const hasVar = (e: Expr) => !eq(evaluate(e, rat(0)), evaluate(e, rat(1)));
const hasConst = (e: Expr) => !eq(evaluate(e, rat(0)), rat(0));

function assertInvariants(q: EqQuestion): void {
  const { left, right } = sides(q);
  const bound = q.level <= 3 ? config.eq.maxAbsValueLow : config.eq.maxAbsValueHigh;

  // Independent answer check: substitute the solution (R-TEST-2).
  expect(eq(evaluate(left, q.solution), evaluate(right, q.solution))).toBe(true);
  // 1: unique — the two sides differ at another point, so the equation is not an identity.
  expect(eq(diff(q, add(q.solution, rat(1))), rat(0))).toBe(false);
  // 2: bounds
  for (const n of q.text.match(/\d+/g) ?? []) expect(Number(n)).toBeLessThanOrEqual(bound);
  expect(Math.abs(Number(q.solution.n)) / Number(q.solution.d)).toBeLessThanOrEqual(config.eq.maxAbsSolution);
  expect(Number(q.solution.d)).toBeLessThanOrEqual(config.eq.maxSolutionDenominator);
  // 3: no zero coefficients, and ±1 written as a / −a
  expect(q.text).not.toMatch(/(^|[^\d/])1[a-z]/);
  expect(q.text).not.toMatch(/(^|[^\d.])0(?![\d.])/);
  // 4: parentheses and fractions by level
  if (q.level <= 2) expect(q.text).not.toContain('(');
  if (q.level <= 4) expect(q.text).not.toContain('/');
  // 5: a side never has the same kind of term twice
  for (const side of q.text.split(' = ')) {
    const kinds = chunks(side).map((c) => (c.includes('(') ? 'group' : /[a-z]/.test(c) ? 'var' : 'const'));
    expect(new Set(kinds).size).toBe(kinds.length);
  }
  // 6: not already separated
  const separated =
    (hasVar(left) && !hasConst(left) && !hasVar(right) && hasConst(right)) ||
    (hasVar(right) && !hasConst(right) && !hasVar(left) && hasConst(left));
  expect(separated).toBe(false);
  // 7: the constants on the two sides are not equal
  expect(eq(evaluate(left, rat(0)), evaluate(right, rat(0)))).toBe(false);
  // Letters: exactly one, from the allowed set (R-DISP-6); true minus sign only (R-DISP-1)
  const letters = new Set(q.text.match(/[a-z]/g));
  expect([...letters]).toEqual([q.variable]);
  expect(config.variables).toContain(q.variable);
  expect(q.text).not.toContain('-');
}

describe.each([1, 2, 3, 4, 5, 6])('EQ level %i generator', (level) => {
  it(`satisfies R-EQ-GEN and substitution for ${RUNS} seeds`, () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateEq(level, seed);
        assertInvariants(q);
        if (level === 1) expect(q.solution.n > 0n && isInteger(q.solution)).toBe(true);
        if (level <= 4) expect(isInteger(q.solution)).toBe(true);
        if (level === 5) expect(!isInteger(q.solution) || q.text.includes('/')).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it('is reproducible from its seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(generateEq(level, seed)).toEqual(generateEq(level, seed));
      }),
      { numRuns: 200 },
    );
  });

  it('has a walkthrough whose every line the step checker accepts, ending with a true check', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateEq(level, seed);
        const steps = eqWalkthrough(q.text, q.variable);
        let prev = q.text;
        let solved = false;
        for (const s of steps.filter((x) => x.kind !== 'CHECK')) {
          const r = checkStep(prev, s.line, { variable: q.variable, level, allowSkipping: false });
          expect(r.accepted, `${prev} → ${s.line}: ${JSON.stringify(r)}`).toBe(true);
          if (r.accepted) solved = r.solved;
          prev = s.line;
        }
        expect(solved).toBe(true);
        const check = steps.at(-1)!;
        expect(check.kind).toBe('CHECK');
        expect(check.explain.params.leftValue).toBe(check.explain.params.rightValue);
      }),
      { numRuns: 300 },
    );
  });
});

describe('level coverage', () => {
  it('level 6 includes negative fraction solutions', () => {
    let found = false;
    for (let seed = 0; seed < 2000 && !found; seed++) {
      const q = generateEq(6, seed);
      found = !isInteger(q.solution) && q.solution.n < 0n;
    }
    expect(found).toBe(true);
  });
  it('levels 4–6 include parentheses and level 5 includes fraction coefficients', () => {
    const texts = (level: number) => Array.from({ length: 300 }, (_, s) => generateEq(level, s).text);
    expect(texts(4).some((t) => t.includes('('))).toBe(true);
    expect(texts(5).some((t) => t.includes('/'))).toBe(true);
    expect(texts(3).some((t) => /^\d/.test(t) || t.startsWith('−'))).toBe(true);
  });
});
