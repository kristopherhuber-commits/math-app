// All learner-facing copy (R-NF-4). Tone rules: design.md §9 — no "wrong", no red, no timers.
// Text between $…$ is math and is rendered with KaTeX by <Rich>.
import type { StepLabel, StepResult } from '../engine/eq/stepChecker';
import type { HintContent } from '../engine/topics/eq/hints';

type P = Record<string, string>;

export const strings = {
  appName: 'Turtle & Penguin Math',
  home: {
    greeting: 'Hi there!',
    intro: "Ready for today's practice?",
    /** An example per EQ level (for the parent's level lock in M5). */
    levelExamples: {
      1: '$3x + 4 = 19$',
      2: '$7 − 3z = 13$',
      3: '$5n − 7 = 2n + 8$',
      4: '$3(y − 2) = y + 8$',
      5: '$x/4 + 1 = 3$',
      6: 'Mixed review',
    } as Record<number, string>,
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

// ---------------------------------------------------------------------------------------------
// Number topics (M3: NC, RD, FDP, PC). Text between §…§ is LaTeX and is rendered by <Tex>
// ($ is left alone here because prices use it).

export type TopicKey = 'NC' | 'RD' | 'FDP' | 'PC' | 'EQ';

export const topicStrings = {
  name: {
    NC: 'Number sets',
    RD: 'Repeating decimals',
    FDP: 'Fractions, decimals, percents',
    PC: 'Price changes',
    EQ: 'Equations',
  } satisfies Record<TopicKey, string>,
  /** The glyph on each Home topic tile (design.md §5 TopicTile), as LaTeX. */
  glyph: {
    NC: '\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q}',
    RD: '0.\\overline{3} = \\tfrac{1}{3}',
    FDP: '\\tfrac{3}{8} = 37.5\\%',
    PC: '\\text{\\$40} \\to \\text{\\$44}',
    EQ: '3x + 4 = 19',
  } satisfies Record<TopicKey, string>,
  chip: (topic: TopicKey, level: number) => `${topicStrings.name[topic]} · Level ${level}`,
  /** Home level cards: an example per level (§6 tables); §…§ is LaTeX. */
  levelExamples: {
    NC: [
      '§7,\\ 0,\\ \\tfrac{3}{4},\\ 0.25§',
      '§-12,\\ -\\tfrac{5}{8},\\ 0.333\\text{…}§',
      '§\\tfrac{12}{4},\\ 3.0§',
      '§0.1010010001\\text{…}§',
      'Challenge mix',
    ],
    RD: [
      '§0.333\\text{…}§',
      '§0.454545\\text{…}§',
      '§4.242424\\text{…}§',
      '§0.41666\\text{…}§',
      'Mixed review',
    ],
    FDP: [
      '§\\tfrac{1}{2} = 0.5 = 50\\%§',
      '§\\tfrac{3}{8} = 0.375§',
      '§2\\tfrac{1}{4} = 225\\%§',
      '§\\tfrac{1}{3} = 33.\\overline{3}\\%§',
      'Mixed review',
    ],
    PC: ['$40 up 10%', '$36.50 up 12%', 'Up 20%, then down 20%', 'Find the original price', 'Mixed review'],
  } as Record<string, string[]>,
};

export const numStrings = {
  check: 'Check',
  notQuite: 'Not quite.',
  mcKeyboard: 'Tap an answer, then Check. Keyboard: 1–5 to choose, Enter to check.',
  options: 'Answer options',
  option: (n: number, speech: string) => `Option ${n}: ${speech}`,
  nc: {
    prompt: 'Which sets does this number belong to? Tick all that apply.',
    keyboard: 'Tap the sets, then Check. Keyboard: Tab to a set, Space to tick, Enter to check.',
    sets: 'Number sets',
    setsMap: 'Sets map',
    setsMapTitle: 'The sets map',
    close: 'Close',
    flagged: 'Have another look at the outlined boxes.',
    name: {
      natural: 'Natural',
      whole: 'Whole',
      integer: 'Integer',
      rational: 'Rational',
      irrational: 'Irrational',
    } as Record<string, string>,
    /** The sets map's outer frame (not a checkbox). */
    realFrame: 'Real numbers',
    example: (set: string, naturalIncludesZero: boolean): string =>
      ({
        natural: naturalIncludesZero ? '0, 1, 2, …' : '1, 2, 3, …',
        whole: '0, 1, 2, …',
        integer: '…, −1, 0, 1, …',
        rational: 'fractions p/q',
        irrational: 'never repeats',
      })[set] ?? '',
  },
  walk: {
    division: 'Long division',
    subtraction: 'Subtraction, lined up',
    remainder: 'remainder',
    comesBack: 'comes back!',
    tailsCancel: 'the tails line up and cancel!',
  },
};

const digitWord = (k: string) => (k === '1' ? '1 digit' : `${k} digits`);
const placeWord = (k: string) => (k === '1' ? '1 place' : `${k} places`);
const setList = (ids: string): string => {
  const names = ids.split(',').map((s) => numStrings.nc.name[s] ?? s);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');
};

/** "Not quite." plus one misconception line (R-HELP-1a, design.md §9). Never reveals the answer. */
export function misconceptionLine(code: string, kind = ''): string | null {
  switch (code) {
    case 'RD-M1':
      return 'That uses only the repeating block. What about the digits in front of it?';
    case 'RD-M2':
      return 'Close! Remember to take away the part that doesn’t repeat.';
    case 'RD-M3':
      return 'Count the digits in the repeating block. How many 9s does that make?';
    case 'RD-M4':
    case 'RD-F1':
      return 'That decimal stops. This one goes on forever.';
    case 'RD-M5':
      return 'Only part of it repeats. Shift the part that doesn’t repeat first.';
    case 'RD-M6':
      return 'Over 10s gives a decimal that stops. This one goes on forever.';
    case 'RD-F2':
      return 'Check which digits repeat: watch for the remainder that comes back.';
    case 'RD-F3':
      return 'Check where the repeating starts. Not every digit repeats.';
    case 'RD-F4':
    case 'FDP-M2':
      return 'The digits of a fraction aren’t its decimal. Try dividing.';
    case 'RD-F5':
    case 'FDP-M3':
      return 'That’s the fraction flipped over. Divide the top by the bottom.';
    case 'FDP-M1':
      return 'Check which way the decimal point moves.';
    case 'FDP-M4':
      return 'Percent means out of 100, not out of 10.';
    case 'FDP-M5':
      return 'Divide the top and the bottom by the same number.';
    case 'FDP-M6':
      return 'That stops too soon. This one goes on forever.';
    case 'FDP-M7':
      return 'Don’t forget the whole-number part.';
    case 'PC-M1':
      return 'A percent isn’t a number of dollars. Find the percent of the price.';
    case 'PC-M2':
      return kind === 'reverse'
        ? 'That’s how much it changed. What was the price before?'
        : 'That’s how much it changed. What’s the new price?';
    case 'PC-M3':
      return 'Check the direction: is the price going up or down?';
    case 'PC-M4':
      return 'That’s the same as the start price.';
    case 'PC-M5':
      return 'The second percent is taken of the new price, so the percents don’t just add.';
    case 'PC-M6':
    case 'PC-M7':
      return 'The percent was taken of the original price, not of the price after.';
    default:
      return null;
  }
}

const upDown = (dir?: string) => (dir === 'up' ? 'up' : 'down');

/** Number-topic prompts, captions, hints and walkthrough text (R-HELP-4/5). §…§ is LaTeX. */
export function numText(h: HintContent): string {
  const p: P = h.params;
  switch (h.id) {
    // captions (R-DISP-3/4)
    case 'num.caption.block':
      return `the block ${p.block} repeats forever`;
    case 'nc.caption.growingZeros':
      return 'one more 0 each time, forever';
    case 'nc.caption.counting':
      return 'the counting numbers 1, 2, 3, … written in a row, forever';

    // prompts
    case 'rd.prompt.d2f':
      return 'Write this as a fraction in lowest terms:';
    case 'rd.prompt.f2d':
      return 'Write this fraction as a decimal:';
    case 'fdp.prompt':
      return (
        {
          decimal: 'Write this as a decimal:',
          percent: 'Write this as a percent:',
          fraction: 'Write this as a fraction in lowest terms:',
          mixed: 'Write this as a mixed number in lowest terms:',
          improper: 'Write this as an improper fraction in lowest terms:',
        }[p.target ?? ''] ?? ''
      );
    case 'pc.prompt.single':
      return `A price of ${p.price} goes ${upDown(p.dir)} ${p.pct}%. What is the new price?`;
    case 'pc.prompt.successive':
      return `A price of ${p.price} goes ${upDown(p.dir)} ${p.pct}%, then ${upDown(p.dir2)} ${p.pct2}%. What is the price now?`;
    case 'pc.prompt.reverse':
      return p.dir === 'up'
        ? `After a ${p.pct}% increase, it costs ${p.price}. What was the original price?`
        : `After a ${p.pct}% discount, it costs ${p.price}. What was the original price?`;
    case 'pc.hero.single':
      return `${p.price} → ${upDown(p.dir)} ${p.pct}% → ?`;
    case 'pc.hero.successive':
      return `${p.price} → ${upDown(p.dir)} ${p.pct}% → ${upDown(p.dir2)} ${p.pct2}% → ?`;
    case 'pc.hero.reverse':
      return p.dir === 'up' ? `? → up ${p.pct}% → ${p.price}` : `? → ${p.pct}% off → ${p.price}`;

    // RD hints
    case 'rd.d2f.h1':
      return `Call the number §x§, so §x = ${p.x}§. Which digits repeat, and how many of them are there?`;
    case 'rd.d2f.h2':
      return `The block ${p.block} repeats. Multiply §x§ by §${p.pow}§, line the two numbers up and subtract §x§: the repeating tails cancel.`;
    case 'rd.d2f.h2.delayed':
      return `Only part of it repeats. Multiply §x§ by §${p.p1}§ so only the repeating part is after the point, and by §${p.p2}§ to shift one more block. Subtract the two: the tails cancel.`;
    case 'rd.f2d.h1':
      return `A fraction is a division: §\\frac{${p.n}}{${p.d}}§ means §${p.n} \\div ${p.d}§.`;
    case 'rd.f2d.h2':
      return `Divide §${p.n}§ by §${p.d}§ with long division and write down each remainder. When a remainder comes back, the digits repeat from there.`;

    // RD walkthrough (x-method, long division)
    case 'rd.walk.let':
      return 'Call the number §x§.';
    case 'rd.walk.block':
      return `Look at the block that repeats: ${p.block}.`;
    case 'rd.walk.mini.blockLength':
      return 'How many digits are in the repeating block?';
    case 'rd.walk.block.reveal':
      return `${digitWord(p.k ?? '')}, so we multiply by §${p.pow}§.`;
    case 'rd.walk.prefix':
      return `Before the repeating starts, there is ${p.nonRep}.`;
    case 'rd.walk.mini.prefixLength':
      return 'How many digits come before the repeating block?';
    case 'rd.walk.prefix.reveal':
      return `${digitWord(p.m ?? '')}, so multiply by §${p.pow}§ to move them in front of the point:`;
    case 'rd.walk.shift':
      return `Multiply §x§ by §${p.pow}§: the point moves ${placeWord(p.k ?? '')} to the right.`;
    case 'rd.walk.shift.more':
      return `Now shift one more block: multiply §x§ by §${p.pow}§.`;
    case 'rd.walk.mini.times':
      return `What is §${p.pow} \\times ${p.x}§?`;
    case 'rd.walk.subtract':
      return `Line them up and subtract: §${p.left} = ${p.right}§`;
    case 'rd.walk.mini.difference':
      return `So §${p.coef}x§ = ?`;
    case 'rd.walk.cancel':
      return 'The repeating tails line up and cancel:';
    case 'rd.walk.divide':
      return `Divide both sides by §${p.coef}§:`;
    case 'rd.walk.simplify':
      return `Simplify: §\\gcd(${p.n}, ${p.d}) = ${p.g}§, so divide the top and the bottom by §${p.g}§:`;
    case 'rd.walk.lowest':
      return `§\\gcd(${p.n}, ${p.d}) = 1§, so it is already in lowest terms:`;
    case 'rd.walk.f2d.divide':
      return `§\\frac{${p.n}}{${p.d}}§ means §${p.n} \\div ${p.d}§. Let’s do it by long division.`;
    case 'rd.walk.f2d.rows':
      return `Each time: bring down a 0, divide by §${p.d}§, write the digit and keep the remainder.`;
    case 'rd.walk.mini.remainder':
      return 'Which remainder comes back?';
    case 'rd.walk.f2d.again':
      return `The remainder §${p.r}§ has come back.`;
    case 'rd.walk.f2d.repeat':
      return `Remainder §${p.r}§ came back, so from here the same digits come again, forever. The repeating block is ${p.block}.`;
    case 'rd.walk.f2d.stops':
      return 'The remainder is 0, so the decimal stops:';

    // FDP hints (R-FDP-4)
    case 'fdp.f2d.h1':
      return `A fraction is a division. What division is §${p.f}§?`;
    case 'fdp.f2d.h2':
      return `Work out §${p.n} \\div ${p.d}§: by long division, or make the bottom 10, 100 or 1000 first.`;
    case 'fdp.f2p.h1':
      return `First turn §${p.f}§ into a decimal. Then remember: percent means out of 100.`;
    case 'fdp.f2p.h2':
      return `Work out §${p.n} \\div ${p.d}§, then multiply by 100.`;
    case 'fdp.d2p.h1':
      return `Percent means out of 100. What do you multiply §${p.dec}§ by to get a percent?`;
    case 'fdp.d2p.h2':
      return `Multiply §${p.dec}§ by 100: the decimal point moves 2 places to the right.`;
    case 'fdp.p2d.h1':
      return `Percent means out of 100. What do you do to §${p.pct}§ to get a decimal?`;
    case 'fdp.p2d.h2':
      return 'Divide by 100: the decimal point moves 2 places to the left.';
    case 'fdp.d2f.h1':
      return `Read §${p.dec}§ with place value. What place is its last digit in?`;
    case 'fdp.d2f.h2':
      return `Write §${p.dec}§ without the point, over §${p.d}§. Then divide the top and the bottom by their gcd.`;
    case 'fdp.d2f.h2.repeat':
      return 'This decimal repeats. Call it §x§, multiply by 10, 100 or 1000 to shift one block, and subtract §x§.';
    case 'fdp.p2f.h1':
      return `Percent means out of 100. How would you write §${p.pct}§ as a fraction?`;
    case 'fdp.p2f.h2':
      return `Write §${p.pct}§ over 100 (make the top a whole number if it has a point), then divide the top and the bottom by their gcd.`;
    case 'fdp.p2f.h2.repeat':
      return `First divide by 100: §${p.pct} = ${p.dec}§. Then call it §x§ and use the repeating-decimal method.`;

    // FDP walkthrough
    case 'fdp.walk.toImproper':
      return 'First write the mixed number as an improper fraction:';
    case 'fdp.walk.toMixed':
      return `It is more than 1, so write it as a mixed number: §${p.whole}§ wholes and what is left over.`;
    case 'fdp.walk.times100':
      return 'Now multiply by 100 to make a percent: the point moves 2 places to the right.';
    case 'fdp.walk.d2p':
      return `Percent means out of 100, so multiply §${p.dec}§ by 100.`;
    case 'fdp.walk.mini.times100':
      return `What is §${p.v} \\times 100§?`;
    case 'fdp.walk.percent':
      return 'Add the percent sign:';
    case 'fdp.walk.p2d':
      return `Percent means out of 100, so divide §${p.pct}§ by 100.`;
    case 'fdp.walk.mini.over100':
      return `What is §${p.v} \\div 100§?`;
    case 'fdp.walk.decimal':
      return 'So as a decimal:';
    case 'fdp.walk.d2f.over':
      return `Write §${p.dec}§ over §${p.d}§:`;
    case 'fdp.walk.p2f.first':
      return 'First divide by 100 to make a decimal:';
    case 'fdp.walk.p2f.over100':
      return 'Percent means out of 100:';
    case 'fdp.walk.p2f.whole':
      return `Multiply the top and the bottom by §${p.k}§ so the top is a whole number:`;

    // PC hints (R-PC-2)
    case 'pc.single.h1':
      return `First find ${p.pct}% of ${p.price}. Then: is the price going up or down?`;
    case 'pc.single.h2':
      return p.dir === 'up'
        ? `Find ${p.pct}% of ${p.price} and add it on. Or use the multiplier: up ${p.pct}% means × ${p.mult}.`
        : `Find ${p.pct}% of ${p.price} and take it away. Or use the multiplier: down ${p.pct}% means × ${p.mult}.`;
    case 'pc.successive.h1':
      return `Do one change at a time. The second ${p.pct2}% is taken of the new price, not the first one.`;
    case 'pc.successive.h2':
      return `Multiply the price by ${p.m1}, then by ${p.m2}. (Or multiply ${p.m1} × ${p.m2} first.)`;
    case 'pc.reverse.h1':
      return `The ${p.pct}% was taken of the original price, not of ${p.price}. What was the original multiplied by?`;
    case 'pc.reverse.h2':
      return `original × ${p.mult} = ${p.price}. So divide ${p.price} by ${p.mult}.`;

    // PC walkthrough (R-PC-2/3)
    case 'pc.walk.part':
      return `Find the part: ${p.pct}% of ${p.price}. Then ${p.dir === 'up' ? 'add it on' : 'take it away'}.`;
    case 'pc.walk.second':
      return `Now the second change. This ${p.pct}% is of ${p.price}, the new price.`;
    case 'pc.walk.mini.part':
      return `What is ${p.pct}% of ${p.price}?`;
    case 'pc.walk.multiplier':
      return `Or use the multiplier: ${upDown(p.dir)} ${p.pct}% means × ${p.mult}.`;
    case 'pc.walk.notBack':
      return `${p.dir === 'up' ? 'Up' : 'Down'} ${p.pct}% then ${upDown(p.dir2)} ${p.pct2}% does not get back to ${p.start}. The second ${p.pct2}% is taken of ${p.mid}, a ${p.bigger} number than ${p.start}.`;
    case 'pc.walk.notAdd':
      return `The two percents don’t just add up: the second ${p.pct2}% is taken of ${p.mid}, not of ${p.start}.`;
    case 'pc.walk.backExactly':
      return `This time the two changes do get back to ${p.start}: the multipliers multiply to exactly 1.`;
    case 'pc.walk.multipliers':
      return 'With multipliers: multiply them together, then multiply the price.';
    case 'pc.walk.reverse.setup':
      return p.dir === 'up'
        ? `A ${p.pct}% increase means the original price was multiplied by ${p.mult}.`
        : `${p.pct}% off means the original price was multiplied by ${p.mult}.`;
    case 'pc.walk.reverse.divide':
      return `To undo multiplying by ${p.mult}, divide by ${p.mult}.`;
    case 'pc.walk.mini.divide':
      return `What is ${p.price} ÷ ${p.mult}?`;
    case 'pc.walk.reverse.check':
      return `Check with the part method: ${p.pct}% of ${p.price}.`;

    // NC hints
    case 'nc.h1':
      return `Start at the smallest set. Is §${p.x}§ a counting number (1, 2, 3, …)?`;
    case 'nc.h2.intFraction':
      return `§${p.x}§ simplifies. What is §${p.a} \\div ${p.b}§?`;
    case 'nc.h2.zeroFraction':
      return `What is §0 \\div ${p.b}§? Zero divided by any number is…?`;
    case 'nc.h2.pointZero':
      return `§${p.x}§ has only zeros after the point. Which integer is it?`;
    case 'nc.h2.nines':
      return `What is §3 \\times 0.333\\text{…}§? And what is §3 \\times \\frac{1}{3}§? What does that tell you about §${p.x}§?`;
    case 'nc.h2.decimal':
      return `§${p.x}§ stops. Can you write it as a fraction over §${p.over}§?`;
    case 'nc.h2.repeating':
      return `The block ${p.block} repeats forever. Every repeating decimal can be written as a fraction p/q. Is it an integer?`;
    case 'nc.h2.fraction':
      return `§${p.x}§ is written as one integer over another. Is it a whole number of ones, or in between?`;
    case 'nc.h2.zero':
      return '0 isn’t a counting number here, but it is a whole number. Which bigger sets contain the whole numbers?';
    case 'nc.h2.zero.natural':
      return 'Here 0 counts as a natural number. Which bigger sets contain the natural numbers?';
    case 'nc.h2.negInt':
      return `§${p.x}§ is negative, so it isn’t a whole number. Is it an integer?`;
    case 'nc.h2.posInt':
      return `§${p.x}§ is a counting number. Which bigger sets contain every counting number?`;
    case 'nc.h2.irrational':
      return 'Read the rule under the number. Does a block of digits ever repeat? Does it ever stop?';

    // NC walkthrough on the sets map
    case 'nc.walk.value.irrational.growingZeros':
      return `§${p.x}§ never stops and never repeats: there is one more 0 each time. So it can’t be written as p/q.`;
    case 'nc.walk.value.irrational.counting':
      return `§${p.x}§ never stops and never repeats: the numbers keep getting longer. So it can’t be written as p/q.`;
    case 'nc.walk.value.divide':
      return 'First, what number is it? Divide:';
    case 'nc.walk.value.pointZero':
      return 'Zeros after the point don’t change the value:';
    case 'nc.walk.value.nines':
      return `§${p.x}§ is a number in disguise. Three thirds make one whole:`;
    case 'nc.walk.value.decimal':
      return `§${p.x}§ stops, so write it over §${p.over}§:`;
    case 'nc.walk.value.repeating':
      return `The block ${p.block} repeats forever, so it can be written as a fraction (the x-method):`;
    case 'nc.walk.value.fraction':
      return `§${p.x}§ is one integer over another, and it is between two integers.`;
    case 'nc.walk.value.integer':
      return `§${p.x}§ is an integer.`;
    case 'nc.walk.place':
      return 'Where does it go on the sets map?';
    case 'nc.walk.mini.smallest':
      return 'What is the smallest set it belongs to?';
    case 'nc.walk.place.natural':
      return 'It is a counting number, so it goes in Natural.';
    case 'nc.walk.place.whole':
      return 'It isn’t a counting number, but it is a whole number, so it goes in Whole.';
    case 'nc.walk.place.integer':
      return 'It is negative, but it is an integer, so it goes in Integer.';
    case 'nc.walk.place.rational':
      return 'It is p/q but not an integer, so it goes in Rational.';
    case 'nc.walk.place.irrational':
      return 'It can’t be written as p/q, so it goes in Irrational.';
    case 'nc.walk.contains.natural':
      return 'Every natural number is also whole, an integer and rational.';
    case 'nc.walk.contains.whole':
      return 'Every whole number is also an integer and rational.';
    case 'nc.walk.contains.integer':
      return 'Every integer is also rational.';
    case 'nc.walk.contains.rational':
      return 'A rational number that is not an integer is only rational.';
    case 'nc.walk.contains.irrational':
      return 'An irrational number is never rational, so Irrational is its only box.';
    case 'nc.walk.tick':
      return `So tick: ${setList(p.sets ?? '')}.`;
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------------------------
// Sessions and rewards (M4: R-SES, R-ADP-6, R-RWD). Pip speaks here, never in help (R-HELP-7).

export const rewardStrings = {
  topBar: {
    question: (n: number, total?: number) => (total ? `Question ${n} of ${total}` : `Question ${n}`),
    progress: 'Progress',
    stars: (n: number) => `${n} ${n === 1 ? 'star' : 'stars'}`,
    shells: (n: number) => `${n} ${n === 1 ? 'shell' : 'shells'}`,
  },
  celebrate: {
    headline: { 3: '3 stars! Brilliant!', 2: '2 stars! Nice work!', 1: '1 star. You did it!' } as Record<
      1 | 2 | 3,
      string
    >,
    shells: (n: number) => `+${n} ${n === 1 ? 'shell' : 'shells'}`,
    levelUp: 'Level up!',
    badge: (name: string) => `New badge: ${name}`,
    newAccessory: (who: string, what: string) => `New for ${who}: ${what}!`,
    streak: (n: number) => `${n}-day streak!`,
    streakSub: 'You practised every assignment day.',
    streakClose: 'Yay!',
  },
  /** Cosmetics (R-RWD-4, M6). */
  accessory: {
    hat: 'a hat',
    scarf: 'a scarf',
    sunglasses: 'sunglasses',
    bowtie: 'a bow tie',
  } as Record<string, string>,
  badges: {
    'first-solve': 'First question solved',
    'perfect-assignment': 'A perfect assignment',
    'eq-no-walkthrough': '10 equations without a walkthrough',
    'first-delayed-rd': 'First delayed repeating decimal',
    'first-successive-pc': 'First two-step price change',
    'streak-7': '7-day streak',
    'streak-30': '30-day streak',
    'max-level-NC': 'Top level in number sets',
    'max-level-RD': 'Top level in repeating decimals',
    'max-level-FDP': 'Top level in fractions, decimals, percents',
    'max-level-PC': 'Top level in price changes',
    'max-level-EQ': 'Top level in equations',
  } as Record<string, string>,
  home: {
    assignment: "Today's assignment",
    defaultTitle: 'Your assignment',
    none: 'No assignment right now.',
    noneSub: 'Pick any topic below and practise.',
    start: 'Start ›',
    keepGoing: 'Keep going ›',
    done: (n: number, total: number) => `${n} of ${total} done`,
    item: (n: number, total: number) => `${n} / ${total}`,
    itemDone: 'done',
    streak: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
    streakLabel: 'streak',
    shellsLabel: 'shells',
    pipToday: (pip: string, topic: string) => `${pip}: ${topic} today? Let's go!`,
    pipStreak: (pip: string, n: number) => `${pip}: ${n}-day streak! Keep it up!`,
    pipFree: (pip: string) => `${pip}: Pick a topic. Let's play!`,
    shelly: (shelly: string) => `${shelly}'s here if you get stuck.`,
    parent: 'Parent',
    freePractice: 'Free practice',
    freeLocked: "unlocks when today's assignment is done",
    freeNever: 'not open right now',
    locked: (topic: string) => `${topic}, locked`,
    pickLevel: (topic: string) => `${topic}: how hard?`,
    adaptive: 'Adaptive',
    adaptiveSub: 'Starts at level 3 and changes as you go',
    level: (n: number) => `Level ${n}`,
    pickClose: 'Close',
    shop: 'Shop',
    waiting: (n: number) =>
      n === 1 ? '1 reward waiting for a grown-up' : `${n} rewards waiting for a grown-up`,
    dressUp: 'Dress up',
    dressUpNone: 'Keep earning shells: something fun unlocks soon!',
    accessoryFor: (who: string, what: string) => `${what} for ${who}`,
    nextAccessory: (what: string) => `Next to unlock: ${what}`,
    badges: (n: number, of: number) => `Badges: ${n} of ${of}`,
    badgeEarned: 'earned',
    badgeToGet: 'still to get',
  },
  summary: {
    title: 'Assignment done!',
    sub: (title: string | undefined, n: number) => `${title ? `${title} · ` : ''}${n} questions`,
    totals: (stars: number) => `${stars} stars · +${stars} shells`,
    byTopic: 'Stars by topic',
    row: (stars: 1 | 2 | 3, n: number) => `${'★'.repeat(stars)} ×${n}`,
    rowSpeech: (stars: 1 | 2 | 3, n: number) => `${n} with ${stars} ${stars === 1 ? 'star' : 'stars'}`,
    freePractice: 'Free practice ›',
    home: 'Home',
  },
};

// ---------------------------------------------------------------------------------------------
// First run (M5: R-PAR-1, R-RWD-7). The PIN steps speak to the parent; naming speaks to the learner.

export const setupStrings = {
  pinTitle: 'Hello, grown-up!',
  pinSub: 'Choose a 4-digit PIN for the parent area. It keeps little fingers out; it is not a lock.',
  confirmTitle: 'Type the PIN again',
  confirmSub: 'Just to be sure.',
  mismatch: "Those didn't match. Choose a PIN again.",
  namesTitle: 'Meet your math friends!',
  namesSub: 'You can give them new names, or keep these.',
  turtleLabel: "The turtle's name",
  turtleRole: 'helps when you get stuck',
  penguinLabel: "The penguin's name",
  penguinRole: 'cheers when you get it',
  done: "Let's go ›",
};

// ---------------------------------------------------------------------------------------------
// Parent area (M5: R-PAR-1…6, R-NF-5, mockups 10 and 11). Parent-facing; percentages are fine here.

export const parentStrings = {
  pin: {
    title: 'Parent area',
    sub: 'Enter your PIN',
    notIt: "That's not the PIN. Try again.",
    pad: 'PIN pad',
    dots: (n: number, of: number) => `${n} of ${of} digits entered`,
    delete: 'Delete',
    forgot: 'Forgot PIN?',
    cancel: '‹ Back',
  },
  reset: {
    title: 'Reset the PIN',
    question: (a: number, b: number) => `What is ${a} × ${b}?`,
    answer: 'Answer',
    check: 'Check',
    notIt: "That's not it. Here's another one.",
    newPin: 'Choose a new PIN',
    confirm: 'Type the new PIN again',
    mismatch: "Those didn't match. Choose a new PIN again.",
  },
  nav: {
    area: 'Parent area',
    unlocked: (min: number) => `PIN unlocked · auto-locks in ${min} min`,
    assignments: 'Assignments',
    progress: 'Progress',
    missed: 'Missed questions',
    rewards: 'Rewards',
    settings: 'Settings',
    data: 'Data',
    back: '‹ Back to learner',
  },
  assign: {
    newTitle: 'New assignment',
    editTitle: 'Edit assignment',
    title: 'Title (optional)',
    items: 'Items',
    addTopic: '+ Add topic',
    addWhich: 'Which topic?',
    adaptive: 'Adaptive',
    locked: (n: number) => `Level ${n} (locked)`,
    lockTitle: (topic: string) => `${topic}: level`,
    lockAdaptive: 'Adaptive: the app picks the level',
    lockLevel: (n: number) => `Level ${n}`,
    count: (topic: string) => `${topic}: number of questions`,
    fewer: (topic: string) => `Fewer ${topic} questions`,
    more: (topic: string) => `More ${topic} questions`,
    remove: (topic: string) => `Remove ${topic}`,
    handle: (name: string) => `Reorder ${name}. Up and down arrow keys move it.`,
    started: (done: number) => `${done} done already`,
    order: 'Question order',
    grouped: 'Grouped',
    mixed: 'Mixed',
    orderFixed: 'The order is fixed once the assignment has started.',
    due: 'Due (optional)',
    saveActive: 'Save & make active',
    addQueue: 'Add to queue',
    save: 'Save changes',
    cancel: 'Cancel',
    needItem: 'Add at least one topic.',
    queue: 'Queue',
    queueEmpty: 'No assignments yet.',
    active: (done: number, total: number) => `Active · ${done} / ${total}`,
    queued: 'Queued',
    dueOn: (d: string) => `due ${d}`,
    untitled: 'Untitled assignment',
    edit: (t: string) => `Edit ${t}`,
    editButton: 'Edit',
    makeActive: 'Make active',
    completeEarly: 'Mark complete',
    delete: 'Delete',
    confirmDelete: (t: string) => `Delete "${t}"? Its answers stay in the progress pages.`,
    confirmComplete: (t: string) => `Mark "${t}" complete now? The next queued assignment becomes active.`,
    confirmYes: 'Yes',
    confirmNo: 'No',
    lockNote: 'Level lock: tap an item to fix its level; otherwise the app adapts.',
    history: 'Recently done',
    doneOn: (d: string) => `done ${d}`,
  },
  progress: {
    title: 'Progress',
    sub: (days: number) => `Last ${days} days`,
    minutes: 'Minutes per day',
    minutesDay: (day: string, m: number) => `${day}: ${m} min`,
    level: (n: number, of: number) => `Level ${n} of ${of}`,
    clean: 'clean solves',
    noData: 'No answers yet',
    attempts: (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`,
    avgTries: (t: string) => `${t} tries on average`,
    time: (m: number) => `${m} min`,
    hints: 'Hints used',
    hintSplit: (h1: number, h2: number, h3: number) => `H1 ${h1} · H2 ${h2} · H3 ${h3}`,
    trend: (topic: string) => `${topic}: clean solves per day, last 30 days`,
    worth: 'Worth a look',
    worthNone: 'Nothing stands out right now.',
    worthH3: (topic: string, n: number, of: number) =>
      `${topic}: needed a walkthrough ${n} of the last ${of}.`,
    worthDiag: (what: string, code: string, n: number) => `Equations: ${what} (${code}) × ${n} this week.`,
    openMissed: 'Open missed questions ›',
  },
  diag: {
    'EQ-D1': "lines that couldn't be read",
    'EQ-D2': 'not exactly one = sign',
    'EQ-D3': 'the wrong letter',
    'EQ-D4': 'sign errors when moving a term',
    'EQ-D5': 'a term lost or duplicated',
    'EQ-D6': 'scaling too early',
    'EQ-D7': 'adding errors when simplifying',
    'EQ-D8': 'division errors when solving',
    'EQ-D9': 'expansion errors',
    'EQ-D10': 'unbalanced lines',
    'EQ-D11': 'terms still on both sides',
  } as Record<string, string>,
  missed: {
    title: 'Missed questions',
    sub: 'Questions that needed H2 or a walkthrough, or two or more wrong tries.',
    topic: 'Topic',
    allTopics: 'All topics',
    from: 'From',
    to: 'To',
    code: 'Diagnostic',
    anyCode: 'Any',
    none: 'No missed questions for this filter.',
    count: (n: number) => `${n} ${n === 1 ? 'question' : 'questions'}`,
    row: (topic: string, level: number) => `${topic} · Level ${level}`,
    tries: (n: number) => `${n} wrong ${n === 1 ? 'try' : 'tries'}`,
    hint: (h: number) => (h === 3 ? 'walkthrough' : h === 0 ? 'no hints' : `up to H${h}`),
    filters: 'Filters',
    pick: 'Choose a question to replay it.',
    question: 'The question',
    answer: 'Answer',
    answers: 'What the learner did',
    seed: (id: string, level: number, seed: number) => `${id} · level ${level} · seed ${seed}`,
    notRegenerated: "This question can't be regenerated.",
    verdict: {
      correct: 'right',
      wrong: 'not right',
      stepAccepted: 'accepted',
      stepRejected: 'rejected',
    } as Record<string, string>,
    back: '‹ All missed questions',
  },
  rewards: {
    title: 'Rewards',
    counts: (balance: number, lifetime: number) =>
      `Shells to spend: ${balance} · earned in all: ${lifetime} (cosmetics unlock from this)`,
    requests: 'Waiting to be given',
    none: 'No requests right now.',
    requested: (price: number, when: string) => `${price} shells · asked ${when}`,
    given: 'Mark given',
    cancel: 'Cancel and refund',
    confirmCancel: (name: string, price: number) => `Cancel "${name}" and give back ${price} shells?`,
    yes: 'Yes',
    no: 'No',
    prices: 'Prices',
    pricesSub: 'In shells. New prices apply to new purchases.',
    priceOf: (name: string) => `Price of ${name}, in shells`,
    savePrice: 'Save',
    priceSaved: 'Saved.',
    priceInvalid: 'A whole number from 1 to 100,000.',
    history: 'Given and cancelled',
    noHistory: 'Nothing yet.',
    status: { given: 'given', cancelled: 'cancelled', requested: 'waiting' } as Record<string, string>,
  },
  settings: {
    title: 'Settings',
    learning: 'Learning',
    freePractice: 'Free practice',
    freeAlways: 'Always',
    freeAfter: 'After the assignment',
    freeNever: 'Never',
    order: 'Question order for new assignments',
    levels: 'Level range per topic',
    lowest: 'lowest',
    highest: 'highest',
    levelStepper: (topic: string, which: string) => `${topic}, ${which} level`,
    lower: (what: string) => `Lower ${what}`,
    higher: (what: string) => `Raise ${what}`,
    equations: 'Equations',
    allowSkipping: 'Allow skipping steps (typed equations)',
    allowSkippingSub: 'Off: the learner writes the moving step before simplifying.',
    fullBalance: 'Always play the full balance animation (tile builder)',
    fullBalanceSub: 'Off: it shortens after 10 correct sign choices.',
    numbers: 'Numbers',
    naturalZero: 'Natural numbers include 0',
    currency: 'Currency symbol',
    comfort: 'Sound and motion',
    sound: 'Sounds',
    soundSub: 'Sounds arrive in a later version.',
    reduceMotion: 'Reduce motion',
    reduceMotionSub: 'Also on when the device asks for reduced motion.',
    names: 'Character names',
    turtle: 'Turtle (help)',
    penguin: 'Penguin (celebrations)',
    pin: 'PIN',
    newPin: 'New PIN (4 digits)',
    changePin: 'Change PIN',
    pinChanged: 'PIN changed.',
    pinInvalid: 'A PIN is 4 digits.',
    saved: 'Saved.',
  },
  data: {
    title: 'Data',
    exportTitle: 'Export',
    exportSub: 'Download everything (answers, levels, rewards, assignments, settings) as a JSON file.',
    export: 'Export data',
    importTitle: 'Import',
    importSub: 'Replace everything on this device with an exported file.',
    import: 'Choose a file…',
    importConfirm: (attempts: number, assignments: number, version: number) =>
      `This file has ${attempts} ${attempts === 1 ? 'answer' : 'answers'} and ${assignments} ${assignments === 1 ? 'assignment' : 'assignments'} (format v${version}). Replace everything on this device with it?`,
    importYes: 'Replace my data',
    importDone: 'Imported.',
    importBad: "That file couldn't be read as an export from this app. Nothing was changed.",
    importNewer: (v: number) =>
      `That file comes from a newer version of the app (format v${v}). Nothing was changed.`,
    resetTitle: 'Reset progress',
    resetSub:
      'Clears answers, levels, shells, streak, badges and all assignments. Keeps the PIN, names and settings.',
    reset: 'Reset all progress',
    resetConfirm: 'Reset all progress? This cannot be undone. Export first if you might want it back.',
    resetYes: 'Yes, reset',
    resetDone: 'Progress reset.',
    cancel: 'Cancel',
    errorsTitle: 'Error list',
    errorsSub: "Unexpected errors. The learner only saw “Oops, let's try another one”.",
    errorsNone: 'No errors logged.',
    errorsClear: 'Clear the list',
    errorsStack: 'Details',
  },
};

// ---------------------------------------------------------------------------------------------
// The shop (M6, R-RWD-4 as the parent reshaped it): real rewards for shells to spend.

export const shopStrings = {
  title: 'Shop',
  home: '‹ Home',
  toSpend: 'shells to spend',
  price: (n: number) => `${n} shells`,
  buy: 'Buy',
  sure: (name: string, price: number) => `Buy ${name} for ${price} shells?`,
  yes: 'Yes, buy it',
  no: 'Not now',
  bought: (name: string) => `Done! A grown-up will get you ${name}.`,
  more: (n: number) => `${n} more ${n === 1 ? 'shell' : 'shells'} to go`,
  waitingTitle: 'Waiting for a grown-up',
  waiting: (name: string) => name,
};
