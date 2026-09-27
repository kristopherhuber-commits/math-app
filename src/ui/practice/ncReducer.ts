// Number-classification practice state (R-NC-2…4, R-HELP-1…6). Since M7 the answer is one card, the
// smallest set: the cards behave like multiple choice. A card checked and found not quite is greyed
// out (R-NC-3), and the feedback says whether the number is in that set or not, never which is right.
import { checkSmallest } from '../../engine/topics/nc/checker';
import { generateNc, type NcQuestion } from '../../engine/topics/nc/generator';
import { ncWalkthrough } from '../../engine/topics/nc/hints';
import type { NcSet, NumWalkStep } from '../../engine/topics/walk';
import { newAttempt, withTry } from '../../data/attempts';
import {
  freshHelp,
  onCloseHint,
  onHelp,
  onMoreHint,
  onSolved,
  onWalkBack,
  onWalkNext,
  onWrongTry,
  startWalk,
  type HelpFields,
} from './help';

export interface NcState extends HelpFields<NumWalkStep> {
  level: number;
  question: NcQuestion;
  selected: NcSet | null;
  /** Cards checked and found not quite: greyed out and disabled (R-NC-3). */
  tried: NcSet[];
  /** The last card's feedback code (NC-CONTAINS / NC-NOT-IN); `key` replays the shake. */
  feedback: { code: string; key: number } | null;
}

export type NcAction =
  | { type: 'select'; set: NcSet }
  | { type: 'check' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'walkStart' }
  | { type: 'walkNext' }
  | { type: 'walkBack' };

export function startNc(level: number, seed: number): NcState {
  const question = generateNc(level, seed);
  return {
    level,
    question,
    selected: null,
    tried: [],
    feedback: null,
    ...freshHelp,
    solved: false,
    attempt: newAttempt({
      topic: 'NC',
      level,
      generatorId: question.generatorId,
      seed,
      params: { level, ...question.params },
    }),
  };
}

export function ncReducer(s: NcState, action: NcAction): NcState {
  switch (action.type) {
    case 'select':
      if (s.solved || s.walk || s.tried.includes(action.set)) return s;
      return { ...s, selected: action.set };
    case 'check': {
      if (s.solved || s.walk || s.selected === null) return s;
      const answer = s.selected;
      const r = checkSmallest(s.question.value, answer);
      if (r.correct) {
        return onSolved({
          ...s,
          feedback: null,
          attempt: withTry(s.attempt, { answer, verdict: 'correct' }),
        });
      }
      return onWrongTry({
        ...s,
        selected: null,
        tried: [...s.tried, answer],
        feedback: { code: r.code, key: (s.feedback?.key ?? 0) + 1 },
        attempt: withTry(s.attempt, { answer, verdict: 'wrong', diagnostic: r.code }),
      });
    }
    case 'help':
      return onHelp(s);
    case 'moreHint':
      return onMoreHint(s);
    case 'closeHint':
      return onCloseHint(s);
    case 'walkStart':
      return startWalk({ ...s, feedback: null }, ncWalkthrough(s.question), s.selected ?? '');
    case 'walkNext':
      return onWalkNext(s);
    case 'walkBack':
      return onWalkBack(s);
  }
}
