// EQ generators, levels 1–6 (requirements §7.2, R-EQ-GEN invariants). Every question comes from
// a seed (R-ARCH-3); the same seed and level always give the same question.
import { config } from '../../config';
import { absR, add, div, eq, isInteger, lcm, mul, rat, sub, ZERO, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { MINUS, sideText, termMagnitude } from '../../eq/format';
import { isSeparated, linearize, solution as linSolution, type LinearEquation } from '../../eq/linear';
import { parseEquation, type Expr } from '../../eq/parse';

export const EQ_GENERATOR_ID = 'eq.v1';

export interface EqQuestion {
  generatorId: typeof EQ_GENERATOR_ID;
  seed: number;
  level: number;
  variable: string;
  /** The equation as shown, with U+2212 minus signs. */
  text: string;
  solution: Rational;
  /** Which template produced it (for the parent dashboard and bug reports). */
  form: string;
}

type Simple = { coef: Rational; isVar: boolean };
type Piece = ({ t: 'term' } & Simple) | { t: 'group'; k: number; inner: Simple[] };

const V = (c: Rational | number): Piece => ({
  t: 'term',
  coef: typeof c === 'number' ? rat(c) : c,
  isVar: true,
});
const C = (c: Rational | number): Piece => ({
  t: 'term',
  coef: typeof c === 'number' ? rat(c) : c,
  isVar: false,
});
const G = (k: number, inner: Simple[]): Piece => ({ t: 'group', k, inner });
const iv = (c: number): Simple => ({ coef: rat(c), isVar: true });
const ic = (c: number): Simple => ({ coef: rat(c), isVar: false });

function piecesText(pieces: Piece[], v: string): string {
  return pieces
    .map((p, i) => {
      let mag: string;
      let negative: boolean;
      if (p.t === 'term') {
        mag = termMagnitude(p.coef, p.isVar, v);
        negative = p.coef.n < 0n;
      } else {
        const inner = sideText(p.inner, v);
        mag = Math.abs(p.k) === 1 ? `(${inner})` : `${Math.abs(p.k)}(${inner})`;
        negative = p.k < 0;
      }
      if (i === 0) return (negative ? MINUS : '') + mag;
      return (negative ? ` ${MINUS} ` : ' + ') + mag;
    })
    .join('');
}

interface Candidate {
  left: Piece[];
  right: Piece[];
  solution: Rational;
  form: string;
}

// ---------- invariants (R-EQ-GEN) used for rejection sampling ----------

function literals(e: Expr): Rational[] {
  switch (e.kind) {
    case 'num':
      return [e.value];
    case 'var':
      return [];
    case 'neg':
      return literals(e.arg);
    case 'paren':
      return literals(e.inner);
    default:
      return [...literals(e.left), ...literals(e.right)];
  }
}

/** Kinds of top-level summands on a side: 'var', 'const' or 'group'. */
function summandKinds(pieces: Piece[]): string[] {
  return pieces.map((p) => (p.t === 'group' ? 'group' : p.isVar ? 'var' : 'const'));
}

function valid(c: Candidate, level: number, text: string, lin: LinearEquation): boolean {
  const bound = level <= 3 ? config.eq.maxAbsValueLow : config.eq.maxAbsValueHigh;
  const r = parseEquation(text);
  if (!r.ok) return false;
  // 1: unique solution
  const sol = linSolution(lin);
  if (!sol || !eq(sol, c.solution)) return false;
  // 2: bounds
  if ([...literals(r.eq.left), ...literals(r.eq.right)].some((x) => absR(x).n > BigInt(bound) * x.d))
    return false;
  if (absR(sol).n > BigInt(config.eq.maxAbsSolution) * sol.d) return false;
  if (sol.d > BigInt(config.eq.maxSolutionDenominator)) return false;
  // 3: no zero coefficients anywhere
  for (const p of [...c.left, ...c.right]) {
    if (p.t === 'term' && p.coef.n === 0n) return false;
    if (p.t === 'group' && (p.k === 0 || p.inner.some((s) => s.coef.n === 0n) || p.inner.length < 2))
      return false;
  }
  // 4: parentheses and fractions by level
  if (level <= 2 && text.includes('(')) return false;
  if (level <= 4 && text.includes('/')) return false;
  // 5: a side never has the same kind of term twice
  for (const side of [c.left, c.right]) {
    const kinds = summandKinds(side);
    if (new Set(kinds).size !== kinds.length) return false;
  }
  // 6: not already separated
  if (isSeparated(lin)) return false;
  // 7: constants don't cancel (equivalently, the solution is not 0)
  if (eq(lin.left.lin.b, lin.right.lin.b)) return false;
  return true;
}

// ---------- templates ----------

const nz = (r: Rng, max: number) => r.nonZero(-max, max);
const pos = (r: Rng, min: number, max: number) => r.int(min, max);

function order(r: Rng, pieces: Piece[]): Piece[] {
  return r.bool() ? pieces : [...pieces].reverse();
}

/** L1: ax + b = c, a > 1, positive integers, positive integer solution. */
function level1(r: Rng): Candidate {
  const a = pos(r, 2, 9);
  const s = pos(r, 1, 12);
  const b = pos(r, 1, 20);
  return { left: [V(a), C(b)], right: [C(a * s + b)], solution: rat(s), form: 'ax+b=c' };
}

/** L2: negatives; variable on both sides; integer solutions. */
function level2(r: Rng): Candidate {
  const s = nz(r, 12);
  if (r.bool()) {
    // b ± a·v = c, e.g. 7 − 3z = 13
    const a = nz(r, 9);
    const b = nz(r, 20);
    if (Math.abs(a) === 1) return level2(r);
    return { left: order(r, [C(b), V(a)]), right: [C(a * s + b)], solution: rat(s), form: 'b+av=c' };
  }
  // a·v + b = c·v + d with positive variable coefficients, e.g. 3a + 3 = a + 23
  const a = pos(r, 1, 9);
  let c = pos(r, 1, 9);
  if (c === a) c = a === 9 ? 1 : a + 1;
  const b = nz(r, 20);
  const d = (a - c) * s + b;
  return { left: [V(a), C(b)], right: [V(c), C(d)], solution: rat(s), form: 'av+b=cv+d' };
}

/** L3: variable on both sides with negatives; integer solutions; any term order. */
function level3(r: Rng, fractionSolution = false): Candidate {
  const a = nz(r, 9);
  let c = nz(r, 9);
  if (c === a) c = -a;
  const b = nz(r, 20);
  if (fractionSolution) {
    const d = nz(r, 30);
    return {
      left: order(r, [V(a), C(b)]),
      right: order(r, [V(c), C(d)]),
      solution: div(rat(d - b), rat(a - c)),
      form: 'av+b=cv+d',
    };
  }
  const s = nz(r, 15);
  const d = (a - c) * s + b;
  return {
    left: order(r, [V(a), C(b)]),
    right: order(r, [V(c), C(d)]),
    solution: rat(s),
    form: 'av+b=cv+d',
  };
}

/** L4: parentheses, one side then both. */
function level4(r: Rng, fractionSolution = false): Candidate {
  const k = r.pick([2, 3, 4, 5, 6, -2, -3]);
  const p = r.pick([1, 1, 1, 2, 3]);
  const m = nz(r, 9);
  const inner = [iv(p), ic(m)];
  const form = r.int(0, 2);
  const s = fractionSolution ? null : nz(r, 12);
  if (form === 0) {
    // k(pv + m) = c
    if (s === null) return level4(r, fractionSolution);
    return { left: [G(k, inner)], right: [C(k * (p * s + m))], solution: rat(s), form: 'k(pv+m)=c' };
  }
  if (form === 1) {
    // k(pv + m) = c·v + d
    let c = nz(r, 9);
    if (c === k * p) c = -c;
    if (s === null) {
      const d = nz(r, 40);
      return {
        left: [G(k, inner)],
        right: order(r, [V(c), C(d)]),
        solution: div(rat(d - k * m), rat(k * p - c)),
        form: 'k(pv+m)=cv+d',
      };
    }
    const d = (k * p - c) * s + k * m;
    return { left: [G(k, inner)], right: order(r, [V(c), C(d)]), solution: rat(s), form: 'k(pv+m)=cv+d' };
  }
  // k1(p1 v + m1) = k2(p2 v + m2), including −(v + m)
  const k2 = r.pick([2, 3, 4, -1, -2]);
  const p2 = 1;
  const coefDiff = k * p - k2 * p2;
  if (coefDiff === 0) return level4(r, fractionSolution);
  if (s === null) {
    const m2 = nz(r, 12);
    return {
      left: [G(k, inner)],
      right: [G(k2, [iv(p2), ic(m2)])],
      solution: div(rat(k2 * m2 - k * m), rat(coefDiff)),
      form: 'k(pv+m)=k(v+m)',
    };
  }
  // k2·m2 = coefDiff·s + k·m must divide evenly
  const rhs = coefDiff * s + k * m;
  if (rhs % k2 !== 0) return level4(r, fractionSolution);
  return {
    left: [G(k, inner)],
    right: [G(k2, [iv(p2), ic(rhs / k2)])],
    solution: rat(s),
    form: 'k(pv+m)=k(v+m)',
  };
}

/** L5: fraction answers and fraction coefficients. */
function level5(r: Rng): Candidate {
  const form = r.int(0, 2);
  if (form === 0) {
    // a·v + b = c with a fraction answer, e.g. 3x + 1 = 8
    const a = pos(r, 2, 9) * (r.int(0, 3) === 0 ? -1 : 1);
    const b = nz(r, 20);
    const c = nz(r, 30);
    const s = div(rat(c - b), rat(a));
    if (isInteger(s)) return level5(r);
    return { left: order(r, [V(a), C(b)]), right: [C(c)], solution: s, form: 'av+b=c (fraction answer)' };
  }
  if (form === 1) {
    // (p/q)·v + b = c with an integer answer, e.g. x/4 + 1 = 3
    const q = pos(r, 2, 9);
    const p = r.pick([1, 1, 2, 3, 5]);
    const coef = rat(p, q);
    if (isInteger(coef)) return level5(r);
    const t = nz(r, Math.floor(config.eq.maxAbsSolution / Number(coef.d)));
    const s = mul(rat(t), rat(Number(coef.d)));
    const b = nz(r, 12);
    const c = add(mul(coef, s), rat(b));
    return { left: [V(coef), C(b)], right: [C(c)], solution: s, form: '(p/q)v+b=c' };
  }
  // (p1/q1)v + b = (p2/q2)v + d with an integer answer, e.g. 2p/3 − 1 = p/6 + 2
  const q1 = pos(r, 2, 6);
  const q2 = pos(r, 2, 6);
  const c1 = rat(r.pick([1, 2, 3]), q1);
  const c2 = rat(r.pick([1, 1, 2]) * (r.bool() ? 1 : -1), q2);
  if (eq(c1, c2) || isInteger(c1) || isInteger(c2)) return level5(r);
  const step = Number(lcm(c1.d, c2.d));
  const maxT = Math.floor(config.eq.maxAbsSolution / step);
  if (maxT < 1) return level5(r);
  const s = rat(r.nonZero(-maxT, maxT) * step);
  const b = nz(r, 12);
  const d = add(mul(sub(c1, c2), s), rat(b));
  if (!isInteger(d) || eq(d, ZERO)) return level5(r);
  return { left: [V(c1), C(b)], right: order(r, [V(c2), C(d)]), solution: s, form: '(p/q)v+b=(p/q)v+d' };
}

/** L6: mixed review of 3–5, including negative fraction solutions. */
function level6(r: Rng): Candidate {
  const pick = r.int(0, 4);
  if (pick === 0) return level3(r, true);
  if (pick === 1) return level4(r, true);
  if (pick === 2) return level4(r, false);
  return level5(r);
}

const TEMPLATES: Record<number, (r: Rng) => Candidate> = {
  1: level1,
  2: level2,
  3: (r) => level3(r),
  4: (r) => level4(r),
  5: level5,
  6: level6,
};

export function generateEq(level: number, seed: number): EqQuestion {
  const template = TEMPLATES[level];
  if (!template) throw new RangeError(`no EQ level ${level}`);
  const r = mulberry32(seed);
  const variable = r.pick(config.variables);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const c = template(r);
    const text = `${piecesText(c.left, variable)} = ${piecesText(c.right, variable)}`;
    const parsed = parseEquation(text, variable);
    if (!parsed.ok) continue;
    const lin = linearize(parsed.eq);
    if (!valid(c, level, text, lin)) continue;
    return { generatorId: EQ_GENERATOR_ID, seed, level, variable, text, solution: c.solution, form: c.form };
  }
  throw new Error(`EQ generator failed for level ${level}, seed ${seed}`);
}
