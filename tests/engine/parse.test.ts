// R-EQ-TYPE-3: parser accepts implicit multiplication, a/4 and (2p)/3 coefficients, unary minus
// and spaces; exactly one '=' is required.
import { describe, expect, it } from 'vitest';
import { parseEquation } from '../../src/engine/eq/parse';
import {
  isSeparated,
  linearize,
  simplifiedForm,
  solution,
  type LinearEquation,
} from '../../src/engine/eq/linear';
import { formatRational, rat } from '../../src/engine/rational';
import { lineToLatex, sideText, termText } from '../../src/engine/eq/format';

function lin(text: string): LinearEquation {
  const r = parseEquation(text);
  if (!r.ok) throw new Error(`parse failed: ${text}`);
  return linearize(r.eq);
}
const d = (text: string) => {
  const e = lin(text);
  return [formatRational(e.d.a), formatRational(e.d.b)];
};

describe('parseEquation', () => {
  it.each([
    ['3a + 3 = a + 23', ['2', '−20']],
    ['2(x+4) = 18', ['2', '−10']],
    ['-(m+12) = 2(m - 3)', ['−3', '−6']],
    ['a/4 + 1 = 3', ['1/4', '−2']],
    ['(2p)/3 - 1 = p/6 + 2', ['1/2', '−3']],
    ['2p/3 - 1 = p/6 + 2', ['1/2', '−3']],
    ['7 − 3z = 13', ['−3', '−6']],
    ['3 × a = 6 ÷ 2', ['3', '−3']],
    ['  3 a   =  2 ', ['3', '−2']],
  ])('%s', (text, expected) => expect(d(text)).toEqual(expected));

  it('solution is −β/α', () => {
    expect(solution(lin('4(w + 1) = 7w + 9'))).toEqual(rat(-5, 3));
  });

  it('reports syntax errors with a position', () => {
    const r = parseEquation('3a + = 5');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('syntax');
      expect(r.error.span.start).toBe(5);
    }
  });
  it('requires exactly one =', () => {
    const r = parseEquation('3a + 3');
    expect(!r.ok && r.error.kind).toBe('equals');
  });
  it('flags a letter other than the problem variable', () => {
    const r = parseEquation('3b = 2', 'a');
    expect(!r.ok && r.error.kind).toBe('letter');
  });
});

describe('forms', () => {
  it('separated and simplified', () => {
    expect(isSeparated(lin('3a - a = 23 - 3'))).toBe(true);
    expect(isSeparated(lin('3a = a + 20'))).toBe(false);
    expect(isSeparated(lin('2(x + 4) = 18'))).toBe(false);
    expect(simplifiedForm(lin('2a = 20'))).not.toBeNull();
    expect(simplifiedForm(lin('2a = 23 - 3'))).toBeNull();
  });
});

describe('format', () => {
  it('writes coefficient ±1 as a / −a (R-EQ-GEN-3)', () => {
    expect(termText(rat(1), true, 'a')).toBe('a');
    expect(termText(rat(-1), true, 'a')).toBe('−a');
    expect(termText(rat(2, 3), true, 'p')).toBe('2p/3');
    expect(termText(rat(1, 4), true, 'x')).toBe('x/4');
  });
  it('joins a side with true minus signs', () => {
    expect(
      sideText(
        [
          { coef: rat(3), isVar: true },
          { coef: rat(-1), isVar: true },
        ],
        'a',
      ),
    ).toBe('3a − a');
  });
  it('renders stacked fractions in LaTeX (R-DISP-2)', () => {
    expect(lineToLatex('2p/3 - 1 = p/6 + 2')).toBe('\\frac{2p}{3} - 1 = \\frac{p}{6} + 2');
    expect(lineToLatex('x = -5/3')).toBe('x = -\\frac{5}{3}');
  });
});
