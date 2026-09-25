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

export type ShellsPerStars = Record<1 | 2 | 3, number>;

/** Shells an answer earns: the parent's table by stars (default 1 ★ = 1 shell, R-RWD-4). */
export const shellsFor = (stars: 1 | 2 | 3, table: ShellsPerStars): number => table[stars];

/** Each entry a whole number from 0 to `maxPerAnswer`. */
export const isValidShellsTable = (t: ShellsPerStars): boolean =>
  ([1, 2, 3] as const).every(
    (k) => Number.isInteger(t[k]) && t[k] >= 0 && t[k] <= config.shells.maxPerAnswer,
  );

export const isValidBalance = (n: number): boolean =>
  Number.isInteger(n) && n >= 0 && n <= config.shells.maxBalance;

export const isValidPrice = (p: number): boolean =>
  Number.isInteger(p) && p >= 1 && p <= config.shop.maxPrice;

/**
 * Worn items after a change: at most one of each kind per mascot, and only unlocked ones.
 * Putting on an item replaces the same kind on that mascot.
 */
export function wear(worn: readonly string[], id: string, on: boolean, lifetime: number): string[] {
  const c = cosmetic(id);
  const unlocked = new Set(unlockedAt(lifetime).map((x) => x.id));
  const keep = worn.filter((w) => w !== id && unlocked.has(w));
  if (!on || !c || !unlocked.has(id)) return keep;
  return [...keep.filter((w) => !(cosmetic(w)?.mascot === c.mascot && cosmetic(w)?.kind === c.kind)), id];
}
