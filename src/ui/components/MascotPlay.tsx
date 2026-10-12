// Shelly and Pip as something to play with on Home (design.md §4, R-RWD-5 spirit): they breathe and
// blink while idle; a tap, click or Enter makes them react, a different way each time, with a few
// hearts and stars floating up. Dress up makes the mascot show off its new accessory. All movement
// is CSS (rewards.css), so reduced motion (R-NF-3) stops it; a reaction then only changes the pose.
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import type { AccessoryKind, Mascot } from '../../engine/rewards';
import { Penguin, type PenguinPose } from '../mascots/Penguin';
import { Turtle, type TurtlePose } from '../mascots/Turtle';

/** CSS reaction names (`data-react`): the movement of the whole mascot or of a part. */
type Anim = 'hop' | 'twirl' | 'bounce' | 'bob' | 'peek' | 'wiggle';

interface Reaction {
  anim: Anim;
  pose: PenguinPose | TurtlePose;
}

/** Taps cycle through these, so each one does something a little different. */
const POKES: Record<Mascot, readonly Reaction[]> = {
  penguin: [
    { anim: 'hop', pose: 'cheer' },
    { anim: 'twirl', pose: 'idle' },
    { anim: 'bounce', pose: 'clap' },
  ],
  turtle: [
    { anim: 'bob', pose: 'wave' },
    { anim: 'peek', pose: 'idle' },
    { anim: 'wiggle', pose: 'nod' },
  ],
};

/** How long a reaction (pose and movement) lasts before the mascot is idle again. */
const HOLD_MS = 1200;

export interface MascotState {
  /** Counts reactions; it keys the animated parts so each reaction plays from the start. */
  n: number;
  anim: Anim | null;
  pose: PenguinPose | TurtlePose;
  /** The accessory just put on, which drops into place. */
  fresh: AccessoryKind | undefined;
}

/** A mascot's reaction state, and the ways to start one. */
export function useMascot(mascot: Mascot) {
  const [state, setState] = useState<MascotState>({ n: 0, anim: null, pose: 'idle', fresh: undefined });
  const count = useRef(0);
  const start = useCallback((r: Reaction, fresh?: AccessoryKind) => {
    const n = ++count.current;
    setState({ n, anim: r.anim, pose: r.pose, fresh });
    window.setTimeout(() => setState((s) => (s.n === n ? { ...s, anim: null, pose: 'idle' } : s)), HOLD_MS);
  }, []);
  const poke = useCallback(() => {
    const list = POKES[mascot];
    start(list[count.current % list.length]!);
  }, [mascot, start]);
  /** Dress up: a twirl to show off what was put on, a little wiggle when something comes off. */
  const dressed = useCallback(
    (kind: AccessoryKind, on: boolean) =>
      start(
        on
          ? { anim: 'twirl', pose: mascot === 'penguin' ? 'cheer' : 'wave' }
          : { anim: 'wiggle', pose: 'idle' },
        on ? kind : undefined,
      ),
    [mascot, start],
  );
  return { state, poke, dressed };
}

/** Hearts and stars that float up from the mascot, once per reaction. */
function Sparks({ n }: { n: number }) {
  return (
    <span className="mascot-sparks" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <svg
          key={`${n}-${i}`}
          className={`mascot-spark ${i % 2 ? 'spark-star' : 'spark-heart'}`}
          viewBox="-10 -10 20 20"
          width="18"
          height="18"
          style={{ '--i': i, '--dx': `${(i - 1.5) * 16}px` } as CSSProperties}
        >
          {i % 2 ? (
            <path d="M0,-9 L2.6,-2.8 L9,-2.8 L3.8,1.2 L5.8,8 L0,4 L-5.8,8 L-3.8,1.2 L-9,-2.8 L-2.6,-2.8 Z" />
          ) : (
            <path d="M0,8 C-12,0 -8,-10 0,-4 C8,-10 12,0 0,8 Z" />
          )}
        </svg>
      ))}
    </span>
  );
}

/** A mascot the learner can tap (mouse, touch, or Enter / Space with the keyboard, R-PLAT-5). */
export function MascotPlay({
  mascot,
  size,
  label,
  className,
  state,
  onPoke,
}: {
  mascot: Mascot;
  size: number;
  label: string;
  className?: string;
  state: MascotState;
  onPoke: () => void;
}) {
  return (
    <button
      type="button"
      className={`mascot-play mascot-${mascot} ${className ?? ''}`}
      aria-label={label}
      data-react={state.anim ?? undefined}
      onClick={onPoke}
    >
      <span key={state.n} className="mascot-body">
        {mascot === 'penguin' ? (
          <Penguin pose={state.pose as PenguinPose} size={size} fresh={state.fresh} />
        ) : (
          <Turtle pose={state.pose as TurtlePose} size={size} fresh={state.fresh} />
        )}
      </span>
      {state.n > 0 && <Sparks n={state.n} />}
    </button>
  );
}
