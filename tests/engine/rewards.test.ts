// Rewards rules: cosmetic unlocks from lifetime shells, shells to spend, prices, wearing, and the
// mascot levels (M6; eight more cosmetics and mascot levels, parent request 2026-10-11).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { config } from '../../src/engine/config';
import {
  isValidPrice,
  mascotLevel,
  newlyUnlocked,
  nextCosmetic,
  putOn,
  shellsShort,
  slotOf,
  spendable,
  unlockedAt,
  wear,
} from '../../src/engine/rewards';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const ALL = [20, 50, 100, 175, 275, 400, 550, 750, 950, 1200, 1500, 1850, 2250, 2700, 3200, 3750];

describe('cosmetic unlocks', () => {
  it('sixteen thresholds, rising, alternating turtle and penguin', () => {
    expect(config.cosmetics.map((c) => c.at)).toEqual(ALL);
    expect(config.cosmetics.map((c) => c.mascot)).toEqual(
      ALL.map((_, i) => (i % 2 === 0 ? 'turtle' : 'penguin')),
    );
    expect(new Set(ids([...config.cosmetics])).size).toBe(ALL.length);
    // Each mascot gets each kind once.
    for (const m of ['turtle', 'penguin'] as const)
      expect(
        config.cosmetics
          .filter((c) => c.mascot === m)
          .map((c) => c.kind)
          .sort(),
      ).toEqual(['bowtie', 'cape', 'crown', 'flowers', 'hat', 'headphones', 'scarf', 'sunglasses']);
  });

  it.each([
    [0, []],
    [19, []],
    [20, ['turtle-hat']],
    [99, ['turtle-hat', 'penguin-scarf']],
    [949, ids([...config.cosmetics]).slice(0, 8)],
    [950, ids([...config.cosmetics]).slice(0, 9)],
    [3750, ids([...config.cosmetics])],
  ])('lifetime %i → %o', (n, expected) => {
    expect(ids(unlockedAt(n))).toEqual(expected);
  });

  it('newly unlocked between two counts, including a jump past two', () => {
    expect(ids(newlyUnlocked(19, 20))).toEqual(['turtle-hat']);
    expect(ids(newlyUnlocked(20, 23))).toEqual([]);
    expect(ids(newlyUnlocked(45, 101))).toEqual(['penguin-scarf', 'turtle-sunglasses']);
    expect(ids(newlyUnlocked(1190, 1500))).toEqual(['penguin-headphones', 'turtle-cape']);
    expect(nextCosmetic(20)?.id).toBe('penguin-scarf');
    expect(nextCosmetic(750)?.id).toBe('turtle-flowers');
    expect(nextCosmetic(3750)).toBeUndefined();
  });

  it('property: unlocks only grow with lifetime shells, and the new ones are exactly the difference', () => {
    fc.assert(
      fc.property(fc.nat(5000), fc.nat(500), (a, d) => {
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

  it('hat, crown, flower crown and headphones share the head: one replaces another on that mascot', () => {
    for (const k of ['hat', 'crown', 'flowers', 'headphones'] as const) expect(slotOf(k)).toBe('head');
    for (const k of ['scarf', 'bowtie', 'sunglasses', 'cape'] as const) expect(slotOf(k)).toBe(k);
    const all = 3750;
    expect(wear(['turtle-hat', 'turtle-scarf'], 'turtle-crown', true, all)).toEqual([
      'turtle-scarf',
      'turtle-crown',
    ]);
    expect(wear(['turtle-crown'], 'turtle-headphones', true, all)).toEqual(['turtle-headphones']);
    // The other mascot's head is untouched; other slots stay on.
    expect(wear(['penguin-hat', 'turtle-cape'], 'turtle-flowers', true, all)).toEqual([
      'penguin-hat',
      'turtle-cape',
      'turtle-flowers',
    ]);
  });

  it('newly unlocked items are put on with the same rule', () => {
    expect(putOn(['turtle-hat', 'turtle-scarf'], ['turtle-flowers'])).toEqual([
      'turtle-scarf',
      'turtle-flowers',
    ]);
    expect(putOn(['penguin-hat'], ['penguin-headphones', 'turtle-cape'])).toEqual([
      'penguin-headphones',
      'turtle-cape',
    ]);
    expect(putOn(['turtle-hat'], ['bogus'])).toEqual(['turtle-hat']);
  });

  it('property: never two items in one slot on one mascot', () => {
    const cos = config.cosmetics;
    fc.assert(
      fc.property(fc.array(fc.nat(cos.length - 1), { maxLength: 30 }), (picks) => {
        let worn: string[] = [];
        for (const i of picks) worn = wear(worn, cos[i]!.id, true, 3750);
        const slots = worn.map((w) => {
          const c = cos.find((x) => x.id === w)!;
          return `${c.mascot}:${slotOf(c.kind)}`;
        });
        expect(new Set(slots).size).toBe(slots.length);
      }),
    );
  });
});

describe('mascot levels', () => {
  it.each([
    // [mascot, lifetime, level, next id, shells to next]
    ['turtle', 0, 1, 'turtle-hat', 20],
    ['penguin', 0, 1, 'penguin-scarf', 50],
    ['turtle', 20, 2, 'turtle-sunglasses', 80],
    ['penguin', 49, 1, 'penguin-scarf', 1],
    ['turtle', 950, 6, 'turtle-cape', 550],
    ['penguin', 3749, 8, 'penguin-crown', 1],
  ] as const)('%s at %i shells: level %i, next %s in %i', (m, lifetime, level, next, toNext) => {
    const l = mascotLevel(m, lifetime);
    expect(l.level).toBe(level);
    expect(l.next?.id).toBe(next);
    expect(l.toNext).toBe(toNext);
    expect(l.max).toBe(9);
  });

  it('top level once everything is unlocked: no next, full progress', () => {
    expect(mascotLevel('turtle', 3200)).toEqual({ level: 9, max: 9, progress: 1 });
    expect(mascotLevel('penguin', 3750)).toEqual({ level: 9, max: 9, progress: 1 });
    expect(mascotLevel('penguin', 3200).level).toBe(8);
  });

  it('progress runs from the last item to the next, 0 to 1', () => {
    expect(mascotLevel('turtle', 0).progress).toBe(0);
    expect(mascotLevel('turtle', 10).progress).toBe(0.5);
    // Turtle: sunglasses at 100, scarf at 275.
    expect(mascotLevel('turtle', 100).progress).toBe(0);
    expect(mascotLevel('turtle', 275 - 35).progress).toBeCloseTo(0.8, 10);
  });

  it('property: a level is 1 + the items unlocked, and never goes down as shells grow', () => {
    fc.assert(
      fc.property(fc.nat(5000), fc.nat(500), fc.constantFrom('turtle', 'penguin'), (a, d, m) => {
        const mine = config.cosmetics.filter((c) => c.mascot === m && a >= c.at).length;
        expect(mascotLevel(m, a).level).toBe(1 + mine);
        expect(mascotLevel(m, a + d).level).toBeGreaterThanOrEqual(mascotLevel(m, a).level);
        const p = mascotLevel(m, a).progress;
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }),
    );
  });
});
