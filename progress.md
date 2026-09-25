# Progress: Turtle & Penguin Math

**Project checkpoint.** With `docs/requirements.md` (the contract), `docs/design.md` (visual design) and this file, a new session has everything it needs to continue. This file holds the status, every decision the parent has made, the questions asked and their answers, the assumptions in force, and what comes next.

Last updated: 2026-09-25 · Current state: **M0–M6 done and deployed (v1 complete). Next: M7 (editable shop catalogue), when the parent says go.**

---

## 1. How to work on this project

- **Read first:** `docs/requirements.md`, `docs/design.md`, then this file. Milestone reports with full detail: `docs/milestones/M1-report.md` (M0 + M1), `docs/milestones/M2-report.md`, `docs/milestones/M3-report.md`, `docs/milestones/M4-report.md`, `docs/milestones/M5-report.md`, `docs/milestones/M6-report.md`.
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

`?topic=NC|RD|FDP|PC|EQ&level=N&seed=S` opens a specific question at a fixed level; `?level=N&seed=S` alone opens EQ (tests, bug reports; these change no levels or rewards, skip the first-run setup, and are left out of the dashboard). Assignments are created in the parent area (Home › Parent › PIN); the `?assign=` link was removed in M5. `$env:SHOTS='<folder>'; npx playwright test e2e/zz-screens.spec.ts` takes screenshots of every screen, parent area included.

## 3. Status log

