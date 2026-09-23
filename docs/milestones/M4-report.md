# M4 report: sessions, adaptive levels, rewards

Status: **done** (2026-09-23). Deployed to https://kristopherhuber-commits.github.io/math-app/; see §6 for the live check.

## 1. What was built

| Area | Files | Requirements |
|---|---|---|
| Adaptive levels: clean-solve window of 5, promote at 4 clean with 5 attempts, demote at 3 that needed H3 or a second wrong try, reset on every change, parent bounds; start levels EQ 3, others 1 | `src/engine/adaptive.ts`, `config.ts` | R-ADP-1…5 |
| Stars from wrong tries and the highest hint; streak over local days, where days without an active assignment don't break it; streak milestones; the 12 badges | `src/engine/scoring.ts` | R-RWD-1, R-RWD-2, R-RWD-3, R-RWD-5 |
| Assignment link parser; grouped and seeded mixed order; question seeds from the assignment seed; the walkthrough rule | `src/engine/session.ts` | R-SES-1…5, R-HELP-6 |
| Dexie schema v2 with its upgrade | `src/data/db.ts` | R-DATA-1 |
| `finishAttempt`: in one transaction, stores the attempt and applies the adaptive level, shells, streak, badges, and the assignment's completion (which activates the next queued one). Runs once per attempt. Also assignment queue, progress, Home snapshot, summary | `src/data/progress.ts` | R-SES-2/3/5/7, R-ADP, R-RWD |
| Session screen: chooses each question (topic, level, seed), mounts the right practice screen (EQ tiles at L1–2, typed at L3+), applies what a solved question earns. The practice screens now answer one question and report back | `src/ui/screens/Session.tsx`, `practice/question.tsx`, the four practice screens | R-SES-3/5, R-ANS-5 |
| TopBar: "Question n of N", a progress track, star and shell counters | `src/ui/components/TopBar.tsx` | design.md §5 |
| Pip the penguin (idle, cheer, hop, slide, clap) | `src/ui/mascots/Penguin.tsx` | design.md §4.2, R-HELP-7 |
| Celebrations: 3 ★ (cheer and confetti), 2 ★ and 1 ★ (clap), "+n shells", "Level up!", new badges; the walkthrough ends with its 1 ★ celebration; full-screen streak milestone | `src/ui/components/Celebration.tsx` | R-RWD-5, R-ADP-6, R-HELP-6 |
| Home: streak and shells, today's assignment (Start › / Keep going ›), Pip and Shelly on the beach, free-practice tiles locked until the assignment is done | `src/ui/screens/Home.tsx` | R-SES-5/6, mockup 01 |
| Assignment summary: stars by topic as counts, badges, Pip | `src/ui/screens/AssignmentSummary.tsx` | R-SES-7, mockup 09 |
| Routing: Home, session (assignment, free, fixed level), summary; `?assign=` link | `src/ui/App.tsx` | R-SES-1 |
| Copy and styles | `src/ui/strings.ts` (`rewardStrings`), `src/ui/rewards.css` | R-NF-4, R-NF-3 |

### Schema v2 (R-DATA-1)
Only new optional fields; stores and indexes are unchanged.
- `Attempt`:
  - `wrongTries`: for stars and R-ADP-3, and the dashboard's average tries in M5.
  - `itemIndex`: two items may share a topic.
  - `countedAt`: makes `finishAttempt` run only once.
- `Assignment`:
  - `activatedAt`: which days had an active assignment (R-RWD-2).
  - `seed`: the mixed order and every question, so a reload resumes the same question.
  - `order`: grouped or mixed, fixed per assignment. Mockup 11 has the toggle in the builder.
- Upgrade:
  - an active or done assignment gets `activatedAt = createdAt`;
  - every assignment gets a seed;
  - `meta.schemaVersion = 2`.
- `upgradeAssignmentToV2` is exported for M5's import of older export files.

### Creating an assignment until M5
Open the app with a link like:

```
https://kristopherhuber-commits.github.io/math-app/?assign=EQ:10,PC:5@2&order=mixed&title=Monday&due=2026-09-30
```

- `TOPIC:count`, optionally `@level` to lock the level.
- Topics: `NC`, `RD`, `FDP`, `PC`, `EQ`.
- `order` is `grouped` (default) or `mixed`.
- `title`, `due` and `seed` are optional.

The link queues the assignment, active at once if no other is. The query is then removed, so a reload doesn't add it twice. A link that can't be read adds nothing, and Home says so.

## 2. Tests

