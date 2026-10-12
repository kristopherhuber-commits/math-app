// The Fractions, decimals and percents topic (parent decision 2026-10-11): Repeating decimals is
// part of it. At every level a question is a repeating-decimal question (§6.2) or a conversion
// (§6.3), half each. The seed decides which, and each question keeps its own generator id, so a
// stored attempt regenerates from its generator id, level and seed (R-ARCH-3).
import { config } from '../../config';
import { mulberry32 } from '../../rng';
import type { McQuestion } from '../mc';
import { generateRd } from '../rd/generator';
import { generateFdp } from './generator';

/** A seed for the RD-or-FDP pick that doesn't follow the generators' own first draw. */
const pickSeed = (seed: number) => (seed ^ 0x9e3779b9) >>> 0;

/** The same (level, seed) always gives the same question (R-ARCH-3). */
export function generateFdpTopic(level: number, seed: number): McQuestion {
  if (level < 1 || level > config.levels.FDP) throw new RangeError(`FDP level ${level}`);
  return mulberry32(pickSeed(seed)).bool() ? generateRd(level, seed) : generateFdp(level, seed);
}
