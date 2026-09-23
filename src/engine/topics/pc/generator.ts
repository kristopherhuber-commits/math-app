// PC generators, levels 1–5 (requirements §6.4, R-PC-1): prices are integer cents, and every price
// shown (the answer, the intermediate price at level 3, the original at level 4) is exact to the cent.
// Exactness is checked with Rational arithmetic; nothing is ever rounded.
import { config } from '../../config';
import { gcd, isInteger, mul, rat, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { showMoney } from '../../numbers/display';
import { content } from '../content';
import { buildOptions, CORRECT, withRetries, type McQuestion } from '../mc';
import { pcFillers, pcModels } from './distractors';

export const PC_GENERATOR_ID = 'pc.v1';

export type PcKind = 'single' | 'successive' | 'reverse';
export interface PcStep {
  pct: number;
  up: boolean;
}
/** single / successive: `price` is the start price; reverse: `price` is the price after the change. */
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

/** All prices of a question in cents: [start, after step 1, (after step 2)], or null if inexact. */
export function pricesOf(spec: PcSpec): bigint[] | null {
  if (spec.kind === 'reverse') {
    const r = mul(
      rat(spec.price),
      rat(100, 100 + (spec.steps[0]!.up ? spec.steps[0]!.pct : -spec.steps[0]!.pct)),
    );
    return isInteger(r) ? [r.n, spec.price] : null;
  }
  const out = [spec.price];
  for (const s of spec.steps) {
    const next = applyStep(out.at(-1)!, s);
    if (next === null) return null;
    out.push(next);
  }
  return out;
}

/** The answer in cents: the final price, or the original price for a reverse question. */
export const answerCents = (spec: PcSpec, prices: bigint[]): bigint =>
  spec.kind === 'reverse' ? prices[0]! : prices.at(-1)!;

const dollars = (rng: Rng) => BigInt(rng.int(config.pc.minPriceDollars, config.pc.maxPriceDollars)) * 100n;

function specFor(rng: Rng, level: number): PcSpec {
  const kind: PcKind = level <= 2 ? 'single' : level === 3 ? 'successive' : 'reverse';
  switch (kind) {
    case 'single': {
      if (level === 1)
        return {
          kind,
          price: dollars(rng),
          steps: [{ pct: rng.pick(config.pc.nicePercents), up: rng.bool() }],
        };
      // Level 2: prices with cents, chosen as multiples of 100 / gcd(100, 100 ± p) so the new price
      // is exact to the cent by construction (R-PC-1).
      const step = { pct: rng.int(config.pc.anyPercent.min, config.pc.anyPercent.max), up: rng.bool() };
      const unit = 100 / Number(gcd(100n, BigInt(100 + (step.up ? step.pct : -step.pct))));
      const k = rng.int(
        Math.ceil((config.pc.minPriceDollars * 100) / unit),
        Math.floor((config.pc.maxPriceDollars * 100) / unit),
      );
      return { kind, price: BigInt(k * unit), steps: [step] };
    }
    case 'successive':
      return {
        kind,
        price: dollars(rng),
        steps: [
          { pct: rng.pick(config.pc.stepPercents), up: rng.bool() },
          { pct: rng.pick(config.pc.stepPercents), up: rng.bool() },
        ],
      };
    case 'reverse': {
      // Pick the original, then show the price after the change; the learner recovers the original.
      const step = { pct: rng.pick(config.pc.stepPercents), up: rng.bool() };
      const after = applyStep(dollars(rng), step);
      return { kind, price: after ?? -1n, steps: [step] };
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
  if (level < 1 || level > config.levels.PC) throw new RangeError(`PC level ${level}`);
  return withRetries(mulberry32(seed), (rng) => {
    const sub = level === 5 ? rng.int(1, 4) : level;
    const q = pcQuestion(specFor(rng, sub), level, seed, rng, currency);
    return q && { ...q, params: { ...q.params, sub: `${sub}` } };
  });
}
