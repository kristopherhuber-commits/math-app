// Hint panel (design.md §5 HintDrawer, shown inside the question card): Shelly, "Hint n of 3",
// ladder dots, the hint for this problem, and "Show me step by step" (H3). The caller renders the
// hint body, so every topic shares the panel.
import type { ReactNode } from 'react';
import { Turtle } from '../mascots/Turtle';
import { useSettings } from '../settings';
import { strings } from '../strings';

interface Props {
  tier: 1 | 2;
  body: ReactNode;
  /** A wrong try at H2: the walkthrough button is highlighted (never started for the learner). */
  walkOffered: boolean;
  onMore: () => void;
  onClose: () => void;
  onShowMe: () => void;
}

export function HintPanel({ tier, body, walkOffered, onMore, onClose, onShowMe }: Props) {
  const turtle = useSettings().mascotNames.turtle;
  return (
    <aside className="hint-panel" aria-label={strings.hint.title(tier)}>
      <div className="hint-header">
        <span className="hint-who">
          <Turtle pose={tier === 1 ? 'think' : 'point'} size={56} />
          <span className="hint-name">
            <strong>{turtle}</strong>
            <span className="label">{strings.hint.title(tier)}</span>
          </span>
        </span>
        <span className="ladder" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`dot ${tier >= n ? 'on' : ''}`} />
          ))}
        </span>
      </div>
      <p className="hint-body">{body}</p>
      <div className="hint-actions">
        {tier < 2 && (
          <button type="button" className="btn btn-help btn-small" onClick={onMore}>
            {strings.hint.more}
          </button>
        )}
        <button
          type="button"
          className={`btn btn-help btn-small ${walkOffered ? 'pulsing' : ''}`}
          onClick={onShowMe}
        >
          {strings.hint.showMe}
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={onClose}>
          {strings.hint.close}
        </button>
      </div>
      <p className="hint-note">{strings.hint.walkNote}</p>
    </aside>
  );
}
