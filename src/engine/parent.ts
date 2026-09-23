// Parent area rules (requirements §9): the PIN-reset challenge (R-PAR-1). Pure and seeded.
import { mulberry32 } from './rng';

export interface PinChallenge {
  a: number;
  b: number;
  answer: number;
}

/** R-PAR-1: "answer a simple arithmetic challenge (e.g. 47 × 13)": a 2-digit × a teen. */
export function pinChallenge(seed: number): PinChallenge {
  const rng = mulberry32(seed);
  const a = rng.int(21, 99);
  const b = rng.int(11, 19);
  return { a, b, answer: a * b };
}

/** The typed answer, digits only (spaces allowed), against the exact product. */
export function checkChallenge(c: PinChallenge, typed: string): boolean {
  const t = typed.replace(/\s/g, '');
  return /^\d+$/.test(t) && Number(t) === c.answer;
}
