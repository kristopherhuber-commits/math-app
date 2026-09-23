// Loads attempts for the parent's dashboard (R-PAR-3) and the missed-question review (R-PAR-4). The
// statistics themselves are in the engine (parent.ts); this module adds the local days and levels.
import { config, TOPICS, type TopicId } from '../engine/config';
import {
  cleanTrend,
  dailyMinutes,
  isMissed,
  lastDays,
  observations,
  topicStats,
  type AttemptFacts,
  type Observation,
  type TopicStats,
} from '../engine/parent';
import { db, type Attempt } from './db';
import { localDay, topicLevel } from './progress';

const facts = (a: Attempt): AttemptFacts & { attempt: Attempt } => ({
  ...a,
  fixed: a.fixed === true,
  ...(a.finishedAt ? { day: localDay(a.finishedAt) } : {}),
  attempt: a,
});

export interface TopicCard extends TopicStats {
  level: number;
  levels: number;
  trend: { day: string; rate: number | null }[];
}

export interface Dashboard {
  days: string[];
  daily: { day: string; minutes: number }[];
  topics: TopicCard[];
  notes: Observation[];
}

export async function loadDashboard(now: Date = new Date()): Promise<Dashboard> {
  const all = (await db.attempts.toArray()).map(facts);
  const days = lastDays(localDay(now), config.parent.dashboardDays);
  const recent = all.filter((a) => a.day !== undefined && a.day >= days[0]!);
  const topics = await Promise.all(
    TOPICS.map(async (t) => ({
      ...topicStats(all, t),
      level: await topicLevel(t),
      levels: config.levels[t],
      trend: cleanTrend(recent, t, days),
    })),
  );
  return { days, daily: dailyMinutes(recent, days), topics, notes: observations(all, now.toISOString()) };
}

export interface MissedFilter {
  topic?: TopicId;
  /** Local days, inclusive, 'YYYY-MM-DD'. */
  from?: string;
  to?: string;
  /** Only attempts with a try carrying this diagnostic code. */
  code?: string;
}

/** R-PAR-4: finished attempts that needed H2/H3 or two or more wrong tries, newest first. */
export async function loadMissed(f: MissedFilter = {}): Promise<Attempt[]> {
  const all = (await db.attempts.toArray()).map(facts);
  return all
    .filter(
      (a) =>
        a.finishedAt !== undefined &&
        !a.fixed &&
        isMissed(a) &&
        (!f.topic || a.topic === f.topic) &&
        (!f.from || a.day! >= f.from) &&
        (!f.to || a.day! <= f.to) &&
        (!f.code || a.tries.some((t) => t.diagnostic === f.code)),
    )
    .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))
    .map((a) => a.attempt);
}
