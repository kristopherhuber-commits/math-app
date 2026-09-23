import { useState } from 'react';
import { config } from '../../engine/config';
import { MathText, Rich, Tex } from '../components/Math';
import { strings, topicStrings, type TopicKey } from '../strings';

const TOPICS: readonly TopicKey[] = ['NC', 'RD', 'FDP', 'PC', 'EQ'];

// Until assignments and adaptive levels arrive (M4), Home is free practice: pick a topic (design.md
// §5 TopicTile), then a level.
export function Home({ onStart }: { onStart: (topic: TopicKey, level: number) => void }) {
  const [topic, setTopic] = useState<TopicKey>('EQ');
  const [levels, setLevels] = useState<Record<TopicKey, number>>({ NC: 1, RD: 1, FDP: 1, PC: 1, EQ: 3 });
  const level = levels[topic];
  const count = config.levels[topic];
  const example = (n: number) =>
    topic === 'EQ' ? (
      <Rich text={strings.home.levelExamples[n] ?? ''} />
    ) : (
      <Tex text={topicStrings.levelExamples[topic]?.[n - 1] ?? ''} />
    );
  return (
    <main className="home">
      <h1 className="display">{strings.home.greeting}</h1>
      <p className="home-intro">{strings.home.intro}</p>
      <div className="topic-grid" role="radiogroup" aria-label={strings.home.topics}>
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={topic === t}
            className={`topic-tile ${topic === t ? 'selected' : ''}`}
            onClick={() => setTopic(t)}
          >
            <span className="topic-glyph" aria-hidden="true">
              <MathText latex={topicStrings.glyph[t]} />
            </span>
            <span className="topic-name">{topicStrings.name[t]}</span>
          </button>
        ))}
      </div>
      <section className="card">
        <h2 className="title">{topicStrings.name[topic]}</h2>
        <div
          className="level-grid"
          role="radiogroup"
          aria-label={strings.home.levels(topicStrings.name[topic])}
        >
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={level === n}
              className={`level-option ${level === n ? 'selected' : ''}`}
              onClick={() => setLevels((l) => ({ ...l, [topic]: n }))}
            >
              <span className="level-name">{strings.home.level(n)}</span>
              <span className="level-example">{example(n)}</span>
            </button>
          ))}
        </div>
        <div className="actions end">
          <button type="button" className="btn btn-primary" onClick={() => onStart(topic, level)}>
            {strings.home.start}
          </button>
        </div>
      </section>
    </main>
  );
}
