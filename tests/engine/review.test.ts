// R-ARCH-3 / R-PAR-4: a stored attempt's question regenerates exactly from its id, level and seed.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { config, TOPICS } from '../../src/engine/config';
import { regenerate } from '../../src/engine/review';
import { generateEq } from '../../src/engine/topics/eq/generator';
import { generateFdpTopic } from '../../src/engine/topics/fdp/topic';
import { generateNc } from '../../src/engine/topics/nc/generator';
import { generatePc } from '../../src/engine/topics/pc/generator';

const original = {
  EQ: (l: number, s: number) => generateEq(l, s),
  NC: (l: number, s: number) => generateNc(l, s),
  // FDP questions come from the repeating-decimal or the conversion generator (2026-10-11).
  FDP: (l: number, s: number) => generateFdpTopic(l, s),
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
            // The question's own generator: RD or FDP for the FDP topic.
            expect(r?.topic).toBe(topic === 'FDP' ? (q as { topic: string }).topic : topic);
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
    expect(regenerate({ topic: 'EQ', generatorId: 'eq.v2', level: 5, seed: 1 }, '$')).toBeNull();
  });

  it('attempts from before the four levels (v1 generators) give null; current ids are v2', () => {
    // RD keeps its own generator id inside the FDP topic (2026-10-11).
    for (const v of ['nc', 'rd', 'fdp', 'pc', 'eq']) {
      for (let level = 1; level <= 4; level++)
        expect(regenerate({ topic: 'FDP', generatorId: `${v}.v1`, level, seed: 1 }, '$')).toBeNull();
    }
    for (const topic of TOPICS) {
      const ids = new Set(Array.from({ length: 40 }, (_, seed) => original[topic](1, seed).generatorId));
      expect([...ids].sort()).toEqual(topic === 'FDP' ? ['fdp.v2', 'rd.v2'] : [`${topic.toLowerCase()}.v2`]);
    }
  });

  it('an RD answer stored before the merge (topic RD, now FDP) still replays from its generator id', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = regenerate({ topic: 'FDP', generatorId: 'rd.v2', level: 4, seed }, '$');
      expect(r?.topic).toBe('RD');
    }
  });
});
