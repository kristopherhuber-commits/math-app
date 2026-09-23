// H3 walkthrough (design.md §5 Walkthrough, mockup 07, §7.6): Shelly takes over the question card,
// one step per tap, each step on the balance scale, ending with the substitution check.
import { useEffect, useRef } from 'react';
import { walkOpText, type WalkStep } from '../../engine/topics/eq/hints';
import { Turtle } from '../mascots/Turtle';
import { hintText, strings } from '../strings';
import { BalanceScale, type BalanceFrames, type BalanceMode } from './BalanceScale';
import { MathLine, Rich } from './Math';

const sides = (line: string) => {
  const [l = '', r = ''] = line.split('=');
  return { L: l.trim(), R: r.trim() };
};

function framesFor(step: WalkStep, v: string): BalanceFrames {
  if (step.kind === 'CHECK') {
    const p = step.explain.params;
    return {
      before: { L: p.left ?? '', R: p.right ?? '' },
      op: '',
      after: { L: p.leftValue ?? '', R: p.rightValue ?? '' },
    };
  }
  return { before: sides(step.before), op: step.op ? walkOpText(step.op, v) : '', after: sides(step.line) };
}

interface Props {
  steps: WalkStep[];
  index: number;
  variable: string;
  solved: boolean;
  motion: BalanceMode;
  onNext: () => void;
  onBack: () => void;
  onNextQuestion: () => void;
}

export function Walkthrough({
  steps,
  index,
  variable,
  solved,
  motion,
  onNext,
  onBack,
  onNextQuestion,
}: Props) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus(), [index, solved]);
  const current = steps[index]!;
  const last = index === steps.length - 1;
  return (
    <section className="card walkthrough" aria-labelledby="walk-title">
      <header className="walk-header">
        <Turtle pose={solved ? 'nod' : 'wave'} size={112} />
        <div>
          <h1 id="walk-title" className="walk-title">
            {strings.walk.title}
          </h1>
          <p className="walk-step label">{strings.walk.step(index + 1, steps.length)}</p>
        </div>
        <ol className="walk-progress" aria-label={strings.walk.progress}>
          {steps.map((_, i) => (
            <li key={i} className={i <= index ? 'on' : ''} />
          ))}
        </ol>
      </header>
      <ol className="walk-body" aria-live="polite">
        {steps.slice(0, index + 1).map((s, i) => (
          <li key={i} className={`walk-line ${i === index ? 'current' : 'done'}`}>
            <span className="walk-num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="walk-content">
              <p className="walk-explain">
                <Rich text={hintText(s.explain)} />
              </p>
              {s.kind !== 'CHECK' && <MathLine text={s.line} className="math-md walk-result" />}
            </div>
          </li>
        ))}
      </ol>
      <BalanceScale
        frames={framesFor(current, variable)}
        mode={motion}
        playKey={index}
        label={strings.tiles.balanceLabel}
      />
      <div className="actions">
        <button type="button" className="btn btn-outline" onClick={onBack} disabled={index === 0 || solved}>
          {strings.walk.back}
        </button>
        {solved ? (
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={onNextQuestion}>
            {strings.practice.next}
          </button>
        ) : (
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={onNext}>
            {last ? strings.walk.finish : strings.walk.next}
          </button>
        )}
      </div>
    </section>
  );
}