| Date | Milestone | Status |
|---|---|---|
| 2026-09-22 | **M0 Scaffold** | Done. Vite + React + TS PWA, tooling, tokens (light + dark values), Dexie schema v1, Pages deploy, installable and offline on the hosted URL. |
| 2026-09-22 | **M1 Engine + typed EQ** | Done. `Rational`, seeded PRNG, config; parser → linear form → step checker with EQ-D1…D11; generators L1–6; hints H1/H2/H3 content; typed-step UI at all levels; attempts saved after every step. 195 unit/property tests, 14 e2e, engine 94.6 % lines. Report: `docs/milestones/M1-report.md`. |
| 2026-09-23 | **M2 Tile builder, balance scale, walkthrough** | Done. Tile builder at L1–2 (drag by mouse, touch, keyboard; SignPicker; Simplify/Solve with number pad); BalanceScale (full / short after 10 correct signs / two frames under reduced motion); H3 walkthrough UI for typed and tiles; Shelly the turtle. Both M1 deviations removed. After the parent's review: level 6 accepts a correct final answer from any line (§4). 242 unit/property tests, 30 e2e (+4 on-demand skipped), engine 95.1 % lines, 202.5 KB gz JS. Report: `docs/milestones/M2-report.md`. |
| 2026-09-23 | **M3 Number topics** | Done. NC, RD, FDP and PC generators L1–5 with misconception distractors (R-ANS-3 checked on 1000 seeds per level); hints H1/H2; H3 walkthroughs with mini-questions, column subtraction, long division and the sets map; multiple-choice and select-all screens; Home topic picker. 377 unit/property tests, 50 e2e (+6 on-demand skipped), engine 96.9 % lines, 216.7 KB gz JS. Report: `docs/milestones/M3-report.md`. |
| 2026-09-23 | **M4 Sessions, adaptive levels, rewards** | Done. Assignments (from a link until M5), grouped and mixed order, resume; adaptive levels (R-ADP-1…6); stars, shells, streak, 12 badges; Pip the penguin and celebrations; Home with the assignment card and locked free practice; assignment summary; Dexie schema v2. 489 unit/property tests, 60 e2e (+8 on-demand skipped), engine 97.1 % lines, 229.7 KB gz JS. Report: `docs/milestones/M4-report.md`. |
| 2026-09-23 | **M5 Parent area** | Done. First-run setup (PIN, then naming Shelly and Pip); PIN gate with reset and auto-lock; assignment builder and queue (replaces the link); progress dashboard; missed-question review; settings; export / import / reset; the error list; free practice defaults to `always`; Dexie schema v3. 556 unit/property tests, 86 e2e (+10 on-demand skipped), engine 97.2 % lines, 244.3 KB gz JS. Report: `docs/milestones/M5-report.md`. |
| 2026-09-25 | **M6 Polish, shop, cosmetics** | Done. Lifetime shells unlock 8 cosmetics (worn at once); shells to spend buy real rewards in a shop the parent fulfils (Parent › Rewards); badge shelf; shells on the beach; synthesised sounds; motion audit; axe on every screen in both themes (R-TEST-6); offline question (R-TEST-7); cold load ~0.5 s at 4× CPU (R-NF-1); bundle check in the build (R-NF-2); Dexie schema v4. 594 unit/property tests, 116 e2e (+12 on-demand skipped), engine 97.3 % lines, 244.5 KB gz JS. Report: `docs/milestones/M6-report.md`. |
| — | M7 | Not started: an editable shop catalogue (parent request). |

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
| 2026-09-23 | M3 plan | Approved as proposed. |
| 2026-09-23 | M3: repeating percents, `33.3…%` (R-FDP-3) or the block shown 3 times (R-DISP-3)? | **R-DISP-3**: `33.333…%`, with `33.\overline{3}%` beside it from FDP level 4. The R-FDP-3 example is logged as a conflict. |
| 2026-09-23 | M3: how do answer options show repeating decimals? | **Both forms, stacked** (`0.181818…` over `= 0.\overline{18}`), so no option is ever ellipsis-only. |
| 2026-09-23 | M1 open item: tablet-portrait keypad (typed EQ) | **Deferred to M6** (polish). |
| 2026-09-23 | M2 open item: the touch-drag fix on the real tablet | **Not tried yet**; stays open. |
| 2026-09-23 | After trying M3: the device | **For now the app is used only in a desktop browser.** Tablet-only checks (the touch-drag fix, the portrait keypad) wait until the tablet is used. Touch and portrait stay in scope and in the e2e tests (R-PLAT-4/5). |
| 2026-09-23 | After trying M3: hints in a panel inside the question card (M1 assumption 9) instead of design.md's docked drawer | **Approved: keep the in-card panel.** design.md is unchanged. |
| 2026-09-23 | M4 plan | Approved as proposed, with the four answers below. |
| 2026-09-23 | M4: how is an assignment created before the M5 builder? | **A link:** `?assign=EQ:10,PC:5@2&order=mixed&title=…&due=…&seed=…` (`@n` locks the level). It queues the assignment and is then removed from the address. M5's builder replaces it. |
| 2026-09-23 | M4: starting level per topic | **EQ 3, the others 1** (`config.adaptive.startLevel`). |
| 2026-09-23 | M4: R-HELP-6 (same topic and level after a walkthrough) against a demotion that walkthrough triggers, and mixed order | **Same topic and level next; the demotion applies from the question after.** Mixed order pulls that topic forward; if its item is finished, move on. |
| 2026-09-23 | M4: does the learner still pick a level on Home? | **No: topic tiles only, at the adaptive level.** `?topic=&level=` links still open a fixed level for the parent and tests, without changing levels or rewards. |
| 2026-09-23 | M5 input | **Assignments are created in the parent area, not by a link.** Free practice is **always** available by default (R-SES-6 `always`); the setting stays in the parent area. |
| 2026-09-23 | M5 plan | Approved as proposed, with the four answers below. |
| 2026-09-23 | M5: the `?assign=` link | **Removed** from the app. E2E tests write assignments into IndexedDB (`e2e/helpers.ts`); the R-TEST-5 flow uses the builder. `?topic=&level=` links stay. |
| 2026-09-23 | M5: what does "Reset all progress" clear? | **Answers, levels, shells, streak, badges and all assignments.** The PIN, names, settings and the error list stay. |
| 2026-09-23 | M5: first-run setup | **Required before Home.** Existing progress is kept. |
| 2026-09-23 | M5: "Save & make active" while another is active | **That one goes back to the front of the queue**, progress kept. |
| 2026-09-25 | After trying M5: the Real checkbox | **Removed**: every number shown is real. NC has five cards; the sets map keeps Real as its outer frame. This overrides requirements §6.1 ("six checkboxes"); `requirements.md` is unchanged. |
| 2026-09-25 | M6: shells and the shop | **She can spend shells**, on **real rewards** in a shop: a Starbucks treat (150) and a Roblox gift card, 2,000 Robux (1,500); prices editable by the parent. Buying takes shells to spend at once and leaves a request; the parent **marks it given or cancels it (refund)**. More items: **M7**. |
| 2026-09-25 | M6: cosmetics | **Unlock automatically from lifetime shells** (a hidden total that never goes down), **worn at once**; she can take them off or swap. What she sees is shells to spend. |
| 2026-09-25 | M6: badge shelf | **Yes, on Home.** |
| 2026-09-25 | After M6: shop pictures | **Shown in the shop.** The Starbucks photo and the Robux symbol can't be committed to the public repo (copyright, trademark), so the parent adds each picture in Parent › Rewards; it stays on the device (and in exports). A drawn gift shows until then. |
| 2026-09-25 | After M6: the treat's name | **Strawberry Açaí Lemonade Refresher.** Devices that stored the old default name show the new one. |
| 2026-09-25 | After M6: editing shells | Parent › Rewards sets **her shells to spend** (only `spent` moves; the lifetime total and its cosmetics stay as earned) and **shells per 3 / 2 / 1 star answer** (default 3 / 2 / 1, R-RWD-4), from the next answer on. |
| 2026-09-25 | After M6: sounds | **Off by default**; the parent turns them on in Settings. A device that saved its settings before this keeps what it had. |
| 2026-09-25 | M6: compact portrait keypad; real-tablet drag check | **Stay parked.** |
| 2026-09-25 | After trying M5: free-practice difficulty | **Each topic tile offers Adaptive or a level** (number topics 1–5, Equations 1–6), within the parent's level range. **Adaptive starts at level 3 every time**, goes **up one after 3 right in a row** (first try, no hint), and **down one when 2 of the last 3 had a mistake or needed help**. A picked level stays put. **Free practice only**: assignments keep R-ADP-2/3 and their stored level, which free practice no longer moves. After a walkthrough the next question stays at the same level (R-HELP-6). Config: `config.freeAdaptive`. |

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
9. Hints show in a panel inside the question card, not a docked drawer. (Approved by the parent on 2026-09-23; see §4.)
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

