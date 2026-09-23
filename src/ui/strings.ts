// All learner-facing copy (R-NF-4). Tone rules: design.md §9 — no "wrong", no red, no timers.
// Text between $…$ is math and is rendered with KaTeX by <Rich>.
import type { StepLabel, StepResult } from '../engine/eq/stepChecker';
import type { HintContent } from '../engine/topics/eq/hints';

type P = Record<string, string>;

export const strings = {
  appName: 'Turtle & Penguin Math',
  home: {
    greeting: 'Hi there!',
    intro: 'Pick a level and solve equations one step at a time.',
    topic: 'Equations',
    level: (n: number) => `Level ${n}`,
    levelExamples: {
      1: '$3x + 4 = 19$',
      2: '$7 − 3z = 13$',
      3: '$5n − 7 = 2n + 8$',
      4: '$3(y − 2) = y + 8$',
      5: '$x/4 + 1 = 3$',
      6: 'Mixed review',
    } as Record<number, string>,
    start: 'Start',
  },
  topBar: {
    home: '‹ Home',
    title: 'Equations',
    question: (n: number) => `Question ${n}`,
  },
  practice: {
    chip: (level: number) => `Equations · Level ${level}`,
    prompt: (v: string) => `Solve for $${v}$ and show each step.`,
    steps: 'Steps',
    currentLine: 'Your next line',
    keypad: 'Keypad',
    help: 'Help',
    checkStep: 'Check step',
    clearLine: 'Clear line',
    next: 'Next question',
    solved: 'Solved!',
    keyboardHint: 'Physical keyboard works too: * → ×   - → −   Enter → Check step',
    fractionKey: 'fraction',
    backspace: 'delete',
  },
  labels: {
    given: 'Given',
    expanded: 'Expanded ✓',
    clearedFractions: 'Fractions cleared ✓',
    moved: 'Moved ✓',
    movedPartial: 'Moved ✓ (and you started simplifying, nice)',
    movedSimplified: 'Moved + simplified ✓',
    simplified: 'Simplified ✓',
    simplifiedPartial: 'Simplified ✓ (keep going)',
    simplifiedSolved: 'Simplified + solved ✓',
    solved: 'Solved ✓',
    solvedDirect: 'Solved ✓ (straight to the answer)',
  } satisfies Record<StepLabel | 'given', string>,
  decimalAlsoFraction: (p: P) => `($${p.fraction}$ is also fine.)`,
  hint: {
    title: (n: number) => `Hint ${n} of 3`,
    more: 'Another hint',
    close: 'Close',
    offer: 'Want a hint? I can help.',
    showMe: 'Show me step by step',
    walkNote: "Walkthrough = 1 star, and that's OK!",
  },
  tiles: {
    prompt: (v: string) => `Solve for $${v}$`,
    given: 'given',
    board: 'Equation board',
    unknowns: (v: string) => `Unknowns ($${v}$ terms)`,
    knowns: 'Knowns (numbers)',
    swap: '⇄ swap',
    swapLabel: 'Swap which side holds the unknowns',
    whichSign: 'Which sign?',
    plus: 'plus',
    minus: 'minus',
    soFar: 'So far:',
    doneMoving: 'Done moving',
    check: 'Check',
    tile: (term: string, side: 'L' | 'R', locked: boolean) =>
      `${term}, on the ${side === 'L' ? 'left' : 'right'}${locked ? ', moved' : ''}`,
    alreadyPlaced: (term: string, isVar: boolean) =>
      `$${term}$ is already with the ${isVar ? 'unknowns' : 'knowns'}. Move the ones on the other side.`,
    signTitle: (term: string) => `When $${term}$ moves across the =, what happens to its sign?`,
    balanceSubtract: (amount: string) => `Take $${amount}$ away from BOTH sides: the scale stays balanced.`,
    balanceAdd: (amount: string) => `Add $${amount}$ to BOTH sides: the scale stays balanced.`,
    shortcut: "Moving a term across = flips its sign (that's the balance, done in one step).",
    balanceLabel: 'Balance scale',
    simplifyVar: (varText: string, v: string) => `$${varText} = {?}\\,${v}$`,
    simplifyConst: (constText: string) => `$${constText} = {?}$`,
    divide: (line: string) => `$${line}$. Divide both sides by …?`,
    answer: (v: string) => `$${v} = {?}$`,
    divisorFeedback: (v: string) => `Not quite. What number is $${v}$ being multiplied by?`,
    pad: 'Number pad',
    padMinus: 'minus',
    padDelete: 'delete',
    entry: 'Your answer',
    steps: 'Steps',
    rail: {
      MOVE: ['Move', 'unknowns | knowns'],
      SIMPLIFY: ['Simplify', 'combine like terms'],
      SOLVE: ['Solve', 'divide both sides'],
    } as Record<string, [string, string]>,
    pickedUp: (term: string) =>
      `Picked up ${term}. Left and right arrows choose a side, Enter drops it, Escape cancels.`,
    dropped: (term: string, side: 'L' | 'R') =>
      `${term} moved to the ${side === 'L' ? 'left' : 'right'}. Which sign?`,
    returned: (term: string) => `${term} is back where it was.`,
  },
  walk: {
    title: "Let's do it together",
    step: (k: number, n: number) => `Walkthrough · step ${k} of ${n}`,
    next: 'Next ›',
    back: '‹ Back',
    finish: 'Done',
    progress: 'Walkthrough progress',
    answerFirst: 'Answer the mini question to continue',
  },
  errorFallback: "Oops, let's try another one.",
};

