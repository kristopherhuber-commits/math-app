import katex from 'katex';
import { Fragment, useMemo } from 'react';
import { lineToLatex } from '../../engine/eq/format';

/** Engine text (U+2212 minus, a/b fractions) → LaTeX; falls back to a light conversion. */
export function toLatex(text: string): string {
  return lineToLatex(text) ?? text.replace(/−/g, '-').replace(/×/g, '\\times ').replace(/÷/g, '\\div ');
}

export function MathText({ latex, className }: { latex: string; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(latex, { throwOnError: false, output: 'htmlAndMathml' }),
    [latex],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A line of engine text rendered as math: stacked fractions, true minus, italic variable. */
export function MathLine({ text, className }: { text: string; className?: string }) {
  return <MathText latex={toLatex(text)} className={className} />;
}

/** Copy from strings.ts with $…$ math segments. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('$');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <MathLine key={i} text={part} /> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
