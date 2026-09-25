// M6 rewards (R-RWD-4 as the parent reshaped it): schema v4, the shop, and cosmetics (fake IndexedDB).
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, MathDb } from '../../src/data/db';
import { newAttempt } from '../../src/data/attempts';
import { finishAttempt, homeSnapshot, shellCount } from '../../src/data/progress';
import {
  buy,
  cancelRedemption,
  listRedemptions,
  loadShop,
  loadWardrobe,
  markGiven,
  setImage,
  setPrice,
  setWorn,
} from '../../src/data/rewards';
import { exportData, importData, parseImport } from '../../src/data/backup';

const rewards = (shells: number, spent = 0, accessories: string[] = []) =>
  db.rewards.put({ profileId: 'default', shells, spent, streak: 0, badges: [], accessories });

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('schema v4 (R-DATA-1)', () => {
  it('v3 → v4: nothing spent, unlocked cosmetics worn, the default shop, no requests', async () => {
    const v3 = {
      profiles: 'id',
      settings: 'profileId',
      topicStates: '[profileId+topic], profileId',
      assignments: 'id, profileId, status, position',
      attempts: 'id, profileId, topic, startedAt, assignmentId',
      rewards: 'profileId',
      meta: 'key',
      errors: '++id, at',
    };
    const old = new Dexie('v3-db');
    old.version(1).stores(v3);
    old.version(2).stores(v3);
    old.version(3).stores(v3);
    await old.open();
    await old
      .table('rewards')
      .put({ profileId: 'default', shells: 60, streak: 1, badges: [], accessories: [] });
    await old.table('settings').put({ profileId: 'default', pinHash: 'h' });
    old.close();

    const d = new MathDb('v3-db');
    await d.open();
    expect(d.verno).toBe(4);
    expect(await d.rewards.get('default')).toMatchObject({
      shells: 60,
      spent: 0,
      accessories: ['turtle-hat', 'penguin-scarf'],
    });
    expect((await d.settings.get('default'))?.shopItems).toEqual([
      { id: 'treat', name: 'Strawberry Açaí Lemonade Refresher', price: 150 },
      { id: 'robux', name: 'Roblox gift card, 2,000 Robux', price: 1500 },
    ]);
    expect(await d.redemptions.count()).toBe(0);
    d.close();
  });

  it('a v3 export imports with the same upgrade; v4 exports carry the requests', async () => {
    const r = parseImport(
      JSON.stringify({
        app: 'turtle-penguin-math',
        schemaVersion: 3,
        rewards: [{ profileId: 'default', shells: 25, streak: 0, badges: [], accessories: [] }],
        settings: [{ profileId: 'default', pinHash: 'h' }],
      }),
    );
    if (!r.ok) throw new Error('unreadable');
    expect(r.data.rewards[0]).toMatchObject({ spent: 0, accessories: ['turtle-hat'] });
    expect(r.data.settings[0]!.shopItems).toHaveLength(2);
    expect(r.data.redemptions).toEqual([]);

    await rewards(200);
    await buy('treat');
    const file = await exportData();
    expect(file.redemptions).toHaveLength(1);
    await db.redemptions.clear();
    await importData(file);
    expect(await db.redemptions.count()).toBe(1);
  });
});