From M3 (details in `docs/milestones/M3-report.md` §3):
26. Home is free practice (topic tiles, then levels) until M4 brings assignments and adaptive levels.
27. MC and NC: one wrong Check = one wrong try. The first gets "Not quite." only; from the second, the next hint tier opens and Help pulses. Clean solve as in EQ.
28. Walkthrough mini-question misses aren't scored or recorded.
29. Irrational patterns: only the spec's two families (one more 0 each time; the counting numbers in a row), either sign, each with its rule as a caption.
30. Level ranges the spec leaves open are in `config.ts` (`rd`, `fdp`, `pc`, `nc`). Examples: RD L3 whole part 1–9; PC prices $5–$200; FDP level pools from the §6.3 table; NC integers ≤ 50. Level 5 of each topic mixes 1–4.
31. F→D distractor codes RD-F1…F5 (the spec lists them without codes). RD-M4 cuts after one block; RD-M6 duplicates it for pure repeats and is dropped.
32. PC-M6 and PC-M7 have the same value; the code follows the spec's examples (M6 discount, M7 increase).
33. FDP levels 1–3 never offer a repeating option. All fraction options are in lowest terms.
34. Fillers are near misses (`FILLER`, no misconception line).
35. NC: outlines appear from the second wrong Check and clear when the card is toggled or at the next Check. On a card, Space ticks and Enter checks.
36. `naturalIncludesZero` and `currency` are read from Dexie with the config defaults (toggles in M5).
37. The PC level 3 walkthrough adapts R-PC-3: "does not get back" for equal and opposite percents, "gets back exactly" when the changes cancel (up 25%, down 20%), otherwise "the percents don't just add up".
38. Options whose first line is longer than 11 characters (e.g. sevenths) use two wide columns, the 5th spanning both. The sets-map preview shows only at ≥ 1200 px.

