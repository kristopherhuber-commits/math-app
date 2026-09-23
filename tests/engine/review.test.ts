// R-ARCH-3 / R-PAR-4: a stored attempt's question regenerates exactly from its id, level and seed.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { config, TOPICS } from '../../src/engine/config';
import { regenerate } from '../../src/engine/review';
import { generateEq } from '../../src/engine/topics/eq/generator';
import { generateFdp } from '../../src/engine/topics/fdp/generator';
import { generateNc } from '../../src/engine/topics/nc/generator';
import { generatePc } from '../../src/engine/topics/pc/generator';
import { generateRd } from '../../src/engine/topics/rd/generator';

const original = {
  EQ: (l: number, s: number) => generateEq(l, s),
  NC: (l: number, s: number) => generateNc(l, s),
  RD: (l: number, s: number) => generateRd(l, s),
  FDP: (l: number, s: number) => generateFdp(l, s),
  PC: (l: number, s: number) => generatePc(l, s, '€'),
};

describe('regenerate (R-ARCH-3, R-PAR-4)', () => {
  for (const topic of TOPICS)
    it(`${topic}: the stored generator id, level and seed give the same question`, () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: config.levels[topic] }),
          fc.integer({ min: 0, max: 2 ** 32 - 1 }),
          (level, seed) => {
            const q = original[topic](level, seed);
            const r = regenerate({ topic, generatorId: q.generatorId, level, seed }, '€');
            expect(r?.topic).toBe(topic);
            expect(r?.question).toEqual(q);
          },
        ),
        { numRuns: 300 },
      );
    });

  it('an unknown generator or a level out of range gives null', () => {
    expect(regenerate({ topic: 'EQ', generatorId: 'eq.v0', level: 3, seed: 1 }, '$')).toBeNull();
    expect(regenerate({ topic: 'EQ', generatorId: 'test', level: 3, seed: 1 }, '$')).toBeNull();
    expect(regenerate({ topic: 'PC', generatorId: 'pc.v1', level: 9, seed: 1 }, '$')).toBeNull();
  });
});
