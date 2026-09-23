// Multiple-choice questions (R-ANS-1…4): five options, one correct, the rest built from
// misconception models. A candidate equal in value to the answer is never offered as a wrong option
// (R-ANS-3); fillers are used only when the models give fewer than 4 distinct candidates (R-ANS-2).
import { eq, type Rational } from '../rational';
import type { Rng } from '../rng';
import type { Shown } from '../numbers/display';
import type { HintContent, Params } from './content';

export type McTopic = 'RD' | 'FDP' | 'PC';
export const FILLER = 'FILLER';
export const CORRECT = 'correct';
export const OPTION_COUNT = 5;

export interface McCandidate {
  value: Rational;
  shown: Shown;
  /** Misconception code (`RD-M2`), FILLER, or `correct`. */
  code: string;
}

export interface McOption extends McCandidate {
  /** Stable id within the question: 'A'…'E' in displayed order. */
  id: string;
}

export interface McQuestion {
  topic: McTopic;
  generatorId: string;
  seed: number;
  level: number;
  /** Question type, e.g. 'D2F', 'F2D', 'F2P', 'single', 'successive', 'reverse'. */
  kind: string;
  prompt: HintContent;
  /** The number the question is about (R-NF design: the math is the hero). */
  hero?: Shown;
  /** A line under or instead of the hero, e.g. "$40.00, up 10%" for PC. */
  heroLine?: HintContent;
  answer: Rational;
  options: McOption[];
  /** How many distinct misconception candidates were available before fillers (R-ANS-2). */
  modelCount: number;
  /** Everything the hints, walkthrough and records need, as strings. */
  params: Params;
}

/** Thrown when the models and fillers can't make 4 distinct distractors; generators retry. */
export class NotEnoughOptions extends Error {}

function distinctFrom(c: McCandidate, taken: readonly McCandidate[]): boolean {
  return taken.every((t) => !eq(t.value, c.value) && t.shown.text !== c.shown.text);
}

/**
 * Five options in a seeded order (R-ANS-4). Candidates equal in value or displayed text to the answer
 * or to each other are dropped (R-ANS-3). With more than 4 distinct models, 4 are chosen by the rng.
 */
export function buildOptions(
  rng: Rng,
  answer: McCandidate,
  models: readonly McCandidate[],
  fillers: Iterable<McCandidate>,
): { options: McOption[]; modelCount: number } {
  const taken: McCandidate[] = [answer];
  const distinct: McCandidate[] = [];
  for (const m of models) {
    if (distinctFrom(m, taken)) {
      taken.push(m);
      distinct.push(m);
    }
  }
  const modelCount = distinct.length;
  const need = OPTION_COUNT - 1;
  let chosen = modelCount > need ? rng.shuffle(distinct).slice(0, need) : distinct;
  if (chosen.length < need) {
    chosen = [...chosen];
    const all = [answer, ...chosen];
    for (const f of fillers) {
      if (chosen.length === need) break;
      const filler = { ...f, code: FILLER };
      if (distinctFrom(filler, all)) {
        all.push(filler);
        chosen.push(filler);
      }
    }
    if (chosen.length < need) throw new NotEnoughOptions();
  }
  const options = rng.shuffle([answer, ...chosen]).map((c, i) => ({ ...c, id: String.fromCharCode(65 + i) }));
  return { options, modelCount };
}

export const correctOption = (q: { options: readonly McOption[] }): McOption =>
  q.options.find((o) => o.code === CORRECT)!;

/** The answer is checked by value, never by position or by floating point (R-ARCH-2). */
export function checkChoice(q: McQuestion, optionId: string): { correct: boolean; code: string } {
  const o = q.options.find((x) => x.id === optionId);
  if (!o) throw new RangeError(`no option ${optionId}`);
  return { correct: eq(o.value, q.answer), code: o.code };
}

/** Retry a seeded construction until it succeeds; the same seed always gives the same result. */
export function withRetries<T>(rng: Rng, build: (rng: Rng) => T | null, tries = 200): T {
  for (let i = 0; i < tries; i++) {
    try {
      const r = build(rng);
      if (r) return r;
    } catch (e) {
      if (!(e instanceof NotEnoughOptions)) throw e;
    }
  }
  throw new Error('generator could not build a question');
}
