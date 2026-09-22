// EQ hint ladder (requirements §7.6, R-HELP-4, R-HELP-5, R-EQ-PED-3). Hints are built from the
// actual line the learner is on: its numbers, letter and terms. Returns ids + params; the text
// lives in src/ui/strings.ts.
import {
  add,
  div,
  eq,
  formatRational,
  isInteger,
  lcm,
  mul,
  neg,
  rat,
  sign,
  ZERO,
  type Rational,
} from '../../rational';
import { MINUS, sideText, termMagnitude, termText } from '../../eq/format';
import { evaluate } from '../../eq/evaluate';
import {
  allTerms,
  groupingParens,
  hasFractions,
  isSeparated,
  linearize,
  simplifiedForm,
  type LinearEquation,
  type Term,
} from '../../eq/linear';
import { parseEquation, type Expr } from '../../eq/parse';
import { stageOf, type Stage } from '../../eq/stepChecker';

export type HintTier = 1 | 2 | 3;
export type Params = Record<string, string>;
export interface HintContent {
  id: string;
  params: Params;
}

function lin(text: string): { e: LinearEquation; left: Expr; right: Expr } {
  const r = parseEquation(text);
  if (!r.ok) throw new Error(`hint for unparseable line: ${text}`);
  return { e: linearize(r.eq), left: r.eq.left, right: r.eq.right };
}

/** Signed text for a constant: "+3", "−7"; for a variable term: "a", "−3z". */
function spokenTerm(t: { coef: Rational; isVar: boolean }, v: string): string {
  if (t.isVar) return termText(t.coef, true, v);
  return (sign(t.coef) < 0 ? MINUS : '+') + termMagnitude(t.coef, false, v);
}

/** The side that should hold the unknowns: the one with more of them, left on a tie. */
function varSideOf(e: LinearEquation): 'L' | 'R' {
  const l = e.left.terms.filter((t) => t.isVar).length;
  const r = e.right.terms.filter((t) => t.isVar).length;
  return r > l ? 'R' : 'L';
}

function movesFor(e: LinearEquation): Term[] {
  const vs = varSideOf(e);
  return allTerms(e).filter((t) => (t.isVar ? t.side !== vs : t.side === vs));
}

function findGroup(e: Expr, text: string): { k: string; inner: Expr; innerText: string } | null {
  if (e.kind === 'mul' && e.right.kind === 'paren') {
    return {
      k: text.slice(e.left.start, e.left.end).trim(),
      inner: e.right.inner,
      innerText: text.slice(e.right.inner.start, e.right.inner.end).trim(),
    };
  }
  if (e.kind === 'neg' && e.arg.kind === 'paren') {
    return { k: MINUS, inner: e.arg.inner, innerText: text.slice(e.arg.inner.start, e.arg.inner.end).trim() };
  }
  switch (e.kind) {
    case 'num':
    case 'var':
      return null;
    case 'neg':
      return findGroup(e.arg, text);
    case 'paren':
      return findGroup(e.inner, text);
    default:
      return findGroup(e.left, text) ?? findGroup(e.right, text);
  }
}

function denominatorLcm(e: LinearEquation): bigint {
  return allTerms(e).reduce((acc, t) => lcm(acc, t.coef.d), 1n);
}

