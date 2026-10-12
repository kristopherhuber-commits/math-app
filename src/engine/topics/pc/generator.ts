// PC generators, levels 1–4 (requirements §6.4, R-PC-1): prices are integer cents, and every price
// shown (the answer, the intermediate price at levels 2 and 4, the original at levels 3 and 4) is
// exact to the cent. Exactness is checked with Rational arithmetic; nothing is ever rounded.
import { config } from '../../config';
import { div, eq, gcd, isInteger, mul, ONE, rat, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { showMoney } from '../../numbers/display';
import { content } from '../content';
import { buildOptions, CORRECT, withRetries, type McQuestion } from '../mc';
import { pcFillers, pcModels } from './distractors';

/** v2: the four levels (2026-10-11). */
export const PC_GENERATOR_ID = 'pc.v2';

/** Level 1 single, 2 successive, 3 reverse, 4 reverseSuccessive (the original after two changes). */
export type PcKind = 'single' | 'successive' | 'reverse' | 'reverseSuccessive';
export interface PcStep {
  pct: number;
  up: boolean;
}

/** Kinds where `price` is the price after the change(s) and the answer is the original. */
export const isReverse = (kind: PcKind): boolean => kind === 'reverse' || kind === 'reverseSuccessive';

/**
 * single / successive: `price` is the start price; reverse / reverseSuccessive: `price` is the price
 * after the change(s), which were applied to the original in order.
 */
export interface PcSpec {
  kind: PcKind;
  price: bigint;
  steps: PcStep[];
}

/** The multiplier for one step: up 10% → 110/100, down 25% → 75/100 (R-PC-2). */
export const multiplier = (s: PcStep): Rational => rat(100 + (s.up ? s.pct : -s.pct), 100);

/** Cents after applying a step, or null if not exact to the cent (R-PC-1). */
export function applyStep(cents: bigint, s: PcStep): bigint | null {
  const r = mul(rat(cents), multiplier(s));
  return isInteger(r) ? r.n : null;
}

/**
 * All prices of a question in cents, original first: [start, after step 1, (after step 2)], or null
 * if any is inexact. For a reverse kind the original is found by dividing by every multiplier.
 */
export function pricesOf(spec: PcSpec): bigint[] | null {
  let start = spec.price;
  if (isReverse(spec.kind)) {
    const r = div(rat(spec.price), spec.steps.map(multiplier).reduce(mul));
    if (!isInteger(r)) return null;
    start = r.n;
  }
  const out = [start];
  for (const s of spec.steps) {
    const next = applyStep(out.at(-1)!, s);
    if (next === null) return null;
    out.push(next);
  }
  return out;
}

/** The answer in cents: the final price, or the original price for a reverse question. */
export const answerCents = (spec: PcSpec, prices: bigint[]): bigint =>
  isReverse(spec.kind) ? prices[0]! : prices.at(-1)!;

const dollars = (rng: Rng) => BigInt(rng.int(config.pc.minPriceDollars, config.pc.maxPriceDollars)) * 100n;

const KIND_BY_LEVEL: Record<number, PcKind> = {
  1: 'single',
  2: 'successive',
  3: 'reverse',
  4: 'reverseSuccessive',
};

const randomStep = (rng: Rng): PcStep => ({ pct: rng.pick(config.pc.stepPercents), up: rng.bool() });

/** `variant` (level 1 only): 'nice' = nice percents of whole dollars; 'any' = any percent, cents. */
function specFor(rng: Rng, level: number, variant: 'nice' | 'any'): PcSpec | null {
  const kind = KIND_BY_LEVEL[level]!;
  switch (kind) {
    case 'single': {
      if (variant === 'nice')
        return {
          kind,
          price: dollars(rng),
          steps: [{ pct: rng.pick(config.pc.nicePercents), up: rng.bool() }],
        };
      // Any percent: prices with cents, chosen as multiples of 100 / gcd(100, 100 ± p) so the new
      // price is exact to the cent by construction (R-PC-1).
      const step = { pct: rng.int(config.pc.anyPercent.min, config.pc.anyPercent.max), up: rng.bool() };
      const unit = 100 / Number(gcd(100n, BigInt(100 + (step.up ? step.pct : -step.pct))));
      const k = rng.int(
        Math.ceil((config.pc.minPriceDollars * 100) / unit),
        Math.floor((config.pc.maxPriceDollars * 100) / unit),
      );
      return { kind, price: BigInt(k * unit), steps: [step] };
    }
    case 'successive':
      return { kind, price: dollars(rng), steps: [randomStep(rng), randomStep(rng)] };
    case 'reverse': {
      // Pick the original, then show the price after the change; the learner recovers the original.
      const step = randomStep(rng);
      const after = applyStep(dollars(rng), step);
      return after === null ? null : { kind, price: after, steps: [step] };
    }
    case 'reverseSuccessive': {
      // Pick the original (whole dollars) and apply both changes; the middle and final prices must be
      // exact to the cent (R-PC-1). Changes that multiply to exactly 1 are skipped: the answer would
      // be the price shown.
      const steps = [randomStep(rng), randomStep(rng)];
      if (eq(mul(multiplier(steps[0]!), multiplier(steps[1]!)), ONE)) return null;
      const mid = applyStep(dollars(rng), steps[0]!);
      const after = mid === null ? null : applyStep(mid, steps[1]!);
      return after === null ? null : { kind, price: after, steps };
    }
  }
}

const pctText = (s: PcStep) => `${s.pct}`;

/** Build the question for a spec (used by the generator and by the worked-example tests). */
export function pcQuestion(
  spec: PcSpec,
  level: number,
  seed: number,
  rng: Rng = mulberry32(seed),
  currency: string = config.settings.currency,
): McQuestion | null {
  if (spec.price <= 0n) return null;
  const prices = pricesOf(spec);
  if (!prices) return null;
  const cents = answerCents(spec, prices);
  const value = rat(cents, 100);
  const money = (c: bigint) => showMoney(c, currency).text;
  const answer = { value, shown: showMoney(cents, currency), code: CORRECT };
  const { options, modelCount } = buildOptions(
    rng,
    answer,
    pcModels(spec, prices, currency),
    pcFillers(cents, currency),
  );
  const [s1, s2] = spec.steps;
  const params: Record<string, string> = {
    kind: spec.kind,
    currency,
    price: money(spec.price),
    priceCents: `${spec.price}`,
    pct: pctText(s1!),
    dir: s1!.up ? 'up' : 'down',
    answer: answer.shown.text,
  };
  if (s2) Object.assign(params, { pct2: pctText(s2), dir2: s2.up ? 'up' : 'down' });
  return {
    topic: 'PC',
    generatorId: PC_GENERATOR_ID,
    seed,
    level,
    kind: spec.kind,
    prompt: content(`pc.prompt.${spec.kind}`, params),
    heroLine: content(`pc.hero.${spec.kind}`, params),
    answer: value,
    options,
    modelCount,
    params,
  };
}

/** The same (level, seed) always gives the same question (R-ARCH-3). */
export function generatePc(
  level: number,
  seed: number,
  currency: string = config.settings.currency,
): McQuestion {
  if (!KIND_BY_LEVEL[level] || level > config.levels.PC) throw new RangeError(`PC level ${level}`);
  return withRetries(mulberry32(seed), (rng) => {
    // Level 1 (Basic) is half nice percents of whole dollars, half any percent with cents.
    const variant = rng.bool() ? 'nice' : 'any';
    const spec = specFor(rng, level, variant);
    const q = spec && pcQuestion(spec, level, seed, rng, currency);
    return q && (level === 1 ? { ...q, params: { ...q.params, variant } } : q);
  });
}
