// Assignment builder and queue (R-PAR-2, R-SES-1/2/4, mockup 11). Items: drag handle, level-lock
// popover (Adaptive / Level n), count stepper, remove. Order toggle and optional due date. The queue:
// the active assignment with its progress, then the queued ones in order (drag or ↑/↓ to reorder).
import { useCallback, useEffect, useRef, useState } from 'react';
import { config, TOPICS, type TopicId } from '../../engine/config';
import { MAX_ITEM_COUNT, type AssignmentDraft, type AssignmentItem, type Order } from '../../engine/session';
import type { Assignment } from '../../data/db';
import {
  completeEarly,
  createAssignment,
  deleteAssignment,
  loadQueue,
  makeActive,
  reorderQueue,
  updateAssignment,
  type Queue,
  type QueueEntry,
} from '../../data/assignments';
import { logError } from '../../data/errors';
import { Rich, Tex } from '../components/Math';
import { useSettings } from '../settings';
import { parentStrings, strings, topicStrings } from '../strings';
import { moved, ReorderHandle } from './Reorder';

const s = parentStrings.assign;

interface DraftItem extends AssignmentItem {
  key: number;
  /** Questions already done (editing a started assignment). */
  done: number;
  /** Part of the stored assignment (vs. added in this edit). */
  saved: boolean;
}

interface Editing {
  /** The assignment being edited, or undefined for a new one. */
  id?: string;
  title: string;
  items: DraftItem[];
  order: Order;
  dueDate: string;
  started: boolean;
}

let nextKey = 1;

const blank = (order: Order): Editing => ({ title: '', items: [], order, dueDate: '', started: false });

function fromEntry(e: QueueEntry): Editing {
  const a = e.assignment;
  return {
    id: a.id,
    title: a.title ?? '',
    items: a.items.map((it, i) => ({ ...it, key: nextKey++, done: e.progress.done[i] ?? 0, saved: true })),
    order: a.order ?? 'grouped',
    dueDate: a.dueDate ?? '',
    started: e.progress.doneTotal > 0,
  };
}

function toDraft(e: Editing): AssignmentDraft {
  return {
    items: e.items.map(({ topic, count, levelLock }) => ({
      topic,
      count,
      ...(levelLock !== undefined ? { levelLock } : {}),
    })),
    order: e.order,
    ...(e.title.trim() ? { title: e.title } : {}),
    ...(e.dueDate ? { dueDate: e.dueDate } : {}),
  };
}

const titleOf = (a: Assignment) => a.title ?? s.untitled;

function LevelExample({ topic, level }: { topic: TopicId; level: number }) {
  if (topic === 'EQ') return <Rich text={strings.home.levelExamples[level] ?? ''} />;
  return <Tex text={topicStrings.levelExamples[topic]?.[level - 1] ?? ''} />;
}

function LockPopover({
  item,
  onPick,
  onClose,
}: {
  item: DraftItem;
  onPick: (lock: number | undefined) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus(), []);
  const levels = Array.from({ length: config.levels[item.topic] }, (_, i) => i + 1);
  return (
    <div
      className="lock-popover"
      role="group"
      aria-label={s.lockTitle(topicStrings.name[item.topic])}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="lock-option"
        aria-pressed={item.levelLock === undefined}
        onClick={() => onPick(undefined)}
      >
        {s.lockAdaptive}
      </button>
      {levels.map((n) => (
        <button
          key={n}
          type="button"
          className="lock-option"
          aria-pressed={item.levelLock === n}
          onClick={() => onPick(n)}
        >
          <strong>{s.lockLevel(n)}</strong>
          <span className="lock-example">
            <LevelExample topic={item.topic} level={n} />
          </span>
        </button>
      ))}
    </div>
  );
}

