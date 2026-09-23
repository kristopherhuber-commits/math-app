// RD hints H1/H2 and the H3 walkthrough (requirements §6.2, R-HELP-4/5, R-RD-1). Params are LaTeX
// built from this question's own digits; the sentences live in src/ui/strings.ts.
import { gcd, mul, rat, sub, type Rational } from '../../rational';
import { mulberry32 } from '../../rng';
import { fromRational, longDivision, toRational, type DecimalRep } from '../../numbers/decimal';
import { showDecimal, showDecimalOf, showFraction, showInteger } from '../../numbers/display';
import { content, type HintContent } from '../content';
import type { McQuestion } from '../mc';
import { miniQuestion, type ColumnRow, type NumWalkStep } from '../walk';

const ten = (k: number): bigint => 10n ** BigInt(k);
const int = (n: bigint) => ({ value: rat(n), shown: showInteger(n) });
const ell = (x: Rational) => showDecimalOf(x, 'ellipsis').latex;
const fracTex = (n: bigint, d: bigint) => `\\frac{${n}}{${d}}`;

export function repOf(q: McQuestion): DecimalRep {
  const p = q.params;
  return { negative: false, whole: BigInt(p.whole!), nonRep: p.nonRep!, block: p.block! };
}

export function rdHint(q: McQuestion, tier: 1 | 2): HintContent {
  const p = q.params;
  if (q.kind === 'F2D') return content(tier === 1 ? 'rd.f2d.h1' : 'rd.f2d.h2', { n: p.n!, d: p.d! });
  const rep = repOf(q);
  const x = showDecimal(rep, 'ellipsis').latex;
  if (tier === 1) return content('rd.d2f.h1', { x });
  const m = rep.nonRep.length;
  const k = rep.block.length;
  if (m === 0) return content('rd.d2f.h2', { block: rep.block, pow: `${ten(k)}` });
  return content('rd.d2f.h2.delayed', { nonRep: rep.nonRep, p1: `${ten(m)}`, p2: `${ten(m + k)}` });
}

function row(label: string, x: Rational, sign: '' | '−' = ''): ColumnRow {
  const r = fromRational(x);
  return {
    label,
    sign,
    whole: `${r.whole}`,
    frac: r.nonRep + r.block.repeat(3),
    ellipsis: r.block !== '',
    tail: r.nonRep === '',
  };
}

const times = (p: bigint) => (p === 1n ? 'x' : `${p}x`);

