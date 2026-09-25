// The parent area (requirements §9, mockups 10 and 11): a PIN gate (R-PAR-1) with a reset path, then
// a nav rail over Assignments, Progress, Missed questions, Settings and Data. It locks again on
// "Back to learner" and after `autoLockMinutes` without input.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { config } from '../../engine/config';
import { checkChallenge, pinChallenge } from '../../engine/parent';
import { newSeed } from '../../engine/rng';
import { logError } from '../../data/errors';
import { setPin, verifyPin } from '../../data/settings';
import { parentStrings } from '../strings';
import { PinPad } from './PinPad';
import { Assignments } from './Assignments';
import { Progress } from './Progress';
import { Missed, type MissedFilter } from './Missed';
import { SettingsPage } from './SettingsPage';
import { RewardsPage } from './RewardsPage';
import { DataPage } from './DataPage';

const s = parentStrings;

export type ParentPage = 'assignments' | 'progress' | 'missed' | 'rewards' | 'settings' | 'data';
const PAGES: ParentPage[] = ['assignments', 'progress', 'missed', 'rewards', 'settings', 'data'];

function PinReset({ onDone }: { onDone: () => void }) {
  const [challenge, setChallenge] = useState(() => pinChallenge(newSeed()));
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string>();
  const [step, setStep] = useState<
    { name: 'challenge' } | { name: 'new' } | { name: 'confirm'; first: string }
  >({
    name: 'challenge',
  });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), [challenge]);

  if (step.name === 'new')
    return (
      <PinPad
        title={s.reset.newPin}
        message={message}
        onComplete={(first) => {
          setMessage(undefined);
          setStep({ name: 'confirm', first });
        }}
      />
    );
  if (step.name === 'confirm')
    return (
      <PinPad
        title={s.reset.confirm}
        onComplete={(again) => {
          if (again !== step.first) {
            setMessage(s.reset.mismatch);
            return setStep({ name: 'new' });
          }
          void setPin(again)
            .then(onDone)
            .catch((e: unknown) => logError('setPin', e));
        }}
      />
    );
  return (
    <form
      className="pin-card card"
      aria-labelledby="reset-title"
      onSubmit={(e) => {
        e.preventDefault();
        if (checkChallenge(challenge, typed)) {
          setMessage(undefined);
          return setStep({ name: 'new' });
        }
        setMessage(s.reset.notIt);
        setTyped('');
        setChallenge(pinChallenge(newSeed()));
      }}
    >
      <h1 id="reset-title" className="title">
        {s.reset.title}
      </h1>
      <label className="reset-question">
        <span className="prompt">{s.reset.question(challenge.a, challenge.b)}</span>
        <input
          ref={input}
          className="text-input"
          inputMode="numeric"
          autoComplete="off"
          aria-label={s.reset.answer}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </label>
      <p className="pin-message" role="alert">
        {message ?? ''}
      </p>
      <div className="actions end">
        <button type="submit" className="btn btn-primary">
          {s.reset.check}
        </button>
      </div>
    </form>
  );
}

function Gate({ onUnlock, onExit }: { onUnlock: () => void; onExit: () => void }) {
  const [message, setMessage] = useState<string>();
  const [resetting, setResetting] = useState(false);
  return (
    <main className="pin-screen parent-gate">
      {resetting ? (
        <PinReset onDone={onUnlock} />
      ) : (
        <div>
          <PinPad
            title={s.pin.title}
            sub={s.pin.sub}
            message={message}
            onComplete={(pin) =>
              void verifyPin(pin)
                .then((ok) => (ok ? onUnlock() : setMessage(s.pin.notIt)))
                .catch((e: unknown) => logError('verifyPin', e))
            }
          />
          <div className="pin-links">
            <button type="button" className="link-btn" onClick={onExit}>
              {s.pin.cancel}
            </button>
            <button type="button" className="link-btn" onClick={() => setResetting(true)}>
              {s.pin.forgot}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Locks after `autoLockMinutes` without a pointer or key press. */
function useIdleLock(active: boolean, lock: () => void) {
  const last = useRef(0);
  useEffect(() => {
    if (!active) return;
    last.current = Date.now();
    const touch = () => (last.current = Date.now());
    const limit = config.parent.autoLockMinutes * 60_000;
    const timer = window.setInterval(() => {
      if (Date.now() - last.current >= limit) lock();
    }, 15_000);
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [active, lock]);
}

export function ParentArea({
  onExit,
  onSettingsChanged,
}: {
  onExit: () => void;
  onSettingsChanged: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [page, setPage] = useState<ParentPage>('assignments');
  const [missedFilter, setMissedFilter] = useState<MissedFilter>({});
  const heading = useRef<HTMLDivElement>(null);
  const lock = useCallback(() => setUnlocked(false), []);
  useIdleLock(unlocked, lock);
  useEffect(() => {
    if (unlocked) heading.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [unlocked, page]);

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} onExit={onExit} />;

  const go = (p: ParentPage) => setPage(p);
  let content: ReactNode;
  switch (page) {
    case 'assignments':
      content = <Assignments />;
      break;
    case 'progress':
      content = (
        <Progress
          onOpenMissed={(f) => {
            setMissedFilter(f);
            go('missed');
          }}
        />
      );
      break;
    case 'missed':
      content = <Missed filter={missedFilter} onFilter={setMissedFilter} />;
      break;
    case 'rewards':
      content = <RewardsPage />;
      break;
    case 'settings':
      content = <SettingsPage onChanged={onSettingsChanged} />;
      break;
    case 'data':
      content = <DataPage onChanged={onSettingsChanged} />;
      break;
  }

  return (
    <div className="parent">
      <nav className="parent-nav" aria-label={s.nav.area}>
        <div>
          <p className="parent-nav-title">{s.nav.area}</p>
          <p className="parent-nav-sub">{s.nav.unlocked(config.parent.autoLockMinutes)}</p>
        </div>
        <ul>
          {PAGES.map((p) => (
            <li key={p}>
              <button
                type="button"
                className={`parent-nav-item ${page === p ? 'active' : ''}`}
                aria-current={page === p ? 'page' : undefined}
                onClick={() => go(p)}
              >
                {s.nav[p]}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="parent-back" onClick={onExit}>
          {s.nav.back}
        </button>
      </nav>
      <main className="parent-main" ref={heading}>
        {content}
      </main>
    </div>
  );
}
