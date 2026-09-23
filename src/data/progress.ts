// Sessions, adaptive levels and rewards over Dexie (R-SES-1…7, R-ADP-1…6, R-RWD-1…3). The rules are
// in the engine (adaptive.ts, scoring.ts, session.ts); this module loads and stores their state.
import { config, TOPICS, type TopicId } from '../engine/config';
import { adapt, clampLevel, initialState, summarize } from '../engine/adaptive';
import {
  currentStreak,
  eqRunWithoutWalkthrough,
  isStreakMilestone,
  newBadges,
  updateStreak,
  type ActiveInterval,
  type BadgeId,
  type Stars,
} from '../engine/scoring';
import { itemProgress, nextSlot } from '../engine/session';
import { db, PROFILE_ID, type Assignment, type Attempt, type Rewards, type Settings } from './db';
import { loadSettings } from './settings';

/** A local calendar day, 'YYYY-MM-DD' (streaks follow the learner's days, R-RWD-2). */
export function localDay(d: Date | string = new Date()): string {
  const t = typeof d === 'string' ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

type PracticeSettings = Pick<Settings, 'freePractice' | 'order' | 'levelBounds' | 'reduceMotion'>;

/** The parent settings a session needs (R-PAR-5), over the config defaults. */
export async function practiceSettings(): Promise<PracticeSettings> {
  const s = await loadSettings();
  return {
    freePractice: s.freePractice,
    order: s.order,
    levelBounds: s.levelBounds,
    reduceMotion: s.reduceMotion,
  };
}

const emptyRewards = (): Rewards => ({
  profileId: PROFILE_ID,
  shells: 0,
  streak: 0,
  badges: [],
  accessories: [],
});

const topicState = (topic: TopicId) =>
  db.topicStates.where('[profileId+topic]').equals([PROFILE_ID, topic]).first();

/** The learner's current level in a topic (R-ADP), within the parent's bounds (R-ADP-5). */
export async function topicLevel(topic: TopicId): Promise<number> {
  const bounds = (await practiceSettings()).levelBounds[topic];
  const ts = await topicState(topic);
  return ts ? clampLevel(ts.level, bounds) : initialState(topic, bounds).level;
}

// ---------------------------------------------------------------------------------------------
// Assignments

export async function activeAssignment(): Promise<Assignment | undefined> {
  return db.assignments.where('status').equals('active').first();
}

const finishedFor = async (assignmentId: string): Promise<Attempt[]> =>
  (await db.attempts.where('assignmentId').equals(assignmentId).toArray())
    .filter((a) => a.finishedAt !== undefined)
    .sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));

export interface Progress {
  /** Finished questions per item. */
  done: number[];
  doneTotal: number;
  total: number;
  /** Stars earned in this assignment so far. */
  stars: number;
}

export async function assignmentProgress(a: Assignment): Promise<Progress> {
  const finished = await finishedFor(a.id);
  const done = itemProgress(
    a.items,
    finished.map((f) => f.itemIndex ?? -1),
  );
  return {
    done,
    doneTotal: done.reduce((x, y) => x + y, 0),
    total: a.items.reduce((x, it) => x + it.count, 0),
    stars: finished.reduce((s, f) => s + (f.stars ?? 0), 0),
  };
}

export interface NextQuestion {
  topic: TopicId;
  level: number;
  seed: number;
  itemIndex: number;
  /** 0-based question number within the assignment. */
  index: number;
  /** False for a level-locked item (R-SES-3): its attempts don't move the adaptive level. */
  adaptive: boolean;
}

