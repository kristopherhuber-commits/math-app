// Number-topic building blocks (design.md §5): MathHero, McOption, FeedbackToast, and the renderer
// for an engine `Shown` (KaTeX for math; the UI face for money, design.md §2.2).
import type { Shown } from '../../engine/numbers/display';
import type { McOption as Option } from '../../engine/topics/mc';
import { misconceptionLine, numStrings, numText } from '../strings';
import { MathText, Tex } from './Math';

/** One number as the engine shows it; `stacked` puts the bar form on its own line (R-DISP-3). */
export function ShownMath({ shown, className = '' }: { shown: Shown; className?: string }) {
  // `text` carries an id to render through strings.ts (the NC set names in mini-questions).
  if (shown.kind === 'text')
    return <span className={className}>{numStrings.nc.name[shown.text] ?? shown.text}</span>;
  if (shown.kind === 'money') return <span className={`${className} money`}>{shown.text}</span>;
  return (
    <span className={`shown ${className}`}>
      <MathText latex={shown.latex} />
      {shown.latex2 && <MathText latex={shown.latex2} className="shown-second" />}
    </span>
  );
}

/** The question's number, large and centred, with its caption (design.md §5 MathHero). */
export function MathHero({ shown }: { shown: Shown }) {
  return (
    <figure className="math-hero-wrap" aria-label={shown.speech}>
      <span aria-hidden="true">
        <ShownMath shown={shown} className="math-hero" />
      </span>
      {shown.caption && (
        <figcaption className="hero-caption label">
          <Tex text={numText(shown.caption)} />
        </figcaption>
      )}
    </figure>
  );
}

interface OptionProps {
  option: Option;
  n: number;
  selected: boolean;
  tried: boolean;
  /** The question is solved and this is the right answer. */
  correct: boolean;
  /** Just checked and not quite: a short shake (R-HELP-1). */
  shake: boolean;
  disabled: boolean;
  onSelect: () => void;
}

/** design.md §5 McOption: idle · hover · selected · wrong (veiled, ✕, disabled) · correct. */
export function McOptionCard({
  option,
  n,
  selected,
  tried,
  correct,
  shake,
  disabled,
  onSelect,
}: OptionProps) {
  const state = correct ? 'correct' : tried ? 'tried' : selected ? 'selected' : 'idle';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected || correct}
      aria-disabled={tried || disabled}
      aria-label={numStrings.option(n, option.shown.speech)}
      className={`mc-option ${state} ${shake ? 'shake' : ''} ${option.shown.latex2 ? 'two-line' : ''}`}
      onClick={() => !tried && !disabled && onSelect()}
    >
      <span className="mc-key" aria-hidden="true">
        {n}
      </span>
      <ShownMath shown={option.shown} className={option.shown.kind === 'money' ? 'money-lg' : 'math-lg'} />
      {(selected || correct) && (
        <span className="mc-badge" aria-hidden="true">
          ✓
        </span>
      )}
      {tried && (
        <span className="mc-badge tried" aria-hidden="true">
          ✕
        </span>
      )}
    </button>
  );
}

/** design.md §5 FeedbackToast: "Not quite." plus one misconception line (R-HELP-1a). */
export function FeedbackToast({ code, kind, extra }: { code?: string; kind?: string; extra?: string }) {
  const line = code ? misconceptionLine(code, kind) : null;
  return (
    <div className="feedback-toast" role="status">
      <strong>{numStrings.notQuite}</strong>
      {line && <> {line}</>}
      {extra && <> {extra}</>}
    </div>
  );
}
