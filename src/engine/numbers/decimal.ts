// Decimal expansions of rationals, exactly (R-ARCH-2, R-RD-2, R-RD-3). A decimal is
// whole . nonRep block block block …; a terminating decimal has an empty block.
import { rat, type Rational } from '../rational';

export interface DecimalRep {
  negative: boolean;
  /** Digits before the point, as a non-negative integer. */
  whole: bigint;
  /** Digits after the point that come before the repeating block (m = its length). */
  nonRep: string;
  /** The repeating block (k = its length); '' for a terminating decimal. */
  block: string;
}

const abs = (x: bigint): bigint => (x < 0n ? -x : x);
const ten = (k: number): bigint => 10n ** BigInt(k);

/** One row of long division: bring down a 0 onto the remainder, divide, keep the new remainder. */
export interface DivisionRow {
  /** Remainder before this row. */
  from: bigint;
  /** from × 10 */
  dividend: bigint;
  digit: number;
  remainder: bigint;
}

export interface LongDivision {
  numerator: bigint;
  denominator: bigint;
  /** numerator ÷ denominator, the digits before the point. */
  whole: bigint;
  /** The remainder after the whole part. */
  firstRemainder: bigint;
  rows: DivisionRow[];
  /**
   * For a repeating decimal: `row` is the last row, whose remainder was seen before (it is the
   * `from` of row `firstSeen`). That is the moment the digits must start repeating. Null when the
   * division terminates.
   */
  repeat: { row: number; firstSeen: number } | null;
}

/** Long division of |n| by d > 0 (R-RD-3). Stops when a remainder is 0 or a remainder comes back. */
export function longDivision(n: bigint, d: bigint): LongDivision {
  if (d <= 0n) throw new RangeError('denominator must be positive');
  const num = abs(n);
  const whole = num / d;
  let r = num % d;
  const firstRemainder = r;
  const seen = new Map<bigint, number>();
  const rows: DivisionRow[] = [];
  while (r !== 0n) {
    const at = seen.get(r);
    if (at !== undefined) {
      const repeat = { row: rows.length - 1, firstSeen: at };
      return { numerator: num, denominator: d, whole, firstRemainder, rows, repeat };
    }
    seen.set(r, rows.length);
    const dividend = r * 10n;
    const digit = Number(dividend / d);
    const remainder = dividend % d;
    rows.push({ from: r, dividend, digit, remainder });
    r = remainder;
  }
  return { numerator: num, denominator: d, whole, firstRemainder, rows, repeat: null };
}

/** The decimal expansion of a rational, with the shortest prefix and block (canonical). */
export function fromRational(x: Rational): DecimalRep {
  const ld = longDivision(x.n, x.d);
  const digits = ld.rows.map((r) => r.digit).join('');
  const negative = x.n < 0n;
  if (!ld.repeat) return { negative, whole: ld.whole, nonRep: digits, block: '' };
  const m = ld.repeat.firstSeen;
  return { negative, whole: ld.whole, nonRep: digits.slice(0, m), block: digits.slice(m) };
}

/**
 * The exact value (R-RD-2):
 *   x = ((all digits through one block) − (digits before the block)) / (10^m (10^k − 1)),
 * or whole.nonRep / 10^m when there is no block.
 */
export function toRational(rep: DecimalRep): Rational {
  const m = rep.nonRep.length;
  const k = rep.block.length;
  const before = BigInt(`${rep.whole}${rep.nonRep}`);
  let v: Rational;
  if (k === 0) v = rat(before, ten(m));
  else {
    const through = BigInt(`${rep.whole}${rep.nonRep}${rep.block}`);
    v = rat(through - before, ten(m) * (ten(k) - 1n));
  }
  return rep.negative ? rat(-v.n, v.d) : v;
}

/** True when the block is a repetition of a shorter block ("44" → "4", "1212" → "12"). */
export function isPeriodicBlock(block: string): boolean {
  const k = block.length;
  for (let p = 1; p < k; p++) if (k % p === 0 && block.slice(0, p).repeat(k / p) === block) return true;
  return false;
}

/** True when rep is the canonical (shortest) form of its own value: R-RD-2's normalisation. */
export function isCanonical(rep: DecimalRep): boolean {
  if (/^9+$/.test(rep.block) || /^0+$/.test(rep.block)) return false;
  const c = fromRational(toRational(rep));
  return c.whole === rep.whole && c.nonRep === rep.nonRep && c.block === rep.block;
}

export const isRepeating = (rep: DecimalRep): boolean => rep.block !== '';

/** Digits after the point, showing the block `times` times: 4.2424… → "242424". */
export function fractionDigits(rep: DecimalRep, times: number): string {
  return rep.nonRep + rep.block.repeat(times);
}
