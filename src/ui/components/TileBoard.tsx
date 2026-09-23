// Tile board (design.md §5 TermTile / DropZone / SignPicker, §6.2 drag mechanics, R-EQ-TILE-1/2/6).
// Drag by pointer events (mouse, touch, pen) with a 6 px threshold and snap to the nearer side;
// keyboard: Tab to a tile, Enter to pick up, ←/→ to choose the side, Enter to drop, Esc to cancel.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  awaitingSign,
  canSwap,
  mustCross,
  sideOf,
  sideTerms,
  tileById,
  tileText,
  type Board,
  type BoardTerm,
  type Side,
  type Sign,
} from '../../engine/eq/tiles';
import { MINUS } from '../../engine/eq/format';
import { strings } from '../strings';
import { MathLine, Rich } from './Math';

const DRAG_THRESHOLD_PX = 6;

interface Props {
  board: Board;
  disabled: boolean;
  onDrop: (id: string, to: Side) => void;
  onSign: (sign: Sign) => void;
  onSwap: () => void;
  announce: (message: string) => void;
  /** Every tile is placed: the screen moves focus to "Done moving". */
  onAllPlaced: () => void;
}

interface Drag {
  id: string;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  active: boolean;
  over: Side | null;
}

/** Tile face: variables without a + sign, constants with one (R-EQ-TILE-1: `3a`, `+3`, `a`, `+23`). */
export function tileFace(t: BoardTerm): string {
  if (t.coef === null) return `?${t.magnitude}`;
  if (t.coef.n < 0n) return `${MINUS}${t.magnitude}`;
  return t.isVar ? t.magnitude : `+${t.magnitude}`;
}