describe('the shop', () => {
  it('shells to spend = lifetime − spent; buying takes the price at once and leaves a request', async () => {
    await rewards(200);
    const r = await buy('treat', new Date('2026-09-25T10:00:00Z'));
    expect(r).toMatchObject({ ok: true, balance: 50 });
    const shop = await loadShop();
    expect(shop).toMatchObject({ balance: 50, lifetime: 200 });
    expect(shop.pending).toMatchObject([
      { itemId: 'treat', name: 'Strawberry Açaí Lemonade Refresher', price: 150, status: 'requested' },
    ]);
    expect(await shellCount()).toBe(50);
    expect((await homeSnapshot()).shells).toBe(50);
  });

  it('refuses when short, and says by how much', async () => {
    await rewards(1400);
    expect(await buy('robux')).toEqual({ ok: false, short: 100 });
    expect(await db.redemptions.count()).toBe(0);
    expect((await db.rewards.get('default'))?.spent).toBe(0);
  });

  it('two taps at once buy only once', async () => {
    await rewards(200);
    const [a, b] = await Promise.all([buy('treat'), buy('treat')]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect(await db.redemptions.count()).toBe(1);
  });

  it('given closes it; cancel refunds once; lifetime never goes down', async () => {
    await rewards(400);
    const one = await buy('treat');
    const two = await buy('treat');
    if (!one.ok || !two.ok) throw new Error('buy');
    await markGiven(one.redemption.id);
    await cancelRedemption(two.redemption.id);
    await cancelRedemption(two.redemption.id);
    await markGiven(two.redemption.id);
    const shop = await loadShop();
    expect(shop).toMatchObject({ balance: 250, lifetime: 400, pending: [] });
    expect((await listRedemptions()).map((x) => x.status).sort()).toEqual(['cancelled', 'given']);
  });

  it('a new price applies to new purchases only', async () => {
    await rewards(400);
    await buy('treat');
    await setPrice('treat', 100);
    await buy('treat');
    expect((await listRedemptions()).map((x) => x.price).sort()).toEqual([100, 150]);
    expect((await loadShop()).balance).toBe(150);
    await expect(setPrice('treat', 0)).rejects.toThrow();
    await expect(setPrice('treat', 2.5)).rejects.toThrow();
  });
});

describe('cosmetics', () => {
  const finish = (stars: 1 | 2 | 3) =>
    finishAttempt(
      {
        ...newAttempt({ topic: 'PC', level: 1, generatorId: 'test', seed: 1, params: {} }),
        finishedAt: new Date().toISOString(),
        stars,
        clean: true,
        wrongTries: 0,
      },
      { adaptive: false, rewarded: true },
    );

  it('crossing 20 lifetime shells unlocks the turtle hat, worn at once, and says so once', async () => {
    await rewards(18, 10);
    const e = await finish(3);
    expect(e.unlocked).toEqual(['turtle-hat']);
    expect(e.shells).toBe(11); // shells to spend: 21 − 10
    expect((await loadWardrobe()).worn).toEqual(['turtle-hat']);
    expect((await finish(3)).unlocked).toBeUndefined();
  });

  it('spending shells never locks a cosmetic again', async () => {
    await rewards(200, 0, ['turtle-hat', 'penguin-scarf', 'turtle-sunglasses']);
    await buy('treat');
    expect((await loadWardrobe()).unlocked).toEqual([
      'turtle-hat',
      'penguin-scarf',
      'turtle-sunglasses',
      'penguin-hat',
    ]);
  });

  it('take off and put back on; locked ones cannot be worn', async () => {
    await rewards(60, 0, ['turtle-hat', 'penguin-scarf']);
    expect(await setWorn('turtle-hat', false)).toEqual(['penguin-scarf']);
    expect(await setWorn('turtle-hat', true)).toEqual(['penguin-scarf', 'turtle-hat']);
    expect(await setWorn('penguin-bowtie', true)).toEqual(['penguin-scarf', 'turtle-hat']);
  });
});

describe('shop names and pictures (parent requests, 2026-09-25)', () => {
  it('a device that stored the old default name shows the new one; a name the parent chose stays', async () => {
    await db.settings.put({
      profileId: 'default',
      pinHash: 'h',
      shopItems: [
        { id: 'treat', name: 'Starbucks treat', price: 150 },
        { id: 'robux', name: 'Robux card', price: 1500 },
      ],
    } as never);
    expect((await loadShop()).items.map((i) => i.name)).toEqual([
      'Strawberry Açaí Lemonade Refresher',
      'Robux card',
    ]);
  });

  it('a picture is kept as an image data URL, can be removed, and anything else is refused', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    await setImage('robux', png);
    expect((await loadShop()).items.find((i) => i.id === 'robux')?.image).toBe(png);
    await setImage('robux', null);
    expect((await loadShop()).items.find((i) => i.id === 'robux')).not.toHaveProperty('image');
    await expect(setImage('robux', 'https://example.com/robux.png')).rejects.toThrow();
    await expect(setImage('robux', 'data:text/html;base64,PGI+')).rejects.toThrow();
  });
});
