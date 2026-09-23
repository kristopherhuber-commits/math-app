// R-TEST-2 for FDP: ≥ 1000 seeds per level. The answer is verified independently: the hero and the
// correct option are read back from their displayed text by a test-local parser and compared.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateFdp } from '../../src/engine/topics/fdp/generator';
import { fdpModels, type FdpSpec } from '../../src/engine/topics/fdp/distractors';
import { fdpHint, fdpWalkthrough } from '../../src/engine/topics/fdp/hints';
import { add, cmp, eq, gcd, mul, rat, ONE, type Rational } from '../../src/engine/rational';
import { CORRECT, FILLER, OPTION_COUNT, type McQuestion } from '../../src/engine/topics/mc';

const RUNS = 1000;
const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const CODES = new Set([
  'FDP-M1',
  'FDP-M2',
  'FDP-M3',
  'FDP-M4',
  'FDP-M5',
  'FDP-M6',
  'FDP-M7',
  FILLER,
  CORRECT,
]);

function series(whole: string, nonRep: string, block: string): Rational {
  let v = rat(BigInt(whole));
  const m = nonRep.length;
  if (m) v = add(v, rat(BigInt(nonRep), 10n ** BigInt(m)));
  if (block) v = add(v, rat(BigInt(block), 10n ** BigInt(m) * (10n ** BigInt(block.length) - 1n)));
  return v;
}

/** Test-local reader for everything FDP displays. Also reports the form it saw. */
function read(text: string): { value: Rational; form: 'F' | 'mixed' | 'D' | 'P' } {
  let t = text;
  if (t.includes(' = ')) t = t.split(' = ')[1]!; // "0.8333… = 0.83̅": read the bar form
  const percent = t.endsWith('%');
  if (percent) t = t.slice(0, -1);
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(t);
  if (m) return { value: add(rat(BigInt(m[1]!)), rat(BigInt(m[2]!), BigInt(m[3]!))), form: 'mixed' };
  m = /^(\d+)\/(\d+)$/.exec(t);
  if (m) return { value: rat(BigInt(m[1]!), BigInt(m[2]!)), form: 'F' };
  m = /^(\d+)(?:\.(\d*?)((?:\d̅)*))?$/.exec(t);
  if (!m) throw new Error(`unreadable: ${text}`);
  const v = series(m[1]!, m[2] ?? '', (m[3] ?? '').replace(/̅/g, ''));
  if (percent) return { value: mul(v, rat(1, 100)), form: 'P' };
  return { value: v, form: /^\d+$/.test(t) ? 'F' : 'D' };
}

function checkOptions(q: McQuestion) {
  expect(q.options).toHaveLength(OPTION_COUNT);
  expect(new Set(q.options.map((o) => o.shown.text)).size).toBe(OPTION_COUNT);
  expect(q.options.filter((o) => eq(o.value, q.answer))).toHaveLength(1);
  for (let i = 0; i < OPTION_COUNT; i++)
    for (let j = i + 1; j < OPTION_COUNT; j++)
      expect(eq(q.options[i]!.value, q.options[j]!.value)).toBe(false);
  for (const o of q.options) {
    expect(CODES.has(o.code)).toBe(true);
    // Every option shows the value it stands for (read back independently).
    expect(eq(read(o.shown.text).value, o.value)).toBe(true);
    if (o.shown.text.includes('…')) expect(o.shown.latex2).toBeDefined();
  }
  expect(q.options.filter((o) => o.code === FILLER)).toHaveLength(Math.max(0, 4 - q.modelCount));
}

const POOL: Record<number, (x: Rational) => boolean> = {
  1: (x) => [2n, 4n, 5n, 10n].includes(x.d) && cmp(x, ONE) < 0,
  2: (x) => [8n, 20n, 25n, 50n, 100n].includes(x.d) && cmp(x, ONE) < 0,
  3: (x) => cmp(x, ONE) > 0 || x.d === 1000n || x.d === 500n || x.d === 250n || x.d === 200n || x.d === 125n,
  4: (x) => [3n, 6n, 9n, 11n, 12n].includes(x.d) && cmp(x, ONE) < 0,
};

