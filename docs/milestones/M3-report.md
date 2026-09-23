# M3 report: number topics (NC, RD, FDP, PC)

Status: **done** (2026-09-23). Deployed to https://kristopherhuber-commits.github.io/math-app/; the live check passed after the deploy (installable, and an equation and a repeating-decimal question both work offline).

## 1. What was built

| Area | Files | Requirements |
|---|---|---|
| Exact decimal expansions: long division with remainder tracking, canonical (shortest) prefix and block, the R-RD-2 value formula | `src/engine/numbers/decimal.ts` | R-ARCH-2, R-RD-2, R-RD-3 |
| Number display: true minus, stacked and mixed fractions, the block shown 3 times, ellipsis / bar / both, percents, money with 2 decimals; LaTeX, a plain text form and words for screen readers | `src/engine/numbers/display.ts` | R-DISP-1/2/3/5, R-PLAT-6 |
| Option builder: five options; drops candidates equal in value or text to the answer; fillers only when the models give fewer than 4; seeded order | `src/engine/topics/mc.ts` | R-ANS-1…4 |
| Walkthrough step model: mini-questions (3 choices), column subtraction, long division, sets map | `src/engine/topics/walk.ts` | R-HELP-4 |
| RD generators L1–5, distractors RD-M1…M6 (D→F) and RD-F1…F5 (F→D), hints, the x-method and long-division walkthroughs | `src/engine/topics/rd/*` | R-RD-1…3, R-HELP-4/5 |
| FDP generators L1–5 (all six directions), FDP-M1…M7, hints, walkthroughs | `src/engine/topics/fdp/*` | R-FDP-1…4 |
| PC generators L1–5 in integer cents, PC-M1…M7, hints, both-method walkthroughs | `src/engine/topics/pc/*` | R-PC-1…4 |
| NC generators L1–5, set checker, patterned irrationals, hints, sets-map walkthrough | `src/engine/topics/nc/*` | R-NC-1…5, R-DISP-4 |
| Shared help state: one wrong Check = one wrong try for MC and NC; walkthrough started with prebuilt steps (EQ unchanged) | `src/ui/practice/help.ts` | R-HELP-1…6 |
| MC screen for RD, FDP, PC: McOption states, shake, "Not quite." plus the misconception line, hint panel, keys 1–5 / Enter / H / Esc | `src/ui/screens/McPractice.tsx`, `practice/mcReducer.ts`, `components/Numbers.tsx` | R-ANS-1, R-HELP-1/1a/2/3, design.md §5/§6.1/§10 |
| NC screen: six set cards, outlines on the second wrong try, sets-map preview and full-size dialog | `src/ui/screens/NcPractice.tsx`, `practice/ncReducer.ts`, `components/SetsMap.tsx` | R-NC-2…4 |
| Number walkthrough: mini-questions gate Next, aligned subtraction with the tails highlighted, long division with the repeated remainder marked, sets map lighting up | `src/ui/components/NumberWalkthrough.tsx`, `Walkthrough.tsx` (shared `WalkShell`) | R-HELP-4/6, mockup 07 |
| Home: five topic tiles, then that topic's levels; routing `?topic=RD&level=3&seed=42` (`?level=N` still opens EQ) | `src/ui/screens/Home.tsx`, `App.tsx` | R-ARCH-3 |
| Copy for every prompt, caption, hint, walkthrough step and misconception line | `src/ui/strings.ts` | R-NF-4, design.md §9 |
| Styles (tokens only; tints mixed from tokens), two-column options on portrait with the 5th spanning, reduced motion | `src/ui/numbers.css` | design.md §3.1, R-NF-3 |

## 2. Tests

