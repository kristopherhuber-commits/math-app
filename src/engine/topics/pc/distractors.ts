// PC distractors from misconception models (requirements §6.4, R-ANS-2): PC-M1…M7. A candidate is
// offered only when it is a positive price exact to the cent (R-PC-1: nothing is rounded).
import { isInteger, mul, rat, type Rational } from '../../rational';
import { showMoney } from '../../numbers/display';
import { FILLER, type McCandidate } from '../mc';
import type { PcSpec } from './generator';

const cents = (x: Rational): bigint | null => (isInteger(x) ? x.n : null);
const scaled = (c: bigint, num: number, den = 100): bigint | null => cents(mul(rat(c), rat(num, den)));
const signed = (up: boolean, pct: number) => (up ? pct : -pct);

export function pcModels(spec: PcSpec, prices: bigint[], currency: string): McCandidate[] {
  const out: { c: bigint | null; code: string }[] = [];
  const s1 = spec.steps[0]!;
  const start = prices[0]!;
  const end = prices.at(-1)!;
  switch (spec.kind) {
    case 'single':
      // PC-M1: the percent added as dollars ($40 up 10% → $50).
      out.push({ c: start + BigInt(signed(s1.up, s1.pct)) * 100n, code: 'PC-M1' });
      // PC-M2: the change, not the new price ($4.00).
      out.push({ c: scaled(start, s1.pct), code: 'PC-M2' });
      // PC-M3: the wrong direction ($36).
      out.push({ c: scaled(start, 100 + signed(!s1.up, s1.pct)), code: 'PC-M3' });
      break;
    case 'successive': {
      const s2 = spec.steps[1]!;
      const net = signed(s1.up, s1.pct) + signed(s2.up, s2.pct);
      // PC-M4: the changes cancel (up 20% then down 20% → back to $50).
      if (s1.up !== s2.up) out.push({ c: start, code: 'PC-M4' });
      // PC-M5: the percents added (up 20%, down 10% → up 10%).
      out.push({ c: scaled(start, 100 + net), code: 'PC-M5' });
      // PC-M2: the total change, not the new price.
      out.push({ c: end > start ? end - start : start - end, code: 'PC-M2' });
      // PC-M3: both changes the wrong way.
      const a = scaled(start, 100 + signed(!s1.up, s1.pct));
      out.push({ c: a === null ? null : scaled(a, 100 + signed(!s2.up, s2.pct)), code: 'PC-M3' });
      // PC-M1: the percents added as dollars.
      out.push({ c: start + BigInt(net) * 100n, code: 'PC-M1' });
      break;
    }
    case 'reverse': {
      const after = spec.price;
      const original = prices[0]!;
      // PC-M6 / PC-M7: the percent taken of the final price and undone ($60 × 1.25 = $75;
      // $66 − $6.60 = $59.40). The two give the same value; the spec's example fixes the code.
      out.push({ c: scaled(after, 100 + signed(!s1.up, s1.pct)), code: s1.up ? 'PC-M7' : 'PC-M6' });
      // PC-M3: the change applied again, the wrong way round ($60 × 0.75 = $45).
      out.push({ c: scaled(after, 100 + signed(s1.up, s1.pct)), code: 'PC-M3' });
      // PC-M1: the percent added (or taken) as dollars ($60 + $25 = $85).
      out.push({ c: after - BigInt(signed(s1.up, s1.pct)) * 100n, code: 'PC-M1' });
      // PC-M2: the change, not the original price ($20.00).
      out.push({ c: original > after ? original - after : after - original, code: 'PC-M2' });
      break;
    }
  }
  return out
    .filter((o): o is { c: bigint; code: string } => o.c !== null && o.c > 0n)
    .map((o) => ({ value: rat(o.c, 100), shown: showMoney(o.c, currency), code: o.code }));
}

/** Near-miss prices: the answer ± $1, ± $2, … (R-ANS-2 fillers). */
export function* pcFillers(answer: bigint, currency: string): Generator<McCandidate> {
  for (let i = 1n; i < 100n; i++) {
    for (const c of [answer + i * 100n, answer - i * 100n]) {
      if (c > 0n) yield { value: rat(c, 100), shown: showMoney(c, currency), code: FILLER };
    }
  }
}
