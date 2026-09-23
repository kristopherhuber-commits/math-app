// Tile builder practice state for EQ levels 1–2 (R-EQ-TILE-1…6, design.md §6.2). The board's
// meaning comes from the engine (src/engine/eq/tiles.ts); this reducer only sequences the phases
// and records every move, sign choice and entry as a TryRecord (R-PAR-4 replays them in M5).
import { config } from '../../engine/config';
import { checkStep, type StepResult } from '../../engine/eq/stepChecker';
import { generateEq, type EqQuestion } from '../../engine/topics/eq/generator';
import { formatRational } from '../../engine/rational';
import {
  allPlaced,
  awaitingSign,
  balanceView,
  canSwap,
  chooseSign,
  drop,
  entryEquals,
  newBoard,
  separatedLine,
  sideOf,
  simplifyPlan,
  swap,
  tileById,
  tileText,
  type BalanceView,
  type Board,
  type Side,
  type Sign,
  type SimplifyPlan,
} from '../../engine/eq/tiles';
import { MINUS } from '../../engine/eq/format';
import { newAttempt, withTry } from '../../data/attempts';
import type { TryRecord } from '../../data/db';
import {
  freshHelp,
  onCloseHint,
  onHelp,
  onMoreHint,
  onRejection,
  onSolved,
  onStepAccepted,
  onWalkBack,
  onWalkNext,
  onWalkStart,
  type HelpFields,
} from './help';
import type { Line, Rejection } from './practiceReducer';

export type TilePhase = 'MOVE' | 'SIMPLIFY_VAR' | 'SIMPLIFY_CONST' | 'SOLVE_DIVISOR' | 'SOLVE_ANSWER';

export type TileFeedback =
  /** Wrong sign: the turtle's balance explanation (R-EQ-TILE-2), the picker stays open. */
  | { kind: 'sign'; term: string; view: BalanceView }
  /** A tile that is already on its side was dragged across. */
  | { kind: 'alreadyPlaced'; term: string; isVar: boolean }
  /** A wrong number in Simplify / Solve: the typed-mode diagnostic (EQ-D7, EQ-D8). */
  | { kind: 'diagnostic'; result: Rejection }
  /** A wrong divisor in "Divide both sides by …?". */
  | { kind: 'divisor' };

export interface TileState extends HelpFields {
  level: number;
  questionNumber: number;
  question: EqQuestion;
  board: Board;
  phase: TilePhase;
  lines: Line[];
  plan: SimplifyPlan | null;
  /** Number pad entry (Simplify / Solve). */
  entry: string;
  feedback: TileFeedback | null;
  /** The last correct crossing, replayed on the balance scale (R-EQ-PED-1). */
  balance: { view: BalanceView; n: number } | null;
  /** Correct sign choices this session, added to the stored count for R-EQ-PED-2. */
  correctSigns: number;
}

export type TileAction =
  | { type: 'drop'; id: string; to: Side }
  | { type: 'sign'; sign: Sign }
  | { type: 'swap' }
  | { type: 'doneMoving' }
  | { type: 'padKey'; key: string }
  | { type: 'submit' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'walkStart' }
  | { type: 'walkNext' }
  | { type: 'walkBack' }
  | { type: 'next'; seed: number };

export function startTiles(level: number, seed: number, questionNumber = 1, correctSigns = 0): TileState {
  return tilesFor(generateEq(level, seed), questionNumber, correctSigns);
}

/** Tile state for a given question (tests build §7.5 examples directly). */
export function tilesFor(question: EqQuestion, questionNumber = 1, correctSigns = 0): TileState {
  const { level, seed } = question;
  return {
    level,
    questionNumber,
    question,
    board: newBoard(question.text, question.variable),
    phase: 'MOVE',
    lines: [{ text: question.text, label: 'given' }],
    plan: null,
    entry: '',
    feedback: null,
    balance: null,
    correctSigns,
    ...freshHelp,
    solved: false,
    attempt: newAttempt({
      topic: 'EQ',
      level,
      generatorId: question.generatorId,
      seed,
      params: { level, form: question.form, solution: formatRational(question.solution), mode: 'tiles' },
    }),
  };
}

const record = (s: TileState, t: Omit<TryRecord, 'at'>): TileState => ({
  ...s,
  attempt: withTry(s.attempt, t),
});

