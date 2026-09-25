# M6 report: polish, the rewards shop, cosmetics

Status: **done** (2026-09-25). Deployed to https://kristopherhuber-commits.github.io/math-app/; the live check passed after the deploy (setup, installable, an equation and a repeating-decimal question offline).

## 1. What was built

| Area | Files | Requirements |
|---|---|---|
| Two shell counts: lifetime shells (hidden; never go down) and shells to spend (Home, TopBar, shop) | `src/engine/rewards.ts`, `src/data/rewards.ts`, `src/data/progress.ts` | R-RWD-4 as reshaped by the parent |
| Cosmetics: hat, scarf, sunglasses and bow tie for each mascot, unlocked at 20, 50, 100, 175, 275, 400, 550 and 750 lifetime shells (alternating turtle and penguin), worn at once and announced ("New for Shelly: a hat!"); Dress up on Home to take off and put on | `config.ts` (`cosmetics`), `mascots/Turtle.tsx`, `Penguin.tsx`, `ui/wardrobe.tsx`, `components/HomeExtras.tsx`, `Celebration.tsx` | R-RWD-4, design.md §4.3 |
| Shop: Starbucks treat 150, Roblox gift card 2,000 Robux 1,500; "n more shells to go"; buy with a confirmation; requests "waiting for a grown-up" (shop and Home) | `screens/Shop.tsx`, `data/rewards.ts` | R-RWD-4 as reshaped |
| Parent › Rewards: requests to Mark given or Cancel and refund (asked first), history, shells to spend and lifetime, prices | `parent/RewardsPage.tsx` | R-PAR (new page) |
| Badge shelf on Home: earned badges, the rest greyed | `components/HomeExtras.tsx` | R-RWD-3, design.md §7 |
| Shells on the beach: shells to spend, up to 12 | `components/HomeExtras.tsx` | design.md §7.1 |
| Sounds: select, correct, stars, not quite, tile snap, level up, synthesised with Web Audio (no audio files), off with the setting | `ui/sound.ts` and the practice screens | design.md §8, R-PAR-5 |
| Motion audit: counter icon pulse (the number already rolled up), badges and new accessories pop in, panels rise in, press states; all off with reduced motion | `rewards.css` | design.md §2.4/§5, R-NF-3 |
| Accessibility: axe on every screen in light and dark, 48 × 48 target check; the segmented toggles grew to 48 px | `e2e/a11y.spec.ts`, `parent.css` | R-TEST-6 |
| Offline: reload offline, then complete a question and go on to the next | `e2e/offline.spec.ts` | R-TEST-7 |
| Performance: cold load and return to Home at 4× slower CPU; tap response; step checker budget; bundle budget in the build | `e2e/perf.spec.ts`, `tests/engine/performance.test.ts`, `scripts/check-size.mjs` | R-NF-1, R-NF-2 |

### Schema v4 (R-DATA-1)
- `Rewards.spent` (default 0). `Rewards.shells` stays the lifetime total; shells to spend = shells − spent. `Rewards.accessories` = worn items.
- New store `redemptions: 'id, status, requestedAt'` → `{ id, itemId, name, price, status, requestedAt, resolvedAt? }` (name and price copied at purchase).
- `Settings.shopItems` (default the two items).
- Upgrade v3 → v4: nothing spent, the cosmetics the lifetime shells already unlocked are worn, the default shop. Export files carry v4; import migrates v1 → v2 → v3 → v4. Reset also clears the requests.

## 2. Tests

- Unit and property (Vitest, fast-check): **594 passed, 0 skipped** (M5: 556).
  - `tests/engine/rewards.test.ts`: the unlock table, thresholds, `newlyUnlocked` across a jump (property: only grows, the new ones are the difference), shells to spend, prices, wearing.
  - `tests/data/rewards.test.ts`: v3 → v4 upgrade; v3 and v4 files; buy, short, two taps at once buy once; given; cancel refunds once; price changes apply to new purchases only; unlock on crossing 20, announced once; spending never re-locks; wearing.
  - `tests/engine/performance.test.ts`: every step of 150 walkthroughs (all six EQ levels), plus a wrong line per step, each under 20 ms.
  - The free-practice adaptive rule and the Real removal (2026-09-25) are in `adaptive.test.ts` and the NC tests.
