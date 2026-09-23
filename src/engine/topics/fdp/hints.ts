// FDP hints and walkthroughs (requirements §6.3, R-FDP-4, R-HELP-4/5): F→D by division; D→P by
// × 100 (the point moves 2 places right); P→D by ÷ 100; D→F over a power of ten, simplified with the
// gcd; P→F over 100, simplified. Repeating decimals use the x-method from RD.
import { cmp, gcd, mul, parseRational, rat, ONE, type Rational } from '../../rational';
import { mulberry32 } from '../../rng';
import { fromRational, isRepeating } from '../../numbers/decimal';
import { showDecimalOf, showFraction, showPercentOf, type Notation } from '../../numbers/display';
import { content, type HintContent } from '../content';
import type { McQuestion } from '../mc';
import { divisionSteps, xMethodSteps } from '../rd/hints';
import { miniQuestion, type NumWalkStep } from '../walk';
import { overPowerOfTen, type FdpForm, type FractionForm } from './distractors';

interface Fdp {
  x: Rational;
  source: FdpForm;
  target: FdpForm;
  form: FractionForm;
  notation: Notation;
  repeating: boolean;
}

function fdpOf(q: McQuestion): Fdp {
  const p = q.params;
  const x = parseRational(p.x!)!;
  return {
    x,
    source: p.source as FdpForm,
    target: p.target as FdpForm,
    form: p.form as FractionForm,
    notation: p.notation as Notation,
    repeating: isRepeating(fromRational(x)),
  };
}

const dec = (x: Rational, n: Notation) => showDecimalOf(x, n).latex;
const pct = (x: Rational, n: Notation) => showPercentOf(x, n).latex;
const fracTex = (n: bigint, d: bigint) => `\\frac{${n}}{${d}}`;

export function fdpHint(q: McQuestion, tier: 1 | 2): HintContent {
  const f = fdpOf(q);
  const { x, notation } = f;
  const hero = q.hero!.latex;
  const dir = `${f.source}2${f.target}`;
  switch (dir) {
    case 'F2D':
    case 'F2P':
      return tier === 1
        ? content(`fdp.${dir.toLowerCase()}.h1`, { f: hero })
        : content(`fdp.${dir.toLowerCase()}.h2`, { n: `${x.n}`, d: `${x.d}` });
    case 'D2P':
      return content(`fdp.d2p.h${tier}`, { dec: dec(x, notation) });
    case 'P2D':
      return content(`fdp.p2d.h${tier}`, { pct: pct(x, notation) });
    case 'D2F': {
      if (tier === 1) return content('fdp.d2f.h1', { dec: dec(x, notation) });
      if (f.repeating) return content('fdp.d2f.h2.repeat', { dec: dec(x, notation) });
      const r = overPowerOfTen(x);
      return content('fdp.d2f.h2', { dec: dec(x, notation), d: `${r.d}` });
    }
    default: {
      // P2F
      if (tier === 1) return content('fdp.p2f.h1', { pct: pct(x, notation) });
      if (f.repeating) return content('fdp.p2f.h2.repeat', { pct: pct(x, notation), dec: dec(x, notation) });
      return content('fdp.p2f.h2', { pct: pct(x, notation) });
    }
  }
}

/** "2¼ = 9/4" and back, when the fraction side is a mixed number. */
function mixedStep(x: Rational, toMixed: boolean): NumWalkStep {
  const improper = showFraction(x, 'improper').latex;
  const mixed = showFraction(x, 'mixed').latex;
  return toMixed
    ? { explain: content('fdp.walk.toMixed', { whole: `${x.n / x.d}` }), math: [`${improper} = ${mixed}`] }
    : { explain: content('fdp.walk.toImproper'), math: [`${mixed} = ${improper}`] };
}

/** Over a power of ten, then simplify with the gcd (R-FDP-4). */
function simplifySteps(n: bigint, d: bigint, x: Rational, form: FractionForm): NumWalkStep[] {
  const g = gcd(n, d);
  const steps: NumWalkStep[] = [
    g === 1n
      ? { explain: content('rd.walk.lowest', { n: `${n}`, d: `${d}` }), math: [fracTex(n, d)] }
      : {
          explain: content('rd.walk.simplify', { n: `${n}`, d: `${d}`, g: `${g}` }),
          math: [`${fracTex(n, d)} = ${showFraction(x, 'improper').latex}`],
        },
  ];
  if (form === 'mixed' && cmp(x, ONE) > 0) steps.push(mixedStep(x, true));
  return steps;
}

