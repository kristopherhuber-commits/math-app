import { useEffect, useState } from 'react';
import { config, TOPICS, type TopicId } from '../engine/config';
import { numberSettings } from '../data/attempts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './screens/Home';
import { Session, type SessionKind } from './screens/Session';
import './ui.css';
import './tiles.css';
import './numbers.css';
import './rewards.css';

type Route =
  { name: 'home' } | { name: 'session'; kind: SessionKind; key: number } | { name: 'summary'; id: string };

/**
 * `?topic=RD&level=3&seed=42` opens a fixed level; `?level=3` alone opens EQ, as before (tests and
 * bug reports, R-ARCH-3). They don't change adaptive levels or rewards.
 */
function initialRoute(): Route {
  const q = new URLSearchParams(window.location.search);
  const topic = (q.get('topic') ?? 'EQ').toUpperCase() as TopicId;
  const level = Number(q.get('level'));
  const seed = q.get('seed');
  if (TOPICS.includes(topic) && Number.isInteger(level) && level >= 1 && level <= config.levels[topic]) {
    return {
      name: 'session',
      kind: { kind: 'fixed', topic, level, ...(seed !== null ? { seed: Number(seed) >>> 0 } : {}) },
      key: 0,
    };
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
  const start = (kind: SessionKind) => setRoute({ name: 'session', kind, key: Date.now() });

  const screen = () => {
    switch (route.name) {
      case 'home':
        return <Home onStart={(topic, level) => start({ kind: 'fixed', topic, level })} />;
      case 'summary':
        return <Home onStart={(topic, level) => start({ kind: 'fixed', topic, level })} />;
      case 'session':
        return (
          <Session
            key={route.key}
            kind={route.kind}
            {...settings}
            onHome={home}
            onSummary={(id) => setRoute({ name: 'summary', id })}
          />
        );
    }
  };

  return (
    <ErrorBoundary onReset={() => setRoute((r) => (r.name === 'session' ? { ...r, key: r.key + 1 } : r))}>
      {screen()}
    </ErrorBoundary>
  );
}
