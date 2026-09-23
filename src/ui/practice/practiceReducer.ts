// Typed-step EQ practice state (R-EQ-TYPE, R-HELP-1..6, design.md §6.3). A reducer so the flow
// can be tested without a browser. The math itself is all in the engine.
import { config } from '../../engine/config';
import { checkStep, type StepLabel, type StepResult } from '../../engine/eq/stepChecker';
import { generateEq, type EqQuestion } from '../../engine/topics/eq/generator';
import { formatRational } from '../../engine/rational';
import { newAttempt, withTry } from '../../data/attempts';
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

export type Rejection = Extract<StepResult, { accepted: false }>;

export interface Line {
  text: string;
  label: StepLabel | 'given';
  note?: { fraction: string };
}

export interface PracticeState extends HelpFields {
  level: number;
  questionNumber: number;
  question: EqQuestion;
  lines: Line[];
  input: string;
  feedback: { result: Rejection; line: string } | null;
  allowSkipping: boolean;
}

export type PracticeAction =
  | { type: 'input'; value: string }
  | { type: 'check' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'walkStart' }
  | { type: 'walkNext' }
  | { type: 'walkBack' }
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
    ...freshHelp,
    solved: false,
    allowSkipping: config.eq.allowSkippingDefault,
    attempt: newAttempt({
      topic: 'EQ',
      level,
      generatorId: question.generatorId,
      seed,
      params: { level, form: question.form, solution: formatRational(question.solution), mode: 'typed' },
    }),
  };
}

export function practiceReducer(s: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'input':
      return s.solved || s.walk ? s : { ...s, input: normalizeInput(action.value) };

    case 'check': {
      const line = s.input.trim();
      if (s.solved || s.walk || line === '') return s;
      const prev = s.lines[s.lines.length - 1]!.text;
      const r = checkStep(prev, line, {
        variable: s.question.variable,
        level: s.level,
        allowSkipping: s.allowSkipping,
      });
      if (r.accepted) {
        const next = onStepAccepted({
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
          attempt: withTry(s.attempt, { answer: line, verdict: 'stepAccepted', stepType: r.stepType }),
        });
        return r.solved ? onSolved(next) : next;
      }
      return onRejection({
        ...s,
        feedback: { result: r, line },
        attempt: withTry(s.attempt, { answer: line, verdict: 'stepRejected', diagnostic: r.code }),
      });
    }

    case 'help':
      return onHelp(s);
    case 'moreHint':
      return onMoreHint(s);
    case 'closeHint':
      return onCloseHint(s);
    case 'walkStart':
      return onWalkStart(s, s.lines[s.lines.length - 1]!.text, s.question.text, s.question.variable);
    case 'walkNext':
      return onWalkNext(s);
    case 'walkBack':
      return onWalkBack(s);

    case 'next':
      return startPractice(s.level, action.seed, s.questionNumber + 1);
  }
}