const side = (s: string) => (s === 'left' ? 'left' : 'right');

/** Step feedback for a rejected line: a title and an optional detail line. */
export function feedbackText(r: Extract<StepResult, { accepted: false }>): {
  title: string;
  detail?: string;
} {
  const p = r.params;
  switch (r.code) {
    case 'EQ-D1':
      return { title: "I can't read that line.", detail: 'Check for a missing number or sign.' };
    case 'EQ-D2':
      return { title: 'An equation needs exactly one = sign.' };
    case 'EQ-D3':
      return { title: `This problem uses $${p.variable}$.` };
    case 'EQ-D4':
      return {
        title: p.from ? `Look at the $${p.term}$ from the ${side(p.from)} side.` : `Look at the $${p.term}$.`,
        detail:
          'When it moved across the =, did its sign change?' +
          (p.op === 'subtract'
            ? ` (Balance: take $${p.amount}$ away from both sides.)`
            : p.op === 'add'
              ? ` (Balance: add $${p.amount}$ to both sides.)`
              : ''),
      };
    case 'EQ-D5':
      return {
        title: 'One of the terms went missing.',
        detail: 'Check that every term from the last line is here.',
      };
    case 'EQ-D6':
      return {
        title: 'You divided (or multiplied) already.',
        detail: 'First get the unknowns on one side and numbers on the other.',
      };
    case 'EQ-D7':
      return { title: 'Check your adding:', detail: `$${p.expression} = {?}$` };
    case 'EQ-D8':
      return {
        title: `Check: $${p.c}${p.variable} = ${p.d}$.`,
        detail: `What number times $${p.c}$ is $${p.d}$?`,
      };
    case 'EQ-D9':
      return p.k === '−'
        ? { title: `Check the expansion: $−(${p.inner})$ means $−1$ times each term inside.` }
        : { title: `Check the expansion: $${p.k}(${p.inner})$ means $${p.k}$ times each term inside.` };
    case 'EQ-D10':
      return {
        title: "This line isn't balanced with the one above.",
        detail: 'What did you do to each side?',
      };
    case 'EQ-D11':
      return p.which === 'variable'
        ? {
            title: `Balanced ✓, but there are still $${p.variable}$ terms on both sides.`,
            detail: `Get all the $${p.variable}$ terms on one side.`,
          }
        : {
            title: 'Balanced ✓, but there are still numbers on both sides.',
            detail: 'Get all the numbers on one side.',
          };
    case 'R-EQ-CHK-3':
      return {
        title: "That's right, but show the moving step first.",
        detail: `Write the equation with the $${p.variable}$ terms on one side and numbers on the other.`,
      };
    case 'R-EQ-CHK-3-SIMPLIFY':
      return {
        title: "That's right! Show the simplifying step first.",
        detail: `Combine the $${p.variable}$ terms and the numbers.`,
      };
    case 'R-EQ-CHK-5':
      return { title: `Right value! Can you simplify $${p.written}$?` };
    case 'R-EQ-CHK-6':
      return { title: 'Keep it exact, use a fraction.' };
    case 'EQ-KEEP-GOING':
      return p.stage === 'SOLVE'
        ? { title: 'Balanced ✓.', detail: `Now finish with $${p.variable} =$ a number.` }
        : { title: 'Balanced ✓.', detail: `Now combine the $${p.variable}$ terms and the numbers.` };
  }
}

