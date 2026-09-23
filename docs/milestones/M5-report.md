# M5 report: parent area

Status: **done** (2026-09-23). Deployed to https://kristopherhuber-commits.github.io/math-app/; the live check passed after the deploy (first-run setup by keyboard, installable, an equation and a repeating-decimal question work offline).

## 1. What was built

| Area | Files | Requirements |
|---|---|---|
| First-run setup, required before Home: the parent sets a PIN (twice), then the learner names the turtle and the penguin | `src/ui/screens/Setup.tsx`, `src/ui/parent/PinPad.tsx` | R-PAR-1, R-RWD-7 |
| PIN stored as `sha256$<salt>$<hash>` (Web Crypto); settings over the config defaults; a settings context for every screen | `src/data/settings.ts`, `src/ui/settings.tsx` | R-DATA-2, R-PAR-5 |
| Parent area: small "Parent" link on Home, PIN pad (mouse, touch, digits + Backspace), "Forgot PIN?" multiplication challenge, nav rail, re-lock on leaving and after 10 min idle | `src/ui/parent/ParentArea.tsx`, `src/engine/parent.ts` | R-PAR-1 |
| Assignment builder and queue (mockup 11): title, items with count stepper, level-lock popover with level examples, remove, drag or ↑/↓ to reorder, order toggle, due date; Save & make active / Add to queue; queue with make active, mark complete, delete (each asked first), edit; recently done | `src/ui/parent/Assignments.tsx`, `Reorder.tsx`, `src/data/assignments.ts`, `src/engine/session.ts` (`cleanDraft`, `editAllowed`) | R-PAR-2, R-SES-1/2/4 |
| Progress dashboard (mockup 10): minutes per day for 30 days; per topic level pips, clean-solve %, 30-day trend, questions, average tries, time, hints by tier; Worth a look with links into Missed questions | `src/ui/parent/Progress.tsx`, `src/data/stats.ts`, `src/engine/parent.ts` | R-PAR-3 |
| Missed-question review: topic, date and diagnostic filters; the question regenerated from its seed with its answer; every try in order, rejected lines with their codes | `src/ui/parent/Missed.tsx`, `src/engine/review.ts` | R-PAR-4, R-ARCH-3 |
| Settings: free practice, default order, level range per topic, allow skipping, full balance animation, natural numbers include 0, currency, sound, reduce motion, character names, PIN | `src/ui/parent/SettingsPage.tsx` | R-PAR-5, R-ADP-5, R-EQ-CHK-3, R-EQ-PED-2 |
| Data: export to JSON, import (confirmation, version check, older files migrated), reset progress (confirmation); the error list | `src/ui/parent/DataPage.tsx`, `src/data/backup.ts` | R-PAR-6, R-DATA-1, R-NF-5 |
| Error log: uncaught errors, rejected promises, the error boundary and the storage catch sites write to the list (newest 200) | `src/data/errors.ts`, `src/main.tsx` | R-NF-5 |
| The `?assign=` link is removed (parent decision). `?topic=&level=` links stay and skip setup | `src/ui/App.tsx` | R-SES-1 |
| Free practice defaults to `always` (parent decision) | `src/engine/config.ts` | R-SES-6 |
| Typed EQ now reads `allowSkipping`; reduce motion also works from the setting (hook and CSS) | `practiceReducer.ts`, `useReducedMotion.ts`, `tokens.css` | R-EQ-CHK-3, R-NF-3 |

### Schema v3 (R-DATA-1)
- New store `errors: '++id, at'` (`{ at, where, message, stack? }`).
- New optional `Attempt.fixed` marks `?topic=&level=` questions, which the dashboard and review leave out. Older ones can't be told apart and are counted.
- Upgrade: `meta.schemaVersion = 3`; no data rewritten. Settings are unchanged (the salt lives in `pinHash`).
- Export files carry `schemaVersion: 3`. Import migrates v1 (via `upgradeAssignmentToV2`) and v2 (empty error list), refuses newer versions, and replaces everything in one transaction.

## 2. Tests

- Unit and property (Vitest, fast-check): **556 passed, 0 skipped** (M4: 489). New:
  - `tests/engine/parent.test.ts`: the PIN challenge (1000 seeds, answer checked by repeated addition); missed rule; stats (clean rate, tiers, average tries, the 10-minute cap, local days across month/leap-year ends, per-day minutes and trend); both Worth-a-look rules at and below threshold.
  - `tests/engine/review.test.ts`: every topic regenerates the same question from id, level and seed (300 runs each); unknown ids give null.
  - `tests/engine/session.test.ts`: `cleanDraft` (11 rejected drafts) and `editAllowed`.
  - `tests/data/`: v2 → v3 upgrade; settings and PIN hashing; the queue operations; dashboard and missed filters; export → import round trip, v1/v2 files, newer and malformed files, reset; the error list cap.
