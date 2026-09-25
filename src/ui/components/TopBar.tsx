// TopBar (design.md §5, mockup 08): ‹ Home, the topic, "Question n of N" with a progress track,
// and the star and shell counters, which pulse when they go up.
import { useState, type ReactNode } from 'react';
import { rewardStrings, strings } from '../strings';

export function StarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="star-icon">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

export function ShellIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shell-icon">
      <path d="M12 3C6.5 3 3 7.8 3 12.5c0 2.3 1.2 4.3 2.9 5.4L8 21h8l2.1-3.1c1.7-1.1 2.9-3.1 2.9-5.4C21 7.8 17.5 3 12 3z" />
      <path
        className="shell-ribs"
        d="M12 5v14M8.2 6.2L9.6 19M15.8 6.2L14.4 19M5.4 9.2l2.7 9.4M18.6 9.2l-2.7 9.4"
      />
    </svg>
  );
}

/** A counter pill: the number rolls up and the icon pulses when it goes up (design.md §5; reduced motion: neither). */
export function Counter({ value, label, icon }: { value: number; label: string; icon: ReactNode }) {
  const [initial] = useState(value);
  return (
    <span className="counter-pill" aria-label={label} role="status">
      <span key={value} className={value !== initial ? 'counter-icon bumped' : 'counter-icon'}>
        {icon}
      </span>
      <span
        key={value}
        className={value !== initial ? 'counter-value bumped' : 'counter-value'}
        aria-hidden="true"
      >
        {value}
      </span>
    </span>
  );
}

export interface TopBarProgress {
  n: number;
  total?: number;
}

export function TopBar({
  title,
  progress,
  stars,
  shells,
  onHome,
}: {
  title: string;
  progress: TopBarProgress;
  stars: number;
  shells: number;
  onHome: () => void;
}) {
  const { n, total } = progress;
  return (
    <header className="topbar">
      <button type="button" className="btn btn-outline btn-small" onClick={onHome}>
        {strings.topBar.home}
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-progress">
        <span className="label">{rewardStrings.topBar.question(n, total)}</span>
        {total !== undefined && (
          <span
            className="progress-track"
            role="progressbar"
            aria-label={rewardStrings.topBar.progress}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={n}
          >
            <span className="progress-fill" style={{ width: `${(100 * n) / total}%` }} />
          </span>
        )}
      </span>
      <span className="topbar-counters">
        <Counter value={stars} label={rewardStrings.topBar.stars(stars)} icon={<StarIcon />} />
        <Counter value={shells} label={rewardStrings.topBar.shells(shells)} icon={<ShellIcon />} />
      </span>
    </header>
  );
}
