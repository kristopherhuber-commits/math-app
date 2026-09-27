// R-TEST-2 for NC: ≥ 1000 seeds per level. Membership is recomputed by a test-local oracle that reads
// the number back from its displayed text (and its caption), independently of the engine.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateNc, patternDigits, type NcQuestion } from '../../src/engine/topics/nc/generator';
import {
  checkSmallest,
  innermostSet,
  NC_SETS,
  ncMembership,
  type NcValue,
} from '../../src/engine/topics/nc/checker';
import { ncHint, ncWalkthrough } from '../../src/engine/topics/nc/hints';
import { add, rat, type Rational } from '../../src/engine/rational';
import type { NcSet } from '../../src/engine/topics/walk';

const RUNS = 1000;
const seedArb = fc.integer({ min: 0, max: 0xffffffff });

/** Test-local reader: the exact value shown, or 'irrational' for a patterned decimal. */
function readValue(q: NcQuestion): Rational | 'irrational' {
  const cap = q.shown.caption?.id;
  if (cap?.startsWith('nc.caption.')) return 'irrational';
  let t = q.shown.text;
  const neg = t.startsWith('−');
  if (neg) t = t.slice(1);
  const withSign = (v: Rational) => (neg ? rat(-v.n, v.d) : v);
  let m = /^(−?)(\d+)\/(−?)(\d+)$/.exec(t);
  if (m) {
    const s = (m[1] ? -1n : 1n) * (m[3] ? -1n : 1n);
    return withSign(rat(s * BigInt(m[2]!), BigInt(m[4]!)));
  }
  m = /^(\d+)\.(\d+)…$/.exec(t);
  if (m) {
    const block = q.shown.caption!.params.block!;
    const frac = m[2]!;
    expect(frac.endsWith(block.repeat(3))).toBe(true); // R-DISP-3
    const nonRep = frac.slice(0, frac.length - 3 * block.length);
    let v = rat(BigInt(m[1]!));
    const p = nonRep.length;
    if (p) v = add(v, rat(BigInt(nonRep), 10n ** BigInt(p)));
    v = add(v, rat(BigInt(block), 10n ** BigInt(p) * (10n ** BigInt(block.length) - 1n)));
    return withSign(v);
  }
  m = /^(\d+)(?:\.(\d+))?$/.exec(t);
  if (!m) throw new Error(`unreadable: ${q.shown.text}`);
  const frac = m[2] ?? '';
  return withSign(rat(BigInt(m[1]! + frac), 10n ** BigInt(frac.length)));
}

/** Test-local membership (§6.1 definitions: natural = 1, 2, 3, …). */
function oracle(v: Rational | 'irrational'): Set<NcSet> {
  if (v === 'irrational') return new Set(['irrational']);
  const out = new Set<NcSet>(['rational']);
  if (v.d === 1n) {
    out.add('integer');
    if (v.n >= 0n) out.add('whole');
    if (v.n > 0n) out.add('natural');
  }
  return out;
}

/** Test-local smallest set (R-NC-2): the innermost of natural ⊂ whole ⊂ integer ⊂ rational, or irrational. */
const smallestOf = (s: Set<NcSet>): NcSet =>
  (['natural', 'whole', 'integer', 'rational', 'irrational'] as const).find((x) => s.has(x))!;

const FORMS: Record<number, string[]> = {
  1: ['posInt', 'zero', 'fraction', 'decimal'],
  2: ['negInt', 'negFraction', 'negDecimal', 'repeating'],
  3: ['intFraction', 'zeroFraction', 'pointZero'],
};

