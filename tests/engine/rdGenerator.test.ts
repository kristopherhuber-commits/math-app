// R-TEST-2 for RD: ≥ 1000 seeds per level. The answer is verified independently: the shown digits
// are read back from the display text and summed as a geometric series, and a test-local long
// division of the answer reproduces the digits shown.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateRd } from '../../src/engine/topics/rd/generator';
import { d2fModels, f2dModels } from '../../src/engine/topics/rd/distractors';
import { rdHint, rdWalkthrough } from '../../src/engine/topics/rd/hints';
import { add, eq, gcd, mul, rat, type Rational } from '../../src/engine/rational';
import type { McQuestion } from '../../src/engine/topics/mc';
import { OPTION_COUNT, FILLER, CORRECT } from '../../src/engine/topics/mc';

const RUNS = 1000;
const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const LEVELS = [1, 2, 3, 4];
const CODES = new Set([
  'RD-M1',
  'RD-M2',
  'RD-M3',
  'RD-M4',
  'RD-M5',
  'RD-M6',
  'RD-F1',
  'RD-F2',
  'RD-F3',
  'RD-F4',
  'RD-F5',
  FILLER,
  CORRECT,
]);

/** Test-local: whole + nonRep/10^m + block/(10^m(10^k − 1)). */
function series(whole: string, nonRep: string, block: string): Rational {
  const m = nonRep.length;
  const k = block.length;
  let v = rat(BigInt(whole));
  if (m) v = add(v, rat(BigInt(nonRep), 10n ** BigInt(m)));
  if (k) v = add(v, rat(BigInt(block), 10n ** BigInt(m) * (10n ** BigInt(k) - 1n)));
  return v;
}

/** Test-local long division: the first `count` digits after the point of n/d. */
function digitsOf(x: Rational, count: number): string {
  let r = x.n % x.d;
  let out = '';
  for (let i = 0; i < count; i++) {
    r *= 10n;
    out += `${r / x.d}`;
    r %= x.d;
  }
  return out;
}

/** Read "4.242424…" (with the block from its caption) back into a value. */
function readEllipsis(text: string, block: string): { value: Rational; whole: string; nonRep: string } {
  const m = /^(\d+)\.(\d+)…$/.exec(text);
  if (!m) throw new Error(`not an ellipsis decimal: ${text}`);
  const frac = m[2]!;
  expect(frac.endsWith(block.repeat(3))).toBe(true); // R-DISP-3: the block at least 3 times
  const nonRep = frac.slice(0, frac.length - 3 * block.length);
  return { value: series(m[1]!, nonRep, block), whole: m[1]!, nonRep };
}

/** Read the bar form "0.83̅" into a value. */
function readBar(text: string): Rational {
  const m = /^(\d+)\.(\d*?)((?:\d\u0305)+)$/.exec(text);
  if (!m) throw new Error(`not a bar decimal: ${text}`);
  return series(m[1]!, m[2]!, m[3]!.replace(/\u0305/g, ''));
}

function readFraction(text: string): Rational {
  const m = /^(\d+)\/(\d+)$/.exec(text);
  if (m) return rat(BigInt(m[1]!), BigInt(m[2]!));
  if (/^\d+$/.test(text)) return rat(BigInt(text));
  throw new Error(`not a fraction: ${text}`);
}

function checkOptions(q: McQuestion) {
  expect(q.options).toHaveLength(OPTION_COUNT);
  expect(new Set(q.options.map((o) => o.shown.text)).size).toBe(OPTION_COUNT);
  expect(q.options.filter((o) => eq(o.value, q.answer))).toHaveLength(1);
  expect(q.options.filter((o) => o.code === CORRECT)).toHaveLength(1);
  for (let i = 0; i < OPTION_COUNT; i++)
    for (let j = i + 1; j < OPTION_COUNT; j++)
      expect(eq(q.options[i]!.value, q.options[j]!.value)).toBe(false);
  for (const o of q.options) {
    expect(CODES.has(o.code)).toBe(true);
    expect(o.shown.text).not.toContain('-');
    // No ellipsis-only option: a repeating option always carries its bar form too (R-DISP-3).
    if (o.shown.text.includes('…')) expect(o.shown.latex2).toBeDefined();
  }
  expect(q.options.filter((o) => o.code === FILLER)).toHaveLength(Math.max(0, 4 - q.modelCount));
}

