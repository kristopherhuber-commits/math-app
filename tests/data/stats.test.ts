// R-PAR-3 / R-PAR-4 over Dexie (fake IndexedDB): local days, levels, filters.
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, type Attempt } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import { loadDashboard, loadMissed } from '../../src/data/stats';
import type { TopicId } from '../../src/engine/config';

function done(topic: TopicId, finished: Date, o: Partial<Attempt> = {}): Attempt {
  const a = newAttempt({ topic, level: 1, generatorId: 'test', seed: 1, params: {} });
  return {
    ...a,
    startedAt: new Date(finished.getTime() - 3 * 60_000).toISOString(),
    finishedAt: finished.toISOString(),
    stars: 3,
    clean: true,
    wrongTries: 0,
    ...o,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('dashboard (R-PAR-3)', () => {
  it('30 local days, minutes on the right day, levels from the topic states; fixed links left out', async () => {
    const now = new Date(2026, 8, 23, 18, 0);
    await db.attempts.bulkPut([
      done('EQ', new Date(2026, 8, 23, 9, 0)),
      done('EQ', new Date(2026, 8, 22, 23, 50), { clean: false, maxHint: 3 }),
      done('EQ', new Date(2026, 8, 23, 9, 30), { fixed: true }),
      done('PC', new Date(2026, 6, 1, 9, 0)),
    ]);
    await db.topicStates.put({ profileId: 'default', topic: 'EQ', level: 4, window: [] });
    const d = await loadDashboard(now);
    expect(d.days).toHaveLength(30);
    expect(d.days.at(-1)).toBe('2026-09-23');
    expect(d.daily.at(-1)).toEqual({ day: '2026-09-23', minutes: 3 });
    expect(d.daily.at(-2)).toEqual({ day: '2026-09-22', minutes: 3 });
    const eq = d.topics.find((t) => t.topic === 'EQ')!;
    expect(eq).toMatchObject({ level: 4, levels: 6, attempts: 2, cleanRate: 0.5 });
    expect(eq.hints[3]).toBe(1);
    // All-time totals, but the old PC answer isn't in the 30-day strip.
    expect(d.topics.find((t) => t.topic === 'PC')!.attempts).toBe(1);
    expect(d.daily.reduce((s, x) => s + x.minutes, 0)).toBe(6);
    expect(d.topics.find((t) => t.topic === 'NC')!.level).toBe(1);
  });
});

describe('missed questions (R-PAR-4)', () => {
  it('newest first; filters by topic, date range and diagnostic code', async () => {
    const d4 = {
      at: '2026-09-20T10:00:00.000Z',
      answer: '3a + a = 23 − 3',
      verdict: 'stepRejected' as const,
      diagnostic: 'EQ-D4',
    };
    await db.attempts.bulkPut([
      done('EQ', new Date(2026, 8, 20, 10), { id: 'eq-h3', maxHint: 3, clean: false, tries: [d4] }),
      done('EQ', new Date(2026, 8, 21, 10), { id: 'eq-clean' }),
      done('PC', new Date(2026, 8, 22, 10), { id: 'pc-2wrong', wrongTries: 2, clean: false }),
      done('PC', new Date(2026, 8, 22, 11), { id: 'pc-fixed', wrongTries: 3, clean: false, fixed: true }),
      { ...done('RD', new Date(2026, 8, 22, 12), { id: 'rd-open', maxHint: 3 }), finishedAt: undefined },
    ]);
    const ids = async (f = {}) => (await loadMissed(f)).map((a) => a.id);
    expect(await ids()).toEqual(['pc-2wrong', 'eq-h3']);
    expect(await ids({ topic: 'EQ' })).toEqual(['eq-h3']);
    expect(await ids({ from: '2026-09-21' })).toEqual(['pc-2wrong']);
    expect(await ids({ to: '2026-09-20' })).toEqual(['eq-h3']);
    expect(await ids({ code: 'EQ-D4' })).toEqual(['eq-h3']);
    expect(await ids({ code: 'EQ-D7' })).toEqual([]);
  });
});
