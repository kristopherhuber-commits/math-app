// NC checker (requirements §6.1, R-NC-1/2): set membership from the number's exact value. A disguised
// form (12/4, 3.0, 0.999…) is reduced first, because the value is what decides.
import { isInteger, sign, type Rational } from '../../rational';
import type { NcSet } from '../walk';

/** The set cards, in order. Real is not one: every number shown is real (parent decision, 2026-09-25). */
export const NC_SETS: readonly NcSet[] = ['natural', 'whole', 'integer', 'rational', 'irrational'];

/** A patterned irrational decimal (R-DISP-4): its digits follow a rule that never repeats. */
export interface IrrationalPattern {
  /** growingZeros: d, 0d, 00d, 000d, … (one more 0 each time); counting: 1 2 3 … 9 10 11 12 … */
  family: 'growingZeros' | 'counting';
  whole: number;
  digit: number;
  /** growingZeros: the digit comes first (0.1010010001…) or a zero does (2.020020002…). */
  lead: boolean;
  negative: boolean;
}

export type NcValue =
  { kind: 'rational'; value: Rational } | { kind: 'irrational'; pattern: IrrationalPattern };

export function ncMembership(v: NcValue, naturalIncludesZero: boolean): Record<NcSet, boolean> {
  if (v.kind === 'irrational')
    return { natural: false, whole: false, integer: false, rational: false, irrational: true };
  const x = v.value;
  const integer = isInteger(x);
  const s = sign(x);
  return {
    natural: integer && (s > 0 || (s === 0 && naturalIncludesZero)),
    whole: integer && s >= 0,
    integer,
    rational: true,
    irrational: false,
  };
}

/** The smallest set the number belongs to: where it sits on the sets map. */
export function innermostSet(v: NcValue, naturalIncludesZero: boolean): NcSet {
  const m = ncMembership(v, naturalIncludesZero);
  return NC_SETS.find((s) => m[s])!;
}

/** R-NC-2: correct means exactly the right boxes. `mismatched` feeds R-NC-3's outlines. */
export function checkSets(
  v: NcValue,
  ticked: ReadonlySet<NcSet>,
  naturalIncludesZero: boolean,
): { correct: boolean; mismatched: NcSet[] } {
  const m = ncMembership(v, naturalIncludesZero);
  const mismatched = NC_SETS.filter((s) => m[s] !== ticked.has(s));
  return { correct: mismatched.length === 0, mismatched };
}
