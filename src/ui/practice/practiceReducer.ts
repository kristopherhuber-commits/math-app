// Typed-step EQ practice state (R-EQ-TYPE, R-HELP-1..3, design.md §6.3). A reducer so the flow
// can be tested without a browser. The math itself is all in the engine.
import { config } from '../../engine/config';
import { checkStep, type StepLabel, type StepResult } from '../../engine/eq/stepChecker';
import { generateEq, type EqQuestion } from '../../engine/topics/eq/generator';
import { formatRational } from '../../engine/rational';
import type { Attempt } from '../../data/db';
import { newAttempt, withTry } from '../../data/attempts';

export type Rejection = Extract<StepResult, { accepted: false }>;

export interface Line {
  text: string;
  label: StepLabel | 'given';
  note?: { fraction: string };
}

export interface PracticeState {
  level: number;
  questionNumber: number;
  question: EqQuestion;
  lines: Line[];
  input: string;
  feedback: { result: Rejection; line: string } | null;
  /** Rejections on the current step. Two count as one wrong try (design.md §6.3). */
  rejectionsThisStep: number;
  wrongTries: number;
  /** Hint tier shown for the current step: 0 = none yet. H3 UI is deferred to M2. */
  hintTier: 0 | 1 | 2;
  hintOpen: boolean;
  /** Help pulses after a wrong try (R-HELP-2). */
  helpPulse: boolean;
  solved: boolean;
  attempt: Attempt;
  allowSkipping: boolean;
}

export type PracticeAction =
  | { type: 'input'; value: string }
  | { type: 'check' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'next'; seed: number };

/** Keyboard input normalised to what the keypad produces (R-EQ-TYPE-2). */
export function normalizeInput(s: string): string {
  return s.replace(/-/g, '−').replace(/\*/g, '×');
}

export function startPractice(level: number, seed: number, questionNumber = 1): PracticeState {
  const question = generateEq(level, seed);
  return {
    level,
    questionNumber,
    question,
    lines: [{ text: question.text, label: 'given' }],
    input: '',
    feedback: null,
    rejectionsThisStep: 0,
    wrongTries: 0,
    hintTier: 0,
    hintOpen: false,
    helpPulse: false,
    solved: false,
    allowSkipping: config.eq.allowSkippingDefault,
    attempt: newAttempt({
      topic: 'EQ',
      level,
      generatorId: question.generatorId,
      seed,
      params: { level, form: question.form, solution: formatRational(question.solution) },
    }),
  };
}

const maxHint = (a: Attempt, tier: number): Attempt =>
  tier > a.maxHint ? { ...a, maxHint: tier as Attempt['maxHint'] } : a;

export function practiceReducer(s: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'input':
      return s.solved ? s : { ...s, input: normalizeInput(action.value) };

    case 'check': {
      const line = s.input.trim();
      if (s.solved || line === '') return s;
      const prev = s.lines[s.lines.length - 1]!.text;
      const r = checkStep(prev, line, {
        variable: s.question.variable,
        level: s.level,
        allowSkipping: s.allowSkipping,
      });
      if (r.accepted) {
        let attempt = withTry(s.attempt, { answer: line, verdict: 'stepAccepted', stepType: r.stepType });
        if (r.solved) {
          attempt = {
            ...attempt,
            finishedAt: new Date().toISOString(),
            // Clean solve (R-ADP-1) for typed EQ: no wrong try and no hint above H1 (assumption).
            clean: s.wrongTries === 0 && attempt.maxHint <= 1,
          };
        }
        return {
          ...s,
          lines: [
            ...s.lines,
            {
              text: line,
              label: r.label,
              ...(r.note ? { note: { fraction: r.note.params.fraction! } } : {}),
            },
          ],
          input: '',
          feedback: null,
          rejectionsThisStep: 0,
          hintTier: 0,
          hintOpen: false,
          helpPulse: false,
          solved: r.solved,
          attempt,
        };
      }
      const rejections = s.rejectionsThisStep + 1;
      const wrongTry = rejections % config.eq.rejectionsPerWrongTry === 0;
      let attempt = withTry(s.attempt, { answer: line, verdict: 'stepRejected', diagnostic: r.code });
      let { hintTier, hintOpen } = s;
      if (wrongTry) {
        // R-HELP-2: offer help at the next tier not yet seen; later wrong tries advance a tier.
        hintTier = Math.min(2, s.hintTier + 1) as 1 | 2;
        hintOpen = true;
        attempt = maxHint(attempt, hintTier);
      }
      return {
        ...s,
        feedback: { result: r, line },
        rejectionsThisStep: rejections,
        wrongTries: s.wrongTries + (wrongTry ? 1 : 0),
        hintTier,
        hintOpen,
        helpPulse: wrongTry || s.helpPulse,
        attempt,
      };
    }

    case 'help': {
      if (s.solved) return s;
      const tier = (s.hintOpen ? s.hintTier || 1 : Math.min(2, s.hintTier + 1)) as 1 | 2;
      return { ...s, hintTier: tier, hintOpen: true, helpPulse: false, attempt: maxHint(s.attempt, tier) };
    }

    case 'moreHint':
      return { ...s, hintTier: 2, hintOpen: true, attempt: maxHint(s.attempt, 2) };

    case 'closeHint':
      return { ...s, hintOpen: false, helpPulse: false };

    case 'next':
      return startPractice(s.level, action.seed, s.questionNumber + 1);
  }
}
