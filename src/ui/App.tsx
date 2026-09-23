import { useEffect, useState } from 'react';
import { config, TOPICS, type TopicId } from '../engine/config';
import { parseAssignmentLink } from '../engine/session';
import { numberSettings } from '../data/attempts';
import { addAssignmentFromLink } from '../data/progress';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './screens/Home';
import { Session, type SessionKind } from './screens/Session';
import { rewardStrings } from './strings';
import './ui.css';
import './tiles.css';
import './numbers.css';
import './rewards.css';

type Route =
  | { name: 'home'; key: number }
  | { name: 'session'; kind: SessionKind; key: number }
  | { name: 'summary'; id: string };

/**
 * `?topic=RD&level=3&seed=42` opens a fixed level; `?level=3` alone opens EQ, as before (tests and
 * bug reports, R-ARCH-3). They don't change adaptive levels or rewards.
 */
function initialRoute(): Route {
  const q = new URLSearchParams(window.location.search);
  const topic = (q.get('topic') ?? 'EQ').toUpperCase() as TopicId;
  const level = Number(q.get('level'));
  const seed = q.get('seed');
  if (
    !q.has('assign') &&
    TOPICS.includes(topic) &&
    Number.isInteger(level) &&
    level >= 1 &&
    level <= config.levels[topic]
  ) {
    return {
      name: 'session',
      kind: { kind: 'fixed', topic, level, ...(seed !== null ? { seed: Number(seed) >>> 0 } : {}) },
      key: 0,
    };
  }
  return { name: 'home', key: 0 };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [notice] = useState<string | undefined>(() => {
    const q = new URLSearchParams(window.location.search);
    return q.has('assign') && !parseAssignmentLink(Object.fromEntries(q))
      ? rewardStrings.home.badLink
      : undefined;
  });
  const [settings, setSettings] = useState<{ currency: string; naturalIncludesZero: boolean }>({
    currency: config.settings.currency,
    naturalIncludesZero: config.settings.naturalIncludesZero,
  });
  useEffect(() => {
    void numberSettings().then(setSettings);
  }, []);

  // Until the parent area (M5): `?assign=EQ:10,PC:5@2&order=mixed&title=…` queues an assignment
  // (R-SES-1/2). The query is removed at once, so a reload doesn't add it again.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('assign')) return;
    window.history.replaceState(null, '', window.location.pathname);
    const link = parseAssignmentLink(Object.fromEntries(q));
    const refresh = () => setRoute({ name: 'home', key: Date.now() });
    if (!link) return;
    void addAssignmentFromLink(link)
      .then(refresh)
      .catch((e: unknown) => console.error('addAssignmentFromLink failed', e));
  }, []);

  const home = () => setRoute({ name: 'home', key: Date.now() });
  const start = (kind: SessionKind) => setRoute({ name: 'session', kind, key: Date.now() });

  const screen = () => {
    switch (route.name) {
      case 'home':
      case 'summary':
        return (
          <Home
            key={route.name === 'home' ? route.key : route.id}
            notice={notice}
            onStartAssignment={(id) => start({ kind: 'assignment', id })}
            onFreePractice={(topic) => start({ kind: 'free', topic })}
          />
        );
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
