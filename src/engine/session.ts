// Assignments (requirements §4, R-SES-1…5, R-PAR-2): the builder's draft and its edit rules, question
// order, and which question comes next. Pure and deterministic, so a reload resumes at the same question (R-SES-5).
import { config, TOPICS, type TopicId } from './config';
import { mulberry32 } from './rng';

export interface AssignmentItem {
  topic: TopicId;
  count: number;
  levelLock?: number;
}

export type Order = 'grouped' | 'mixed';

/** What the parent's builder produces (R-SES-1, R-SES-4, R-PAR-2). */
export interface AssignmentDraft {
  items: AssignmentItem[];
  title?: string;
  order: Order;
  /** 'YYYY-MM-DD' */
  dueDate?: string;
  seed?: number;
}

export const MAX_ITEM_COUNT = 100;
export const MAX_TITLE = 60;

const validItem = (it: AssignmentItem): boolean =>
  TOPICS.includes(it.topic) &&
  Number.isInteger(it.count) &&
  it.count >= 1 &&
  it.count <= MAX_ITEM_COUNT &&
  (it.levelLock === undefined ||
    (Number.isInteger(it.levelLock) && it.levelLock >= 1 && it.levelLock <= config.levels[it.topic]));

/**
 * A builder draft, cleaned (title trimmed and shortened, empty title dropped), or null when anything
 * is invalid: no items, an unknown topic, a count outside 1…100, a level lock outside the topic's
 * levels, an unknown order, or a due date that isn't a real 'YYYY-MM-DD' day.
 */
export function cleanDraft(d: AssignmentDraft): AssignmentDraft | null {
  if (d.items.length === 0 || !d.items.every(validItem)) return null;
  if (d.order !== 'grouped' && d.order !== 'mixed') return null;
  const out: AssignmentDraft = {
    items: d.items.map((it) => ({
      topic: it.topic,
      count: it.count,
      ...(it.levelLock !== undefined ? { levelLock: it.levelLock } : {}),
    })),
    order: d.order,
  };
  const title = d.title?.trim().replace(/\s+/g, ' ').slice(0, MAX_TITLE).trim();
  if (title) out.title = title;
  if (d.dueDate) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.dueDate);
    if (!m) return null;
    const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const t = new Date(Date.UTC(y, mo - 1, day));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== day) return null;
    out.dueDate = d.dueDate;
  }
  if (d.seed !== undefined) out.seed = d.seed >>> 0;
  return out;
}

/**
 * R-PAR-2, editing an assignment that has started (some item has finished questions; attempts
 * point at their item by index): the existing items stay, in place, with the same topic; a started
 * item keeps its level lock and can't go below what's done; new items are appended. Before any
 * question is done, anything goes.
 */
export function editAllowed(
  before: readonly AssignmentItem[],
  done: readonly number[],
  after: readonly AssignmentItem[],
): boolean {
  if (done.every((d) => d === 0)) return true;
  if (after.length < before.length) return false;
  return before.every((b, i) => {
    const a = after[i]!;
    const d = done[i] ?? 0;
    return a.topic === b.topic && a.count >= Math.max(1, d) && (d === 0 || a.levelLock === b.levelLock);
  });
}

/** The seed of the assignment's question number `index` (0-based). */
export function questionSeed(assignmentSeed: number, index: number): number {
  return (
    Math.floor(mulberry32((assignmentSeed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0).next() * 2 ** 32) >>> 0
  );
}

/** Finished questions per item, from the item index of each finished attempt. */
export function itemProgress(
  items: readonly AssignmentItem[],
  finishedItemIndexes: readonly number[],
): number[] {
  const done = items.map(() => 0);
  for (const i of finishedItemIndexes) if (i >= 0 && i < done.length) done[i]!++;
  return done.map((n, i) => Math.min(n, items[i]!.count));
}

export interface SlotInput {
  items: readonly AssignmentItem[];
  order: Order;
  seed: number;
  /** Finished questions per item (`itemProgress`). */
  done: readonly number[];
  /** The assignment's last finished attempt. */
  last?: { itemIndex: number; level: number; walkthrough: boolean };
}

export interface Slot {
  itemIndex: number;
  /** 0-based question number within the assignment. */
  index: number;
  seed: number;
  /** R-HELP-6: after a walkthrough the level stays; otherwise the item's lock or the adaptive level. */
  level?: number;
}

/**
 * The next question, or null when the assignment is done.
 * - After a walkthrough the next question is the same topic and level (R-HELP-6), while that
 *   item still has questions left.
 * - Grouped: items in order. Mixed: a seeded pick weighted by each item's remaining count, so
 *   every item gets exactly its count and the order is the same after a reload (R-SES-4).
 */
export function nextSlot(s: SlotInput): Slot | null {
  const remaining = s.items.map((it, i) => it.count - (s.done[i] ?? 0));
  const total = remaining.reduce((a, b) => a + Math.max(0, b), 0);
  if (total === 0) return null;
  const index = s.done.reduce((a, b) => a + b, 0);
  const seed = questionSeed(s.seed, index);

  if (s.last?.walkthrough && (remaining[s.last.itemIndex] ?? 0) > 0)
    return { itemIndex: s.last.itemIndex, index, seed, level: s.last.level };

  if (s.order === 'grouped') return { itemIndex: remaining.findIndex((r) => r > 0), index, seed };

  let pick = Math.floor(mulberry32(seed ^ 0x5bd1e995).next() * total);
  for (let i = 0; i < remaining.length; i++) {
    const r = Math.max(0, remaining[i]!);
    if (pick < r) return { itemIndex: i, index, seed };
    pick -= r;
  }
  throw new Error('unreachable: remaining counts changed');
}