/** H1 or H2 for the line the learner is on. */
export function eqHint(line: string, v: string, tier: 1 | 2): HintContent {
  const { e, left, right } = lin(line);
  const stage: Stage = stageOf(e, line);
  switch (stage) {
    case 'EXPAND': {
      const g = findGroup(left, line) ?? findGroup(right, line);
      const k = g?.k ?? '';
      const inner = g?.innerText ?? '';
      if (tier === 1) return { id: 'eq.expand.h1', params: { k, inner } };
      const innerTerms = g ? linearize({ text: line, left: g.inner, right: g.inner }).left.terms : [];
      return {
        id: 'eq.expand.h2',
        params: {
          k,
          first: spokenTerm(innerTerms[0] ?? { coef: ZERO, isVar: false }, v),
          second: spokenTerm(innerTerms[1] ?? { coef: ZERO, isVar: false }, v),
        },
      };
    }
    case 'CLEAR_FRACTIONS':
      if (tier === 1) return { id: 'eq.clear.h1', params: {} };
      return { id: 'eq.clear.h2', params: { m: `${denominatorLcm(e)}` } };
    case 'SEPARATE': {
      if (tier === 1) return { id: 'eq.separate.h1', params: { variable: v } };
      const vs = varSideOf(e);
      const moves = movesFor(e);
      const first = moves.find((t) => t.isVar) ?? moves[0];
      const second = moves.find((t) => t !== first);
      const params: Params = { variable: v };
      if (first) {
        const from = first.side === 'L' ? 'left' : 'right';
        const to = first.side === 'L' ? 'right' : 'left';
        params.term = spokenTerm(first, v);
        params.from = from;
        params.to = to;
        params.op = sign(first.coef) > 0 ? 'subtract' : 'add';
        params.amount = termMagnitude(first.coef, first.isVar, v);
        params.flipped = spokenTerm({ coef: neg(first.coef), isVar: first.isVar }, v);
      }
      if (second) {
        params.term2 = spokenTerm(second, v);
        params.to2 = second.side === 'L' ? 'right' : 'left';
      }
      params.varSide = vs === 'L' ? 'left' : 'right';
      return { id: second ? 'eq.separate.h2.two' : 'eq.separate.h2', params };
    }
    case 'SIMPLIFY': {
      if (tier === 1) return { id: 'eq.simplify.h1', params: { variable: v } };
      const varSide = e.left.terms.every((t) => t.isVar) ? e.left : e.right;
      const constSide = varSide === e.left ? e.right : e.left;
      const vText = line.slice(varSide.span.start, varSide.span.end).trim();
      const cText = line.slice(constSide.span.start, constSide.span.end).trim();
      if (varSide.terms.length > 1 && constSide.terms.length > 1) {
        return { id: 'eq.simplify.h2.both', params: { variable: v, varSide: vText, constSide: cText } };
      }
      if (varSide.terms.length > 1)
        return { id: 'eq.simplify.h2.var', params: { variable: v, varSide: vText } };
      return { id: 'eq.simplify.h2.const', params: { constSide: cText } };
    }
    case 'SOLVE':
    case 'DONE': {
      const s = simplifiedForm(e);
      const c = s?.c ?? rat(1);
      const d = s?.d ?? ZERO;
      if (isInteger(c)) {
        const cText = formatRational(c);
        return tier === 1
          ? { id: 'eq.solve.h1', params: { variable: v, c: cText } }
          : { id: 'eq.solve.h2.divide', params: { c: cText, d: formatRational(d) } };
      }
      const recip = div(rat(1), c);
      return tier === 1
        ? { id: 'eq.solve.h1.fraction', params: { variable: v, c: formatRational(c) } }
        : { id: 'eq.solve.h2.multiply', params: { m: formatRational(recip) } };
    }
  }
}

// ---------- H3: walkthrough ----------

export type WalkKind = 'EXPAND' | 'CLEAR_FRACTIONS' | 'SEPARATE' | 'SIMPLIFY' | 'SOLVE' | 'CHECK';

export interface WalkStep {
  kind: WalkKind;
  /** The line after this step (for CHECK: the original equation). */
  line: string;
  explain: HintContent;
}

type Simple = { coef: Rational; isVar: boolean };

function eqText(l: Simple[], r: Simple[], v: string): string {
  return `${sideText(l, v)} = ${sideText(r, v)}`;
}

function valueText(x: Rational): string {
  return formatRational(x);
}

/** Render an expression with the variable replaced by a value: 3a + 3 → 3·10 + 3. */
function substituted(e: Expr, value: Rational): string {
  const vt = valueText(value);
  const wrapped = sign(value) < 0 || !isInteger(value) ? `(${vt})` : vt;
  const go = (x: Expr): string => {
    switch (x.kind) {
      case 'num':
        return x.raw;
      case 'var':
        return wrapped;
      case 'neg':
        return `${MINUS}${go(x.arg)}`;
      case 'paren':
        return `(${go(x.inner)})`;
      case 'add':
        return `${go(x.left)} + ${go(x.right)}`;
      case 'sub':
        return `${go(x.left)} ${MINUS} ${go(x.right)}`;
      case 'mul':
        return `${go(x.left)}·${go(x.right)}`;
      case 'div':
        return `${go(x.left)}/${go(x.right)}`;
    }
  };
  return go(e);
}

