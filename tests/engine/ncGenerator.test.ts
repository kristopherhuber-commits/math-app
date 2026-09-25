// R-TEST-2 for NC: ≥ 1000 seeds per level. Membership is recomputed by a test-local oracle that reads
// the number back from its displayed text (and its caption), independently of the engine.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateNc, patternDigits, type NcQuestion } from '../../src/engine/topics/nc/generator';
import { checkSets, NC_SETS, ncMembership, type NcValue } from '../../src/engine/topics/nc/checker';
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

/** Test-local membership (§6.1 definitions). */
function oracle(v: Rational | 'irrational', zeroNatural: boolean): Set<NcSet> {
  if (v === 'irrational') return new Set(['irrational']);
  const out = new Set<NcSet>(['rational']);
  if (v.d === 1n) {
    out.add('integer');
    if (v.n >= 0n) out.add('whole');
    if (v.n > 0n || (zeroNatural && v.n === 0n)) out.add('natural');
  }
  return out;
}

const FORMS: Record<number, string[]> = {
  1: ['posInt', 'zero', 'fraction', 'decimal'],
  2: ['negInt', 'negFraction', 'negDecimal', 'repeating'],
  3: ['intFraction', 'zeroFraction', 'pointZero'],
};

describe.each([1, 2, 3, 4, 5])('NC level %i (R-TEST-2)', (level) => {
  it('membership verified independently; level forms; captions (R-NC-1, R-DISP-1/3/4)', () => {
    fc.assert(
      fc.property(seedArb, fc.boolean(), (seed, zeroNatural) => {
        const q = generateNc(level, seed);
        const read = readValue(q);
        const expected = oracle(read, zeroNatural);
        expect(checkSets(q.value, expected, zeroNatural).correct).toBe(true);
        const m = ncMembership(q.value, zeroNatural);
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

  it('hints use the number; the walkthrough places it and lists exactly the right sets', () => {
    fc.assert(
      fc.property(seedArb, fc.boolean(), (seed, zeroNatural) => {
        const q = generateNc(level, seed);
        expect(ncHint(q, 1, zeroNatural).params.x).toBe(q.shown.latex);
        expect(ncHint(q, 2, zeroNatural).id).toMatch(/^nc\.h2\./);
        const steps = ncWalkthrough(q, zeroNatural);
        const expected = oracle(readValue(q), zeroNatural);
        const last = steps.at(-1)!;
        expect(new Set(last.explain.params.sets!.split(','))).toEqual(expected);
        const place = steps.find((s) => s.mini)!;
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
  const sets = (v: NcValue, z = false) => NC_SETS.filter((s) => ncMembership(v, z)[s]);

  it.each([
    [r(7), ['natural', 'whole', 'integer', 'rational']],
    [r(0), ['whole', 'integer', 'rational']],
    [r(3, 4), ['rational']],
    [r(-12), ['integer', 'rational']],
    [r(12, 4), ['natural', 'whole', 'integer', 'rational']],
    [r(-8, -2), ['natural', 'whole', 'integer', 'rational']],
    [r(1), ['natural', 'whole', 'integer', 'rational']], // 0.999… = 1
  ])('%o', (v, expected) => {
    expect(sets(v)).toEqual(expected);
  });

  it('0 is natural only when the parent setting says so', () => {
    expect(sets(r(0), true)).toContain('natural');
  });

  it('irrational patterns: 0.1010010001… and 0.123456789101112…', () => {
    const g = { family: 'growingZeros', whole: 0, digit: 1, lead: true, negative: false } as const;
    expect(patternDigits(g)).toBe('0.1010010001');
    expect(patternDigits({ ...g, whole: 2, digit: 2, lead: false })).toBe('2.020020002');
    expect(patternDigits({ ...g, family: 'counting' })).toBe('0.123456789101112');
    expect(sets({ kind: 'irrational', pattern: g })).toEqual(['irrational']);
  });

  it('R-NC-2: exactly the right boxes; mismatches listed without direction', () => {
    const v = r(12, 4);
    expect(checkSets(v, new Set(['natural', 'whole', 'integer']), false)).toEqual({
      correct: false,
      mismatched: ['rational'],
    });
    expect(
      checkSets(v, new Set(['natural', 'whole', 'integer', 'rational', 'irrational']), false).mismatched,
    ).toEqual(['irrational']);
  });
});
