// Hint panel (design.md §5 HintDrawer, shown inside the question card): Shelly, "Hint n of 3",
// ladder dots, the hint for the learner's current line, and "Show me step by step" (H3).
import { eqHint } from '../../engine/topics/eq/hints';
import { Turtle } from '../mascots/Turtle';
import { hintText, strings } from '../strings';
import { Rich } from './Math';

interface Props {
  line: string;
  variable: string;
  tier: 1 | 2;
  /** A wrong try at H2: the walkthrough button is highlighted (never started for the learner). */
  walkOffered: boolean;
  onMore: () => void;
  onClose: () => void;
  onShowMe: () => void;
}

export function HintPanel({ line, variable, tier, walkOffered, onMore, onClose, onShowMe }: Props) {
  const hint = eqHint(line, variable, tier);
  return (
    <aside className="hint-panel" aria-label={strings.hint.title(tier)}>
      <div className="hint-header">
        <span className="hint-who">
          <Turtle pose={tier === 1 ? 'think' : 'point'} size={56} />
          <span className="label">{strings.hint.title(tier)}</span>
        </span>
        <span className="ladder" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`dot ${tier >= n ? 'on' : ''}`} />
          ))}
        </span>
      </div>
      <p className="hint-body">
        <Rich text={hintText(hint)} />
      </p>
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