- E2E (Playwright, desktop and tablet-touch): **86 passed** (M4: 60). New `e2e/parent.spec.ts`:
  - **R-TEST-5**: open the parent area with the PIN, build EQ ×2 + PC ×1 locked at level 2 with a due date, Save & make active, back to the learner, Start: the first question is EQ at level 3.
  - First run (touch, mouse, keyboard), names on Home and in the hint panel; wrong PIN; PIN reset; auto-lock with a fake clock.
  - Queue: add, keyboard reorder, make active, mark complete, delete, edit; mouse-drag reorder.
  - Settings: free practice `afterAssignment` and `never` lock the tiles; level range; names; PIN change; reduce motion.
  - Dashboard numbers and Worth a look; missed review from the Worth-a-look link, replay with rejected lines and codes; export, reset, bad and newer files, import.
  - Existing specs: the link became a test helper that writes the assignment into IndexedDB (`e2e/helpers.ts`); the RD keyboard test now waits for the question before pressing keys (it failed about 1 in 50 runs).
  - 10 on-demand specs skipped by default: `zz-live`, and `zz-screens` (now also the parent screens).
- `src/engine` coverage: **97.2 % lines**, 89.9 % branches.
- Bundle: **244.3 KB gzipped JS** + 18.1 KB CSS (budget 1 MB).

## 3. Assumptions (spec silent; small and reversible)

1. `?topic=&level=` links skip the first-run setup (they are for the parent and tests).
2. PIN reset challenge: a number 21–99 times 11–19; a miss gives a new one. No lockout after wrong PINs (not a security boundary).
3. The parent area locks after 10 min without a pointer or key press, and on "Back to learner". Changing the PIN in Settings doesn't ask for the old one (the area is already unlocked).
4. Names: 1–16 characters, spaces collapsed, blank falls back to Shelly / Pip. The turtle's name also shows in the hint panel header (design.md §5 HintDrawer).
5. "Add to queue" with nothing active makes the new assignment active (as the M4 link did).
6. Editing a started assignment: stored items keep their place and topic; counts can't go below what's done; a started item keeps its level lock; new items are appended; the order is fixed. Unstarted assignments are fully editable. A started item can't be removed.
7. Re-queued assignments (Save & make active, Make active) lose their activation time, so the streak treats them as not active while they wait.
8. Deleting an assignment keeps its answers for the dashboard and review. Mark complete shows the learner no summary.
9. Dashboard counts finished, non-fixed attempts. Time per question = finish − start, capped at 10 min. Trend = clean-solve % per day (days without answers are gaps). "Hints used" counts questions by their highest tier.
10. Worth a look needs 6 answers in a topic before the walkthrough rule applies. The diagnostic rule counts rejected EQ lines with an `EQ-D…` code in the last 7 × 24 h.
11. Missed rule uses stored `wrongTries`; older attempts without it count wrong answers, with two EQ rejections as one.
12. Import replaces the PIN and settings with the file's; a file without settings keeps this device's. The error list is exported and imported too.
13. Reduce motion (setting) ends every CSS animation at once and uses the reduced-motion paths the OS setting uses.
14. Sound is stored; sounds arrive with M6.
15. New tokens for the parent nav text and selected item (`--on-parent-nav`, `--on-parent-nav-muted`, `--parent-nav-active`); design.md §2.1 names only `--parent-bg` / `--parent-nav`.
16. Dashboard charts are hand-drawn SVG (no chart library): hover titles per bar and point, the numbers also in text.

## 4. Conflicts found

1. R-SES-6 default `afterAssignment`, design.md §7.1 and mockup 01 (locked tiles) vs the parent's decision: default `always`.
2. Requirements §9.1: `Assignment` has no `order` and `Attempt` no `fixed`. Both added as optional fields (v2, v3).
3. Mockup 11 has no place for editing a queued assignment; the builder switches to "Edit assignment" when a queue card's Edit is used.

## 5. Approved deviations still in force

None. `CLAUDE.md` is still out of date (M1 deviations, handoff for status); `progress.md` is the authority.

## 6. Commands

```powershell
cd <path to your clone of math-app>
npm run dev        # http://localhost:5173/math-app/
npm test
npm run coverage
npm run lint
npm run build
npm run e2e
$env:LIVE_URL='https://kristopherhuber-commits.github.io/math-app/'; npx playwright test e2e/zz-live.spec.ts
$env:SHOTS="$env:TEMP\shots"; npx playwright test e2e/zz-screens.spec.ts   # screenshots, parent area included
```

Try it: open the app, set a PIN, name the friends, then **Parent** (bottom right of Home) to build an assignment.

Live check (after the deploy): passed on desktop and tablet-touch.

## 7. Next, and concerns

- Next: **M6, polish**: shells on the beach and accessories (R-RWD-4), sounds (the setting exists), animations, the axe pass (R-TEST-6), the offline test that completes a question (R-TEST-7), performance budgets (R-NF-1/2), the portrait keypad.
- Worth a look when trying M5: the queue card actions take room on a 1024 px screen; the dashboard's Worth-a-look thresholds.
- The installed app will show the first-run setup once after this update (no PIN yet). Progress is kept.
- Still open, parked while the app is used only in a desktop browser: the tablet-portrait keypad and the M2 touch-drag fix on the real tablet.
