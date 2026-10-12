// RD generators, levels 1–4 (requirements §6.2, R-RD-1…3). D→F questions are built from
// (whole, nonRep, block) and canonicalised by exact long division, so periodic blocks and
// absorbable tails never appear (R-RD-2). F→D digits come from exact long division (R-RD-3).
import { config } from '../../config';
import { gcd, rat, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { fromRational, isCanonical, toRational, type DecimalRep } from '../../numbers/decimal';
import { showDecimal, showFraction, type Notation } from '../../numbers/display';
import { content } from '../content';
import { buildOptions, CORRECT, withRetries, type McQuestion } from '../mc';
import { d2fModels, decimalFillers, f2dModels, fractionFillers } from './distractors';

/** v2: the four levels (2026-10-11). */
export const RD_GENERATOR_ID = 'rd.v2';

/** Question shapes: the level table rows of §6.2 (1 Basic … 4 Challenge). No mixed levels. */
export type RdShape = 'pure1' | 'pure23' | 'whole' | 'delayed' | 'delayedWhole' | 'f2dA' | 'f2dB' | 'f2d7';

const SHAPES: Record<number, readonly RdShape[]> = {
  1: ['pure1', 'pure23'],
  2: ['whole', 'f2dA'],
  3: ['delayed', 'f2dB'],
  4: ['delayedWhole', 'f2d7'],
};

const DENOMINATORS: Record<string, readonly number[]> = {
  f2dA: config.rd.f2dDenominators[2]!,
  f2dB: config.rd.f2dDenominators[3]!,
  f2d7: config.rd.f2dDenominators[4]!,
};

/** Normalise (R-RD-2), then keep only results whose digits before and in the block fit the ranges. */
function keepShape(
  raw: DecimalRep,
  nonRep: { min: number; max: number },
  block: { min: number; max: number },
): DecimalRep | null {
  const c = fromRational(toRational(raw));
  const ok =
    c.block !== '' &&
    c.nonRep.length >= nonRep.min &&
    c.nonRep.length <= nonRep.max &&
    c.block.length >= block.min &&
    c.block.length <= block.max;
  return ok ? c : null;
}

const digits = (rng: Rng, k: number): string => Array.from({ length: k }, () => rng.int(0, 9)).join('');

/** The decimal for a D→F shape, or null to try again. */
function d2fRep(rng: Rng, shape: RdShape): DecimalRep | null {
  let raw: DecimalRep;
  switch (shape) {
    case 'pure1':
      raw = { negative: false, whole: 0n, nonRep: '', block: `${rng.int(1, 8)}` };
      break;
    case 'pure23':
      raw = { negative: false, whole: 0n, nonRep: '', block: digits(rng, rng.int(2, 3)) };
      break;
    case 'whole':
      raw = {
        negative: false,
        whole: BigInt(rng.int(1, config.rd.wholeMax)),
        nonRep: '',
        block: digits(rng, rng.int(1, 3)),
      };
      break;
    case 'delayed': {
      // Advanced: no whole part and a one-digit block (e.g. 0.41666…); the Challenge has the rest.
      const { advancedNonRep: m, advancedBlock: k } = config.rd;
      return keepShape(
        {
          negative: false,
          whole: 0n,
          nonRep: digits(rng, rng.int(m.min, m.max)),
          block: digits(rng, rng.int(k.min, k.max)),
        },
        m,
        k,
      );
    }
    case 'delayedWhole': {
      // Challenge: a whole part, digits before the repeat, and a longer block (e.g. 3.12454545…).
      const { challengeNonRep: m, challengeBlock: k } = config.rd;
      return keepShape(
        {
          negative: false,
          whole: BigInt(rng.int(1, config.rd.wholeMax)),
          nonRep: digits(rng, rng.int(m.min, m.max)),
          block: digits(rng, rng.int(k.min, k.max)),
        },
        m,
        k,
      );
    }
    default:
      return null;
  }
  return isCanonical(raw) ? raw : null;
}

const notationFor = (level: number): Notation => (level >= config.rd.barFromLevel ? 'both' : 'ellipsis');

function buildD2F(rng: Rng, level: number, seed: number, shape: RdShape): McQuestion | null {
  const rep = d2fRep(rng, shape);
  if (!rep) return null;
  const notation = notationFor(level);
  const value = toRational(rep);
  const hero = showDecimal(rep, notation);
  const answer = { value, shown: showFraction(value), code: CORRECT };
  const { options, modelCount } = buildOptions(rng, answer, d2fModels(rep), fractionFillers(value));
  return {
    topic: 'RD',
    generatorId: RD_GENERATOR_ID,
    seed,
    level,
    kind: 'D2F',
    prompt: content('rd.prompt.d2f'),
    hero,
    answer: value,
    options,
    modelCount,
    params: {
      shape,
      notation,
      whole: `${rep.whole}`,
      nonRep: rep.nonRep,
      block: rep.block,
      answer: answer.shown.text,
    },
  };
}

function buildF2D(rng: Rng, level: number, seed: number, shape: RdShape): McQuestion | null {
  const d = rng.pick(DENOMINATORS[shape]!);
  const n = rng.int(1, d - 1);
  if (gcd(BigInt(n), BigInt(d)) !== 1n) return null;
  const value: Rational = rat(n, d);
  const notation = notationFor(level);
  const shown = showDecimal(fromRational(value), notation);
  const answer = { value, shown, code: CORRECT };
  const { options, modelCount } = buildOptions(
    rng,
    answer,
    f2dModels(value, notation),
    decimalFillers(value, notation),
  );
  return {
    topic: 'RD',
    generatorId: RD_GENERATOR_ID,
    seed,
    level,
    kind: 'F2D',
    prompt: content('rd.prompt.f2d'),
    hero: showFraction(value),
    answer: value,
    options,
    modelCount,
    params: { shape, notation, n: `${n}`, d: `${d}`, answer: shown.text },
  };
}

/** The same (level, seed) always gives the same question (R-ARCH-3). */
export function generateRd(level: number, seed: number): McQuestion {
  if (!SHAPES[level]) throw new RangeError(`RD level ${level}`);
  const rng = mulberry32(seed);
  return withRetries(rng, (r) => {
    const shape = r.pick(SHAPES[level]!);
    return shape.startsWith('f2d') ? buildF2D(r, level, seed, shape) : buildD2F(r, level, seed, shape);
  });
}

export const rdShapes = SHAPES;
