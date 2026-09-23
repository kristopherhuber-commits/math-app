# Progress: Turtle & Penguin Math

**Project checkpoint.** With `docs/requirements.md` (the contract), `docs/design.md` (visual design) and this file, a new session has everything it needs to continue. This file holds the status, every decision the parent has made, the questions asked and their answers, the assumptions in force, and what comes next.

Last updated: 2026-09-23 · Current state: **M0, M1, M2 done and deployed; the M2 build session is closed. Next session: M3.**

---

## 1. How to work on this project

- **Read first:** `docs/requirements.md`, `docs/design.md`, then this file. Milestone reports with full detail: `docs/milestones/M1-report.md` (M0 + M1), `docs/milestones/M2-report.md`.
- **Precedence:** `requirements.md` > `design.md` > mockups > anything else, except the approved rules and deviations in §4. Report any other conflict; implement the higher-precedence source.
- **Process per milestone:** plan in plan mode with open questions → parent approves → build one milestone → stop and report (template in §9) as `docs/milestones/M<n>-report.md` → update this file → commit → push (deploys) → run the live check.
- **Public repo.** Never commit names, ages, gender, locations or local user paths of the parent or the learner. Say "the parent" and "the learner".
- **Ask, don't guess** for irreversible choices; small reversible choices go under "assumptions" in the report.
- **Don't edit** `docs/requirements.md`, `docs/design.md` or `CLAUDE.md` without asking the parent.
- **Math rules:** exact `Rational` (bigint) arithmetic, never floating point for correctness (R-ARCH-2). No invented math content: every question comes from a seeded generator whose answer is verified independently in tests. `src/engine/**` is pure TypeScript (no React, DOM or Dexie; ESLint enforces it). The UI never re-implements math.
- **Done means** no test fails, is skipped (other than the on-demand specs), or was weakened.
- **Commits:** small, one-line summary plus the relevant `R-…` IDs.
- **Code:** tokens only (`src/ui/theme/tokens.css` / `tokens.ts`), no raw hex in components; all learner copy in `src/ui/strings.ts`; no "wrong", no red, no timers; 48 px targets, visible focus rings, keyboard paths, `prefers-reduced-motion`; mouse, touch and keyboard for every interaction; no analytics, telemetry, external requests or accounts. Name things as the docs do (`SEPARATE`, `EQ-D4`, `HintTier`).

## 2. Environment and stack

- Windows 11 + PowerShell (commands for the parent are PowerShell with Windows paths; npm scripts must be cross-platform). Node 24 LTS, npm. A new shell may need its PATH refreshed before `node` resolves.
- Git: public repo `kristopherhuber-commits/math-app`, branch `main`; the repo-local identity is the GitHub no-reply address (keep it). `gh` is authenticated with the `workflow` scope.
- Stack (fixed): TypeScript (strict, `noUncheckedIndexedAccess`) + React + Vite, PWA via `vite-plugin-pwa`, KaTeX bundled, Nunito self-hosted (`@fontsource-variable/nunito`), Dexie over IndexedDB, Vitest + fast-check, Playwright, ESLint + Prettier.
- Hosting: GitHub Pages at `/math-app/`, deployed by `.github/workflows/deploy.yml` (lint → test → build → deploy) on push to `main`. Live URL: https://kristopherhuber-commits.github.io/math-app/. Service workers need HTTPS or `localhost`: `file://` and LAN `vite preview` can't install or run offline.

```powershell
npm run dev        # http://localhost:5173/math-app/
npm test           # unit + property
npm run coverage   # engine coverage (target ≥ 90 %, R-ARCH-4)
npm run lint       # ESLint + Prettier check (npm run format fixes)
npm run build      # typecheck + production build
npm run e2e        # Playwright against the production build (first run: npx playwright install chromium)
$env:LIVE_URL='https://kristopherhuber-commits.github.io/math-app/'; npx playwright test e2e/zz-live.spec.ts
```

`?level=N&seed=S` opens a specific EQ question (tests, bug reports).

## 3. Status log

