// R-TEST-1
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  add,
  cmp,
  div,
  eq,
  formatRational,
  isInteger,
  mul,
  neg,
  parseRational,
  rat,
  sub,
  toFixedPlaces,
} from '../../src/engine/rational';

const small = fc.integer({ min: -1000, max: 1000 });
const nonZero = small.filter((x) => x !== 0);
const arbRat = fc.tuple(small, nonZero).map(([n, d]) => rat(n, d));

describe('normalize', () => {
  it('reduces and moves the sign to the numerator', () => {
    expect(rat(14, 6)).toEqual(rat(7, 3));
    expect(rat(3, -6)).toEqual({ n: -1n, d: 2n });
    expect(rat(-8, -2)).toEqual({ n: 4n, d: 1n });
  });
  it('normalizes zero', () => {
    expect(rat(0, -5)).toEqual({ n: 0n, d: 1n });
  });
  it('rejects a zero denominator', () => {
    expect(() => rat(1, 0)).toThrow();
  });
});

describe('arithmetic', () => {
  it('adds exactly (0.1 + 0.2 = 0.3)', () => {
    expect(eq(add(rat(1, 10), rat(2, 10)), rat(3, 10))).toBe(true);
  });
  it('sub, mul, div with negatives', () => {
    expect(sub(rat(1, 3), rat(1, 2))).toEqual(rat(-1, 6));
    expect(mul(rat(-2, 3), rat(3, 4))).toEqual(rat(-1, 2));
    expect(div(rat(-5), rat(3))).toEqual(rat(-5, 3));
    expect(() => div(rat(1), rat(0))).toThrow();
  });
  it('field laws hold', () => {
    fc.assert(
      fc.property(arbRat, arbRat, (a, b) => {
        expect(sub(add(a, b), b)).toEqual(a);
        expect(add(a, neg(a))).toEqual(rat(0));
        if (b.n !== 0n) expect(mul(div(a, b), b)).toEqual(a);
      }),
    );
  });
  it('compare', () => {
    expect(cmp(rat(1, 3), rat(1, 2))).toBe(-1);
    expect(cmp(rat(-1, 2), rat(-2, 4))).toBe(0);
    expect(cmp(rat(0), rat(-1))).toBe(1);
  });
  it('handles numbers beyond 2^53 exactly', () => {
    const big = rat(10n ** 30n + 1n);
    expect(sub(big, rat(10n ** 30n))).toEqual(rat(1));
  });
});

describe('parse', () => {
  it.each([
    ['3', rat(3)],
    ['-14/6', rat(-7, 3)],
    ['−5/3', rat(-5, 3)],
    ['2.5', rat(5, 2)],
    ['-0.125', rat(-1, 8)],
    ['.5', rat(1, 2)],
    ['0', rat(0)],
  ])('%s', (text, value) => {
    expect(parseRational(text)).toEqual(value);
  });
  it.each(['', '1/0', 'abc', '1.2.3', '--1'])('rejects %j', (text) => {
    expect(parseRational(text)).toBeNull();
  });
});

describe('format', () => {
  it('uses a true minus sign (R-DISP-1)', () => {
    expect(formatRational(rat(-5, 3))).toBe('−5/3');
    expect(formatRational(rat(7))).toBe('7');
    expect(formatRational(rat(0))).toBe('0');
  });
  it('round-trips through parse', () => {
    fc.assert(
      fc.property(arbRat, (a) => {
        expect(parseRational(formatRational(a))).toEqual(a);
      }),
    );
  });
});

describe('toFixedPlaces', () => {
  it('rounds and truncates', () => {
    expect(toFixedPlaces(rat(7, 3), 2, 'round')).toEqual(rat(233, 100));
    expect(toFixedPlaces(rat(2, 3), 2, 'round')).toEqual(rat(67, 100));
    expect(toFixedPlaces(rat(2, 3), 2, 'trunc')).toEqual(rat(66, 100));
    expect(toFixedPlaces(rat(-5, 3), 1, 'round')).toEqual(rat(-17, 10));
  });
  it('isInteger', () => {
    expect(isInteger(rat(12, 4))).toBe(true);
    expect(isInteger(rat(1, 4))).toBe(false);
  });
});
