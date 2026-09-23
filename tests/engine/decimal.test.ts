// R-RD-2, R-RD-3, R-DISP-1/3/5: exact decimal expansions and how they are shown.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  fromRational,
  isCanonical,
  isPeriodicBlock,
  longDivision,
  toRational,
  type DecimalRep,
} from '../../src/engine/numbers/decimal';
import {
  showDecimal,
  showDecimalOf,
  showFraction,
  showMoney,
  showPercentOf,
} from '../../src/engine/numbers/display';
import { add, eq, rat, type Rational } from '../../src/engine/rational';

const rep = (whole: number, nonRep: string, block: string, negative = false): DecimalRep => ({
  negative,
  whole: BigInt(whole),
  nonRep,
  block,
});

/** Independent of R-RD-2: whole + nonRep/10^m + block/(10^m (10^k − 1)) (a geometric series). */
function seriesValue(r: DecimalRep): Rational {
  const m = r.nonRep.length;
  const k = r.block.length;
  let v = rat(r.whole);
  if (m) v = add(v, rat(BigInt(r.nonRep), 10n ** BigInt(m)));
  if (k) v = add(v, rat(BigInt(r.block), 10n ** BigInt(m) * (10n ** BigInt(k) - 1n)));
  return r.negative ? rat(-v.n, v.d) : v;
}

