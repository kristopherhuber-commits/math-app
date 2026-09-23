// A drag handle for reordering a vertical list (mockup 11: items and the queue). Pointer events cover
// mouse and touch; a focused handle moves its row with ↑ / ↓ (R-PLAT-5). Rows are found by
// `[data-reorder-row]` inside the nearest `[data-reorder-list]`.
import { useRef, useState } from 'react';

export function ReorderHandle({
  index,
  count,
  label,
  onMove,
  onDragState,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (from: number, to: number) => void;
  /** The row being dragged and where it would land, for styling; null when the drag ends. */
  onDragState?: (s: { from: number; to: number } | null) => void;
}) {
  const drag = useRef<{ from: number; to: number; mids: number[] } | null>(null);
  const [dragging, setDragging] = useState(false);

  const targetFor = (y: number, mids: number[], from: number) => {
    // The number of other rows whose middle is above the pointer.
    let to = 0;
    mids.forEach((m, i) => {
      if (i !== from && y > m) to++;
    });
    return to;
  };

  return (
    <button
      type="button"
      className={`reorder-handle ${dragging ? 'dragging' : ''}`}
      aria-label={label}
      aria-disabled={count < 2}
      onKeyDown={(e) => {
        const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
        if (to === null) return;
        e.preventDefault();
        if (to >= 0 && to < count) onMove(index, to);
      }}
      onPointerDown={(e) => {
        if (count < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const list = e.currentTarget.closest('[data-reorder-list]');
        const rows = list ? [...list.querySelectorAll<HTMLElement>('[data-reorder-row]')] : [];
        const mids = rows.map((r) => {
          const b = r.getBoundingClientRect();
          return b.top + b.height / 2;
        });
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { from: index, to: index, mids };
        setDragging(true);
        onDragState?.({ from: index, to: index });
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const to = targetFor(e.clientY, d.mids, d.from);
        if (to !== d.to) {
          d.to = to;
          onDragState?.({ from: d.from, to });
        }
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        setDragging(false);
        onDragState?.(null);
        if (d && d.to !== d.from) onMove(d.from, d.to);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
        onDragState?.(null);
      }}
    >
      <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
        {[3, 11, 19].map((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />))}
      </svg>
    </button>
  );
}

/** Move one element of a list. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x!);
  return out;
}
