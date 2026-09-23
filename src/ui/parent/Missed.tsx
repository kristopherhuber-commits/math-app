// Missed-question review (R-PAR-4, design.md §7 "Screens not mocked"): a list of attempts that needed
// H2/H3 or two or more wrong tries, filtered by topic and date; on the right, the question
// regenerated from its seed and every answer in order, including rejected EQ lines with their codes.
import { useEffect, useState } from 'react';
import { TOPICS, type TopicId } from '../../engine/config';
import { wrongTriesOf } from '../../engine/parent';
import { formatRational } from '../../engine/rational';
import { regenerate, type Regenerated } from '../../engine/review';
import { correctOption } from '../../engine/topics/mc';
import { ncMembership, NC_SETS } from '../../engine/topics/nc/checker';
import type { Attempt, TryRecord } from '../../data/db';
import { logError } from '../../data/errors';
import { localDay } from '../../data/progress';
import { loadMissed, type MissedFilter } from '../../data/stats';
import { MathLine, Tex } from '../components/Math';
import { MathHero, ShownMath } from '../components/Numbers';
import { useSettings } from '../settings';
import { numStrings, numText, parentStrings, topicStrings } from '../strings';

export type { MissedFilter };

const s = parentStrings.missed;

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function QuestionView({ r }: { r: Regenerated }) {
  const settings = useSettings();
  switch (r.topic) {
    case 'EQ':
      return (
        <div className="review-question">
          <MathLine text={r.question.text} className="math-md" />
          <p className="label muted">
            {s.answer}: <MathLine text={`${r.question.variable} = ${formatRational(r.question.solution)}`} />
          </p>
        </div>
      );
    case 'NC': {
      const m = ncMembership(r.question.value, settings.naturalIncludesZero);
      return (
        <div className="review-question">
          <p className="label">{numStrings.nc.prompt}</p>
          <MathHero shown={r.question.shown} />
          <p className="label muted">
            {s.answer}:{' '}
            {NC_SETS.filter((x) => m[x])
              .map((x) => numStrings.nc.name[x])
              .join(', ')}
          </p>
        </div>
      );
    }
    default: {
      const q = r.question;
      return (
        <div className="review-question">
          <p className="label">
            <Tex text={numText(q.prompt)} />
          </p>
          {q.hero && <MathHero shown={q.hero} />}
          {q.heroLine && <p className="hero-line">{numText(q.heroLine)}</p>}
          <p className="label muted">
            {s.answer}: <ShownMath shown={correctOption(q).shown} />
          </p>
        </div>
      );
    }
  }
}

function answerText(a: Attempt, t: TryRecord) {
  const v = t.answer;
  if (typeof v === 'string') {
    if (a.topic === 'EQ' && v.includes('=')) return <MathLine text={v} />;
    if (a.topic === 'NC')
      return (
        v
          .split(',')
          .map((x) => numStrings.nc.name[x] ?? x)
          .join(', ') || '—'
      );
    return v;
  }
  if (v && typeof v === 'object')
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k} ${String(x)}`)
      .join(', ');
  return String(v ?? '—');
}

function Replay({ a }: { a: Attempt }) {
  const { currency } = useSettings();
  const r = regenerate(a, currency);
  return (
    <section className="parent-card replay" aria-label={s.question}>
      <h2>{s.row(topicStrings.name[a.topic], a.level)}</h2>
      <p className="label muted">
        {a.finishedAt && time(a.finishedAt)} · {s.tries(wrongTriesOf(a))} · {s.hint(a.maxHint)}
      </p>
      {r ? <QuestionView r={r} /> : <p className="muted">{s.notRegenerated}</p>}
      <p className="label muted seed-line">{s.seed(a.generatorId, a.level, a.seed)}</p>
      <h3>{s.answers}</h3>
      <ol className="try-list">
        {a.tries.map((t, i) => (
          <li key={i} className={`try ${t.verdict}`}>
            <span className="try-answer">{answerText(a, t)}</span>
            <span className="try-meta label">
              {s.verdict[t.verdict] ?? t.verdict}
              {t.stepType && ` · ${t.stepType}`}
              {t.diagnostic && <code>{t.diagnostic}</code>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Missed({ filter, onFilter }: { filter: MissedFilter; onFilter: (f: MissedFilter) => void }) {
  const [list, setList] = useState<Attempt[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void loadMissed(filter)
      .then((l) => {
        setList(l);
        setOpen((o) => (o && l.some((a) => a.id === o) ? o : null));
      })
      .catch((e: unknown) => logError('loadMissed', e));
  }, [filter]);
  const set = (patch: Partial<MissedFilter>) => {
    const next = Object.fromEntries(Object.entries({ ...filter, ...patch }).filter(([, v]) => v));
    onFilter(next as MissedFilter);
  };
  const current = list?.find((a) => a.id === open);

  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {s.title}
      </h1>
      <p className="parent-sub">{s.sub}</p>
      <div className="filters" role="group" aria-label={s.filters}>
        <label>
          <span className="field-label">{s.topic}</span>
          <select
            className="text-input"
            value={filter.topic ?? ''}
            onChange={(e) => set({ topic: (e.target.value || undefined) as TopicId | undefined })}
          >
            <option value="">{s.allTopics}</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {topicStrings.name[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">{s.from}</span>
          <input
            type="date"
            className="text-input"
            value={filter.from ?? ''}
            max={localDay()}
            onChange={(e) => set({ from: e.target.value })}
          />
        </label>
        <label>
          <span className="field-label">{s.to}</span>
          <input
            type="date"
            className="text-input"
            value={filter.to ?? ''}
            max={localDay()}
            onChange={(e) => set({ to: e.target.value })}
          />
        </label>
        {filter.code && (
          <button type="button" className="chip-btn" onClick={() => set({ code: '' })}>
            {s.code}: {filter.code} ×
          </button>
        )}
      </div>
      {list && (
        <div className="missed-layout">
          <section className="parent-card" aria-label={s.count(list.length)}>
            <h2>{s.count(list.length)}</h2>
            {list.length === 0 && <p className="muted">{s.none}</p>}
            <ul className="missed-list">
              {list.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className={`missed-row ${a.id === open ? 'active' : ''}`}
                    aria-current={a.id === open ? 'true' : undefined}
                    onClick={() => setOpen(a.id)}
                  >
                    <strong>{s.row(topicStrings.name[a.topic], a.level)}</strong>
                    <span className="label muted">
                      {a.finishedAt && time(a.finishedAt)} · {s.hint(a.maxHint)} · {s.tries(wrongTriesOf(a))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {current ? <Replay a={current} /> : <p className="muted replay-empty">{s.pick}</p>}
        </div>
      )}
    </>
  );
}