/** The x-method (§6.2 walkthrough), with inline mini-questions (R-HELP-4). */
function d2fWalk(q: McQuestion): NumWalkStep[] {
  const rng = mulberry32(q.seed ^ 0x9e3779b9);
  const rep = repOf(q);
  const x = toRational(rep);
  const m = rep.nonRep.length;
  const k = rep.block.length;
  const lo = ten(m);
  const hi = ten(m + k);
  const xs = showDecimal(rep, 'ellipsis').latex;
  const steps: NumWalkStep[] = [{ explain: content('rd.walk.let', { x: xs }), math: [`x = ${xs}`] }];

  if (m === 0) {
    steps.push({
      explain: content('rd.walk.block', { block: rep.block }),
      mini: miniQuestion(rng, content('rd.walk.mini.blockLength'), int(BigInt(k)), [
        int(BigInt(k + 1)),
        int(BigInt(k === 1 ? 3 : k - 1)),
        int(BigInt(k + 2)),
      ]),
      reveal: content('rd.walk.block.reveal', { k: `${k}`, pow: `${hi}` }),
    });
  } else {
    steps.push({
      explain: content('rd.walk.prefix', { nonRep: rep.nonRep }),
      mini: miniQuestion(rng, content('rd.walk.mini.prefixLength'), int(BigInt(m)), [
        int(BigInt(m + 1)),
        int(BigInt(m === 1 ? 3 : m - 1)),
        int(BigInt(m + 2)),
      ]),
      reveal: content('rd.walk.prefix.reveal', { m: `${m}`, pow: `${lo}` }),
      math: [`${times(lo)} = ${ell(mul(x, rat(lo)))}`],
    });
  }

  // Multiply by 10^(m+k): "What is 100 × 4.2424…?"
  const shifted = (p: bigint) => ({
    value: mul(x, rat(p)),
    shown: showDecimalOf(mul(x, rat(p)), 'ellipsis'),
  });
  steps.push({
    explain: content(m === 0 ? 'rd.walk.shift' : 'rd.walk.shift.more', {
      pow: `${hi}`,
      k: `${k}`,
      block: rep.block,
    }),
    mini: miniQuestion(rng, content('rd.walk.mini.times', { pow: `${hi}`, x: xs }), shifted(hi), [
      shifted(hi / 10n),
      shifted(hi * 10n),
      shifted(hi * 100n),
    ]),
    math: [`${times(hi)} = ${ell(mul(x, rat(hi)))}`],
  });

  // Subtract: the tails cancel.
  const top = mul(x, rat(hi));
  const bottom = mul(x, rat(lo));
  const coef = hi - lo;
  const diff = sub(top, bottom); // an integer: the tails cancel
  const through = BigInt(`${rep.whole}${rep.nonRep}${rep.block}`);
  const before = BigInt(`${rep.whole}${rep.nonRep}`);
  steps.push({
    explain: content('rd.walk.subtract', {
      left: `${times(hi)} - ${times(lo)}`,
      right: `${ell(top)} - ${ell(bottom)}`,
    }),
    columns: {
      top: row(times(hi), top),
      bottom: row(times(lo), bottom, '−'),
      result: { label: `${coef}x`, sign: '', whole: `${diff.n}`, frac: '', ellipsis: false, tail: false },
    },
    mini: miniQuestion(rng, content('rd.walk.mini.difference', { coef: `${coef}` }), int(diff.n), [
      int(through),
      int(through + before),
      int(diff.n * 10n),
      int(diff.n + 1n),
    ]),
    reveal: content('rd.walk.cancel'),
    math: [`${coef}x = ${diff.n}`],
  });

  // Divide, then simplify (R-RD-1: the unsimplified fraction first).
  steps.push({
    explain: content('rd.walk.divide', { coef: `${coef}` }),
    math: [`x = ${fracTex(diff.n, coef)}`],
  });
  const g = gcd(diff.n, coef);
  steps.push({
    explain:
      g === 1n
        ? content('rd.walk.lowest', { n: `${diff.n}`, d: `${coef}` })
        : content('rd.walk.simplify', { n: `${diff.n}`, d: `${coef}`, g: `${g}` }),
    math: [
      g === 1n ? `x = ${fracTex(diff.n, coef)}` : `x = ${fracTex(diff.n, coef)} = ${showFraction(x).latex}`,
    ],
  });
  return steps;
}

/** F→D by long division, pointing out the remainder that comes back (§6.2). */
function f2dWalk(q: McQuestion): NumWalkStep[] {
  const rng = mulberry32(q.seed ^ 0x9e3779b9);
  const n = BigInt(q.params.n!);
  const d = BigInt(q.params.d!);
  const ld = longDivision(n, d);
  const repeat = ld.repeat!;
  const again = ld.rows[repeat.row]!.remainder;
  const others = ld.rows.map((r) => r.remainder).filter((r) => r !== again);
  const x = rat(n, d);
  const rep = fromRational(x);
  const both = showDecimalOf(x, 'both');
  return [
    {
      explain: content('rd.walk.f2d.divide', { n: `${n}`, d: `${d}` }),
      math: [`${fracTex(n, d)} = ${n} \\div ${d}`],
    },
    {
      explain: content('rd.walk.f2d.rows', { d: `${d}` }),
      division: { ld, highlightRepeat: false },
      mini: miniQuestion(rng, content('rd.walk.mini.remainder'), int(again), [
        ...others.map(int),
        int(again + 1n),
        int(d - again),
        int(again + 2n),
      ]),
      reveal: content('rd.walk.f2d.again', { r: `${again}` }),
    },
    {
      explain: content('rd.walk.f2d.repeat', { r: `${again}`, block: rep.block }),
      division: { ld, highlightRepeat: true },
      math: [`${fracTex(n, d)} = ${both.latex} ${both.latex2 ?? ''}`.trim()],
    },
  ];
}

export function rdWalkthrough(q: McQuestion): NumWalkStep[] {
  return q.kind === 'F2D' ? f2dWalk(q) : d2fWalk(q);
}