From M4 (details in `docs/milestones/M4-report.md` §3):
39. "10 EQ questions without H3" = 10 in a row; a walkthrough resets the run.
40. "First delayed repeating decimal" = a solved RD question with a delayed repeat (D→F `delayed`, or F→D over 6, 12, 15, 22).
41. Demotion can fire before 5 attempts (3 bad out of 3–5); promotion needs 5.
42. Level-locked items and `?topic=&level=` links don't move levels; links also earn no shells, streak or badges, but show the celebration.
43. Free practice earns stars, shells and badges; it doesn't count toward the streak. Since 2026-09-25 it no longer moves the stored levels (see §4).
44. Resuming mid-question restarts the same question (same seed and level); the unfinished attempt doesn't count.
45. Mixed order is a seeded pick weighted by each item's remaining count; question seeds come from the assignment seed.
46. Shells = stars earned, counted from M4; beach shells and accessories in M6.
47. Streak milestones 3, 5, 7, 10, 14, 21, 30, then every 10; Home shows the current streak (0 after a missed assignment day).
48. TopBar: ★ = stars in this assignment or session, shells = total; "Question n of N" within the item (grouped) or the assignment (mixed).
49. Free-practice policy from Dexie (default `always` since M5); open when there's no active assignment. "Free practice ›" on the summary goes to Home with the first tile focused.
50. No sounds in M4.
51. Home's Pip line names the next unfinished topic, else the streak; the due date isn't shown to the learner.
52. The learner's level picker is gone; its level examples stay in `strings.ts` for M5's level lock.
53. A walkthrough ends with its 1 ★ celebration under the steps.

From M5 (details in `docs/milestones/M5-report.md` §3):
54. `?topic=&level=` links skip the first-run setup; their attempts are marked `fixed` and left out of the dashboard and review.
55. PIN reset: 21–99 × 11–19, a new one after a miss; no lockout after wrong PINs. The parent area re-locks after 10 min idle and on leaving; changing the PIN in Settings doesn't ask for the old one.
56. Names are 1–16 characters, blank → default; the turtle's name also shows in the hint panel.
57. "Add to queue" with nothing active makes it active.
58. Editing a started assignment: stored items stay in place with their topic; counts ≥ done; started items keep their level lock and can't be removed; new items append; the order is fixed.
59. Re-queued assignments lose their activation time; deleting keeps the answers; Mark complete shows no summary.
60. Dashboard: finished, non-fixed answers; time per question capped at 10 min; trend = clean % per day; hints by highest tier; Worth a look needs 6 answers per topic, the diagnostic rule looks back 7 × 24 h.
61. Missed rule uses `wrongTries`, or for older attempts the wrong answers (two EQ rejections = one).
62. Import brings the file's PIN and settings; a file without settings keeps this device's. The error list is exported and imported.
63. The reduce-motion setting ends CSS animations at once and uses the OS reduced-motion paths. Sound is stored for M6.
64. New tokens `--on-parent-nav`, `--on-parent-nav-muted`, `--parent-nav-active`.
65. Dashboard charts are hand-drawn SVG with hover titles; the numbers are also in text.

From the 2026-09-25 changes:
66. "Right" in adaptive free practice = correct on the first try with no hint (H1 counts as help). The level picker shows only levels inside the parent's range; Adaptive starts at 3 clamped to that range.
67. Older NC attempts that ticked Real show "real" in the missed-question replay.

