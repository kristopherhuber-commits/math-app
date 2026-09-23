// H3 walkthrough steps for the number topics (R-HELP-4, design.md §5 Walkthrough, mockup 07).
// A step has an explanation, optional math lines, and optionally one of: an aligned column
// subtraction, a long division, or a place on the sets map. A step may ask a small inline question
// (3 choices) that gates Next; the step's math lines are its result, revealed once it is answered.
import { eq, type Rational } from '../rational';
import type { Rng } from '../rng';
import type { LongDivision } from '../numbers/decimal';
import type { Shown } from '../numbers/display';
import type { HintContent } from './content';

export type NcSet = 'natural' | 'whole' | 'integer' | 'rational' | 'irrational' | 'real';

/** One line of a column subtraction, aligned on the decimal point. */
export interface ColumnRow {
  /** LaTeX shown to the left, e.g. "100x" (the row's name). */
  label: string;
  sign: '' | '−';
  whole: string;
  /** Digits after the point ('' for none); `tail` marks them as the repeating tail. */
  frac: string;
  ellipsis: boolean;
  tail: boolean;
}

export interface ColumnSubtraction {
  top: ColumnRow;
  bottom: ColumnRow;
  result: ColumnRow;
}

export interface MiniQuestion {
  question: HintContent;
  options: Shown[];
  correct: number;
}

export interface NumWalkStep {
  explain: HintContent;
  /** LaTeX lines; when there is a mini-question they are revealed after it is answered. */
  math?: string[];
  columns?: ColumnSubtraction;
  division?: { ld: LongDivision; highlightRepeat: boolean };
  sets?: { place: NcSet; lit: NcSet[] };
  mini?: MiniQuestion;
  /** A sentence shown with the result, once the mini-question is answered (or at once without one). */
  reveal?: HintContent;
}

/**
 * A 3-choice mini-question: the correct value plus the first two candidates distinct from it and
 * from each other, in a seeded order.
 */
export function miniQuestion(
  rng: Rng,
  question: HintContent,
  correct: { value: Rational; shown: Shown },
  candidates: readonly { value: Rational; shown: Shown }[],
): MiniQuestion {
  const picked = [correct];
  for (const c of candidates) {
    if (picked.length === 3) break;
    if (picked.every((p) => !eq(p.value, c.value) && p.shown.text !== c.shown.text)) picked.push(c);
  }
  if (picked.length < 3) throw new Error('mini-question needs 3 distinct choices');
  const order = rng.shuffle([0, 1, 2]);
  return {
    question,
    options: order.map((i) => picked[i]!.shown),
    correct: order.indexOf(0),
  };
}
