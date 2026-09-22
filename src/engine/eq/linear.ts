// AST → linear form and term lists (requirements §7.4 definitions).
//   Lin(E) = (α, β) for α·v + β
//   D(P)   = Lin(L) − Lin(R)
//   Terms(P) = signed, uncombined terms moved to the left (parentheses expanded symbolically).
import { add, div, isInteger, isZero, mul, neg, ONE, sub, ZERO, type Rational } from '../rational';
import type { Expr, ParsedEquation, Span } from './parse';

export interface Lin {
  a: Rational;
  b: Rational;
}

export interface Term {
  coef: Rational;
  isVar: boolean;
  side: 'L' | 'R';
  /** Span of the top-level summand this term came from, in the line's text. */
  span: Span;
}

export interface SideInfo {
  expr: Expr;
  span: Span;
  terms: Term[];
  /** Number of top-level summands as written (before expansion). */
  summands: number;
  /** Parentheses that group a sum and so need expanding (e.g. 2(x + 4), −(m + 12)). */
  groupingParens: number;
  lin: Lin;
}

export interface LinearEquation {
  text: string;
  left: SideInfo;
  right: SideInfo;
  d: Lin;
}

export class NonLinearError extends Error {
  constructor(readonly span: Span) {
    super('not linear');
  }
}

interface RawTerm {
  coef: Rational;
  isVar: boolean;
}

function expand(e: Expr): RawTerm[] {
  switch (e.kind) {
    case 'num':
      return [{ coef: e.value, isVar: false }];
    case 'var':
      return [{ coef: ONE, isVar: true }];
    case 'paren':
      return expand(e.inner);
    case 'neg':
      return expand(e.arg).map((t) => ({ ...t, coef: neg(t.coef) }));
    case 'add':
      return [...expand(e.left), ...expand(e.right)];
    case 'sub':
      return [...expand(e.left), ...expand(e.right).map((t) => ({ ...t, coef: neg(t.coef) }))];
    case 'mul': {
      const l = expand(e.left);
      const r = expand(e.right);
      const out: RawTerm[] = [];
      for (const x of l)
        for (const y of r) {
          if (x.isVar && y.isVar) throw new NonLinearError(e);
          out.push({ coef: mul(x.coef, y.coef), isVar: x.isVar || y.isVar });
        }
      return out;
    }
    case 'div': {
      const r = expand(e.right);
      if (r.some((t) => t.isVar)) throw new NonLinearError(e);
      const divisor = r.reduce((s, t) => add(s, t.coef), ZERO);
      if (isZero(divisor)) throw new NonLinearError(e);
      return expand(e.left).map((t) => ({ ...t, coef: div(t.coef, divisor) }));
    }
  }
}

function summands(e: Expr): Expr[] {
  if (e.kind === 'add') return [...summands(e.left), e.right];
  if (e.kind === 'sub')
    return [...summands(e.left), { kind: 'neg', arg: e.right, start: e.right.start, end: e.right.end }];
  return [e];
}

function countGroupingParens(e: Expr): number {
  switch (e.kind) {
    case 'num':
    case 'var':
      return 0;
    case 'paren':
      return (e.inner.kind === 'add' || e.inner.kind === 'sub' ? 1 : 0) + countGroupingParens(e.inner);
    case 'neg':
      return countGroupingParens(e.arg);
    default:
      return countGroupingParens(e.left) + countGroupingParens(e.right);
  }
}

function sideInfo(e: Expr, side: 'L' | 'R'): SideInfo {
  const parts = summands(e);
  const terms: Term[] = [];
  for (const s of parts) {
    for (const t of expand(s)) {
      if (isZero(t.coef) && t.isVar) continue;
      terms.push({ ...t, side, span: { start: s.start, end: s.end } });
    }
  }
  const lin = terms.reduce<Lin>(
    (acc, t) => (t.isVar ? { a: add(acc.a, t.coef), b: acc.b } : { a: acc.a, b: add(acc.b, t.coef) }),
    { a: ZERO, b: ZERO },
  );
  return {
    expr: e,
    span: { start: e.start, end: e.end },
    terms,
    summands: parts.length,
    groupingParens: countGroupingParens(e),
    lin,
  };
}

export function linearize(eq: ParsedEquation): LinearEquation {
  const left = sideInfo(eq.left, 'L');
  const right = sideInfo(eq.right, 'R');
  return { text: eq.text, left, right, d: linSub(left.lin, right.lin) };
}

export const linAdd = (x: Lin, y: Lin): Lin => ({ a: add(x.a, y.a), b: add(x.b, y.b) });
export const linSub = (x: Lin, y: Lin): Lin => ({ a: sub(x.a, y.a), b: sub(x.b, y.b) });
export const linScale = (x: Lin, k: Rational): Lin => ({ a: mul(x.a, k), b: mul(x.b, k) });
export const linNeg = (x: Lin): Lin => ({ a: neg(x.a), b: neg(x.b) });
export const linEq = (x: Lin, y: Lin): boolean =>
  x.a.n === y.a.n && x.a.d === y.a.d && x.b.n === y.b.n && x.b.d === y.b.d;

/** A term's contribution to D(P): terms on the right are negated ("moved to the left"). */
export function movedLeft(t: Term): Lin {
  const c = t.side === 'L' ? t.coef : neg(t.coef);
  return t.isVar ? { a: c, b: ZERO } : { a: ZERO, b: c };
}

export function allTerms(e: LinearEquation): Term[] {
  return [...e.left.terms, ...e.right.terms];
}

/** k such that x = k·y, or null. y must have a ≠ 0 or b ≠ 0. */
export function ratio(x: Lin, y: Lin): Rational | null {
  let k: Rational;
  if (!isZero(y.a)) k = div(x.a, y.a);
  else if (!isZero(y.b)) k = div(x.b, y.b);
  else return null;
  return linEq(x, linScale(y, k)) ? k : null;
}

/** Only variable terms (≥ 1) on one side and only constants (≥ 1) on the other. */
export function isSeparated(e: LinearEquation): boolean {
  const kind = (s: SideInfo): 'var' | 'const' | 'mixed' | 'empty' => {
    if (s.terms.length === 0) return 'empty';
    if (s.terms.every((t) => t.isVar)) return 'var';
    if (s.terms.every((t) => !t.isVar)) return 'const';
    return 'mixed';
  };
  const l = kind(e.left);
  const r = kind(e.right);
  return (l === 'var' && r === 'const') || (l === 'const' && r === 'var');
}

/** Exactly one term per side: c·v on one side and d on the other, c ≠ 0. */
export function simplifiedForm(e: LinearEquation): { c: Rational; d: Rational; varSide: 'L' | 'R' } | null {
  if (e.left.summands !== 1 || e.right.summands !== 1) return null;
  if (e.left.terms.length !== 1 || e.right.terms.length !== 1) return null;
  const l = e.left.terms[0]!;
  const r = e.right.terms[0]!;
  if (l.isVar && !r.isVar && !isZero(l.coef)) return { c: l.coef, d: r.coef, varSide: 'L' };
  if (r.isVar && !l.isVar && !isZero(r.coef)) return { c: r.coef, d: l.coef, varSide: 'R' };
  return null;
}

export function hasFractions(e: LinearEquation): boolean {
  return allTerms(e).some((t) => !isInteger(t.coef));
}

export function groupingParens(e: LinearEquation): number {
  return e.left.groupingParens + e.right.groupingParens;
}

export function solution(e: LinearEquation): Rational | null {
  if (isZero(e.d.a)) return null;
  return div(neg(e.d.b), e.d.a);
}
