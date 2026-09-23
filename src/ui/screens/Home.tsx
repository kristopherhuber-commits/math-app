// Home (design.md §7.1, mockup 01): streak and shells, today's assignment with its progress
// (R-SES-5: Keep going resumes where the learner left off), Pip and Shelly on the beach, and the
// free-practice topic tiles, locked until the assignment is done (R-SES-6). No percentages.
import { useEffect, useRef, useState } from 'react';
import { TOPICS, type TopicId } from '../../engine/config';
import { homeSnapshot, type HomeSnapshot } from '../../data/progress';
import { MathText } from '../components/Math';
import { ShellIcon } from '../components/TopBar';
import { Penguin } from '../mascots/Penguin';
import { Turtle } from '../mascots/Turtle';
import { rewardStrings, strings, topicStrings } from '../strings';

const h = rewardStrings.home;

function StreakIcon() {
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" aria-hidden="true" className="streak-icon">
      <path d="M3 20 Q12 -2 22 14 Q32 -2 41 20" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="lock-icon">
      <path className="lock-shackle" d="M5 12V8a6 6 0 0 1 12 0v4" />
      <rect x="2" y="11" width="18" height="14" rx="3" />
    </svg>
  );
}

function AssignmentCard({ snap, onStart }: { snap: HomeSnapshot; onStart: (id: string) => void }) {
  const a = snap.assignment;
  if (!a || !snap.progress)
    return (
      <section className="card assignment-card" aria-labelledby="assignment-title">
        <p className="overline accent">{h.assignment}</p>
        <h2 id="assignment-title" className="title">
          {h.none}
        </h2>
        <p className="muted">{h.noneSub}</p>
      </section>
    );
  const p = snap.progress;
  return (
    <section className="card assignment-card" aria-labelledby="assignment-title">
      <p className="overline accent">{h.assignment}</p>
      <h2 id="assignment-title" className="title">
        {a.title ?? h.defaultTitle}
      </h2>
      <ul className="assignment-items">
        {a.items.map((it, i) => {
          const done = p.done[i] ?? 0;
          const finished = done >= it.count;
          return (
            <li key={i} className={`assignment-item ${finished ? 'done' : ''}`}>
              <span className="assignment-item-name">{topicStrings.name[it.topic]}</span>
              <span className="assignment-item-count">
                {h.item(done, it.count)}
                {finished && <span aria-label={h.itemDone}> ✓</span>}
              </span>
              <span className="progress-track" aria-hidden="true">
                <span className="progress-fill" style={{ width: `${(100 * done) / it.count}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="assignment-actions">
        <button type="button" className="btn btn-primary" onClick={() => onStart(a.id)}>
          {p.doneTotal === 0 ? h.start : h.keepGoing}
        </button>
        <span className="label muted">{h.done(p.doneTotal, p.total)}</span>
      </div>
    </section>
  );
}

function Beach({ snap }: { snap: HomeSnapshot }) {
  const a = snap.assignment;
  const next =
    a && snap.progress ? a.items.find((it, i) => (snap.progress!.done[i] ?? 0) < it.count) : undefined;
  const line = next
    ? h.pipToday(topicStrings.name[next.topic])
    : snap.streak > 0
      ? h.pipStreak(snap.streak)
      : h.pipFree;
  return (
    <section className="beach" aria-label={line}>
      <div className="speech">
        <p className="speech-title">{line}</p>
        <p className="speech-sub">{h.shelly}</p>
      </div>
      <span className="sand" aria-hidden="true" />
      <Turtle size={150} className="beach-turtle" />
      <Penguin size={110} className="beach-penguin" />
    </section>
  );
}

export function Home({
  onStartAssignment,
  onFreePractice,
  notice,
  focusFree = false,
}: {
  onStartAssignment: (id: string) => void;
  onFreePractice: (topic: TopicId) => void;
  /** A message for the parent, e.g. an unreadable assignment link. */
  notice?: string | undefined;
  /** Coming from the summary's "Free practice ›": focus the first topic tile. */
  focusFree?: boolean;
}) {
  const [snap, setSnap] = useState<HomeSnapshot | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (snap && focusFree)
      gridRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [snap, focusFree]);
  useEffect(() => {
    void homeSnapshot()
      .then(setSnap)
      .catch((e: unknown) => {
        console.error('homeSnapshot failed', e);
        setSnap({ shells: 0, streak: 0, freeOpen: true });
      });
  }, []);
  if (!snap) return <main className="home" />;

  return (
    <main className="home">
      <header className="home-header">
        <div>
          <h1 className="display">{strings.home.greeting}</h1>
          <p className="home-intro">{strings.home.intro}</p>
        </div>
        <div className="home-counters">
          <span className="home-counter">
            <StreakIcon />
            <span>
              <strong>{h.streak(snap.streak)}</strong>
              <span className="label muted">{h.streakLabel}</span>
            </span>
          </span>
          <span className="home-counter">
            <ShellIcon size={40} />
            <span>
              <strong>{snap.shells}</strong>
              <span className="label muted">{h.shellsLabel}</span>
            </span>
          </span>
        </div>
      </header>
      {notice && (
        <p className="home-notice" role="status">
          {notice}
        </p>
      )}

      <div className="home-main">
        <AssignmentCard snap={snap} onStart={onStartAssignment} />
        <Beach snap={snap} />
      </div>

      <section aria-labelledby="free-title">
        <div className="free-heading">
          <h2 id="free-title" className="title">
            {h.freePractice}
          </h2>
          {!snap.freeOpen && (
            <span id="free-note" className="label muted">
              {snap.assignment ? h.freeLocked : h.freeNever}
            </span>
          )}
        </div>
        <div className="topic-grid" ref={gridRef}>
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              className={`topic-tile ${snap.freeOpen ? '' : 'locked'}`}
              disabled={!snap.freeOpen}
              aria-label={snap.freeOpen ? topicStrings.name[t] : h.locked(topicStrings.name[t])}
              {...(snap.freeOpen ? {} : { 'aria-describedby': 'free-note' })}
              onClick={() => onFreePractice(t)}
            >
              {!snap.freeOpen && <LockIcon />}
              <span className="topic-glyph" aria-hidden="true">
                <MathText latex={topicStrings.glyph[t]} />
              </span>
              <span className="topic-name">{topicStrings.name[t]}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
