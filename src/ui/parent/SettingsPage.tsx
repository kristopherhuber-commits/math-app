// Settings (R-PAR-5): free practice, question order, level range per topic, EQ options, numbers,
// sound and motion, the character names (R-RWD-7) and the PIN. Each change is saved at once.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { config, TOPICS, type TopicId } from '../../engine/config';
import type { Settings } from '../../data/db';
import { logError } from '../../data/errors';
import {
  cleanName,
  isPin,
  loadSettings,
  saveSettings,
  setPin,
  type EditableSettings,
} from '../../data/settings';
import { parentStrings, topicStrings } from '../strings';

const s = parentStrings.settings;

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="setting-row">
      <div>
        <span className="setting-label" id={id}>
          {label}
        </span>
        {sub && <span className="label muted">{sub}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="setting-row">
      <span className="setting-label" id={id}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={id}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={s.lower(label)}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        aria-label={s.higher(label)}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="parent-card settings-group" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPage({ onChanged }: { onChanged: () => void }) {
  const [st, setSt] = useState<Settings | null>(null);
  const [status, setStatus] = useState('');
  const [names, setNames] = useState({ turtle: '', penguin: '' });
  const [pin, setPinText] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  useEffect(() => {
    void loadSettings()
      .then((x) => {
        setSt(x);
        setNames(x.mascotNames);
      })
      .catch((e: unknown) => logError('loadSettings', e));
  }, []);
  if (!st) return null;

  const save = (patch: Partial<EditableSettings>) => {
    setSt({ ...st, ...patch });
    void saveSettings(patch)
      .then((x) => {
        setSt(x);
        setStatus(s.saved);
        onChanged();
      })
      .catch((e: unknown) => logError('saveSettings', e));
  };

  const bounds = (t: TopicId, which: 'min' | 'max', v: number) => {
    const b = { ...st.levelBounds[t], [which]: v };
    save({ levelBounds: { ...st.levelBounds, [t]: b } });
  };

  const saveNames = () => {
    const d = config.settings.mascotNames;
    const mascotNames = {
      turtle: cleanName(names.turtle, d.turtle),
      penguin: cleanName(names.penguin, d.penguin),
    };
    setNames(mascotNames);
    if (mascotNames.turtle !== st.mascotNames.turtle || mascotNames.penguin !== st.mascotNames.penguin)
      save({ mascotNames });
  };

  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {s.title}
      </h1>
      <p className="parent-sub" role="status">
        {status}
      </p>
      <div className="settings-grid">
        <Group title={s.learning}>
          <Choice
            label={s.freePractice}
            value={st.freePractice}
            options={[
              ['always', s.freeAlways],
              ['afterAssignment', s.freeAfter],
              ['never', s.freeNever],
            ]}
            onChange={(freePractice) => save({ freePractice })}
          />
          <Choice
            label={s.order}
            value={st.order}
            options={[
              ['grouped', parentStrings.assign.grouped],
              ['mixed', parentStrings.assign.mixed],
            ]}
            onChange={(order) => save({ order })}
          />
          <p className="setting-label">{s.levels}</p>
          <table className="bounds-table">
            <tbody>
              {TOPICS.map((t) => {
                const b = st.levelBounds[t];
                const name = topicStrings.name[t];
                return (
                  <tr key={t}>
                    <th scope="row">{name}</th>
                    <td>
                      <span className="label muted">{s.lowest}</span>
                      <Stepper
                        label={s.levelStepper(name, s.lowest)}
                        value={b.min}
                        min={1}
                        max={b.max}
                        onChange={(v) => bounds(t, 'min', v)}
                      />
                    </td>
                    <td>
                      <span className="label muted">{s.highest}</span>
                      <Stepper
                        label={s.levelStepper(name, s.highest)}
                        value={b.max}
                        min={b.min}
                        max={config.levels[t]}
                        onChange={(v) => bounds(t, 'max', v)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Group>

        <Group title={s.equations}>
          <Toggle
            label={s.allowSkipping}
            sub={s.allowSkippingSub}
            checked={st.allowSkipping}
            onChange={(allowSkipping) => save({ allowSkipping })}
          />
          <Toggle
            label={s.fullBalance}
            sub={s.fullBalanceSub}
            checked={st.fullBalanceAnim}
            onChange={(fullBalanceAnim) => save({ fullBalanceAnim })}
          />
        </Group>

        <Group title={s.numbers}>
          <Toggle
            label={s.naturalZero}
            checked={st.naturalIncludesZero}
            onChange={(naturalIncludesZero) => save({ naturalIncludesZero })}
          />
          <label className="setting-row">
            <span className="setting-label">{s.currency}</span>
            <input
              className="text-input currency-input"
              value={st.currency}
              maxLength={3}
              onChange={(e) => setSt({ ...st, currency: e.target.value })}
              onBlur={(e) => save({ currency: e.target.value.trim() || config.settings.currency })}
            />
          </label>
        </Group>

        <Group title={s.comfort}>
          <Toggle label={s.sound} sub={s.soundSub} checked={st.sound} onChange={(sound) => save({ sound })} />
          <Toggle
            label={s.reduceMotion}
            sub={s.reduceMotionSub}
            checked={st.reduceMotion}
            onChange={(reduceMotion) => save({ reduceMotion })}
          />
        </Group>

        <Group title={s.names}>
          <label className="setting-row">
            <span className="setting-label">{s.turtle}</span>
            <input
              className="text-input"
              value={names.turtle}
              maxLength={config.parent.maxNameLength}
              onChange={(e) => setNames({ ...names, turtle: e.target.value })}
              onBlur={saveNames}
            />
          </label>
          <label className="setting-row">
            <span className="setting-label">{s.penguin}</span>
            <input
              className="text-input"
              value={names.penguin}
              maxLength={config.parent.maxNameLength}
              onChange={(e) => setNames({ ...names, penguin: e.target.value })}
              onBlur={saveNames}
            />
          </label>
        </Group>

        <Group title={s.pin}>
          <form
            className="setting-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isPin(pin)) return setPinMessage(s.pinInvalid);
              void setPin(pin)
                .then(() => {
                  setPinText('');
                  setPinMessage(s.pinChanged);
                })
                .catch((err: unknown) => logError('setPin', err));
            }}
          >
            <label className="pin-field">
              <span className="setting-label">{s.newPin}</span>
              <input
                className="text-input"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={config.parent.pinLength}
                value={pin}
                onChange={(e) => setPinText(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary btn-small">
              {s.changePin}
            </button>
          </form>
          <p className="label" role="status">
            {pinMessage}
          </p>
        </Group>
      </div>
    </>
  );
}
