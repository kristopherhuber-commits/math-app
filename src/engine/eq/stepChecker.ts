// Step checker (requirements §7.4, normative). Classifies a new line N against the previous
// accepted line P. Returns message ids + params; the UI renders them from strings.ts (R-NF-4).
import {
  absR,
  div,
  eq,
  formatRational,
  gcd,
  isInteger,
  neg,
  toFixedPlaces,
  type Rational,
} from '../rational';
import { termMagnitude } from './format';
import {
  allTerms,
  groupingParens,
  hasFractions,
  isSeparated,
  linAdd,
  linearize,
  linEq,
  linNeg,
  linScale,
  linSub,
  movedLeft,
  NonLinearError,
  ratio,
  simplifiedForm,
  type Lin,
  type LinearEquation,
  type SideInfo,
  type Term,
} from './linear';
import { parseEquation, type Expr, type ParsedEquation, type Span } from './parse';

export type StepType = 'EXPAND' | 'CLEAR_FRACTIONS' | 'SEPARATE' | 'SIMPLIFY' | 'SOLVE';
export type Stage = StepType | 'DONE';

export type DiagnosticCode =
  | 'EQ-D1'
  | 'EQ-D2'
  | 'EQ-D3'
  | 'EQ-D4'
  | 'EQ-D5'
  | 'EQ-D6'
  | 'EQ-D7'
  | 'EQ-D8'
  | 'EQ-D9'
  | 'EQ-D10'
  | 'EQ-D11';

/** Refusals that are not diagnostics: the line is right but not acceptable as the next step. */
export type RuleCode =
  | 'R-EQ-CHK-3' // skipped the moving step
  | 'R-EQ-CHK-3-SIMPLIFY' // skipped the simplify step (assumption: same rule, applied to Simplify)
  | 'R-EQ-CHK-5' // right value, not lowest terms
  | 'R-EQ-CHK-6' // inexact decimal
  | 'EQ-KEEP-GOING'; // balanced, but no progress towards the next step (assumption)

export type StepLabel =
  | 'expanded'
  | 'clearedFractions'
  | 'moved'
  | 'movedPartial'
  | 'movedSimplified'
  | 'simplified'
  | 'simplifiedPartial'
  | 'simplifiedSolved'
  | 'solved';

export type Params = Record<string, string>;

export type StepResult =
  | {
      accepted: true;
      stepType: StepType;
      label: StepLabel;
      solved: boolean;
      /** Optional extra note, e.g. an exact decimal answer ("5/2 is also fine"). */
      note?: { id: 'decimalAlsoFraction'; params: Params };
    }
  | { accepted: false; kind: 'diagnostic'; code: DiagnosticCode; params: Params; span?: Span }
  | { accepted: false; kind: 'rule'; code: RuleCode; params: Params; span?: Span };

export interface CheckOptions {
  variable: string;
  level: number;
  allowSkipping: boolean;
}

const ONE_OR_MINUS_ONE = (k: Rational | null): boolean => k !== null && absR(k).n === 1n && k.d === 1n;

function reject(code: DiagnosticCode, params: Params = {}, span?: Span): StepResult {
  return span
    ? { accepted: false, kind: 'diagnostic', code, params, span }
    : { accepted: false, kind: 'diagnostic', code, params };
}

function refuse(code: RuleCode, params: Params = {}, span?: Span): StepResult {
  return span
    ? { accepted: false, kind: 'rule', code, params, span }
    : { accepted: false, kind: 'rule', code, params };
}

function accept(stepType: StepType, label: StepLabel, solved: boolean): StepResult {
  return { accepted: true, stepType, label, solved };
}

/** Where the question is, judged from the last accepted line. Drives StepRail and hints. */
export function stageOf(p: LinearEquation, text: string): Stage {
  if (groupingParens(p) > 0) return 'EXPAND';
  if (!isSeparated(p)) return hasFractions(p) ? 'CLEAR_FRACTIONS' : 'SEPARATE';
  const s = simplifiedForm(p);
  if (!s) return 'SIMPLIFY';
  if (eq(s.c, { n: 1n, d: 1n }) && isFinalLine(p, text)) return 'DONE';
  return 'SOLVE';
}

// ---------- final-answer form (R-EQ-CHK-5, R-EQ-CHK-6) ----------