describe.each([1, 2, 3, 4, 5])('FDP level %i (R-TEST-2)', (level) => {
  it('answer verified independently; level pool; forms; options (R-ANS-1…4, R-FDP-1/2)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateFdp(level, seed);
        checkOptions(q);
        const hero = read(q.hero!.text);
        const correct = q.options.find((o) => o.code === CORRECT)!;
        const ans = read(correct.shown.text);
        expect(eq(hero.value, q.answer)).toBe(true);
        expect(eq(ans.value, q.answer)).toBe(true);
        const { source, target, form } = q.params;
        // The prompt names the target form, and every option uses it (R-FDP-2).
        const big = cmp(q.answer, ONE) > 0;
        if (target === 'F') {
          expect(q.prompt.params.target).toBe(big ? form : 'fraction');
          if (q.answer.d !== 1n) expect(gcd(q.answer.n, q.answer.d)).toBe(1n); // R-FDP-1
          if (big) expect(ans.form).toBe(form === 'mixed' ? 'mixed' : 'F');
          if (big)
            for (const o of q.options)
              if (cmp(o.value, ONE) > 0 && o.value.d !== 1n) expect(read(o.shown.text).form).toBe(ans.form);
        } else {
          expect(ans.form === 'P').toBe(target === 'P');
        }
        expect(source).not.toBe(target);
        // Level pool (§6.3 table).
        const pool = Number(q.params.pool);
        if (level < 5) expect(pool).toBe(level);
        expect(POOL[pool]!(q.answer)).toBe(true);
        // No repeating option before bar notation is introduced (L4).
        if (level < 4) for (const o of q.options) expect(o.shown.text).not.toContain('…');
      }),
      { numRuns: RUNS },
    );
  });

  it('the same seed gives an identical question (R-ARCH-3)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(generateFdp(level, seed)).toEqual(generateFdp(level, seed));
      }),
      { numRuns: 200 },
    );
  });

  it('hints never contain the answer; the walkthrough ends at the answer', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generateFdp(level, seed);
        const correct = q.options.find((o) => o.code === CORRECT)!.shown;
        for (const tier of [1, 2] as const) {
          const h = fdpHint(q, tier);
          expect(Object.keys(h.params).length).toBeGreaterThan(0);
          if (q.hero!.latex !== correct.latex)
            for (const v of Object.values(h.params)) expect(v).not.toBe(correct.latex);
        }
        const steps = fdpWalkthrough(q);
        for (const s of steps)
          if (s.mini?.question.id.startsWith('fdp.walk.mini')) {
            expect(new Set(s.mini.options.map((o) => o.text)).size).toBe(3);
            expect(
              eq(
                read(s.mini.options[s.mini.correct]!.text).value,
                mul(q.answer, rat(q.params.source === 'D' ? 100 : 1)),
              ),
            ).toBe(true);
          }
        const last = steps.at(-1)!.math!.at(-1)!;
        expect(last).toContain(correct.latex);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('FDP worked examples (§6.3)', () => {
  const spec = (
    x: Rational,
    source: 'F' | 'D' | 'P',
    target: 'F' | 'D' | 'P',
    allowRepeating = true,
  ): FdpSpec => ({
    x,
    source,
    target,
    notation: 'both',
    form: 'improper',
    allowRepeating,
  });
  const has = (s: FdpSpec, text: string, code: string) =>
    expect(fdpModels(s).map((c) => [c.shown.text, c.code])).toContainEqual([text, code]);

  it('FDP-M1: 0.375 → 3.75% or 375%', () => {
    has(spec(rat(3, 8), 'D', 'P'), '3.75%', 'FDP-M1');
    has(spec(rat(3, 8), 'D', 'P'), '375%', 'FDP-M1');
  });
  it('FDP-M2: 3/8 → 0.38; 2¼ → 214%', () => {
    has(spec(rat(3, 8), 'F', 'D'), '0.38', 'FDP-M2');
    has(spec(rat(9, 4), 'F', 'P'), '214%', 'FDP-M2');
  });
  it('FDP-M3: 3/8 → 2.666… (only when repeating options are allowed)', () => {
    has(spec(rat(3, 8), 'F', 'D'), '2.666… = 2.6̅', 'FDP-M3');
    expect(fdpModels(spec(rat(3, 8), 'F', 'D', false)).map((c) => c.code)).not.toContain('FDP-M3');
  });
  it('FDP-M4: 35% → 7/2', () => has(spec(rat(7, 20), 'P', 'F'), '7/2', 'FDP-M4'));
  it('FDP-M5: 35/100 → 7/25', () => has(spec(rat(7, 20), 'P', 'F'), '7/25', 'FDP-M5'));
  it('FDP-M6: 1/3 → 33% or 0.33', () => {
    has(spec(rat(1, 3), 'F', 'P'), '33%', 'FDP-M6');
    has(spec(rat(1, 3), 'F', 'D'), '0.33', 'FDP-M6');
  });
  it('FDP-M7 and mockup 12: 2¼ → 225% with 25%, 2.25%, 214%, 22.5%', () => {
    const s = spec(rat(9, 4), 'F', 'P');
    has(s, '25%', 'FDP-M7');
    has(s, '2.25%', 'FDP-M1');
    has(s, '22.5%', 'FDP-M1');
  });
  it('3/8 = 0.375 = 37.5%; 0.4% = 0.004 = 1/250; 1/3 = 33.333…%', () => {
    const fake = (x: string, source: string, target: string, form = 'improper'): McQuestion =>
      ({ seed: 3, params: { x, source, target, form, notation: 'both' } }) as unknown as McQuestion;
    expect(fdpWalkthrough(fake('3/8', 'F', 'P')).at(-1)!.math![0]).toBe('0.375 \\times 100 = 37.5\\%');
    expect(fdpWalkthrough(fake('1/250', 'P', 'F')).at(-1)!.math![0]).toBe('\\frac{4}{1000} = \\frac{1}{250}');
    expect(fdpWalkthrough(fake('1/3', 'F', 'P')).at(-1)!.math![0]).toBe(
      '0.333\\text{…} \\times 100 = 33.333\\text{…}\\%',
    );
    expect(fdpWalkthrough(fake('9/4', 'D', 'F', 'mixed')).at(-1)!.math![0]).toBe(
      '\\frac{9}{4} = 2\\frac{1}{4}',
    );
  });
});