/** The worked solution of this problem, one step per tap, ending with the substitution check. */
export function eqWalkthrough(original: string, v: string): WalkStep[] {
  const steps: WalkStep[] = [];
  let { e } = lin(original);
  let terms = { l: e.left.terms as Simple[], r: e.right.terms as Simple[] };
  let line: string;

  if (groupingParens(e) > 0) {
    line = eqText(terms.l, terms.r, v);
    steps.push({ kind: 'EXPAND', line, explain: { id: 'eq.walk.expand', params: {} } });
    e = lin(line).e;
  }
  if (!isSeparated(e) && hasFractions(e)) {
    const m = rat(denominatorLcm(e));
    terms = {
      l: terms.l.map((t) => ({ ...t, coef: mul(t.coef, m) })),
      r: terms.r.map((t) => ({ ...t, coef: mul(t.coef, m) })),
    };
    line = eqText(terms.l, terms.r, v);
    steps.push({
      kind: 'CLEAR_FRACTIONS',
      line,
      explain: { id: 'eq.walk.clear', params: { m: formatRational(m) } },
    });
    e = lin(line).e;
  }
  if (!isSeparated(e)) {
    const vs = varSideOf(e);
    const moved = movesFor(e).map((t) => spokenTerm(t, v));
    const stay = (side: Simple[], isVar: boolean) => side.filter((t) => t.isVar === isVar);
    const cross = (side: Simple[], isVar: boolean) =>
      side.filter((t) => t.isVar === isVar).map((t) => ({ ...t, coef: neg(t.coef) }));
    const varSideTerms =
      vs === 'L'
        ? [...stay(terms.l, true), ...cross(terms.r, true)]
        : [...stay(terms.r, true), ...cross(terms.l, true)];
    const constSideTerms =
      vs === 'L'
        ? [...stay(terms.r, false), ...cross(terms.l, false)]
        : [...stay(terms.l, false), ...cross(terms.r, false)];
    terms = vs === 'L' ? { l: varSideTerms, r: constSideTerms } : { l: constSideTerms, r: varSideTerms };
    line = eqText(terms.l, terms.r, v);
    steps.push({
      kind: 'SEPARATE',
      line,
      explain: { id: 'eq.walk.separate', params: { variable: v, moved: moved.join(', ') } },
    });
    e = lin(line).e;
  }
  if (!simplifiedForm(e)) {
    const sum = (xs: Simple[]) => xs.reduce((s, t) => add(s, t.coef), ZERO);
    const l =
      terms.l.length && terms.l[0]!.isVar
        ? [{ coef: sum(terms.l), isVar: true }]
        : [{ coef: sum(terms.l), isVar: false }];
    const r =
      terms.r.length && terms.r[0]!.isVar
        ? [{ coef: sum(terms.r), isVar: true }]
        : [{ coef: sum(terms.r), isVar: false }];
    line = eqText(l, r, v);
    steps.push({ kind: 'SIMPLIFY', line, explain: { id: 'eq.walk.simplify', params: { variable: v } } });
    e = lin(line).e;
  }
  const s = simplifiedForm(e)!;
  const answer = div(s.d, s.c);
  if (!eq(s.c, rat(1))) {
    line = `${v} = ${valueText(answer)}`;
    steps.push({
      kind: 'SOLVE',
      line,
      explain: isInteger(s.c)
        ? { id: 'eq.walk.solve.divide', params: { c: formatRational(s.c) } }
        : { id: 'eq.walk.solve.multiply', params: { m: formatRational(div(rat(1), s.c)) } },
    });
  }
  const o = lin(original);
  steps.push({
    kind: 'CHECK',
    line: original,
    explain: {
      id: 'eq.walk.check',
      params: {
        variable: v,
        value: valueText(answer),
        left: substituted(o.left, answer),
        leftValue: valueText(evaluate(o.left, answer)),
        right: substituted(o.right, answer),
        rightValue: valueText(evaluate(o.right, answer)),
      },
    },
  });
  return steps;
}
