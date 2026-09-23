# M2 report: tile builder, balance scale, walkthrough

Status: **done** (2026-09-23). Both M1 deviations are removed. Deployed to https://kristopherhuber-commits.github.io/math-app/ by the push that carries this report.

## 1. What was built

| Area | Files | Requirements |
|---|---|---|
| Tile model: tiles, crossing, sign choice, swap, "So far" line, balance view, Simplify/Solve plan | `src/engine/eq/tiles.ts` | R-EQ-TILE-1…5, R-EQ-PED-1 |
| Walkthrough from the learner's last line, with a both-sides op per step | `src/engine/topics/eq/hints.ts` (`eqWalkthrough(from, v, original)`, `WalkOp`, `walkOpText`) | R-HELP-4, §7.6, R-EQ-PED-1 |
| Shared hint-ladder and walkthrough state | `src/ui/practice/help.ts` (used by `practiceReducer.ts` and `tileReducer.ts`) | R-HELP-1…6 |
| Tile practice state, every move / sign / swap / pad entry recorded | `src/ui/practice/tileReducer.ts` | R-EQ-TILE, R-SES-5, R-PAR-4 (data) |
| Tile screen: StepRail, DropZones with swap, TermTiles, SignPicker, number pad, balance explainer | `src/ui/screens/TileEquation.tsx`, `src/ui/components/{TileBoard,NumberPad,StepRail}.tsx` | R-EQ-TILE-1…6, design.md §5/§6.2, mockup 05 |
| Drag by pointer events (6 px threshold, snap to the nearer side) and by keyboard (Tab, Enter, ←/→, Enter, Esc) | `TileBoard.tsx` | R-EQ-TILE-6, R-PLAT-5 |
| BalanceScale: full (~1.4 s), short (400 ms) after 10 correct signs, two still frames under reduced motion | `src/ui/components/BalanceScale.tsx`, `src/ui/hooks/useReducedMotion.ts`, `src/data/attempts.ts` | R-EQ-PED-1/2, R-NF-3 |
| H3 walkthrough UI (typed and tiles), "Show me step by step", "Hint n of 3" | `src/ui/components/{Walkthrough,HintPanel}.tsx` | R-HELP-4/6, design.md §5, mockup 07 |
| Shelly the turtle (idle, wave, think, point, nod) | `src/ui/mascots/Turtle.tsx`, art tokens in `tokens.css`/`tokens.ts` | R-HELP-7, design.md §4.1 |
| Routing: levels 1–2 → tiles, 3–6 → typed | `src/ui/App.tsx` | R-ANS-5 |
| Copy | `src/ui/strings.ts` | R-NF-4 |

## 2. Tests

- Unit + property (Vitest, fast-check): **237 passed, 0 skipped** (M1: 195). New: tile model (1000 seeds × L1–2 × both orientations, every board line accepted by `checkStep`, wrong signs refused, answer = generator solution), walkthrough from every mid-solution line (replayed through the checker), every walkthrough op applied to both sides gives the next line (1000 seeds × 6 levels), tile reducer (300-seed end-to-end property plus §7.5 examples), shared help state.
- E2E (Playwright, desktop + tablet-touch): **30 passed**. New: `e2e/tiles.spec.ts` (levels 1 and 2 by mouse and by real touch events, keyboard only, wrong sign → balance explanation stored as EQ-D4, level picker → tiles, reduced motion) and `e2e/walkthrough.spec.ts` (typed and tiles, H1 → H2 → H3 → done → next question). 4 on-demand specs skipped by default, as in M1: `zz-live` and `zz-screens` (set `LIVE_URL` / `SHOTS`).
- `src/engine` coverage: **95.1 % lines**, 95 % branches (R-ARCH-4 target ≥ 90 %).
- Bundle: 202.5 KB gzipped JS + 12.6 KB CSS (budget 1 MB, R-NF-2).

## 3. Assumptions (spec silent; small and reversible)

1. Tile faces follow R-EQ-TILE-1 (`3a`, `+3`, `a`, `+23`): constants show `+`, variables don't.
2. A crossing tile lands at the end of its new side; "So far" lists tiles that stayed, then arrivals in crossing order.
3. Swap is possible only before the first tile crosses. Only one tile can wait for its sign at a time.
4. Dragging a tile that is already on its side returns it with a gentle note (recorded as `TILE-ALREADY-PLACED`, not counted as a rejection).
5. Wrong sign: turtle + "Take *a* away from BOTH sides" + one balance frame with the operation on both pans (the result is not shown). Correct sign: the balance animation plays.
6. Simplify asks for the unknowns first, then the knowns; a side with one tile is skipped. When the combined coefficient is 1, Simplify solves it (R-EQ-CHK-4) and there is no Solve phase. The Simplify prompt appears without a tap on the group (the group is highlighted).
7. Wrong numbers reuse the typed diagnostics: EQ-D7 in Simplify, EQ-D8 for the answer; a wrong divisor gets its own line (`TILE-DIVISOR`).
8. Records (`TryRecord.stepType`): `MOVE`, `SIGN`, `SWAP`, `SEPARATE`/`SIMPLIFY`/`SOLVE` (accepted lines and pad entries), `WALKTHROUGH` (answer = the line it started from). `Attempt.params.mode` is `'tiles'` or `'typed'`.
9. The walkthrough shows no inline mini-questions for EQ (R-HELP-4 says "some steps"; its examples are RD). Walkthrough steps with no both-sides operation (Expand, Simplify) show the pans before and after; the check step shows both substituted sides.
10. "Show me step by step" is available at H1 and H2. A wrong try at H2 makes it pulse; it never starts by itself. Once started, the walkthrough cannot be left except by finishing (Back steps back).
11. `Settings.fullBalanceAnim` default is `false` (= shorten after 10), in `config.eq.fullBalanceAnimDefault`; the parent toggle arrives in M5.
12. The solved state keeps M1's substitution-check box; the celebration is M4.

## 4. Conflicts found

1. Mockup 05 shows constant tiles as `23`, `−3`; R-EQ-TILE-1 writes `+3`, `+23`. Implemented the requirement.
2. design.md §6.2 ends Solve with "→ Celebration"; celebrations are M4 (requirements §12). The solved box shows the substitution check until then.
3. design.md §5 hint drawer note "Walkthrough = 1 star, and that's OK!" is shown although stars arrive in M4.

## 5. Approved deviations still in force

None. Both M1 deviations (typed mode at L1–2; no H3 UI) are removed. `CLAUDE.md` still lists them: the parent asked that `CLAUDE.md` not be edited this session, so `progress.md` records the change.

## 6. Commands

```powershell
cd <path to your clone of math-app>
npm run dev        # http://localhost:5173/math-app/  (levels 1–2 open the tile builder)
npm test
npm run coverage
npm run lint
npm run build
npm run e2e
$env:LIVE_URL='https://kristopherhuber-commits.github.io/math-app/'; npx playwright test e2e/zz-live.spec.ts
```

## 7. Next, and concerns

- Next: M3 (number topics), when the parent says go.
- Found and fixed: after a fast touch drag, Chrome swallowed the next tap (on `+`/`−`) as a fling stop, even with `touch-action: none`. The board now cancels `touchmove` on tiles. Worth confirming on the real tablet.
- The typed-mode tablet-portrait keypad issue from M1 is still open.