- Unit + property (Vitest, fast-check): **377 passed, 0 skipped** (M2: 242).
  - R-TEST-2, per topic and level, 1000 seeds each. Each answer is verified independently of the engine:
    - RD: shown digits read back and summed as a geometric series, and a test-local long division reproduces them.
    - FDP: the hero and every option re-parsed from their text.
    - PC: integer-cent arithmetic; applying the change(s) gives the stated price.
    - NC: a test-local membership oracle reads the shown number.
  - Level invariants, 5 distinct options with exactly one correct, **no distractor equal in value to the answer (R-ANS-3)**, fillers only when models < 4, determinism, display rules.
  - Hints never contain the answer; walkthroughs end at the answer; every mini-question has 3 distinct choices with exactly one correct.
  - Named worked examples: 4.2424… = 140/33 (with mockup 02's four distractors), 0.41666… = 5/12, 2.31818… = 51/22, 1/7 period 6, the §6.3 FDP-M examples and mockup 12, $50 +20% −20% = $48.00, $60 after 25% off = $80.00, $66 after +10% = $60.00 (PC-M7 $59.40).
  - Reducers: first wrong, second wrong opens H1, NC outlines, walkthrough to done, the natural-numbers setting.
- E2E (Playwright, desktop + tablet-touch): **50 passed** (M2: 30). New `e2e/topics.spec.ts` covers:
  - one RD, FDP and PC question by mouse (tap on the tablet project);
  - RD by keyboard only;
  - NC by mouse / touch and by keyboard;
  - the wrong-answer toast and the hint at the second wrong try;
  - the RD walkthrough with its mini-questions gating Next;
  - NC outlines;
  - Home topic and level picker.

  6 on-demand specs skipped by default, as before: `zz-live`, and `zz-screens` (now also shoots every number topic).
- `src/engine` coverage: **96.9 % lines**, 89.0 % branches (R-ARCH-4 target ≥ 90 %).
- Bundle: **216.7 KB gzipped JS** + 13.7 KB CSS (budget 1 MB, R-NF-2).

## 3. Assumptions (spec silent; small and reversible)

1. Home is free practice (topic tiles, then levels) until assignments and adaptive levels arrive in M4.
2. For MC and NC, one wrong Check is one wrong try. The first gets "Not quite." only; the second opens the next hint tier and pulses Help (R-HELP-2). Clean solve: no wrong try and no hint above H1.
3. Walkthrough mini-question misses aren't scored or recorded. A wrong chip is greyed with "Not quite.".
4. Irrational patterns, only the spec's two families:
   - "one more 0 each time": digit 1–9, whole part 0–9, digit-first (0.1010010001…) or zero-first (2.020020002…), either sign;
   - "the counting numbers in a row": 0.123456789101112…, either sign.

   Each carries its rule as a caption.
5. Ranges the spec leaves open:
   - RD:
     - L3: whole part 1–9, block 1–3.
     - L4: whole part 0–9.
     - F→D: proper fractions in lowest terms.
     - L5: mixes all seven shapes evenly.
   - FDP:
     - Level pools: L1 d ∈ {2, 4, 5, 10}; L2 {8, 20, 25, 50, 100}; L3 mixed numbers (1–5 wholes over {2, 4, 5, 8, 10, 20, 25}) or p/1000 for p = 1…9; L4 {3, 6, 9, 11, 12}.
     - L5 picks one of the pools 1–4.
     - The direction is uniform over the six.
     - A fraction > 1 in the question is shown as a mixed number.
   - PC:
     - Prices $5–$200.
     - L2 prices are chosen so the result is exact to the cent.
     - L3 and L4 percents come from {5, 10, 15, 20, 25, 30, 40, 50, 60, 75}.
     - L5 mixes 1–4.
   - NC:
     - Integers up to 50; fractions over {2, 3, 4, 5, 6, 8, 10}; repeating decimals over {3, 6, 7, 9, 11, 12}.
     - L3 is disguised integers only.
     - L4 is half irrational patterns.
     - L5 is half from {0.999…-style, repeating with a whole part, x.000}; 0.999… can have a whole part or a minus.
6. The spec lists the F→D misconceptions without codes; here they are RD-F1 truncated, RD-F2 wrong block, RD-F3 repeat too early, RD-F4 digits side by side, RD-F5 reciprocal.
7. RD distractor details:
   - RD-M3 is both one more and one fewer 9.
   - RD-M4 cuts after one block.
   - RD-M5 has both of the spec's variants.
   - RD-M6 is whole + block/10ᵏ, so for pure repeats it equals RD-M4 and is dropped as a duplicate (the spec says so).
8. PC-M6 and PC-M7 always have the same value (the percent taken of the final price and undone). The code follows the spec's examples: M6 for a discount, M7 for an increase.
9. FDP details:
   - At levels 1–3 no option is a repeating decimal (it would need an ellipsis-only display).
   - FDP-M5 divides top and bottom by different numbers (two variants).
10. Display details:
    - All fraction options are in lowest terms, as in mockup 02.
    - Repeating options show both forms stacked (the parent's decision).
    - Walkthrough and hint lines use the ellipsis form; the hero's caption already names the block.
    - LaTeX uses a tight `…` like the mockups.
11. Fillers are near misses, with code `FILLER` and no misconception line:
    - fractions: (n ± i)/d;
    - decimals: ± one unit in the last place;
    - prices: ± $1, $2, ….
12. NC's second wrong Check adds "Have another look at the outlined boxes." An outline clears when that card is toggled, or at the next Check.
13. Starting a walkthrough records the selected option (or the ticked sets) as the try's answer.
14. `naturalIncludesZero` and `currency` are read from Dexie with the config defaults; their toggles come with M5.
15. The sets-map preview is shown only at ≥ 1200 px wide; the Sets map button always is.
16. PC level 3 walkthrough (R-PC-3):
    - Equal percents in opposite directions: "does not get back to …, the second percent is taken of a bigger (or smaller) number".
    - If the two changes cancel exactly (up 25% then down 20%): the walkthrough says so.
    - Otherwise: "the percents don't just add up".
17. When any option's first line is longer than 11 characters (e.g. 1/7 shows 18 digits), the options use two wide columns with the 5th spanning both.
18. The TopBar is unchanged: no stars, shells or progress bar until M4.
19. On a set card, Space ticks and Enter checks (design.md §10).

## 4. Conflicts found

1. R-FDP-3 writes repeating percents as `33.3…%`; R-DISP-3 requires the block at least 3 times. The parent chose R-DISP-3: `33.333…%`, with `33.\overline{3}%` beside it from level 4.
2. Mockup 02 shows five options in one row. Options with long repeating decimals (1/7) don't fit, so those questions use two wide columns (assumption 17).
3. R-HELP-1a and design.md §9 give PC-M2's line as "What's the new price?". For a reverse question that would be misleading, so there it reads "What was the price before?".

## 5. Approved deviations still in force

None. `CLAUDE.md` is still out of date: it lists the M1 deviations and points to the handoff for status. The parent asked that it stay unchanged. `progress.md` is the authority.

## 6. Commands

```powershell
cd <path to your clone of math-app>
npm run dev        # http://localhost:5173/math-app/  (Home: pick a topic, then a level)
npm test
npm run coverage
npm run lint
npm run build
npm run e2e
$env:LIVE_URL='https://kristopherhuber-commits.github.io/math-app/'; npx playwright test e2e/zz-live.spec.ts
$env:SHOTS="$env:TEMP\shots"; npx playwright test e2e/zz-screens.spec.ts   # screenshots of every screen
```

Direct links for trying a topic: `?topic=NC&level=4`, `?topic=RD&level=3`, `?topic=FDP&level=4`, `?topic=PC&level=3` (add `&seed=N` to repeat a question).

## 7. Next, and concerns

- Next: M4 (sessions, adaptive levels, stars, streaks, badges, penguin celebrations), when the parent says go.
- Still open:
  - The tablet-portrait keypad for typed EQ (deferred to M6).
  - The M2 touch-drag fix on the real tablet (not tried yet).
- Worth a look when trying M3:
  - Whether the NC level 5 mix (0.999…, −0.999…, 3.999… = 4) is the right amount of challenge.
  - Whether the long repeating decimals at RD level 5 (sevenths) read well on the tablet.
