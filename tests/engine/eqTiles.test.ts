// Tile builder model (R-EQ-TILE-1…5, R-EQ-PED-1). The board's lines must be exactly what the
// step checker accepts, and the phases must reproduce the generator's solution.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { generateEq } from '../../src/engine/topics/eq/generator';
import { checkStep } from '../../src/engine/eq/stepChecker';
import { eq, formatRational, neg, rat } from '../../src/engine/rational';
import {
  allPlaced,
  awaitingSign,
  balanceView,
  boardText,
  canSwap,
  chooseSign,
  correctSign,
  drop,
  mustCross,
  newBoard,
  other,
  separatedLine,
  sideOf,
  simplifyPlan,
  swap,
  type Board,
  type Side,
} from '../../src/engine/eq/tiles';

const M = '−';
const seedArb = fc.integer({ min: 0, max: 0xffffffff });

/** Move every tile that must cross, choosing the correct sign. */
function solveBoard(b: Board): Board {
  for (const t of b.tiles) {
    if (!mustCross(b, t.id)) continue;
    b = drop(b, t.id, other(sideOf(b, t.id))).board;
    b = chooseSign(b, correctSign(t)).board;
  }
  return b;
}

describe('3a + 3 = a + 23 (§7.5)', () => {
  const P = '3a + 3 = a + 23';

  it('has one tile per term', () => {
    const b = newBoard(P, 'a');
    expect(b.tiles.map((t) => [formatRational(t.coef), t.isVar, t.home])).toEqual([
      ['3', true, 'L'],
      ['3', false, 'L'],
      ['1', true, 'R'],
      ['23', false, 'R'],
    ]);
  });

  it('unknowns left: +3 and a must cross; building gives 3a − a = 23 − 3', () => {
    let b = newBoard(P, 'a');
    const three = b.tiles[1]!;
    const a = b.tiles[2]!;
    expect(b.tiles.map((t) => mustCross(b, t.id))).toEqual([false, true, true, false]);
    b = drop(b, three.id, 'R').board;
    expect(boardText(b)).toBe(`3a = a + 23 ? 3`);
    expect(awaitingSign(b)?.id).toBe(three.id);
    const wrong = chooseSign(b, 1);
    expect(wrong.correct).toBe(false);
    expect(wrong.board).toBe(b);
    b = chooseSign(b, -1).board;
    expect(boardText(b)).toBe(`3a = a + 23 ${M} 3`);
    b = drop(b, a.id, 'L').board;
    expect(boardText(b)).toBe(`3a ? a = 23 ${M} 3`);
    b = chooseSign(b, -1).board;
    expect(allPlaced(b)).toBe(true);
    expect(separatedLine(b)).toBe(`3a ${M} a = 23 ${M} 3`);
  });

  it('swapped (unknowns right) gives 3 − 23 = a − 3a, also a valid SEPARATE (R-EQ-CHK-1)', () => {
    const b = solveBoard(swap(newBoard(P, 'a')));
    const line = separatedLine(b);
    expect(line).toBe(`3 ${M} 23 = a ${M} 3a`);
    expect(checkStep(P, line, { variable: 'a', level: 2, allowSkipping: false })).toMatchObject({
      accepted: true,
      stepType: 'SEPARATE',
    });
  });

  it('a tile already on its side is not moved; a drop on its own side returns it', () => {
    const b = newBoard(P, 'a');
    expect(drop(b, b.tiles[0]!.id, 'R').result).toBe('alreadyPlaced');
    expect(drop(b, b.tiles[1]!.id, 'L').result).toBe('returned');
  });

  it('only one tile can wait for a sign at a time', () => {
    let b = newBoard(P, 'a');
    b = drop(b, b.tiles[1]!.id, 'R').board;
    expect(drop(b, b.tiles[2]!.id, 'L').result).toBe('returned');
  });

  it('swap is possible only before the first crossing', () => {
    let b = newBoard(P, 'a');
    expect(canSwap(b)).toBe(true);
    b = drop(b, b.tiles[1]!.id, 'R').board;
    expect(canSwap(b)).toBe(false);
    expect(swap(b)).toBe(b);
  });

  it('balance view for moving a: take a from both sides', () => {
    let b = newBoard(P, 'a');
    b = drop(b, b.tiles[2]!.id, 'L').board;
    const v = balanceView(b, b.tiles[2]!.id);
    expect(v).toEqual({
      before: { L: '3a + 3', R: 'a + 23' },
      op: `${M} a`,
      subtract: true,
      amount: 'a',
      after: { L: `3a + 3 ${M} a`, R: '23' },
    });
  });

  it('simplify and solve: 3a − a = ? a → 2, 23 − 3 = ? → 20, divide by 2, a = 10', () => {
    const p = simplifyPlan(`3a ${M} a = 23 ${M} 3`, 'a');
    expect(p).toMatchObject({
      varSide: 'L',
      varText: `3a ${M} a`,
      constText: `23 ${M} 3`,
      needVar: true,
      needConst: true,
      afterVar: `2a = 23 ${M} 3`,
      simplified: '2a = 20',
      solve: { line: 'a = 10' },
    });
    expect(eq(p.c, rat(2))).toBe(true);
    expect(eq(p.d, rat(20))).toBe(true);
    expect(eq(p.solve!.divisor, rat(2))).toBe(true);
  });
});