describe('toRational (R-RD-2)', () => {
  it.each([
    [rep(4, '', '24'), rat(140, 33)],
    [rep(0, '41', '6'), rat(5, 12)],
    [rep(2, '31', '81'), rat(51, 22)],
    [rep(0, '', '3'), rat(1, 3)],
    [rep(0, '', '546'), rat(182, 333)],
    [rep(0, '1', '6'), rat(1, 6)],
    [rep(0, '', '9'), rat(1)],
    [rep(3, '', '', true), rat(-3)],
    [rep(0, '375', ''), rat(3, 8)],
  ])('%o = %o', (r, v) => {
    expect(toRational(r)).toEqual(v);
  });

  it('agrees with the geometric series for random digits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.stringMatching(/^[0-9]{0,3}$/),
        fc.stringMatching(/^[0-9]{0,4}$/),
        fc.boolean(),
        (w, nonRep, block, negative) => {
          const r = rep(w, nonRep, block, negative);
          expect(eq(toRational(r), seriesValue(r))).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe('fromRational (R-RD-3)', () => {
  it.each([
    [rat(140, 33), rep(4, '', '24')],
    [rat(5, 12), rep(0, '41', '6')],
    [rat(51, 22), rep(2, '3', '18')],
    [rat(1, 7), rep(0, '', '142857')],
    [rat(1, 6), rep(0, '1', '6')],
    [rat(-5, 8), rep(0, '625', '', true)],
    [rat(7), rep(7, '', '')],
  ])('%o → %o', (x, r) => {
    expect(fromRational(x)).toEqual(r);
  });

  it('round-trips and is canonical: shortest prefix, block not periodic', () => {
    fc.assert(
      fc.property(fc.integer({ min: -5000, max: 5000 }), fc.integer({ min: 1, max: 400 }), (n, d) => {
        const x = rat(n, d);
        const r = fromRational(x);
        expect(eq(toRational(r), x)).toBe(true);
        expect(eq(seriesValue(r), x)).toBe(true);
        expect(isPeriodicBlock(r.block)).toBe(false);
        expect(isCanonical(r)).toBe(true);
        // A tail digit that could be absorbed into the block would equal the block's last digit.
        if (r.block && r.nonRep) expect(r.nonRep.at(-1)).not.toBe(r.block.at(-1));
      }),
      { numRuns: 1000 },
    );
  });
});

describe('normalisation (R-RD-2)', () => {
  it('rejects periodic blocks and absorbable tails', () => {
    expect(isPeriodicBlock('44')).toBe(true);
    expect(isPeriodicBlock('1212')).toBe(true);
    expect(isPeriodicBlock('24')).toBe(false);
    expect(isCanonical(rep(0, '', '44'))).toBe(false);
    expect(isCanonical(rep(0, '16', '6'))).toBe(false);
    expect(isCanonical(rep(0, '1', '6'))).toBe(true);
    expect(isCanonical(rep(0, '', '9'))).toBe(false);
    expect(isCanonical(rep(0, '5', '0'))).toBe(false);
  });
});

describe('longDivision', () => {
  it('5/6: the remainder 2 comes back', () => {
    const ld = longDivision(5n, 6n);
    expect(ld.rows.map((r) => r.digit)).toEqual([8, 3]);
    expect(ld.rows.map((r) => r.remainder)).toEqual([2n, 2n]);
    expect(ld.repeat).toEqual({ row: 1, firstSeen: 1 });
  });
  it('1/7: six digits, then remainder 1 again', () => {
    const ld = longDivision(1n, 7n);
    expect(ld.rows.map((r) => r.digit).join('')).toBe('142857');
    expect(ld.rows.at(-1)!.remainder).toBe(1n);
    expect(ld.repeat).toEqual({ row: 5, firstSeen: 0 });
  });
  it('3/8 terminates', () => {
    const ld = longDivision(3n, 8n);
    expect(ld.rows.map((r) => r.digit).join('')).toBe('375');
    expect(ld.repeat).toBeNull();
  });
  it('the repeated remainder is the from of row firstSeen', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3000 }), fc.integer({ min: 1, max: 300 }), (n, d) => {
        const ld = longDivision(BigInt(n), BigInt(d));
        if (ld.repeat) expect(ld.rows[ld.repeat.row]!.remainder).toBe(ld.rows[ld.repeat.firstSeen]!.from);
        for (const r of ld.rows) {
          expect(r.dividend).toBe(r.from * 10n);
          expect(BigInt(r.digit) * BigInt(d) + r.remainder).toBe(r.dividend);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('display (R-DISP-1/2/3/5)', () => {
  it('repeating decimals show the block 3 times, with the caption', () => {
    const s = showDecimal(rep(4, '', '24'), 'ellipsis');
    expect(s.text).toBe('4.242424…');
    expect(s.latex).toBe('4.242424\\text{…}');
    expect(s.caption).toEqual({ id: 'num.caption.block', params: { block: '24' } });
    expect(showDecimal(rep(0, '41', '6'), 'ellipsis').text).toBe('0.41666…');
  });
  it('both notations', () => {
    const s = showDecimal(rep(4, '', '24'), 'both');
    expect(s.latex).toBe('4.242424\\text{…}');
    expect(s.latex2).toBe('= 4.\\overline{24}');
    expect(showDecimal(rep(4, '', '24'), 'bar').latex).toBe('4.\\overline{24}');
  });
  it('percents', () => {
    expect(showPercentOf(rat(3, 8), 'both').text).toBe('37.5%');
    expect(showPercentOf(rat(1, 3), 'ellipsis').text).toBe('33.333…%');
    expect(showPercentOf(rat(1, 3), 'both').latex2).toBe('= 33.\\overline{3}\\%');
    expect(showPercentOf(rat(9, 4), 'both').text).toBe('225%');
    expect(showPercentOf(rat(1, 250), 'both').text).toBe('0.4%');
  });
  it('fractions: true minus, lowest terms, mixed numbers', () => {
    expect(showFraction(rat(-5, 8)).text).toBe('−5/8');
    expect(showFraction(rat(-5, 8)).latex).toBe('-\\frac{5}{8}');
    expect(showFraction(rat(9, 4), 'mixed').latex).toBe('2\\frac{1}{4}');
    expect(showFraction(rat(9, 4), 'improper').text).toBe('9/4');
    expect(showFraction(rat(1, 4), 'mixed').text).toBe('1/4');
    expect(showDecimalOf(rat(-2, 5), 'both').text).toBe('−0.4');
  });
  it('money has exactly two decimals', () => {
    expect(showMoney(4800n).text).toBe('$48.00');
    expect(showMoney(6050n).text).toBe('$60.50');
    expect(showMoney(5n).text).toBe('$0.05');
  });
  it('never a hyphen-minus in text', () => {
    fc.assert(
      fc.property(fc.integer({ min: -999, max: 999 }), fc.integer({ min: 1, max: 60 }), (n, d) => {
        const x = rat(n, d);
        for (const s of [
          showFraction(x),
          showFraction(x, 'mixed'),
          showDecimalOf(x, 'both'),
          showPercentOf(x, 'both'),
        ])
          expect(s.text).not.toContain('-');
      }),
      { numRuns: 500 },
    );
  });
});
