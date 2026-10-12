// PC hints and walkthroughs (requirements §6.4, R-PC-2/3, R-HELP-4/5). The walkthrough shows both
// methods: find the part, and the multiplier. Level 3 explains why the second percent doesn't undo
// the first (R-PC-3).
import { mul, rat, type Rational } from '../../rational';
import { mulberry32 } from '../../rng';
import { fromRational } from '../../numbers/decimal';
import { showMoney } from '../../numbers/display';
import { content, type HintContent } from '../content';
import type { McQuestion } from '../mc';
import { miniQuestion, type NumWalkStep } from '../walk';
import { multiplier, pricesOf, type PcSpec, type PcStep } from './generator';

/** A multiplier with at least 2 decimals: 1.10, 0.75, 0.9775 (R-PC-2). */
export function multText(m: Rational): string {
  const r = fromRational(m);
  return `${r.whole}.${r.nonRep.padEnd(2, '0')}`;
}

export function specOf(q: McQuestion): PcSpec {
  const p = q.params;
  const steps: PcStep[] = [{ pct: Number(p.pct), up: p.dir === 'up' }];
  if (p.pct2) steps.push({ pct: Number(p.pct2), up: p.dir2 === 'up' });
  return { kind: p.kind as PcSpec['kind'], price: BigInt(p.priceCents!), steps };
}

export function pcHint(q: McQuestion, tier: 1 | 2): HintContent {
  const p = q.params;
  const spec = specOf(q);
  const m1 = multText(multiplier(spec.steps[0]!));
  switch (spec.kind) {
    case 'single':
      return content(`pc.single.h${tier}`, { price: p.price!, pct: p.pct!, dir: p.dir!, mult: m1 });
    case 'successive':
      return tier === 1
        ? content('pc.successive.h1', { pct: p.pct!, pct2: p.pct2! })
        : content('pc.successive.h2', { m1, m2: multText(multiplier(spec.steps[1]!)) });
    case 'reverse':
      return content(`pc.reverse.h${tier}`, { price: p.price!, pct: p.pct!, dir: p.dir!, mult: m1 });
    case 'reverseSuccessive': {
      const m2 = multText(multiplier(spec.steps[1]!));
      return tier === 1
        ? content('pc.reverseSuccessive.h1', { price: p.price!, pct2: p.pct2! })
        : content('pc.reverseSuccessive.h2', {
            price: p.price!,
            m1,
            m2,
            both: multText(mul(multiplier(spec.steps[0]!), multiplier(spec.steps[1]!))),
          });
    }
  }
}

