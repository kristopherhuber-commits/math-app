# Claude Code Development Handoff — Turtle & Penguin Math

**You are Claude Code, working in this repository. This file is your prompt. Read it fully, then follow it.**

This is a math practice web app being built for one child ("the learner"). The parent is the product owner and is technical (strong math background, codes in Python, uses VS Code), so technical explanations can be direct. **This repo is public:** never commit names, ages, locations or other personal details of the parent or the learner. The app's job is to teach *process*, not just check answers, so the math logic matters more than the UI polish.

---

## 0. Read these first, in this order

1. `docs/requirements.md`: the product spec. **This is the contract.** Requirement IDs (`R-…`) are stable; cite them in commits and PRs.
2. `docs/design.md`: visual design (tokens, components, screens, interaction flows, copy and accessibility).
3. `docs/design/mockups/*.png`: 12 annotated screen mockups (SVG sources beside them). Purple numbered circles are **annotations, not UI**; `docs/design.md` §7 explains each one.
4. `math-app-description.md`: the parent's original brief, for context on intent.

There is also a published design system artifact (tokens, brand book, character art) that mirrors `docs/design.md`. You do not need it; the repo docs are self-contained.

**Precedence:** `requirements.md` > `design.md` > mockups > this file, **except** for the deviations the parent approved in §3 (M1), which override the spec until the milestone named there. If you find any other conflict, do not silently pick one. Note it, implement the higher-precedence source, and list the conflict in your report.

---

## 1. Ground rules

- **Do not edit `docs/requirements.md` or `docs/design.md`** without asking the parent first. If you believe a requirement is wrong or impossible, stop and say so with your reasoning.
- **Ask, don't guess.** If a behaviour is genuinely unspecified and the choice is not reversible in five minutes, ask. If it is a small reversible choice, pick the simplest option, implement it, and list it under "assumptions" in your report.
- **Never use floating point to decide correctness.** All question math is exact rational arithmetic (R-ARCH-2). `0.1 + 0.2 !== 0.3` must never be able to mark a child wrong.
- **Never invent math content.** Every question comes from a generator whose answer is computed and independently verified in tests. No hard-coded question banks, no LLM-generated problems at runtime (the app is offline and has no network at runtime, R-PLAT-3).
- **The engine is pure.** `src/engine/**` imports no React and touches no DOM (R-ARCH-1). It is testable in isolation, and that is the point.
- **Tests are part of "done".** A milestone is not complete while any test fails, is skipped, or was weakened to pass.
- **Work in small commits** with a one-line summary and the relevant `R-…` IDs. Push to the GitHub remote at the end of each working session.

---

## 2. Environment, stack and setup

### 2.1 Development machine
- **Windows 11, PowerShell.** Write every command the parent is meant to run as PowerShell, with Windows paths. Do not assume POSIX tools. npm scripts must work under PowerShell (no `rm -rf`, no `VAR=x cmd`; use cross-platform packages or Node scripts where needed).
- **Node:** Node 24 LTS (installed with `winget install OpenJS.NodeJS.LTS`). A new shell may need its PATH refreshed before `node` resolves.
- **Git:** the repo is initialised on `main`. M0 adds a `.gitignore` (node_modules, dist, coverage, Playwright reports) and creates a **public GitHub repo** under the parent's account with `gh repo create --public` (check `gh --help` for exact flags).

### 2.2 Stack (fixed)
- TypeScript + React + **Vite**, built as an installable **PWA** that works fully offline (`vite-plugin-pwa` is fine).
- **KaTeX**, bundled with its fonts. No runtime CDN calls at all. Self-host **Nunito** (OFL, variable, weights 600–900) under `public/fonts/`; the font files are committed to the repo, not fetched at runtime.
- **Dexie** over IndexedDB for persistence, with a versioned schema (R-DATA-1).
- **Vitest** for unit tests, **fast-check** for property tests, **Playwright** for end-to-end.
- ESLint + Prettier, strict TypeScript (`"strict": true`, `noUncheckedIndexedAccess` on).
- Node LTS, `npm`.
- Target browsers: current Chrome, Edge, Firefox, Safari; iPad Safari and Android Chrome tablets (R-PLAT-2).

Repository layout: follow the tree in `docs/requirements.md` §2.1. Don't reorganize it without saying why.