/** Hint text (§7.6). Separate hints refer to both the balance and the shortcut (R-EQ-PED-3). */
export function hintText(h: HintContent): string {
  const p = h.params;
  switch (h.id) {
    case 'eq.expand.h1':
      return p.k === '−'
        ? `$−(${p.inner})$ means $−1$ times each term inside the brackets.`
        : `$${p.k}(${p.inner})$ means $${p.k}$ times each term inside the brackets.`;
    case 'eq.expand.h2':
      return p.k === '−'
        ? `Change the sign of $${p.first}$ and of $${p.second}$, then drop the brackets.`
        : `Multiply $${p.k}$ by $${p.first}$, then $${p.k}$ by $${p.second}$. Write both results.`;
    case 'eq.clear.h1':
      return 'Fractions are easier to get rid of first. What number could you multiply every term by so there are no fractions left?';
    case 'eq.clear.h2':
      return `Multiply every term on both sides by $${p.m}$.`;
    case 'eq.separate.h1':
      return `Which terms have the letter $${p.variable}$? Which are just numbers? We want all the $${p.variable}$ terms on one side. (Subtracting a term from both sides is the same as moving it across and flipping its sign.)`;
    case 'eq.separate.h2':
    case 'eq.separate.h2.two': {
      const verb = p.op === 'subtract' ? 'Subtracting' : 'Adding';
      const prep = p.op === 'subtract' ? 'from' : 'to';
      const first = `Move the $${p.term}$ on the ${side(p.from ?? '')} over to the ${side(p.to ?? '')}. ${verb} $${p.amount}$ ${prep} both sides flips it to $${p.flipped}$.`;
      return h.id === 'eq.separate.h2.two'
        ? `${first} Then move the $${p.term2}$ to the ${side(p.to2 ?? '')}.`
        : first;
    }
    case 'eq.simplify.h1':
      return `Combine the $${p.variable}$ terms, then combine the numbers.`;
    case 'eq.simplify.h2.both':
      return `$${p.varSide} = {?}\\,${p.variable}$. And $${p.constSide} = {?}$`;
    case 'eq.simplify.h2.var':
      return `$${p.varSide} = {?}\\,${p.variable}$`;
    case 'eq.simplify.h2.const':
      return `$${p.constSide} = {?}$`;
    case 'eq.solve.h1':
      return `$${p.variable}$ is being multiplied by $${p.c}$. How do you undo multiplying?`;
    case 'eq.solve.h2.divide':
      return `Divide both sides by $${p.c}$.`;
    case 'eq.solve.h1.fraction':
      return `$${p.variable}$ is being multiplied by $${p.c}$. What could you multiply both sides by to leave just $${p.variable}$?`;
    case 'eq.solve.h2.multiply':
      return `Multiply both sides by $${p.m}$.`;
    // H3 walkthrough steps (§7.6)
    case 'eq.walk.expand':
      return 'Multiply out the brackets: every term inside gets multiplied.';
    case 'eq.walk.clear':
      return `Multiply every term on both sides by $${p.m}$, so there are no fractions left.`;
    case 'eq.walk.separate':
      return `Move $${p.moved}$ across the =, so the $${p.variable}$ terms are on one side and the numbers on the other. Each one flips its sign: that's doing the same thing to both sides.`;
    case 'eq.walk.simplify':
      return `Combine the $${p.variable}$ terms, and combine the numbers.`;
    case 'eq.walk.solve.divide':
      return `Divide both sides by $${p.c}$.`;
    case 'eq.walk.solve.multiply':
      return `Multiply both sides by $${p.m}$.`;
    case 'eq.walk.check':
      return `Check: put $${p.variable} = ${p.value}$ back into the first equation. $${p.left} = ${p.leftValue}$ and $${p.right} = ${p.rightValue}$. Both sides match ✓`;
    default:
      return '';
  }
}