function ItemRow({
  item,
  index,
  count,
  canMove,
  dragTarget,
  onChange,
  onRemove,
  removable,
  onMove,
  onDragState,
}: {
  item: DraftItem;
  index: number;
  count: number;
  canMove: boolean;
  dragTarget: boolean;
  onChange: (it: DraftItem) => void;
  onRemove: () => void;
  removable: boolean;
  onMove: (from: number, to: number) => void;
  onDragState: (s: { from: number; to: number } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = topicStrings.name[item.topic];
  const min = Math.max(1, item.done);
  const lockable = item.done === 0;
  return (
    <li className={`item-row ${dragTarget ? 'drop-target' : ''}`} data-reorder-row>
      <div className="item-main">
        {canMove ? (
          <ReorderHandle
            index={index}
            count={count}
            label={s.handle(name)}
            onMove={onMove}
            onDragState={onDragState}
          />
        ) : (
          <span className="reorder-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="item-name"
          aria-expanded={open}
          disabled={!lockable}
          onClick={() => setOpen((o) => !o)}
        >
          <strong>{name}</strong>
          <span className="label muted">
            {item.levelLock === undefined ? s.adaptive : s.locked(item.levelLock)}
            {item.done > 0 && ` · ${s.started(item.done)}`}
          </span>
        </button>
        <div className="stepper" role="group" aria-label={s.count(name)}>
          <button
            type="button"
            aria-label={s.fewer(name)}
            disabled={item.count <= min}
            onClick={() => onChange({ ...item, count: item.count - 1 })}
          >
            −
          </button>
          <output aria-live="polite">{item.count}</output>
          <button
            type="button"
            aria-label={s.more(name)}
            disabled={item.count >= MAX_ITEM_COUNT}
            onClick={() => onChange({ ...item, count: item.count + 1 })}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={s.remove(name)}
          disabled={!removable}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      {open && (
        <LockPopover
          item={item}
          onClose={() => setOpen(false)}
          onPick={(levelLock) => {
            const next: DraftItem = { ...item };
            if (levelLock === undefined) delete next.levelLock;
            else next.levelLock = levelLock;
            onChange(next);
            setOpen(false);
          }}
        />
      )}
    </li>
  );
}

function Builder({
  editing,
  setEditing,
  onSaved,
}: {
  editing: Editing;
  setEditing: (e: Editing) => void;
  onSaved: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string>();
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const settingsOrder = useSettings().order;
  const e = editing;
  // Once started, the stored items stay in place; items added now can move among themselves.
  const savedCount = e.started ? e.items.filter((it) => it.saved).length : 0;

  const save = (activate: boolean) => {
    if (e.items.length === 0) return setMessage(s.needItem);
    const draft = toDraft(e);
    const op = e.id ? updateAssignment(e.id, draft) : createAssignment(draft, activate);
    void op
      .then(() => {
        setMessage(undefined);
        setEditing(blank(settingsOrder));
        onSaved();
      })
      .catch((err: unknown) => {
        void logError('saveAssignment', err);
      });
  };

  return (
    <section className="parent-card builder" aria-label={e.id ? s.editTitle : s.newTitle}>
      <label className="field">
        <span className="field-label">{s.title}</span>
        <input
          className="text-input"
          value={e.title}
          maxLength={60}
          onChange={(ev) => setEditing({ ...e, title: ev.target.value })}
        />
      </label>

      <p className="field-label">{s.items}</p>
      <ul className="item-list" data-reorder-list>
        {e.items.map((it, i) => (
          <ItemRow
            key={it.key}
            item={it}
            index={i}
            count={e.items.length}
            canMove={!e.started || i >= savedCount}
            dragTarget={drag !== null && drag.to === i && drag.from !== i}
            onChange={(next) =>
              setEditing({ ...e, items: e.items.map((x) => (x.key === it.key ? next : x)) })
            }
            onRemove={() => setEditing({ ...e, items: e.items.filter((x) => x.key !== it.key) })}
            removable={!(e.started && it.saved)}
            onMove={(from, to) => {
              if (e.started && (from < savedCount || to < savedCount)) return;
              setEditing({ ...e, items: moved(e.items, from, to) });
            }}
            onDragState={setDrag}
          />
        ))}
      </ul>
      {adding ? (
        <div className="add-topic" role="group" aria-label={s.addWhich}>
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              className="btn btn-outline btn-small"
              onClick={() => {
                setEditing({
                  ...e,
                  items: [...e.items, { topic: t, count: 5, key: nextKey++, done: 0, saved: false }],
                });
                setAdding(false);
                setMessage(undefined);
              }}
            >
              {topicStrings.name[t]}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="add-item" onClick={() => setAdding(true)}>
          {s.addTopic}
        </button>
      )}

      <div className="builder-row">
        <div>
          <p className="field-label" id="order-label">
            {s.order}
          </p>
          <div className="segmented" role="radiogroup" aria-labelledby="order-label">
            {(['grouped', 'mixed'] as const).map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={e.order === o}
                disabled={e.started}
                onClick={() => setEditing({ ...e, order: o })}
              >
                {s[o]}
              </button>
            ))}
          </div>
          {e.started && <p className="label muted">{s.orderFixed}</p>}
        </div>
        <label className="field">
          <span className="field-label">{s.due}</span>
          <input
            type="date"
            className="text-input"
            value={e.dueDate}
            onChange={(ev) => setEditing({ ...e, dueDate: ev.target.value })}
          />
        </label>
      </div>

      <p className="pin-message" role="alert">
        {message ?? ''}
      </p>
      <div className="builder-actions">
        {e.id ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => save(false)}>
              {s.save}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditing(blank(settingsOrder))}
            >
              {s.cancel}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={() => save(true)}>
              {s.saveActive}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => save(false)}>
              {s.addQueue}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

type Confirm = { kind: 'delete' | 'complete'; id: string } | null;

function QueueCard({
  entry,
  index,
  queued,
  confirm,
  setConfirm,
  drag,
  onDragState,
  onEdit,
  onChanged,
  onMove,
}: {
  entry: QueueEntry;
  index: number;
  queued: number;
  confirm: Confirm;
  setConfirm: (c: Confirm) => void;
  drag: { from: number; to: number } | null;
  onDragState: (s: { from: number; to: number } | null) => void;
  onEdit: () => void;
  onChanged: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const a = entry.assignment;
  const t = titleOf(a);
  const isActive = a.status === 'active';
  const run = (p: Promise<void>) => void p.then(onChanged).catch((e: unknown) => logError('queueAction', e));
  const asking = confirm?.id === a.id ? confirm.kind : null;
  return (
    <li
      className={`queue-card ${isActive ? 'active' : ''} ${drag && !isActive && drag.to === index && drag.from !== index ? 'drop-target' : ''}`}
      {...(isActive ? {} : { 'data-reorder-row': true })}
    >
      <div className="queue-head">
        {!isActive && (
          <ReorderHandle
            index={index}
            count={queued}
            label={s.handle(t)}
            onMove={onMove}
            onDragState={onDragState}
          />
        )}
        <div className="queue-text">
          <strong>{t}</strong>
          <span className={`label ${isActive ? 'accent' : 'muted'}`}>
            {isActive ? s.active(entry.progress.doneTotal, entry.progress.total) : s.queued}
            {a.dueDate && ` · ${s.dueOn(a.dueDate)}`}
          </span>
        </div>
      </div>
      {asking ? (
        <div
          className="confirm"
          role="alertdialog"
          aria-label={asking === 'delete' ? s.delete : s.completeEarly}
        >
          <p>{asking === 'delete' ? s.confirmDelete(t) : s.confirmComplete(t)}</p>
          <div className="queue-actions">
            <button
              type="button"
              className="btn btn-small btn-primary"
              onClick={() => {
                setConfirm(null);
                run(asking === 'delete' ? deleteAssignment(a.id) : completeEarly(a.id));
              }}
            >
              {s.confirmYes}
            </button>
            <button type="button" className="btn btn-small btn-outline" onClick={() => setConfirm(null)}>
              {s.confirmNo}
            </button>
          </div>
        </div>
      ) : (
        <div className="queue-actions">
          <button type="button" className="btn btn-small btn-outline" aria-label={s.edit(t)} onClick={onEdit}>
            {s.editButton}
          </button>
          {!isActive && (
            <button type="button" className="btn btn-small btn-outline" onClick={() => run(makeActive(a.id))}>
              {s.makeActive}
            </button>
          )}
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={() => setConfirm({ kind: 'complete', id: a.id })}
          >
            {s.completeEarly}
          </button>
          <button
            type="button"
            className="btn btn-small btn-outline"
            onClick={() => setConfirm({ kind: 'delete', id: a.id })}
          >
            {s.delete}
          </button>
        </div>
      )}
    </li>
  );
}

export function Assignments() {
  const order = useSettings().order;
  const [queue, setQueue] = useState<Queue | null>(null);
  const [editing, setEditing] = useState<Editing>(() => blank(order));
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const refresh = useCallback(
    () =>
      void loadQueue()
        .then(setQueue)
        .catch((e: unknown) => logError('loadQueue', e)),
    [],
  );
  useEffect(refresh, [refresh]);

  const queued = queue?.queued ?? [];
  const moveQueued = (from: number, to: number) => {
    const ids = moved(
      queued.map((q) => q.assignment.id),
      from,
      to,
    );
    // Show the new order at once; storage follows.
    setQueue((q) => (q ? { ...q, queued: moved(q.queued, from, to) } : q));
    void reorderQueue(ids)
      .then(refresh)
      .catch((e: unknown) => logError('reorderQueue', e));
  };

  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {editing.id ? s.editTitle : s.newTitle}
      </h1>
      <div className="assign-layout">
        <Builder editing={editing} setEditing={setEditing} onSaved={refresh} />
        <section className="parent-card queue" aria-labelledby="queue-title">
          <h2 id="queue-title">{s.queue}</h2>
          {queue && !queue.active && queued.length === 0 && <p className="muted">{s.queueEmpty}</p>}
          <ul className="queue-list">
            {queue?.active && (
              <QueueCard
                entry={queue.active}
                index={-1}
                queued={queued.length}
                confirm={confirm}
                setConfirm={setConfirm}
                drag={drag}
                onDragState={setDrag}
                onEdit={() => setEditing(fromEntry(queue.active!))}
                onChanged={refresh}
                onMove={moveQueued}
              />
            )}
          </ul>
          <ul className="queue-list" data-reorder-list>
            {queued.map((e, i) => (
              <QueueCard
                key={e.assignment.id}
                entry={e}
                index={i}
                queued={queued.length}
                confirm={confirm}
                setConfirm={setConfirm}
                drag={drag}
                onDragState={setDrag}
                onEdit={() => setEditing(fromEntry(e))}
                onChanged={refresh}
                onMove={moveQueued}
              />
            ))}
          </ul>
          <p className="label muted">{s.lockNote}</p>
          {queue && queue.done.length > 0 && (
            <>
              <h2>{s.history}</h2>
              <ul className="done-list">
                {queue.done.map((e) => (
                  <li key={e.assignment.id}>
                    <strong>{titleOf(e.assignment)}</strong>
                    <span className="label muted">
                      {e.progress.doneTotal} / {e.progress.total}
                      {e.assignment.completedAt && ` · ${s.doneOn(e.assignment.completedAt.slice(0, 10))}`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
