// Number classification (design.md §7.4, mockup 04, R-NC-2…4): six set cards in a fixed order,
// a Sets map reference (not a hint), Help bottom-left and Check bottom-right. Keyboard: Tab to a
// card, Space ticks it, Enter checks, H opens help, Esc closes it (design.md §10).
import { useEffect, useReducer, useRef, useState } from 'react';
import { NC_SETS } from '../../engine/topics/nc/checker';
import { ncHint } from '../../engine/topics/nc/hints';
import { HintPanel } from '../components/HintPanel';
import { Tex } from '../components/Math';
import { FeedbackToast, MathHero } from '../components/Numbers';
import { useSound } from '../sound';
import { NumberWalkthrough } from '../components/NumberWalkthrough';
import { SetCheckbox, SetsMap } from '../components/SetsMap';
import { Turtle } from '../mascots/Turtle';
import { numStrings, numText, strings, topicStrings } from '../strings';
import { ncReducer, startNc } from '../practice/ncReducer';
import { CelebrationSlot, useReportAttempt, type QuestionProps } from '../practice/question';

interface Props extends QuestionProps {
  naturalIncludesZero: boolean;
}

function SetsMapDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sets-map-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 id="sets-map-title" className="title">
          {numStrings.nc.setsMapTitle}
        </h2>
        <SetsMap label={numStrings.nc.setsMapTitle} />
        <div className="actions end">
          <button ref={closeRef} type="button" className="btn btn-outline" onClick={onClose}>
            {numStrings.nc.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NcPractice({ level, seed, naturalIncludesZero, onSave, onSolved, onNext }: Props) {
  const [s, dispatch] = useReducer(ncReducer, undefined, () => startNc(level, seed, naturalIncludesZero));
  const [mapOpen, setMapOpen] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const q = s.question;

  useEffect(() => {
    dispatch({ type: 'naturalIncludesZero', value: naturalIncludesZero });
  }, [naturalIncludesZero]);

  // R-SES-5: save after every answer.
  useReportAttempt(s, onSave, onSolved);

  // design.md §8: one soft low note on "Not quite".
  const play = useSound();
  useEffect(() => {
    if (s.feedback) play('notQuite');
  }, [s.feedback, play]);

  useEffect(() => {
    if (s.solved && !s.walk) nextRef.current?.focus();
  }, [s.solved, s.walk]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        dispatch({ type: 'closeHint' });
        setMapOpen(false);
      } else if (e.key === 'h' || e.key === 'H') dispatch({ type: 'help' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const next = onNext;
  const flaggedNow = s.flagged.length > 0;

  return (
    <>
      <main className="practice number-practice">
        {s.walk ? (
          <NumberWalkthrough
            steps={s.walk.steps}
            index={s.walk.index}
            solved={s.solved}
            setsNumber={q.shown.latex}
            onNext={() => dispatch({ type: 'walkNext' })}
            onBack={() => dispatch({ type: 'walkBack' })}
            onNextQuestion={next}
          />
        ) : (
          <section className="card question-card" aria-labelledby="prompt">
            <span className="chip">{topicStrings.chip('NC', level)}</span>
            <h1 id="prompt" className="prompt">
              {numStrings.nc.prompt}
            </h1>
            <div className="nc-hero-row">
              <MathHero shown={q.shown} />
              <button type="button" className="sets-preview" onClick={() => setMapOpen(true)}>
                <span className="label">{numStrings.nc.setsMap}</span>
                <SetsMap compact label={numStrings.nc.setsMap} />
              </button>
            </div>

            <div className="set-grid" role="group" aria-label={numStrings.nc.sets}>
              {NC_SETS.map((set) => (
                <SetCheckbox
                  key={set}
                  set={set}
                  on={s.ticked.includes(set)}
                  flagged={s.flagged.includes(set)}
                  disabled={s.solved}
                  naturalIncludesZero={s.naturalIncludesZero}
                  onToggle={() => dispatch({ type: 'toggle', set })}
                  onEnter={() => dispatch({ type: 'check' })}
                />
              ))}
            </div>

            <div aria-live="polite" className="live">
              {s.feedback && !s.solved && (
                <FeedbackToast
                  key={s.feedback.key}
                  {...(flaggedNow ? { extra: numStrings.nc.flagged } : {})}
                />
              )}
              {s.solved && <CelebrationSlot />}
            </div>

            {s.hintOpen && s.hintTier > 0 && !s.solved && (
              <HintPanel
                tier={s.hintTier as 1 | 2}
                body={<Tex text={numText(ncHint(q, s.hintTier as 1 | 2, s.naturalIncludesZero))} />}
                walkOffered={s.walkOffered}
                onMore={() => dispatch({ type: 'moreHint' })}
                onClose={() => dispatch({ type: 'closeHint' })}
                onShowMe={() => dispatch({ type: 'walkStart' })}
              />
            )}

            <div className="actions">
              {!s.solved ? (
                <span className="actions-left">
                  <button
                    type="button"
                    className={`btn btn-help ${s.helpPulse ? 'pulsing' : ''}`}
                    onClick={() => dispatch({ type: 'help' })}
                  >
                    <Turtle size={44} /> {strings.practice.help}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setMapOpen(true)}>
                    {numStrings.nc.setsMap}
                  </button>
                </span>
              ) : (
                <span />
              )}
              {s.solved ? (
                <button ref={nextRef} type="button" className="btn btn-primary" onClick={next}>
                  {strings.practice.next}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-check"
                  disabled={s.ticked.length === 0}
                  onClick={() => dispatch({ type: 'check' })}
                >
                  {numStrings.check}
                </button>
              )}
            </div>
            <p className="keypad-note">{numStrings.nc.keyboard}</p>
          </section>
        )}
      </main>
      {mapOpen && <SetsMapDialog onClose={() => setMapOpen(false)} />}
    </>
  );
}
