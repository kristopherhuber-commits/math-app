// Tile builder model for EQ levels 1–2 (R-EQ-TILE-1…5, R-EQ-PED-1). Pure: the UI only moves
// tiles around and asks this module what the board means. Each term of the given equation is one
// tile; a tile that crosses the = flips its sign, and the learner has to choose that sign.
import { div, eq, formatRational, isZero, neg, ONE, parseRational, sign, type Rational } from '../rational';
import { MINUS, sideText, termMagnitude, termText } from './format';
import { allTerms, linearize } from './linear';
import { parseEquation } from './parse';

export type Side = 'L' | 'R';
export type Sign = 1 | -1;

export interface Tile {
  id: string;
  coef: Rational;
  isVar: boolean;
  home: Side;
}

export interface Move {
  id: string;
  /** Chosen sign after crossing; null while the SignPicker is open. */
  sign: Sign | null;
}

export interface Board {
  variable: string;
  tiles: Tile[];
  /** The side the learner chose for the unknowns (R-EQ-TILE-2; default left). */
  unknowns: Side;
  /** Tiles that crossed the =, in the order they crossed. */
  moved: Move[];
}

/** A term as it currently shows on the board. `coef` is null while its sign is still `?`. */
export interface BoardTerm {
  id: string;
  isVar: boolean;
  coef: Rational | null;
  /** Magnitude text without sign: `3a`, `a`, `23`. */
  magnitude: string;
  crossed: boolean;
}

export const other = (s: Side): Side => (s === 'L' ? 'R' : 'L');

export function newBoard(text: string, variable: string): Board {
  const r = parseEquation(text, variable);
  if (!r.ok) throw new Error(`tile board for unparseable line: ${text}`);
  const e = linearize(r.eq);
  const counts = { L: 0, R: 0 };
  const tiles = allTerms(e).map((t) => ({
    id: `${t.side}${counts[t.side]++}`,
    coef: t.coef,
    isVar: t.isVar,
    home: t.side,
  }));
  return { variable, tiles, unknowns: 'L', moved: [] };
}

export function tileById(b: Board, id: string): Tile {
  const t = b.tiles.find((x) => x.id === id);
  if (!t) throw new Error(`no tile ${id}`);
  return t;
}

const moveOf = (b: Board, id: string): Move | undefined => b.moved.find((m) => m.id === id);

/** The side a tile is on now. */
export function sideOf(b: Board, id: string): Side {
  const t = tileById(b, id);
  return moveOf(b, id) ? other(t.home) : t.home;
}

/** The side a tile belongs on: unknowns with unknowns, knowns with knowns. */
export function targetSide(b: Board, t: Tile): Side {
  return t.isVar ? b.unknowns : other(b.unknowns);
}

/** A tile on the wrong side must cross the =. */
export function mustCross(b: Board, id: string): boolean {
  const t = tileById(b, id);
  return t.home !== targetSide(b, t);
}

/** Swapping which side holds the unknowns is only possible before anything has crossed. */
export function canSwap(b: Board): boolean {
  return b.moved.length === 0;
}

export function swap(b: Board): Board {
  if (!canSwap(b)) return b;
  return { ...b, unknowns: other(b.unknowns) };
}

/** The coefficient a tile has once it has crossed: its sign flips. */
export function crossedCoef(t: Tile): Rational {
  return neg(t.coef);
}

/** The correct sign for a tile that just crossed. */
export function correctSign(t: Tile): Sign {
  return sign(t.coef) > 0 ? -1 : 1;
}

export type DropResult = 'crossed' | 'returned' | 'alreadyPlaced';

/**
 * Drop a tile on a side. A drop on its own side (or a tile that already crossed) just returns it;
 * a tile that doesn't need to cross returns with a gentle 'alreadyPlaced'.
 */
export function drop(b: Board, id: string, to: Side): { board: Board; result: DropResult } {
  if (to === sideOf(b, id) || moveOf(b, id)) return { board: b, result: 'returned' };
  if (!mustCross(b, id)) return { board: b, result: 'alreadyPlaced' };
  if (b.moved.some((m) => m.sign === null)) return { board: b, result: 'returned' };
  return { board: { ...b, moved: [...b.moved, { id, sign: null }] }, result: 'crossed' };
}

/** The tile whose sign is being chosen, if any. */
export function awaitingSign(b: Board): Tile | null {
  const m = b.moved.find((x) => x.sign === null);
  return m ? tileById(b, m.id) : null;
}

/** Choose the sign of the tile that just crossed. A wrong sign leaves the picker open. */
export function chooseSign(b: Board, s: Sign): { board: Board; correct: boolean } {
  const t = awaitingSign(b);
  if (!t) return { board: b, correct: false };
  if (s !== correctSign(t)) return { board: b, correct: false };
  return {
    board: { ...b, moved: b.moved.map((m) => (m.id === t.id ? { ...m, sign: s } : m)) },
    correct: true,
  };
}

/** Terms on one side: tiles that stayed, in their original order, then arrivals in crossing order. */
export function sideTerms(b: Board, side: Side): BoardTerm[] {
  const v = b.variable;
  const stayed = b.tiles
    .filter((t) => t.home === side && !moveOf(b, t.id))
    .map((t) => ({
      id: t.id,
      isVar: t.isVar,
      coef: t.coef as Rational | null,
      magnitude: termMagnitude(t.coef, t.isVar, v),
      crossed: false,
    }));
  const arrived = b.moved
    .map((m) => ({ m, t: tileById(b, m.id) }))
    .filter(({ t }) => other(t.home) === side)
    .map(({ m, t }) => ({
      id: t.id,
      isVar: t.isVar,
      coef: m.sign === null ? null : crossedCoef(t),
      magnitude: termMagnitude(t.coef, t.isVar, v),
      crossed: true,
    }));
  return [...stayed, ...arrived];
}