type FinalForm =
  | { kind: 'ok' }
  | { kind: 'okDecimal'; fraction: string }
  | { kind: 'notLowest'; written: string }
  | { kind: 'inexactDecimal' }
  | { kind: 'wrong' };

function literalOf(e: Expr): { sign: 1 | -1; e: Expr } {
  if (e.kind === 'neg') {
    const inner = literalOf(e.arg);
    return { sign: (inner.sign * -1) as 1 | -1, e: inner.e };
  }
  return { sign: 1, e };
}

function finalForm(constSide: Expr, text: string, expected: Rational): FinalForm {
  const lit = literalOf(constSide);
  const written = text.slice(constSide.start, constSide.end).trim();
  const e = lit.e;
  if (e.kind === 'num') {
    const value = lit.sign < 0 ? neg(e.value) : e.value;
    if (!e.decimal) return eq(value, expected) ? { kind: 'ok' } : { kind: 'wrong' };
    if (eq(value, expected)) {
      return isInteger(expected) ? { kind: 'ok' } : { kind: 'okDecimal', fraction: formatRational(expected) };
    }
    const places = (e.raw.split('.')[1] ?? '').length;
    const near =
      eq(toFixedPlaces(expected, places, 'round'), value) ||
      eq(toFixedPlaces(expected, places, 'trunc'), value);
    return near ? { kind: 'inexactDecimal' } : { kind: 'wrong' };
  }
  const num = e.kind === 'div' ? literalOf(e.left) : null;
  const den = e.kind === 'div' ? literalOf(e.right) : null;
  if (num && den && num.e.kind === 'num' && den.e.kind === 'num' && !num.e.decimal && !den.e.decimal) {
    const p = num.e.value.n;
    const q = den.e.value.n;
    if (q === 0n) return { kind: 'wrong' };
    const s = lit.sign * num.sign * den.sign;
    const value = div(s < 0 ? neg(num.e.value) : num.e.value, den.e.value);
    if (!eq(value, expected)) return { kind: 'wrong' };
    return gcd(p, q) === 1n && q > 1n ? { kind: 'ok' } : { kind: 'notLowest', written };
  }
  // Anything else (20 ÷ 2 written with extra structure, 10 + 0, …): judge by value.
  return { kind: 'notLowest', written };
}

/** True when the line is `v = q` / `q = v` with q an integer or a reduced fraction. */
function isFinalLine(p: LinearEquation, text: string): boolean {
  const s = simplifiedForm(p);
  if (!s || !eq(s.c, { n: 1n, d: 1n })) return false;
  const constSide = s.varSide === 'L' ? p.right.expr : p.left.expr;
  const f = finalForm(constSide, text, s.d);
  return f.kind === 'ok' || f.kind === 'okDecimal';
}

// ---------- helpers for diagnostics ----------

function termCount(e: LinearEquation): number {
  return allTerms(e).length;
}

function sideText(text: string, side: SideInfo): string {
  return text.slice(side.span.start, side.span.end).trim();
}

/** The written text of a term, without its leading sign, if its summand is a single term. */
function termLabel(t: Term, e: LinearEquation, text: string, v: string): string {
  const siblings = allTerms(e).filter((u) => u.span.start === t.span.start && u.span.end === t.span.end);
  if (siblings.length === 1) {
    const raw = text.slice(t.span.start, t.span.end).trim();
    if (!/[()]/.test(raw)) return raw.replace(/^[-+−\s]+/, '');
  }
  return termMagnitude(t.coef, t.isVar, v);
}

const pm = (x: Lin, target: Lin): boolean => linEq(x, target) || linEq(x, linNeg(target));

