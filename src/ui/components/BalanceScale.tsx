// BalanceScale (design.md §5, R-EQ-PED-1/2, R-NF-3): a level beam with each side of the equation
// on a pan. The same operation fades in on both pans in coral, the beam stays level, and the pans
// collapse to the shortcut result. `full` ≈ 1.4 s, `short` = 400 ms, `static` = before/after frames.
import { useEffect, useState } from 'react';
import { MathLine } from './Math';

export type BalanceMode = 'full' | 'short' | 'static';

export interface BalanceFrames {
  before: { L: string; R: string };
  /** Engine text of what happens to both sides (`− a`, `÷ 2`); empty for none. */
  op: string;
  after: { L: string; R: string };
}

type Phase = 'before' | 'op' | 'after';

/** [op appears, pans collapse] in ms: ~1.4 s in full, 400 ms short (R-EQ-PED-2). */
const TIMINGS: Record<Exclude<BalanceMode, 'static'>, [number, number]> = {
  full: [450, 1400],
  short: [0, 400],
};

function Pan({ text, op, phase, side }: { text: string; op: string; phase: Phase; side: 'L' | 'R' }) {
  return (
    <div className={`balance-pan balance-pan-${side}`}>
      <span className="balance-pan-body math-md">
        <MathLine text={text} />
        {op && phase === 'op' && (
          <span className="balance-op">
            {' '}
            <MathLine text={op} />
          </span>
        )}
      </span>
    </div>
  );
}

export function BalanceScale({
  frames,
  mode,
  playKey = 0,
  label,
  showAfter = true,
}: {
  frames: BalanceFrames;
  mode: BalanceMode;
  /** Change to replay the animation. */
  playKey?: number | string;
  label: string;
  /** false: only the "same thing on both sides" frame (the result is left to the learner). */
  showAfter?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(mode === 'static' ? 'after' : 'before');

  useEffect(() => {
    if (mode === 'static') return;
    const [tOp, tAfter] = TIMINGS[mode];
    const timers = [
      window.setTimeout(() => setPhase('before'), 0),
      window.setTimeout(() => setPhase('op'), tOp),
      window.setTimeout(() => setPhase('after'), tAfter),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [mode, playKey]);

  if (!showAfter) {
    return (
      <figure className="balance balance-static" aria-label={label}>
        <div className="balance-frame">
          <Beam />
          <Pan text={frames.before.L} op={frames.op} phase="op" side="L" />
          <Pan text={frames.before.R} op={frames.op} phase="op" side="R" />
        </div>
      </figure>
    );
  }

  if (mode === 'static') {
    // Reduced motion: two frames, no movement (R-NF-3).
    return (
      <figure className="balance balance-static" aria-label={label}>
        <div className="balance-frame">
          <Beam />
          <Pan text={frames.before.L} op={frames.op} phase="op" side="L" />
          <Pan text={frames.before.R} op={frames.op} phase="op" side="R" />
        </div>
        <span className="balance-arrow" aria-hidden="true">
          ↓
        </span>
        <div className="balance-frame">
          <Beam />
          <Pan text={frames.after.L} op="" phase="after" side="L" />
          <Pan text={frames.after.R} op="" phase="after" side="R" />
        </div>
      </figure>
    );
  }

  const shown = phase === 'after' ? frames.after : frames.before;
  return (
    <figure className={`balance balance-${mode}`} data-phase={phase} aria-label={label}>
      <div className="balance-frame">
        <Beam />
        <Pan text={shown.L} op={frames.op} phase={phase} side="L" />
        <Pan text={shown.R} op={frames.op} phase={phase} side="R" />
      </div>
    </figure>
  );
}

function Beam() {
  return (
    <svg className="balance-beam" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true">
      <rect x="20" y="8" width="360" height="6" rx="3" className="balance-bar" />
      <rect x="58" y="14" width="3" height="26" className="balance-bar" />
      <rect x="339" y="14" width="3" height="26" className="balance-bar" />
      <polygon points="200,14 186,86 214,86" className="balance-fulcrum" />
    </svg>
  );
}