/** The assignment's next question (R-SES-3/4/5, R-HELP-6), or null when it is done. */
export async function nextAssignmentQuestion(a: Assignment): Promise<NextQuestion | null> {
  const finished = await finishedFor(a.id);
  const done = itemProgress(
    a.items,
    finished.map((f) => f.itemIndex ?? -1),
  );
  const last = finished.at(-1);
  const slot = nextSlot({
    items: a.items,
    order: a.order ?? config.settings.order,
    seed: a.seed ?? 0,
    done,
    ...(last?.itemIndex !== undefined
      ? { last: { itemIndex: last.itemIndex, level: last.level, walkthrough: last.maxHint === 3 } }
      : {}),
  });
  if (!slot) return null;
  const item = a.items[slot.itemIndex]!;
  const level = slot.level ?? item.levelLock ?? (await topicLevel(item.topic));
  return {
    topic: item.topic,
    level,
    seed: slot.seed,
    itemIndex: slot.itemIndex,
    index: slot.index,
    adaptive: item.levelLock === undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Finishing an attempt

export interface FinishContext {
  /** Move the adaptive level (not for level-locked items or fixed-level links). */
  adaptive: boolean;
  /** Count stars, shells, streak and badges (not for fixed-level links). */
  rewarded: boolean;
}

export interface FinishEvents {
  stars: Stars;
  /** Shells after this attempt. */
  shells: number;
  /** The new level after a promotion (R-ADP-6). Demotions are silent, so they aren't reported. */
  levelUp?: number;
  badges: BadgeId[];
  /** Set when this attempt grew the streak. */
  streak?: { days: number; milestone: boolean };
  /** Set when this attempt finished its assignment (R-SES-7). */
  assignmentDone?: string;
}

const intervals = (all: Assignment[]): ActiveInterval[] =>
  all
    .filter((a) => a.activatedAt !== undefined)
    .map((a) => ({
      from: localDay(a.activatedAt!),
      ...(a.completedAt !== undefined ? { to: localDay(a.completedAt) } : {}),
    }));

/**
 * Store a finished attempt and apply everything it earns, once (a second call is a no-op):
 * the adaptive window and level, shells, the streak, badges, and the assignment's completion,
 * which activates the next queued assignment (R-SES-2).
 */
export async function finishAttempt(attempt: Attempt, ctx: FinishContext): Promise<FinishEvents> {
  const stars = attempt.stars ?? 1;
  const bounds = ctx.adaptive ? (await practiceSettings()).levelBounds : null;
  return db.transaction('rw', [db.attempts, db.topicStates, db.rewards, db.assignments], async () => {
    const stored = await db.attempts.get(attempt.id);
    const rewards = (await db.rewards.get(PROFILE_ID)) ?? emptyRewards();
    if (stored?.countedAt) return { stars, shells: rewards.shells, badges: [] };
    const now = new Date().toISOString();
    await db.attempts.put({ ...attempt, countedAt: now });
    if (!ctx.rewarded) return { stars, shells: rewards.shells, badges: [] };

    const events: FinishEvents = { stars, shells: 0, badges: [] };
    const key = { profileId: PROFILE_ID, topic: attempt.topic };

    // Adaptive level (R-ADP-2…5). Attempts at another level (after a walkthrough) don't count.
    if (bounds) {
      const b = bounds[attempt.topic];
      const ts = (await topicState(attempt.topic)) ?? { ...key, ...initialState(attempt.topic, b) };
      if (attempt.level === ts.level) {
        const r = adapt(ts, summarize(attempt.id, { ...attempt, wrongTries: attempt.wrongTries ?? 0 }), b);
        await db.topicStates.put({ ...key, level: r.level, window: r.window });
        if (r.change === 'promote') events.levelUp = r.level;
      }
    }

    rewards.shells += stars;

    // Streak (R-RWD-2) and the assignment's completion.
    let assignmentDone: { perfect: boolean } | undefined;
    if (attempt.assignmentId) {
      const all = await db.assignments.toArray();
      const s = updateStreak(rewards, localDay(), intervals(all));
      rewards.streak = s.streak;
      if (s.lastStreakDate) rewards.lastStreakDate = s.lastStreakDate;
      if (s.extended) events.streak = { days: s.streak, milestone: isStreakMilestone(s.streak) };

      const a = all.find((x) => x.id === attempt.assignmentId);
      if (a && a.status === 'active') {
        const finished = await finishedFor(a.id);
        const done = itemProgress(
          a.items,
          finished.map((f) => f.itemIndex ?? -1),
        );
        if (done.every((d, i) => d >= a.items[i]!.count)) {
          await db.assignments.put({ ...a, status: 'done', completedAt: now });
          const next = all.filter((x) => x.status === 'queued').sort((x, y) => x.position - y.position)[0];
          if (next) await db.assignments.put({ ...next, status: 'active', activatedAt: now });
          assignmentDone = { perfect: finished.every((f) => f.stars === 3) };
          events.assignmentDone = a.id;
        }
      }
    }

    // Badges (R-RWD-3).
    const states = await db.topicStates.where('profileId').equals(PROFILE_ID).toArray();
    const levels = Object.fromEntries(
      TOPICS.map((t) => [t, states.find((s) => s.topic === t)?.level ?? initialState(t).level]),
    ) as Record<TopicId, number>;
    let eqRun = 0;
    if (attempt.topic === 'EQ') {
      const eq = (await db.attempts.where('topic').equals('EQ').toArray())
        .filter((x) => x.finishedAt !== undefined)
        .sort((x, y) => x.finishedAt!.localeCompare(y.finishedAt!));
      eqRun = eqRunWithoutWalkthrough(eq.map((x) => x.maxHint));
    }
    events.badges = newBadges({
      have: rewards.badges.map((b) => b.id),
      attempt,
      eqRun,
      streak: rewards.streak,
      levels,
      ...(assignmentDone ? { assignmentDone } : {}),
    });
    rewards.badges.push(...events.badges.map((id) => ({ id, at: now })));

    await db.rewards.put(rewards);
    events.shells = rewards.shells;
    return events;
  });
}

// ---------------------------------------------------------------------------------------------
// Home and the summary

export interface HomeSnapshot {
  assignment?: Assignment;
  progress?: Progress;
  shells: number;
  streak: number;
  /** R-SES-6: free practice is open. */
  freeOpen: boolean;
}

export async function homeSnapshot(): Promise<HomeSnapshot> {
  const [assignment, rewards, settings, all] = await Promise.all([
    activeAssignment(),
    db.rewards.get(PROFILE_ID),
    practiceSettings(),
    db.assignments.toArray(),
  ]);
  const r = rewards ?? emptyRewards();
  const freeOpen =
    settings.freePractice === 'always' || (settings.freePractice === 'afterAssignment' && !assignment);
  return {
    ...(assignment ? { assignment, progress: await assignmentProgress(assignment) } : {}),
    shells: r.shells,
    streak: currentStreak(r, localDay(), intervals(all)),
    freeOpen,
  };
}

export interface Summary {
  title?: string;
  questions: number;
  stars: number;
  /** Per item topic, in the assignment's order: how many 3, 2 and 1 star answers. */
  byTopic: { topic: TopicId; stars: Record<Stars, number> }[];
  /** Badges earned while this assignment was active. */
  badges: string[];
  freeOpen: boolean;
}

export async function assignmentSummary(id: string): Promise<Summary | null> {
  const a = await db.assignments.get(id);
  if (!a) return null;
  const finished = await finishedFor(id);
  const topics = [...new Set(a.items.map((it) => it.topic))];
  const rewards = (await db.rewards.get(PROFILE_ID)) ?? emptyRewards();
  const from = a.activatedAt ?? a.createdAt;
  const to = a.completedAt ?? '9999';
  return {
    ...(a.title ? { title: a.title } : {}),
    questions: finished.length,
    stars: finished.reduce((s, f) => s + (f.stars ?? 0), 0),
    byTopic: topics.map((topic) => {
      const stars: Record<Stars, number> = { 3: 0, 2: 0, 1: 0 };
      for (const f of finished) if (f.topic === topic && f.stars) stars[f.stars]++;
      return { topic, stars };
    }),
    badges: rewards.badges.filter((b) => b.at >= from && b.at <= to).map((b) => b.id),
    freeOpen: (await homeSnapshot()).freeOpen,
  };
}

export const getAssignment = (id: string) => db.assignments.get(id);

export async function shellCount(): Promise<number> {
  return (await db.rewards.get(PROFILE_ID))?.shells ?? 0;
}
