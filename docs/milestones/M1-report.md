# M0 + M1 report

Status: **done**, deployed to https://kristopherhuber-commits.github.io/math-app/ (GitHub Pages, auto-deploys on push to `main`).

## 1. What was built

**M0 — scaffold** (R-PLAT-1, R-PLAT-3, R-ARCH-5, R-DATA-1)
- Vite + React + TypeScript (strict, `noUncheckedIndexedAccess`), `vite-plugin-pwa` (installable, offline precache incl. KaTeX and Nunito fonts).
- ESLint (engine purity enforced: no React/DOM/Dexie imports in `src/engine/**`) + Prettier; Vitest + fast-check; Playwright against the production build.
- Dexie schema v1 (`src/data/db.ts`), design tokens (`src/ui/theme/tokens.css` + `tokens.ts`, light and dark values), PWA icons, `CLAUDE.md`.
- `.github/workflows/deploy.yml`: lint → test → build → deploy to Pages.

**M1 — engine + typed equations**
| Area | Files | Requirements |
|---|---|---|
| Exact arithmetic (bigint `Rational`) | `src/engine/rational.ts` | R-ARCH-2, R-TEST-1 |
| Seeded PRNG (mulberry32) | `src/engine/rng.ts` | R-ARCH-3 |
| Tunables | `src/engine/config.ts` | all *(default)* markers |
| Parser → AST | `src/engine/eq/parse.ts` | R-EQ-TYPE-3 |
| Linear form, Terms, forms | `src/engine/eq/linear.ts` | §7.4 definitions |
| Step checker, EQ-D1…D11 | `src/engine/eq/stepChecker.ts` | §7.4, R-EQ-CHK-1…6 |
| Formatting (text, LaTeX) | `src/engine/eq/format.ts` | R-DISP-1, R-DISP-2, R-EQ-GEN-3 |
| Independent evaluator | `src/engine/eq/evaluate.ts` | R-TEST-2 |
| Generators L1–6 | `src/engine/topics/eq/generator.ts` | §7.2, R-EQ-GEN-1…7 |
| Hints H1/H2 + H3 walkthrough content | `src/engine/topics/eq/hints.ts` | §7.6, R-HELP-4/5, R-EQ-PED-3 |
| Practice state (reducer) | `src/ui/practice/practiceReducer.ts` | R-HELP-1…3, R-SES-5 |
| Screens | `src/ui/screens/Home.tsx`, `EquationPractice.tsx` | R-EQ-TYPE-1…5 |
| Keypad, KaTeX helpers, error boundary | `src/ui/components/*` | R-PLAT-6, R-NF-5 |
| All copy | `src/ui/strings.ts` | R-NF-4 |
| Attempt persistence | `src/data/attempts.ts` | R-SES-5, R-PAR-4 (data) |

`?level=N&seed=S` opens a specific question (e2e tests, bug reports).

## 2. Tests

- Unit + property: **195 passed, 0 skipped**. Every §7.5 example is a named test; every diagnostic has ≥ 2 positive and ≥ 2 negative cases; generators run 1000 seeds per level (answer verified by substitution, invariants checked from text/values), and every generated walkthrough is replayed through the step checker.
- E2E (Playwright, desktop + touch tablet): **14 passed**. Two on-demand specs are skipped by default: `e2e/zz-screens.spec.ts` (set `SHOTS=<dir>`) and `e2e/zz-live.spec.ts` (set `LIVE_URL=<url>`).
- `src/engine` coverage: 94.6 % lines, 92.2 % statements, 84 % branches (target ≥ 90 %, R-ARCH-4).
- Bundle: 193 KB gzipped JS (budget 1 MB, R-NF-2).

## 3. Assumptions (spec silent; all small and reversible)

1. **EQ-D5** is detected the same way as the approved EQ-D4 rule: D(N) = ±(D(P) ∓ t) for one term t of Terms(P). Covers the multiset case and lost terms hidden by combining.
2. **Skipping Simplify** (`a = 10` from `3a − a = 23 − 3`) is refused like R-EQ-CHK-3, code `R-EQ-CHK-3-SIMPLIFY`, own message. Allowed only at L5–6 with `allowSkipping` on.
3. **Partial simplifying** (fewer terms, still separated, balanced) is accepted with "Simplified ✓ (keep going)".
4. A balanced line that makes no progress gets "Balanced ✓, now …" (code `EQ-KEEP-GOING`) instead of EQ-D10, which would falsely say "not balanced".
5. Scaled *and* moved in one line (`4a = 40` from `3a + 3 = a + 23`) → EQ-D6.
6. **Wrong try (EQ):** two rejections on the same step = one wrong try (design.md §6.3). A wrong try opens the hint panel at the next tier and pulses Help (R-HELP-2). The hint ladder restarts at H1 for each new step; `Attempt.maxHint` keeps the highest tier seen.
7. **Clean solve (EQ):** no wrong try and no hint above H1.
8. `Attempt.finishedAt` and `Attempt.stars` are optional in the TypeScript types (the spec shows them required) so in-progress attempts can be saved after every step. `AttemptSummary` (for `TopicState.window`) is not defined in the spec; a placeholder shape is in `db.ts`.
9. Hints show in a panel inside the question card, not a docked side drawer (the keypad occupies the right column, as in mockup 06).
10. No decimal key on the on-screen keypad (the spec's key list has none); the physical keyboard can type `.`.
11. Nunito comes from `@fontsource-variable/nunito`, bundled at build time, rather than files in `public/fonts/`. Still no runtime CDN.
12. The solved state shows the substitution check line (e.g. `3·10 + 3 = 33 ✓`), a small preview of the M4 celebration.
13. `H` opens Help from inside the line input unless the problem's variable is `h`.
14. D4 message names the side the term came from and adds a balance reminder when the term crossed the `=` (as in mockup 06).

## 4. Conflicts found

1. **§7.4 rule order vs §7.5:** read literally, `x = 8` from `x/4 = 2` matches CLEAR_FRACTIONS (integer terms, D scaled by 4) before SOLVE. §7.5 says SOLVE ✔. Implemented §7.5: a `v = q` line is never CLEAR_FRACTIONS.
2. **EQ-D9** says "one side's Lin changed". Enforced as *exactly* one side, because otherwise any unrelated line typed at the Expand stage (e.g. `1 + 1 = 5`) was told to check its expansion.

## 5. Approved deviations still in force (removed in M2)

1. EQ levels 1–2 use typed mode instead of the tile builder (R-ANS-5, R-EQ-TILE).
2. The H3 walkthrough UI is not shown; the hint panel offers H1/H2 only ("Hint n of 2"). H3 content exists and is tested in `eqWalkthrough()`.

## 6. Known issues / suggestions for M2

- Tablet portrait: the keypad sits below the question card, so long solutions need scrolling between line and keys. design.md §3.1 wants sticky actions; consider a compact keypad on portrait.
- The typed line is a plain text input; fractions show as `a/b` until the line is accepted and rendered by KaTeX.
- `strings.hint.title` says "Hint n of 2"; change to "of 3" when H3 ships.
- The tile builder should reuse `stepChecker` for the recorded Separate line (R-EQ-TILE-3) and the engine's `eqWalkthrough()` for H3.

## 7. Commands

```powershell
cd <path to your clone of math-app>
npm run dev        # http://localhost:5173/math-app/
npm test           # unit + property tests
npm run coverage   # engine coverage
npm run lint       # ESLint + Prettier check
npm run build      # typecheck + production build
npm run e2e        # Playwright against the production build
```