From M6 (details in `docs/milestones/M6-report.md` §3):
68. Cosmetic thresholds 20, 50, 100, 175, 275, 400, 550, 750 lifetime shells, alternating turtle and penguin (`config.cosmetics`).
69. Shop names are plain text, no logos; prices whole numbers 1–100,000; a new price applies to new purchases only; cancel refunds exactly once.
70. Existing shells count as lifetime and spendable; cosmetics already reached are worn after the update without an announcement.
71. Items she can't afford show "n more shells to go" instead of Buy.
72. Sounds are synthesised Web Audio tones, not files.
73. axe runs with reduced motion emulated (final colours); dark mode tested via `data-theme="dark"`.
74. R-NF-1 measured on the local preview at 4× CPU throttling, in its own Playwright project after the others.
75. Shop pictures are scaled to fit 320 px and stored as data URLs in `Settings.shopItems[].image`; optional field, no schema bump.
76. Setting her shells by hand moves `Rewards.spent` (negative when shells are added), so cosmetics unlock only from shells earned. Balance 0–1,000,000; shells per answer 0–100 each.
77. Each attempt stores `shellsEarned`; the assignment summary sums it (older attempts count their stars). `Settings.shellsPerStars` is optional (default 3 / 2 / 1); no schema bump.

## 6. Spec conflicts found and how they were resolved

1. (M1) §7.4 rule order would make `x = 8` from `x/4 = 2` a CLEAR_FRACTIONS; §7.5 says SOLVE. Implemented §7.5: a `v = q` line is never CLEAR_FRACTIONS.
2. (M1) EQ-D9 "one side's Lin changed" enforced as exactly one side.
3. (M2) Mockup 05 shows constant tiles without `+`; R-EQ-TILE-1 has `+3`, `+23`. Followed the requirement.
4. (M2) design.md §6.2 ends Solve with a celebration; celebrations are M4. The substitution-check box stands in until then.
5. (M2) The hint note "Walkthrough = 1 star, and that's OK!" (design.md §5) is shown before stars exist (M4).
6. (M3) R-FDP-3 writes `33.3…%`; R-DISP-3 wants the block 3 times. The parent chose R-DISP-3 (`33.333…%`).
7. (M3) Mockup 02 shows 5 options in one row. Long repeating options (sevenths) don't fit, so those questions use two wide columns.
8. (M3) The PC-M2 line in design.md §9 ("What's the new price?") would mislead on a reverse question. There it reads "What was the price before?".
9. (M4) R-HELP-6 against a demotion triggered by the walkthrough and against mixed order. The parent decided: same topic and level next, demotion after (§4).
10. (M4) R-ADP-2 needs 5 attempts to promote; R-ADP-3 sets no minimum to demote. Implemented as written.
11. (M4) Mockup 09 always shows "Free practice ›"; with the `never` policy (R-SES-6) only "Home" is shown.
12. (M5) R-SES-6 default `afterAssignment`, design.md §7.1 and mockup 01 (locked tiles) vs the parent's `always` default. The parent decided (§4).
13. (M5) Requirements §9.1 lacks `Assignment.order` and `Attempt.fixed`; both are optional fields (v2, v3).
14. (M5) Mockup 11 has no editing state; the builder becomes "Edit assignment" from a queue card.
15. (2026-09-25) Requirements §6.1 lists six NC checkboxes including Real; mockup 04 shows six. The parent removed Real (§4).
16. (2026-09-25) Requirements §4.1 R-ADP-2/3 and M4 decision "no level picker on Home" vs the parent's free-practice picker and faster Adaptive rule (§4). Assignments are unchanged.
17. (M6) R-RWD-4 (accessories bought with shells) and R-RWD-6 (no loss of shells) vs the parent's model: real rewards cost shells to spend; cosmetics unlock from lifetime shells.
18. (M6) design.md §7 "accessory shop" vs a shop of real rewards; design.md §8 sound files vs synthesised tones.

## 7. Approved deviations and rules in force

**Deviations: none** since 2026-09-23. **Approved rules** (they override the spec): EQ-D4 detection (M1), the level-6 final-answer rule (2026-09-23), no Real checkbox (2026-09-25), and the free-practice level picker with its Adaptive rule (2026-09-25), all in §4. `CLAUDE.md` is out of date, and the parent asked for it to be left unchanged: it still lists the two M1 deviations as "in force until M2", and it points to `cc-develop-handoff.md` for the current milestone. **This file is the authority for status.**

## 8. Code map

