// Shells, cosmetics and the shop (R-RWD-4 as the parent reshaped it in M6). Two counts: lifetime
// shells never go down and unlock cosmetics; shells to spend = lifetime − spent, used in the shop.
import { config } from './config';

export type Cosmetic = (typeof config.cosmetics)[number];
export type Mascot = Cosmetic['mascot'];
export type AccessoryKind = Cosmetic['kind'];

/** Cosmetics unlocked by a lifetime shell count, in unlock order. */
export const unlockedAt = (lifetime: number): Cosmetic[] => config.cosmetics.filter((c) => lifetime >= c.at);

/** Cosmetics that unlock between two lifetime counts (a jump can pass more than one). */
export const newlyUnlocked = (before: number, after: number): Cosmetic[] =>
  config.cosmetics.filter((c) => before < c.at && after >= c.at);

/** The next cosmetic still to unlock, if any. */
export const nextCosmetic = (lifetime: number): Cosmetic | undefined =>
  config.cosmetics.find((c) => lifetime < c.at);

export const cosmetic = (id: string): Cosmetic | undefined => config.cosmetics.find((c) => c.id === id);

/** Shells to spend: never negative, whatever the stored numbers say. */
export const spendable = (r: { shells: number; spent?: number }): number =>
  Math.max(0, r.shells - (r.spent ?? 0));

/** How many more shells an item needs (0 when it can be bought). */
export const shellsShort = (balance: number, price: number): number => Math.max(0, price - balance);

export const isValidBalance = (n: number): boolean =>
  Number.isInteger(n) && n >= 0 && n <= config.shells.maxBalance;

export const isValidPrice = (p: number): boolean =>
  Number.isInteger(p) && p >= 1 && p <= config.shop.maxPrice;

/**
 * Where a kind is worn: the head items share one slot (`config.cosmeticSlots`); the rest are their own.
 */
export const slotOf = (kind: AccessoryKind): string => config.cosmeticSlots[kind] ?? kind;

/** Put items on: each replaces whatever that mascot wears in the same slot. Unknown ids are skipped. */
export function putOn(worn: readonly string[], ids: readonly string[]): string[] {
  let next = [...worn];
  for (const id of ids) {
    const c = cosmetic(id);
    if (!c) continue;
    next = [
      ...next.filter((w) => {
        const o = cosmetic(w);
        return w !== id && !(o?.mascot === c.mascot && slotOf(o.kind) === slotOf(c.kind));
      }),
      id,
    ];
  }
  return next;
}

/**
 * Worn items after a change: at most one item per slot per mascot, and only unlocked ones.
 * Putting on an item replaces the one in the same slot on that mascot.
 */
export function wear(worn: readonly string[], id: string, on: boolean, lifetime: number): string[] {
  const unlocked = new Set(unlockedAt(lifetime).map((x) => x.id));
  const keep = worn.filter((w) => w !== id && unlocked.has(w));
  if (!on || !cosmetic(id) || !unlocked.has(id)) return keep;
  return putOn(keep, [id]);
}

/**
 * A mascot's level (parent request 2026-10-11): 1, plus one for each of its cosmetics unlocked.
 * With `toNext`, the shells still needed for its next item (absent once it has them all).
 */
export function mascotLevel(
  mascot: Mascot,
  lifetime: number,
): { level: number; max: number; next?: Cosmetic; toNext?: number; progress: number } {
  const mine = config.cosmetics.filter((c) => c.mascot === mascot);
  const got = mine.filter((c) => lifetime >= c.at);
  const next = mine.find((c) => lifetime < c.at);
  const level = config.mascotLevelStart + got.length;
  const max = config.mascotLevelStart + mine.length;
  if (!next) return { level, max, progress: 1 };
  // Progress from the last item unlocked (or 0) towards the next, 0…1.
  const from = got.at(-1)?.at ?? 0;
  return {
    level,
    max,
    next,
    toNext: next.at - lifetime,
    progress: Math.max(0, Math.min(1, (lifetime - from) / (next.at - from))),
  };
}