- Unit and property tests (Vitest, fast-check): **489 passed, 0 skipped** (M3: 377).
  - **R-TEST-4** `tests/engine/adaptive.test.ts`, 17 table rows:
    - promote at 4/5 and 5/5; none at 4/4 or 3/5;
    - sliding window;
    - demote at 3 bad in 5, and after only 3 attempts;
    - floors and ceilings; bounds (R-ADP-5);
    - window reset after each change; promote back after a demotion.
    - Plus clamping when the bounds move, `summarize`, start levels, and a 1000-run property: the level stays in bounds and the window never exceeds 5.
  - R-RWD-1: the full 4 × 4 star table (wrong tries × hint tier), never 0.
  - R-RWD-2: a streak table:
    - first day, same day, next day;
    - a missed assignment day;
    - free days;
    - a gap partly covered by an assignment;
    - a clock set back;
    - month, year and leap-year boundaries;
    - `currentStreak`, and the milestones.
  - R-RWD-3: each badge when earned, never twice.
  - Session: link parsing (13 rejected forms), grouped order, mixed order (a property: exactly each item's count for any seed), the walkthrough rule, resume.
  - Data (fake IndexedDB):
    - the v1 → v2 upgrade;
    - `finishAttempt` once only; promotion, demotion, and levels left alone;
    - completion activates the next queued assignment;
    - the summary; the streak across days.
  - Reducers: stars and wrong tries stored on solve.
- E2E (Playwright, desktop and tablet-touch): **60 passed** (M3: 50). New `e2e/assignment.spec.ts`:
  - an assignment from the link through PC, RD and a typed EQ to its summary, by mouse or touch. It checks the celebrations, counters, stars by topic, badges, no `%`, and free practice opening.
  - leaving mid-question, reloading, and Keep going resumes at the same question;
  - 5 clean answers show "Level up!" and the next question is level 2;
  - keyboard only;
  - an unreadable link.

  Existing specs updated: the celebration replaces "Yes! That's it.". The three "Home level picker" tests became topic-tile tests:
  - EQ opens at level 3;
  - a stored EQ level 2 opens the tile builder;
  - with no assignment, a tile opens free practice.

  8 on-demand specs skipped by default: `zz-live`, and `zz-screens`, which now also shoots Home with an assignment, each celebration and the summary.
- `src/engine` coverage: **97.1 % lines**, 89.6 % branches (R-ARCH-4 target ≥ 90 %).
- Bundle: **229.7 KB gzipped JS** + 15.7 KB CSS (budget 1 MB, R-NF-2).

## 3. Assumptions (spec silent; small and reversible)

1. "10 EQ questions without H3" means 10 in a row; one walkthrough resets the run.
2. "First delayed repeating decimal": a solved RD question whose decimal has a delayed repeat. That is D→F shape `delayed`, or F→D over 6, 12, 15 or 22.
3. Demotion can fire before 5 attempts (3 bad out of 3–5). Promotion needs 5 (R-ADP-2 says so; R-ADP-3 doesn't).
4. Level-locked items and `?topic=&level=` links don't move adaptive levels. Links also earn no shells, streak or badges (they are for the parent and tests), but they show the celebration without "+n shells".
5. Free practice earns stars, shells and badges and moves levels, but doesn't count toward the streak (R-RWD-2 default).
6. Resuming mid-question restarts the same question (same seed and level). The unfinished attempt stays stored and doesn't count.
7. Mixed order is a seeded pick weighted by each item's remaining count.
8. Shells = stars earned, from M4. The shells on the beach and the accessories stay in M6 (R-RWD-4).
9. Streak milestones (full-screen): 3, 5, 7, 10, 14, 21, 30, then every 10. Home shows the current streak: 0 once a day with an active assignment passed without an answer.
10. The TopBar star counter shows stars in this assignment (or this free-practice session); the shell counter shows the total. "Question n of N" counts within the item when grouped (mockup 08), and within the whole assignment when mixed.
11. The free-practice policy is read from Dexie, default `afterAssignment` (toggle in M5). With no active assignment, free practice is open. "Free practice ›" on the summary goes to Home with the first tile focused.
12. No sounds in M4 (design.md §8 is optional).
13. Home's Pip line: the next unfinished item's topic, else the streak, else an invitation. The due date isn't shown to the learner.
14. The home-screen level picker is gone for the learner (parent decision). Its level examples stay in `strings.ts` for M5's level-lock popover.
15. Walkthroughs end with their 1 ★ celebration under the steps (R-HELP-6).

## 4. Conflicts found

1. R-HELP-6 (after a walkthrough, same topic and level) against R-ADP-3 (that walkthrough may trigger a demotion) and R-SES-4 mixed order. **Parent's decision:** the next question stays at the same topic and level, and the demotion applies from the question after. Mixed order pulls that topic forward; if its item is finished, the assignment moves on.
2. R-ADP-2 needs 5 attempts to promote; R-ADP-3 sets no minimum to demote. Implemented as written (assumption 3).
3. Mockup 09 shows "Free practice ›" and "Home"; R-SES-6 can keep free practice closed (`never`). "Free practice ›" appears only when free practice is open.

## 5. Approved deviations still in force

None. `CLAUDE.md` is still out of date (it lists the M1 deviations and points to the handoff for status). The parent asked that it stay unchanged, and `progress.md` is the authority.

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
$env:SHOTS="$env:TEMP\shots"; npx playwright test e2e/zz-screens.spec.ts   # screenshots of every screen
```

Try it:
- Assignment: `http://localhost:5173/math-app/?assign=EQ:3,PC:2,RD:2&title=Try%20it`
- Mixed order: add `&order=mixed`.
- A fixed level for checking a topic, as before: `?topic=RD&level=3`.

## 7. Next, and concerns

- Next: **M5, the parent area.**
  - PIN and reset, first-run naming.
  - The assignment builder, which replaces the link.
  - Dashboard, missed-question review.
  - Settings: free-practice policy, order, level bounds, reduce motion and the rest.
  - Export / import with the v1 → v2 migration; reset; the error list.
- Worth a look when trying M4:
  - Whether EQ starting at level 3 fits. A learner who struggles is moved down to the tile builder after 3 hard questions, silently.
  - Whether the celebration's size and the 1.2 s timing feel right on the desktop.
- Still open, parked while the app is used only in a desktop browser: the tablet-portrait keypad (M6) and the M2 touch-drag fix on the real tablet.
