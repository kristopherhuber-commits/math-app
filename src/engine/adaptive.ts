// Adaptive levels per topic (requirements §4.1, R-ADP-1…5). Pure: the data layer stores the state.
import { config, type TopicId } from './config';

/** One finished attempt in the adaptive window. */
export interface AttemptSummary {
  attemptId: string;
  /** R-ADP-1: correct on the first try, no hint above H1. */
  clean: boolean;
  /** R-ADP-3: ended in a walkthrough (H3) or needed a second wrong answer. */
  needsDemote: boolean;
}

export interface AdaptiveState {
  level: number;
  /** The last attempts at `level`, oldest first; at most `config.adaptive.window`. */
  window: AttemptSummary[];
}

/** R-ADP-5: the parent's per-topic bounds. */
export interface LevelBounds {
  min: number;
  max: number;
}

export interface Outcome {
  clean: boolean;
  maxHint: 0 | 1 | 2 | 3;
  wrongTries: number;
}

export type LevelChange = 'promote' | 'demote' | null;

export const defaultBounds = (topic: TopicId): LevelBounds => ({ min: 1, max: config.levels[topic] });

export function clampLevel(level: number, bounds: LevelBounds): number {
  return Math.min(Math.max(level, bounds.min), bounds.max);
}

/** A topic the learner has never practised starts at its configured level, within the bounds. */
export function initialState(topic: TopicId, bounds: LevelBounds = defaultBounds(topic)): AdaptiveState {
  return { level: clampLevel(config.adaptive.startLevel[topic], bounds), window: [] };
}

export function summarize(attemptId: string, o: Outcome): AttemptSummary {
  return {
    attemptId,
    clean: o.clean,
    needsDemote: o.maxHint === 3 || o.wrongTries >= config.adaptive.demoteWrongTries,
  };
}

/**
 * Add a finished attempt at the current level and apply R-ADP-2…5. Promotion needs a full window
 * with enough clean solves; demotion needs enough attempts that needed a walkthrough or a second
 * wrong answer, however many attempts there are so far. Any level change resets the window
 * (R-ADP-4). If the bounds moved so the level is outside them, the level is clamped, the window
 * reset, and this attempt (made at the old level) is not counted.
 */
export function adapt(
  state: AdaptiveState,
  summary: AttemptSummary,
  bounds: LevelBounds,
): AdaptiveState & { change: LevelChange } {
  const a = config.adaptive;
  const level = clampLevel(state.level, bounds);
  if (level !== state.level) return { level, window: [], change: null };

  const window = [...state.window, summary].slice(-a.window);
  const clean = window.filter((s) => s.clean).length;
  const struggled = window.filter((s) => s.needsDemote).length;
  if (window.length >= a.minAttemptsToPromote && clean >= a.promoteThreshold && level < bounds.max)
    return { level: level + 1, window: [], change: 'promote' };
  if (struggled >= a.demoteThreshold && level > bounds.min)
    return { level: level - 1, window: [], change: 'demote' };
  return { level, window, change: null };
}
