import { useEffect, useState } from 'react';
import { config } from '../engine/config';
import { numberSettings } from '../data/attempts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EquationPractice } from './screens/EquationPractice';
import { Home } from './screens/Home';
import { McPractice } from './screens/McPractice';
import { NcPractice } from './screens/NcPractice';
import { TileEquation } from './screens/TileEquation';
import { isTileLevel } from './practice/tileReducer';
import type { TopicKey } from './strings';
import './ui.css';
import './tiles.css';
import './numbers.css';

type Route =
  { name: 'home' } | { name: 'practice'; topic: TopicKey; level: number; seed?: number; key: number };

const TOPICS: readonly TopicKey[] = ['NC', 'RD', 'FDP', 'PC', 'EQ'];

/**
 * `?topic=RD&level=3&seed=42` opens a specific question; `?level=3` alone opens EQ, as before (used
 * by e2e tests and bug reports, R-ARCH-3).
 */
function initialRoute(): Route {
  const q = new URLSearchParams(window.location.search);
  const topic = (q.get('topic') ?? 'EQ').toUpperCase() as TopicKey;
  const level = Number(q.get('level'));
  const seed = q.get('seed');
  if (TOPICS.includes(topic) && Number.isInteger(level) && level >= 1 && level <= config.levels[topic]) {
    return { name: 'practice', topic, level, key: 0, ...(seed !== null ? { seed: Number(seed) >>> 0 } : {}) };
  }
  return { name: 'home' };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [settings, setSettings] = useState<{ currency: string; naturalIncludesZero: boolean }>({
    currency: config.settings.currency,
    naturalIncludesZero: config.settings.naturalIncludesZero,
  });
  useEffect(() => {
    void numberSettings().then(setSettings);
  }, []);
  const home = () => setRoute({ name: 'home' });

  const screen = () => {
    if (route.name === 'home')
      return (
        <Home onStart={(topic, level) => setRoute({ name: 'practice', topic, level, key: Date.now() })} />
      );
    const seed = route.seed !== undefined ? { seed: route.seed } : {};
    switch (route.topic) {
      case 'NC':
        return (
          <NcPractice
            key={route.key}
            level={route.level}
            {...seed}
            naturalIncludesZero={settings.naturalIncludesZero}
            onHome={home}
          />
        );
      case 'RD':
      case 'FDP':
      case 'PC':
        return (
          <McPractice
            key={route.key}
            topic={route.topic}
            level={route.level}
            {...seed}
            currency={settings.currency}
            onHome={home}
          />
        );
      case 'EQ':
        // R-ANS-5: levels 1–2 use the tile builder, levels 3+ typed steps.
        return isTileLevel(route.level) ? (
          <TileEquation key={route.key} level={route.level} {...seed} onHome={home} />
        ) : (
          <EquationPractice key={route.key} level={route.level} {...seed} onHome={home} />
        );
    }
  };

  return (
    <ErrorBoundary
      onReset={() =>
        setRoute((r) =>
          r.name === 'practice' ? { name: 'practice', topic: r.topic, level: r.level, key: r.key + 1 } : r,
        )
      }
    >
      {screen()}
    </ErrorBoundary>
  );
}