| Date | Milestone | Status |
|---|---|---|
| 2026-09-22 | **M0 Scaffold** | Done. Vite + React + TS PWA, tooling, tokens (light + dark values), Dexie schema v1, Pages deploy, installable and offline on the hosted URL. |
| 2026-09-22 | **M1 Engine + typed EQ** | Done. `Rational`, seeded PRNG, config; parser → linear form → step checker with EQ-D1…D11; generators L1–6; hints H1/H2/H3 content; typed-step UI at all levels; attempts saved after every step. 195 unit/property tests, 14 e2e, engine 94.6 % lines. Report: `docs/milestones/M1-report.md`. |
| 2026-09-23 | **M2 Tile builder, balance scale, walkthrough** | Done. Tile builder at L1–2 (drag by mouse, touch, keyboard; SignPicker; Simplify/Solve with number pad); BalanceScale (full / short after 10 correct signs / two frames under reduced motion); H3 walkthrough UI for typed and tiles; Shelly the turtle. Both M1 deviations removed. After the parent's review: level 6 accepts a correct final answer from any line (§4). 242 unit/property tests, 30 e2e (+4 on-demand skipped), engine 95.1 % lines, 202.5 KB gz JS. Report: `docs/milestones/M2-report.md`. |
| — | M3 Number topics | Not started; waits for the parent. |
| — | M4–M6 | Not started. |

## 4. Parent decisions, questions and answers

| Date | Question / topic | Decision |
|---|---|---|
| before M0 | Hosting | GitHub Pages from a **public** repo (free accounts publish Pages only from public repos). |
| M1 | EQ-D4 "undo N's partial combining where possible" is underspecified | **Approved rule:** EQ-D4 fires at the SEPARATE stage when N is separated and some term t of Terms(P) (signed, moved to the left) gives D(N) = ±(D(P) − 2t). When several terms qualify, name one that crossed the `=`. |
| M1 | Deviation 1 | EQ L1–2 used typed mode until the tile builder existed. **Removed in M2 (2026-09-23).** |
| M1 | Deviation 2 | H3 walkthrough UI deferred to M2 (it is specified on the balance scale). **Removed in M2 (2026-09-23).** |
| 2026-09-22 | M2: add Shelly the turtle now, although §12 doesn't list it under M2? | **Yes, now.** The penguin and stars stay in M4. |
| 2026-09-22 | M2: how does a wrong sign pick count toward scoring? | **Like a typed rejection:** two wrong picks on the same step = one wrong try. The balance explanation is feedback, not a hint; `maxHint` is unchanged. |
| 2026-09-22 | M2: where does the walkthrough start when the learner has made progress? | **From the learner's last accepted line**; accepted lines count as done, and it ends with the substitution check against the original equation. |
| 2026-09-22 | M2: where is the R-EQ-PED-2 count of correct sign choices stored? | **Derived from stored attempts** (accepted `SIGN` tries). No schema change. |
| 2026-09-23 | Project checkpoint | Don't edit `CLAUDE.md`. Status, Q&A and decisions live in `progress.md` (this file). |
| 2026-09-23 | After trying M2: at level 6 the learner may be doing the steps in her head | **Approved rule:** at EQ level 6, a correct final answer `v = q` entered on any line ends the question (label "Solved ✓ (straight to the answer)"; the solve can still be clean). How q is written is still checked (R-EQ-CHK-5 lowest terms, R-EQ-CHK-6 exact). A wrong value, and every line that is not a final answer, is checked as before. Levels 1–5 still require every step. Implemented in `checkStep` via `config.eq.finalAnswerAnyTimeLevels = [6]`. This overrides R-EQ-CHK-3 at level 6; `requirements.md` is unchanged. |
| 2026-09-23 | Reference list in design.md | Approved: design.md header now lists the original brief, the build brief, milestone reports and `progress.md`. |
| 2026-09-23 | M2 build session | Closed by the parent. M3 starts in a new session. |

## 5. Assumptions in force (spec silent; reversible)

