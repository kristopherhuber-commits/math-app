// Tile builder screen for EQ levels 1–2 (R-EQ-TILE-1…6, R-EQ-PED-1/2, design.md §6.2, mockup 05).
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { config } from '../../engine/config';
import { allPlaced, boardText, newBoard, sideTerms, type BalanceView } from '../../engine/eq/tiles';
import { eqHint, eqWalkthrough, type WalkKind } from '../../engine/topics/eq/hints';
import { fullBalanceAnimSetting, storedCorrectSigns } from '../../data/attempts';
import { BalanceScale, type BalanceMode } from '../components/BalanceScale';
import { HintPanel } from '../components/HintPanel';
import { MathLine, MathText, Rich, toLatex } from '../components/Math';
import { NumberPad } from '../components/NumberPad';
import { StepRail, type RailStep } from '../components/StepRail';
import { TileBoard, tileFace } from '../components/TileBoard';
import { Walkthrough } from '../components/Walkthrough';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Turtle } from '../mascots/Turtle';
import { feedbackText, hintText, strings } from '../strings';
import { startTiles, tileReducer, type TilePhase, type TileState } from '../practice/tileReducer';
import { CelebrationSlot, useReportAttempt, type QuestionProps } from '../practice/question';

const RAIL: Record<TilePhase, RailStep> = {
  MOVE: 'MOVE',
  SIMPLIFY_VAR: 'SIMPLIFY',
  SIMPLIFY_CONST: 'SIMPLIFY',
  SOLVE_DIVISOR: 'SOLVE',
  SOLVE_ANSWER: 'SOLVE',
};

/** Where a walkthrough step sits on the rail. */
const WALK_RAIL: Record<WalkKind, RailStep> = {
  EXPAND: 'MOVE',
  CLEAR_FRACTIONS: 'MOVE',
  SEPARATE: 'MOVE',
  SIMPLIFY: 'SIMPLIFY',
  SOLVE: 'SOLVE',
  CHECK: 'SOLVE',
};

/** The "So far" line: a `?` stands where a sign is still being chosen. */
const soFarLatex = (text: string) =>
  text.includes('?') ? text.replace(/−/g, '-').replace(/\?/g, '\\mathbin{?}') : toLatex(text);

const balanceCaption = (view: BalanceView) =>
  view.subtract ? strings.tiles.balanceSubtract(view.amount) : strings.tiles.balanceAdd(view.amount);

/** The number-pad prompt for the current phase (R-EQ-TILE-4/5). */
function padPrompt(s: TileState): string {
  const p = s.plan!;
  const v = s.question.variable;
  switch (s.phase) {
    case 'SIMPLIFY_VAR':
      return strings.tiles.simplifyVar(p.varText, v);
    case 'SIMPLIFY_CONST':
      return strings.tiles.simplifyConst(p.constText);
    case 'SOLVE_DIVISOR':
      return strings.tiles.divide(p.simplified);
    default:
      return strings.tiles.answer(v);
  }
}

/** The current line as read-only tiles, with the group being combined highlighted. */
function LineTiles({ s }: { s: TileState }) {
  const b = newBoard(s.lines[s.lines.length - 1]!.text, s.question.variable);
  const constSide = s.plan?.varSide === 'L' ? 'R' : 'L';
  const hl = s.solved
    ? null
    : s.phase === 'SIMPLIFY_VAR'
      ? s.plan?.varSide
      : s.phase === 'SIMPLIFY_CONST'
        ? constSide
        : null;
  const side = (sd: 'L' | 'R') => (
    <div className={`line-tiles-side ${hl === sd ? 'highlight' : ''}`}>
      {sideTerms(b, sd).map((t) => (
        <span key={t.id} className={`term-tile static ${t.isVar ? 'tile-var' : 'tile-const'}`}>
          <MathLine text={tileFace(t)} />
        </span>
      ))}
    </div>
  );
  return (
    <div className="line-tiles" aria-hidden="true">
      {side('L')}
      <span className="equals-sign">=</span>
      {side('R')}
    </div>
  );
}

