// H3 walkthrough for the number topics (R-HELP-4, design.md §5 Walkthrough, mockup 07): numbered
// steps, inline mini-questions (3 chips that gate Next), aligned column subtraction with the tails
// highlighted, long division with the repeated remainder marked, and the sets map for NC.
import { useState } from 'react';
import type { ColumnRow, ColumnSubtraction, MiniQuestion, NumWalkStep } from '../../engine/topics/walk';
import type { LongDivision as Division } from '../../engine/numbers/decimal';
import { numStrings, numText } from '../strings';
import { MathText, Tex } from './Math';
import { ShownMath } from './Numbers';
import { SetsMap } from './SetsMap';
import { WalkLine, WalkShell } from './Walkthrough';

function Row({ row, band }: { row: ColumnRow; band: boolean }) {
  return (
    <>
      <span className="col-label">
        <MathText latex={row.label} />
      </span>
      <span className="col-sign">{row.sign}</span>
      <span className="col-whole">{row.whole}</span>
      <span className="col-point">{row.frac ? '.' : ''}</span>
      <span className={`col-frac ${band && row.tail ? 'tail' : ''}`}>
        {row.frac}
        {row.ellipsis ? '…' : ''}
      </span>
    </>
  );
}

export function ColumnArithmetic({
  columns,
  showResult,
}: {
  columns: ColumnSubtraction;
  showResult: boolean;
}) {
  return (
    <figure className="columns" aria-label={numStrings.walk.subtraction}>
      <div className="columns-grid">
        <Row row={columns.top} band />
        <Row row={columns.bottom} band />
        <span className="columns-rule" aria-hidden="true" />
        {showResult && <Row row={columns.result} band={false} />}
      </div>
      <figcaption className="label columns-note">{numStrings.walk.tailsCancel}</figcaption>
    </figure>
  );
}

export function LongDivisionView({ ld, highlight }: { ld: Division; highlight: boolean }) {
  const again = highlight && ld.repeat ? ld.repeat : null;
  const d = `${ld.denominator}`;
  return (
    <figure className="long-division" aria-label={numStrings.walk.division}>
      <ol>
        <li>
          <MathText latex={`${ld.numerator} \\div ${d} = ${ld.whole}`} />{' '}
          <span className="ld-rem">
            {numStrings.walk.remainder}{' '}
            <span className={again && again.firstSeen === 0 ? 'ld-mark' : ''}>{`${ld.firstRemainder}`}</span>
          </span>
        </li>
        {ld.rows.map((r, i) => (
          <li key={i} className={again && i === again.row ? 'ld-again' : ''}>
            <MathText latex={`${r.dividend} \\div ${d} = ${r.digit}`} />{' '}
            <span className="ld-rem">
              {numStrings.walk.remainder}{' '}
              <span
                className={
                  again && (i === again.row || (i + 1 === again.firstSeen && again.firstSeen > 0))
                    ? 'ld-mark'
                    : ''
                }
              >
                {`${r.remainder}`}
              </span>
              {again && i === again.row && <strong className="ld-note"> {numStrings.walk.comesBack}</strong>}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function Mini({ mini, picks, onPick }: { mini: MiniQuestion; picks: number[]; onPick: (i: number) => void }) {
  const done = picks.includes(mini.correct);
  return (
    <div className="mini" role="group" aria-label={numText(mini.question)}>
      <p className="mini-q">
        <Tex text={numText(mini.question)} />
      </p>
      <div className="mini-options">
        {mini.options.map((o, i) => {
          const tried = picks.includes(i) && i !== mini.correct;
          const right = done && i === mini.correct;
          return (
            <button
              key={i}
              type="button"
              className={`mini-chip ${tried ? 'tried' : ''} ${right ? 'correct' : ''}`}
              aria-pressed={right}
              aria-label={numStrings.nc.name[o.speech] ?? o.speech}
              disabled={done || tried}
              onClick={() => onPick(i)}
            >
              <ShownMath shown={o} />
              {tried && <span aria-hidden="true"> ✕</span>}
            </button>
          );
        })}
      </div>
      {picks.length > 0 && !done && (
        <p className="mini-feedback label" role="status">
          {numStrings.notQuite}
        </p>
      )}
    </div>
  );
}

interface Props {
  steps: NumWalkStep[];
  index: number;
  solved: boolean;
  onNext: () => void;
  onBack: () => void;
  onNextQuestion: () => void;
  /** NC: the number, as LaTeX, placed on the sets map once its box is found. */
  setsNumber?: string;
}

export function NumberWalkthrough({ steps, index, solved, setsNumber, ...nav }: Props) {
  // Mini-question picks per step. UI-only: walkthrough mini answers aren't scored (M3 assumption).
  const [picks, setPicks] = useState<Record<number, number[]>>({});
  const answered = (i: number) => {
    const m = steps[i]!.mini;
    return !m || (picks[i] ?? []).includes(m.correct);
  };
  return (
    <WalkShell count={steps.length} index={index} solved={solved} canAdvance={answered(index)} {...nav}>
      {steps.slice(0, index + 1).map((s, i) => {
        const current = i === index;
        const open = answered(i);
        return (
          <WalkLine key={i} n={i + 1} current={current}>
            <p className="walk-explain">
              <Tex text={numText(s.explain)} />
            </p>
            {current && s.columns && <ColumnArithmetic columns={s.columns} showResult={open} />}
            {current && s.division && (
              <LongDivisionView ld={s.division.ld} highlight={s.division.highlightRepeat} />
            )}
            {s.mini && current && (
              <Mini
                mini={s.mini}
                picks={picks[i] ?? []}
                onPick={(k) => setPicks((p) => ({ ...p, [i]: [...(p[i] ?? []), k] }))}
              />
            )}
            {open && s.reveal && (
              <p className="walk-reveal">
                <Tex text={numText(s.reveal)} />
              </p>
            )}
            {open &&
              s.math?.map((m, k) => <MathText key={k} latex={m} className="math-md walk-result walk-math" />)}
            {current && s.sets && (
              <SetsMap
                lit={open ? s.sets.lit : []}
                {...(open ? { place: s.sets.place } : {})}
                {...(setsNumber ? { number: setsNumber } : {})}
                label={numStrings.nc.setsMap}
              />
            )}
          </WalkLine>
        );
      })}
    </WalkShell>
  );
}
