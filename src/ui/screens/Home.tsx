import { useState } from 'react';
import { config } from '../../engine/config';
import { Rich } from '../components/Math';
import { strings } from '../strings';

// M1: minimal Home with a level picker; adaptive levels arrive in M4.
export function Home({ onStart }: { onStart: (level: number) => void }) {
  const [level, setLevel] = useState(3);
  const levels = Array.from({ length: config.eq.levels }, (_, i) => i + 1);
  return (
    <main className="home">
      <h1 className="display">{strings.home.greeting}</h1>
      <p className="home-intro">{strings.home.intro}</p>
      <section className="card">
        <h2 className="title">{strings.home.topic}</h2>
        <div className="level-grid" role="radiogroup" aria-label={strings.home.topic}>
          {levels.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={level === n}
              className={`level-option ${level === n ? 'selected' : ''}`}
              onClick={() => setLevel(n)}
            >
              <span className="level-name">{strings.home.level(n)}</span>
              <span className="level-example">
                <Rich text={strings.home.levelExamples[n] ?? ''} />
              </span>
            </button>
          ))}
        </div>
        <div className="actions end">
          <button type="button" className="btn btn-primary" onClick={() => onStart(level)}>
            {strings.home.start}
          </button>
        </div>
      </section>
    </main>
  );
}
