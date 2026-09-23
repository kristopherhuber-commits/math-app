// How numbers are shown (R-DISP-1…5, R-PLAT-6): true minus sign, stacked fractions, mixed numbers,
// repeating decimals with the block at least 3 times before the ellipsis, bar notation, money with
// exactly 2 decimals. Output is LaTeX for KaTeX plus a plain text form (unique per value and form,
// used for distinct options and for records) and words for screen readers.
import { absR, isInteger, rat, type Rational } from '../rational';
import { content, type HintContent } from '../topics/content';
import { fromRational, isRepeating, type DecimalRep } from './decimal';

export const MINUS = '−';
/** R-DISP-3: the repeating block is shown at least this many times before the ellipsis. */
export const BLOCK_TIMES = 3;

/** ellipsis: 4.242424… · both: 4.242424… = 4.\overline{24} · bar: 4.\overline{24} */
export type Notation = 'ellipsis' | 'both' | 'bar';

export interface Shown {
  /** 'math' is rendered with KaTeX; 'money' and 'text' are plain text in the UI face (design.md §2.2). */
  kind: 'math' | 'money' | 'text';
  latex: string;
  /** Second line when two forms are stacked (notation 'both'): "= 4.\overline{24}". */
  latex2?: string;
  text: string;
  speech: string;
  /** R-DISP-3 / R-DISP-4: the caption that makes a finite display unambiguous. */
  caption?: HintContent;
}

const OVERLINE = '̅';

const signOf = (negative: boolean) => ({ latex: negative ? '-' : '', text: negative ? MINUS : '' });

export function showInteger(n: bigint): Shown {
  const s = signOf(n < 0n);
  const m = n < 0n ? -n : n;
  return {
    kind: 'math',
    latex: `${s.latex}${m}`,
    text: `${s.text}${m}`,
    speech: `${n < 0n ? 'minus ' : ''}${m}`,
  };
}

/** A fraction in lowest terms; `mixed` shows |x| > 1 as whole + stacked fraction (R-DISP-2). */
export function showFraction(x: Rational, form: 'improper' | 'mixed' = 'improper'): Shown {
  if (isInteger(x)) return showInteger(x.n);
  const s = signOf(x.n < 0n);
  const m = absR(x);
  const word = x.n < 0n ? 'minus ' : '';
  if (form === 'mixed' && m.n > m.d) {
    const w = m.n / m.d;
    const r = m.n % m.d;
    return {
      kind: 'math',
      latex: `${s.latex}${w}\\frac{${r}}{${m.d}}`,
      text: `${s.text}${w} ${r}/${m.d}`,
      speech: `${word}${w} and ${r} over ${m.d}`,
    };
  }
  return {
    kind: 'math',
    latex: `${s.latex}\\frac{${m.n}}{${m.d}}`,
    text: `${s.text}${m.n}/${m.d}`,
    speech: `${word}${m.n} over ${m.d}`,
  };
}

function decimalParts(rep: DecimalRep) {
  const s = signOf(rep.negative);
  const point = rep.nonRep !== '' || rep.block !== '' ? '.' : '';
  const ell = `${rep.whole}${point}${rep.nonRep}${rep.block.repeat(BLOCK_TIMES)}`;
  const barText = `${rep.whole}${point}${rep.nonRep}${[...rep.block].map((c) => c + OVERLINE).join('')}`;
  const barLatex = `${rep.whole}${point}${rep.nonRep}\\overline{${rep.block}}`;
  return { s, ell, barText, barLatex };
}

/** The "the block 24 repeats forever" caption (R-DISP-3). */
export const blockCaption = (rep: DecimalRep): HintContent =>
  content('num.caption.block', { block: rep.block });

/** A decimal. `suffix` is '%' for percents (R-FDP-3 displays repeating percents like decimals). */
export function showDecimal(rep: DecimalRep, notation: Notation, suffix: '' | '%' = ''): Shown {
  const { s, ell, barText, barLatex } = decimalParts(rep);
  const texSuffix = suffix ? '\\%' : '';
  const spokenSuffix = suffix ? ' percent' : '';
  const word = rep.negative ? 'minus ' : '';
  if (!isRepeating(rep)) {
    return {
      kind: 'math',
      latex: `${s.latex}${ell}${texSuffix}`,
      text: `${s.text}${ell}${suffix}`,
      speech: `${word}${ell}${spokenSuffix}`,
    };
  }
  const ellLatex = `${s.latex}${ell}\\text{…}${texSuffix}`;
  const ellText = `${s.text}${ell}…${suffix}`;
  const bar = { latex: `${s.latex}${barLatex}${texSuffix}`, text: `${s.text}${barText}${suffix}` };
  const speech = `${word}${ell} repeating${spokenSuffix}, block ${rep.block}`;
  const caption = blockCaption(rep);
  switch (notation) {
    case 'ellipsis':
      return { kind: 'math', latex: ellLatex, text: ellText, speech, caption };
    case 'bar':
      return { kind: 'math', latex: bar.latex, text: bar.text, speech };
    case 'both':
      return {
        kind: 'math',
        latex: ellLatex,
        latex2: `= ${bar.latex}`,
        text: `${ellText} = ${bar.text}`,
        speech,
        caption,
      };
  }
}

export const showDecimalOf = (x: Rational, notation: Notation): Shown =>
  showDecimal(fromRational(x), notation);

/** x as a percent: 3/8 → 37.5%, 1/3 → 33.333…% (and 33.\overline{3}% with bar notation). */
export const showPercentOf = (x: Rational, notation: Notation): Shown =>
  showDecimal(fromRational(rat(x.n * 100n, x.d)), notation, '%');

/** R-DISP-5: money with exactly 2 decimals, e.g. $48.00. */
export function showMoney(cents: bigint, currency = '$'): Shown {
  if (cents < 0n) throw new RangeError('negative price');
  const text = `${currency}${cents / 100n}.${`${cents % 100n}`.padStart(2, '0')}`;
  return { kind: 'money', latex: text, text, speech: text };
}
