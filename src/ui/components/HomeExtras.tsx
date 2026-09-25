// Home extras (M6): shells on the sand, dressing up the mascots (R-RWD-4 cosmetics), and the badge
// shelf (R-RWD-3, design.md §7 "screens not mocked").
import { useState } from 'react';
import { config } from '../../engine/config';
import { cosmetic, nextCosmetic, type Cosmetic } from '../../engine/rewards';
import { logError } from '../../data/errors';
import { setWorn } from '../../data/rewards';
import { useSettings } from '../settings';
import { rewardStrings } from '../strings';
import { useWardrobe } from '../wardrobe';

const h = rewardStrings.home;

/** Fixed spots on the sand (percent of the beach), filled in order. */
const SPOTS: readonly [number, number][] = [
  [40, 72],
  [55, 76],
  [30, 78],
  [66, 70],
  [48, 80],
  [22, 72],
  [74, 78],
  [36, 66],
  [60, 82],
  [14, 80],
  [82, 74],
  [52, 66],
];

/** Shells to spend, drawn on the sand (up to 12, design.md §7.1). */
export function BeachShells({ count }: { count: number }) {
  const n = Math.min(count, config.beachShellsMax);
  return (
    <span className="beach-shells" aria-hidden="true">
      {SPOTS.slice(0, n).map(([x, y], i) => (
        <svg
          key={i}
          className="beach-shell"
          viewBox="-10 -10 20 20"
          width="22"
          height="22"
          style={{ left: `${x}%`, top: `${y}%`, rotate: `${((i * 47) % 60) - 30}deg` }}
        >
          <path d="M0,8 L8,-6 Q0,-10 -8,-6 Z" />
          <path d="M0,8 L-3,-7 M0,8 L0,-8 M0,8 L3,-7" className="beach-shell-ridge" />
        </svg>
      ))}
    </span>
  );
}

/** Put on or take off the unlocked cosmetics; the next one to unlock is shown as a goal. */
export function DressUp({ unlocked, lifetime }: { unlocked: readonly string[]; lifetime: number }) {
  const { worn, refresh } = useWardrobe();
  const names = useSettings().mascotNames;
  const [busy, setBusy] = useState(false);
  const next = nextCosmetic(lifetime);
  const label = (c: Cosmetic) => h.accessoryFor(names[c.mascot], rewardStrings.accessory[c.kind] ?? c.kind);
  return (
    <section className="card dress-up" aria-labelledby="dress-title">
      <h2 id="dress-title" className="title">
        {h.dressUp}
      </h2>
      {unlocked.length === 0 && <p className="muted">{h.dressUpNone}</p>}
      <div className="dress-grid">
        {unlocked.map((id) => {
          const c = cosmetic(id);
          if (!c) return null;
          const on = worn.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`dress-item ${on ? 'on' : ''}`}
              aria-pressed={on}
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void setWorn(id, !on)
                  .then(refresh)
                  .catch((e: unknown) => logError('setWorn', e))
                  .finally(() => setBusy(false));
              }}
            >
              {label(c)}
            </button>
          );
        })}
      </div>
      {next && <p className="label muted">{h.nextAccessory(label(next))}</p>}
    </section>
  );
}

/** Badges earned, and the rest greyed out (R-RWD-3). */
export function BadgeShelf({ earned }: { earned: readonly string[] }) {
  const all = Object.keys(rewardStrings.badges);
  return (
    <section className="card badge-shelf" aria-labelledby="badges-title">
      <h2 id="badges-title" className="title">
        {h.badges(earned.length, all.length)}
      </h2>
      <ul className="badge-grid">
        {all.map((id) => {
          const got = earned.includes(id);
          return (
            <li key={id} className={`badge-item ${got ? 'earned' : 'locked'}`}>
              <span className="badge-medal" aria-hidden="true">
                {got ? '★' : '☆'}
              </span>
              <span>{rewardStrings.badges[id]}</span>
              <span className="visually-hidden">{got ? h.badgeEarned : h.badgeToGet}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
