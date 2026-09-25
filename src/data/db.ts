// Dexie schema (docs/requirements.md §9.1, R-ARCH-5, R-DATA-1).
// Every schema change bumps SCHEMA_VERSION and adds a new db.version(n) block with an upgrade.
// v2 (M4): Attempt.wrongTries / itemIndex / countedAt, Assignment.activatedAt / seed.
// v3 (M5): the `errors` store (R-NF-5) and Attempt.fixed.
// v4 (M6): Rewards.spent, Settings.shopItems and the `redemptions` store (the rewards shop).
import Dexie, { type EntityTable } from 'dexie';
import type { TopicId } from '../engine/config';
import type { AttemptSummary } from '../engine/adaptive';
import type { AssignmentItem } from '../engine/session';
import { newSeed } from '../engine/rng';
import { config } from '../engine/config';
import { unlockedAt } from '../engine/rewards';

export type { TopicId, AttemptSummary, AssignmentItem };

export const SCHEMA_VERSION = 4;

/** The single learner profile in v1 (requirements §9.1). */
export const PROFILE_ID = 'default';

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
  /** v4: what the shop sells and for how many shells (parent decision, M6; an editable catalogue in M7). */
  shopItems: ShopItem[];
  /** Shells per 3, 2 and 1 star answer (parent, 2026-09-25; optional, default 3 / 2 / 1). */
  shellsPerStars?: Record<1 | 2 | 3, number>;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  /**
   * A picture the parent added (a data: URL). It lives only in this device's database and in exports,
   * never in the public repo or site. Optional, so no schema upgrade is needed.
   */
  image?: string;
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
  /** v3: a fixed-level question from a `?topic=&level=` link (parent and tests); left out of the dashboard. */
  fixed?: true;
  /** Shells this answer earned (by the parent's table at the time); older attempts earned their stars. */
  shellsEarned?: number;
}

export interface Rewards {
  profileId: string;
  shells: number;
  streak: number;
  lastStreakDate?: string;
  badges: { id: string; at: string }[];
  /** Cosmetics worn now (they unlock from lifetime shells, R-RWD-4 as the parent reshaped it). */
  accessories: string[];
  /**
   * v4: shells spent in the shop. `shells` stays the lifetime total; shells to spend = shells − spent.
   * Negative when the parent has added shells by hand (which doesn't unlock cosmetics).
   */
  spent?: number;
}

/** v4: a real reward bought in the shop; the parent gives it or cancels it (refunding the shells). */
export interface Redemption {
  id: string;
  itemId: string;
  /** Copied at purchase, so a later price or name change doesn't rewrite history. */
  name: string;
  price: number;
  status: 'requested' | 'given' | 'cancelled';
  requestedAt: string;
  resolvedAt?: string;
}

/** v3: an unexpected error, for the parent area's error list (R-NF-5). */
export interface ErrorEntry {
  id?: number;
  at: string;
  where: string;
  message: string;
  stack?: string;
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

const STORES_V3 = { ...STORES, errors: '++id, at' };
const STORES_V4 = { ...STORES_V3, redemptions: 'id, status, requestedAt' };

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

export const defaultShopItems = (): ShopItem[] => config.shop.items.map((i) => ({ ...i }));

/**
 * v3 → v4 for the rewards row: nothing spent yet, and the cosmetics already unlocked by the lifetime
 * shells are worn (they were never announced). Shared with importing older files.
 */
export function upgradeRewardsToV4(r: Rewards): Rewards {
  return {
    ...r,
    spent: r.spent ?? 0,
    accessories: r.accessories?.length ? r.accessories : unlockedAt(r.shells).map((c) => c.id),
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
  errors!: EntityTable<ErrorEntry, 'id'>;
  redemptions!: EntityTable<Redemption, 'id'>;

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
    this.version(3)
      .stores(STORES_V3)
      .upgrade(async (tx) => {
        await tx.table('meta').put({ key: 'schemaVersion', value: 3 });
      });
    this.version(4)
      .stores(STORES_V4)
      .upgrade(async (tx) => {
        await tx
          .table<Rewards>('rewards')
          .toCollection()
          .modify((r) => {
            Object.assign(r, upgradeRewardsToV4(r));
          });
        await tx
          .table<Settings>('settings')
          .toCollection()
          .modify((s) => {
            if (!s.shopItems) s.shopItems = defaultShopItems();
          });
        await tx.table('meta').put({ key: 'schemaVersion', value: 4 });
      });
    this.on('populate', (tx) => {
      void tx.table('meta').put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    });
  }
}

export const db = new MathDb();
