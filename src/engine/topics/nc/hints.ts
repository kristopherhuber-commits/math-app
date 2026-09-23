// NC hints and the sets-map walkthrough (requirements §6.1, R-HELP-4/5, design.md §5 SetsMap).
// H1 starts at the smallest set; H2 is specific to the written form; H3 reduces the number, places it
// in its innermost set, lights up every set containing that one, and lists the boxes to tick.
import { rat, sign } from '../../rational';
import { mulberry32 } from '../../rng';
import { fromRational } from '../../numbers/decimal';
import { showFraction, type Shown } from '../../numbers/display';
import { content, type HintContent } from '../content';
import { miniQuestion, type NcSet, type NumWalkStep } from '../walk';
import { innermostSet, NC_SETS, ncMembership } from './checker';
import type { NcQuestion } from './generator';

export function ncHint(q: NcQuestion, tier: 1 | 2, naturalIncludesZero: boolean): HintContent {
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
      case 'nines':
        return content('nc.h2.nines', p);
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
        return content(naturalIncludesZero ? 'nc.h2.zero.natural' : 'nc.h2.zero', p);
      case 'negInt':
        return content('nc.h2.negInt', p);
      default:
        return content(sign(v) > 0 ? 'nc.h2.posInt' : 'nc.h2.negInt', p);
    }
  }
  return content('nc.h2.irrational', p);
}

const setShown = (s: NcSet): Shown => ({ kind: 'text', latex: s, text: s, speech: s });

/** H3 on the sets map (R-HELP-4). */
export function ncWalkthrough(q: NcQuestion, naturalIncludesZero: boolean): NumWalkStep[] {
  const rng = mulberry32(q.seed ^ 0x5e75);
  const steps: NumWalkStep[] = [];
  const x = q.shown.latex;
  const place = innermostSet(q.value, naturalIncludesZero);
  const m = ncMembership(q.value, naturalIncludesZero);

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
        steps.push({
          explain: content('nc.walk.value.nines', { x }),
          math: [
            '3 \\times 0.333\\text{…} = 0.999\\text{…}',
            '3 \\times \\frac{1}{3} = 1',
            `${x} = ${exact}`,
          ],
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
  const others = NC_SETS.filter((s) => s !== place && s !== 'real');
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

  // 4. The boxes to tick.
  steps.push({ explain: content('nc.walk.tick', { sets: lit.join(',') }), sets: { place, lit } });
  return steps;
}
