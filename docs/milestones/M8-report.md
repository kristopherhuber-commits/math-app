# M8 report: four levels, stars by hints and mistakes (2026-10-11)

## 1. What was built

- **Four levels in every topic** (§4.1, §6, §7.2, R-SES-8): 1 Basic, 2 General, 3 Advanced, 4 Challenge. Old levels 1 + 2 → 1, 3 → 2, 4 → 3, 5 → 4; EQ level 6 (mixed review) and its any-line rule are gone. No level mixes in easier questions.
  - EQ: L1 tiles (both old tile kinds), L2 typed both-sides, L3 parentheses, L4 fractions (one in four is parentheses with a fraction answer).
  - NC: L4 is irrational patterns half the time, else look-alikes (0.999…, long repeating decimals with a whole part).
  - RD: L4 is 7ths and 14ths → decimal, and delayed repeats with a whole part (block 2–3).
  - FDP: L4 is repeating values above 1 (e.g. 2⅙ = 2.1666… = 216.666…%).
  - PC: L4 is the original price after two changes; never two changes that cancel exactly.
  - Generator ids are `v2`; start levels Equations 2, Adaptive free practice 2.
- **Stars** (R-RWD-1, R-HELP-2/6): 2 × level; H1 −1, H2 −2 more (once per question); −2 per wrong try; never below 0; at 0 the walkthrough starts by itself. A wrong try only makes Help pulse. The below-level rule and `freeBest` are gone. Shells = stars.
- **"How stars work"** pop-up on Home, left of the streak (mouse, touch, keyboard; Esc and "Got it" close it).
- **Level names** on the level picker, question chip, assignment level lock, dashboard and missed questions.
- **Dexie v5** (R-DATA-1): stored levels, level ranges, level locks and attempts renumbered; adaptive windows restart; imports of older files migrate the same way.
- **Mascot animations** (parent request, same day): idle breathing and blinks, tap reactions, Dress up reactions; all stop with reduced motion.

## 2. Tests

- Unit and property: 31 files, 679 tests, all pass, none skipped. Engine line coverage 97.0 %.
- E2E: 126 passed, 12 skipped (the on-demand `zz-*` specs). New: hint costs, a mistake to 1 ★, the walkthrough at 0 ★, the stars pop-up (mouse, keyboard, axe in light and dark).
- Lint and Prettier clean. Build: 249.3 KB gzipped JS (budget 1024 KB).

## 3. Assumptions

`progress.md` §5, items 84–91. Two consequences of the approved rules, kept as approved:
- At level 1 one mistake reaches 0 ★, so the walkthrough starts at once and the "Not quite" line is not seen.
- Guessing at Challenge now averages about the same as a first-try General answer (4 ★).

## 4. Conflicts

None open. `requirements.md` and `design.md` were updated with the parent's approval (requirements §15, design §12).

## 5. Deviations

None.

## 6. Run it

```powershell
npm test
npm run build
npm run e2e
```

## 7. Next

The parent's open request: merge Repeating decimals into Fractions, decimals and percents. It needs four answers first (how the levels combine, stored data, badges, name).