const lastLine = (s: TileState) => s.lines[s.lines.length - 1]!.text;

/** Append an accepted line; the step checker labels it and must accept it. */
function appendLine(s: TileState, line: string): { s: TileState; solved: boolean } {
  const r: StepResult = checkStep(lastLine(s), line, {
    variable: s.question.variable,
    level: s.level,
    allowSkipping: false,
  });
  if (!r.accepted) throw new Error(`tile line refused: ${lastLine(s)} → ${line} (${r.code})`);
  const next = record(
    { ...s, lines: [...s.lines, { text: line, label: r.label }] },
    { answer: line, verdict: 'stepAccepted', stepType: r.stepType },
  );
  return { s: next, solved: r.solved };
}

/** Simplify is done (the simplified line is appended): go to Solve, or finish when c = 1. */
function toSolve(s: TileState, solved: boolean): TileState {
  const next = onStepAccepted({ ...s, entry: '', feedback: null });
  if (solved || !s.plan?.solve) return onSolved(next);
  return { ...next, phase: 'SOLVE_DIVISOR' };
}

function reject(s: TileState, feedback: TileFeedback, t: Omit<TryRecord, 'at'>): TileState {
  return onRejection(record({ ...s, feedback, entry: '' }, t));
}

function submit(s: TileState): TileState {
  const plan = s.plan;
  const entry = s.entry.trim();
  if (!plan || entry === '' || entry === MINUS) return s;
  const v = s.question.variable;
  switch (s.phase) {
    case 'SIMPLIFY_VAR': {
      if (!entryEquals(entry, plan.c)) {
        return reject(
          s,
          {
            kind: 'diagnostic',
            result: {
              accepted: false,
              kind: 'diagnostic',
              code: 'EQ-D7',
              params: { expression: plan.varText },
            },
          },
          {
            answer: { part: 'unknowns', entry },
            verdict: 'stepRejected',
            stepType: 'SIMPLIFY',
            diagnostic: 'EQ-D7',
          },
        );
      }
      if (plan.needConst) {
        const { s: next } = appendLine({ ...s, entry: '', feedback: null }, plan.afterVar);
        return { ...next, phase: 'SIMPLIFY_CONST' };
      }
      const { s: next, solved } = appendLine(s, plan.simplified);
      return toSolve(next, solved);
    }
    case 'SIMPLIFY_CONST': {
      if (!entryEquals(entry, plan.d)) {
        return reject(
          s,
          {
            kind: 'diagnostic',
            result: {
              accepted: false,
              kind: 'diagnostic',
              code: 'EQ-D7',
              params: { expression: plan.constText },
            },
          },
          {
            answer: { part: 'knowns', entry },
            verdict: 'stepRejected',
            stepType: 'SIMPLIFY',
            diagnostic: 'EQ-D7',
          },
        );
      }
      const { s: next, solved } = appendLine(s, plan.simplified);
      return toSolve(next, solved);
    }
    case 'SOLVE_DIVISOR': {
      const solve = plan.solve!;
      if (!entryEquals(entry, solve.divisor)) {
        return reject(
          s,
          { kind: 'divisor' },
          {
            answer: { part: 'divisor', entry },
            verdict: 'stepRejected',
            stepType: 'SOLVE',
            diagnostic: 'TILE-DIVISOR',
          },
        );
      }
      return record(
        { ...s, phase: 'SOLVE_ANSWER', entry: '', feedback: null },
        { answer: { part: 'divisor', entry }, verdict: 'stepAccepted', stepType: 'SOLVE' },
      );
    }
    case 'SOLVE_ANSWER': {
      const solve = plan.solve!;
      if (!entryEquals(entry, solve.answer)) {
        return reject(
          s,
          {
            kind: 'diagnostic',
            result: {
              accepted: false,
              kind: 'diagnostic',
              code: 'EQ-D8',
              params: { c: formatRational(plan.c), variable: v, d: formatRational(plan.d) },
            },
          },
          {
            answer: { part: 'answer', entry },
            verdict: 'stepRejected',
            stepType: 'SOLVE',
            diagnostic: 'EQ-D8',
          },
        );
      }
      const { s: next } = appendLine({ ...s, entry: '', feedback: null }, solve.line);
      return onSolved(onStepAccepted(next));
    }
    default:
      return s;
  }
}

