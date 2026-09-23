import { useState } from 'react';
import { config } from '../engine/config';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EquationPractice } from './screens/EquationPractice';
import { Home } from './screens/Home';
import { TileEquation } from './screens/TileEquation';
import { isTileLevel } from './practice/tileReducer';
import './ui.css';
import './tiles.css';

type Route = { name: 'home' } | { name: 'practice'; level: number; seed?: number; key: number };

/** `?level=3&seed=42` opens a specific question (used by e2e tests and bug reports, R-ARCH-3). */
function initialRoute(): Route {
  const q = new URLSearchParams(window.location.search);
  const level = Number(q.get('level'));
  const seed = q.get('seed');
  if (Number.isInteger(level) && level >= 1 && level <= config.eq.levels) {
    return { name: 'practice', level, key: 0, ...(seed !== null ? { seed: Number(seed) >>> 0 } : {}) };
  }
  return { name: 'home' };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const home = () => setRoute({ name: 'home' });
  return (
    <ErrorBoundary
      onReset={() =>
        setRoute((r) => (r.name === 'practice' ? { name: 'practice', level: r.level, key: r.key + 1 } : r))
      }
    >
      {route.name === 'home' ? (
        <Home onStart={(level) => setRoute({ name: 'practice', level, key: Date.now() })} />
      ) : isTileLevel(route.level) ? (
        // R-ANS-5: levels 1–2 use the tile builder, levels 3+ typed steps.
        <TileEquation
          key={route.key}
          level={route.level}
          {...(route.seed !== undefined ? { seed: route.seed } : {})}
          onHome={home}
        />
      ) : (
        <EquationPractice
          key={route.key}
          level={route.level}
          {...(route.seed !== undefined ? { seed: route.seed } : {})}
          onHome={home}
        />
      )}
    </ErrorBoundary>
  );
}