function shiftMini(q: McQuestion, x: Rational, factor: 'times' | 'over', notation: Notation) {
  const rng = mulberry32(q.seed ^ 0x51ed);
  const at = (v: Rational) => ({ value: v, shown: showDecimalOf(v, notation) });
  const scale = (k: number) => (factor === 'times' ? mul(x, rat(k)) : mul(x, rat(1, k)));
  return miniQuestion(
    rng,
    content(factor === 'times' ? 'fdp.walk.mini.times100' : 'fdp.walk.mini.over100', {
      v: dec(factor === 'times' ? x : mul(x, rat(100)), notation),
    }),
    at(scale(100)),
    [at(scale(10)), at(scale(1000)), at(scale(1))],
  );
}

export function fdpWalkthrough(q: McQuestion): NumWalkStep[] {
  const f = fdpOf(q);
  const { x, notation, form } = f;
  const big = cmp(x, ONE) > 0;
  const dir = `${f.source}2${f.target}`;
  const lead = big && f.source === 'F' ? [mixedStep(x, false)] : [];
  const x100 = mul(x, rat(100));
  switch (dir) {
    case 'F2D':
      return [...lead, ...divisionSteps(x.n, x.d, q.seed)];
    case 'F2P':
      return [
        ...lead,
        ...divisionSteps(x.n, x.d, q.seed),
        {
          explain: content('fdp.walk.times100'),
          math: [`${dec(x, notation)} \\times 100 = ${pct(x, notation)}`],
        },
      ];
    case 'D2P':
      return [
        {
          explain: content('fdp.walk.d2p', { dec: dec(x, notation) }),
          mini: shiftMini(q, x, 'times', notation),
          math: [`${dec(x, notation)} \\times 100 = ${dec(x100, notation)}`],
        },
        { explain: content('fdp.walk.percent'), math: [`${dec(x, notation)} = ${pct(x, notation)}`] },
      ];
    case 'P2D':
      return [
        {
          explain: content('fdp.walk.p2d', { pct: pct(x, notation) }),
          mini: shiftMini(q, x100, 'over', notation),
          math: [`${dec(x100, notation)} \\div 100 = ${dec(x, notation)}`],
        },
        { explain: content('fdp.walk.decimal'), math: [`${pct(x, notation)} = ${dec(x, notation)}`] },
      ];
    case 'D2F': {
      if (f.repeating) return xMethodSteps(fromRational(x), q.seed);
      const r = overPowerOfTen(x);
      return [
        {
          explain: content('fdp.walk.d2f.over', { dec: dec(x, notation), d: `${r.d}` }),
          math: [`${dec(x, notation)} = ${fracTex(r.n, r.d)}`],
        },
        ...simplifySteps(r.n, r.d, x, form),
      ];
    }
    default: {
      // P2F
      if (f.repeating)
        return [
          {
            explain: content('fdp.walk.p2f.first', { pct: pct(x, notation) }),
            math: [`${pct(x, notation)} = ${dec(x, notation)}`],
          },
          ...xMethodSteps(fromRational(x), q.seed),
        ];
      const y = overPowerOfTen(x100); // the percent as digits over a power of ten
      const steps: NumWalkStep[] = [
        {
          explain: content('fdp.walk.p2f.over100', { pct: pct(x, notation) }),
          math: [`${pct(x, notation)} = \\frac{${dec(x100, notation)}}{100}`],
        },
      ];
      if (y.d > 1n)
        steps.push({
          explain: content('fdp.walk.p2f.whole', { k: `${y.d}` }),
          math: [`\\frac{${dec(x100, notation)}}{100} = ${fracTex(y.n, 100n * y.d)}`],
        });
      return [...steps, ...simplifySteps(y.n, 100n * y.d, x, form)];
    }
  }
}
