// First run (R-PAR-1, R-RWD-7, design.md §4.3): the parent sets the PIN (twice), then the learner
// names the turtle and the penguin. Required before Home; existing progress is untouched.
import { useEffect, useRef, useState } from 'react';
import { config } from '../../engine/config';
import { cleanName, saveSettings, setPin } from '../../data/settings';
import { logError } from '../../data/errors';
import { Penguin } from '../mascots/Penguin';
import { Turtle } from '../mascots/Turtle';
import { PinPad } from '../parent/PinPad';
import { setupStrings as s } from '../strings';

export function NamingForm({ onDone }: { onDone: (names: { turtle: string; penguin: string }) => void }) {
  const d = config.settings.mascotNames;
  const [turtle, setTurtle] = useState<string>(d.turtle);
  const [penguin, setPenguin] = useState<string>(d.penguin);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <form
      className="card naming"
      aria-labelledby="naming-title"
      onSubmit={(e) => {
        e.preventDefault();
        onDone({ turtle: cleanName(turtle, d.turtle), penguin: cleanName(penguin, d.penguin) });
      }}
    >
      <h1 id="naming-title" className="title">
        {s.namesTitle}
      </h1>
      <p className="muted">{s.namesSub}</p>
      <div className="naming-grid">
        <label className="naming-friend">
          <Turtle size={140} />
          <span className="label">{s.turtleLabel}</span>
          <input
            ref={first}
            className="text-input"
            value={turtle}
            maxLength={config.parent.maxNameLength}
            onChange={(e) => setTurtle(e.target.value)}
          />
          <span className="label muted">{s.turtleRole}</span>
        </label>
        <label className="naming-friend">
          <Penguin size={110} />
          <span className="label">{s.penguinLabel}</span>
          <input
            className="text-input"
            value={penguin}
            maxLength={config.parent.maxNameLength}
            onChange={(e) => setPenguin(e.target.value)}
          />
          <span className="label muted">{s.penguinRole}</span>
        </label>
      </div>
      <div className="actions end">
        <button type="submit" className="btn btn-primary">
          {s.done}
        </button>
      </div>
    </form>
  );
}

type Step = { name: 'pin'; message?: string } | { name: 'confirm'; first: string } | { name: 'names' };

export function Setup({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>({ name: 'pin' });
  return (
    <main className="setup">
      {step.name === 'pin' && (
        <PinPad
          title={s.pinTitle}
          sub={s.pinSub}
          message={step.message}
          onComplete={(first) => setStep({ name: 'confirm', first })}
        />
      )}
      {step.name === 'confirm' && (
        <PinPad
          title={s.confirmTitle}
          sub={s.confirmSub}
          onComplete={(again) => {
            if (again !== step.first) return setStep({ name: 'pin', message: s.mismatch });
            void setPin(again)
              .then(() => setStep({ name: 'names' }))
              .catch((e: unknown) => logError('setPin', e));
          }}
        />
      )}
      {step.name === 'names' && (
        <NamingForm
          onDone={(mascotNames) =>
            void saveSettings({ mascotNames })
              .catch((e: unknown) => logError('saveSettings', e))
              .finally(onDone)
          }
        />
      )}
    </main>
  );
}
