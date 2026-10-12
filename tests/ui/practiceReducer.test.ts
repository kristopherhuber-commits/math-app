import { describe, expect, it } from 'vitest';
import { practiceReducer, startPractice, type PracticeState } from '../../src/ui/practice/practiceReducer';
import { eqWalkthrough } from '../../src/engine/topics/eq/hints';
import { formatRational } from '../../src/engine/rational';
import { starsFor } from '../../src/engine/scoring';

const starsLeft = (s: PracticeState) =>
  starsFor({ level: s.level, wrongTries: s.wrongTries, maxHint: s.attempt.maxHint });

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

  it('stores the level and form with the attempt; no separate stars level (R-RWD-1)', () => {
    const params = startPractice(4, 1).attempt.params;
    expect(params).toMatchObject({ level: 4, mode: 'typed' });
    expect(params).not.toHaveProperty('starsLevel');
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

  it('two rejections on the same step are a wrong try: Help pulses, no hint opens or is charged (R-HELP-2)', () => {
    let s = startPractice(3, 7); // 6 ★
    s = type(s, '1 + 1 = 5');
    expect([s.wrongTries, s.helpPulse]).toEqual([0, false]);
    s = type(s, '1 + 1 = 5');
    expect([s.wrongTries, s.helpPulse, s.hintOpen, s.hintTier, s.attempt.maxHint]).toEqual([
      1,
      true,
      false,
      0,
      0,
    ]);
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5');
    expect([s.wrongTries, s.hintOpen, s.attempt.maxHint]).toEqual([2, false, 0]);
    expect(starsLeft(s)).toBe(2);
    expect(s.walk).toBeNull();
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

  it('a wrong try at H2 highlights the walkthrough; it starts by itself only when the stars run out', () => {
    let s = startPractice(4, 7); // 8 ★
    s = practiceReducer(practiceReducer(s, { type: 'help' }), { type: 'moreHint' }); // 5 left
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5'); // a wrong try: 3 left
    expect(s.walkOffered).toBe(true);
    expect(s.walk).toBeNull();
    expect(starsLeft(s)).toBe(3);
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5'); // 1 left
    expect(s.walk).toBeNull();
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5'); // 0: the walkthrough starts (R-RWD-1)
    expect(s.walk).not.toBeNull();
    expect(s.attempt.maxHint).toBe(3);
    expect(s.attempt.tries.at(-1)).toMatchObject({ stepType: 'WALKTHROUGH' });
  });

  it('level 2: the walkthrough starts after the second wrong try (4 ★, 2 each)', () => {
    let s = startPractice(2, 11);
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5');
    expect([s.wrongTries, s.walk]).toEqual([1, null]);
    s = type(s, '1 + 1 = 5');
    s = type(s, '1 + 1 = 5');
    expect(s.wrongTries).toBe(2);
    expect(s.walk).not.toBeNull();
    // The walkthrough starts from the given equation and finishes the question with 0 stars.
    expect(s.walk!.steps[0]!.before).toBe(s.question.text);
    for (let i = 0; i < s.walk!.steps.length; i++) s = practiceReducer(s, { type: 'walkNext' });
    expect(s.solved).toBe(true);
    expect(starsFor({ level: 2, wrongTries: s.attempt.wrongTries!, maxHint: s.attempt.maxHint })).toBe(0);
  });

  it('hints are charged once per question: hint 1 on two steps still costs 1 ★ (R-RWD-1)', () => {
    let s = startPractice(3, 12345); // 6 ★
    const steps = eqWalkthrough(s.question.text, s.question.variable).filter((x) => x.kind !== 'CHECK');
    expect(steps.length).toBeGreaterThan(1);
    s = practiceReducer(s, { type: 'help' });
    s = type(s, steps[0]!.line);
    expect(s.hintTier).toBe(0); // the ladder restarts for the next step
    s = practiceReducer(s, { type: 'help' });
    expect([s.hintTier, s.attempt.maxHint]).toEqual([1, 1]);
    for (const step of steps.slice(1)) s = type(s, step.line);
    expect(s.solved).toBe(true);
    expect(starsFor({ level: 3, wrongTries: s.attempt.wrongTries!, maxHint: s.attempt.maxHint })).toBe(5);
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
    expect(s.attempt).toMatchObject({ maxHint: 3 }); // walkthrough: 0 stars, set by finishAttempt (R-RWD-1)
  });

  it('no level accepts the final answer straight away (the level-6 rule went with level 6)', () => {
    for (const level of [2, 3, 4]) {
      let s = startPractice(level, 4242);
      s = type(s, `${s.question.variable} = ${formatRational(s.question.solution)}`);
      expect(s.solved).toBe(false);
      expect(s.feedback).not.toBeNull();
    }
  });
});