export function pcWalkthrough(q: McQuestion): NumWalkStep[] {
  const rng = mulberry32(q.seed ^ 0x7e57);
  const currency = q.params.currency ?? '$';
  const spec = specOf(q);
  const prices = pricesOf(spec)!;
  const money = (c: bigint) => showMoney(c, currency);
  // Money inside KaTeX: \text{…} with the currency sign escaped.
  const tex = (c: bigint) => `\\text{${money(c).text.replace('$', '\\$')}}`;
  const moneyChoice = (c: bigint) => ({ value: rat(c, 100), shown: money(c) });
  const part = (c: bigint, s: PcStep) => mul(rat(c), rat(s.pct, 100)).n; // exact: prices are exact

  /** One change by "find the part", with a mini-question on the part (R-HELP-4). */
  const partStep = (from: bigint, to: bigint, s: PcStep, id: string): NumWalkStep => {
    const pc = part(from, s);
    return {
      explain: content(id, { pct: `${s.pct}`, price: money(from).text, dir: s.up ? 'up' : 'down' }),
      mini: miniQuestion(
        rng,
        content('pc.walk.mini.part', { pct: `${s.pct}`, price: money(from).text }),
        moneyChoice(pc),
        [
          moneyChoice(pc * 10n),
          moneyChoice(pc / 10n || pc + 100n),
          moneyChoice(pc + 100n),
          moneyChoice(pc * 2n),
        ],
      ),
      math: [
        `${s.pct}\\%\\text{ of }${tex(from)} = ${tex(pc)}`,
        `${tex(from)} ${s.up ? '+' : '-'} ${tex(pc)} = ${tex(to)}`,
      ],
    };
  };

  switch (spec.kind) {
    case 'single': {
      const s = spec.steps[0]!;
      return [
        partStep(prices[0]!, prices[1]!, s, 'pc.walk.part'),
        {
          explain: content('pc.walk.multiplier', {
            pct: `${s.pct}`,
            dir: s.up ? 'up' : 'down',
            mult: multText(multiplier(s)),
          }),
          math: [`${tex(prices[0]!)} \\times ${multText(multiplier(s))} = ${tex(prices[1]!)}`],
        },
      ];
    }
    case 'successive': {
      const [s1, s2] = spec.steps as [PcStep, PcStep];
      const both = mul(multiplier(s1), multiplier(s2));
      const back = prices[2] === prices[0];
      const cancelPair = s1.up !== s2.up && s1.pct === s2.pct;
      return [
        partStep(prices[0]!, prices[1]!, s1, 'pc.walk.part'),
        partStep(prices[1]!, prices[2]!, s2, 'pc.walk.second'),
        // R-PC-3: the second percent is taken of a different number, so "up 20% then down 20%"
        // doesn't return to the start. (Up 25% then down 20% does, and the walkthrough says so.)
        {
          explain: content(back ? 'pc.walk.backExactly' : cancelPair ? 'pc.walk.notBack' : 'pc.walk.notAdd', {
            pct: `${s1.pct}`,
            pct2: `${s2.pct}`,
            dir: s1.up ? 'up' : 'down',
            dir2: s2.up ? 'up' : 'down',
            start: money(prices[0]!).text,
            mid: money(prices[1]!).text,
            bigger: s1.up ? 'bigger' : 'smaller',
          }),
          math: back
            ? [`${multText(multiplier(s1))} \\times ${multText(multiplier(s2))} = 1.00`]
            : cancelPair
              ? [`${tex(prices[2]!)} \\ne ${tex(prices[0]!)}`]
              : [],
        },
        {
          explain: content('pc.walk.multipliers', {
            m1: multText(multiplier(s1)),
            m2: multText(multiplier(s2)),
          }),
          math: [
            `${multText(multiplier(s1))} \\times ${multText(multiplier(s2))} = ${multText(both)}`,
            `${tex(prices[0]!)} \\times ${multText(both)} = ${tex(prices[2]!)}`,
          ],
        },
      ];
    }
    case 'reverse': {
      const s = spec.steps[0]!;
      const [original, after] = prices as [bigint, bigint];
      const m = multText(multiplier(s));
      const pc = part(original, s);
      return [
        {
          explain: content('pc.walk.reverse.setup', { pct: `${s.pct}`, dir: s.up ? 'up' : 'down', mult: m }),
          math: [`\\text{original} \\times ${m} = ${tex(after)}`],
        },
        {
          explain: content('pc.walk.reverse.divide', { mult: m }),
          mini: miniQuestion(
            rng,
            content('pc.walk.mini.divide', { price: money(after).text, mult: m }),
            moneyChoice(original),
            [
              mul(rat(after), multiplier({ pct: s.pct, up: !s.up })),
              mul(rat(after), multiplier(s)),
              rat(original + 100n),
              rat(original + 200n),
            ]
              .filter((c) => c.d === 1n)
              .map((c) => moneyChoice(c.n)),
          ),
          math: [`${tex(after)} \\div ${m} = ${tex(original)}`],
        },
        {
          explain: content('pc.walk.reverse.check', { pct: `${s.pct}`, price: money(original).text }),
          math: [
            `${s.pct}\\%\\text{ of }${tex(original)} = ${tex(pc)}`,
            `${tex(original)} ${s.up ? '+' : '-'} ${tex(pc)} = ${tex(after)}\\ \\checkmark`,
          ],
        },
      ];
    }
    case 'reverseSuccessive': {
      // Work backwards: undo the second change, then the first (one division each); or divide once
      // by the two multipliers multiplied together. Then check forwards (R-PC-2).
      const [s1, s2] = spec.steps as [PcStep, PcStep];
      const [original, mid, after] = prices as [bigint, bigint, bigint];
      const m1 = multText(multiplier(s1));
      const m2 = multText(multiplier(s2));
      const both = multText(mul(multiplier(s1), multiplier(s2)));
      /** Wrong choices for "price ÷ m": × m instead, the other change's way, a dollar or two off. */
      const divideChoices = (from: bigint, to: bigint, s: PcStep) =>
        [
          mul(rat(from), multiplier(s)),
          mul(rat(from), multiplier({ pct: s.pct, up: !s.up })),
          rat(to + 100n),
          rat(to + 200n),
        ]
          .filter((c) => c.d === 1n && c.n > 0n)
          .map((c) => moneyChoice(c.n));
      return [
        {
          explain: content('pc.walk.reverse2.setup', {
            pct: `${s1.pct}`,
            dir: s1.up ? 'up' : 'down',
            pct2: `${s2.pct}`,
            dir2: s2.up ? 'up' : 'down',
            m1,
            m2,
          }),
          math: [`\\text{original} \\times ${m1} \\times ${m2} = ${tex(after)}`],
        },
        {
          explain: content('pc.walk.reverse2.undoSecond', { mult: m2 }),
          mini: miniQuestion(
            rng,
            content('pc.walk.mini.divide', { price: money(after).text, mult: m2 }),
            moneyChoice(mid),
            divideChoices(after, mid, s2),
          ),
          math: [`${tex(after)} \\div ${m2} = ${tex(mid)}`],
        },
        {
          explain: content('pc.walk.reverse2.undoFirst', { mult: m1 }),
          mini: miniQuestion(
            rng,
            content('pc.walk.mini.divide', { price: money(mid).text, mult: m1 }),
            moneyChoice(original),
            divideChoices(mid, original, s1),
          ),
          math: [`${tex(mid)} \\div ${m1} = ${tex(original)}`],
        },
        {
          explain: content('pc.walk.reverse2.combined', { m1, m2, both }),
          math: [`${m1} \\times ${m2} = ${both}`, `${tex(after)} \\div ${both} = ${tex(original)}`],
        },
        {
          explain: content('pc.walk.reverse2.check', { price: money(original).text }),
          math: [
            `${tex(original)} \\times ${m1} = ${tex(mid)}`,
            `${tex(mid)} \\times ${m2} = ${tex(after)}\\ \\checkmark`,
          ],
        },
      ];
    }
  }
}
