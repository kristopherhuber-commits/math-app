// RD distractors from misconception models (requirements §6.2, R-ANS-2). D→F uses RD-M1…M6 as
// listed in the spec. The spec lists the F→D misconceptions without codes; they are RD-F1…F5 here.
import { add, isZero, rat, sign, sub, type Rational } from '../../rational';
import { fromRational, toRational, type DecimalRep } from '../../numbers/decimal';
import { showDecimalOf, showFraction, type Notation } from '../../numbers/display';
import { FILLER, type McCandidate } from '../mc';

const ten = (k: number): bigint => 10n ** BigInt(k);
const big = (digits: string): bigint => (digits === '' ? 0n : BigInt(digits));
const positive = (c: McCandidate): boolean => sign(c.value) > 0;
const frac = (value: Rational, code: string): McCandidate => ({ value, shown: showFraction(value), code });

/** D→F misconception candidates for x = whole.nonRep(block)… (R-ANS-2). */
export function d2fModels(rep: DecimalRep): McCandidate[] {
  const w = rep.whole;
  const m = rep.nonRep.length;
  const k = rep.block.length;
  const through = big(`${w}${rep.nonRep}${rep.block}`);
  const before = big(`${w}${rep.nonRep}`);
  const nines = (kk: number) => ten(m) * (ten(kk) - 1n);
  const out: McCandidate[] = [
    // RD-M1: block over 9s, ignoring the whole part (and anything before the block).
    frac(rat(big(rep.block), ten(k) - 1n), 'RD-M1'),
    // RD-M2: the digits over 9s without subtracting the part that doesn't repeat.
    frac(rat(through, nines(k)), 'RD-M2'),
  ];
  // RD-M3: the wrong number of 9s.
  if (k >= 2) out.push(frac(rat(through - before, nines(k - 1)), 'RD-M3'));
  out.push(frac(rat(through - before, nines(k + 1)), 'RD-M3'));
  // RD-M4: treated as terminating, cut after one block (4.24).
  out.push(frac(rat(through, ten(m + k)), 'RD-M4'));
  if (m > 0) {
    // RD-M5 (delayed): forgot the 10^m shift, e.g. 0.41666… → 416/999 or 41/99.
    out.push(frac(add(rat(w), rat(big(rep.nonRep + rep.block), ten(m + k) - 1n)), 'RD-M5'));
    out.push(frac(add(rat(w), rat(big(rep.nonRep), ten(m) - 1n)), 'RD-M5'));
  }
  // RD-M6: block over 10s (usually the same value as RD-M4, and then dropped as a duplicate).
  out.push(frac(add(rat(w), rat(big(rep.block), ten(k))), 'RD-M6'));
  return out.filter(positive);
}

/** Near-miss fractions for when the models give fewer than 4 (R-ANS-2): (n ± i)/d. */
export function* fractionFillers(answer: Rational): Generator<McCandidate> {
  for (let i = 1n; i < 50n; i++) {
    for (const n of [answer.n + i, answer.n - i]) {
      if (n > 0n) yield frac(rat(n, answer.d), FILLER);
    }
  }
}

const dec = (value: Rational, code: string, notation: Notation): McCandidate => ({
  value,
  shown: showDecimalOf(value, notation),
  code,
});

/** Digits kept by the "truncated" misconception: at least 2, or one full prefix + block. */
export const truncPlaces = (rep: DecimalRep): number => Math.max(2, rep.nonRep.length + rep.block.length);

/** F→D misconception candidates for x = n/d, 0 < x < 1 (§6.2 "F→D distractors"). */
export function f2dModels(x: Rational, notation: Notation): McCandidate[] {
  const rep = fromRational(x);
  const places = truncPlaces(rep);
  const digits = (rep.nonRep + rep.block.repeat(places)).slice(0, places);
  const out: McCandidate[] = [
    // RD-F1: the truncated terminating version (0.83 for 5/6).
    dec(rat(big(`${rep.whole}${digits}`), ten(places)), 'RD-F1', notation),
  ];
  // RD-F2: the wrong repeating block (0.8383… for 5/6).
  if (rep.nonRep !== '')
    out.push(dec(toRational({ ...rep, nonRep: '', block: rep.nonRep + rep.block }), 'RD-F2', notation));
  const reversed = [...rep.block].reverse().join('');
  if (reversed !== rep.block) out.push(dec(toRational({ ...rep, block: reversed }), 'RD-F2', notation));
  // RD-F3: the repeat starts too early (0.666… for 1/6).
  if (rep.nonRep !== '') out.push(dec(toRational({ ...rep, nonRep: '' }), 'RD-F3', notation));
  // RD-F4: numerator and denominator digits side by side (0.56 for 5/6).
  const nd = `${x.n}${x.d}`;
  out.push(dec(rat(big(nd), ten(nd.length)), 'RD-F4', notation));
  // RD-F5: the reciprocal (1.2 for 5/6).
  out.push(dec(rat(x.d, x.n), 'RD-F5', notation));
  return out.filter((c) => !isZero(c.value));
}

/** Near-miss terminating decimals: the truncated value ± i in the last kept place. */
export function* decimalFillers(x: Rational, notation: Notation): Generator<McCandidate> {
  const places = truncPlaces(fromRational(x));
  const step = rat(1, ten(places));
  const base = rat((x.n * ten(places)) / x.d, ten(places));
  for (let i = 1; i < 50; i++) {
    const delta = rat(BigInt(i) * step.n, step.d);
    for (const v of [add(base, delta), sub(base, delta)]) {
      if (sign(v) > 0) yield dec(v, FILLER, notation);
    }
  }
}
