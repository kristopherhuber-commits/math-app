// PIN pad (design.md §7 "Screens not mocked": 4 large dots and a 3×4 number pad reusing the keypad
// keys). Mouse, touch and the physical keyboard (digits, Backspace) all work (R-PLAT-5).
import { useEffect, useRef, useState } from 'react';
import { config } from '../../engine/config';
import { parentStrings } from '../strings';

const p = parentStrings.pin;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PinPad({
  title,
  sub,
  message,
  onComplete,
}: {
  title: string;
  sub?: string | undefined;
  /** A note under the dots, e.g. "That's not the PIN." */
  message?: string | undefined;
  /** Called with the 4 digits; the pad clears for the next try. */
  onComplete: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const len = config.parent.pinLength;
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  });

  // The digits so far live in a ref too, so a fast typist's keys are never lost between renders.
  const entered = useRef('');
  const press = (key: string) => {
    const cur = entered.current;
    let next = key === 'back' ? cur.slice(0, -1) : cur.length < len ? cur + key : cur;
    if (next.length === len) {
      done.current(next);
      next = '';
    }
    entered.current = next;
    setPin(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `press` only uses the state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => ref.current?.querySelector('button')?.focus(), [title]);

  return (
    <section className="pin-card card" aria-labelledby="pin-title">
      <h1 id="pin-title" className="title">
        {title}
      </h1>
      {sub && <p className="muted pin-sub">{sub}</p>}
      <div className="pin-dots" role="status" aria-label={p.dots(pin.length, len)}>
        {Array.from({ length: len }, (_, i) => (
          <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} aria-hidden="true" />
        ))}
      </div>
      <p className="pin-message" role="alert">
        {message ?? ''}
      </p>
      <div className="pin-pad number-pad" role="group" aria-label={p.pad} ref={ref}>
        {DIGITS.map((d) => (
          <button key={d} type="button" className="key key-digit" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span aria-hidden="true" />
        <button type="button" className="key key-digit" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="key key-op" aria-label={p.delete} onClick={() => press('back')}>
          ⌫
        </button>
      </div>
    </section>
  );
}
