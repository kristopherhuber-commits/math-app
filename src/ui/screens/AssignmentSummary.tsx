// Assignment summary (R-SES-7, design.md §7.9, mockup 09): stars earned by topic, as counts and never
// percentages, badges earned during the assignment, and Pip's celebration.
import { useEffect, useRef, useState } from 'react';
import { logError } from '../../data/errors';
import { assignmentSummary, type Summary } from '../../data/progress';
import { StarIcon } from '../components/TopBar';
import { Penguin } from '../mascots/Penguin';
import { Turtle } from '../mascots/Turtle';
import { rewardStrings, topicStrings } from '../strings';

const s = rewardStrings.summary;

export function AssignmentSummary({
  id,
  onHome,
  onFreePractice,
}: {
  id: string;
  onHome: () => void;
  onFreePractice: () => void;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    void assignmentSummary(id)
      .then((r) => (r ? setSummary(r) : onHome()))
      .catch((e: unknown) => {
        void logError('assignmentSummary', e);
        onHome();
      });
  }, [id, onHome]);
  useEffect(() => primaryRef.current?.focus(), [summary]);
  if (!summary) return <main className="summary" />;

  return (
    <main className="summary">
      <section className="card summary-card" aria-labelledby="summary-title">
        <h1 id="summary-title" className="display">
          {s.title}
        </h1>
        <p className="summary-sub">{s.sub(summary.title, summary.questions)}</p>
        <div className="summary-stars" aria-hidden="true">
          <StarIcon size={56} />
          <StarIcon size={68} />
          <StarIcon size={56} />
        </div>
        <p className="summary-totals">{s.totals(summary.stars, summary.shells)}</p>
        <h2 className="visually-hidden">{s.byTopic}</h2>
        <dl className="summary-topics">
          {summary.byTopic.map(({ topic, stars }) => (
            <div key={topic} className="summary-row">
              <dt>{topicStrings.name[topic]}</dt>
              <dd>
                {([3, 2, 1] as const)
                  .filter((n) => stars[n] > 0)
                  .map((n) => (
                    <span key={n} className="summary-count" aria-label={s.rowSpeech(n, stars[n])}>
                      {s.row(n, stars[n])}
                    </span>
                  ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {summary.badges.map((b) => (
        <p key={b} className="summary-badge">
          {rewardStrings.celebrate.badge(rewardStrings.badges[b] ?? b)}
        </p>
      ))}
      <div className="summary-scene">
        <Turtle size={170} className="summary-turtle" />
        <div className="summary-actions">
          {summary.freeOpen && (
            <button ref={primaryRef} type="button" className="btn btn-primary" onClick={onFreePractice}>
              {s.freePractice}
            </button>
          )}
          <button
            {...(summary.freeOpen ? {} : { ref: primaryRef })}
            type="button"
            className={summary.freeOpen ? 'btn btn-link' : 'btn btn-primary'}
            onClick={onHome}
          >
            {s.home}
          </button>
        </div>
        <Penguin pose="cheer" size={140} className="summary-penguin" />
      </div>
    </main>
  );
}
