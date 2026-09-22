// Dexie schema v1 (docs/requirements.md §9.1, R-ARCH-5, R-DATA-1).
// Every schema change bumps SCHEMA_VERSION and adds a new db.version(n) block with an upgrade.
import Dexie, { type EntityTable } from 'dexie';

export const SCHEMA_VERSION = 1;

export type TopicId = 'NC' | 'RD' | 'FDP' | 'PC' | 'EQ';

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

export interface AttemptSummary {
  attemptId: string;
  clean: boolean;
  needsDemote: boolean;
}

export interface TopicState {
  profileId: string;
  topic: TopicId;
  level: number;
  window: AttemptSummary[];
}

export interface Assignment {
  id: string;
  profileId: string;
  title?: string;
  items: { topic: TopicId; count: number; levelLock?: number }[];
  status: 'queued' | 'active' | 'done';
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  position: number;
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
      .stores({
        profiles: 'id',
        settings: 'profileId',
        topicStates: '[profileId+topic], profileId',
        assignments: 'id, profileId, status, position',
        attempts: 'id, profileId, topic, startedAt, assignmentId',
        rewards: 'profileId',
        meta: 'key',
      })
      .upgrade(async (tx) => {
        await tx.table('meta').put({ key: 'schemaVersion', value: SCHEMA_VERSION });
      });
    this.on('populate', (tx) => {
      void tx.table('meta').put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    });
  }
}

export const db = new MathDb();
