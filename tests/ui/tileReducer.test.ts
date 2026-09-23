// Tile builder flow (R-EQ-TILE-1…5, design.md §6.2), without a browser.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  startTiles,
  tileReducer,
  tilesFor,
  type TileAction,
  type TileState,
} from '../../src/ui/practice/tileReducer';
import { EQ_GENERATOR_ID } from '../../src/engine/topics/eq/generator';
import { correctSign, mustCross, other, sideOf } from '../../src/engine/eq/tiles';
import { formatRational, rat } from '../../src/engine/rational';

const M = '−';
const act = (s: TileState, ...actions: TileAction[]) => actions.reduce(tileReducer, s);

/** Type a number on the pad and submit it. */
function enter(s: TileState, value: string): TileState {
  for (const ch of value) s = tileReducer(s, { type: 'padKey', key: ch === '-' ? M : ch });
  return tileReducer(s, { type: 'submit' });
}

function moveAll(s: TileState): TileState {
  for (const t of s.board.tiles) {
    if (!mustCross(s.board, t.id)) continue;
    s = act(
      s,
      { type: 'drop', id: t.id, to: other(sideOf(s.board, t.id)) },
      { type: 'sign', sign: correctSign(t) },
    );
  }
  return tileReducer(s, { type: 'doneMoving' });
}

/** Finish Simplify and Solve with the right numbers. */
function finish(s: TileState): TileState {
  const p = s.plan!;
  if (s.phase === 'SIMPLIFY_VAR') s = enter(s, formatRational(p.c).replace(M, '-'));
  if (s.phase === 'SIMPLIFY_CONST') s = enter(s, formatRational(p.d).replace(M, '-'));
  if (s.phase === 'SOLVE_DIVISOR') s = enter(s, formatRational(p.solve!.divisor).replace(M, '-'));
  if (s.phase === 'SOLVE_ANSWER') s = enter(s, formatRational(p.solve!.answer).replace(M, '-'));
  return s;
}

/** A §7.5 example as a level-2 tile question. */
const example = (text: string, variable: string, solution: number): TileState =>
  tilesFor({
    generatorId: EQ_GENERATOR_ID,
    seed: 0,
    level: 2,
    variable,
    text,
    solution: rat(solution),
    form: 'test',
  });
const P = '3a + 3 = a + 23';

