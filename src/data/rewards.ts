// The shop and the cosmetics over Dexie (R-RWD-4 as the parent reshaped it, M6). Buying takes shells
// to spend at once and leaves a request for the parent, who marks it given or cancels it (refund).
import { isValidPrice, shellsShort, spendable, unlockedAt, wear } from '../engine/rewards';
import { db, PROFILE_ID, type Redemption, type Rewards, type ShopItem } from './db';
import { loadSettings, saveSettings } from './settings';

export const emptyRewards = (): Rewards => ({
  profileId: PROFILE_ID,
  shells: 0,
  streak: 0,
  badges: [],
  accessories: [],
  spent: 0,
});

const rewardsRow = async (): Promise<Rewards> => (await db.rewards.get(PROFILE_ID)) ?? emptyRewards();

export interface ShopSnapshot {
  items: ShopItem[];
  /** Shells to spend. */
  balance: number;
  lifetime: number;
  pending: Redemption[];
}

export async function loadShop(): Promise<ShopSnapshot> {
  const [r, s, pending] = await Promise.all([
    rewardsRow(),
    loadSettings(),
    db.redemptions.where('status').equals('requested').toArray(),
  ]);
  return {
    items: s.shopItems,
    balance: spendable(r),
    lifetime: r.shells,
    pending: pending.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt)),
  };
}

export type BuyResult = { ok: true; redemption: Redemption; balance: number } | { ok: false; short: number };

/** Buy a shop item: in one transaction, so a double tap can't buy twice with one balance. */
export async function buy(itemId: string, now: Date = new Date()): Promise<BuyResult> {
  const item = (await loadSettings()).shopItems.find((i) => i.id === itemId);
  if (!item) throw new Error(`no shop item ${itemId}`);
  return db.transaction('rw', db.rewards, db.redemptions, async () => {
    const r = await rewardsRow();
    const short = shellsShort(spendable(r), item.price);
    if (short > 0) return { ok: false, short };
    const redemption: Redemption = {
      id: crypto.randomUUID(),
      itemId: item.id,
      name: item.name,
      price: item.price,
      status: 'requested',
      requestedAt: now.toISOString(),
    };
    const next = { ...r, spent: (r.spent ?? 0) + item.price };
    await db.rewards.put(next);
    await db.redemptions.add(redemption);
    return { ok: true, redemption, balance: spendable(next) };
  });
}

async function resolve(id: string, status: 'given' | 'cancelled', now: Date): Promise<void> {
  await db.transaction('rw', db.rewards, db.redemptions, async () => {
    const x = await db.redemptions.get(id);
    if (!x || x.status !== 'requested') return;
    await db.redemptions.put({ ...x, status, resolvedAt: now.toISOString() });
    if (status === 'cancelled') {
      const r = await rewardsRow();
      await db.rewards.put({ ...r, spent: Math.max(0, (r.spent ?? 0) - x.price) });
    }
  });
}

/** The parent handed the reward over. */
export const markGiven = (id: string, now: Date = new Date()) => resolve(id, 'given', now);

/** The parent cancelled the request: the shells come back (once). */
export const cancelRedemption = (id: string, now: Date = new Date()) => resolve(id, 'cancelled', now);

/** Every request, newest first (the parent's history). */
export const listRedemptions = async (): Promise<Redemption[]> =>
  (await db.redemptions.toArray()).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

/** The parent adds or removes an item's picture (a data: URL made on the device). */
export async function setImage(itemId: string, image: string | null): Promise<void> {
  if (image !== null && !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image))
    throw new Error('not an image');
  const s = await loadSettings();
  await saveSettings({
    shopItems: s.shopItems.map((i) => {
      if (i.id !== itemId) return i;
      const next: ShopItem = { ...i };
      if (image === null) delete next.image;
      else next.image = image;
      return next;
    }),
  });
}

/** R-PAR: the parent changes an item's price; items bought already keep the price they were bought at. */
export async function setPrice(itemId: string, price: number): Promise<void> {
  if (!isValidPrice(price)) throw new Error('invalid price');
  const s = await loadSettings();
  await saveSettings({ shopItems: s.shopItems.map((i) => (i.id === itemId ? { ...i, price } : i)) });
}

export interface Wardrobe {
  lifetime: number;
  unlocked: string[];
  worn: string[];
}

export async function loadWardrobe(): Promise<Wardrobe> {
  const r = await rewardsRow();
  return { lifetime: r.shells, unlocked: unlockedAt(r.shells).map((c) => c.id), worn: r.accessories };
}

/** Put a cosmetic on or take it off (only unlocked ones can be worn). */
export async function setWorn(id: string, on: boolean): Promise<string[]> {
  return db.transaction('rw', db.rewards, async () => {
    const r = await rewardsRow();
    const accessories = wear(r.accessories, id, on, r.shells);
    await db.rewards.put({ ...r, accessories });
    return accessories;
  });
}