/** Approved EQ-D4 rule: D(N) = ±(D(P) − 2t) for exactly-one flipped term t. */
function findSignSlip(
  p: LinearEquation,
  n: LinearEquation,
  pText: string,
  nText: string,
  v: string,
): { params: Params; span?: Span } | null {
  // Balance view (R-EQ-PED-3): a term c moved across means "take c away from both sides"
  // when c > 0, and "add |c| to both sides" when c < 0.
  const balance = (coef: Rational, isVar: boolean) => ({
    op: coef.n > 0n ? 'subtract' : 'add',
    amount: termMagnitude(coef, isVar, v),
  });
  // Prefer naming the culprit as it appears in N (so it can be underlined).
  const inN = allTerms(n).filter((u) => pm(linSub(n.d, linScale(movedLeft(u), { n: 2n, d: 1n })), p.d));
  if (inN.length > 0) {
    // Prefer a term that crossed the = (a P term of the same size sits on the other side).
    const crossed = inN.find((u) =>
      allTerms(p).some((t) => t.isVar === u.isVar && eq(absR(t.coef), absR(u.coef)) && t.side !== u.side),
    );
    const u = crossed ?? inN[0]!;
    // A crossed term kept the sign it had before crossing, so u.coef is the original term.
    const cameFrom = crossed ? (u.side === 'L' ? 'R' : 'L') : u.side;
    return {
      params: {
        term: termLabel(u, n, nText, v),
        from: cameFrom === 'L' ? 'left' : 'right',
        // A term that stayed put but changed sign gets no balance reminder.
        ...(crossed ? balance(u.coef, u.isVar) : { op: '', amount: '' }),
      },
      span: u.span,
    };
  }
  const inP = allTerms(p).find((t) => pm(n.d, linSub(p.d, linScale(movedLeft(t), { n: 2n, d: 1n }))));
  return inP
    ? {
        params: {
          term: termLabel(inP, p, pText, v),
          from: inP.side === 'L' ? 'left' : 'right',
          ...balance(inP.coef, inP.isVar),
        },
      }
    : null;
}

/** EQ-D5, generalised the same way as EQ-D4: D(N) = ±(D(P) ∓ t) for one term t of P. */
function findLostOrExtra(p: LinearEquation, n: LinearEquation): boolean {
  return allTerms(p).some((t) => {
    const m = movedLeft(t);
    return pm(n.d, linSub(p.d, m)) || pm(n.d, linAdd(p.d, m));
  });
}

/** First multiplier-of-a-group in an expression: k(inner) or −(inner). */
function findGroup(e: Expr, text: string): { k: string; inner: string } | null {
  const walk = (x: Expr): { k: string; inner: string } | null => {
    if (x.kind === 'mul' && x.right.kind === 'paren') {
      return {
        k: text.slice(x.left.start, x.left.end).trim(),
        inner: text.slice(x.right.inner.start, x.right.inner.end).trim(),
      };
    }
    if (x.kind === 'neg' && x.arg.kind === 'paren') {
      return { k: '−', inner: text.slice(x.arg.inner.start, x.arg.inner.end).trim() };
    }
    switch (x.kind) {
      case 'num':
      case 'var':
        return null;
      case 'neg':
        return walk(x.arg);
      case 'paren':
        return walk(x.inner);
      default:
        return walk(x.left) ?? walk(x.right);
    }
  };
  return walk(e);
}

// ---------- the checker ----------

export function checkStep(prevText: string, nextText: string, opts: CheckOptions): StepResult {
  const v = opts.variable;

  // EQ-D1 / EQ-D2 / EQ-D3
  const parsedN = parseEquation(nextText, v);
  if (!parsedN.ok) {
    const f = parsedN.error;
    if (f.kind === 'syntax') return reject('EQ-D1', {}, f.span);
    if (f.kind === 'equals') return reject('EQ-D2', {}, f.span);
    return reject('EQ-D3', { variable: v, letter: f.letter ?? '' }, f.span);
  }
  let n: LinearEquation;
  try {
    n = linearize(parsedN.eq);
  } catch (e) {
    if (e instanceof NonLinearError) return reject('EQ-D1', {}, e.span);
    throw e;
  }

  const parsedP = parseEquation(prevText, v);
  if (!parsedP.ok) throw new Error(`previous line does not parse: ${prevText}`);
  const p = linearize(parsedP.eq);
  return classify(p, parsedP.eq, prevText, n, parsedN.eq, nextText, opts);
}

