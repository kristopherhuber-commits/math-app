// R-PAR-6 / R-DATA-1: export, import with the schema-version check and migration, and reset.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, SCHEMA_VERSION } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import { exportData, exportFileName, importData, parseImport, resetProgress } from '../../src/data/backup';
import { logError } from '../../src/data/errors';
import { loadSettings, saveSettings, setPin, verifyPin } from '../../src/data/settings';

async function fill() {
  await setPin('2468');
  await saveSettings({ freePractice: 'never', mascotNames: { turtle: 'Mossy', penguin: 'Pip' } });
  await db.profiles.put({ id: 'default', name: '', createdAt: '2026-09-01T00:00:00.000Z' });
  await db.topicStates.put({ profileId: 'default', topic: 'EQ', level: 4, window: [] });
  await db.assignments.put({
    id: 'a1',
    profileId: 'default',
    items: [{ topic: 'PC', count: 2 }],
    status: 'active',
    createdAt: '2026-09-20T10:00:00.000Z',
    activatedAt: '2026-09-20T10:00:00.000Z',
    position: 0,
    seed: 5,
    order: 'grouped',
  });
  await db.attempts.put({
    ...newAttempt({ topic: 'PC', level: 1, generatorId: 'pc.v1', seed: 9, params: {} }),
    id: 't1',
    assignmentId: 'a1',
    itemIndex: 0,
    finishedAt: '2026-09-20T10:03:00.000Z',
    stars: 3,
    clean: true,
    wrongTries: 0,
  });
  await db.rewards.put({ profileId: 'default', shells: 12, streak: 2, badges: [], accessories: [] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await logError('test', 'boom');
}

const tables = async () => ({
  profiles: await db.profiles.toArray(),
  settings: await db.settings.toArray(),
  topicStates: await db.topicStates.toArray(),
  assignments: await db.assignments.toArray(),
  attempts: await db.attempts.toArray(),
  rewards: await db.rewards.toArray(),
  errors: await db.errors.toArray(),
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('export and import (R-PAR-6, R-DATA-1)', () => {
  it('an export carries the schema version and every table; importing it gives the same data', async () => {
    await fill();
    const file = await exportData(new Date('2026-09-23T12:00:00Z'));
    expect(file).toMatchObject({ app: 'turtle-penguin-math', schemaVersion: SCHEMA_VERSION });
    expect(file.exportedAt).toBe('2026-09-23T12:00:00.000Z');
    const before = await tables();
    const text = JSON.stringify(file);

    await db.delete();
    await db.open();
    const parsed = parseImport(text);
    expect(parsed.ok && parsed.fromVersion).toBe(SCHEMA_VERSION);
    if (!parsed.ok) throw new Error('unreadable');
    await importData(parsed.data);
    expect(await tables()).toEqual(before);
    expect(await verifyPin('2468')).toBe(true);
    expect(exportFileName('2026-09-23')).toBe('turtle-penguin-math-2026-09-23.json');
  });

  it('importing replaces what was there', async () => {
    await fill();
    const file = await exportData();
    await db.attempts.put({ ...(await db.attempts.get('t1'))!, id: 't2' });
    await db.assignments.put({ ...(await db.assignments.get('a1'))!, id: 'a2', status: 'queued' });
    await importData(file);
    expect((await db.attempts.toArray()).map((a) => a.id)).toEqual(['t1']);
    expect((await db.assignments.toArray()).map((a) => a.id)).toEqual(['a1']);
  });

  it('a v1 file is migrated forward: assignments get their activation time and a seed', () => {
    const v1 = {
      app: 'turtle-penguin-math',
      schemaVersion: 1,
      exportedAt: 'x',
      settings: [{ profileId: 'default', pinHash: 'h' }],
      assignments: [
        {
          id: 'a',
          profileId: 'default',
          items: [],
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          position: 0,
        },
        {
          id: 'b',
          profileId: 'default',
          items: [],
          status: 'queued',
          createdAt: '2026-01-02T00:00:00.000Z',
          position: 1,
        },
      ],
      attempts: [],
    };
    const r = parseImport(JSON.stringify(v1));
    if (!r.ok) throw new Error('unreadable');
    expect(r.fromVersion).toBe(1);
    expect(r.data.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.data.assignments[0]).toMatchObject({ activatedAt: '2026-01-01T00:00:00.000Z' });
    expect(typeof r.data.assignments[0]!.seed).toBe('number');
    expect(r.data.assignments[1]!.activatedAt).toBeUndefined();
    expect(r.data.errors).toEqual([]);
    expect(r.data.profiles).toEqual([]);
  });

  it('a v2 file keeps its assignments and gets an empty error list', () => {
    const a = {
      id: 'a',
      profileId: 'default',
      items: [],
      status: 'active',
      createdAt: 'x',
      position: 0,
      seed: 7,
    };
    const r = parseImport(
      JSON.stringify({
        app: 'turtle-penguin-math',
        schemaVersion: 2,
        assignments: [a],
        errors: [{ at: 'x', message: 'y' }],
      }),
    );
    if (!r.ok) throw new Error('unreadable');
    expect(r.data.assignments).toEqual([a]);
    expect(r.data.errors).toEqual([]);
  });

  it('a newer file is refused with its version', () => {
    expect(
      parseImport(JSON.stringify({ app: 'turtle-penguin-math', schemaVersion: SCHEMA_VERSION + 1 })),
    ).toEqual({
      ok: false,
      reason: 'newer',
      version: SCHEMA_VERSION + 1,
    });
  });

  it.each([
    ['not JSON', '{oops'],
    ['another app', JSON.stringify({ app: 'other', schemaVersion: 3 })],
    ['no version', JSON.stringify({ app: 'turtle-penguin-math' })],
    ['a version of 0', JSON.stringify({ app: 'turtle-penguin-math', schemaVersion: 0 })],
    [
      'a table that is not a list',
      JSON.stringify({ app: 'turtle-penguin-math', schemaVersion: 3, attempts: {} }),
    ],
    [
      'rows missing their keys',
      JSON.stringify({ app: 'turtle-penguin-math', schemaVersion: 3, attempts: [{ id: 1 }] }),
    ],
    ['an array', '[]'],
  ])('refuses %s', (_, text) => {
    expect(parseImport(text)).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('a file without settings keeps this device set up', async () => {
    await fill();
    const r = parseImport(JSON.stringify({ app: 'turtle-penguin-math', schemaVersion: 3 }));
    if (!r.ok) throw new Error('unreadable');
    await importData(r.data);
    expect(await verifyPin('2468')).toBe(true);
    expect(await db.attempts.count()).toBe(0);
  });
});

describe('reset (R-PAR-6)', () => {
  it('clears answers, levels, rewards and assignments; keeps the PIN, names, settings and errors', async () => {
    await fill();
    await resetProgress();
    const t = await tables();
    expect([t.attempts, t.topicStates, t.rewards, t.assignments]).toEqual([[], [], [], []]);
    expect(t.errors).toHaveLength(1);
    expect(t.profiles).toHaveLength(1);
    expect(await verifyPin('2468')).toBe(true);
    const s = await loadSettings();
    expect(s.freePractice).toBe('never');
    expect(s.mascotNames.turtle).toBe('Mossy');
  });
});