describe.each(LEVELS)('RD level %i (R-TEST-2)', (level) => {
  it('answer verified independently; level shape; options (R-ANS-1…4)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateRd(level, seed);
        checkOptions(q);
        const p = q.params;
        if (q.kind === 'D2F') {
          const hero = q.hero!;
          const block = hero.caption!.params.block!;
          const ellText = hero.text.split(' = ')[0]!;
          const read = readEllipsis(ellText, block);
          expect(eq(read.value, q.answer)).toBe(true);
          // Long division of the answer reproduces the digits shown.
          expect(digitsOf(q.answer, read.nonRep.length + 3 * block.length)).toBe(
            ellText.split('.')[1]!.slice(0, -1),
          );
          if (hero.latex2) expect(eq(readBar(hero.text.split(' = ')[1]!), q.answer)).toBe(true);
          // R-RD-1: lowest terms, improper when > 1.
          const a = readFraction(q.options.find((o) => o.code === CORRECT)!.shown.text);
          expect(eq(a, q.answer)).toBe(true);
          if (q.answer.d !== 1n) expect(gcd(q.answer.n, q.answer.d)).toBe(1n);
          // Level shape (§6.2 table).
          const k = block.length;
          const m = read.nonRep.length;
          if (level === 1) expect(read.whole === '0' && m === 0 && k >= 1 && k <= 3).toBe(true);
          if (level === 2) expect(Number(read.whole) >= 1 && m === 0 && k <= 3).toBe(true);
          if (level === 3) expect(m >= 1 && m <= 2 && k >= 1 && k <= 2).toBe(true);
          if (level === 4) expect(Number(read.whole) >= 1 && m >= 1 && m <= 2 && k >= 2 && k <= 3).toBe(true);
          expect(p.block).toBe(block);
        } else {
          expect(level).toBeGreaterThanOrEqual(2);
          const x = readFraction(q.hero!.text);
          expect(eq(x, q.answer)).toBe(true);
          const d = Number(x.d);
          if (level === 2) expect([3, 9, 11]).toContain(d);
          if (level === 3) expect([6, 12, 15, 22]).toContain(d);
          if (level === 4) {
            expect([7, 14]).toContain(d);
            // A 6-digit block, by test-local long division: the remainder first repeats after 6 digits.
            const seen: bigint[] = [];
            let r = x.n % x.d;
            while (!seen.includes(r)) {
              seen.push(r);
              r = (r * 10n) % x.d;
            }
            expect(seen.length - seen.indexOf(r)).toBe(6);
          }
          expect(x.n > 0n && x.n < x.d).toBe(true);
          const shown = q.options.find((o) => o.code === CORRECT)!.shown;
          expect(eq(readBar(shown.text.split(' = ')[1]!), x)).toBe(true);
        }
        // R-DISP-3: ellipsis-only heroes at L1 carry the caption; both forms from L2.
        if (q.kind === 'D2F') {
          expect(q.hero!.caption).toBeDefined();
          expect(q.hero!.latex2 !== undefined).toBe(level >= 2);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it('every shape of the level appears (no mixed review, §6.2)', () => {
    const shapes = new Set<string>();
    for (let seed = 0; seed < 400; seed++) shapes.add(generateRd(level, seed).params.shape!);
    const expected: Record<number, string[]> = {
      1: ['pure1', 'pure23'],
      2: ['whole', 'f2dA'],
      3: ['delayed', 'f2dB'],
      4: ['delayedWhole', 'f2d7'],
    };
    expect([...shapes].sort()).toEqual(expected[level]!.sort());
  });

  it('the same seed gives an identical question (R-ARCH-3)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(generateRd(level, seed)).toEqual(generateRd(level, seed));
      }),
      { numRuns: 200 },
    );
  });

  it('hints use the question and never give the answer; walkthrough ends at the answer', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateRd(level, seed);
        const answerTex = q.options.find((o) => o.code === CORRECT)!.shown.latex;
        for (const tier of [1, 2] as const) {
          const h = rdHint(q, tier);
          for (const v of Object.values(h.params)) expect(v).not.toContain(answerTex);
          expect(Object.keys(h.params).length).toBeGreaterThan(0);
        }
        const steps = rdWalkthrough(q);
        for (const s of steps) {
          if (!s.mini) continue;
          expect(s.mini.options).toHaveLength(3);
          expect(new Set(s.mini.options.map((o) => o.text)).size).toBe(3);
        }
        const last = steps.at(-1)!.math!.at(-1)!;
        if (q.kind === 'D2F') {
          expect(last.endsWith(answerTex)).toBe(true);
          // R-RD-1: the unsimplified fraction comes first, and equals the answer.
          const div = steps.at(-2)!.math![0]!;
          const m = /^x = \\frac\{(\d+)\}\{(\d+)\}$/.exec(div)!;
          expect(eq(rat(BigInt(m[1]!), BigInt(m[2]!)), q.answer)).toBe(true);
          // The "So 99x = ?" mini: coef × x, an integer.
          const sub = steps.find((s) => s.columns)!;
          const coef = BigInt(sub.columns!.result.label.replace('x', ''));
          expect(sub.mini!.options[sub.mini!.correct]!.text).toBe(`${mul(rat(coef), q.answer).n}`);
          expect(mul(rat(coef), q.answer).d).toBe(1n);
        } else {
          expect(last).toContain(answerTex);
          // The remainder that comes back, by test-local long division.
          const x = q.answer;
          const seen = new Set<bigint>();
          let r = x.n % x.d;
          while (!seen.has(r)) {
            seen.add(r);
            r = (r * 10n) % x.d;
          }
          const step = steps.find((s) => s.mini)!;
          expect(step.mini!.options[step.mini!.correct]!.text).toBe(`${r}`);
        }
      }),
      { numRuns: RUNS },
    );
  });
});

