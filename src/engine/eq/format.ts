// Text and LaTeX formatting for equations. Minus is always U+2212 (R-DISP-1); coefficient ±1
// is written as `a` / `−a`, never `1a` (R-EQ-GEN-3).
import { absR, isInteger, sign, type Rational } from '../rational';
import { parseEquation, parseExpression, type Expr } from './parse';

export const MINUS = '−';

/** Magnitude of a term, without its sign: `3a`, `a`, `2p/3`, `x/4`, `7`, `5/3`. */
export function termMagnitude(coef: Rational, isVar: boolean, v: string): string {
  const m = absR(coef);
  if (!isVar) return isInteger(m) ? `${m.n}` : `${m.n}/${m.d}`;
  if (isInteger(m)) return m.n === 1n ? v : `${m.n}${v}`;
  return m.n === 1n ? `${v}/${m.d}` : `${m.n}${v}/${m.d}`;
}

/** A term with a leading sign only when negative: `−3a`, `7`. */
export function termText(coef: Rational, isVar: boolean, v: string): string {
  return (sign(coef) < 0 ? MINUS : '') + termMagnitude(coef, isVar, v);
}

/** Join signed terms into one side: [3a, −a] → `3a − a`. An empty list is `0`. */
export function sideText(terms: readonly { coef: Rational; isVar: boolean }[], v: string): string {
  if (terms.length === 0) return '0';
  return terms
    .map((t, i) => {
      const mag = termMagnitude(t.coef, t.isVar, v);
      if (i === 0) return (sign(t.coef) < 0 ? MINUS : '') + mag;
      return (sign(t.coef) < 0 ? ` ${MINUS} ` : ' + ') + mag;
    })
    .join('');
}

const stripParen = (e: Expr): Expr => (e.kind === 'paren' ? e.inner : e);

/** Render a parsed expression as LaTeX, keeping the learner's own structure. */
export function exprToLatex(e: Expr): string {
  switch (e.kind) {
    case 'num':
      return e.raw;
    case 'var':
      return e.name;
    case 'neg':
      return `-${exprToLatex(e.arg)}`;
    case 'add':
      return `${exprToLatex(e.left)} + ${exprToLatex(e.right)}`;
    case 'sub':
      return `${exprToLatex(e.left)} - ${exprToLatex(e.right)}`;
    case 'mul':
      return e.implicit
        ? `${exprToLatex(e.left)}${exprToLatex(e.right)}`
        : `${exprToLatex(e.left)} \\times ${exprToLatex(e.right)}`;
    case 'div':
      // −5/3 parses as (−5)/3; show the minus in front of the fraction bar.
      if (e.left.kind === 'neg')
        return `-\\frac{${exprToLatex(stripParen(e.left.arg))}}{${exprToLatex(stripParen(e.right))}}`;
      return `\\frac{${exprToLatex(stripParen(e.left))}}{${exprToLatex(stripParen(e.right))}}`;
    case 'paren':
      return `\\left(${exprToLatex(e.inner)}\\right)`;
  }
}

/** LaTeX for a whole line, or null if it doesn't parse. Fractions stacked (R-DISP-2). */
export function lineToLatex(text: string): string | null {
  const r = parseEquation(text);
  if (r.ok) return `${exprToLatex(r.eq.left)} = ${exprToLatex(r.eq.right)}`;
  try {
    return exprToLatex(parseExpression(text));
  } catch {
    return null;
  }
}
