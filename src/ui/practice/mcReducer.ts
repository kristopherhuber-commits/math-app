// Multiple-choice practice state for RD, FDP and PC (R-ANS-1, R-HELP-1…6, design.md §6.1). A
// reducer, so the flow is testable without a browser. All the math is in the engine.
import { config } from '../../engine/config';
import { checkChoice, type McQuestion, type McTopic } from '../../engine/topics/mc';
import type { HintContent } from '../../engine/topics/content';
import type { NumWalkStep } from '../../engine/topics/walk';
import { generateRd } from '../../engine/topics/rd/generator';
import { rdHint, rdWalkthrough } from '../../engine/topics/rd/hints';
import { generateFdp } from '../../engine/topics/fdp/generator';
import { fdpHint, fdpWalkthrough } from '../../engine/topics/fdp/hints';
import { generatePc } from '../../engine/topics/pc/generator';
import { pcHint, pcWalkthrough } from '../../engine/topics/pc/hints';
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

interface TopicEngine {
  generate: (level: number, seed: number, currency: string) => McQuestion;
  hint: (q: McQuestion, tier: 1 | 2) => HintContent;
  walkthrough: (q: McQuestion) => NumWalkStep[];
}

export const MC_TOPICS: Record<McTopic, TopicEngine> = {
  RD: { generate: (l, s) => generateRd(l, s), hint: rdHint, walkthrough: rdWalkthrough },
  FDP: { generate: (l, s) => generateFdp(l, s), hint: fdpHint, walkthrough: fdpWalkthrough },
  PC: { generate: generatePc, hint: pcHint, walkthrough: pcWalkthrough },
};

export interface McState extends HelpFields<NumWalkStep> {
  topic: McTopic;
  level: number;
  currency: string;
  question: McQuestion;
  selected: string | null;
  /** Options already checked and found not quite: greyed out and disabled (design.md §6.1). */
  tried: string[];
  /** The misconception code of the last option checked (R-HELP-1a); null when none is shown. */
  feedback: { code: string; key: number } | null;
}

export type McAction =
  | { type: 'select'; id: string }
  | { type: 'check' }
  | { type: 'help' }
  | { type: 'moreHint' }
  | { type: 'closeHint' }
  | { type: 'walkStart' }
  | { type: 'walkNext' }
  | { type: 'walkBack' };

export function startMc(
  topic: McTopic,
  level: number,
  seed: number,
  currency: string = config.settings.currency,
): McState {
  const question = MC_TOPICS[topic].generate(level, seed, currency);
  return {
    topic,
    level,
    currency,
    question,
    selected: null,
    tried: [],
    feedback: null,
    ...freshHelp,
    solved: false,
    attempt: newAttempt({
      topic,
      level,
      generatorId: question.generatorId,
      seed,
      params: { level, kind: question.kind, ...question.params },
    }),
  };
}

const optionText = (q: McQuestion, id: string) => q.options.find((o) => o.id === id)?.shown.text ?? id;

export function mcReducer(s: McState, action: McAction): McState {
  switch (action.type) {
    case 'select':
      if (s.solved || s.walk || s.tried.includes(action.id)) return s;
      return s.question.options.some((o) => o.id === action.id) ? { ...s, selected: action.id } : s;

    case 'check': {
      if (s.solved || s.walk || s.selected === null) return s;
      const id = s.selected;
      const r = checkChoice(s.question, id);
      const answer = optionText(s.question, id);
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
        tried: [...s.tried, id],
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
      return startWalk(
        { ...s, feedback: null },
        MC_TOPICS[s.topic].walkthrough(s.question),
        s.selected ? optionText(s.question, s.selected) : '',
      );
    case 'walkNext':
      return onWalkNext(s);
    case 'walkBack':
      return onWalkBack(s);
  }
}
