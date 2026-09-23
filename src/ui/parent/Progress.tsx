// Progress dashboard (R-PAR-3, mockup 10): minutes per day for 30 days, a card per topic (level,
// clean-solve rate, 30-day trend, hint use by tier, questions, tries, time), and "Worth a look".
// Charts are hand-drawn SVG: one series each, thin marks, a hover title per mark, and the numbers
// in text beside them.
import { useEffect, useState } from 'react';
import { logError } from '../../data/errors';
import { loadDashboard, type Dashboard, type MissedFilter, type TopicCard } from '../../data/stats';
import { parentStrings, topicStrings } from '../strings';

const s = parentStrings.progress;
const pct = (r: number) => `${Math.round(r * 100)}%`;
const shortDay = (day: string) => day.slice(5).replace('-', '/');

function DailyBars({ daily }: { daily: Dashboard['daily'] }) {
  const w = 900;
  const h = 80;
  const gap = 4;
  const bw = w / daily.length - gap;
  const max = Math.max(10, ...daily.map((d) => d.minutes));
  return (
    <svg className="daily-bars" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={s.minutes}>
      {daily.map((d, i) => {
        const bh = d.minutes > 0 ? Math.max(4, (d.minutes / max) * (h - 4)) : 0;
        const m = Math.round(d.minutes);
        return (
          <g key={d.day}>
            <title>{s.minutesDay(shortDay(d.day), m)}</title>
            {/* A full-height hit area, bigger than the bar. */}
            <rect x={i * (bw + gap)} y={0} width={bw + gap} height={h} className="hit" />
            {bh > 0 ? (
              <rect x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={4} className="bar" />
            ) : (
              <rect x={i * (bw + gap)} y={h - 2} width={bw} height={2} className="bar-zero" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({ card }: { card: TopicCard }) {
  const w = 160;
  const h = 48;
  const pts = card.trend
    .map((t, i) => ({ i, rate: t.rate, day: t.day }))
    .filter((p): p is { i: number; rate: number; day: string } => p.rate !== null);
  if (pts.length === 0) return <span className="sparkline-empty" />;
  const x = (i: number) => 4 + (i / (card.trend.length - 1)) * (w - 8);
  const y = (r: number) => h - 4 - r * (h - 8);
  const last = pts.at(-1)!;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={s.trend(topicStrings.name[card.topic])}
    >
      {pts.length > 1 && <polyline points={pts.map((p) => `${x(p.i)},${y(p.rate)}`).join(' ')} />}
      {pts.map((p) => (
        <circle
          key={p.day}
          cx={x(p.i)}
          cy={y(p.rate)}
          r={p === last ? 4 : 6}
          className={p === last ? 'end' : ''}
        >
          <title>{`${shortDay(p.day)}: ${pct(p.rate)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function HintBar({ hints }: { hints: TopicCard['hints'] }) {
  const total = hints[1] + hints[2] + hints[3];
  return (
    <div className="hint-bar" aria-hidden="true">
      {total > 0 &&
        ([1, 2, 3] as const).map((t) =>
          hints[t] > 0 ? (
            <span
              key={t}
              className={`hint-seg t${t}`}
              style={{ flexGrow: hints[t] }}
              title={`H${t}: ${hints[t]}`}
            />
          ) : null,
        )}
    </div>
  );
}

function TopicCardView({ card }: { card: TopicCard }) {
  return (
    <section className="parent-card topic-card" aria-label={topicStrings.name[card.topic]}>
      <h2>{topicStrings.name[card.topic]}</h2>
      <div className="topic-level">
        <span className="label muted">{s.level(card.level, card.levels)}</span>
        <span className="level-pips" aria-hidden="true">
          {Array.from({ length: card.levels }, (_, i) => (
            <span key={i} className={`pip ${i < card.level ? 'on' : ''}`} />
          ))}
        </span>
      </div>
      <div className="topic-headline">
        <div>
          <strong className="big-number">{card.cleanRate === null ? '–' : pct(card.cleanRate)}</strong>
          <span className="label muted">{card.cleanRate === null ? s.noData : s.clean}</span>
        </div>
        <Sparkline card={card} />
      </div>
      <p className="topic-facts label muted">
        {s.attempts(card.attempts)}
        {card.avgTries !== null && ` · ${s.avgTries(card.avgTries.toFixed(1))}`}
        {` · ${s.time(Math.round(card.minutes))}`}
      </p>
      <p className="label muted">{s.hints}</p>
      <HintBar hints={card.hints} />
      <p className="hint-split">{s.hintSplit(card.hints[1], card.hints[2], card.hints[3])}</p>
    </section>
  );
}

export function Progress({ onOpenMissed }: { onOpenMissed: (f: MissedFilter) => void }) {
  const [dash, setDash] = useState<Dashboard | null>(null);
  useEffect(() => {
    void loadDashboard()
      .then(setDash)
      .catch((e: unknown) => logError('loadDashboard', e));
  }, []);
  return (
    <>
      <h1 className="title" tabIndex={-1}>
        {s.title}
      </h1>
      {dash && (
        <>
          <p className="parent-sub">{s.sub(dash.days.length)}</p>
          <section className="parent-card daily" aria-label={s.minutes}>
            <h2>{s.minutes}</h2>
            <DailyBars daily={dash.daily} />
          </section>
          <div className="topic-grid-parent">
            {dash.topics.map((c) => (
              <TopicCardView key={c.topic} card={c} />
            ))}
            <section className="parent-card attention" aria-label={s.worth}>
              <h2>{s.worth}</h2>
              {dash.notes.length === 0 && <p>{s.worthNone}</p>}
              {dash.notes.map((n) => (
                <div key={n.kind === 'walkthroughs' ? n.topic : n.code} className="attention-note">
                  <p>
                    {n.kind === 'walkthroughs'
                      ? s.worthH3(topicStrings.name[n.topic], n.n, n.of)
                      : s.worthDiag(parentStrings.diag[n.code] ?? n.code, n.code, n.n)}
                  </p>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() =>
                      onOpenMissed(
                        n.kind === 'walkthroughs'
                          ? { topic: n.topic }
                          : { topic: 'EQ', code: n.code, from: n.since.slice(0, 10) },
                      )
                    }
                  >
                    {s.openMissed}
                  </button>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
