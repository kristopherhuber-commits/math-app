// Every tunable constant from docs/requirements.md *(default)* markers lives here.

export const config = {
  adaptive: {
    /** R-ADP-2 */
    window: 5,
    promoteThreshold: 4,
    minAttemptsToPromote: 5,
    /** R-ADP-3 */
    demoteThreshold: 3,
    /** R-ADP-3: "a second wrong answer" = this many wrong tries. */
    demoteWrongTries: 2,
    /** Starting level per topic (parent decision, M4): EQ starts at typed steps. */
    startLevel: { NC: 1, RD: 1, FDP: 1, PC: 1, EQ: 3 },
  },
  /**
   * Adaptive free practice (parent decision, 2026-09-25; assignments keep R-ADP-2/3): start at
   * level 3; up after 3 right in a row (first try, no hint); down when 2 of the last 3 had a
   * mistake or needed help.
   */
  freeAdaptive: { startLevel: 3, window: 3, promoteRight: 3, demoteStruggled: 2 },
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
  /** Multiple choice and select-all (R-HELP-1/2): the wrong try that first offers a hint. */
  mc: { wrongTriesBeforeHint: 2 },
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
  /** NC (§6.1). Ranges the spec leaves open are M3 assumptions. */
  nc: {
    maxInteger: 50,
    fractionDenominators: [2, 3, 4, 5, 6, 8, 10] as readonly number[],
    repeatingDenominators: [3, 6, 7, 9, 11, 12] as readonly number[],
    /** The digits of a patterned irrational shown before the ellipsis: d, then 0^i d for i = 1…3. */
    patternGroups: 3,
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
    /** R-SES-6. `always` by the parent's decision (M5); the spec's default is `afterAssignment`. */
    freePractice: 'always' as 'always' | 'afterAssignment' | 'never',
    /** §6.1 */
    naturalIncludesZero: false,
    /** R-PC-4 */
    currency: '$',
    /** R-RWD-7 */
    mascotNames: { turtle: 'Shelly', penguin: 'Pip' },
  },
  /** Parent area (R-PAR, R-NF-5). Values the spec leaves open are M5 assumptions. */
  parent: {
    /** R-PAR-1: a 4-digit PIN. */
    pinLength: 4,
    /** The parent area locks again after this long without input (mockup 10). */
    autoLockMinutes: 10,
    /** R-PAR-3: time spent counts at most this much per question (a question left open isn't time spent). */
    maxAttemptMinutes: 10,
    /** R-PAR-3: the dashboard's window. */
    dashboardDays: 30,
    /** design.md §7.10 "Worth a look": H3 in ≥ half of a topic's last 6; an EQ diagnostic ≥ 5× in 7 days. */
    worth: { recentAttempts: 6, walkthroughShare: 0.5, diagnosticCount: 5, diagnosticDays: 7 },
    /** R-NF-5: the error list keeps the newest entries. */
    errorLogMax: 200,
    /** R-RWD-7: mascot names. */
    maxNameLength: 16,
  },
  /**
   * The shop (parent decision, M6): real rewards bought with shells to spend; the parent gives them.
   * Default names and prices; the parent can change prices, and M7 makes the list editable.
   */
  shop: {
    items: [
      {
        id: 'treat',
        name: 'Strawberry Açaí Lemonade Refresher',
        price: 150,
        note: 'A real drink from Starbucks. A grown-up gets it for you.',
      },
      {
        id: 'robux',
        name: 'Roblox gift card, 2,000 Robux',
        price: 1500,
        note: 'A real Roblox gift card with 2,000 Robux. A grown-up gets it for you.',
      },
    ] as readonly { id: string; name: string; price: number; note: string }[],
    maxPrice: 100_000,
    /** Names that were defaults before and are replaced on load (the parent renamed the treat, 2026-09-25). */
    renamed: { treat: { from: 'Starbucks treat', to: 'Strawberry Açaí Lemonade Refresher' } } as Record<
      string,
      { from: string; to: string }
    >,
    /** A picture the parent adds is scaled to fit this square and kept on the device only. */
    imageMaxPx: 320,
  },
  /**
   * Cosmetics (R-RWD-4 as the parent reshaped it): each unlocks when the lifetime shell count reaches
   * `at`, and is worn at once. Alternating turtle and penguin.
   */
  cosmetics: [
    { id: 'turtle-hat', mascot: 'turtle', kind: 'hat', at: 20 },
    { id: 'penguin-scarf', mascot: 'penguin', kind: 'scarf', at: 50 },
    { id: 'turtle-sunglasses', mascot: 'turtle', kind: 'sunglasses', at: 100 },
    { id: 'penguin-hat', mascot: 'penguin', kind: 'hat', at: 175 },
    { id: 'turtle-scarf', mascot: 'turtle', kind: 'scarf', at: 275 },
    { id: 'penguin-sunglasses', mascot: 'penguin', kind: 'sunglasses', at: 400 },
    { id: 'turtle-bowtie', mascot: 'turtle', kind: 'bowtie', at: 550 },
    { id: 'penguin-bowtie', mascot: 'penguin', kind: 'bowtie', at: 750 },
  ] as readonly {
    id: string;
    mascot: 'turtle' | 'penguin';
    kind: 'hat' | 'scarf' | 'sunglasses' | 'bowtie';
    at: number;
  }[],
  /**
   * Shells earned per answer by its stars (R-RWD-4 has 1 ★ = 1 shell); the parent can change them
   * in Parent › Rewards (2026-09-25). `maxPerAnswer` and `maxBalance` bound what the parent can enter.
   */
  shells: { perStars: { 1: 1, 2: 2, 3: 3 }, maxPerAnswer: 100, maxBalance: 1_000_000 },
  /** Home beach: at most this many shells drawn on the sand (design.md §7.1). */
  beachShellsMax: 12,
  /** R-RWD-2/3/5 */
  rewards: {
    /** Streak lengths that get the full-screen celebration; after the last, every `streakEvery`. */
    streakMilestones: [3, 5, 7, 10, 14, 21, 30] as readonly number[],
    streakEvery: 10,
    /** Streak badges (R-RWD-3). */
    streakBadges: [7, 30] as readonly number[],
    /** "10 EQ questions without H3", in a row. */
    eqRunWithoutWalkthrough: 10,
  },
  /** R-NF-1 */
  stepCheckerBudgetMs: 20,
} as const;

export type TopicId = keyof typeof config.levels;
export const TOPICS: readonly TopicId[] = ['NC', 'RD', 'FDP', 'PC', 'EQ'];

export type VariableLetter = (typeof config.variables)[number];