```
src/engine/            pure TS (R-ARCH-1)
  rational.ts rng.ts config.ts (TopicId, TOPICS, adaptive start levels, rewards)
  adaptive.ts scoring.ts session.ts      R-ADP window; stars, streak, badges; builder draft + edit rules, order, seeds
  parent.ts review.ts                    PIN challenge, dashboard stats, Worth a look, missed rule; regenerate a question
  rewards.ts                             cosmetic unlocks, shells to spend, prices, wearing
  eq/parse.ts linear.ts stepChecker.ts format.ts evaluate.ts tiles.ts
  topics/eq/generator.ts hints.ts        (eqHint H1/H2, eqWalkthrough H3 + WalkOp)
  numbers/decimal.ts display.ts          long division, DecimalRep (R-RD-2/3); Shown: LaTeX + text + speech
  topics/content.ts mc.ts walk.ts        HintContent; option builder (R-ANS-3); NumWalkStep, miniQuestion
  topics/rd|fdp|pc/ generator distractors hints     multiple choice; nc/ generator checker hints
src/data/db.ts attempts.ts progress.ts   Dexie schema v3 + upgrades; attempt save; finishAttempt, Home, summary
  settings.ts assignments.ts stats.ts    settings + PIN hash; the queue; dashboard and missed loaders
  backup.ts errors.ts                    export / import / reset; the error list (R-NF-5)
  rewards.ts                             shop: buy, give, cancel, prices; wardrobe
src/ui/
  App.tsx settings.tsx                   routes: setup, Home, Session (assignment | free | fixed level), summary, parent; settings context
  screens/Setup.tsx Shop.tsx             first run: PIN, then naming; the shop
  wardrobe.tsx sound.ts                  what the mascots wear; synthesised sounds
  components/HomeExtras.tsx LevelExample.tsx   beach shells, dress up, badge shelf; level examples
  parent/ ParentArea PinPad Reorder Assignments Progress Missed RewardsPage SettingsPage DataPage   (parent.css)
  screens/Session.tsx                    chooses each question, mounts the practice screen, applies what it earns
  screens/Home.tsx AssignmentSummary.tsx EquationPractice.tsx TileEquation.tsx McPractice.tsx NcPractice.tsx
  practice/question.tsx                  QuestionProps, useReportAttempt, CelebrationSlot
  practice/help.ts practiceReducer.ts tileReducer.ts mcReducer.ts ncReducer.ts
  components/ Math(Tex) Keypad NumberPad TileBoard StepRail HintPanel Walkthrough(WalkShell) BalanceScale
              Numbers(MathHero McOption FeedbackToast) SetsMap NumberWalkthrough TopBar Celebration ErrorBoundary
  mascots/Turtle.tsx Penguin.tsx   hooks/useReducedMotion.ts
  strings.ts (numText, misconceptionLine, rewardStrings)  theme/tokens.css tokens.ts global.css
  ui.css tiles.css numbers.css rewards.css
tests/engine/*  tests/ui/*  tests/data/* Vitest + fast-check (+ fake-indexeddb)
e2e/a11y assignment equation free offline parent perf rewards sound tiles walkthrough topics + helpers.ts
                                         Playwright (desktop + tablet-touch; perf as its own project); zz-live, zz-screens on demand
scripts/check-size.mjs                   R-NF-2 bundle check, run by npm run build
```


## 9. Milestone report template (from the original handoff)

1. What was built, against requirement IDs. 2. Test results: counts, `src/engine` coverage, anything skipped and why. 3. Assumptions. 4. Conflicts between requirements, design and mockups. 5. Approved deviations still in force and which milestone removes each. 6. PowerShell commands to run it, and confirmation that the hosted URL was redeployed and still installs and works offline. 7. What to build next, and anything wrong with the plan.

## 10. Next: M7 editable shop catalogue (only after the parent says go)

Parent request (2026-09-25): more real rewards for the shop, beyond the two in M6. Notes for the plan:

- `Settings.shopItems` already holds `{ id, name, price }[]`; Parent › Rewards edits prices only. M7 adds add / rename / remove (removing an item with a pending request needs a rule).
- Redemptions copy name and price at purchase, so edits never rewrite history.
- Still parked while the app is used only in a desktop browser (§4): the compact tablet-portrait keypad and the M2 touch-drag check on the real tablet.

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
