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
    /** R-EQ-PED-2 */
    shortBalanceAfterCorrectSigns: 10,
    /** design.md §6.3: two rejections on the same step count as one wrong try. */
    rejectionsPerWrongTry: 2,
    /** R-EQ-GEN-2 */
    maxAbsValueLow: 30, // levels 1–3
    maxAbsValueHigh: 50, // levels 4–6
    maxAbsSolution: 20,
    maxSolutionDenominator: 9,
    /** Levels that use the tile builder (R-ANS-5). Typed mode is used there until M2. */
    tileLevels: [1, 2] as readonly number[],
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
