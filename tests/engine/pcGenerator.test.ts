// R-TEST-2 for PC: ≥ 1000 seeds per level. The answer is verified independently with integer-cent
// arithmetic: applying the change(s) to the answer (or to the start price) gives the stated price.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generatePc, pcQuestion, type PcSpec } from '../../src/engine/topics/pc/generator';
import { pcHint, pcWalkthrough } from '../../src/engine/topics/pc/hints';
import { eq, rat } from '../../src/engine/rational';
import { CORRECT, FILLER, OPTION_COUNT, type McQuestion } from '../../src/engine/topics/mc';

const RUNS = 1000;
const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const CODES = new Set(['PC-M1', 'PC-M2', 'PC-M3', 'PC-M4', 'PC-M5', 'PC-M6', 'PC-M7', FILLER, CORRECT]);

const readMoney = (text: string): bigint => {
  const m = /^\$(\d+)\.(\d{2})$/.exec(text); // R-DISP-5: exactly 2 decimals
  if (!m) throw new Error(`not money: ${text}`);
  return BigInt(m[1]!) * 100n + BigInt(m[2]!);
};

/** Test-local: price × (100 ± p) / 100 in integer cents, or null when not exact. */
function apply(cents: bigint, pct: number, up: boolean): bigint | null {
  const x = cents * BigInt(100 + (up ? pct : -pct));
  return x % 100n === 0n ? x / 100n : null;
}

function verify(q: McQuestion) {
  const p = q.params;
  const answer = readMoney(q.options.find((o) => o.code === CORRECT)!.shown.text);
  const price = readMoney(p.price!);
  const pct = Number(p.pct);
  const up = p.dir === 'up';
  expect(eq(rat(answer, 100), q.answer)).toBe(true);
  if (p.kind === 'single') expect(apply(price, pct, up)).toBe(answer);
  if (p.kind === 'successive') {
    const mid = apply(price, pct, up);
    expect(mid).not.toBeNull(); // R-PC-1: the intermediate price is exact too
    expect(apply(mid!, Number(p.pct2), p.dir2 === 'up')).toBe(answer);
  }
  if (p.kind === 'reverse') expect(apply(answer, pct, up)).toBe(price);
  return { price, pct, answer };
}

describe.each([1, 2, 3, 4, 5])('PC level %i (R-TEST-2)', (level) => {
  it('answer verified in integer cents; level shape; options (R-PC-1, R-ANS-1…4)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generatePc(level, seed);
        const { price, pct } = verify(q);
        const sub = Number(q.params.sub);
        if (level < 5) expect(sub).toBe(level);
        expect(q.params.kind).toBe(sub <= 2 ? 'single' : sub === 3 ? 'successive' : 'reverse');
        if (sub === 1) {
          expect(price % 100n).toBe(0n); // whole-dollar prices
          expect([10, 20, 25, 50]).toContain(pct);
        }
        if (sub === 2) expect(pct >= 1 && pct <= 90).toBe(true);
        // Options
        expect(q.options).toHaveLength(OPTION_COUNT);
        expect(new Set(q.options.map((o) => o.shown.text)).size).toBe(OPTION_COUNT);
        expect(q.options.filter((o) => eq(o.value, q.answer))).toHaveLength(1);
        for (const o of q.options) {
          expect(CODES.has(o.code)).toBe(true);
          expect(readMoney(o.shown.text)).toBeGreaterThan(0n);
          expect(eq(rat(readMoney(o.shown.text), 100), o.value)).toBe(true);
        }
        for (let i = 0; i < OPTION_COUNT; i++)
          for (let j = i + 1; j < OPTION_COUNT; j++)
            expect(eq(q.options[i]!.value, q.options[j]!.value)).toBe(false);
        expect(q.options.filter((o) => o.code === FILLER)).toHaveLength(Math.max(0, 4 - q.modelCount));
      }),
      { numRuns: RUNS },
    );
  });

  it('the same seed gives an identical question (R-ARCH-3)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(generatePc(level, seed)).toEqual(generatePc(level, seed));
      }),
      { numRuns: 200 },
    );
  });

  it('hints never give the answer; both methods; walkthrough ends at the answer (R-PC-2/3)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const q = generatePc(level, seed);
        const answer = q.params.answer!;
        for (const tier of [1, 2] as const)
          for (const v of Object.values(pcHint(q, tier).params)) expect(v).not.toBe(answer);
        const steps = pcWalkthrough(q);
        const ids = steps.map((s) => s.explain.id);
        if (q.params.kind === 'single') expect(ids).toEqual(['pc.walk.part', 'pc.walk.multiplier']);
        if (q.params.kind === 'successive') {
          expect(ids).toContain('pc.walk.multipliers');
          expect(
            ids.some(
              (id) => id === 'pc.walk.notBack' || id === 'pc.walk.notAdd' || id === 'pc.walk.backExactly',
            ),
          ).toBe(true);
          if (q.params.dir !== q.params.dir2 && q.params.pct === q.params.pct2)
            expect(ids).toContain('pc.walk.notBack');
        }
        const tex = answer.replace('$', '\\$');
        const lastMath = steps.at(-1)!.math!.join(' ');
        if (q.params.kind === 'reverse') expect(steps[1]!.math![0]).toContain(`\\text{${tex}}`);
        else expect(lastMath).toContain(`= \\text{${tex}}`);
        for (const s of steps)
          if (s.mini) {
            expect(new Set(s.mini.options.map((o) => o.text)).size).toBe(3);
            for (const o of s.mini.options) readMoney(o.text);
          }
      }),
      { numRuns: RUNS },
    );
  });
});

