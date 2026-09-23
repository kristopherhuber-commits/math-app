// Parent area rules (requirements §9): the PIN-reset challenge (R-PAR-1).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkChallenge, pinChallenge } from '../../src/engine/parent';

describe('PIN-reset challenge (R-PAR-1)', () => {
  it('a 2-digit number times a teen, answer exact, same seed same challenge', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 1 }), (seed) => {
        const c = pinChallenge(seed);
        expect(c.a).toBeGreaterThanOrEqual(21);
        expect(c.a).toBeLessThanOrEqual(99);
        expect(c.b).toBeGreaterThanOrEqual(11);
        expect(c.b).toBeLessThanOrEqual(19);
        // Independent check: repeated addition.
        let sum = 0;
        for (let i = 0; i < c.b; i++) sum += c.a;
        expect(c.answer).toBe(sum);
        expect(pinChallenge(seed)).toEqual(c);
      }),
      { numRuns: 1000 },
    );
  });

  it('accepts only the exact answer, digits with optional spaces', () => {
    const c = { a: 47, b: 13, answer: 611 };
    expect(checkChallenge(c, '611')).toBe(true);
    expect(checkChallenge(c, ' 6 11 ')).toBe(true);
    for (const t of ['610', '', '611.0', '-611', '6l1', '0611x']) expect(checkChallenge(c, t)).toBe(false);
  });
});
