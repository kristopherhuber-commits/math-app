// Parent area rules (requirements §9): the PIN-reset challenge (R-PAR-1), the dashboard's statistics
// (R-PAR-3) and the missed-question rule (R-PAR-4). Pure; dates arrive as ISO strings and local days.
import { config, TOPICS, type TopicId } from './config';
import { mulberry32 } from './rng';

export interface PinChallenge {
  a: number;
  b: number;
  answer: number;
}

/** R-PAR-1: "answer a simple arithmetic challenge (e.g. 47 × 13)": a 2-digit × a teen. */
export function pinChallenge(seed: number): PinChallenge {
  const rng = mulberry32(seed);
  const a = rng.int(21, 99);
  const b = rng.int(11, 19);
  return { a, b, answer: a * b };
}

/** The typed answer, digits only (spaces allowed), against the exact product. */
export function checkChallenge(c: PinChallenge, typed: string): boolean {
  const t = typed.replace(/\s/g, '');
  return /^\d+$/.test(t) && Number(t) === c.answer;
}

// ---------------------------------------------------------------------------------------------
// Dashboard statistics (R-PAR-3, design.md §7.10) and the missed-question rule (R-PAR-4).

/** What the statistics need from a stored attempt (the data layer maps Attempt onto this). */
export interface AttemptFacts {
  topic: TopicId;
  level: number;
  startedAt: string;
  /** Only finished attempts are counted. */
  finishedAt?: string;
  /** The local day it finished, 'YYYY-MM-DD' (the data layer knows the time zone). */
  day?: string;
  maxHint: 0 | 1 | 2 | 3;
  clean: boolean;
  wrongTries?: number;
  fixed?: boolean;
  tries: readonly { at: string; verdict: string; stepType?: string; diagnostic?: string }[];
}

/** Wrong tries: stored since schema v2; older attempts count their wrong answers (EQ: 2 rejections = 1). */
export function wrongTriesOf(a: AttemptFacts): number {
  if (a.wrongTries !== undefined) return a.wrongTries;
  const wrong = a.tries.filter((t) => t.verdict === 'wrong').length;
  const rejected = a.tries.filter((t) => t.verdict === 'stepRejected').length;
  return wrong + Math.floor(rejected / config.eq.rejectionsPerWrongTry);
}

/** R-PAR-4: needed H2 or H3, or two or more wrong tries. */
export const isMissed = (a: AttemptFacts): boolean => a.maxHint >= 2 || wrongTriesOf(a) >= 2;

/** Minutes spent on one finished attempt, capped so a question left open isn't counted as time. */
export function attemptMinutes(a: AttemptFacts): number {
  if (!a.finishedAt) return 0;
  const ms = Date.parse(a.finishedAt) - Date.parse(a.startedAt);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(ms / 60_000, config.parent.maxAttemptMinutes);
}

/** The `n` local days ending with `today` ('YYYY-MM-DD'), oldest first. */
export function lastDays(today: string, n: number): string[] {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  return Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1, d - (n - 1 - i)));
    return t.toISOString().slice(0, 10);
  });
}

export interface TopicStats {
  topic: TopicId;
  attempts: number;
  /** Clean solves ÷ attempts (R-ADP-1), or null with no attempts. */
  cleanRate: number | null;
  /** Attempts by the highest hint tier used. */
  hints: { 1: number; 2: number; 3: number };
  /** Tries per question: 1 + wrong tries, averaged; null with no attempts. */
  avgTries: number | null;
  minutes: number;
}

const counted = (all: readonly AttemptFacts[]) => all.filter((a) => a.finishedAt !== undefined && !a.fixed);

export function topicStats(all: readonly AttemptFacts[], topic: TopicId): TopicStats {
  const list = counted(all).filter((a) => a.topic === topic);
  const n = list.length;
  const hints = { 1: 0, 2: 0, 3: 0 };
  for (const a of list) if (a.maxHint > 0) hints[a.maxHint as 1 | 2 | 3]++;
  return {
    topic,
    attempts: n,
    cleanRate: n ? list.filter((a) => a.clean).length / n : null,
    hints,
    avgTries: n ? list.reduce((s, a) => s + 1 + wrongTriesOf(a), 0) / n : null,
    minutes: list.reduce((s, a) => s + attemptMinutes(a), 0),
  };
}

/** Minutes per local day over the window (the daily activity strip). */
export function dailyMinutes(
  all: readonly AttemptFacts[],
  days: readonly string[],
): { day: string; minutes: number }[] {
  const by = new Map(days.map((d) => [d, 0]));
  for (const a of counted(all)) if (a.day && by.has(a.day)) by.set(a.day, by.get(a.day)! + attemptMinutes(a));
  return days.map((day) => ({ day, minutes: by.get(day)! }));
}

/** A topic's clean-solve rate per day over the window; null on days without attempts. */
export function cleanTrend(
  all: readonly AttemptFacts[],
  topic: TopicId,
  days: readonly string[],
): { day: string; rate: number | null }[] {
  const list = counted(all).filter((a) => a.topic === topic);
  return days.map((day) => {
    const on = list.filter((a) => a.day === day);
    return { day, rate: on.length ? on.filter((a) => a.clean).length / on.length : null };
  });
}

export type Observation =
  | { kind: 'walkthroughs'; topic: TopicId; n: number; of: number }
  | { kind: 'diagnostic'; code: string; n: number; since: string };

/**
 * "Worth a look" (design.md §7.10): a topic whose last 6 attempts needed a walkthrough at least
 * half the time; an EQ diagnostic seen at least 5 times in the last 7 days.
 */
export function observations(all: readonly AttemptFacts[], now: string): Observation[] {
  const { recentAttempts, walkthroughShare, diagnosticCount, diagnosticDays } = config.parent.worth;
  const out: Observation[] = [];
  const list = counted(all).sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));
  for (const topic of TOPICS) {
    const last = list.filter((a) => a.topic === topic).slice(-recentAttempts);
    if (last.length < recentAttempts) continue;
    const n = last.filter((a) => a.maxHint === 3).length;
    if (n / last.length >= walkthroughShare) out.push({ kind: 'walkthroughs', topic, n, of: last.length });
  }
  const since = new Date(Date.parse(now) - diagnosticDays * 86_400_000).toISOString();
  const codes = new Map<string, number>();
  for (const a of all)
    if (a.topic === 'EQ' && !a.fixed)
      for (const t of a.tries)
        if (t.diagnostic?.startsWith('EQ-D') && t.at >= since)
          codes.set(t.diagnostic, (codes.get(t.diagnostic) ?? 0) + 1);
  for (const [code, n] of [...codes].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])))
    if (n >= diagnosticCount) out.push({ kind: 'diagnostic', code, n, since });
  return out;
}