export function TileBoard({ board, disabled, onDrop, onSign, onSwap, announce, onAllPlaced }: Props) {
  const equalsRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [held, setHeld] = useState<{ id: string; target: Side } | null>(null);
  const waiting = awaitingSign(board);
  const v = board.variable;

  const sideAt = (clientX: number): Side => {
    const r = equalsRef.current?.getBoundingClientRect();
    return r && clientX > r.left + r.width / 2 ? 'R' : 'L';
  };

  const movable = (t: BoardTerm) => !disabled && !waiting && !t.crossed;

  // After a sign is chosen, move focus to the next tile that still has to cross, or to Done moving.
  const prevWaiting = useRef<string | null>(null);
  useEffect(() => {
    const was = prevWaiting.current;
    prevWaiting.current = waiting?.id ?? null;
    if (!was || waiting) return;
    const next = board.tiles.find((t) => mustCross(board, t.id) && sideOf(board, t.id) === t.home);
    if (next) boardRef.current?.querySelector<HTMLElement>(`[data-tile="${next.id}"]`)?.focus();
    else onAllPlaced();
  }, [waiting, board, onAllPlaced]);

  // A touch drag that starts on a tile must not become a scroll or fling gesture: Chrome swallows
  // the next tap (on + or −) to stop a fling. touch-action: none alone did not prevent that.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.closest('.term-tile')) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const finishDrop = (id: string, to: Side) => {
    const term = tileText(tileById(board, id), v);
    if (to === sideOf(board, id)) announce(strings.tiles.returned(term));
    onDrop(id, to);
  };

  const pointerHandlers = (t: BoardTerm) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (!movable(t) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ id: t.id, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, active: false, over: null });
    },
    onPointerMove: (e: PointerEvent<HTMLButtonElement>) => {
      if (!drag || drag.id !== t.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      const active = drag.active || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;
      setDrag({ ...drag, dx, dy, active, over: active ? sideAt(e.clientX) : null });
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      if (!drag || drag.id !== t.id) return;
      setDrag(null);
      // A drag that doesn't cross the = just returns the tile (no sign prompt).
      if (drag.active) finishDrop(t.id, sideAt(e.clientX));
    },
    onPointerCancel: () => setDrag(null),
  });

  const onKeyDown = (t: BoardTerm) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!movable(t)) return;
    const isHeld = held?.id === t.id;
    if (!isHeld) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setHeld({ id: t.id, target: sideOf(board, t.id) });
        announce(strings.tiles.pickedUp(tileText(tileById(board, t.id), v)));
      }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHeld({ id: t.id, target: e.key === 'ArrowLeft' ? 'L' : 'R' });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setHeld(null);
      finishDrop(t.id, held.target);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setHeld(null);
      announce(strings.tiles.returned(tileText(tileById(board, t.id), v)));
    }
  };

  const overSide = drag?.active ? drag.over : held ? held.target : null;

  const zone = (side: Side) => {
    const unknowns = board.unknowns === side;
    const terms = sideTerms(board, side);
    return (
      <div
        className={`drop-zone ${unknowns ? 'zone-var' : 'zone-const'} ${overSide === side ? 'drag-over' : ''}`}
        data-side={side}
      >
        <div className="zone-label">
          <Rich text={unknowns ? strings.tiles.unknowns(v) : strings.tiles.knowns} />
        </div>
        <div className="zone-tiles">
          {terms.map((t) => {
            const dragging = drag?.id === t.id && drag.active;
            const isHeld = held?.id === t.id;
            const locked = t.crossed && t.coef !== null;
            return (
              <span key={t.id} className={`tile-slot ${dragging ? 'ghosting' : ''}`}>
                <button
                  type="button"
                  data-tile={t.id}
                  className={[
                    'term-tile',
                    t.isVar ? 'tile-var' : 'tile-const',
                    locked ? 'locked' : '',
                    t.coef === null ? 'awaiting-sign' : '',
                    dragging || isHeld ? 'dragging' : '',
                  ].join(' ')}
                  style={
                    dragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.06)` } : undefined
                  }
                  aria-label={strings.tiles.tile(tileFace(t).replace('?', ''), side, locked)}
                  aria-pressed={isHeld}
                  aria-disabled={!movable(t)}
                  {...pointerHandlers(t)}
                  onKeyDown={onKeyDown(t)}
                >
                  {t.coef === null && (
                    <span className="tile-q" aria-hidden="true">
                      ?
                    </span>
                  )}
                  <MathLine text={tileFace(t).replace('?', '')} />
                </button>
              </span>
            );
          })}
          {waiting && sideOf(board, waiting.id) === side && <SignPicker onSign={onSign} />}
        </div>
      </div>
    );
  };

  return (
    <div className="tile-board" ref={boardRef} role="group" aria-label={strings.tiles.board}>
      {zone('L')}
      <div className="tile-equals" ref={equalsRef}>
        <span className="equals-sign" aria-hidden="true">
          =
        </span>
        <button
          type="button"
          className="swap-pill"
          aria-label={strings.tiles.swapLabel}
          disabled={disabled || !canSwap(board)}
          onClick={onSwap}
        >
          {strings.tiles.swap}
        </button>
      </div>
      {zone('R')}
    </div>
  );
}

/** SignPicker (design.md §5): + and − under the tile that just crossed. Keyboard: + / -. */
function SignPicker({ onSign }: { onSign: (s: Sign) => void }) {
  const plusRef = useRef<HTMLButtonElement>(null);
  useEffect(() => plusRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === '+') onSign(1);
      else if (e.key === '-' || e.key === MINUS) onSign(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSign]);
  return (
    <div className="sign-picker" role="group" aria-label={strings.tiles.whichSign}>
      <button
        ref={plusRef}
        type="button"
        className="sign-key"
        aria-label={strings.tiles.plus}
        onClick={() => onSign(1)}
      >
        +
      </button>
      <button type="button" className="sign-key" aria-label={strings.tiles.minus} onClick={() => onSign(-1)}>
        {MINUS}
      </button>
      <span className="sign-prompt label">{strings.tiles.whichSign}</span>
    </div>
  );
}