- E2E (Playwright): **116 passed** on desktop, tablet-touch and the new `perf` project (M5: 86). New specs:
  - `rewards.spec.ts`: unlock → announced → worn → off, kept after reload; shop → confirm → waiting → the parent marks it given; cancel refunds; price validation and change.
  - `sound.spec.ts`: which sounds play; none with the setting off.
  - `a11y.spec.ts`: 14 screens × light/dark; targets.
  - `perf.spec.ts`: measured cold load **~510 ms**, Home again **~240 ms**, a tap selected in **~35 ms** (budgets 2 s, 2 s, 100 ms). It runs after the other projects so no other workers share the CPU; in a shared run it failed once.
  - `offline.spec.ts`: completes a question offline.
  - 12 on-demand specs skipped by default: `zz-live`, `zz-screens` (now also the M6 Home and shop).
- `src/engine` coverage: **97.3 % lines**, 90.6 % branches.
- Bundle: **244.5 KB gzipped JS** (budget 1 MB, now checked by `npm run build` and CI).

## 3. Assumptions (spec silent; small and reversible)

1. Unlock thresholds and order: see §1; in `config.cosmetics`.
2. Shop names are plain text ("Starbucks treat", "Roblox gift card, 2,000 Robux"); no logos. They live in `Settings.shopItems`, so M7 can edit them.
3. Sound stays on by default (the existing default).
4. Existing shells count as both lifetime and spendable (`spent = 0`); cosmetics already reached are worn after the update without an announcement.
5. Prices are whole numbers 1–100,000; a new price applies to new purchases only.
6. Cancelling a request refunds exactly what it cost; a request can be given or cancelled once.
7. The learner's shop doesn't disable items she can't afford: they show "n more shells to go" instead of a Buy button.
8. Sounds are synthesised tones (≤ 300 ms, low volume), not the OGG/MP3 files design.md §8 names: no files to license, cache or download.
9. Accessibility runs axe with reduced motion emulated, so contrast is measured on final colours rather than a frame of a fade-in. Dark mode is tested by setting `data-theme="dark"` (the switch itself is v1.1).
10. R-NF-1 "mid-range tablet over a local network" is approximated by the local preview server at 4× CPU throttling.
11. Accessory colours reuse art tokens (coral, star, penguin, pupil); no new tokens.

## 4. Conflicts found

1. R-RWD-4 (accessories bought with shells) and R-RWD-6 (no loss of shells) vs the parent's model: real rewards cost shells to spend; cosmetics unlock from lifetime shells, which never go down.
2. design.md §7 "accessory shop (a grid of accessory cards with shell prices)" vs a shop of real rewards.
3. design.md §8 names sound files; the sounds are synthesised (assumption 8).

## 5. Approved deviations still in force

None. Approved rules in force: EQ-D4 detection, the level-6 final-answer rule, no Real checkbox, and the free-practice level picker with its Adaptive rule (progress.md §4). `CLAUDE.md` is still out of date; `progress.md` is the authority.

## 6. Commands

```powershell
cd <path to your clone of math-app>
npm run dev        # http://localhost:5173/math-app/
npm test
npm run coverage
npm run lint
npm run build      # includes the R-NF-2 bundle check
npm run e2e        # desktop, tablet-touch, then the perf project
$env:LIVE_URL='https://kristopherhuber-commits.github.io/math-app/'; npx playwright test e2e/zz-live.spec.ts
$env:SHOTS="$env:TEMP\shots"; npx playwright test e2e/zz-screens.spec.ts
```

Live check (after the deploy): passed on desktop and tablet-touch.

## 7. Next, and concerns

- **M7 (parent's request):** an editable shop catalogue in the parent area (add, rename, remove items, beyond the two in M6).
- Still parked while the app is used only in a desktop browser: the compact tablet-portrait keypad for typed equations, and the M2 touch-drag check on the real tablet.
- Worth a look when trying M6: the unlock thresholds, the two prices, and how the accessories look on the mascots.