### 2.3 Hosting and install
- The build output is **static files only**: no server-side code, no API.
- Service workers and PWA install need a secure context (HTTPS, or `localhost`). **`file://` is not supported**, and **`vite preview` over the LAN (`http://192.168.x.x`) will not register the service worker**. So a tablet cannot install or run offline from a LAN dev server.
- Deploy to **GitHub Pages** from the public repo, using a GitHub Actions workflow on push to `main` (the parent's decision; free GitHub accounts can publish Pages only from public repos).
- Set Vite's `base` and the PWA manifest `scope`/`start_url` to match the host's URL path.
- After the first online load, the app must work fully offline (R-PLAT-3).

---

## 3. Build order: milestones, with stop points

`docs/requirements.md` §12 defines the milestones. **Do M0 and M1, then stop and hand back to the parent.** The learner will try the equation flow before anything else is built on top of it.

### M0: Scaffold
- `.gitignore`, public GitHub remote (§2.1).
- Vite + React + TS + PWA, ESLint/Prettier, Vitest, Playwright, Dexie, the folder layout of requirements §2.1.
- Tokens: `src/ui/theme/tokens.css` (custom properties) + typed `tokens.ts` from `docs/design.md` §2. Define both light and dark values; a dark-mode UI switch is SHOULD, v1.1 (design.md §2.1), not M0.
- Deployment to GitHub Pages (§2.3).
- A `CLAUDE.md` at the repo root holding the standing rules from §1, §2.1 and §5 of this file, so future sessions inherit them.

**Done when:** `npm run dev`, `npm test`, `npm run lint` and `npm run build` all pass, and the **hosted** URL loads, installs as an app, and reloads offline in desktop Chrome or Edge.

### M1: Engine + equations, end to end (typed mode)
The heart of the app.

**Engine (as specified; no deviations):**
- `rational.ts`, `rng.ts` (seeded, reproducible), `config.ts` (every tunable constant from the spec's *(default)* markers).
- Equation parser → linear form → **step checker** (requirements §7.4), with every diagnostic `EQ-D1`…`EQ-D11`.
- EQ generators for levels 1–6 with the `R-EQ-GEN` invariants.
- EQ hint content H1/H2/H3 (requirements §7.6), including the H3 walkthrough steps and the closing substitution check. Build and test all three tiers in the engine, even though the M1 UI shows only H1/H2.

**UI:**
- **Home:** minimal, with a **level picker (EQ levels 1–6)**. Adaptive levels come in M4.
- **Equation practice in typed-step mode at every level, 1–6:** math keypad (R-EQ-TYPE), step lines, step feedback with the diagnostic messages, and the hint drawer showing **H1 and H2**.
- **Persistence:** save every attempt to Dexie using the schema-v1 `Attempt` and `TryRecord` shapes (requirements §9.1), including every rejected line with its diagnostic code (R-PAR-4 needs this later). Save after every step (R-SES-5). Store the seed and generator params (R-ARCH-3).

**Deviations the parent approved for M1** (record them in `CLAUDE.md` and in the report):
1. EQ levels 1–2 use **typed mode** temporarily, contrary to R-ANS-5 / R-EQ-TILE. The M2 tile builder replaces typed mode at those levels.
2. The **H3 walkthrough UI is deferred to M2**, because it is specified on the balance scale (requirements §7.6). The H1/H2 drawer does not offer "Show me step by step" until then.

**Explicitly out of M1:** stars and the penguin celebration, turtle art, adaptive levels, assignments, the parent area.

**Done when:** every acceptance example in requirements §7.5 passes as a named test, every diagnostic has ≥ 2 positive and ≥ 2 negative tests (R-TEST-3), property tests are green for all six levels, attempts show up in IndexedDB, and a person can solve equations end to end in the browser on a laptop and, from the hosted URL, on a tablet.
**Then stop.** Report as in §6.

### M2–M6 (only after the parent says go)
M2: tile builder, balance scale, H3 walkthrough UI (undoes both M1 deviations) · M3: the four number topics · M4: sessions, adaptive levels, rewards · M5: parent area · M6: polish, a11y, offline and performance budgets. Each has its "done when" in requirements §12.

---

## 4. The things most likely to go wrong

These are the places where a plausible-looking implementation would teach the child something false.

### 4.1 The step checker (M1; requirements §7.4–7.5)
Classify each submitted line against the previous accepted line. Use the definitions in the spec exactly:

- `Lin(E) = (α, β)` is the linear form `α·v + β`; `D(P) = Lin(L) − Lin(R)`; `Terms(P)` is the multiset of signed, *uncombined* terms with everything moved to the left.
- **SEPARATE** requires the separated *form* (only variable terms on one side, only constants on the other) **and** `D(N) = ±D(P)`. Orientation is free: for `3a + 3 = a + 23`, both `3a − a = 23 − 3` and `a − 3a = 3 − 23` are correct.
- **Partial combining is accepted** (`3a − a = 20`), but a fully skipped step (`2a = 20` straight from the given line) is refused while `allowSkipping` is off (R-EQ-CHK-3), with praise, not a scold.
- **SOLVE** must be in lowest terms; `x = 14/6` gets "Right value! Can you simplify 14/6?" and inexact decimals are refused (R-EQ-CHK-5, R-EQ-CHK-6). In the SOLVE row the spec uses `q` twice (the value, and the fraction's denominator); read it as: the value is q = d/c, written as an integer or as a reduced improper fraction.
- **Diagnostic priority is table order, not numeric order:** `EQ-D11` is checked before `EQ-D10`.
- `EQ-D4` (one term's sign didn't flip) is the single most important message in the app. The spec's condition is: separated form holds, and flipping exactly one term's sign makes the multiset equal ±Terms(P) "after N's own partial combining is undone, where possible". **That last clause is underspecified.** For example, `3a − a = 20` can't be uncombined uniquely. **Approved rule (parent's decision):** EQ-D4 fires when N is in separated form and there is a term t of Terms(P) (signed, as moved to the left) such that D(N) = ±(D(P) − 2t), i.e. the line balances with the previous one if exactly one term's sign is flipped. This covers every §7.5 case and also catches sign slips hidden by combining (from `3a + 3 = a + 23`, `3a − a = 26` → "look at the 3"). Apply it only at the SEPARATE stage. When several terms qualify, name a term that crossed the `=`.

Write the checker test file **before or alongside** the implementation, straight from the §7.5 table. Don't relax a case to make code pass.

### 4.2 The generators
Every generator takes a seed and returns the question, the exact answer and the data the hints need. Property tests (≥ 1000 seeds per level) must assert:
- the answer is correct **by an independent route** (EQ: substitute the solution into the original equation);
- every `R-EQ-GEN` invariant holds;
- the same seed reproduces the same question.

EQ worked examples that must hold: `7 − 3z = 13 → z = −2` · `3a + 3 = a + 23 → a = 10` · `2(m − 3) = −(m + 12) → m = −2` · `4(w + 1) = 7w + 9 → w = −5/3`.

### 4.3 Display of numbers (M1 subset)
True minus sign `−` (U+2212), never a hyphen (R-DISP-1). Stacked fractions (R-DISP-2). Variables italic, digits upright, letters only from the R-DISP-6 set.

### 4.4 Notes for M3 (don't build yet)
- Multiple-choice generators also return five options with misconception codes. Property tests add: five distinct options, exactly one correct, and **no distractor equal in value to the correct answer** (R-ANS-3). Offering `420/99` as "wrong" when `140/33` is right would be a lie.
- Independent checks: evaluate a repeating decimal's digits and compare against the fraction.
- Worked examples: `4.2424… = 140/33` · `0.41666… = 5/12` · `2.31818… = 51/22` · `$50 up 20% then down 20% = $48.00` · `$60 after 25% off → original $80.00`.
- Display: repeating decimals show the block at least three times before the ellipsis, with the caption naming the block, and bar notation from the levels where the spec introduces it (R-DISP-3). Money always has two decimals (R-DISP-5). An irrational patterned decimal always carries its rule as a caption (R-DISP-4). Without the caption, the display is mathematically ambiguous.

---

## 5. Coding standards

- Tokens first (§3, M0). Components use **only** tokens. No raw hex in components.
- No component reaches into another's internals; the engine never imports UI; the UI never re-implements math.
- Name things as the docs name them (`SEPARATE`, `EQ-D4`, `cleanSolve`, `HintTier`), so the code and the spec can be read side by side.
- All learner-facing copy goes in `src/ui/strings.ts` (R-NF-4). Tone rules are in `design.md` §9: no "wrong", no red, no timers.
- Accessibility is not a later pass: 48 px targets, visible focus rings, keyboard paths (`Enter`, `H`, `Esc` in M1; `1–5` and `Space` arrive with M3), and `prefers-reduced-motion` respected from the first component.
- Every interaction that works with a mouse must also work with touch and with a keyboard (R-PLAT-5). The tile drag in M2 is the hard case; it is specified in `design.md` §6.2.
- No analytics, no telemetry, no external requests, no accounts. The child's data stays on the device (R-DATA-3).

---

## 6. When you finish a milestone, report

1. What you built, against requirement IDs.
2. Test results: counts, coverage of `src/engine` (target ≥ 90%, R-ARCH-4), and anything skipped (with why).
3. Assumptions you made where the spec was silent.
4. Conflicts found between `requirements.md`, `design.md` and the mockups.
5. Approved deviations still in force (the M1 list in §3), and which milestone removes each one.
6. Exact PowerShell commands to run it locally, the hosted URL, and how to install it from that URL on an iPad (Safari → Share → Add to Home Screen) and on an Android tablet (Chrome → Install app).
7. What you would build next, and anything you think is wrong with the plan.

---

## 7. Start here

1. Read the four documents in §0.
2. **Enter plan mode** and produce a plan for M0 + M1: files, order, test strategy, and any open questions for the parent.
3. Get the plan approved before writing code.
4. Build M0, then M1. Stop at the end of M1 and report as in §6.