describe.each([1, 2, 3, 4, 5])('NC level %i (R-TEST-2)', (level) => {
  it('membership verified independently; level forms; captions (R-NC-1, R-DISP-1/3/4)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateNc(level, seed);
        const read = readValue(q);
        const expected = oracle(read);
        // R-NC-2: exactly one card is right, the smallest set; every other card is not quite.
        const smallest = smallestOf(expected);
        expect(innermostSet(q.value)).toBe(smallest);
        for (const s of NC_SETS)
          expect(checkSmallest(q.value, s)).toEqual(
            s === smallest
              ? { correct: true }
              : { correct: false, code: expected.has(s) ? 'NC-CONTAINS' : 'NC-NOT-IN' },
          );
        const m = ncMembership(q.value);
        expect(new Set(NC_SETS.filter((s) => m[s]))).toEqual(expected);
        expect(q.shown.text).not.toContain('-'); // R-DISP-1
        if (q.shown.text.includes('…')) expect(q.shown.caption).toBeDefined(); // R-DISP-3/4
        if (FORMS[level]) expect(FORMS[level]).toContain(q.form);
        if (level === 3) expect(read !== 'irrational' && read.d === 1n).toBe(true); // disguised integers
        if (level < 4) expect(q.form).not.toBe('irrational');
        if (level < 5) expect(q.form).not.toBe('nines');
        if (q.form === 'irrational' && q.value.kind === 'irrational')
          expect(q.shown.text.replace('−', '')).toBe(`${patternDigits(q.value.pattern)}…`);
      }),
      { numRuns: RUNS },
    );
  });

  it('the same seed gives an identical question (R-ARCH-3)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(generateNc(level, seed)).toEqual(generateNc(level, seed));
      }),
      { numRuns: 200 },
    );
  });

  it('hints use the number; the walkthrough places it and ends on the smallest set', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateNc(level, seed);
        expect(ncHint(q, 1).params.x).toBe(q.shown.latex);
        expect(ncHint(q, 2).id).toMatch(/^nc\.h2\./);
        const steps = ncWalkthrough(q);
        const expected = oracle(readValue(q));
        const last = steps.at(-1)!;
        expect(last.explain).toEqual({ id: 'nc.walk.answer', params: { set: smallestOf(expected) } });
        expect(new Set(last.sets!.lit)).toEqual(expected); // the nesting is still shown (R-NC-4)
        const place = steps.find((s) => s.mini && s.sets)!;
        if (q.form === 'nines') {
          // The x-method: 10x − x = 9x, and 9x / 9 is the number without its sign.
          const read = readValue(q) as Rational;
          const abs = read.n < 0n ? -read.n : read.n;
          const cols = steps.find((s) => s.columns)!.columns!;
          expect(cols.result.whole).toBe(`${9n * abs}`);
          expect(BigInt(cols.top.whole) - BigInt(cols.bottom.whole)).toBe(9n * abs);
          expect(steps.some((s) => s.math?.includes(`x = \\frac{${9n * abs}}{9} = ${abs}`))).toBe(true);
          expect(ncHint(q, 2).id).toBe(read.n < 0n ? 'nc.h2.nines.neg' : 'nc.h2.nines');
        }
        const smallest = NC_SETS.find((s) => expected.has(s))!;
        expect(place.mini!.options[place.mini!.correct]!.text).toBe(smallest);
        expect(new Set(place.mini!.options.map((o) => o.text)).size).toBe(3);
        expect(place.sets!.place).toBe(smallest);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('NC examples (§6.1)', () => {
  const r = (n: number, d = 1): NcValue => ({ kind: 'rational', value: rat(n, d) });
  const sets = (v: NcValue) => NC_SETS.filter((s) => ncMembership(v)[s]);

  it.each([
    [r(7), ['natural', 'whole', 'integer', 'rational'], 'natural'],
    [r(0), ['whole', 'integer', 'rational'], 'whole'], // 0 is whole, not natural (parent decision)
    [r(3, 4), ['rational'], 'rational'],
    [r(-12), ['integer', 'rational'], 'integer'],
    [r(-3), ['integer', 'rational'], 'integer'],
    [r(12, 4), ['natural', 'whole', 'integer', 'rational'], 'natural'],
    [r(-8, -2), ['natural', 'whole', 'integer', 'rational'], 'natural'],
    [r(1), ['natural', 'whole', 'integer', 'rational'], 'natural'], // 0.999… = 1
  ])('%o → smallest %s', (v, expected, smallest) => {
    expect(sets(v)).toEqual(expected);
    expect(innermostSet(v)).toBe(smallest);
  });

  it('irrational patterns: 0.1010010001… and 0.123456789101112…', () => {
    const g = { family: 'growingZeros', whole: 0, digit: 1, lead: true, negative: false } as const;
    expect(patternDigits(g)).toBe('0.1010010001');
    expect(patternDigits({ ...g, whole: 2, digit: 2, lead: false })).toBe('2.020020002');
    expect(patternDigits({ ...g, family: 'counting' })).toBe('0.123456789101112');
    expect(sets({ kind: 'irrational', pattern: g })).toEqual(['irrational']);
  });

  it('R-NC-2/3: only the smallest set is right; a larger set that contains it vs one that does not', () => {
    expect(checkSmallest(r(0), 'whole')).toEqual({ correct: true });
    expect(checkSmallest(r(0), 'natural')).toEqual({ correct: false, code: 'NC-NOT-IN' });
    expect(checkSmallest(r(0), 'integer')).toEqual({ correct: false, code: 'NC-CONTAINS' });
    expect(checkSmallest(r(12, 4), 'rational')).toEqual({ correct: false, code: 'NC-CONTAINS' });
    expect(checkSmallest(r(-3), 'whole')).toEqual({ correct: false, code: 'NC-NOT-IN' });
    expect(checkSmallest(r(3, 4), 'irrational')).toEqual({ correct: false, code: 'NC-NOT-IN' });
  });
});
