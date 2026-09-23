// Hint ladder and walkthrough state shared by typed-step and tile practice (R-HELP-1…6,
// design.md §6.1/§6.3). Pure functions over the fields both reducers carry.
import { config } from '../../engine/config';
import { eqWalkthrough, type WalkStep } from '../../engine/topics/eq/hints';
import type { Attempt } from '../../data/db';
import { withTry } from '../../data/attempts';

export interface HelpFields {
  /** Rejections on the current step. Two count as one wrong try (design.md §6.3). */
  rejectionsThisStep: number;
  wrongTries: number;
  /** Hint tier shown for the current step: 0 = none yet. H3 is the walkthrough. */
  hintTier: 0 | 1 | 2;
  hintOpen: boolean;
  /** Help pulses after a wrong try (R-HELP-2). */
  helpPulse: boolean;
  /** A wrong try at H2 highlights "Show me step by step"; it is never started for the learner. */
  walkOffered: boolean;
  /** The H3 walkthrough, once started. */
  walk: { steps: WalkStep[]; index: number } | null;
  solved: boolean;
  attempt: Attempt;
}

export const freshHelp = {
  rejectionsThisStep: 0,
  wrongTries: 0,
  hintTier: 0,
  hintOpen: false,
  helpPulse: false,
  walkOffered: false,
  walk: null,
} as const satisfies Omit<HelpFields, 'solved' | 'attempt'>;

const maxHint = (a: Attempt, tier: number): Attempt =>
  tier > a.maxHint ? { ...a, maxHint: tier as Attempt['maxHint'] } : a;

/** A rejected answer on the current step. Every second one is a wrong try (R-HELP-2). */
export function onRejection<S extends HelpFields>(s: S): S {
  const rejections = s.rejectionsThisStep + 1;
  const wrongTry = rejections % config.eq.rejectionsPerWrongTry === 0;
  if (!wrongTry) return { ...s, rejectionsThisStep: rejections };
  // Offer help at the next tier not yet seen; later wrong tries advance a tier.
  const hintTier = Math.min(2, s.hintTier + 1) as 1 | 2;
  return {
    ...s,
    rejectionsThisStep: rejections,
    wrongTries: s.wrongTries + 1,
    hintTier,
    hintOpen: true,
    helpPulse: true,
    walkOffered: s.walkOffered || s.hintTier === 2,
    attempt: maxHint(s.attempt, hintTier),
  };
}

/** An accepted step: the ladder restarts at H1 for the next step. */
export function onStepAccepted<S extends HelpFields>(s: S): S {
  return {
    ...s,
    rejectionsThisStep: 0,
    hintTier: 0,
    hintOpen: false,
    helpPulse: false,
    walkOffered: false,
  };
}

/** The question is finished. Clean solve (R-ADP-1): no wrong try and no hint above H1. */
export function onSolved<S extends HelpFields>(s: S): S {
  return {
    ...s,
    solved: true,
    attempt: {
      ...s.attempt,
      finishedAt: new Date().toISOString(),
      clean: s.wrongTries === 0 && s.attempt.maxHint <= 1,
    },
  };
}

export function onHelp<S extends HelpFields>(s: S): S {
  if (s.solved || s.walk) return s;
  const tier = (s.hintOpen ? s.hintTier || 1 : Math.min(2, s.hintTier + 1)) as 1 | 2;
  return { ...s, hintTier: tier, hintOpen: true, helpPulse: false, attempt: maxHint(s.attempt, tier) };
}

export function onMoreHint<S extends HelpFields>(s: S): S {
  if (s.solved || s.walk) return s;
  return { ...s, hintTier: 2, hintOpen: true, attempt: maxHint(s.attempt, 2) };
}

export function onCloseHint<S extends HelpFields>(s: S): S {
  return { ...s, hintOpen: false, helpPulse: false };
}

/** "Show me step by step": H3 from the learner's last line, checked against the original. */
export function onWalkStart<S extends HelpFields>(s: S, from: string, original: string, v: string): S {
  if (s.solved || s.walk) return s;
  return {
    ...s,
    walk: { steps: eqWalkthrough(from, v, original), index: 0 },
    hintOpen: false,
    helpPulse: false,
    walkOffered: false,
    attempt: withTry(maxHint(s.attempt, 3), {
      answer: from,
      verdict: 'stepAccepted',
      stepType: 'WALKTHROUGH',
    }),
  };
}

/** Next step; past the last one the question counts as done (R-HELP-6). */
export function onWalkNext<S extends HelpFields>(s: S): S {
  if (!s.walk || s.solved) return s;
  if (s.walk.index < s.walk.steps.length - 1) return { ...s, walk: { ...s.walk, index: s.walk.index + 1 } };
  return onSolved(s);
}

export function onWalkBack<S extends HelpFields>(s: S): S {
  if (!s.walk || s.walk.index === 0 || s.solved) return s;
  return { ...s, walk: { ...s.walk, index: s.walk.index - 1 } };
}