function termsText(terms: BoardTerm[]): string {
  return terms
    .map((t, i) => {
      const s = t.coef === null ? '?' : sign(t.coef) < 0 ? MINUS : '+';
      if (i === 0) return (s === '+' ? '' : s) + t.magnitude;
      return ` ${s} ${t.magnitude}`;
    })
    .join('');
}

/** The "So far:" readout (R-EQ-TILE-3), with `?` where a sign is still being chosen. */
export function boardText(b: Board): string {
  return `${termsText(sideTerms(b, 'L'))} = ${termsText(sideTerms(b, 'R'))}`;
}

/** Every tile that had to cross has crossed and has its sign. */
export function allPlaced(b: Board): boolean {
  return b.tiles.every((t) => !mustCross(b, t.id) || moveOf(b, t.id)?.sign != null);
}

/** The recorded Separate line, once all tiles are placed. */
export function separatedLine(b: Board): string {
  if (!allPlaced(b)) throw new Error('board not finished');
  return boardText(b);
}

/**
 * The balance-scale view of one crossing (R-EQ-PED-1): before the move, the operation applied to
 * both pans ("− a": take a away from both sides), and the shortcut result.
 */
export interface BalanceView {
  before: { L: string; R: string };
  /** Signed text of what is added to both sides: `− a`, `+ 3`. */
  op: string;
  /** Whether the operation is a subtraction (for "take away" vs "add" wording). */
  subtract: boolean;
  amount: string;
  after: { L: string; R: string };
}

export function balanceView(b: Board, id: string): BalanceView {
  const t = tileById(b, id);
  const beforeBoard: Board = { ...b, moved: b.moved.filter((m) => m.id !== id) };
  const idx = b.moved.findIndex((m) => m.id === id);
  const placed: Move = { id, sign: correctSign(t) };
  const afterMoved = idx >= 0 ? b.moved.map((m) => (m.id === id ? placed : m)) : [...b.moved, placed];
  const afterBoard: Board = { ...b, moved: afterMoved };
  const added = crossedCoef(t);
  const amount = termMagnitude(t.coef, t.isVar, b.variable);
  const pending = (bd: Board, side: Side) => termsText(sideTerms(bd, side).filter((x) => x.coef !== null));
  return {
    before: { L: pending(beforeBoard, 'L'), R: pending(beforeBoard, 'R') },
    op: `${sign(added) < 0 ? MINUS : '+'} ${amount}`,
    subtract: sign(added) < 0,
    amount,
    after: { L: pending(afterBoard, 'L'), R: pending(afterBoard, 'R') },
  };
}

// ---------- Simplify and Solve phases (R-EQ-TILE-4, R-EQ-TILE-5) ----------

export interface SimplifyPlan {
  varSide: Side;
  /** The separated line this plan starts from. */
  separated: string;
  /** Text of each side of the separated line, for prompts like "3a − a = ? a". */
  varText: string;
  constText: string;
  /** Combined coefficient and constant. */
  c: Rational;
  d: Rational;
  /** A side with one term has nothing to combine, so its sub-step is skipped. */
  needVar: boolean;
  needConst: boolean;
  /** Line after combining the unknowns only (only meaningful when both sub-steps are needed). */
  afterVar: string;
  /** The simplified line c·v = d. */
  simplified: string;
  /** Solve phase; null when c = 1 (Simplify already solved it, R-EQ-CHK-4). */
  solve: { divisor: Rational; answer: Rational; line: string } | null;
}

export function simplifyPlan(separated: string, variable: string): SimplifyPlan {
  const r = parseEquation(separated, variable);
  if (!r.ok) throw new Error(`unparseable separated line: ${separated}`);
  const e = linearize(r.eq);
  const varSide: Side = e.left.terms.length > 0 && e.left.terms.every((t) => t.isVar) ? 'L' : 'R';
  const vs = varSide === 'L' ? e.left : e.right;
  const cs = varSide === 'L' ? e.right : e.left;
  const c = vs.lin.a;
  const d = cs.lin.b;
  if (isZero(c)) throw new Error(`unknowns cancel in ${separated}`);
  const join = (l: string, rt: string) => (varSide === 'L' ? `${l} = ${rt}` : `${rt} = ${l}`);
  const cTerm = [{ coef: c, isVar: true }];
  const dTerm = [{ coef: d, isVar: false }];
  const simplified = join(sideText(cTerm, variable), sideText(dTerm, variable));
  const answer = div(d, c);
  return {
    varSide,
    separated,
    varText: separated.slice(vs.span.start, vs.span.end).trim(),
    constText: separated.slice(cs.span.start, cs.span.end).trim(),
    c,
    d,
    needVar: vs.terms.length > 1,
    needConst: cs.terms.length > 1,
    afterVar: join(sideText(cTerm, variable), separated.slice(cs.span.start, cs.span.end).trim()),
    simplified,
    solve: eq(c, ONE) ? null : { divisor: c, answer, line: join(variable, formatRational(answer)) },
  };
}

/** A number-pad entry equals the expected value, compared exactly (R-ARCH-2). */
export function entryEquals(entry: string, expected: Rational): boolean {
  const r = parseRational(entry);
  return r !== null && eq(r, expected);
}

/** Text of a tile for records and announcements, as the hints say it: `3a`, `−a`, `+3`, `−7`. */
export function tileText(t: Tile, v: string): string {
  if (t.isVar) return termText(t.coef, true, v);
  return (sign(t.coef) < 0 ? MINUS : '+') + termMagnitude(t.coef, false, v);
}
