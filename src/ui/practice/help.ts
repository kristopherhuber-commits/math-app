// Hint ladder and walkthrough state shared by every practice screen (R-HELP-1…6, design.md
// §6.1/§6.3). Pure functions over the fields all the reducers carry. `W` is the walkthrough step
// type: EQ's balance-scale steps, or the number topics' steps.
import { config } from '../../engine/config';
import { eqWalkthrough, type WalkStep } from '../../engine/topics/eq/hints';
import { starsFor } from '../../engine/scoring';
import type { Attempt } from '../../data/db';
import { withTry } from '../../data/attempts';

export interface HelpFields<W = WalkStep> {
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
  walk: { steps: W[]; index: number } | null;
  solved: boolean;
  attempt: Attempt;
}

type AnyHelp = HelpFields<unknown>;

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

/** Open help at the next tier not yet seen; later wrong tries advance a tier (R-HELP-2). */
function offerNextTier<S extends AnyHelp>(s: S): S {
  const hintTier = Math.min(2, s.hintTier + 1) as 1 | 2;
  return {
    ...s,
    hintTier,
    hintOpen: true,
    helpPulse: true,
    walkOffered: s.walkOffered || s.hintTier === 2,
    attempt: maxHint(s.attempt, hintTier),
  };
}

/** EQ: a rejected answer on the current step. Every second one is a wrong try (design.md §6.3). */
export function onRejection<S extends AnyHelp>(s: S): S {
  const rejections = s.rejectionsThisStep + 1;
  const wrongTry = rejections % config.eq.rejectionsPerWrongTry === 0;
  if (!wrongTry) return { ...s, rejectionsThisStep: rejections };
  return offerNextTier({ ...s, rejectionsThisStep: rejections, wrongTries: s.wrongTries + 1 });
}

/**
 * Multiple choice and select-all: every wrong Check is a wrong try. The first gets "Not quite"
 * only (R-HELP-1); from the second, the turtle offers the next hint tier (R-HELP-2).
 */
export function onWrongTry<S extends AnyHelp>(s: S): S {
  const next = { ...s, wrongTries: s.wrongTries + 1 };
  return next.wrongTries < config.mc.wrongTriesBeforeHint ? next : offerNextTier(next);
}

/** An accepted step: the ladder restarts at H1 for the next step. */
export function onStepAccepted<S extends AnyHelp>(s: S): S {
  return {
    ...s,
    rejectionsThisStep: 0,
    hintTier: 0,
    hintOpen: false,
    helpPulse: false,
    walkOffered: false,
  };
}

/**
 * The question is finished. Clean solve (R-ADP-1): no wrong try and no hint above H1. Stars
 * (R-RWD-1) and the wrong-try count are stored with the attempt.
 */
export function onSolved<S extends AnyHelp>(s: S): S {
  return {
    ...s,
    solved: true,
    hintOpen: false,
    helpPulse: false,
    attempt: {
      ...s.attempt,
      finishedAt: new Date().toISOString(),
      clean: s.wrongTries === 0 && s.attempt.maxHint <= 1,
      wrongTries: s.wrongTries,
      stars: starsFor({ wrongTries: s.wrongTries, maxHint: s.attempt.maxHint }),
    },
  };
}

export function onHelp<S extends AnyHelp>(s: S): S {
  if (s.solved || s.walk) return s;
  const tier = (s.hintOpen ? s.hintTier || 1 : Math.min(2, s.hintTier + 1)) as 1 | 2;
  return { ...s, hintTier: tier, hintOpen: true, helpPulse: false, attempt: maxHint(s.attempt, tier) };
}

export function onMoreHint<S extends AnyHelp>(s: S): S {
  if (s.solved || s.walk) return s;
  return { ...s, hintTier: 2, hintOpen: true, attempt: maxHint(s.attempt, 2) };
}

export function onCloseHint<S extends AnyHelp>(s: S): S {
  return { ...s, hintOpen: false, helpPulse: false };
}

/** "Show me step by step" (EQ): H3 from the learner's last line, checked against the original. */
export function onWalkStart<S extends AnyHelp>(s: S, from: string, original: string, v: string): S {
  if (s.solved || s.walk) return s;
  return startWalk(s, eqWalkthrough(from, v, original), from);
}

/** Start H3 with prebuilt steps; `from` is recorded as the try's answer (R-PAR-4). */
export function startWalk<S extends AnyHelp>(s: S, steps: unknown[], from: string): S {
  if (s.solved || s.walk) return s;
  return {
    ...s,
    walk: { steps, index: 0 },
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
export function onWalkNext<S extends AnyHelp>(s: S): S {
  if (!s.walk || s.solved) return s;
  if (s.walk.index < s.walk.steps.length - 1) return { ...s, walk: { ...s.walk, index: s.walk.index + 1 } };
  return onSolved(s);
}

export function onWalkBack<S extends AnyHelp>(s: S): S {
  if (!s.walk || s.walk.index === 0 || s.solved) return s;
  return { ...s, walk: { ...s.walk, index: s.walk.index - 1 } };
}
