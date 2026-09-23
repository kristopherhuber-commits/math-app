// StepRail (design.md §5): Move / Simplify / Solve, each todo, active or done.
import { strings } from '../strings';

export type RailStep = 'MOVE' | 'SIMPLIFY' | 'SOLVE';
const ORDER: RailStep[] = ['MOVE', 'SIMPLIFY', 'SOLVE'];

export function StepRail({ active }: { active: RailStep | 'DONE' }) {
  const at = active === 'DONE' ? ORDER.length : ORDER.indexOf(active);
  return (
    <nav className="card step-rail" aria-label={strings.tiles.steps}>
      <div className="overline">{strings.tiles.steps}</div>
      <ol>
        {ORDER.map((step, i) => {
          const state = i < at ? 'done' : i === at ? 'active' : 'todo';
          const [name, sub] = strings.tiles.rail[step]!;
          return (
            <li
              key={step}
              className={`rail-item ${state}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className="rail-num" aria-hidden="true">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span>
                <span className="rail-name">{name}</span>
                <span className="rail-sub">{sub}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
