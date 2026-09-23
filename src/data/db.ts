// Dexie schema (docs/requirements.md §9.1, R-ARCH-5, R-DATA-1).
// Every schema change bumps SCHEMA_VERSION and adds a new db.version(n) block with an upgrade.
// v2 (M4): Attempt.wrongTries / itemIndex / countedAt, Assignment.activatedAt / seed.
import Dexie, { type EntityTable } from 'dexie';
import type { TopicId } from '../engine/config';
import type { AttemptSummary } from '../engine/adaptive';
import type { AssignmentItem } from '../engine/session';
import { newSeed } from '../engine/rng';

export type { TopicId, AttemptSummary, AssignmentItem };

export const SCHEMA_VERSION = 2;

export interface Profile {
  id: 'default';
  name: string;
  createdAt: string;
}

export interface Settings {
  profileId: string;
  pinHash: string;
  freePractice: 'always' | 'afterAssignment' | 'never';
  order: 'grouped' | 'mixed';
  levelBounds: Record<TopicId, { min: number; max: number }>;
  allowSkipping: boolean;
  fullBalanceAnim: boolean;
  naturalIncludesZero: boolean;
  sound: boolean;
  reduceMotion: boolean;
  currency: string;
  mascotNames: { turtle: string; penguin: string };
}

export interface TopicState {
  profileId: string;
  topic: TopicId;
  level: number;
  /** R-ADP-2…4: the last attempts at `level`, oldest first. */
  window: AttemptSummary[];
}

export interface Assignment {
  id: string;
  profileId: string;
  title?: string;
  items: AssignmentItem[];
  status: 'queued' | 'active' | 'done';
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  position: number;
  /** v2: when it became active; the streak asks which days had an active assignment (R-RWD-2). */
  activatedAt?: string;
  /** v2: seeds the mixed order and every question, so a reload resumes the same question (R-SES-5). */
  seed?: number;
  /** v2: grouped or mixed (R-SES-4), fixed when the assignment is created. */
  order?: 'grouped' | 'mixed';
}

export interface TryRecord {
  at: string;
  answer: unknown;
  verdict: 'correct' | 'wrong' | 'stepAccepted' | 'stepRejected';
  stepType?: string;
  diagnostic?: string;
}

export interface Attempt {
  id: string;
  profileId: string;
  assignmentId?: string;
  /** v2: which item of the assignment (two items may share a topic). */
  itemIndex?: number;
  topic: TopicId;
  level: number;
  generatorId: string;
  seed: number;
  params: unknown;
  startedAt: string;
  finishedAt?: string;
  tries: TryRecord[];
  maxHint: 0 | 1 | 2 | 3;
  stars?: 1 | 2 | 3;
  clean: boolean;
  /** v2: wrong tries (EQ: two rejections on a step = one), for stars and R-ADP-3. */
  wrongTries?: number;
  /** v2: set once levels, rewards and assignment progress have taken this attempt into account. */
  countedAt?: string;
}

export interface Rewards {
  profileId: string;
  shells: number;
  streak: number;
  lastStreakDate?: string;
  badges: { id: string; at: string }[];
  accessories: string[];
}

export interface Meta {
  key: 'schemaVersion';
  value: number;
}

const STORES = {
  profiles: 'id',
  settings: 'profileId',
  topicStates: '[profileId+topic], profileId',
  assignments: 'id, profileId, status, position',
  attempts: 'id, profileId, topic, startedAt, assignmentId',
  rewards: 'profileId',
  meta: 'key',
};

/**
 * v1 → v2 for one assignment: an active one counts as active since it was created; every
 * assignment gets a seed. Shared with importing older export files (R-DATA-1, M5).
 */
export function upgradeAssignmentToV2(a: Assignment, seed: () => number = newSeed): Assignment {
  return {
    ...a,
    ...(a.status !== 'queued' && a.activatedAt === undefined ? { activatedAt: a.createdAt } : {}),
    ...(a.seed === undefined ? { seed: seed() } : {}),
  };
}

export class MathDb extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  settings!: EntityTable<Settings, 'profileId'>;
  topicStates!: EntityTable<TopicState, 'profileId'>;
  assignments!: EntityTable<Assignment, 'id'>;
  attempts!: EntityTable<Attempt, 'id'>;
  rewards!: EntityTable<Rewards, 'profileId'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'turtle-penguin-math') {
    super(name);
    this.version(1)
      .stores(STORES)
      .upgrade(async (tx) => {
        await tx.table('meta').put({ key: 'schemaVersion', value: 1 });
      });
    this.version(2)
      .stores(STORES)
      .upgrade(async (tx) => {
        await tx
          .table<Assignment>('assignments')
          .toCollection()
          .modify((a) => {
            Object.assign(a, upgradeAssignmentToV2(a));
          });
        await tx.table('meta').put({ key: 'schemaVersion', value: 2 });
      });
    this.on('populate', (tx) => {
      void tx.table('meta').put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    });
  }
}

export const db = new MathDb();