function classify(
  p: LinearEquation,
  pEq: ParsedEquation,
  pText: string,
  n: LinearEquation,
  nEq: ParsedEquation,
  nText: string,
  opts: CheckOptions,
): StepResult {
  const v = opts.variable;
  const k = ratio(n.d, p.d);
  const unit = ONE_OR_MINUS_ONE(k);
  const pSeparated = isSeparated(p);
  const pSimplified = simplifiedForm(p);
  const nSeparated = isSeparated(n);
  const nSimplified = simplifiedForm(n);
  const nIsVEqualsQ = nSimplified !== null && eq(nSimplified.c, { n: 1n, d: 1n });
  const pParens = groupingParens(p);
  const nParens = groupingParens(n);

  const solvedCheck = (): FinalForm | null => {
    if (!nIsVEqualsQ || !nSimplified) return null;
    const constSide = nSimplified.varSide === 'L' ? nEq.right : nEq.left;
    return finalForm(constSide, nText, nSimplified.d);
  };
  /** Accept a line that ends the question, applying R-EQ-CHK-5/6 to how q is written. */
  const acceptFinal = (stepType: StepType, label: StepLabel): StepResult => {
    const f = solvedCheck();
    if (!f || f.kind === 'ok') return accept(stepType, label, true);
    if (f.kind === 'okDecimal') {
      return {
        ...(accept(stepType, label, true) as Extract<StepResult, { accepted: true }>),
        note: { id: 'decimalAlsoFraction', params: { fraction: f.fraction } },
      };
    }
    if (f.kind === 'notLowest') return refuse('R-EQ-CHK-5', { written: f.written });
    if (f.kind === 'inexactDecimal') return refuse('R-EQ-CHK-6');
    return reject('EQ-D10');
  };

  // EXPAND: P has grouping parentheses; N has fewer; each side's Lin unchanged.
  if (pParens > 0 && nParens < pParens && linEq(n.left.lin, p.left.lin) && linEq(n.right.lin, p.right.lin)) {
    return accept('EXPAND', 'expanded', false);
  }

  // CLEAR_FRACTIONS: integer terms, D(N) = k·D(P) with integer |k| ≥ 2. A line of the form v = q
  // is a SOLVE (§7.5: x/4 = 2 → x = 8), and reaching c·v = d from an unsimplified P is a skip.
  if (
    hasFractions(p) &&
    !hasFractions(n) &&
    k !== null &&
    isInteger(k) &&
    absR(k).n >= 2n &&
    !nIsVEqualsQ &&
    !(nSimplified && !pSimplified)
  ) {
    return accept('CLEAR_FRACTIONS', 'clearedFractions', false);
  }

  // R-EQ-CHK-3: SIMPLIFY/SOLVE form straight from an unseparated P, and equivalent.
  if (!pSeparated && nSimplified && k !== null) {
    if (nIsVEqualsQ && !unit) {
      // Moved, simplified and solved in one line.
      if (opts.allowSkipping && opts.level >= 5) return acceptFinal('SOLVE', 'movedSimplified');
      return refuse('R-EQ-CHK-3', { variable: v });
    }
    if (!unit) return reject('EQ-D6'); // e.g. 4a = 40: scaled as well as moved
    if (opts.allowSkipping)
      return nIsVEqualsQ
        ? acceptFinal('SIMPLIFY', 'movedSimplified')
        : accept('SIMPLIFY', 'movedSimplified', false);
    return refuse('R-EQ-CHK-3', { variable: v });
  }

  // SEPARATE
  if (!pSeparated && nSeparated && unit) {
    return accept('SEPARATE', termCount(n) < termCount(p) ? 'movedPartial' : 'moved', false);
  }

  // SIMPLIFY (and partial simplifying, an assumption: fewer terms, still separated, balanced)
  if (pSeparated && !pSimplified) {
    if (nSimplified && unit) {
      if (nIsVEqualsQ) return acceptFinal('SIMPLIFY', 'simplifiedSolved'); // R-EQ-CHK-4
      return accept('SIMPLIFY', 'simplified', false);
    }
    if (nIsVEqualsQ && k !== null) {
      // c·v = d → v = q merged with Simplify: only at levels 5–6 with allowSkipping (R-EQ-CHK-3).
      if (opts.allowSkipping && opts.level >= 5) return acceptFinal('SIMPLIFY', 'simplifiedSolved');
      return refuse('R-EQ-CHK-3-SIMPLIFY', { variable: v });
    }
    if (nSeparated && unit && termCount(n) < termCount(p))
      return accept('SIMPLIFY', 'simplifiedPartial', false);
  }

  // SOLVE
  if (pSimplified && !isFinalLine(p, pText)) {
    const expected = div(pSimplified.d, pSimplified.c);
    if (nIsVEqualsQ && nSimplified) {
      const constSide = nSimplified.varSide === 'L' ? nEq.right : nEq.left;
      const f = finalForm(constSide, nText, expected);
      if (f.kind === 'ok') return accept('SOLVE', 'solved', true);
      if (f.kind === 'okDecimal')
        return {
          accepted: true,
          stepType: 'SOLVE',
          label: 'solved',
          solved: true,
          note: { id: 'decimalAlsoFraction', params: { fraction: f.fraction } },
        };
      if (f.kind === 'notLowest') return refuse('R-EQ-CHK-5', { written: f.written });
      if (f.kind === 'inexactDecimal') return refuse('R-EQ-CHK-6');
      // EQ-D8: division error
      return reject(
        'EQ-D8',
        {
          c: formatRational(pSimplified.c),
          variable: v,
          d: formatRational(pSimplified.d),
        },
        { start: constSide.start, end: constSide.end },
      );
    }
  }

  return diagnose(p, pEq, pText, n, nText, opts, k);
}

