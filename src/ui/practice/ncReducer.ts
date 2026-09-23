// Number-classification practice state (R-NC-2…4, R-HELP-1…6): select-all set cards. Nothing is
// ticked for the learner (R-NC-4). From the second wrong Check, the mismatched cards are outlined
// without saying which way they are off (R-NC-3).
import { config } from '../../engine/config';
import { checkSets } from '../../engine/topics/nc/checker';
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
  naturalIncludesZero: boolean;
  question: NcQuestion;
  ticked: NcSet[];
  /** R-NC-3: outlined cards (from the second wrong Check). */
  flagged: NcSet[];
  /** "Not quite." is showing; `key` replays the shake. */
  feedback: { key: number } | null;
}

export type NcAction =
  | { type: 'toggle'; set: NcSet }
  | { type: 'check' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'walkStart' }
  | { type: 'walkNext' }
  | { type: 'walkBack' }
  | { type: 'naturalIncludesZero'; value: boolean };

export function startNc(
  level: number,
  seed: number,
  naturalIncludesZero: boolean = config.settings.naturalIncludesZero,
): NcState {
  const question = generateNc(level, seed);
  return {
    level,
    naturalIncludesZero,
    question,
    ticked: [],
    flagged: [],
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
    case 'toggle': {
      if (s.solved || s.walk) return s;
      const on = s.ticked.includes(action.set);
      return {
        ...s,
        ticked: on ? s.ticked.filter((x) => x !== action.set) : [...s.ticked, action.set],
        flagged: s.flagged.filter((x) => x !== action.set),
      };
    }
    case 'check': {
      if (s.solved || s.walk || s.ticked.length === 0) return s;
      const r = checkSets(s.question.value, new Set(s.ticked), s.naturalIncludesZero);
      const answer = [...s.ticked].sort().join(',');
      if (r.correct) {
        return onSolved({
          ...s,
          feedback: null,
          flagged: [],
          attempt: withTry(s.attempt, { answer, verdict: 'correct' }),
        });
      }
      const next = onWrongTry({
        ...s,
        feedback: { key: (s.feedback?.key ?? 0) + 1 },
        attempt: withTry(s.attempt, { answer, verdict: 'wrong', diagnostic: r.mismatched.join(',') }),
      });
      return next.wrongTries >= config.mc.wrongTriesBeforeHint ? { ...next, flagged: r.mismatched } : next;
    }
    case 'help':
      return onHelp(s);
    case 'moreHint':
      return onMoreHint(s);
    case 'closeHint':
      return onCloseHint(s);
    case 'walkStart':
      return startWalk(
        { ...s, feedback: null },
        ncWalkthrough(s.question, s.naturalIncludesZero),
        [...s.ticked].sort().join(','),
      );
    case 'walkNext':
      return onWalkNext(s);
    case 'walkBack':
      return onWalkBack(s);
    case 'naturalIncludesZero':
      // The parent setting arrives from storage after the first render; only before any answer.
      return s.attempt.tries.length === 0 ? { ...s, naturalIncludesZero: action.value } : s;
  }
}
