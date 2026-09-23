// The contract between the Session (which chooses questions, R-SES) and a practice screen (which
// asks one). A screen reports its attempt as it goes and once when solved; the Session answers with
// the celebration, shown wherever the screen shows its solved state (R-RWD-5).
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { Attempt } from '../../data/db';

export interface QuestionProps {
  level: number;
  seed: number;
  /** Save progress after every answer or step (R-SES-5). */
  onSave: (a: Attempt) => void;
  /** Called once, when the question is solved (by the learner or by the walkthrough). */
  onSolved: (a: Attempt) => void;
  onNext: () => void;
}

/** Report the attempt: every change while unsolved, then the solved attempt once. */
export function useReportAttempt(
  s: { attempt: Attempt; solved: boolean },
  onSave: (a: Attempt) => void,
  onSolved: (a: Attempt) => void,
) {
  const callbacks = useRef({ onSave, onSolved });
  useEffect(() => {
    callbacks.current = { onSave, onSolved };
  });
  const reported = useRef(false);
  useEffect(() => {
    if (!s.solved) callbacks.current.onSave(s.attempt);
    else if (!reported.current) {
      reported.current = true;
      callbacks.current.onSolved(s.attempt);
    }
  }, [s.attempt, s.solved]);
}

const CelebrationContext = createContext<ReactNode>(null);
export const CelebrationProvider = CelebrationContext.Provider;

/** Where a solved question shows Pip's celebration. */
export function CelebrationSlot() {
  return <>{useContext(CelebrationContext)}</>;
}
