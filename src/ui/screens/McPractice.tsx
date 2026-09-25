// Multiple-choice question screen for RD, FDP and PC (design.md §3.2, §6.1, mockups 02, 03, 12).
// Help is always bottom-left and Check bottom-right. Keyboard: 1–5 choose, Enter checks, H opens
// help, Esc closes it (design.md §10).
import { useEffect, useReducer, useRef } from 'react';
import type { McTopic } from '../../engine/topics/mc';
import { HintPanel } from '../components/HintPanel';
import { Tex } from '../components/Math';
import { FeedbackToast, MathHero, McOptionCard } from '../components/Numbers';
import { NumberWalkthrough } from '../components/NumberWalkthrough';
import { Turtle } from '../mascots/Turtle';
import { numStrings, numText, strings, topicStrings } from '../strings';
import { MC_TOPICS, mcReducer, startMc } from '../practice/mcReducer';
import { CelebrationSlot, useReportAttempt, type QuestionProps } from '../practice/question';
import { useSound } from '../sound';

interface Props extends QuestionProps {
  topic: McTopic;
  currency: string;
}

export function McPractice({ topic, level, seed, currency, onSave, onSolved, onNext }: Props) {
  const [s, dispatch] = useReducer(mcReducer, undefined, () => startMc(topic, level, seed, currency));
  const nextRef = useRef<HTMLButtonElement>(null);
  const q = s.question;

  // R-SES-5: save after every answer.
  useReportAttempt(s, onSave, onSolved);

  // design.md §8: a tick on choosing, one soft low note on "Not quite".
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

  // Keyboard paths (design.md §10).
  const state = useRef(s);
  useEffect(() => {
    state.current = s;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const cur = state.current;
      if (e.key === 'Escape') dispatch({ type: 'closeHint' });
      else if (e.key === 'h' || e.key === 'H') dispatch({ type: 'help' });
      else if (/^[1-5]$/.test(e.key) && !cur.walk && !cur.solved) {
        const o = cur.question.options[Number(e.key) - 1];
        if (o) dispatch({ type: 'select', id: o.id });
      } else if (e.key === 'Enter' && !cur.walk && !cur.solved) {
        // Enter on a focused button presses that button; elsewhere it means Check.
        if (!(e.target instanceof HTMLButtonElement) || e.target.classList.contains('mc-option')) {
          e.preventDefault();
          dispatch({ type: 'check' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Long repeating decimals need wider cards (see .mc-grid.wide).
  const wide = q.options.some((o) => (o.shown.text.split(' = ')[0] ?? '').length > 11);
  const next = onNext;

  return (
    <main className="practice number-practice">
      {s.walk ? (
        <NumberWalkthrough
          steps={s.walk.steps}
          index={s.walk.index}
          solved={s.solved}
          onNext={() => dispatch({ type: 'walkNext' })}
          onBack={() => dispatch({ type: 'walkBack' })}
          onNextQuestion={next}
        />
      ) : (
        <section className="card question-card" aria-labelledby="prompt">
          <span className={`chip ${topic === 'PC' ? 'chip-pc' : ''}`}>{topicStrings.chip(topic, level)}</span>
          <h1 id="prompt" className="prompt">
            <Tex text={numText(q.prompt)} />
          </h1>
          {q.hero && <MathHero shown={q.hero} />}
          {q.heroLine && (
            <p className="money-hero" aria-hidden="true">
              {numText(q.heroLine)}
            </p>
          )}

          <div className={`mc-grid ${wide ? 'wide' : ''}`} role="radiogroup" aria-labelledby="prompt">
            {q.options.map((o, i) => {
              const justTried = s.feedback !== null && s.tried.at(-1) === o.id;
              return (
                <McOptionCard
                  key={justTried ? `${o.id}-${s.feedback!.key}` : o.id}
                  option={o}
                  n={i + 1}
                  selected={s.selected === o.id}
                  tried={s.tried.includes(o.id)}
                  correct={s.solved && o.code === 'correct'}
                  shake={justTried}
                  disabled={s.solved}
                  onSelect={() => dispatch({ type: 'select', id: o.id })}
                />
              );
            })}
          </div>

          <div aria-live="polite" className="live">
            {s.feedback && !s.solved && <FeedbackToast code={s.feedback.code} kind={q.kind} />}
            {s.solved && <CelebrationSlot />}
          </div>

          {s.hintOpen && s.hintTier > 0 && !s.solved && (
            <HintPanel
              tier={s.hintTier as 1 | 2}
              body={<Tex text={numText(MC_TOPICS[topic].hint(q, s.hintTier as 1 | 2))} />}
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
          <p className="keypad-note">{numStrings.mcKeyboard}</p>
        </section>
      )}
    </main>
  );
}
