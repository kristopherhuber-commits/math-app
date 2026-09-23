// Attempt persistence (R-SES-5: saved after every step; R-PAR-4 needs every line, including
// rejected ones with their diagnostic codes).
import { config } from '../engine/config';
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
    console.error('storedCorrectSigns failed', e);
    return 0;
  }
}

/** The parent's "full balance animation" setting (R-PAR-5; its UI arrives in M5). */
export async function fullBalanceAnimSetting(): Promise<boolean> {
  try {
    const s = await db.settings.get(PROFILE_ID);
    return s?.fullBalanceAnim ?? config.eq.fullBalanceAnimDefault;
  } catch {
    return config.eq.fullBalanceAnimDefault;
  }
}
