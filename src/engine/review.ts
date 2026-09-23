// Regenerate a stored attempt's question from its generator id, level and seed (R-ARCH-3, R-PAR-4).
import type { TopicId } from './config';
import { EQ_GENERATOR_ID, generateEq, type EqQuestion } from './topics/eq/generator';
import { FDP_GENERATOR_ID, generateFdp } from './topics/fdp/generator';
import { generateNc, NC_GENERATOR_ID, type NcQuestion } from './topics/nc/generator';
import { generatePc, PC_GENERATOR_ID } from './topics/pc/generator';
import { generateRd, RD_GENERATOR_ID } from './topics/rd/generator';
import type { McQuestion } from './topics/mc';

export type Regenerated =
  | { topic: 'EQ'; question: EqQuestion }
  | { topic: 'NC'; question: NcQuestion }
  | { topic: 'RD' | 'FDP' | 'PC'; question: McQuestion };

/**
 * The question as the learner saw it, or null when the generator id is unknown (e.g. a future or
 * retired generator version) or the level is out of range.
 */
export function regenerate(
  a: { topic: TopicId; generatorId: string; level: number; seed: number },
  currency: string,
): Regenerated | null {
  try {
    switch (a.generatorId) {
      case EQ_GENERATOR_ID:
        return { topic: 'EQ', question: generateEq(a.level, a.seed) };
      case NC_GENERATOR_ID:
        return { topic: 'NC', question: generateNc(a.level, a.seed) };
      case RD_GENERATOR_ID:
        return { topic: 'RD', question: generateRd(a.level, a.seed) };
      case FDP_GENERATOR_ID:
        return { topic: 'FDP', question: generateFdp(a.level, a.seed) };
      case PC_GENERATOR_ID:
        return { topic: 'PC', question: generatePc(a.level, a.seed, currency) };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