describe('7 − 3z = 13 (§7.5)', () => {
  const P = `7 ${M} 3z = 13`;
  it('unknowns left: −3z = 13 − 7, then −3z = 6, divide by −3, z = −2', () => {
    const line = separatedLine(solveBoard(newBoard(P, 'z')));
    expect(line).toBe(`${M}3z = 13 ${M} 7`);
    const p = simplifyPlan(line, 'z');
    expect(p.needVar).toBe(false);
    expect(p.needConst).toBe(true);
    expect(p.simplified).toBe(`${M}3z = 6`);
    expect(formatRational(p.solve!.divisor)).toBe(`${M}3`);
    expect(p.solve!.line).toBe(`z = ${M}2`);
  });
  it('unknowns right: 7 − 13 = 3z', () => {
    expect(separatedLine(solveBoard(swap(newBoard(P, 'z'))))).toBe(`7 ${M} 13 = 3z`);
  });
  it('the sign of a crossing −3z is +', () => {
    const b = swap(newBoard(P, 'z'));
    expect(correctSign(b.tiles[1]!)).toBe(1);
  });
});

describe('coefficient 1 after simplifying skips Solve (R-EQ-CHK-4)', () => {
  it('2a − a = 5 has no solve phase', () => {
    const p = simplifyPlan(`2a ${M} a = 5`, 'a');
    expect(p.simplified).toBe('a = 5');
    expect(p.solve).toBeNull();
  });
});

for (const level of [1, 2]) {
  describe(`level ${level} property (1000 seeds, both orientations)`, () => {
    it('correct moves give lines the step checker accepts and the generator solution', () => {
      fc.assert(
        fc.property(seedArb, fc.boolean(), (seed, swapped) => {
          const q = generateEq(level, seed);
          const opts = { variable: q.variable, level, allowSkipping: false };
          let b = newBoard(q.text, q.variable);
          if (swapped) b = swap(b);
          const unknowns: Side = b.unknowns;
          // Every wrong sign is refused before the right one is accepted.
          for (const t of b.tiles) {
            if (!mustCross(b, t.id)) continue;
            b = drop(b, t.id, other(sideOf(b, t.id))).board;
            const wrong = chooseSign(b, (correctSign(t) * -1) as 1 | -1);
            expect(wrong.correct).toBe(false);
            b = chooseSign(b, correctSign(t)).board;
          }
          expect(allPlaced(b)).toBe(true);
          const sep = separatedLine(b);
          const r1 = checkStep(q.text, sep, opts);
          expect(r1, `${q.text} → ${sep}`).toMatchObject({ accepted: true, stepType: 'SEPARATE' });

          const p = simplifyPlan(sep, q.variable);
          expect(p.varSide).toBe(unknowns);
          let prev = sep;
          if (p.needVar && p.needConst) {
            expect(checkStep(prev, p.afterVar, opts)).toMatchObject({ accepted: true, stepType: 'SIMPLIFY' });
            prev = p.afterVar;
          }
          const r2 = checkStep(prev, p.simplified, opts);
          expect(r2, `${prev} → ${p.simplified}`).toMatchObject({ accepted: true, stepType: 'SIMPLIFY' });
          if (p.solve) {
            expect(checkStep(p.simplified, p.solve.line, opts)).toMatchObject({
              accepted: true,
              solved: true,
            });
            expect(eq(p.solve.answer, q.solution)).toBe(true);
          } else {
            expect(r2).toMatchObject({ solved: true });
            expect(eq(p.d, q.solution)).toBe(true);
          }
          // Balance view of each crossing adds the negated term to both pans.
          for (const m of b.moved) {
            const t = b.tiles.find((x) => x.id === m.id)!;
            const v = balanceView(b, t.id);
            expect(v.subtract).toBe(neg(t.coef).n < 0n);
          }
        }),
        { numRuns: 1000 },
      );
    });
  });
}