describe('RD worked examples', () => {
  const rep = (whole: number, nonRep: string, block: string) => ({
    negative: false,
    whole: BigInt(whole),
    nonRep,
    block,
  });
  const values = (cs: { value: Rational; code: string }[]) =>
    cs.map((c) => [`${c.value.n}/${c.value.d}`, c.code]);

  it('4.2424…: the mockup 02 distractors (RD-M1…M4)', () => {
    const v = values(d2fModels(rep(4, '', '24')));
    expect(v).toContainEqual(['8/33', 'RD-M1']);
    expect(v).toContainEqual(['424/99', 'RD-M2']);
    expect(v).toContainEqual(['140/3', 'RD-M3']);
    expect(v).toContainEqual(['106/25', 'RD-M4']);
  });

  it('0.41666…: RD-M5 gives 416/999 and 41/99', () => {
    const v = values(d2fModels(rep(0, '41', '6')));
    expect(v).toContainEqual(['416/999', 'RD-M5']);
    expect(v).toContainEqual(['41/99', 'RD-M5']);
  });

  it('5/6: F→D distractors 0.83, 0.8383…, 0.333…, 0.56, 1.2', () => {
    const v = values(f2dModels(rat(5, 6), 'both'));
    expect(v).toContainEqual(['83/100', 'RD-F1']);
    expect(v).toContainEqual(['83/99', 'RD-F2']);
    expect(v).toContainEqual(['1/3', 'RD-F3']);
    expect(v).toContainEqual(['14/25', 'RD-F4']);
    expect(v).toContainEqual(['6/5', 'RD-F5']);
  });

  it('1/6: the repeat starting too early is 0.666…', () => {
    expect(values(f2dModels(rat(1, 6), 'both'))).toContainEqual(['2/3', 'RD-F3']);
  });

  const fake = (whole: number, nonRep: string, block: string): McQuestion =>
    ({ kind: 'D2F', seed: 7, params: { whole: `${whole}`, nonRep, block } }) as unknown as McQuestion;

  it('walkthrough for 4.2424…: 100x, 99x = 420, 420/99, gcd 3, 140/33', () => {
    const steps = rdWalkthrough(fake(4, '', '24'));
    expect(steps).toHaveLength(6);
    expect(steps[2]!.math).toEqual(['100x = 424.242424\\text{…}']);
    expect(steps[3]!.math).toEqual(['99x = 420']);
    expect(steps[4]!.math).toEqual(['x = \\frac{420}{99}']);
    expect(steps[5]!.explain).toEqual({ id: 'rd.walk.simplify', params: { n: '420', d: '99', g: '3' } });
    expect(steps[5]!.math).toEqual(['x = \\frac{420}{99} = \\frac{140}{33}']);
    const mini = steps[3]!.mini!;
    expect(mini.options.map((o) => o.text).sort()).toEqual(['420', '424', '428']);
  });

  it('walkthrough for 0.41666…: 100x = 41.666…, 1000x = 416.666…, 900x = 375, 375/900 = 5/12', () => {
    const steps = rdWalkthrough(fake(0, '41', '6'));
    expect(steps[1]!.math).toEqual(['100x = 41.666\\text{…}']);
    expect(steps[2]!.math).toEqual(['1000x = 416.666\\text{…}']);
    expect(steps[3]!.math).toEqual(['900x = 375']);
    expect(steps[4]!.math).toEqual(['x = \\frac{375}{900}']);
    expect(steps[5]!.explain.params.g).toBe('75');
    expect(steps[5]!.math![0]).toContain('\\frac{5}{12}');
  });

  it('walkthrough for 3.12454545… (challenge): 100x, 10000x, 9900x = 30933, ends at 30933/9900', () => {
    const steps = rdWalkthrough(fake(3, '12', '45'));
    expect(steps[1]!.math).toEqual(['100x = 312.454545\\text{…}']);
    expect(steps[2]!.math).toEqual(['10000x = 31245.454545\\text{…}']);
    expect(steps[3]!.math).toEqual(['9900x = 30933']);
    // Independently, by the series: 3 + 12/100 + 45/9900 = 30933/9900 (= 3437/1100).
    expect(eq(rat(30933n, 9900n), add(add(rat(3), rat(12, 100)), rat(45, 9900)))).toBe(true);
    expect(steps.at(-1)!.math![0]).toContain('\\frac{3437}{1100}');
  });

  it('1/14 → 0.0714285714285…: F→D walkthrough finds the remainder that comes back', () => {
    const steps = rdWalkthrough({
      kind: 'F2D',
      seed: 3,
      params: { n: '1', d: '14' },
    } as unknown as McQuestion);
    const step = steps.find((s) => s.mini)!;
    // 10 ÷ 14: remainders 1, 10, 2, 6, 4, 12, 8, 10 → 10 comes back.
    expect(step.mini!.options[step.mini!.correct]!.text).toBe('10');
    expect(steps.at(-1)!.math![0]).toContain('0.0\\overline{714285}');
  });

  it('walkthrough for 2.31818… ends at 51/22', () => {
    const steps = rdWalkthrough(fake(2, '3', '18'));
    expect(steps.at(-1)!.math![0]).toContain('\\frac{51}{22}');
  });
});