describe('tileReducer', () => {
  it('solves every L1–L2 question end to end with clean records (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), fc.constantFrom(1, 2), (seed, level) => {
        const s = finish(moveAll(startTiles(level, seed)));
        expect(s.solved).toBe(true);
        expect(s.attempt.clean).toBe(true);
        expect(s.attempt.finishedAt).toBeDefined();
        expect(s.lines[1]!.label).toMatch(/^moved/);
        expect(s.attempt.tries.every((t) => t.verdict === 'stepAccepted')).toBe(true);
        expect(s.attempt.tries.some((t) => t.stepType === 'SIGN')).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('3a + 3 = a + 23: the recorded lines are the method of §7.1', () => {
    const s = finish(moveAll(example(P, 'a', 10)));
    expect(s.lines.map((l) => l.text)).toEqual([
      '3a + 3 = a + 23',
      `3a ${M} a = 23 ${M} 3`,
      `2a = 23 ${M} 3`,
      '2a = 20',
      'a = 10',
    ]);
  });

  it('a wrong sign shows the balance explanation, is stored as EQ-D4, and two are a wrong try', () => {
    let s = example(P, 'a', 10);
    const a = s.board.tiles[2]!;
    s = act(s, { type: 'drop', id: a.id, to: 'L' }, { type: 'sign', sign: 1 });
    expect(s.feedback).toMatchObject({ kind: 'sign', term: 'a', view: { op: `${M} a` } });
    expect(s.attempt.tries.at(-1)).toMatchObject({ stepType: 'SIGN', diagnostic: 'EQ-D4' });
    expect(s.hintOpen).toBe(false);
    s = tileReducer(s, { type: 'sign', sign: 1 });
    expect([s.wrongTries, s.hintOpen, s.hintTier, s.helpPulse]).toEqual([1, true, 1, true]);
    // The balance explanation is feedback, not a hint tier of its own.
    expect(s.attempt.maxHint).toBe(1);
    s = tileReducer(s, { type: 'sign', sign: -1 });
    expect(s.feedback).toBeNull();
    expect(s.balance?.view.after).toEqual({ L: `3a + 3 ${M} a`, R: '23' });
    expect(s.correctSigns).toBe(1);
  });

  it('dragging a tile that is already on its side returns it with a gentle note', () => {
    let s = example(P, 'a', 10);
    s = tileReducer(s, { type: 'drop', id: s.board.tiles[0]!.id, to: 'R' });
    expect(s.feedback).toMatchObject({ kind: 'alreadyPlaced', term: '3a', isVar: true });
    expect(s.board.moved).toEqual([]);
    expect(s.rejectionsThisStep).toBe(0);
  });

  it('swap works until the first tile crosses, and Done moving waits for every tile', () => {
    let s = example(P, 'a', 10);
    s = tileReducer(s, { type: 'swap' });
    expect(s.board.unknowns).toBe('R');
    s = tileReducer(s, { type: 'swap' });
    s = tileReducer(s, { type: 'drop', id: s.board.tiles[1]!.id, to: 'R' });
    expect(tileReducer(s, { type: 'swap' })).toBe(s);
    expect(tileReducer(s, { type: 'doneMoving' })).toBe(s);
    expect(s.attempt.tries.filter((t) => t.stepType === 'SWAP')).toHaveLength(2);
  });

  it('wrong numbers: EQ-D7 in Simplify, a divisor note, EQ-D8 in Solve', () => {
    let s = moveAll(example(P, 'a', 10));
    expect(s.phase).toBe('SIMPLIFY_VAR');
    s = enter(s, '4');
    expect(s.feedback).toMatchObject({
      kind: 'diagnostic',
      result: { code: 'EQ-D7', params: { expression: `3a ${M} a` } },
    });
    s = enter(s, '2');
    expect(s.phase).toBe('SIMPLIFY_CONST');
    s = enter(s, '26');
    expect(s.feedback).toMatchObject({
      kind: 'diagnostic',
      result: { code: 'EQ-D7', params: { expression: `23 ${M} 3` } },
    });
    expect(s.wrongTries).toBe(1); // two rejections in the same step
    s = enter(s, '20');
    expect(s.phase).toBe('SOLVE_DIVISOR');
    expect(s.rejectionsThisStep).toBe(0);
    s = enter(s, '20');
    expect(s.feedback).toEqual({ kind: 'divisor' });
    s = enter(s, '2');
    s = enter(s, '18');
    expect(s.feedback).toMatchObject({ kind: 'diagnostic', result: { code: 'EQ-D8' } });
    s = enter(s, '10');
    expect(s.solved).toBe(true);
    expect(s.attempt.clean).toBe(false);
  });

  it('7 − 3z = 13: negative divisor and answer with the pad minus key', () => {
    let s = moveAll(example(`7 ${M} 3z = 13`, 'z', -2));
    expect(s.phase).toBe('SIMPLIFY_CONST');
    s = enter(s, '6');
    expect(s.lines.at(-1)!.text).toBe(`${M}3z = 6`);
    s = enter(s, '-3');
    s = enter(s, '-2');
    expect(s.lines.at(-1)!.text).toBe(`z = ${M}2`);
    expect(s.solved).toBe(true);
  });

  it('the pad minus key toggles the sign; back and clear edit the entry', () => {
    let s = moveAll(example(P, 'a', 10));
    s = act(s, { type: 'padKey', key: '1' }, { type: 'padKey', key: M }, { type: 'padKey', key: '2' });
    expect(s.entry).toBe(`${M}12`);
    s = act(s, { type: 'padKey', key: M }, { type: 'padKey', key: 'back' });
    expect(s.entry).toBe('1');
    s = tileReducer(s, { type: 'padKey', key: 'clear' });
    expect(s.entry).toBe('');
    expect(tileReducer(s, { type: 'submit' })).toBe(s);
  });

  it('walkthrough mid-tile starts from the last accepted line and ends the question', () => {
    let s = moveAll(example(P, 'a', 10));
    s = tileReducer(s, { type: 'walkStart' });
    expect(s.walk!.steps[0]!.before).toBe(`3a ${M} a = 23 ${M} 3`);
    expect(tileReducer(s, { type: 'padKey', key: '1' })).toBe(s);
    while (!s.solved) s = tileReducer(s, { type: 'walkNext' });
    expect(s.attempt).toMatchObject({ maxHint: 3, clean: false });
    expect(s.attempt).toMatchObject({ stars: 1, wrongTries: 0 });
  });
});
