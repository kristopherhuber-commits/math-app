// Seeded PRNG (R-ARCH-3): mulberry32. The same seed always gives the same sequence.
// Randomness only chooses question parameters; it never decides correctness.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Integer in [min, max] excluding 0. */
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  bool(): boolean;
  shuffle<T>(items: readonly T[]): T[];
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    nonZero(min, max) {
      for (;;) {
        const x = int(min, max);
        if (x !== 0) return x;
      }
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('pick from empty list');
      return items[int(0, items.length - 1)]!;
    },
    bool: () => next() < 0.5,
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}

/** A fresh 32-bit seed for a new question. Not reproducible by design; the seed is stored. */
export function newSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
