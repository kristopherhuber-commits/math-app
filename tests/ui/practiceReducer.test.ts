import { describe, expect, it } from 'vitest';
import { practiceReducer, startPractice, type PracticeState } from '../../src/ui/practice/practiceReducer';
import { eqWalkthrough } from '../../src/engine/topics/eq/hints';

function type(s: PracticeState, line: string): PracticeState {
  return practiceReducer(practiceReducer(s, { type: 'input', value: line }), { type: 'check' });
}

describe('practiceReducer', () => {
  it('solves a question end to end and records every step for the attempt', () => {
    let s = startPractice(3, 12345);
    const steps = eqWalkthrough(s.question.text, s.question.variable).filter((x) => x.kind !== 'CHECK');
    for (const step of steps) s = type(s, step.line);
    expect(s.solved).toBe(true);
    expect(s.lines).toHaveLength(steps.length + 1);
    expect(s.attempt.tries.every((t) => t.verdict === 'stepAccepted')).toBe(true);
    expect(s.attempt.finishedAt).toBeDefined();
    expect(s.attempt.clean).toBe(true);
    expect(s.attempt.seed).toBe(12345);
  });

  it('normalises keyboard input to the keypad symbols', () => {
    const s = practiceReducer(startPractice(3, 1), { type: 'input', value: '3*a - 2' });
    expect(s.input).toBe('3×a − 2');
  });

  it('keeps a rejected line editable and stores it with its diagnostic code (R-PAR-4)', () => {
    let s = startPractice(3, 7);
    s = type(s, '1 + 1 = 5');
    expect(s.feedback?.result.code).toBe('EQ-D10');
    expect(s.input).toBe('1 + 1 = 5');
    expect(s.lines).toHaveLength(1);
    expect(s.attempt.tries.at(-1)).toMatchObject({ verdict: 'stepRejected', diagnostic: 'EQ-D10' });
  });

  it('offers help after two rejections on the same step, then advances a tier (R-HELP-2)', () => {
    let s = startPractice(3, 7);
    s = type(s, '1 + 1 = 5');
    expect(s.hintOpen).toBe(false);
    s = type(s, '1 + 1 = 5');
    expect(s.hintOpen).toBe(true);
    expect(s.hintTier).toBe(1);
    expect(s.helpPulse).toBe(true);
    s = practiceReducer(s, { type: 'closeHint' });
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5');
    expect(s.hintTier).toBe(2);
    expect(s.attempt.maxHint).toBe(2);
  });

  it('Help opens H1 at any time, then H2; an accepted step resets the ladder', () => {
    let s = startPractice(3, 99);
    s = practiceReducer(s, { type: 'help' });
    expect([s.hintOpen, s.hintTier]).toEqual([true, 1]);
    s = practiceReducer(s, { type: 'moreHint' });
    expect(s.hintTier).toBe(2);
    const first = eqWalkthrough(s.question.text, s.question.variable)[0]!;
    s = type(s, first.line);
    expect([s.hintOpen, s.hintTier]).toEqual([false, 0]);
    expect(s.attempt.maxHint).toBe(2);
  });

  it('a hint above H1 means the solve is not clean (R-ADP-1)', () => {
    let s = startPractice(3, 5);
    s = practiceReducer(s, { type: 'help' });
    s = practiceReducer(s, { type: 'moreHint' });
    for (const step of eqWalkthrough(s.question.text, s.question.variable).filter(
      (x) => x.kind !== 'CHECK',
    )) {
      s = type(s, step.line);
    }
    expect(s.solved).toBe(true);
    expect(s.attempt.clean).toBe(false);
  });

  it('next starts a new question at the same level', () => {
    const s = practiceReducer(startPractice(4, 1), { type: 'next', seed: 2 });
    expect(s.level).toBe(4);
    expect(s.questionNumber).toBe(2);
    expect(s.attempt.seed).toBe(2);
  });
});
