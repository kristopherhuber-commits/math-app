import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/engine/rng';

describe('mulberry32 (R-ARCH-3)', () => {
  it('is reproducible for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('differs between seeds', () => {
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });
  it('int stays in range and hits both ends', () => {
    const r = mulberry32(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = r.int(-3, 3);
      expect(x).toBeGreaterThanOrEqual(-3);
      expect(x).toBeLessThanOrEqual(3);
      seen.add(x);
    }
    expect(seen.size).toBe(7);
  });
  it('nonZero never returns 0', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 500; i++) expect(r.nonZero(-1, 1)).not.toBe(0);
  });
  it('shuffle is a permutation', () => {
    const r = mulberry32(3);
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
