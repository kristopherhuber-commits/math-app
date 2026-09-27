// Number classification (design.md §7.4, mockup 04, R-NC-2…4): five set cards in a fixed order, one
// of them the answer (the smallest set, M7), a Sets map reference (not a hint), Help bottom-left and
// Check bottom-right. Keyboard: 1–5 or Space choose, Enter checks, H opens help, Esc closes it
// (design.md §10).
import { useEffect, useReducer, useRef, useState } from 'react';
import { NC_SETS } from '../../engine/topics/nc/checker';
import { ncHint } from '../../engine/topics/nc/hints';
import { HintPanel } from '../components/HintPanel';
import { Tex } from '../components/Math';
import { FeedbackToast, MathHero } from '../components/Numbers';
import { useSound } from '../sound';
import { NumberWalkthrough } from '../components/NumberWalkthrough';
import { SetCard, SetsMap } from '../components/SetsMap';
import { Turtle } from '../mascots/Turtle';
import { numStrings, numText, strings, topicStrings } from '../strings';
import { ncReducer, startNc } from '../practice/ncReducer';
import { CelebrationSlot, useReportAttempt, type QuestionProps } from '../practice/question';

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

export function NcPractice({ level, seed, onSave, onSolved, onNext }: QuestionProps) {
  const [s, dispatch] = useReducer(ncReducer, undefined, () => startNc(level, seed));
  const [mapOpen, setMapOpen] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const q = s.question;

  // R-SES-5: save after every answer.
  useReportAttempt(s, onSave, onSolved);

  // design.md §8: one soft low note on "Not quite".
  const play = useSound();
  useEffect(() => {
    if (s.selected !== null) play('select');
  }, [s.selected, play]);
  useEffect(() => {
    if (s.feedback) play('notQuite');
  }, [s.feedback, play]);

  useEffect(() => {
    if (s.solved && !s.walk) nextRef.current?.focus();
  }, [s.solved, s.walk]);

  // Keyboard paths (design.md §10): 1–5 choose a card, like multiple choice.
  const state = useRef(s);
  useEffect(() => {
    state.current = s;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const cur = state.current;
      if (e.key === 'Escape') {
        dispatch({ type: 'closeHint' });
        setMapOpen(false);
      } else if (e.key === 'h' || e.key === 'H') dispatch({ type: 'help' });
      else if (/^[1-5]$/.test(e.key) && !cur.walk && !cur.solved) {
        const set = NC_SETS[Number(e.key) - 1];
        if (set) dispatch({ type: 'select', set });
      } else if (e.key === 'Enter' && !cur.walk && !cur.solved) {
        // Enter on a focused button presses that button (a set card checks itself); elsewhere it means Check.
        if (!(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          dispatch({ type: 'check' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const next = onNext;

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

            <div className="set-grid" role="radiogroup" aria-label={numStrings.nc.sets}>
              {NC_SETS.map((set, i) => {
                const justTried = s.feedback !== null && s.tried.at(-1) === set;
                return (
                  <SetCard
                    key={justTried ? `${set}-${s.feedback!.key}` : set}
                    set={set}
                    n={i + 1}
                    selected={s.selected === set}
                    tried={s.tried.includes(set)}
                    correct={s.solved && !s.walk && set === s.attempt.tries.at(-1)?.answer}
                    shake={justTried}
                    disabled={s.solved}
                    onSelect={() => dispatch({ type: 'select', set })}
                    onEnter={() => dispatch({ type: 'check' })}
                  />
                );
              })}
            </div>

            <div aria-live="polite" className="live">
              {s.feedback && !s.solved && <FeedbackToast code={s.feedback.code} />}
              {s.solved && <CelebrationSlot />}
            </div>

            {s.hintOpen && s.hintTier > 0 && !s.solved && (
              <HintPanel
                tier={s.hintTier as 1 | 2}
                body={<Tex text={numText(ncHint(q, s.hintTier as 1 | 2))} />}
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
                  disabled={s.selected === null}
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
