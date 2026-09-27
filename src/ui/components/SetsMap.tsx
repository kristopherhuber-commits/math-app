// NC components (design.md §5): SetCard (one answer, M7) and the SetsMap, nested boxes
// Real ⊃ (Rational ⊃ Integer ⊃ Whole ⊃ Natural) with Irrational beside Rational. In H3 the number
// sits in its innermost box and each enclosing box lights up in turn. Real is only the outer frame:
// it has no card, since every number shown is real (parent decision, 2026-09-25).
import type { CSSProperties, ReactNode } from 'react';
import type { NcSet } from '../../engine/topics/walk';
import { numStrings } from '../strings';
import { MathText } from './Math';

interface CardProps {
  set: NcSet;
  n: number;
  selected: boolean;
  tried: boolean;
  correct: boolean;
  shake: boolean;
  disabled: boolean;
  onSelect: () => void;
  onEnter: () => void;
}

/**
 * One set card of five; the answer is one card, the smallest set (R-NC-2, M7). Like McOption: a radio,
 * tried cards greyed with ✕ (R-NC-3). Space chooses (native button), Enter checks (design.md §10).
 */
export function SetCard({ set, n, selected, tried, correct, shake, disabled, onSelect, onEnter }: CardProps) {
  const state = correct ? 'correct' : tried ? 'tried' : selected ? 'selected' : 'idle';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected || correct}
      aria-disabled={tried || disabled}
      aria-label={`${n}: ${numStrings.nc.name[set]}, ${numStrings.nc.example(set)}`}
      className={`set-card ${state} ${shake ? 'shake' : ''}`}
      onClick={() => !tried && !disabled && onSelect()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
    >
      <span className="set-box" aria-hidden="true">
        {tried ? '✕' : selected || correct ? '●' : ''}
      </span>
      <span className="set-name">{numStrings.nc.name[set]}</span>
      <span className="set-example">{numStrings.nc.example(set)}</span>
    </button>
  );
}

interface MapProps {
  lit?: readonly NcSet[];
  place?: NcSet;
  /** LaTeX of the number placed in its innermost box. */
  number?: string;
  compact?: boolean;
  label: string;
}

export function SetsMap({ lit = [], place, number, compact = false, label }: MapProps) {
  const box = (set: NcSet, depth: number, children?: ReactNode) => (
    <div
      className={`sets-box sets-${set} ${lit.includes(set) ? 'lit' : ''}`}
      style={{ '--depth': depth } as CSSProperties}
    >
      <span className="sets-label">{numStrings.nc.name[set]}</span>
      {place === set && number && (
        <span className="sets-number">
          <MathText latex={number} />
        </span>
      )}
      {children}
    </div>
  );
  return (
    <figure className={`sets-map ${compact ? 'compact' : ''}`} aria-label={label}>
      <div className="sets-box sets-real" style={{ '--depth': 0 } as CSSProperties}>
        <span className="sets-label">{numStrings.nc.realFrame}</span>
        <div className="sets-row">
          {box('rational', 1, box('integer', 2, box('whole', 3, box('natural', 4))))}
          {box('irrational', 1)}
        </div>
      </div>
    </figure>
  );
}
