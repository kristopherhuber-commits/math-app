// Every tunable constant from docs/requirements.md *(default)* markers lives here.

export const config = {
  adaptive: {
    /** R-ADP-2 */
    window: 5,
    promoteThreshold: 4,
    minAttemptsToPromote: 5,
    /** R-ADP-3 */
    demoteThreshold: 3,
  },
  eq: {
    levels: 6,
    /** R-EQ-CHK-3 */
    allowSkippingDefault: false,
    /** Approved rule (2026-09-23): at these levels a correct final answer is accepted from any line. */
    finalAnswerAnyTimeLevels: [6] as readonly number[],
    /** R-EQ-PED-2 */
    shortBalanceAfterCorrectSigns: 10,
    /** R-EQ-PED-2: the parent can re-enable the full animation; off means "shorten after 10". */
    fullBalanceAnimDefault: false,
    /** design.md §6.3: two rejections on the same step count as one wrong try. */
    rejectionsPerWrongTry: 2,
    /** R-EQ-GEN-2 */
    maxAbsValueLow: 30, // levels 1–3
    maxAbsValueHigh: 50, // levels 4–6
    maxAbsSolution: 20,
    maxSolutionDenominator: 9,
    /** Levels that use the tile builder (R-ANS-5). */
    tileLevels: [1, 2] as readonly number[],
  },
  /** Levels per topic (requirements §6–7). */
  levels: { NC: 5, RD: 5, FDP: 5, PC: 5, EQ: 6 },
  /** RD (§6.2). Ranges the spec leaves open are M3 assumptions. */
  rd: {
    /** L3: whole part 1…wholeMax, block length 1…3. L4: whole part 0…wholeMax. */
    wholeMax: 9,
    /** F→D denominators by level; level 5 uses all of them. */
    f2dDenominators: { 3: [3, 9, 11], 4: [6, 12, 15, 22], 5: [7] } as Record<number, readonly number[]>,
    /** Levels (and above) where bar notation is shown beside the ellipsis (R-DISP-3). */
    barFromLevel: 3,
  },
  /** FDP (§6.3). Denominator pools per level; ranges the spec leaves open are M3 assumptions. */
  fdp: {
    denominators: {
      1: [2, 4, 5, 10],
      2: [8, 20, 25, 50, 100],
      /** Level 3 mixed numbers: whole part 1…mixedWholeMax over these denominators. */
      3: [2, 4, 5, 8, 10, 20, 25],
      4: [3, 6, 9, 11, 12],
    } as Record<number, readonly number[]>,
    mixedWholeMax: 5,
    /** Level 3 "< 1%": p/1000 for p in 1…9 (0.1% … 0.9%). */
    tinyMaxThousandths: 9,
    barFromLevel: 4,
  },
  /** PC (§6.4). Prices and percents the spec leaves open are M3 assumptions. */
  pc: {
    minPriceDollars: 5,
    maxPriceDollars: 200,
    nicePercents: [10, 20, 25, 50] as readonly number[],
    /** Level 2: any whole percent in this range. */
    anyPercent: { min: 1, max: 90 },
    /** Levels 3–4: successive and reverse changes. */
    stepPercents: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75] as readonly number[],
  },
  /** R-DISP-6 */
  variables: [
    'a',
    'b',
    'c',
    'd',
    'g',
    'h',
    'k',
    'm',
    'n',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'w',
    'x',
    'y',
    'z',
  ] as const,
  settings: {
    /** R-SES-4 */
    order: 'grouped' as const,
    /** R-SES-6 */
    freePractice: 'afterAssignment' as const,
    /** §6.1 */
    naturalIncludesZero: false,
    /** R-PC-4 */
    currency: '$',
    /** R-RWD-7 */
    mascotNames: { turtle: 'Shelly', penguin: 'Pip' },
  },
  /** R-NF-1 */
  stepCheckerBudgetMs: 20,
} as const;

export type VariableLetter = (typeof config.variables)[number];
