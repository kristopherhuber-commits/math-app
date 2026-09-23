// H3 walkthrough (design.md §5 Walkthrough, mockup 07): Shelly takes over the question card, one
// step per tap. `WalkShell` is the frame every topic shares (header, segmented progress, step list,
// Back / Next, and Next gated by a mini-question, R-HELP-4). `Walkthrough` is EQ's: each step on the
// balance scale, ending with the substitution check (§7.6).
import { useEffect, useRef, type ReactNode } from 'react';
import { walkOpText, type WalkStep } from '../../engine/topics/eq/hints';
import { Turtle } from '../mascots/Turtle';
import { hintText, strings } from '../strings';
import { BalanceScale, type BalanceFrames, type BalanceMode } from './BalanceScale';
import { MathLine, Rich } from './Math';
import { CelebrationSlot } from '../practice/question';

interface ShellProps {
  count: number;
  index: number;
  solved: boolean;
  /** False while the current step's mini-question is unanswered: Next waits (R-HELP-4). */
  canAdvance?: boolean;
  /** The numbered step lines (`<WalkLine>`s). */
  children: ReactNode;
  /** Shown under the step list, e.g. the balance scale. */
  after?: ReactNode;
  onNext: () => void;
  onBack: () => void;
  onNextQuestion: () => void;
}

export function WalkShell({
  count,
  index,
  solved,
  canAdvance = true,
  children,
  after,
  onNext,
  onBack,
  onNextQuestion,
}: ShellProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (canAdvance) nextRef.current?.focus();
  }, [index, solved, canAdvance]);
  const last = index === count - 1;
  return (
    <section className="card walkthrough" aria-labelledby="walk-title">
      <header className="walk-header">
        <Turtle pose={solved ? 'nod' : 'wave'} size={112} />
        <div>
          <h1 id="walk-title" className="walk-title">
            {strings.walk.title}
          </h1>
          <p className="walk-step label">{strings.walk.step(index + 1, count)}</p>
        </div>
        <ol className="walk-progress" aria-label={strings.walk.progress}>
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className={i <= index ? 'on' : ''} />
          ))}
        </ol>
      </header>
      <ol className="walk-body" aria-live="polite">
        {children}
      </ol>
      {after}
      {solved && <CelebrationSlot />}
      <div className="actions">
        <button type="button" className="btn btn-outline" onClick={onBack} disabled={index === 0 || solved}>
          {strings.walk.back}
        </button>
        {!canAdvance && !solved && <span className="walk-gate label">{strings.walk.answerFirst}</span>}
        {solved ? (
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={onNextQuestion}>
            {strings.practice.next}
          </button>
        ) : (
          <button
            ref={nextRef}
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canAdvance}
          >
            {last ? strings.walk.finish : strings.walk.next}
          </button>
        )}
      </div>
    </section>
  );
}

export function WalkLine({ n, current, children }: { n: number; current: boolean; children: ReactNode }) {
  return (
    <li className={`walk-line ${current ? 'current' : 'done'}`}>
      <span className="walk-num" aria-hidden="true">
        {n}
      </span>
      <div className="walk-content">{children}</div>
    </li>
  );
}

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

export function Walkthrough({ steps, index, variable, solved, motion, ...nav }: Props) {
  const current = steps[index]!;
  return (
    <WalkShell
      count={steps.length}
      index={index}
      solved={solved}
      {...nav}
      after={
        <BalanceScale
          frames={framesFor(current, variable)}
          mode={motion}
          playKey={index}
          label={strings.tiles.balanceLabel}
        />
      }
    >
      {steps.slice(0, index + 1).map((s, i) => (
        <WalkLine key={i} n={i + 1} current={i === index}>
          <p className="walk-explain">
            <Rich text={hintText(s.explain)} />
          </p>
          {s.kind !== 'CHECK' && <MathLine text={s.line} className="math-md walk-result" />}
        </WalkLine>
      ))}
    </WalkShell>
  );
}
