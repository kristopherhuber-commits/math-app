import { describe, expect, it } from 'vitest';
import { practiceReducer, startPractice, type PracticeState } from '../../src/ui/practice/practiceReducer';
import { eqWalkthrough } from '../../src/engine/topics/eq/hints';
import { formatRational } from '../../src/engine/rational';

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

  it('a wrong try at H2 highlights the walkthrough but never starts it (R-HELP-2)', () => {
    let s = startPractice(3, 7);
    for (let i = 0; i < 4; i++) s = type(s, '1 + 1 = 5');
    expect(s.hintTier).toBe(2);
    expect(s.walkOffered).toBe(false);
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5');
    expect(s.walkOffered).toBe(true);
    expect(s.walk).toBeNull();
  });

  it('walkthrough starts from the last accepted line, steps with Next/Back, and counts as done (R-HELP-6)', () => {
    let s = startPractice(3, 12345);
    const full = eqWalkthrough(s.question.text, s.question.variable);
    s = type(s, full[0]!.line);
    s = practiceReducer(s, { type: 'walkStart' });
    expect(s.walk!.steps[0]!.before).toBe(full[0]!.line);
    expect(s.walk!.steps.at(-1)!.line).toBe(s.question.text);
    expect(s.attempt.maxHint).toBe(3);
    expect(s.attempt.tries.at(-1)).toMatchObject({ stepType: 'WALKTHROUGH', answer: full[0]!.line });
    // Typing and help do nothing while the walkthrough runs.
    expect(practiceReducer(s, { type: 'input', value: '1' })).toBe(s);
    expect(practiceReducer(s, { type: 'help' })).toBe(s);
    expect(practiceReducer(s, { type: 'walkBack' })).toBe(s);
    s = practiceReducer(s, { type: 'walkNext' });
    expect(s.walk!.index).toBe(1);
    s = practiceReducer(s, { type: 'walkBack' });
    expect(s.walk!.index).toBe(0);
    for (let i = 0; i < s.walk!.steps.length; i++) s = practiceReducer(s, { type: 'walkNext' });
    expect(s.solved).toBe(true);
    expect(s.attempt.finishedAt).toBeDefined();
    expect(s.attempt.clean).toBe(false);
    expect(s.attempt).toMatchObject({ stars: 1, maxHint: 3 });
  });

  it('level 6: typing the final answer straight away solves the question, clean', () => {
    let s = startPractice(6, 4242);
    s = type(s, `${s.question.variable} = ${formatRational(s.question.solution)}`);
    expect(s.solved).toBe(true);
    expect(s.lines.at(-1)!.label).toBe('solvedDirect');
    expect(s.attempt.clean).toBe(true);
  });
});
