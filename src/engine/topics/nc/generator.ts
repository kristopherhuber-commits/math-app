// NC generators, levels 1–5 (requirements §6.1, R-NC-1…5, R-DISP-1/3/4). Each question shows one
// number, in the written form the level calls for; the checker decides from its exact value.
import { config } from '../../config';
import { gcd, rat, type Rational } from '../../rational';
import { mulberry32, type Rng } from '../../rng';
import { toRational } from '../../numbers/decimal';
import {
  MINUS,
  showDecimal,
  showDecimalOf,
  showFraction,
  showInteger,
  type Shown,
} from '../../numbers/display';
import { content, type Params } from '../content';
import { withRetries } from '../mc';
import type { IrrationalPattern, NcValue } from './checker';

export const NC_GENERATOR_ID = 'nc.v1';

/** Written forms. L1: posInt zero fraction decimal · L2: negInt negFraction negDecimal repeating ·
 *  L3: intFraction zeroFraction pointZero · L4: irrational + all above · L5: nines repeatingWhole + all. */
export type NcForm =
  | 'posInt'
  | 'zero'
  | 'fraction'
  | 'decimal'
  | 'negInt'
  | 'negFraction'
  | 'negDecimal'
  | 'repeating'
  | 'intFraction'
  | 'zeroFraction'
  | 'pointZero'
  | 'irrational'
  | 'nines'
  | 'repeatingWhole';

const L1: NcForm[] = ['posInt', 'zero', 'fraction', 'decimal'];
const L2: NcForm[] = ['negInt', 'negFraction', 'negDecimal', 'repeating'];
const L3: NcForm[] = ['intFraction', 'zeroFraction', 'pointZero'];

export interface NcQuestion {
  topic: 'NC';
  generatorId: typeof NC_GENERATOR_ID;
  seed: number;
  level: number;
  form: NcForm;
  shown: Shown;
  value: NcValue;
  params: Params;
}

const signed = (neg: boolean) => (neg ? MINUS : '');
const signedTex = (neg: boolean) => (neg ? '-' : '');

function properFraction(rng: Rng, dens: readonly number[]): Rational | null {
  const d = rng.pick(dens);
  const n = rng.int(1, d - 1);
  return gcd(BigInt(n), BigInt(d)) === 1n ? rat(n, d) : null;
}

/** A terminating non-integer decimal with 1–2 places, e.g. 0.25, 1.5, 3.75. */
function terminating(rng: Rng): Rational | null {
  const places = rng.int(1, 2);
  const x = rat(rng.int(1, 999), 10 ** places);
  return x.d === 1n ? null : x;
}

/** The digits of a patterned irrational, with the ellipsis (R-DISP-4). */
export function patternDigits(p: IrrationalPattern): string {
  let digits = '';
  if (p.family === 'counting') {
    for (let i = 1; digits.length < 15; i++) digits += `${i}`;
  } else {
    if (p.lead) digits += `${p.digit}`;
    for (let i = 1; i <= config.nc.patternGroups; i++) digits += '0'.repeat(i) + `${p.digit}`;
  }
  return `${p.whole}.${digits}`;
}

function showPattern(p: IrrationalPattern): Shown {
  const body = patternDigits(p);
  return {
    kind: 'math',
    latex: `${signedTex(p.negative)}${body}\\text{…}`,
    text: `${signed(p.negative)}${body}…`,
    speech: `${p.negative ? 'minus ' : ''}${body} and so on, never repeating`,
    caption: content(`nc.caption.${p.family}`, { digit: `${p.digit}` }),
  };
}

/** Written like the learner would see it on paper: 12/4, −8/−2, −0/5, 3.0, −3.000. */
function written(latex: string, text: string, speech: string): Shown {
  return { kind: 'math', latex, text, speech };
}

