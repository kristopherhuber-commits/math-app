// Attempt persistence (R-SES-5: saved after every step; R-PAR-4 needs every line, including
// rejected ones with their diagnostic codes).
import { config } from '../engine/config';
import { db, PROFILE_ID, type Attempt, type TryRecord } from './db';
import { logError } from './errors';
import { loadSettings } from './settings';

export { PROFILE_ID };

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
    void logError('saveAttempt', e);
  }
}

/**
 * R-EQ-PED-2: correct sign choices in the tile builder so far, derived from the stored attempts
 * (accepted SIGN tries), so there is no second counter to keep in sync.
 */
export async function storedCorrectSigns(): Promise<number> {
  try {
    const attempts = await db.attempts.where('topic').equals('EQ').toArray();
    return attempts.reduce(
      (n, a) => n + a.tries.filter((t) => t.stepType === 'SIGN' && t.verdict === 'stepAccepted').length,
      0,
    );
  } catch (e) {
    void logError('storedCorrectSigns', e);
    return 0;
  }
}

/** The parent's "full balance animation" setting (R-PAR-5, R-EQ-PED-2). */
export async function fullBalanceAnimSetting(): Promise<boolean> {
  try {
    return (await loadSettings()).fullBalanceAnim;
  } catch {
    return config.eq.fullBalanceAnimDefault;
  }
}