From M1 (details in `docs/milestones/M1-report.md` §3):
1. EQ-D5 detected like the approved EQ-D4 rule: D(N) = ±(D(P) ∓ t) for one term t.
2. Skipping Simplify is refused like R-EQ-CHK-3 (`R-EQ-CHK-3-SIMPLIFY`); allowed only at L5–6 with `allowSkipping` on.
3. Partial simplifying is accepted ("Simplified ✓ (keep going)").
4. A balanced line that makes no progress gets "Balanced ✓, now …" (`EQ-KEEP-GOING`), not EQ-D10.
5. Scaled and moved in one line (`4a = 40` from `3a + 3 = a + 23`) → EQ-D6.
6. Wrong try (EQ) = two rejections on the same step; a wrong try opens the hint at the next tier and pulses Help; the ladder restarts at H1 per step; `Attempt.maxHint` keeps the highest tier.
7. Clean solve (EQ) = no wrong try and no hint above H1.
8. `Attempt.finishedAt` and `Attempt.stars` are optional in the types; `AttemptSummary` has a placeholder shape.
9. Hints show in a panel inside the question card, not a docked drawer.
10. No decimal key on the typed keypad; the physical keyboard can type `.`.
11. Nunito comes from `@fontsource-variable/nunito`, bundled at build time.
12. The solved state shows the substitution check line (celebration arrives in M4).
13. `H` opens Help from the line input unless the variable is `h`.
14. The EQ-D4 message names the side the term came from, plus a balance reminder when it crossed.

