# Turtle & Penguin Math — standing rules

Read `cc-develop-handoff.md` for the full brief and the current milestone (§3 status line). Milestone reports, including assumptions and spec conflicts already resolved, are in `docs/milestones/`. Precedence: `docs/requirements.md` > `docs/design.md` > mockups > handoff, except the approved deviations below.

## Public repo
This repo and its GitHub Pages site are public. Never commit names, ages, gender, locations or local user paths of the parent or the learner. Refer to "the parent" and "the learner".

## Ground rules
- Do not edit `docs/requirements.md` or `docs/design.md` without asking the parent.
- Ask, don't guess, for irreversible choices; small reversible ones go under "assumptions" in the milestone report.
- Never use floating point to decide correctness. Engine math is exact `Rational` (bigint) arithmetic (R-ARCH-2).
- Never invent math content. Every question comes from a seeded generator whose answer is verified independently in tests.
- `src/engine/**` is pure TypeScript: no React, no DOM, no Dexie (R-ARCH-1; enforced by ESLint).
- A milestone is not done while any test fails, is skipped, or was weakened.
- Small commits: one-line summary plus the relevant `R-…` IDs.

## Environment
- Windows 11 + PowerShell. Commands for the parent are PowerShell with Windows paths. npm scripts must be cross-platform.
- Node 24 LTS, npm. Deployed to GitHub Pages at `/math-app/` by `.github/workflows/deploy.yml` on push to `main`.

## Commands
- `npm run dev` — dev server
- `npm test` — Vitest (unit + property); `npm run coverage` for engine coverage (target ≥ 90%, R-ARCH-4)
- `npm run lint` — ESLint + Prettier check; `npm run format` to fix
- `npm run build` — typecheck + production build
- `npm run e2e` — Playwright against the production build (first run: `npx playwright install chromium`)

## Coding standards
- Components use only design tokens (`src/ui/theme/tokens.css` / `tokens.ts`). No raw hex in components.
- The engine never imports UI; the UI never re-implements math.
- Name things as the docs do (`SEPARATE`, `EQ-D4`, `cleanSolve`, `HintTier`).
- All learner-facing copy lives in `src/ui/strings.ts` (R-NF-4). The engine returns message ids + params; strings.ts renders them. No "wrong", no red, no timers (design.md §9).
- Accessibility from the first component: 48 px targets, visible focus rings, keyboard paths, `prefers-reduced-motion`.
- Mouse, touch and keyboard all work for every interaction (R-PLAT-5).
- No analytics, telemetry, external requests or accounts (R-DATA-3).

## Approved deviations (in force until M2)
1. EQ levels 1–2 use typed mode instead of the tile builder (R-ANS-5, R-EQ-TILE). M2 replaces this.
2. The H3 walkthrough UI is not shown; the hint drawer offers H1/H2 only. H3 content is built and tested in the engine. M2 adds the UI with the balance scale.

## Approved rule
EQ-D4: fires at the SEPARATE stage when N is separated and some term t of Terms(P) (signed, moved to the left) gives D(N) = ±(D(P) − 2t).
