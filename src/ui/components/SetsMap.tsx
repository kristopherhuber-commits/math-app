// NC components (design.md §5): SetCheckbox cards and the SetsMap, nested boxes
// Real ⊃ (Rational ⊃ Integer ⊃ Whole ⊃ Natural) with Irrational beside Rational. In H3 the number
// sits in its innermost box and each enclosing box lights up in turn. Real is only the outer frame:
// it has no checkbox, since every number shown is real (parent decision, 2026-09-25).
import type { CSSProperties, ReactNode } from 'react';
import type { NcSet } from '../../engine/topics/walk';
import { numStrings } from '../strings';
import { MathText } from './Math';

interface CardProps {
  set: NcSet;
  on: boolean;
  flagged: boolean;
  disabled: boolean;
  naturalIncludesZero: boolean;
  onToggle: () => void;
  onEnter: () => void;
}

/** A whole-card checkbox. Space toggles (native button), Enter checks the answer (design.md §10). */
export function SetCheckbox({
  set,
  on,
  flagged,
  disabled,
  naturalIncludesZero,
  onToggle,
  onEnter,
}: CardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={disabled}
      className={`set-card ${on ? 'on' : ''} ${flagged ? 'flagged' : ''}`}
      onClick={() => !disabled && onToggle()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
    >
      <span className="set-box" aria-hidden="true">
        {on ? '✓' : ''}
      </span>
      <span className="set-name">{numStrings.nc.name[set]}</span>
      <span className="set-example">{numStrings.nc.example(set, naturalIncludesZero)}</span>
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