describe('PC worked examples (§6.4)', () => {
  const q = (spec: PcSpec) => pcQuestion(spec, 1, 1)!;
  const codes = (x: McQuestion) => Object.fromEntries(x.options.map((o) => [o.shown.text, o.code]));

  it('$40 up 10% → $44.00; M1 $50.00, M2 $4.00, M3 $36.00', () => {
    const x = q({ kind: 'single', price: 4000n, steps: [{ pct: 10, up: true }] });
    expect(x.params.answer).toBe('$44.00');
    expect(codes(x)).toMatchObject({ '$50.00': 'PC-M1', '$4.00': 'PC-M2', '$36.00': 'PC-M3' });
  });
  it('$80 down 25% → $60.00', () => {
    expect(q({ kind: 'single', price: 8000n, steps: [{ pct: 25, up: false }] }).params.answer).toBe('$60.00');
  });
  it('$36.50 up 12% → $40.88', () => {
    expect(q({ kind: 'single', price: 3650n, steps: [{ pct: 12, up: true }] }).params.answer).toBe('$40.88');
  });
  it('$50 up 20% then down 20% → $48.00; M4 $50.00', () => {
    const x = q({
      kind: 'successive',
      price: 5000n,
      steps: [
        { pct: 20, up: true },
        { pct: 20, up: false },
      ],
    });
    expect(x.params.answer).toBe('$48.00');
    expect(codes(x)['$50.00']).toBe('PC-M4');
    const steps = pcWalkthrough(x);
    expect(steps.map((s) => s.explain.id)).toContain('pc.walk.notBack');
    expect(steps.at(-1)!.math![0]).toBe('1.20 \\times 0.80 = 0.96');
  });
  it('up 25% then down 20% does get back: the walkthrough says so instead of "not back"', () => {
    const x = q({
      kind: 'successive',
      price: 4000n,
      steps: [
        { pct: 25, up: true },
        { pct: 20, up: false },
      ],
    });
    expect(x.params.answer).toBe('$40.00');
    const back = pcWalkthrough(x).find((s) => s.explain.id === 'pc.walk.backExactly')!;
    expect(back.math).toEqual(['1.25 \\times 0.80 = 1.00']);
  });
  it('up 20% then down 10% → PC-M5 treats it as up 10%', () => {
    const x = q({
      kind: 'successive',
      price: 5000n,
      steps: [
        { pct: 20, up: true },
        { pct: 10, up: false },
      ],
    });
    expect(x.params.answer).toBe('$54.00');
    expect(codes(x)['$55.00']).toBe('PC-M5');
  });
  it('$60 after 25% off → $80.00; M6 $75.00', () => {
    const x = q({ kind: 'reverse', price: 6000n, steps: [{ pct: 25, up: false }] });
    expect(x.params.answer).toBe('$80.00');
    expect(codes(x)['$75.00']).toBe('PC-M6');
    expect(pcWalkthrough(x)[1]!.math![0]).toBe('\\text{\\$60.00} \\div 0.75 = \\text{\\$80.00}');
  });
  it('$66 after a 10% increase → $60.00; M7 $59.40', () => {
    const x = q({ kind: 'reverse', price: 6600n, steps: [{ pct: 10, up: true }] });
    expect(x.params.answer).toBe('$60.00');
    expect(codes(x)['$59.40']).toBe('PC-M7');
  });
  it('an inexact price is refused (R-PC-1)', () => {
    expect(pcQuestion({ kind: 'single', price: 3651n, steps: [{ pct: 12, up: true }] }, 2, 1)).toBeNull();
  });
});
