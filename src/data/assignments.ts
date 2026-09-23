// The parent's assignment queue (R-PAR-2, R-SES-1/2): create, edit, delete, reorder, make active and
// mark complete early. Exactly one assignment is active while any exist that aren't done. The rules
// for editing a started assignment are in the engine (`editAllowed`).
import { cleanDraft, editAllowed, itemProgress, type AssignmentDraft } from '../engine/session';
import { newSeed } from '../engine/rng';
import { db, PROFILE_ID, type Assignment } from './db';
import { assignmentProgress, type Progress } from './progress';

export class AssignmentError extends Error {}

const byPosition = (a: Assignment, b: Assignment) => a.position - b.position;

async function doneFor(a: Assignment): Promise<number[]> {
  const finished = (await db.attempts.where('assignmentId').equals(a.id).toArray()).filter(
    (x) => x.finishedAt !== undefined,
  );
  return itemProgress(
    a.items,
    finished.map((f) => f.itemIndex ?? -1),
  );
}

/** The active one goes back to the front of the queue, progress kept (parent decision, M5). */
function requeued(a: Assignment, queue: Assignment[]): Assignment {
  const front = queue.length ? Math.min(...queue.map((q) => q.position)) : 0;
  // A queued assignment is not active, so it has no activation time (R-RWD-2 intervals).
  const out: Assignment = { ...a, status: 'queued', position: front - 1 };
  delete out.activatedAt;
  return out;
}

/** The next queued assignment becomes active, if there is one. Call inside a transaction. */
async function activateNext(now: string): Promise<void> {
  const next = (await db.assignments.where('status').equals('queued').toArray()).sort(byPosition)[0];
  if (next) await db.assignments.put({ ...next, status: 'active', activatedAt: now });
}

/**
 * Save a new assignment. "Save & make active" (`activate`) puts it in front and sends the active one
 * back to the front of the queue; "Add to queue" appends it, or makes it active when none is.
 */
export async function createAssignment(draft: AssignmentDraft, activate: boolean): Promise<Assignment> {
  const d = cleanDraft(draft);
  if (!d) throw new AssignmentError('invalid draft');
  return db.transaction('rw', db.assignments, async () => {
    const all = await db.assignments.toArray();
    const active = all.find((a) => a.status === 'active');
    const queue = all.filter((a) => a.status === 'queued');
    const now = new Date().toISOString();
    const makeActive = activate || !active;
    if (makeActive && active) await db.assignments.put(requeued(active, queue));
    const a: Assignment = {
      id: crypto.randomUUID(),
      profileId: PROFILE_ID,
      items: d.items,
      status: makeActive ? 'active' : 'queued',
      createdAt: now,
      position: all.reduce((m, x) => Math.max(m, x.position + 1), 0),
      seed: d.seed ?? newSeed(),
      order: d.order,
      ...(d.title ? { title: d.title } : {}),
      ...(d.dueDate ? { dueDate: d.dueDate } : {}),
      ...(makeActive ? { activatedAt: now } : {}),
    };
    await db.assignments.add(a);
    return a;
  });
}

/** Edit title, items, due date, and (before it has started) the order (R-PAR-2). */
export async function updateAssignment(id: string, draft: AssignmentDraft): Promise<Assignment> {
  const d = cleanDraft(draft);
  if (!d) throw new AssignmentError('invalid draft');
  return db.transaction('rw', db.assignments, db.attempts, async () => {
    const a = await db.assignments.get(id);
    if (!a || a.status === 'done') throw new AssignmentError('not editable');
    const done = await doneFor(a);
    if (!editAllowed(a.items, done, d.items)) throw new AssignmentError('edit not allowed once started');
    const started = done.some((n) => n > 0);
    const next: Assignment = { ...a };
    delete next.title;
    delete next.dueDate;
    Object.assign(next, {
      items: d.items,
      order: started ? (a.order ?? 'grouped') : d.order,
      ...(d.title ? { title: d.title } : {}),
      ...(d.dueDate ? { dueDate: d.dueDate } : {}),
    });
    await db.assignments.put(next);
    return next;
  });
}

/** Delete; its attempts stay for the dashboard and missed review. The next queued one takes over. */
export async function deleteAssignment(id: string): Promise<void> {
  await db.transaction('rw', db.assignments, async () => {
    const a = await db.assignments.get(id);
    if (!a) return;
    await db.assignments.delete(id);
    if (a.status === 'active') await activateNext(new Date().toISOString());
  });
}

/** R-SES-2: the queued assignments in the parent's order (ids of queued ones; others are ignored). */
export async function reorderQueue(ids: readonly string[]): Promise<void> {
  await db.transaction('rw', db.assignments, async () => {
    const queue = (await db.assignments.where('status').equals('queued').toArray()).sort(byPosition);
    const order = [
      ...ids.map((id) => queue.find((q) => q.id === id)).filter((q): q is Assignment => q !== undefined),
      ...queue.filter((q) => !ids.includes(q.id)),
    ];
    const base = queue.length ? Math.min(...queue.map((q) => q.position)) : 0;
    await db.assignments.bulkPut(order.map((q, i) => ({ ...q, position: base + i })));
  });
}

/** A queued assignment becomes active; the active one goes back to the front of the queue. */
export async function makeActive(id: string): Promise<void> {
  await db.transaction('rw', db.assignments, async () => {
    const a = await db.assignments.get(id);
    if (!a || a.status !== 'queued') return;
    const all = await db.assignments.toArray();
    const active = all.find((x) => x.status === 'active');
    const queue = all.filter((x) => x.status === 'queued' && x.id !== id);
    if (active) await db.assignments.put(requeued(active, queue));
    await db.assignments.put({ ...a, status: 'active', activatedAt: new Date().toISOString() });
  });
}

/** R-PAR-2 "mark it complete early": done now; the next queued one becomes active. No summary. */
export async function completeEarly(id: string): Promise<void> {
  await db.transaction('rw', db.assignments, async () => {
    const a = await db.assignments.get(id);
    if (!a || a.status === 'done') return;
    const now = new Date().toISOString();
    await db.assignments.put({ ...a, status: 'done', completedAt: now });
    if (a.status === 'active') await activateNext(now);
  });
}

export interface QueueEntry {
  assignment: Assignment;
  progress: Progress;
}

export interface Queue {
  active?: QueueEntry;
  queued: QueueEntry[];
  /** The most recently finished, newest first. */
  done: QueueEntry[];
}

export async function loadQueue(recentDone = 5): Promise<Queue> {
  const all = await db.assignments.toArray();
  const entry = async (a: Assignment): Promise<QueueEntry> => ({
    assignment: a,
    progress: await assignmentProgress(a),
  });
  const active = all.find((a) => a.status === 'active');
  const queued = all.filter((a) => a.status === 'queued').sort(byPosition);
  const done = all
    .filter((a) => a.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, recentDone);
  return {
    ...(active ? { active: await entry(active) } : {}),
    queued: await Promise.all(queued.map(entry)),
    done: await Promise.all(done.map(entry)),
  };
}
