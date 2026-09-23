// R-ANS-1…4: the option builder shared by RD, FDP and PC.
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildOptions, FILLER, NotEnoughOptions, type McCandidate } from '../../src/engine/topics/mc';
import { miniQuestion } from '../../src/engine/topics/walk';
import { showFraction } from '../../src/engine/numbers/display';
import { mulberry32 } from '../../src/engine/rng';
import { eq, rat } from '../../src/engine/rational';
import { content } from '../../src/engine/topics/content';

const cand = (n: number, d: number, code: string): McCandidate => ({
  value: rat(n, d),
  shown: showFraction(rat(n, d)),
  code,
});

function* fillersFrom(start: number): Generator<McCandidate> {
  for (let i = start; ; i++) yield cand(i, 7, FILLER);
}

describe('buildOptions', () => {
  it('drops a model equal in value to the answer (R-ANS-3): 420/99 when 140/33 is right', () => {
    const answer = cand(140, 33, 'correct');
    const { options, modelCount } = buildOptions(
      mulberry32(1),
      answer,
      [
        cand(420, 99, 'RD-M9'),
        cand(424, 99, 'RD-M2'),
        cand(106, 25, 'RD-M4'),
        cand(8, 33, 'RD-M1'),
        cand(140, 3, 'RD-M3'),
      ],
      fillersFrom(1),
    );
    expect(modelCount).toBe(4);
    expect(options.map((o) => o.code).sort()).toEqual(['RD-M1', 'RD-M2', 'RD-M3', 'RD-M4', 'correct']);
  });

  it('5 distinct options, one correct, fillers only when models give < 4', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(fc.tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 6 })), { maxLength: 8 }),
        (seed, raw) => {
          const answer = cand(5, 3, 'correct');
          const models = raw.map(([n, d], i) => cand(n, d, `M${i}`));
          const { options, modelCount } = buildOptions(mulberry32(seed), answer, models, fillersFrom(20));
          expect(options).toHaveLength(5);
          expect(options.filter((o) => eq(o.value, answer.value))).toHaveLength(1);
          expect(new Set(options.map((o) => o.shown.text)).size).toBe(5);
          for (let i = 0; i < 5; i++)
            for (let j = i + 1; j < 5; j++) expect(eq(options[i]!.value, options[j]!.value)).toBe(false);
          const fillers = options.filter((o) => o.code === FILLER).length;
          expect(fillers).toBe(Math.max(0, 4 - modelCount));
          expect(options.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('throws NotEnoughOptions when fillers run out', () => {
    expect(() => buildOptions(mulberry32(1), cand(1, 2, 'correct'), [], [cand(1, 2, FILLER)])).toThrow(
      NotEnoughOptions,
    );
  });
});

describe('miniQuestion', () => {
  it('3 distinct choices, exactly one correct', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        const m = miniQuestion(mulberry32(seed), content('q'), cand(420, 1, ''), [
          cand(420, 1, ''),
          cand(424, 1, ''),
          cand(428, 1, ''),
        ]);
        expect(m.options.map((o) => o.text).sort()).toEqual(['420', '424', '428']);
        expect(m.options[m.correct]!.text).toBe('420');
      }),
      { numRuns: 200 },
    );
  });
});