function padKey(entry: string, key: string): string {
  if (key === 'back') return entry.slice(0, -1);
  if (key === 'clear') return '';
  if (key === MINUS || key === '-') return entry.startsWith(MINUS) ? entry.slice(1) : MINUS + entry;
  if (/^\d$/.test(key)) return entry.replace(MINUS, '').length >= 4 ? entry : entry + key;
  return entry;
}

export function tileReducer(s: TileState, action: TileAction): TileState {
  const v = s.question.variable;
  const busy = s.solved || s.walk !== null;
  switch (action.type) {
    case 'drop': {
      if (busy || s.phase !== 'MOVE') return s;
      const from = sideOf(s.board, action.id);
      const r = drop(s.board, action.id, action.to);
      const t = tileById(s.board, action.id);
      const answer = { tile: tileText(t, v), from, to: action.to };
      if (r.result === 'crossed')
        return record(
          { ...s, board: r.board, feedback: null },
          { answer, verdict: 'stepAccepted', stepType: 'MOVE' },
        );
      if (r.result === 'alreadyPlaced')
        return record(
          { ...s, feedback: { kind: 'alreadyPlaced', term: tileText(t, v), isVar: t.isVar } },
          { answer, verdict: 'stepRejected', stepType: 'MOVE', diagnostic: 'TILE-ALREADY-PLACED' },
        );
      return s;
    }

    case 'sign': {
      if (busy || s.phase !== 'MOVE') return s;
      const t = awaitingSign(s.board);
      if (!t) return s;
      const r = chooseSign(s.board, action.sign);
      const answer = { tile: tileText(t, v), sign: action.sign > 0 ? '+' : MINUS };
      if (r.correct) {
        return record(
          {
            ...s,
            board: r.board,
            feedback: null,
            balance: { view: balanceView(r.board, t.id), n: (s.balance?.n ?? 0) + 1 },
            correctSigns: s.correctSigns + 1,
          },
          { answer, verdict: 'stepAccepted', stepType: 'SIGN' },
        );
      }
      return onRejection(
        record(
          { ...s, feedback: { kind: 'sign', term: tileText(t, v), view: balanceView(s.board, t.id) } },
          { answer, verdict: 'stepRejected', stepType: 'SIGN', diagnostic: 'EQ-D4' },
        ),
      );
    }

    case 'swap':
      if (busy || s.phase !== 'MOVE' || !canSwap(s.board)) return s;
      return record(
        { ...s, board: swap(s.board), feedback: null },
        {
          answer: { unknowns: swap(s.board).unknowns === 'L' ? 'left' : 'right' },
          verdict: 'stepAccepted',
          stepType: 'SWAP',
        },
      );

    case 'doneMoving': {
      if (busy || s.phase !== 'MOVE' || !allPlaced(s.board)) return s;
      const sep = separatedLine(s.board);
      const { s: next } = appendLine({ ...s, feedback: null, balance: null }, sep);
      const plan = simplifyPlan(sep, v);
      const moved = onStepAccepted({ ...next, plan });
      if (plan.needVar) return { ...moved, phase: 'SIMPLIFY_VAR' };
      if (plan.needConst) return { ...moved, phase: 'SIMPLIFY_CONST' };
      // Nothing to combine (not produced by the L1–2 generators, but keep the flow total).
      const { s: simp, solved } = appendLine(moved, plan.simplified);
      return toSolve(simp, solved);
    }

    case 'padKey':
      if (busy || s.phase === 'MOVE') return s;
      return { ...s, entry: padKey(s.entry, action.key) };

    case 'submit':
      if (busy) return s;
      return submit(s);

    case 'help':
      return onHelp(s);
    case 'moreHint':
      return onMoreHint(s);
    case 'closeHint':
      return onCloseHint(s);
    case 'walkStart':
      return onWalkStart({ ...s, feedback: null }, lastLine(s), s.question.text, v);
    case 'walkNext':
      return onWalkNext(s);
    case 'walkBack':
      return onWalkBack(s);

    case 'next':
      return startTiles(s.level, action.seed, s.questionNumber + 1, s.correctSigns);
  }
}

/** Levels that use the tile builder (R-ANS-5). */
export const isTileLevel = (level: number): boolean => config.eq.tileLevels.includes(level);
