// Stars, streaks and badges (requirements §8, R-RWD-1…3). Pure: days are local calendar dates as
// 'YYYY-MM-DD' strings, computed by the caller.
import { config, TOPICS, type TopicId } from './config';

// ---------------------------------------------------------------------------------------------
// Stars (R-RWD-1)

export type Stars = 1 | 2 | 3;

/**
 * 3 ★ = first try, no hints; 2 ★ = second try, or H1 only; 1 ★ = H2 or H3, or more than two
 * tries. Completing always earns at least one.
 */
export function starsFor(o: { wrongTries: number; maxHint: number }): Stars {
  if (o.wrongTries === 0 && o.maxHint === 0) return 3;
  if (o.wrongTries <= 1 && o.maxHint <= 1) return 2;
  return 1;
}

// ---------------------------------------------------------------------------------------------
// Streak (R-RWD-2)

/** A day string 'YYYY-MM-DD' → a day number, so consecutive days differ by 1. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** When an assignment was active: first and last day, inclusive; `to` absent = still active. */
export interface ActiveInterval {
  from: string;
  to?: string;
}

const activeOn = (n: number, intervals: readonly ActiveInterval[]) =>
  intervals.some((i) => dayNumber(i.from) <= n && (i.to === undefined || n <= dayNumber(i.to)));

export function hadActiveAssignment(day: string, intervals: readonly ActiveInterval[]): boolean {
  return activeOn(dayNumber(day), intervals);
}

export interface StreakState {
  streak: number;
  lastStreakDate?: string;
}

/** Days strictly between `last` and `today` that had an active assignment break the streak. */
function brokenBetween(last: string, today: string, intervals: readonly ActiveInterval[]): boolean {
  const a = dayNumber(last);
  const b = dayNumber(today);
  for (let n = a + 1; n < b; n++) if (activeOn(n, intervals)) return true;
  return false;
}

/**
 * The learner answered an assignment question today. Same day: unchanged. Otherwise the streak
 * grows by one, unless a day in between had an active assignment and no answer; days with no
 * active assignment don't break it.
 */
export function updateStreak(
  s: StreakState,
  today: string,
  intervals: readonly ActiveInterval[],
): StreakState & { extended: boolean } {
  if (s.lastStreakDate === undefined || s.streak === 0)
    return { streak: 1, lastStreakDate: today, extended: true };
  if (dayNumber(today) <= dayNumber(s.lastStreakDate)) return { ...s, extended: false };
  const streak = brokenBetween(s.lastStreakDate, today, intervals) ? 1 : s.streak + 1;
  return { streak, lastStreakDate: today, extended: true };
}

/** The streak to show today: 0 once a day with an active assignment went by without an answer. */
export function currentStreak(s: StreakState, today: string, intervals: readonly ActiveInterval[]): number {
  if (s.lastStreakDate === undefined) return 0;
  if (dayNumber(today) <= dayNumber(s.lastStreakDate)) return s.streak;
  return brokenBetween(s.lastStreakDate, today, intervals) ? 0 : s.streak;
}

/** Streak lengths that get the full-screen celebration (R-RWD-5). */
export function isStreakMilestone(n: number): boolean {
  const r = config.rewards;
  const last = r.streakMilestones.at(-1) ?? 0;
  return r.streakMilestones.includes(n) || (n > last && n % r.streakEvery === 0);
}

// ---------------------------------------------------------------------------------------------
// Badges (R-RWD-3)

export type BadgeId =
  | 'first-solve'
  | 'perfect-assignment'
  | 'eq-no-walkthrough'
  | 'first-delayed-rd'
  | 'first-successive-pc'
  | `streak-${number}`
  | `max-level-${TopicId}`;

export const BADGE_IDS: readonly BadgeId[] = [
  'first-solve',
  'perfect-assignment',
  'eq-no-walkthrough',
  'first-delayed-rd',
  'first-successive-pc',
  ...config.rewards.streakBadges.map((n) => `streak-${n}` as const),
  ...TOPICS.map((t) => `max-level-${t}` as const),
];

export interface FinishedFacts {
  topic: TopicId;
  maxHint: number;
  params: unknown;
}

/** RD questions whose decimal has a delayed repeat: D→F shape `delayed`, F→D over 6, 12, 15, 22. */
export function isDelayedRd(a: FinishedFacts): boolean {
  const shape = (a.params as { shape?: unknown } | null)?.shape;
  return a.topic === 'RD' && (shape === 'delayed' || shape === 'f2dB');
}

export function isSuccessivePc(a: FinishedFacts): boolean {
  return a.topic === 'PC' && (a.params as { kind?: unknown } | null)?.kind === 'successive';
}

/** Finished EQ attempts in a row without a walkthrough, counting back from the latest. */
export function eqRunWithoutWalkthrough(eqMaxHints: readonly number[]): number {
  let n = 0;
  for (let i = eqMaxHints.length - 1; i >= 0 && eqMaxHints[i]! < 3; i--) n++;
  return n;
}

export interface BadgeFacts {
  /** Badges already earned. */
  have: readonly string[];
  /** The attempt just finished. */
  attempt: FinishedFacts;
  /** `eqRunWithoutWalkthrough` including this attempt. */
  eqRun: number;
  /** The streak after this attempt. */
  streak: number;
  /** Each topic's level after this attempt. */
  levels: Readonly<Record<TopicId, number>>;
  /** Set when this attempt finished an assignment. */
  assignmentDone?: { perfect: boolean };
}

/** Badges earned by this attempt that weren't earned before. Each is earned once. */
export function newBadges(f: BadgeFacts): BadgeId[] {
  const earned: BadgeId[] = ['first-solve'];
  if (f.assignmentDone?.perfect) earned.push('perfect-assignment');
  if (f.eqRun >= config.rewards.eqRunWithoutWalkthrough) earned.push('eq-no-walkthrough');
  if (isDelayedRd(f.attempt)) earned.push('first-delayed-rd');
  if (isSuccessivePc(f.attempt)) earned.push('first-successive-pc');
  for (const n of config.rewards.streakBadges) if (f.streak >= n) earned.push(`streak-${n}`);
  for (const t of TOPICS) if (f.levels[t] >= config.levels[t]) earned.push(`max-level-${t}`);
  return earned.filter((b) => !f.have.includes(b));
}
