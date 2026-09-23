// Pip's celebrations (design.md §5 Celebration, mockup 08, R-RWD-5, R-ADP-6): stars pop in, Pip
// cheers (3 ★) or claps (2 ★, 1 ★), "+n shells", "Level up!" and new badges. Under 1.2 s, never
// blocking: Next is focused at once, and a tap anywhere on it skips to the end. Reduced motion: a
// static star row. The streak milestone is full screen and dismissable.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { FinishEvents } from '../../data/progress';
import { Penguin } from '../mascots/Penguin';
import { rewardStrings } from '../strings';
import { color } from '../theme/tokens';
import { StarIcon } from './TopBar';

const CONFETTI = [color.star, color.primary, color.coral, color.turtle, color.beak];

function Confetti() {
  return (
    <span className="confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--d': `${(i % 5) * 60}ms`,
              '--r': `${(i * 53) % 360}deg`,
              background: CONFETTI[i % CONFETTI.length],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function Celebration({
  events,
  reduced,
  showShells,
}: {
  events: FinishEvents;
  reduced: boolean;
  /** False for fixed-level practice, where shells aren't added. */
  showShells: boolean;
}) {
  const [skipped, setSkipped] = useState(false);
  const s = rewardStrings.celebrate;
  const big = events.stars === 3;
  const pose = events.levelUp ? 'hop' : big ? 'cheer' : 'clap';
  const still = reduced || skipped;
  return (
    <div
      className={`celebration stars-${events.stars} ${still ? 'still' : ''}`}
      role="status"
      data-testid="celebration"
      onPointerDown={() => setSkipped(true)}
    >
      <div className="celebration-art" aria-hidden="true">
        {big && !still && <Confetti />}
        <Penguin pose={pose} size={big ? 132 : 104} />
        <span className="celebration-stars">
          {Array.from({ length: events.stars }, (_, i) => (
            <span key={i} className="celebration-star" style={{ '--i': i } as CSSProperties}>
              <StarIcon size={big ? 44 : 34} />
            </span>
          ))}
        </span>
      </div>
      <div className="celebration-text">
        <p className="celebration-title">{s.headline[events.stars]}</p>
        {showShells && <p className="celebration-shells">{s.shells(events.stars)}</p>}
        {events.levelUp !== undefined && <p className="celebration-level">{s.levelUp}</p>}
        {events.badges.map((b) => (
          <p key={b} className="celebration-badge">
            {s.badge(rewardStrings.badges[b] ?? b)}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Full-screen streak milestone (R-RWD-5). Tap, Enter or Esc closes it. */
export function StreakCelebration({ days, onClose }: { days: number; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="streak-overlay" onClick={onClose}>
      <div
        className="streak-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Penguin pose="slide" size={180} className="streak-penguin" />
        <h2 id="streak-title" className="display">
          {rewardStrings.celebrate.streak(days)}
        </h2>
        <p>{rewardStrings.celebrate.streakSub}</p>
        <button ref={closeRef} type="button" className="btn btn-primary" onClick={onClose}>
          {rewardStrings.celebrate.streakClose}
        </button>
      </div>
    </div>
  );
}
