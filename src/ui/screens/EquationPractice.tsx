import { useEffect, useMemo, useReducer, useRef } from 'react';
import { newSeed } from '../../engine/rng';
import { eqHint, eqWalkthrough } from '../../engine/topics/eq/hints';
import { saveAttempt } from '../../data/attempts';
import { MathLine, Rich } from '../components/Math';
import { Keypad, type KeypadKey } from '../components/Keypad';
import { HintPanel } from '../components/HintPanel';
import { Walkthrough } from '../components/Walkthrough';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Turtle } from '../mascots/Turtle';
import { feedbackText, hintText, strings } from '../strings';
import { practiceReducer, startPractice } from '../practice/practiceReducer';

interface Props {
  level: number;
  seed?: number;
  onHome: () => void;
}

export function EquationPractice({ level, seed, onHome }: Props) {
  const [s, dispatch] = useReducer(practiceReducer, undefined, () => startPractice(level, seed ?? newSeed()));
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const v = s.question.variable;
  const lastLine = s.lines[s.lines.length - 1]!.text;

  // R-SES-5: save after every step.
  useEffect(() => {
    void saveAttempt(s.attempt);
  }, [s.attempt]);

  useEffect(() => {
    if (s.walk) return;
    if (s.solved) nextRef.current?.focus();
    else inputRef.current?.focus();
  }, [s.solved, s.question, s.walk]);

  // Keyboard paths (design.md §10): H opens help, Esc closes it — outside the line input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target === inputRef.current) return;
      if (e.key === 'Escape') dispatch({ type: 'closeHint' });
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey)
        dispatch({ type: 'help' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const check = useMemo(
    () => (s.solved ? eqWalkthrough(s.question.text, v).at(-1)!.explain.params : null),
    [s.solved, s.question.text, v],
  );

  const insert = (k: KeypadKey) => {
    const el = inputRef.current;
    const value = s.input;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    let next: string;
    let caret: number;
    if (typeof k === 'string') {
      next = value.slice(0, start) + k + value.slice(end);
      caret = start + k.length;
    } else if (start !== end) {
      next = value.slice(0, start) + value.slice(end);
      caret = start;
    } else {
      next = value.slice(0, Math.max(0, start - 1)) + value.slice(start);
      caret = Math.max(0, start - 1);
    }
    dispatch({ type: 'input', value: next });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dispatch({ type: 'check' });
    } else if (e.key === 'Escape') {
      dispatch({ type: 'closeHint' });
    } else if ((e.key === 'h' || e.key === 'H') && v !== 'h' && !e.ctrlKey && !e.metaKey) {
      // 'h' is never valid here, so it means Help (design.md §10).
      e.preventDefault();
      dispatch({ type: 'help' });
    }
  };

  const fb = s.feedback ? feedbackText(s.feedback.result) : null;
  const span = s.feedback?.result.span;

  return (
    <div className="screen">
      <header className="topbar">
        <button type="button" className="btn btn-outline btn-small" onClick={onHome}>
          {strings.topBar.home}
        </button>
        <span className="topbar-title">{strings.topBar.title}</span>
        <span className="topbar-progress label">{strings.topBar.question(s.questionNumber)}</span>
      </header>

      <main className="practice">
        {s.walk ? (
          <Walkthrough
            steps={s.walk.steps}
            index={s.walk.index}
            variable={v}
            solved={s.solved}
            motion={reduced ? 'static' : 'full'}
            onNext={() => dispatch({ type: 'walkNext' })}
            onBack={() => dispatch({ type: 'walkBack' })}
            onNextQuestion={() => dispatch({ type: 'next', seed: newSeed() })}
          />
        ) : (
          <section className="card question-card" aria-labelledby="prompt">
            <span className="chip">{strings.practice.chip(s.level)}</span>
            <h1 id="prompt" className="prompt">
              <Rich text={strings.practice.prompt(v)} />
            </h1>

            <ol className="steps" aria-label={strings.practice.steps}>
              {s.lines.map((line, i) => (
                <li
                  key={i}
                  className={`step-line ${i === 0 ? 'given' : 'accepted'} ${s.solved && i === s.lines.length - 1 ? 'solved' : ''}`}
                >
                  <MathLine text={line.text} className="math-md" />
                  <span className="step-label">
                    {strings.labels[line.label]}
                    {line.note && <> {<Rich text={strings.decimalAlsoFraction(line.note)} />}</>}
                  </span>
                </li>
              ))}
            </ol>

            {!s.solved && (
              <label className="current-line">
                <span className="visually-hidden">{strings.practice.currentLine}</span>
                <input
                  ref={inputRef}
                  className="line-input math-md"
                  value={s.input}
                  inputMode="none"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={(e) => dispatch({ type: 'input', value: e.target.value })}
                  onKeyDown={onInputKey}
                />
              </label>
            )}

            <div aria-live="polite" className="live">
              {fb && s.feedback && (
                <div className="step-feedback with-turtle" role="status">
                  <Turtle pose="think" size={72} />
                  <div>
                    <p className="feedback-title">
                      <Rich text={fb.title} />
                    </p>
                    {fb.detail && (
                      <p className="feedback-detail">
                        <Rich text={fb.detail} />
                      </p>
                    )}
                    {span && (
                      <p className="feedback-line math-md">
                        {s.feedback.line.slice(0, span.start)}
                        <span className="error-mark">
                          {s.feedback.line.slice(span.start, span.end) || ' '}
                        </span>
                        {s.feedback.line.slice(span.end)}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {s.solved && check && (
                <div className="solved-box" role="status">
                  <p className="feedback-title">{strings.practice.solved}</p>
                  <p>
                    Check: <Rich text={`$${check.left} = ${check.leftValue}$`} /> and{' '}
                    <Rich text={`$${check.right} = ${check.rightValue}$`} /> ✓
                  </p>
                </div>
              )}
            </div>

            {s.hintOpen && s.hintTier > 0 && !s.solved && (
              <HintPanel
                tier={s.hintTier as 1 | 2}
                body={<Rich text={hintText(eqHint(lastLine, v, s.hintTier as 1 | 2))} />}
                walkOffered={s.walkOffered}
                onMore={() => dispatch({ type: 'moreHint' })}
                onClose={() => dispatch({ type: 'closeHint' })}
                onShowMe={() => dispatch({ type: 'walkStart' })}
              />
            )}

            <div className="actions">
              {!s.solved ? (
                <button
                  type="button"
                  className={`btn btn-help ${s.helpPulse ? 'pulsing' : ''}`}
                  onClick={() => dispatch({ type: 'help' })}
                >
                  <Turtle size={44} /> {strings.practice.help}
                </button>
              ) : (
                <span />
              )}
              {s.solved && (
                <button
                  ref={nextRef}
                  type="button"
                  className="btn btn-primary"
                  onClick={() => dispatch({ type: 'next', seed: newSeed() })}
                >
                  {strings.practice.next}
                </button>
              )}
            </div>
          </section>
        )}

        {!s.walk && (
          <section className="card keypad-card" aria-label={strings.practice.keypad}>
            <Keypad
              variable={v}
              disabled={s.solved}
              onKey={insert}
              onClear={() => dispatch({ type: 'input', value: '' })}
              onCheck={() => dispatch({ type: 'check' })}
            />
          </section>
        )}
      </main>
    </div>
  );
}
