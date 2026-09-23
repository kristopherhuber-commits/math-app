import { useCallback, useEffect, useState } from 'react';
import { config, TOPICS, type TopicId } from '../engine/config';
import type { Settings } from '../data/db';
import { logError } from '../data/errors';
import { defaultSettings, isSetUp, loadSettings } from '../data/settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AssignmentSummary } from './screens/AssignmentSummary';
import { Home } from './screens/Home';
import { Session, type SessionKind } from './screens/Session';
import { Setup } from './screens/Setup';
import { ParentArea } from './parent/ParentArea';
import { SettingsProvider } from './settings';
import './ui.css';
import './tiles.css';
import './numbers.css';
import './rewards.css';
import './parent.css';

type Route =
  | { name: 'loading' }
  | { name: 'setup' }
  | { name: 'home'; key: number; focusFree?: boolean }
  | { name: 'session'; kind: SessionKind; key: number }
  | { name: 'summary'; id: string }
  | { name: 'parent' };

/**
 * `?topic=RD&level=3&seed=42` opens a fixed level; `?level=3` alone opens EQ, as before (the parent,
 * tests and bug reports, R-ARCH-3). They don't change adaptive levels or rewards, and they skip the
 * first-run setup. Everything else waits for the setup check.
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
  return { name: 'loading' };
}

export function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const reloadSettings = useCallback(
    () =>
      loadSettings()
        .then(setSettings)
        .catch((e: unknown) => logError('loadSettings', e)),
    [],
  );
  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);
  // R-PAR-5 / R-NF-3: the parent's "reduce motion" switch works like the OS setting in CSS too.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', settings.reduceMotion);
  }, [settings.reduceMotion]);

  // First run (R-PAR-1): the parent sets a PIN before anything else.
  useEffect(() => {
    if (route.name !== 'loading') return;
    void isSetUp()
      .catch((e: unknown) => {
        void logError('isSetUp', e);
        return true;
      })
      .then((ok) => setRoute(ok ? { name: 'home', key: Date.now() } : { name: 'setup' }));
  }, [route.name]);

  const home = useCallback(() => setRoute({ name: 'home', key: Date.now() }), []);
  const start = (kind: SessionKind) => setRoute({ name: 'session', kind, key: Date.now() });

  const screen = () => {
    switch (route.name) {
      case 'loading':
        return <main className="home" />;
      case 'setup':
        return <Setup onDone={() => void reloadSettings().then(home)} />;
      case 'summary':
        return (
          <AssignmentSummary
            id={route.id}
            onHome={home}
            onFreePractice={() => setRoute({ name: 'home', key: Date.now(), focusFree: true })}
          />
        );
      case 'home':
        return (
          <Home
            key={route.key}
            focusFree={route.focusFree ?? false}
            onStartAssignment={(id) => start({ kind: 'assignment', id })}
            onFreePractice={(topic) => start({ kind: 'free', topic })}
            onParent={() => setRoute({ name: 'parent' })}
          />
        );
      case 'parent':
        return (
          <ParentArea onExit={() => void reloadSettings().then(home)} onSettingsChanged={reloadSettings} />
        );
      case 'session':
        return (
          <Session
            key={route.key}
            kind={route.kind}
            currency={settings.currency}
            naturalIncludesZero={settings.naturalIncludesZero}
            onHome={home}
            onSummary={(id) => setRoute({ name: 'summary', id })}
          />
        );
    }
  };

  return (
    <SettingsProvider value={settings}>
      <ErrorBoundary onReset={() => setRoute((r) => (r.name === 'session' ? { ...r, key: r.key + 1 } : r))}>
        {screen()}
      </ErrorBoundary>
    </SettingsProvider>
  );
}
