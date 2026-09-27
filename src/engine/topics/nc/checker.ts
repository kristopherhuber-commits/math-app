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

/** Natural numbers are 1, 2, 3, … (parent decision 2026-09-27: 0 is whole, not natural; no setting). */
export function ncMembership(v: NcValue): Record<NcSet, boolean> {
  if (v.kind === 'irrational')
    return { natural: false, whole: false, integer: false, rational: false, irrational: true };
  const x = v.value;
  const integer = isInteger(x);
  const s = sign(x);
  return {
    natural: integer && s > 0,
    whole: integer && s >= 0,
    integer,
    rational: true,
    irrational: false,
  };
}

/** The smallest set the number belongs to: where it sits on the sets map. */
export function innermostSet(v: NcValue): NcSet {
  const m = ncMembership(v);
  return NC_SETS.find((s) => m[s])!;
}

/**
 * R-NC-2/3 (M7): the answer is the smallest set. A card that isn't it is either a larger set that
 * still contains the number (`contains`) or a set it isn't in (`notIn`); the feedback line says which.
 */
export function checkSmallest(
  v: NcValue,
  chosen: NcSet,
): { correct: true } | { correct: false; code: 'NC-CONTAINS' | 'NC-NOT-IN' } {
  if (chosen === innermostSet(v)) return { correct: true };
  return { correct: false, code: ncMembership(v)[chosen] ? 'NC-CONTAINS' : 'NC-NOT-IN' };
}
