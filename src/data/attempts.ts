// Attempt persistence (R-SES-5: saved after every step; R-PAR-4 needs every line, including
// rejected ones with their diagnostic codes).
import { db, type Attempt, type TryRecord } from './db';

export const PROFILE_ID = 'default';

export function newAttempt(
  fields: Pick<Attempt, 'topic' | 'level' | 'generatorId' | 'seed' | 'params'>,
): Attempt {
  return {
    id: crypto.randomUUID(),
    profileId: PROFILE_ID,
    startedAt: new Date().toISOString(),
    tries: [],
    maxHint: 0,
    clean: false,
    ...fields,
  };
}

export function withTry(a: Attempt, t: Omit<TryRecord, 'at'>): Attempt {
  return { ...a, tries: [...a.tries, { at: new Date().toISOString(), ...t }] };
}

export async function saveAttempt(a: Attempt): Promise<void> {
  try {
    await db.attempts.put(a);
  } catch (e) {
    // R-NF-5: never surface storage errors to the learner.
    console.error('saveAttempt failed', e);
  }
}
