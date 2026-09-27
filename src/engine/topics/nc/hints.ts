// NC hints and the sets-map walkthrough (requirements §6.1, R-HELP-4/5, design.md §5 SetsMap).
// H1 starts at the smallest set; H2 is specific to the written form; H3 reduces the number, places it
// in its innermost set, lights up every set containing that one, and names the smallest set, the
// answer (R-NC-2, M7).
import { rat, sign, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { fromRational } from '../../numbers/decimal';
import { showDecimal, showFraction, showInteger, type Shown } from '../../numbers/display';
import { content, type HintContent } from '../content';
import { miniQuestion, type ColumnRow, type NcSet, type NumWalkStep } from '../walk';
import { innermostSet, NC_SETS, ncMembership } from './checker';
import type { NcQuestion } from './generator';

export function ncHint(q: NcQuestion, tier: 1 | 2): HintContent {
  const x = q.shown.latex;
  if (tier === 1) return content('nc.h1', { x });
  const p: Record<string, string> = { x };
  if (q.value.kind === 'rational') {
    const v = q.value.value;
    switch (q.form) {
      case 'intFraction': {
        const [a = '', b = ''] = q.shown.text.split('/');
        return content('nc.h2.intFraction', { x, a: a.replace('−', '-'), b: b.replace('−', '-') });
      }
      case 'zeroFraction':
        return content('nc.h2.zeroFraction', { x, b: q.shown.text.split('/')[1]! });
      case 'pointZero':
        return content('nc.h2.pointZero', p);
      case 'nines': {
        const w = (v.n < 0n ? -v.n : v.n) - 1n;
        return content(v.n < 0n ? 'nc.h2.nines.neg' : 'nc.h2.nines', { x, xs: nines(w).latex });
      }
      case 'decimal':
      case 'negDecimal':
        return content('nc.h2.decimal', { x, over: `${10 ** fromRational(v).nonRep.length}` });
      case 'repeating':
      case 'repeatingWhole':
        return content('nc.h2.repeating', { x, block: fromRational(v).block });
      case 'fraction':
      case 'negFraction':
        return content('nc.h2.fraction', p);
      case 'zero':
        return content('nc.h2.zero', p);
      case 'negInt':
        return content('nc.h2.negInt', p);
      default:
        return content(sign(v) > 0 ? 'nc.h2.posInt' : 'nc.h2.negInt', p);
    }
  }
  return content('nc.h2.irrational', p);
}

const setShown = (s: NcSet): Shown => ({ kind: 'text', latex: s, text: s, speech: s });

/** w.999… for a whole part w, written digit by digit (as a Rational it would read as w + 1). */
const nines = (w: bigint): Shown =>
  showDecimal({ negative: false, whole: w, nonRep: '', block: '9' }, 'ellipsis');
const int = (n: bigint) => ({ value: rat(n), shown: showInteger(n) });
const ninesRow = (label: string, w: bigint, sign: '' | '−' = ''): ColumnRow => ({
  label,
  sign,
  whole: `${w}`,
  frac: '999',
  ellipsis: true,
  tail: true,
});

/**
 * The x-method for ±w.999… (the level 5 challenge), as in the RD walkthrough (§6.2): x = w.999…,
 * 10x = (10w + 9).999…, subtract, 9x = 9w + 9, x = w + 1. Built from digits, because the value
 * v = ±(w + 1) can't show its own nines. A minus sign is set aside first and put back at the end.
 */
function ninesSteps(v: Rational, rng: Rng): NumWalkStep[] {
  const neg = v.n < 0n;
  const one = neg ? -v.n : v.n; // w + 1
  const w = one - 1n;
  const xs = nines(w).latex;
  const steps: NumWalkStep[] = [];
  if (neg) steps.push({ explain: content('nc.walk.nines.sign', { x: xs }) });
  steps.push({ explain: content('rd.walk.let', { x: xs }), math: [`x = ${xs}`] });
  steps.push({
    explain: content('rd.walk.block', { block: '9' }),
    mini: miniQuestion(rng, content('rd.walk.mini.blockLength'), int(1n), [int(2n), int(3n)]),
    reveal: content('rd.walk.block.reveal', { k: '1', pow: '10' }),
  });
  const times = (p: bigint) => ({ value: rat(one * p), shown: nines(one * p - 1n) });
  steps.push({
    explain: content('rd.walk.shift', { pow: '10', k: '1', block: '9' }),
    mini: miniQuestion(rng, content('rd.walk.mini.times', { pow: '10', x: xs }), times(10n), [
      times(1n),
      times(100n),
    ]),
    math: [`10x = ${nines(10n * w + 9n).latex}`],
  });
  const diff = 9n * w + 9n;
  steps.push({
    explain: content('rd.walk.subtract', { left: '10x - x', right: `${nines(10n * w + 9n).latex} - ${xs}` }),
    columns: {
      top: ninesRow('10x', 10n * w + 9n),
      bottom: ninesRow('x', w, '−'),
      result: { label: '9x', sign: '', whole: `${diff}`, frac: '', ellipsis: false, tail: false },
    },
    mini: miniQuestion(rng, content('rd.walk.mini.difference', { coef: '9' }), int(diff), [
      int(10n * w + 9n),
      int(diff + 1n),
      int(diff - 1n),
    ]),
    reveal: content('rd.walk.cancel'),
    math: [`9x = ${diff}`],
  });
  steps.push({
    explain: content('rd.walk.divide', { coef: '9' }),
    math: [`x = \\frac{${diff}}{9} = ${one}`],
  });
  return steps;
}

/** H3 on the sets map (R-HELP-4). */
export function ncWalkthrough(q: NcQuestion): NumWalkStep[] {
  const rng = mulberry32(q.seed ^ 0x5e75);
  const steps: NumWalkStep[] = [];
  const x = q.shown.latex;
  const place = innermostSet(q.value);
  const m = ncMembership(q.value);

  // 1. What number is it, really? (disguised forms are reduced first, R-NC-1)
  if (q.value.kind === 'irrational') {
    steps.push({ explain: content(`nc.walk.value.irrational.${q.value.pattern.family}`, { x }) });
  } else {
    const v = q.value.value;
    const exact = showFraction(v).latex;
    switch (q.form) {
      case 'intFraction':
      case 'zeroFraction':
        steps.push({ explain: content('nc.walk.value.divide', { x }), math: [`${x} = ${exact}`] });
        break;
      case 'pointZero':
        steps.push({ explain: content('nc.walk.value.pointZero', { x }), math: [`${x} = ${exact}`] });
        break;
      case 'nines':
        steps.push(...ninesSteps(v, rng), {
          explain: content('nc.walk.value.nines', { x, v: exact }),
          math: [`${x} = ${exact}`],
        });
        break;
      case 'decimal':
      case 'negDecimal': {
        const r = fromRational(v);
        const over = 10n ** BigInt(r.nonRep.length);
        const top = (v.n < 0n ? -v.n : v.n) * (over / v.d);
        steps.push({
          explain: content('nc.walk.value.decimal', { x, over: `${over}` }),
          math: [`${x} = ${v.n < 0n ? '-' : ''}\\frac{${top}}{${over}} = ${exact}`],
        });
        break;
      }
      case 'repeating':
      case 'repeatingWhole':
        steps.push({
          explain: content('nc.walk.value.repeating', { x, block: fromRational(v).block }),
          math: [`${x} = ${exact}`],
        });
        break;
      case 'fraction':
      case 'negFraction':
        steps.push({ explain: content('nc.walk.value.fraction', { x }), math: [x] });
        break;
      default:
        steps.push({ explain: content('nc.walk.value.integer', { x }), math: [x] });
    }
  }

  // 2. Its innermost set, as a mini-question (R-HELP-4).
  const others = NC_SETS.filter((s) => s !== place);
  steps.push({
    explain: content('nc.walk.place', { x }),
    mini: miniQuestion(
      rng,
      content('nc.walk.mini.smallest'),
      { value: rat(NC_SETS.indexOf(place)), shown: setShown(place) },
      rng.shuffle(others).map((s) => ({ value: rat(NC_SETS.indexOf(s)), shown: setShown(s) })),
    ),
    reveal: content(`nc.walk.place.${place}`, { x }),
    sets: { place, lit: [place] },
  });

  // 3. Every set that contains that one (design.md §5: each enclosing box lights up in turn).
  const lit = NC_SETS.filter((s) => m[s]);
  steps.push({
    explain: content(`nc.walk.contains.${place}`, { x }),
    sets: { place, lit },
  });

  // 4. The answer: the smallest set (R-NC-2, M7).
  steps.push({ explain: content('nc.walk.answer', { set: place }), sets: { place, lit } });
  return steps;
}
