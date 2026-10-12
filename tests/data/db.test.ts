// R-DATA-1: schema upgrades v1 → … → v6 (fake IndexedDB).
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { levelToV5, MathDb, SCHEMA_VERSION, upgradeAssignmentToV2, type Assignment } from '../../src/data/db';

const v1Stores = {
  profiles: 'id',
  settings: 'profileId',
  topicStates: '[profileId+topic], profileId',
  assignments: 'id, profileId, status, position',
  attempts: 'id, profileId, topic, startedAt, assignmentId',
  rewards: 'profileId',
  meta: 'key',
};

const assignment = (id: string, status: Assignment['status'], position: number): Assignment => ({
  id,
  profileId: 'default',
  items: [{ topic: 'EQ', count: 3 }],
  status,
  createdAt: '2026-09-20T10:00:00.000Z',
  position,
});

describe('schema upgrades (R-DATA-1)', () => {
  it('a new database starts at the current version', async () => {
    const db = new MathDb('fresh-db');
    await db.open();
    expect(SCHEMA_VERSION).toBe(6);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 6 });
    expect(await db.errors.count()).toBe(0);
    db.close();
  });

  it('upgrades a v1 database: active since created, a seed for every assignment, data kept', async () => {
    const name = 'v1-db';
    const old = new Dexie(name);
    old.version(1).stores(v1Stores);
    await old.open();
    await old.table('meta').put({ key: 'schemaVersion', value: 1 });
    await old.table('assignments').bulkPut([assignment('a1', 'active', 0), assignment('a2', 'queued', 1)]);
    await old.table('attempts').put({ id: 't1', profileId: 'default', topic: 'EQ', tries: [], maxHint: 0 });
    old.close();

    const db = new MathDb(name);
    await db.open();
    expect(db.verno).toBe(6);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 6 });
    const [a1, a2] = [await db.assignments.get('a1'), await db.assignments.get('a2')];
    expect(a1?.activatedAt).toBe('2026-09-20T10:00:00.000Z');
    expect(a2?.activatedAt).toBeUndefined();
    expect(typeof a1?.seed).toBe('number');
    expect(typeof a2?.seed).toBe('number');
    expect(await db.attempts.get('t1')).toMatchObject({ id: 't1', topic: 'EQ' });
    db.close();
  });

  it('upgrades a v2 database to v3: an empty error list, data unchanged', async () => {
    const name = 'v2-db';
    const old = new Dexie(name);
    old.version(1).stores(v1Stores);
    old.version(2).stores(v1Stores);
    await old.open();
    await old.table('meta').put({ key: 'schemaVersion', value: 2 });
    const a = { ...assignment('a1', 'active', 0), activatedAt: 'x', seed: 5, order: 'mixed' };
    await old.table('assignments').put(a);
    await old.table('settings').put({ profileId: 'default', pinHash: 'h', freePractice: 'never' });
    old.close();

    const db = new MathDb(name);
    await db.open();
    expect(db.verno).toBe(6);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 6 });
    expect(await db.assignments.get('a1')).toEqual(a);
    expect(await db.settings.get('default')).toMatchObject({ pinHash: 'h', freePractice: 'never' });
    expect(await db.errors.count()).toBe(0);
    db.close();
  });

  it('levelToV5: old 1–2 → 1, 3 → 2, 4 → 3, 5 and 6 → 4', () => {
    expect([1, 2, 3, 4, 5, 6].map(levelToV5)).toEqual([1, 1, 2, 3, 4, 4]);
  });

  it('upgrades a v4 database through v5 (levels, ranges, locks and attempts renumbered; window reset) and v6 (RD into FDP)', async () => {
    const name = 'v4-db';
    const old = new Dexie(name);
    const v4Stores = { ...v1Stores, errors: '++id, at', redemptions: 'id, status, requestedAt' };
    old.version(4).stores(v4Stores);
    await old.open();
    await old.table('meta').put({ key: 'schemaVersion', value: 4 });
    await old.table('topicStates').bulkPut([
      {
        profileId: 'default',
        topic: 'EQ',
        level: 6,
        window: [{ attemptId: 'x', clean: true, needsDemote: false }],
        freeBest: 6,
      },
      { profileId: 'default', topic: 'NC', level: 3, window: [] },
    ]);
    await old.table('settings').put({
      profileId: 'default',
      pinHash: 'h',
      levelBounds: { EQ: { min: 3, max: 6 }, NC: { min: 1, max: 5 }, RD: { min: 2, max: 4 } },
    });
    await old.table('assignments').put({
      ...assignment('a1', 'active', 0),
      items: [
        { topic: 'EQ', count: 2, levelLock: 5 },
        { topic: 'NC', count: 2, levelLock: 2 },
        { topic: 'PC', count: 2 },
      ],
    });
    await old.table('attempts').bulkPut([
      { id: 't1', profileId: 'default', topic: 'EQ', level: 6, tries: [], maxHint: 0, stars: 8 },
      { id: 't2', profileId: 'default', topic: 'RD', level: 3, tries: [], maxHint: 1, stars: 4 },
    ]);
    old.close();

    const db = new MathDb(name);
    await db.open();
    expect(db.verno).toBe(6);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 6 });
    const eq = await db.topicStates.get(['default', 'EQ'] as unknown as string);
    expect(eq).toEqual({ profileId: 'default', topic: 'EQ', level: 4, window: [] });
    expect(await db.topicStates.get(['default', 'NC'] as unknown as string)).toMatchObject({ level: 2 });
    expect((await db.settings.get('default'))?.levelBounds).toEqual({
      EQ: { min: 2, max: 4 },
      NC: { min: 1, max: 4 },
    });
    expect((await db.assignments.get('a1'))?.items).toEqual([
      { topic: 'EQ', count: 2, levelLock: 4 },
      { topic: 'NC', count: 2, levelLock: 1 },
      { topic: 'PC', count: 2 },
    ]);
    // Old attempts keep their stars; only the level is renumbered.
    expect(await db.attempts.get('t1')).toMatchObject({ level: 4, stars: 8 });
    expect(await db.attempts.get('t2')).toMatchObject({ topic: 'FDP', level: 2, stars: 4 });
    db.close();
  });

  it('upgrades a v5 database to v6: Repeating decimals moves into FDP (parent decision 2026-10-11)', async () => {
    const name = 'v5-db';
    const old = new Dexie(name);
    old.version(5).stores({ ...v1Stores, errors: '++id, at', redemptions: 'id, status, requestedAt' });
    await old.open();
    await old.table('meta').put({ key: 'schemaVersion', value: 5 });
    await old.table('topicStates').bulkPut([
      { profileId: 'default', topic: 'RD', level: 3, window: [] },
      {
        profileId: 'default',
        topic: 'FDP',
        level: 2,
        window: [{ attemptId: 'x', clean: true, needsDemote: false }],
      },
      { profileId: 'default', topic: 'NC', level: 2, window: [] },
    ]);
    await old.table('settings').put({
      profileId: 'default',
      pinHash: 'h',
      levelBounds: { FDP: { min: 1, max: 3 }, RD: { min: 2, max: 4 } },
    });
    await old.table('assignments').put({
      ...assignment('a1', 'active', 0),
      items: [
        { topic: 'RD', count: 2, levelLock: 3 },
        { topic: 'FDP', count: 2 },
      ],
    });
    await old.table('attempts').bulkPut([
      { id: 't1', profileId: 'default', topic: 'RD', generatorId: 'rd.v2', level: 3, tries: [], maxHint: 0 },
      { id: 't2', profileId: 'default', topic: 'NC', generatorId: 'nc.v2', level: 2, tries: [], maxHint: 0 },
    ]);
    await old.table('rewards').put({
      profileId: 'default',
      shells: 0,
      streak: 0,
      badges: [{ id: 'max-level-RD', at: '2026-10-01' }],
      accessories: [],
    });
    old.close();

    const db = new MathDb(name);
    await db.open();
    expect(db.verno).toBe(6);
    const states = await db.topicStates.toArray();
    expect(states.map((t) => t.topic).sort()).toEqual(['FDP', 'NC']);
    // The higher of the two levels, with a new window.
    expect(states.find((t) => t.topic === 'FDP')).toEqual({
      profileId: 'default',
      topic: 'FDP',
      level: 3,
      window: [],
    });
    expect((await db.settings.get('default'))?.levelBounds).toEqual({ FDP: { min: 1, max: 3 } });
    expect((await db.assignments.get('a1'))?.items).toEqual([
      { topic: 'FDP', count: 2, levelLock: 3 },
      { topic: 'FDP', count: 2 },
    ]);
    expect(await db.attempts.get('t1')).toMatchObject({ topic: 'FDP', generatorId: 'rd.v2', level: 3 });
    expect(await db.attempts.get('t2')).toMatchObject({ topic: 'NC' });
    expect((await db.rewards.get('default'))?.badges).toEqual([{ id: 'max-level-FDP', at: '2026-10-01' }]);
    db.close();
  });

  it('upgradeAssignmentToV2 keeps existing v2 fields', () => {
    const a = { ...assignment('a', 'active', 0), activatedAt: 'x', seed: 5 };
    expect(upgradeAssignmentToV2(a, () => 9)).toEqual(a);
    expect(upgradeAssignmentToV2(assignment('b', 'done', 0), () => 9)).toMatchObject({
      activatedAt: '2026-09-20T10:00:00.000Z',
      seed: 9,
    });
  });
});
