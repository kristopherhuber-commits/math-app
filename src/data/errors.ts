// The in-app error list (R-NF-5): the learner never sees a stack; unexpected errors are stored here
// for the parent area. Logging never throws, so a failing database can't cause a second error.
import { config } from '../engine/config';
import { db, type ErrorEntry } from './db';

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error)
    return { message: error.message || error.name, ...(error.stack ? { stack: error.stack } : {}) };
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error) ?? String(error) };
  } catch {
    return { message: String(error) };
  }
}

/** Log an unexpected error for the parent (and the console), keeping the newest `errorLogMax`. */
export async function logError(where: string, error: unknown): Promise<void> {
  console.error(where, error);
  try {
    const entry: ErrorEntry = { at: new Date().toISOString(), where, ...describe(error) };
    await db.transaction('rw', db.errors, async () => {
      await db.errors.add(entry);
      const extra = (await db.errors.count()) - config.parent.errorLogMax;
      if (extra > 0) await db.errors.orderBy('at').limit(extra).delete();
    });
  } catch (e) {
    console.error('logError failed', e);
  }
}

/** Newest first. */
export const listErrors = (): Promise<ErrorEntry[]> => db.errors.orderBy('at').reverse().toArray();

export const clearErrors = (): Promise<void> => db.errors.clear();

/** Errors nothing else caught: uncaught exceptions and rejected promises. */
export function installGlobalErrorLog(target: Window = window): void {
  target.addEventListener('error', (e) => void logError('window', e.error ?? e.message));
  target.addEventListener('unhandledrejection', (e) => void logError('promise', e.reason));
}