function diagnose(
  p: LinearEquation,
  pEq: ParsedEquation,
  pText: string,
  n: LinearEquation,
  nText: string,
  opts: CheckOptions,
  k: Rational | null,
): StepResult {
  const v = opts.variable;
  const unit = ONE_OR_MINUS_ONE(k);
  const sepStage = !isSeparated(p);
  const pSimplified = simplifiedForm(p);
  const nSimplified = simplifiedForm(n);

  if (sepStage) {
    // EQ-D4: sign of one transposed term (approved rule).
    if (isSeparated(n)) {
      const slip = findSignSlip(p, n, pText, nText, v);
      if (slip) return reject('EQ-D4', slip.params, slip.span);
    }
    // EQ-D5: a term lost or duplicated.
    if (findLostOrExtra(p, n)) return reject('EQ-D5');
    // EQ-D6: scaled too early.
    if (k !== null && !unit) return reject('EQ-D6');
  }

  // EQ-D7: arithmetic error in SIMPLIFY (form OK, not balanced).
  if (!sepStage && !pSimplified && nSimplified && !unit) {
    const pVar = p.left.terms.every((t) => t.isVar) ? p.left : p.right;
    const pConst = pVar === p.left ? p.right : p.left;
    const alpha = pVar === p.left ? p.left.lin.a : p.right.lin.a;
    const beta = pConst === p.left ? p.left.lin.b : p.right.lin.b;
    const matches = (s: 1 | -1) => ({
      varOk: eq(nSimplified.c, s === 1 ? alpha : neg(alpha)),
      constOk: eq(nSimplified.d, s === 1 ? beta : neg(beta)),
    });
    const a = matches(1);
    const b = matches(-1);
    const constWrong = (a.varOk && !a.constOk) || (b.varOk && !b.constOk);
    const wrongSide = constWrong ? pConst : pVar;
    const nWrongSide = (nSimplified.varSide === 'L') === constWrong ? n.right : n.left;
    return reject('EQ-D7', { expression: sideText(pText, wrongSide) }, nWrongSide.span);
  }

  // EQ-D9: expansion error (P had a group; N has fewer; a side's value changed).
  if (groupingParens(p) > 0 && groupingParens(n) < groupingParens(p)) {
    const leftChanged = !linEq(n.left.lin, p.left.lin);
    const rightChanged = !linEq(n.right.lin, p.right.lin);
    // "One side's Lin changed": the other side must still match, or this isn't an expansion slip.
    if (leftChanged !== rightChanged && !isSeparated(n) && k === null) {
      const pSide =
        leftChanged && p.left.groupingParens > 0
          ? pEq.left
          : rightChanged && p.right.groupingParens > 0
            ? pEq.right
            : pEq.left;
      const group = findGroup(pSide, pText) ?? findGroup(pEq.right, pText);
      const nSide = leftChanged ? n.left : n.right;
      return reject('EQ-D9', { k: group?.k ?? '', inner: group?.inner ?? '' }, nSide.span);
    }
  }

  // EQ-D11: equivalent but not separated.
  if (sepStage && unit && !isSeparated(n)) {
    const varBoth = n.left.terms.some((t) => t.isVar) && n.right.terms.some((t) => t.isVar);
    return reject('EQ-D11', { variable: v, which: varBoth ? 'variable' : 'numbers' });
  }

  // Balanced, but not a step forward (assumption; see report).
  if (k !== null) return refuse('EQ-KEEP-GOING', { variable: v, stage: pSimplified ? 'SOLVE' : 'SIMPLIFY' });

  return reject('EQ-D10');
}