function build(rng: Rng, level: number, seed: number): NcQuestion | null {
  let forms: NcForm[];
  switch (level) {
    case 1:
      forms = L1;
      break;
    case 2:
      forms = L2;
      break;
    case 3:
      forms = L3;
      break;
    case 4:
      // Irrational patterns half the time, mixed with all of the above.
      forms = rng.bool() ? ['irrational'] : [...L1, ...L2, ...L3];
      break;
    default:
      forms = rng.bool() ? ['nines', 'repeatingWhole', 'pointZero'] : [...L1, ...L2, ...L3, 'irrational'];
  }
  const form = rng.pick(forms);
  let value: NcValue;
  let shown: Shown;
  const r = (x: Rational): NcValue => ({ kind: 'rational', value: x });
  switch (form) {
    case 'posInt':
    case 'negInt': {
      const n = rng.int(1, config.nc.maxInteger) * (form === 'negInt' ? -1 : 1);
      value = r(rat(n));
      shown = showInteger(BigInt(n));
      break;
    }
    case 'zero':
      value = r(rat(0));
      shown = showInteger(0n);
      break;
    case 'fraction':
    case 'negFraction': {
      const f = properFraction(rng, config.nc.fractionDenominators);
      if (!f) return null;
      const x = form === 'negFraction' ? rat(-f.n, f.d) : f;
      value = r(x);
      shown = showFraction(x);
      break;
    }
    case 'decimal':
    case 'negDecimal': {
      const t = terminating(rng);
      if (!t) return null;
      const x = form === 'negDecimal' ? rat(-t.n, t.d) : t;
      value = r(x);
      shown = showDecimalOf(x, 'ellipsis');
      break;
    }
    case 'repeating':
    case 'repeatingWhole': {
      const f = properFraction(rng, config.nc.repeatingDenominators);
      if (!f) return null;
      const whole = form === 'repeatingWhole' ? rng.int(1, 9) : 0;
      const neg = form === 'repeating' && rng.bool();
      const pos = rat(BigInt(whole) * f.d + f.n, f.d);
      const x = neg ? rat(-pos.n, pos.d) : pos;
      value = r(x);
      shown = showDecimalOf(x, 'ellipsis'); // R-DISP-3: block 3 times + caption
      break;
    }
    case 'intFraction': {
      // 12/4, 6/3, 15/5, −8/−2: a fraction whose value is an integer.
      const b = rng.int(2, 9);
      const k = rng.int(1, 9);
      const a = b * k;
      const variant = rng.int(0, 3); // 0: a/b, 1: −a/b, 2: a/−b, 3: −a/−b
      const numNeg = variant === 1 || variant === 3;
      const denNeg = variant === 2 || variant === 3;
      value = r(rat(numNeg !== denNeg ? -k : k));
      shown = written(
        `\\frac{${signedTex(numNeg)}${a}}{${signedTex(denNeg)}${b}}`,
        `${signed(numNeg)}${a}/${signed(denNeg)}${b}`,
        `${numNeg ? 'minus ' : ''}${a} over ${denNeg ? 'minus ' : ''}${b}`,
      );
      break;
    }
    case 'zeroFraction': {
      const b = rng.int(2, 9);
      const neg = rng.bool();
      value = r(rat(0));
      shown = written(
        `${signedTex(neg)}\\frac{0}{${b}}`,
        `${signed(neg)}0/${b}`,
        `${neg ? 'minus ' : ''}0 over ${b}`,
      );
      break;
    }
    case 'pointZero': {
      // 3.0, 12.00, −3.000: an integer written with zeros after the point.
      const n = rng.int(0, config.nc.maxInteger);
      const neg = n !== 0 && rng.bool();
      const zeros = '0'.repeat(rng.int(1, 3));
      value = r(rat(neg ? -n : n));
      shown = written(
        `${signedTex(neg)}${n}.${zeros}`,
        `${signed(neg)}${n}.${zeros}`,
        `${neg ? 'minus ' : ''}${n} point ${zeros.split('').join(' ')}`,
      );
      break;
    }
    case 'nines': {
      // 0.999… = 1 (the level 5 challenge): shown as written, valued exactly (R-RD-2 formula).
      const whole = rng.int(0, 5);
      const neg = rng.bool();
      const rep = { negative: neg, whole: BigInt(whole), nonRep: '', block: '9' };
      value = r(toRational(rep));
      shown = showDecimal(rep, 'ellipsis');
      break;
    }
    case 'irrational': {
      const family = rng.pick(['growingZeros', 'growingZeros', 'counting'] as const);
      const pattern: IrrationalPattern =
        family === 'counting'
          ? { family, whole: 0, digit: 1, lead: true, negative: rng.bool() }
          : { family, whole: rng.int(0, 9), digit: rng.int(1, 9), lead: rng.bool(), negative: rng.bool() };
      value = { kind: 'irrational', pattern };
      shown = showPattern(pattern);
      break;
    }
  }
  const params: Params = { form, text: shown.text };
  if (value.kind === 'rational') params.value = `${value.value.n}/${value.value.d}`;
  return { topic: 'NC', generatorId: NC_GENERATOR_ID, seed, level, form, shown, value, params };
}

/** The same (level, seed) always gives the same question (R-ARCH-3). */
export function generateNc(level: number, seed: number): NcQuestion {
  if (level < 1 || level > config.levels.NC) throw new RangeError(`NC level ${level}`);
  return withRetries(mulberry32(seed), (rng) => build(rng, level, seed));
}
