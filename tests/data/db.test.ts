// R-DATA-1: schema v1 → v2 upgrade (fake IndexedDB).
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { MathDb, SCHEMA_VERSION, upgradeAssignmentToV2, type Assignment } from '../../src/data/db';

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

describe('schema v2 (R-DATA-1)', () => {
  it('a new database starts at the current version', async () => {
    const db = new MathDb('fresh-db');
    await db.open();
    expect(SCHEMA_VERSION).toBe(2);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 2 });
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
    expect(db.verno).toBe(2);
    expect(await db.meta.get('schemaVersion')).toEqual({ key: 'schemaVersion', value: 2 });
    const [a1, a2] = [await db.assignments.get('a1'), await db.assignments.get('a2')];
    expect(a1?.activatedAt).toBe('2026-09-20T10:00:00.000Z');
    expect(a2?.activatedAt).toBeUndefined();
    expect(typeof a1?.seed).toBe('number');
    expect(typeof a2?.seed).toBe('number');
    expect(await db.attempts.get('t1')).toMatchObject({ id: 't1', topic: 'EQ' });
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
