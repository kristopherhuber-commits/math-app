// Export, import and reset (R-PAR-6, R-DATA-1). An export holds every table and the schema version;
// importing checks the version, migrates an older file forward (v1 → v2 → current) and replaces
// everything in one transaction, so a bad file changes nothing. Reset clears progress and assignments
// but keeps the PIN, names, settings and the error list (parent decision, M5).
import {
  db,
  SCHEMA_VERSION,
  upgradeAssignmentToV2,
  type Assignment,
  type Attempt,
  type ErrorEntry,
  type Profile,
  type Rewards,
  type Settings,
  type TopicState,
} from './db';

export const EXPORT_APP = 'turtle-penguin-math';

export interface ExportFile {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: string;
  profiles: Profile[];
  settings: Settings[];
  topicStates: TopicState[];
  assignments: Assignment[];
  attempts: Attempt[];
  rewards: Rewards[];
  errors: ErrorEntry[];
}

const TABLES = [
  'profiles',
  'settings',
  'topicStates',
  'assignments',
  'attempts',
  'rewards',
  'errors',
] as const;

export async function exportData(now: Date = new Date()): Promise<ExportFile> {
  return db.transaction(
    'r',
    TABLES.map((t) => db.table(t)),
    async () => ({
      app: EXPORT_APP,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      profiles: await db.profiles.toArray(),
      settings: await db.settings.toArray(),
      topicStates: await db.topicStates.toArray(),
      assignments: await db.assignments.toArray(),
      attempts: await db.attempts.toArray(),
      rewards: await db.rewards.toArray(),
      errors: await db.errors.toArray(),
    }),
  );
}

export const exportFileName = (day: string) => `${EXPORT_APP}-${day}.json`;

export type ParsedImport =
  | { ok: true; data: ExportFile; fromVersion: number }
  | { ok: false; reason: 'unreadable' }
  | { ok: false; reason: 'newer'; version: number };

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const rowsWith = (x: unknown, keys: string[]): boolean =>
  Array.isArray(x) && x.every((r) => isObj(r) && keys.every((k) => k in r));

/** Read an export file: check its shape and version, then migrate it to the current schema. */
export function parseImport(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (!isObj(raw) || raw.app !== EXPORT_APP) return { ok: false, reason: 'unreadable' };
  const v = raw.schemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, reason: 'unreadable' };
  if (v > SCHEMA_VERSION) return { ok: false, reason: 'newer', version: v };
  const t = (k: string) => raw[k] ?? [];
  const shapes: [string, string[]][] = [
    ['profiles', ['id']],
    ['settings', ['profileId']],
    ['topicStates', ['profileId', 'topic', 'level']],
    ['assignments', ['id', 'items', 'status', 'position']],
    ['attempts', ['id', 'topic', 'level', 'seed', 'tries']],
    ['rewards', ['profileId']],
    ['errors', ['at', 'message']],
  ];
  if (!shapes.every(([k, keys]) => rowsWith(t(k), keys))) return { ok: false, reason: 'unreadable' };

  let assignments = t('assignments') as Assignment[];
  // v1 → v2 (R-DATA-1): activation time and a seed for every assignment.
  if (v < 2) assignments = assignments.map((a) => upgradeAssignmentToV2(a));
  // v2 → v3: the error list is new; nothing else changes.
  return {
    ok: true,
    fromVersion: v,
    data: {
      app: EXPORT_APP,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      profiles: t('profiles') as Profile[],
      settings: t('settings') as Settings[],
      topicStates: t('topicStates') as TopicState[],
      assignments,
      attempts: t('attempts') as Attempt[],
      rewards: t('rewards') as Rewards[],
      errors: (v < 3 ? [] : t('errors')) as ErrorEntry[],
    },
  };
}

/**
 * Replace everything on this device with the file's data, in one transaction. The file's settings
 * (and so its PIN) come too; a file without settings keeps this device's, so the app stays set up.
 */
export async function importData(data: ExportFile): Promise<void> {
  await db.transaction(
    'rw',
    TABLES.map((t) => db.table(t)),
    async () => {
      for (const name of TABLES) {
        if (name === 'settings' && data.settings.length === 0) continue;
        const table = db.table(name);
        await table.clear();
        await table.bulkPut(data[name]);
      }
    },
  );
}

/** R-PAR-6 reset: answers, levels, rewards and assignments go; PIN, names, settings, errors stay. */
export async function resetProgress(): Promise<void> {
  await db.transaction('rw', [db.attempts, db.topicStates, db.rewards, db.assignments], async () => {
    await Promise.all([
      db.attempts.clear(),
      db.topicStates.clear(),
      db.rewards.clear(),
      db.assignments.clear(),
    ]);
  });
}