From M2 (details in `docs/milestones/M2-report.md` §3):
15. Tile faces: constants with `+`, variables without (`3a`, `+3`, `a`, `+23`, R-EQ-TILE-1).
16. A crossing tile lands at the end of its new side; "So far" = tiles that stayed, then arrivals in order.
17. Swap only before the first crossing; one tile awaits its sign at a time.
18. Dragging an already-placed tile returns it with a gentle note (recorded, not a rejection).
19. Wrong sign shows the operation on both pans but not the result; a correct sign plays the animation.
20. Simplify: unknowns first, then knowns; single-tile sides skipped; coefficient 1 ends the question at Simplify (R-EQ-CHK-4). No tap on the group needed.
21. Wrong pad entries: EQ-D7 (Simplify), EQ-D8 (answer), `TILE-DIVISOR` (divisor).
22. TryRecord `stepType`s: `MOVE`, `SIGN`, `SWAP`, `SEPARATE`, `SIMPLIFY`, `SOLVE`, `WALKTHROUGH`; `Attempt.params.mode` = `'tiles' | 'typed'`.
23. No inline mini-questions in EQ walkthroughs (the Walkthrough component gets mini-question support with M3's RD walkthroughs).
24. "Show me step by step" is offered at H1 and H2; a wrong try at H2 makes it pulse; it never starts by itself; a started walkthrough ends only by finishing.
25. `fullBalanceAnim` default `false` (= shorten after 10 correct signs); parent toggle in M5.

## 6. Spec conflicts found and how they were resolved

1. (M1) §7.4 rule order would make `x = 8` from `x/4 = 2` a CLEAR_FRACTIONS; §7.5 says SOLVE. Implemented §7.5: a `v = q` line is never CLEAR_FRACTIONS.
2. (M1) EQ-D9 "one side's Lin changed" enforced as exactly one side.
3. (M2) Mockup 05 shows constant tiles without `+`; R-EQ-TILE-1 has `+3`, `+23`. Followed the requirement.
4. (M2) design.md §6.2 ends Solve with a celebration; celebrations are M4. The substitution-check box stands in until then.
5. (M2) The hint note "Walkthrough = 1 star, and that's OK!" (design.md §5) is shown before stars exist (M4).

## 7. Approved deviations and rules in force

**Deviations: none** since 2026-09-23. **Approved rules** (they override the spec): EQ-D4 detection (M1) and the level-6 final-answer rule (2026-09-23), both in §4. `CLAUDE.md` is out of date, and the parent asked for it to be left unchanged: it still lists the two M1 deviations as "in force until M2", and it points to `cc-develop-handoff.md` for the current milestone. **This file is the authority for status.**

## 8. Code map

```
src/engine/            pure TS (R-ARCH-1)
  rational.ts rng.ts config.ts
  eq/parse.ts linear.ts stepChecker.ts format.ts evaluate.ts tiles.ts
  topics/eq/generator.ts hints.ts        (eqHint H1/H2, eqWalkthrough H3 + WalkOp)
src/data/db.ts attempts.ts               Dexie schema v1; attempt save; stored sign count
src/ui/
  App.tsx                                routing: L1–2 → TileEquation, L3–6 → EquationPractice
  practice/help.ts practiceReducer.ts tileReducer.ts
  screens/Home.tsx EquationPractice.tsx TileEquation.tsx
  components/ Math Keypad NumberPad TileBoard StepRail HintPanel Walkthrough BalanceScale ErrorBoundary
  mascots/Turtle.tsx   hooks/useReducedMotion.ts
  strings.ts  theme/tokens.css tokens.ts global.css  ui.css tiles.css
tests/engine/*  tests/ui/*               Vitest + fast-check
e2e/equation offline tiles walkthrough   Playwright (desktop + tablet-touch); zz-live, zz-screens on demand
```

## 9. Milestone report template (from the original handoff)

1. What was built, against requirement IDs. 2. Test results: counts, `src/engine` coverage, anything skipped and why. 3. Assumptions. 4. Conflicts between requirements, design and mockups. 5. Approved deviations still in force and which milestone removes each. 6. PowerShell commands to run it, and confirmation that the hosted URL was redeployed and still installs and works offline. 7. What to build next, and anything wrong with the plan.

## 10. Next: M3 number topics (only after the parent says go)

Scope and done-when: requirements §12 (NC, RD, FDP, PC generators, distractors, hints, walkthroughs; MC and select-all UIs; R-TEST-2 green for all topics). Notes carried from the original handoff:

- Multiple-choice generators return five options with misconception codes. Property tests add: five distinct options, exactly one correct, and **no distractor equal in value to the correct answer** (R-ANS-3): offering `420/99` as "wrong" when `140/33` is right would be a lie.
- Independent checks: evaluate a repeating decimal's digits and compare against the fraction.
- Worked examples that must hold: `4.2424… = 140/33` · `0.41666… = 5/12` · `2.31818… = 51/22` · `$50 up 20% then down 20% = $48.00` · `$60 after 25% off → original $80.00`.
- Display: repeating decimals show the block at least three times before the ellipsis, with the caption naming the block, and bar notation from the levels where the spec introduces it (R-DISP-3). Money always has two decimals (R-DISP-5). An irrational patterned decimal always carries its rule as a caption (R-DISP-4).
- The `Walkthrough` component needs inline mini-questions (3 choice chips gating Next, R-HELP-4) and aligned column arithmetic (design.md §5, mockup 07).
- Keyboard: `1–5` choose an MC option, `Space` toggles a set card (design.md §10).

Open items to raise in the M3 plan: the M1 tablet-portrait keypad layout (typed mode); confirm the touch-drag fix (§ M2 report 7) on the real tablet.

## 11. Reference materials

| Path | What |
|---|---|
| `docs/requirements.md` | Product spec, the contract. Requirement IDs `R-…` are stable. |
| `docs/design.md` | Tokens, components, screens, flows, copy, accessibility. |
| `docs/design/mockups/*.png`, `*.svg` | 12 annotated mockups (purple circles are annotations, not UI; design.md §7 explains them). |
| `docs/design/mockups/_src/` | Python mockup generator; `gen.py` `turtle()` / `penguin()` hold the mascot geometry. |
| `docs/milestones/` | Milestone reports. |
| `math-app-description.md` | The parent's original brief. |
| `cc-develop-handoff.md` | The original Claude Code brief (M0–M2 instructions). Historical; its status line is superseded by this file. |
| `CLAUDE.md` | Standing rules loaded by Claude Code (summarised in §1–2 above). |
