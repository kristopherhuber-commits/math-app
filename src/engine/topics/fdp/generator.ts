// FDP generators, levels 1–4 (requirements §6.3, R-FDP-1…3). A value is picked from the level's
// pool, then a direction: F→D, F→P, D→F, D→P, P→F or P→D. Fractions are in lowest terms (R-FDP-1);
// values > 1 ask for a mixed number or an improper fraction, 50/50 (R-FDP-2).
import { config } from '../../config';
import { add, cmp, gcd, rat, ONE, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import type { Notation } from '../../numbers/display';
import { content } from '../content';
import { buildOptions, CORRECT, withRetries, type McQuestion } from '../mc';
import { fdpFillers, fdpModels, showAs, type FdpForm, type FdpSpec, type FractionForm } from './distractors';

/** v2: the four levels (2026-10-11). */
export const FDP_GENERATOR_ID = 'fdp.v2';

const DIRECTIONS: readonly [FdpForm, FdpForm][] = [
  ['F', 'D'],
  ['F', 'P'],
  ['D', 'F'],
  ['D', 'P'],
  ['P', 'F'],
  ['P', 'D'],
];

function properFraction(rng: Rng, denominators: readonly number[]): Rational | null {
  const d = rng.pick(denominators);
  const n = rng.int(1, d - 1);
  return gcd(BigInt(n), BigInt(d)) === 1n ? rat(n, d) : null;
}

/** Which pool a value came from (§6.3 table): one per level, three at L1. */
export type FdpPool = 'benchmark' | 'basic' | 'mixed' | 'tiny' | 'repeating' | 'repeatingMixed';

/** Whole part 1…mixedWholeMax plus a proper fraction over `dens`. */
function mixedNumber(rng: Rng, dens: readonly number[]): Rational | null {
  const part = properFraction(rng, dens);
  return part && add(rat(rng.int(1, config.fdp.mixedWholeMax)), part);
}

/** A value from the pool of `level` (§6.3 table). No level mixes in easier ones. */
export function fdpValue(rng: Rng, level: number): { x: Rational; pool: FdpPool } | null {
  const d = config.fdp.denominators;
  const of = (x: Rational | null, pool: FdpPool) => x && { x, pool };
  switch (level) {
    case 1: {
      const pick = rng.int(0, 2);
      if (pick === 0) return of(properFraction(rng, d.benchmark), 'benchmark');
      if (pick === 1) return of(properFraction(rng, d.basic), 'basic');
      return of(rat(rng.int(1, config.fdp.tinyMaxThousandths), 1000), 'tiny');
    }
    case 2:
      return of(mixedNumber(rng, d.mixed), 'mixed');
    case 3:
      return of(properFraction(rng, d.repeating), 'repeating');
    default:
      return of(mixedNumber(rng, d.repeating), 'repeatingMixed');
  }
}

const TARGET_ID: Record<FdpForm, string> = { F: 'fraction', D: 'decimal', P: 'percent' };

function build(rng: Rng, level: number, seed: number): McQuestion | null {
  const v = fdpValue(rng, level);
  if (!v) return null;
  const { x, pool } = v;
  const [source, target] = rng.pick(DIRECTIONS);
  const notation: Notation = level >= config.fdp.barFromLevel ? 'both' : 'ellipsis';
  const big = cmp(x, ONE) > 0;
  // R-FDP-2: a value > 1 asks for one fraction form, and the options use only that form.
  const form: FractionForm = big && target === 'F' ? (rng.bool() ? 'mixed' : 'improper') : 'improper';
  const spec: FdpSpec = {
    x,
    source,
    target,
    notation,
    form,
    allowRepeating: level >= config.fdp.barFromLevel,
  };
  const hero = showAs(x, source, notation, big ? 'mixed' : 'improper');
  const answer = { value: x, shown: showAs(x, target, notation, form), code: CORRECT };
  const { options, modelCount } = buildOptions(rng, answer, fdpModels(spec), fdpFillers(spec));
  const targetId = target === 'F' && big ? form : TARGET_ID[target];
  return {
    topic: 'FDP',
    generatorId: FDP_GENERATOR_ID,
    seed,
    level,
    kind: `${source}2${target}`,
    prompt: content('fdp.prompt', { target: targetId }),
    hero,
    answer: x,
    options,
    modelCount,
    params: {
      source,
      target,
      form,
      notation,
      pool,
      x: `${x.n}/${x.d}`,
      answer: answer.shown.text,
    },
  };
}

/** The same (level, seed) always gives the same question (R-ARCH-3). */
export function generateFdp(level: number, seed: number): McQuestion {
  if (level < 1 || level > config.levels.FDP) throw new RangeError(`FDP level ${level}`);
  return withRetries(mulberry32(seed), (r) => build(r, level, seed));
}
