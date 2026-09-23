// Assignments (requirements §4, R-SES-1…5): the parent's link, question order, and which question
// comes next. Pure and deterministic, so a reload resumes at the same question (R-SES-5).
import { config, TOPICS, type TopicId } from './config';
import { mulberry32 } from './rng';

export interface AssignmentItem {
  topic: TopicId;
  count: number;
  levelLock?: number;
}

export type Order = 'grouped' | 'mixed';

export interface AssignmentLink {
  items: AssignmentItem[];
  title?: string;
  order?: Order;
  dueDate?: string;
  seed?: number;
}

export const MAX_ITEM_COUNT = 100;
const MAX_TITLE = 60;

/**
 * Until the parent area's builder (M5), an assignment arrives as a link:
 * `?assign=EQ:10,PC:5@2&order=mixed&title=Monday&due=2026-09-30&seed=7` (`@n` locks the level).
 * Returns null when `assign` is missing or anything in it is invalid, so a typo never half-works.
 */
export function parseAssignmentLink(q: Readonly<Record<string, string | undefined>>): AssignmentLink | null {
  const spec = q.assign?.trim();
  if (!spec) return null;
  const items: AssignmentItem[] = [];
  for (const part of spec.split(',')) {
    const m = /^([A-Za-z]+):(\d+)(?:@(\d+))?$/.exec(part.trim());
    if (!m) return null;
    const topic = m[1]!.toUpperCase() as TopicId;
    const count = Number(m[2]);
    if (!TOPICS.includes(topic) || count < 1 || count > MAX_ITEM_COUNT) return null;
    const item: AssignmentItem = { topic, count };
    if (m[3] !== undefined) {
      const lock = Number(m[3]);
      if (lock < 1 || lock > config.levels[topic]) return null;
      item.levelLock = lock;
    }
    items.push(item);
  }

  const link: AssignmentLink = { items };
  const title = q.title?.trim();
  if (title) link.title = title.slice(0, MAX_TITLE);
  if (q.order !== undefined) {
    if (q.order !== 'grouped' && q.order !== 'mixed') return null;
    link.order = q.order;
  }
  if (q.due !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q.due)) return null;
    link.dueDate = q.due;
  }
  if (q.seed !== undefined) {
    if (!/^\d+$/.test(q.seed)) return null;
    link.seed = Number(q.seed) >>> 0;
  }
  return link;
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
