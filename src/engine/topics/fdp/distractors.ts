// FDP distractors (requirements §6.3, R-ANS-2): FDP-M1…M7, used where the direction allows. Every
// candidate is a value shown in the target form, so R-ANS-3 compares values, not strings.
import { add, gcd, isInteger, mul, rat, sign, sub, type Rational } from '../../rational';
import { fromRational, isRepeating } from '../../numbers/decimal';
import { showDecimalOf, showFraction, showPercentOf, type Notation, type Shown } from '../../numbers/display';
import { FILLER, type McCandidate } from '../mc';

/** F = fraction, D = decimal, P = percent. */
export type FdpForm = 'F' | 'D' | 'P';
export type FractionForm = 'improper' | 'mixed';

const ten = (k: number): bigint => 10n ** BigInt(k);
const floorR = (x: Rational): bigint => x.n / x.d; // x > 0 here

export function showAs(v: Rational, target: FdpForm, notation: Notation, form: FractionForm): Shown {
  if (target === 'F') return showFraction(v, form);
  if (target === 'D') return showDecimalOf(v, notation);
  return showPercentOf(v, notation);
}

/** A terminating value written as digits over a power of ten, before simplifying: 0.375 → 375/1000. */
export function overPowerOfTen(x: Rational): { n: bigint; d: bigint } {
  const places = fromRational(x).nonRep.length;
  return { n: (x.n * ten(places)) / x.d, d: ten(places) };
}

export interface FdpSpec {
  x: Rational;
  source: FdpForm;
  target: FdpForm;
  notation: Notation;
  form: FractionForm;
  /** At levels 1–3 no option may be a repeating decimal (no ellipsis-only display, R-DISP-3). */
  allowRepeating: boolean;
}

function keep(spec: FdpSpec, v: Rational): boolean {
  if (sign(v) <= 0) return false;
  if (spec.target !== 'F' && !spec.allowRepeating && isRepeating(fromRational(v))) return false;
  return true;
}

export function fdpModels(spec: FdpSpec): McCandidate[] {
  const { x, source, target } = spec;
  const out: { v: Rational; code: string }[] = [];
  const add1 = (v: Rational, code: string) => out.push({ v, code });
  const times = (k: number) => mul(x, rat(k));
  const over = (k: number) => mul(x, rat(1, k));

  // FDP-M4: percent over 10 instead of 100 (35% → 35/10). Listed first so it keeps its code
  // when it has the same value as an FDP-M1 candidate.
  if (source === 'P' && target !== 'P') add1(times(10), 'FDP-M4');
  // FDP-M1: the decimal point moved the wrong way or the wrong number of places.
  if (target === 'P') [over(10), times(10), over(100)].forEach((v) => add1(v, 'FDP-M1'));
  else [times(10), over(10), ...(source === 'P' ? [times(100)] : [])].forEach((v) => add1(v, 'FDP-M1'));
  // FDP-M2: the fraction's digits read as a decimal (3/8 → 0.38, 2¼ → 2.14).
  if (source === 'F') {
    const w = floorR(x);
    const part = sub(x, rat(w));
    if (!isInteger(part)) {
      const nd = `${part.n}${part.d}`;
      add1(add(rat(w), rat(BigInt(nd), ten(nd.length))), 'FDP-M2');
    }
  }
  // FDP-M3: the reciprocal.
  add1(rat(x.d, x.n), 'FDP-M3');
  // FDP-M5: simplified with the wrong divisor, not equal (35/100 → 7/25).
  if (target === 'F' && source !== 'F' && !isRepeating(fromRational(x))) {
    const raw = source === 'D' ? overPowerOfTen(x) : overPowerOfTen(mul(x, rat(100)));
    const N = raw.n;
    const D = source === 'D' ? raw.d : raw.d * 100n;
    const g = gcd(N, D);
    if (g > 1n) {
      let found = 0;
      for (const h of [2n, 4n, 5n, 10n, 20n, 25n, 50n]) {
        if (found === 2) break;
        if (h !== g && D % h === 0n && D / h > 0n) {
          add1(rat(N / g, D / h), 'FDP-M5');
          found++;
        }
      }
    }
  }
  // FDP-M6: a repeating value truncated (1/3 → 33% or 0.33).
  if (isRepeating(fromRational(x))) add1(rat((x.n * 100n) / x.d, 100n), 'FDP-M6');
  // FDP-M7: the whole part dropped (2¼ → 25%).
  if (floorR(x) >= 1n && !isInteger(x)) add1(sub(x, rat(floorR(x))), 'FDP-M7');

  return out
    .filter((c) => keep(spec, c.v))
    .map((c) => ({ value: c.v, shown: showAs(c.v, target, spec.notation, spec.form), code: c.code }));
}

/** Near misses in the target form, for when the models give fewer than 4 (R-ANS-2). */
export function* fdpFillers(spec: FdpSpec): Generator<McCandidate> {
  const { x } = spec;
  const make = (v: Rational): McCandidate | null =>
    keep(spec, v)
      ? { value: v, shown: showAs(v, spec.target, spec.notation, spec.form), code: FILLER }
      : null;
  if (spec.target === 'F') {
    for (let i = 1n; i < 60n; i++)
      for (const n of [x.n + i, x.n - i]) {
        const c = n > 0n ? make(rat(n, x.d)) : null;
        if (c) yield c;
      }
    return;
  }
  const rep = fromRational(spec.target === 'P' ? mul(x, rat(100)) : x);
  const places = Math.max(1, rep.block ? 2 : rep.nonRep.length);
  const unit = spec.target === 'P' ? rat(1, 100n * ten(places)) : rat(1, ten(places));
  for (let i = 1; i < 60; i++) {
    for (const v of [add(x, mul(unit, rat(i))), sub(x, mul(unit, rat(i)))]) {
      const c = make(v);
      if (c) yield c;
    }
  }
}