export function TileEquation({ level, seed, onSave, onSolved, onNext }: QuestionProps) {
  const [s, dispatch] = useReducer(tileReducer, undefined, () => startTiles(level, seed));
  const reduced = useReducedMotion();
  const [prefs, setPrefs] = useState<{ storedSigns: number; fullAnim: boolean }>({
    storedSigns: 0,
    fullAnim: config.eq.fullBalanceAnimDefault,
  });
  const [announcement, setAnnouncement] = useState('');
  const doneRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const v = s.question.variable;
  const lastLine = s.lines[s.lines.length - 1]!.text;

  useEffect(() => {
    void Promise.all([storedCorrectSigns(), fullBalanceAnimSetting()]).then(([storedSigns, fullAnim]) =>
      setPrefs({ storedSigns, fullAnim }),
    );
  }, []);

  // R-SES-5: save after every step.
  useReportAttempt(s, onSave, onSolved);

  useEffect(() => {
    if (s.solved && !s.walk) nextRef.current?.focus();
  }, [s.solved, s.walk]);

  // R-EQ-PED-2: after 10 correct sign choices the balance shortens, unless the parent wants it full.
  const signCount = prefs.storedSigns + s.correctSigns;
  const tileMotion: BalanceMode = reduced
    ? 'static'
    : prefs.fullAnim || signCount <= config.eq.shortBalanceAfterCorrectSigns
      ? 'full'
      : 'short';

  // Keyboard (design.md §10): H = Help, Esc closes it; digits, −, Backspace and Enter on the pad.
  const padActive = !s.solved && !s.walk && s.phase !== 'MOVE';
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') dispatch({ type: 'closeHint' });
      else if (e.key === 'h' || e.key === 'H') dispatch({ type: 'help' });
      else if (padActive && /^\d$/.test(e.key)) dispatch({ type: 'padKey', key: e.key });
      else if (padActive && (e.key === '-' || e.key === '−')) dispatch({ type: 'padKey', key: '−' });
      else if (padActive && e.key === 'Backspace') dispatch({ type: 'padKey', key: 'back' });
      else if (padActive && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        // Otherwise the same keypress would also press "Next question" once it takes focus.
        e.preventDefault();
        dispatch({ type: 'submit' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [padActive]);

  const onAllPlaced = useCallback(() => doneRef.current?.focus(), []);
  const check = useMemo(
    () => (s.solved ? eqWalkthrough(s.question.text, v).at(-1)!.explain.params : null),
    [s.solved, s.question.text, v],
  );

  const rail: RailStep | 'DONE' = s.solved ? 'DONE' : RAIL[s.phase];
  const fb = s.feedback;

  return (
    <>
      <main className="tiles-layout">
        <StepRail active={s.walk && !s.solved ? WALK_RAIL[s.walk.steps[s.walk.index]!.kind] : rail} />
        {s.walk ? (
          <Walkthrough
            steps={s.walk.steps}
            index={s.walk.index}
            variable={v}
            solved={s.solved}
            motion={reduced ? 'static' : 'full'}
            onNext={() => dispatch({ type: 'walkNext' })}
            onBack={() => dispatch({ type: 'walkBack' })}
            onNextQuestion={onNext}
          />
        ) : (
          <section className="card question-card tile-card" aria-labelledby="prompt">
            <span className="chip">{strings.practice.chip(s.level)}</span>
            <div className="tile-prompt-row">
              <h1 id="prompt" className="prompt">
                <Rich text={strings.tiles.prompt(v)} />
              </h1>
              <MathLine text={s.question.text} className="math-md given-line" />
              <span className="label muted">{strings.tiles.given}</span>
            </div>

            {s.phase === 'MOVE' && !s.solved ? (
              <TileBoard
                board={s.board}
                disabled={s.solved}
                onDrop={(id, to) => dispatch({ type: 'drop', id, to })}
                onSign={(sign) => dispatch({ type: 'sign', sign })}
                onSwap={() => dispatch({ type: 'swap' })}
                announce={setAnnouncement}
                onAllPlaced={onAllPlaced}
              />
            ) : (
              <LineTiles s={s} />
            )}

            {s.lines.length > 1 && (
              <ol className="steps tile-steps" aria-label={strings.practice.steps}>
                {s.lines.slice(1).map((line, i) => (
                  <li
                    key={i}
                    className={`step-line accepted ${s.solved && i === s.lines.length - 2 ? 'solved' : ''}`}
                    data-line={line.text}
                  >
                    <MathLine text={line.text} className="math-md" />
                    <span className="step-label">{strings.labels[line.label]}</span>
                  </li>
                ))}
              </ol>
            )}

            {padActive && (
              <div className="pad-area">
                <div className="pad-left">
                  <p className="pad-prompt math-md">
                    <Rich text={padPrompt(s)} />
                  </p>
                  <output className="pad-entry math-md" aria-label={strings.tiles.entry}>
                    {s.entry || ' '}
                  </output>
                </div>
                <NumberPad onKey={(key) => dispatch({ type: 'padKey', key })} />
              </div>
            )}

            <div aria-live="polite" className="live">
              {fb?.kind === 'sign' && (
                <div className="step-feedback with-turtle" role="status">
                  <Turtle pose="point" size={72} />
                  <div>
                    <p className="feedback-title">
                      <Rich text={strings.tiles.signTitle(fb.term)} />
                    </p>
                    <p className="feedback-detail">
                      <Rich text={balanceCaption(fb.view)} />
                    </p>
                    <BalanceScale
                      frames={fb.view}
                      mode="static"
                      showAfter={false}
                      label={strings.tiles.balanceLabel}
                    />
                  </div>
                </div>
              )}
              {fb?.kind === 'alreadyPlaced' && (
                <div className="step-feedback with-turtle" role="status">
                  <Turtle pose="idle" size={72} />
                  <p className="feedback-title">
                    <Rich text={strings.tiles.alreadyPlaced(fb.term, fb.isVar)} />
                  </p>
                </div>
              )}
              {fb?.kind === 'divisor' && (
                <div className="step-feedback with-turtle" role="status">
                  <Turtle pose="think" size={72} />
                  <p className="feedback-title">
                    <Rich text={strings.tiles.divisorFeedback(v)} />
                  </p>
                </div>
              )}
              {fb?.kind === 'diagnostic' && (
                <div className="step-feedback with-turtle" role="status">
                  <Turtle pose="think" size={72} />
                  <div>
                    <p className="feedback-title">
                      <Rich text={feedbackText(fb.result).title} />
                    </p>
                    {feedbackText(fb.result).detail && (
                      <p className="feedback-detail">
                        <Rich text={feedbackText(fb.result).detail!} />
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!fb && s.balance && s.phase === 'MOVE' && !s.solved && (
                <div className="balance-explainer" role="status">
                  <Turtle pose="nod" size={72} />
                  <div>
                    <p className="feedback-title">
                      <Rich
                        text={
                          tileMotion === 'short' ? strings.tiles.shortcut : balanceCaption(s.balance.view)
                        }
                      />
                    </p>
                    <BalanceScale
                      frames={s.balance.view}
                      mode={tileMotion}
                      playKey={s.balance.n}
                      label={strings.tiles.balanceLabel}
                    />
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
              {s.solved && <CelebrationSlot />}
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

            {s.phase === 'MOVE' && !s.solved && (
              <p className="so-far">
                <span className="label">{strings.tiles.soFar}</span>{' '}
                <MathText latex={soFarLatex(boardText(s.board))} className="math-md" />
              </p>
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
              {s.solved ? (
                <button ref={nextRef} type="button" className="btn btn-primary" onClick={onNext}>
                  {strings.practice.next}
                </button>
              ) : s.phase === 'MOVE' ? (
                <button
                  ref={doneRef}
                  type="button"
                  className="btn btn-primary"
                  disabled={!allPlaced(s.board)}
                  onClick={() => dispatch({ type: 'doneMoving' })}
                >
                  {strings.tiles.doneMoving}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={s.entry === '' || s.entry === '−'}
                  onClick={() => dispatch({ type: 'submit' })}
                >
                  {strings.tiles.check}
                </button>
              )}
            </div>
          </section>
        )}
      </main>
      <div className="visually-hidden" aria-live="assertive">
        {announcement}
      </div>
    </>
  );
}
