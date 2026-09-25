// M6 rewards rules: cosmetic unlocks from lifetime shells, shells to spend, prices, wearing.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { config } from '../../src/engine/config';
import {
  isValidPrice,
  newlyUnlocked,
  nextCosmetic,
  shellsShort,
  spendable,
  unlockedAt,
  wear,
} from '../../src/engine/rewards';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('cosmetic unlocks', () => {
  it('thresholds 20, 50, 100, 175, 275, 400, 550, 750, alternating turtle and penguin', () => {
    expect(config.cosmetics.map((c) => c.at)).toEqual([20, 50, 100, 175, 275, 400, 550, 750]);
    expect(config.cosmetics.map((c) => c.mascot)).toEqual([
      'turtle',
      'penguin',
      'turtle',
      'penguin',
      'turtle',
      'penguin',
      'turtle',
      'penguin',
    ]);
    // Each mascot gets each kind once.
    for (const m of ['turtle', 'penguin'] as const)
      expect(
        config.cosmetics
          .filter((c) => c.mascot === m)
          .map((c) => c.kind)
          .sort(),
      ).toEqual(['bowtie', 'hat', 'scarf', 'sunglasses']);
  });

  it.each([
    [0, []],
    [19, []],
    [20, ['turtle-hat']],
    [99, ['turtle-hat', 'penguin-scarf']],
    [750, ids([...config.cosmetics])],
  ])('lifetime %i → %o', (n, expected) => {
    expect(ids(unlockedAt(n))).toEqual(expected);
  });

  it('newly unlocked between two counts, including a jump past two', () => {
    expect(ids(newlyUnlocked(19, 20))).toEqual(['turtle-hat']);
    expect(ids(newlyUnlocked(20, 23))).toEqual([]);
    expect(ids(newlyUnlocked(45, 101))).toEqual(['penguin-scarf', 'turtle-sunglasses']);
    expect(nextCosmetic(20)?.id).toBe('penguin-scarf');
    expect(nextCosmetic(750)).toBeUndefined();
  });

  it('property: unlocks only grow with lifetime shells, and the new ones are exactly the difference', () => {
    fc.assert(
      fc.property(fc.nat(1000), fc.nat(50), (a, d) => {
        const before = ids(unlockedAt(a));
        const after = ids(unlockedAt(a + d));
        expect(after.slice(0, before.length)).toEqual(before);
        expect(ids(newlyUnlocked(a, a + d))).toEqual(after.slice(before.length));
      }),
    );
  });
});

describe('shells to spend and prices', () => {
  it('lifetime − spent, never negative', () => {
    expect(spendable({ shells: 200, spent: 150 })).toBe(50);
    expect(spendable({ shells: 10 })).toBe(10);
    expect(spendable({ shells: 10, spent: 30 })).toBe(0);
  });

  it('how many more shells an item needs', () => {
    expect(shellsShort(1400, 1500)).toBe(100);
    expect(shellsShort(1500, 1500)).toBe(0);
    expect(shellsShort(2000, 1500)).toBe(0);
  });

  it('prices are whole numbers from 1 to the maximum', () => {
    for (const p of [1, 150, 1500, config.shop.maxPrice]) expect(isValidPrice(p)).toBe(true);
    for (const p of [0, -5, 1.5, config.shop.maxPrice + 1, Number.NaN]) expect(isValidPrice(p)).toBe(false);
  });
});

describe('wearing', () => {
  it('only unlocked items; off removes; on adds once', () => {
    expect(wear([], 'turtle-hat', true, 20)).toEqual(['turtle-hat']);
    expect(wear(['turtle-hat'], 'turtle-hat', true, 20)).toEqual(['turtle-hat']);
    expect(wear(['turtle-hat'], 'turtle-hat', false, 20)).toEqual([]);
    expect(wear([], 'penguin-bowtie', true, 100)).toEqual([]);
    expect(wear(['bogus', 'turtle-hat'], 'penguin-scarf', true, 50)).toEqual(['turtle-hat', 'penguin-scarf']);
  });
});
