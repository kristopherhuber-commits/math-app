# Requirements — Turtle & Penguin Math (working title)

| | |
|---|---|
| Status | v1 spec, ready for design and implementation |
| Owner | The parent (product owner) |
| Learner | One child |
| Companion doc | `docs/design.md` (visual design, screens, mockups in `docs/design/`) |
| Last updated | 2026-09-21 |

Requirement IDs (`R-…`) are stable. Reference them in commits, tests and PRs. **MUST** / **SHOULD** / **MAY** follow RFC 2119. Any value marked *(default)* is a tunable constant; keep it in `src/engine/config.ts`, not scattered through the code.

---

## 1. Purpose

A practice app that asks the learner questions on five topics, checks their answers, and when they are stuck walks them through the solution. The core teaching goal is **process, not answers**. The clearest case is algebra: the learner must show the steps of the "knowns on one side, unknowns on the other → simplify → solve" method, and each step is checked.

### 1.1 Topics

| ID | Topic | Summary |
|---|---|---|
| NC | Number classification | Decide which sets a number belongs to: natural, whole, integer, rational, irrational, real |
| RD | Repeating decimals | Repeating decimal ↔ fraction (x-method), and fraction → repeating decimal |
| FDP | Fraction ↔ decimal ↔ percent | Convert among the three forms |
| PC | Percent change (prices) | New price after an increase or decrease, successive changes, recovering the original price |
| EQ | Linear equations, one variable | Solve for the variable, showing the steps |

### 1.2 Out of scope for v1

Cloud sync, multiple learner profiles, text-to-speech, handwriting input, roots and powers, π/e/√ numbers, complex numbers, non-linear equations, systems of equations, word problems other than price change.

---

## 2. Platform and architecture

- **R-PLAT-1** The app MUST be a Progressive Web App built with **TypeScript + React + Vite**.
- **R-PLAT-2** It MUST run in current Chrome, Edge, Firefox and Safari (desktop), and on iPad Safari and Android Chrome tablets.
- **R-PLAT-3** It MUST be installable (web app manifest + service worker) and fully functional **offline** after the first load. There are no network calls at runtime: no analytics, no fonts from a CDN at runtime (self-host them), no accounts.
- **R-PLAT-4** Layout targets are desktop ≥ 1280×720, tablet landscape 1024×768, and tablet portrait 768×1024. Phone widths MAY degrade gracefully but are not a target.
- **R-PLAT-5** Input methods are mouse + keyboard, and touch. Every interaction MUST work with touch alone (drag-and-drop included), and with keyboard alone on desktop.
- **R-PLAT-6** Math MUST be rendered with KaTeX (bundled, not from a CDN) or with equivalent custom components: stacked fractions, a true minus sign (U+2212), an overline for repeating blocks, and italic variables.

### 2.1 Code structure

- **R-ARCH-1** `src/engine/` MUST be pure TypeScript with **no DOM or React imports**. It contains the exact arithmetic, the problem generators, the answer and step checkers, the distractor generators, the hint content builders, and the adaptive-level logic. The UI calls into it; it never calls the UI.
- **R-ARCH-2** All arithmetic in the engine MUST be **exact rational arithmetic**: a `Rational` type with numerator and denominator, always normalized (gcd-reduced, denominator > 0). Floating point MUST NOT be used to decide correctness. `number` is fine for the small integers used here; use `bigint` only if overflow becomes possible.
- **R-ARCH-3** Every generated question MUST come from a **seeded PRNG** (e.g. mulberry32). The seed and generator parameters are stored with each attempt so any question can be regenerated exactly (for the parent dashboard and for bug reports).
- **R-ARCH-4** Unit tests use **Vitest**, and generator invariants use property-based tests (**fast-check**) (§10). The engine SHOULD reach ≥ 90% line coverage.
- **R-ARCH-5** Persistence uses **IndexedDB** via Dexie with a versioned schema (§9).

Suggested layout:

```
src/
  engine/
    rational.ts          # Rational type + ops, gcd, parse/format
    rng.ts               # seeded PRNG
    config.ts            # all tunable constants
    topics/
      nc/ rd/ fdp/ pc/ eq/   # each: generator.ts, distractors.ts, hints.ts, checker.ts, levels.ts
    eq/
      parse.ts           # equation parser → AST
      linear.ts          # AST → linear form (α·v + β), term lists
      stepChecker.ts     # step classification (§7.4)
    adaptive.ts          # level up/down logic
    scoring.ts           # stars, streaks, badges
  ui/ ...                # React components & screens (see design.md)
  data/ db.ts            # Dexie schema, export/import
tests/ ...
```

---

## 3. Users and roles

- **Learner**: the child. Sees Home, assignments, practice, hints, rewards. Never sees raw accuracy percentages or comparisons that feel like grades (rewards are stars and streaks only).
- **Parent**: the product owner. Opens the parent area with a **4-digit PIN** (R-PAR-1), then creates assignments, views progress, changes settings, and exports or imports data.

---

## 4. Session model: assignments + adaptive difficulty

- **R-SES-1** The parent creates an **assignment**: an ordered list of `{topic, count, levelLock?}` items, e.g. `[{EQ, 10}, {PC, 5}]`, with an optional title and due date.
- **R-SES-2** Only one assignment is **active** at a time. Any others wait in a queue in the order the parent set.
- **R-SES-3** Within an assignment item, the **app chooses the level** using the adaptive rules (§4.1), unless the parent set `levelLock` for that item.
- **R-SES-4** The parent chooses the question order: **grouped** (all EQ, then all PC) or **mixed** (interleaved) *(default: grouped)*.
- **R-SES-5** The learner can leave mid-assignment and resume later with nothing lost. Progress is saved after every answer.
- **R-SES-6** **Free practice**: once the active assignment is done, the learner can practice any topic, and adaptive rules apply. A parent setting controls free practice: `always | after assignment | never` *(default: after assignment)*.
- **R-SES-7** A finished assignment gets a summary screen: stars earned and a penguin celebration. No percentages.

### 4.1 Adaptive levels (per topic)

Each topic has levels 1…N (defined per topic in §6–7). A learner has one current level per topic.

- **R-ADP-1** Define a **clean solve** as correct on the first try, with no hint tier above H1.
- **R-ADP-2** **Promote** by one level when at least 4 of the learner's last 5 attempts at the current level are clean solves *(default: window 5, threshold 4)*, and there are at least 5 attempts at that level.
- **R-ADP-3** **Demote** by one level (never below 1) when at least 3 of the learner's last 5 attempts at the current level ended in a walkthrough (H3) or a second wrong answer *(default)*.
- **R-ADP-4** The attempt window resets on any level change.
- **R-ADP-5** The parent can set a per-topic **min/max level**. Adaptation stays within those bounds.
- **R-ADP-6** A level change MUST be shown gently. Promotion: the penguin says "Level up!" Demotion is **silent**; the questions just get easier. There are no "level down" messages.

---

## 5. Common question behaviour

### 5.1 Answer formats

- **R-ANS-1** NC, RD, FDP and PC questions use **multiple choice with 5 options** (NC uses select-all checkboxes instead, §6.1).
- **R-ANS-2** Distractors MUST be generated from explicit **misconception models** (listed per topic). Random-number fillers are allowed only when the misconception models produce fewer than 4 distinct candidates.
- **R-ANS-3** **No distractor may be numerically equal to the correct answer.** For example, 420/99 must never be offered as wrong when 140/33 is right. All 5 options MUST be distinct in value and in displayed text.
- **R-ANS-4** Option order is shuffled with the question's seeded PRNG.
- **R-ANS-5** EQ uses the **tile builder** (levels 1–2) or the **typed-step keypad** (levels 3+), as described in §7.

### 5.2 Wrong answers and help

- **R-HELP-1** **Wrong answer, first time:** a gentle "Not quite, try again", with a short shake animation on the chosen option, and that option greyed out. The learner tries again.
- **R-HELP-1a** Each distractor carries its misconception code (e.g. `PC-M4`). The first-wrong feedback MAY add one short line specific to that code ("That's the same as the start price."). The line MUST NOT reveal the correct answer. The copy lives in `strings.ts`; examples are in design.md §9.
- **R-HELP-2** **Wrong answer, second time:** the turtle appears and offers help, opening the hint ladder at the next tier they haven't seen. They can decline and keep trying. Each later wrong try advances one hint tier.
- **R-HELP-3** A **Help** button is always visible. The learner can open the hint ladder at any time, before any attempt.
- **R-HELP-4** **Hint ladder**, identical in structure for every topic:
  - **H1 Nudge**: points the learner at the relevant idea without doing any computation. ("Which terms have the letter *a* in them?")
  - **H2 Next move**: states the specific next step for *this* problem without its result. ("Move the *a* from the right side to the left side. What happens to its sign?")
  - **H3 Walkthrough**: a step-by-step worked solution of *this* problem, which the learner advances by tapping **Next**. Some steps ask a small inline question (e.g. "What is 100 × 4.2424…?", with 3 options) before revealing the result.
- **R-HELP-5** Hints MUST be generated from the actual problem data (the real numbers, variable letter and terms), not from generic text.
- **R-HELP-6** After a walkthrough, the question counts as done (1 star, §8), and the next question is from the same topic and level.
- **R-HELP-7** The turtle presents all help. The penguin presents all celebration. Neither ever mocks or shows disappointment.

### 5.3 Display conventions

- **R-DISP-1** Negative numbers use a true minus sign (−) and never a hyphen.
- **R-DISP-2** Fractions display stacked. Mixed numbers display as whole + stacked fraction (2¼).
- **R-DISP-3** **Repeating decimals**:
  - Levels where the ellipsis is used: show the repeating block **at least 3 full times**, then "…", e.g. `4.242424…` or `0.546546546…`.
  - From the level where bar notation is introduced, show **both**: `4.2424… = 4.\overline{24}`. At higher levels, bar notation alone MAY be used. Bar notation is introduced at RD level 3 and FDP level 4.
  - Mathematically, an ellipsis alone is ambiguous, because a finite prefix doesn't determine a decimal. Every ellipsis-only display MUST be accompanied by the caption "the block *24* repeats forever" the first time it appears in a question.
- **R-DISP-4** Irrational patterned decimals (NC) MUST carry a caption that states the rule, e.g. "0.1010010001… (one more 0 each time, forever)".
- **R-DISP-5** Money is displayed as `$` with exactly 2 decimals: `$48.00`, `$60.50`.
- **R-DISP-6** Variables are single lowercase italic letters chosen from `{a, b, c, d, g, h, k, m, n, p, q, r, s, t, u, w, x, y, z}`. Letters that look like digits or constants (`o, l, i, e`) and `f, j, v` are excluded.

---

## 6. Number topics

For each topic, the tables below define the levels. Every generator MUST satisfy the invariants given and is tested per §10.

### 6.1 NC — Number classification

**Question:** "Which sets does this number belong to? Tick all that apply." There are six checkboxes, always in this order: **Natural · Whole · Integer · Rational · Irrational · Real**.

**Definitions (shown in help, used by the checker):**

- Natural ℕ = {1, 2, 3, …} (excludes 0, following a common school convention) *(default; parent setting can switch to include 0; if changed, Natural and Whole become identical and the help text updates)*
- Whole = {0, 1, 2, 3, …}
- Integer ℤ = {…, −2, −1, 0, 1, 2, …}
- Rational ℚ = numbers that can be written p/q with integers p, q and q ≠ 0. Equivalently: the decimal terminates or repeats.
- Irrational = real numbers that are not rational. Equivalently: the decimal never terminates and never repeats.
- Real ℝ = all of the above.

| Level | Numbers shown | Examples |
|---|---|---|
| 1 | Positive integers, 0, simple positive fractions, terminating decimals | 7, 0, 3/4, 0.25 |
| 2 | Negative integers, negative fractions and decimals, repeating decimals | −12, −5/8, −0.4, 0.333… |
| 3 | **Disguised** forms: fractions and decimals that are integers | 12/4, 6/3, −8/−2 (display as \(\frac{-8}{-2}\)), 3.0, −0/5, 15/5 |
| 4 | **Irrational** patterned decimals, mixed with all of the above | 0.1010010001…, 0.123456789101112…, 2.020020002… |
| 5 (challenge) | Mixed, including 0.999… (= 1, so natural, whole, integer, rational, real) | 0.999…, 4.24242…, −3.000 |

- **R-NC-1** The checker computes the correct set membership from the number's exact value (a `Rational`, or a tagged `IrrationalPattern`). Disguised forms are reduced first.
- **R-NC-2** A correct answer means **exactly** the correct set of boxes is ticked.
- **R-NC-3** On the first wrong answer, the feedback says "Not quite". On the second wrong answer, the boxes that are wrong get outlined (without saying which way they're wrong), and the hint ladder is offered.
- **R-NC-4** The app MUST NOT auto-tick supersets. The learner has to learn the nesting themselves.
- **R-NC-5** No roots, powers, π or e in v1.

**Misconceptions to address in hints:** "a fraction can't be an integer" (12/4), "negative numbers aren't whole" (correct, but the learner may over-apply it and untick Integer), "a decimal isn't rational" (0.25 = 1/4), "a repeating decimal is irrational", "0 isn't a whole number", "long decimals are irrational".

**Hints:**
- H1: "Start at the smallest set. Is this number a counting number (1, 2, 3, …)?"
- H2: number-specific, e.g. "12/4 simplifies. What is 12 ÷ 4?"
- H3: a walkthrough over the **nested-sets diagram** (see design.md). It places the number in its innermost set, then shows that every set containing that one is also ticked.

### 6.2 RD — Repeating decimals

Two question directions:

- **D→F** "Write 4.2424… as a fraction in lowest terms."
- **F→D** "Write 5/6 as a decimal."

| Level | Direction | Cases | Examples (answer) |
|---|---|---|---|
| 1 | D→F | Pure repeat, block length 1, no whole part | 0.333… (1/3), 0.777… (7/9), 0.666… (2/3) |
| 2 | D→F | Pure repeat, block length 2–3, no whole part | 0.4545… (5/11), 0.546546… (182/333), 0.2727… (3/11) |
| 3 | D→F + F→D | Pure repeat **with whole part**; bar notation introduced; F→D with denominators 3, 9, 11 | 4.2424… (140/33); 2/11 → 0.1818… |
| 4 | D→F + F→D | **Delayed repeat** (non-repeating part length 1–2, block length 1–2); F→D with denominators 6, 12, 15, 22 | 0.1666… (1/6), 0.8333… (5/6), 0.41666… (5/12), 2.31818… (51/22) |
| 5 | Mixed | All of the above, including F→D for 7 (block length 6) | 1/7 → 0.142857142857… |

- **R-RD-1** The correct D→F answer is the fraction **in lowest terms**, improper if the value > 1 (140/33, not 4 8/33). The walkthrough always shows the unsimplified fraction first, then the simplification step.
- **R-RD-2** The generator MUST build the question from `(wholePart, nonRepeatingDigits, repeatingBlock)` and compute the exact value as
  \[ x = \frac{\text{(all digits through one block)} - \text{(digits before the block)}}{10^{m}(10^{k}-1)} \]
  where k = block length and m = number of non-repeating digits after the point. The generator MUST reject blocks that are themselves periodic (e.g. block "44" → use "4"), and delayed cases whose non-repeating tail could be absorbed into the block (e.g. 0.1666… generated as nonRep="16", block="6" must be normalized to nonRep="1", block="6").
- **R-RD-3** F→D: the correct option shows the decimal per R-DISP-3. The generator computes the digits by exact long division and detects the period.

**Walkthrough (H3), D→F, the x-method.** Example 4.2424…:

1. Let x = 4.2424…
2. The block "24" has 2 digits, so multiply by 10² = 100: 100x = 424.2424…
3. Line them up and subtract: 100x − x = 424.2424… − 4.2424…
4. The repeating tails cancel: 99x = 420
5. Divide: x = 420/99
6. Simplify: gcd(420, 99) = 3, so x = 140/33

Delayed example 0.41666… (m = 2, k = 1):

1. Let x = 0.41666…
2. Shift the non-repeating part left of the point: 100x = 41.666…
3. Shift one more block: 1000x = 416.666…
4. Subtract: 1000x − 100x = 416.666… − 41.666… → 900x = 375
5. x = 375/900 = 5/12 (gcd 75)

Inline mini-questions in the walkthrough (R-HELP-4): "How many digits are in the repeating block?" and "What is 100 × 4.2424…?"

**Walkthrough (H3), F→D:** long division, laid out step by step, highlighting when a **remainder repeats**. That remainder is the moment the digits must start repeating, and the walkthrough says so explicitly.

**D→F distractors (misconception models):**
| Code | Misconception | Example for 4.2424… (correct 140/33) |
|---|---|---|
| RD-M1 | Block over 9s, ignoring the whole part | 24/99 → 8/33 |
| RD-M2 | Whole digits and block over 9s without subtracting | 424/99 |
| RD-M3 | Wrong number of 9s | 420/9 → 140/3 |
| RD-M4 | Treated as terminating (truncated) | 4.24 = 106/25 |
| RD-M5 | (delayed) forgot the 10ᵐ shift | 0.41666… → 416/999 or 41/99 |
| RD-M6 | Block over 10s | 24/100 + 4 → 106/25 (dedupe against M4) |

**F→D distractors:** truncated terminating version (0.83), wrong repeating block (0.8383…), repeat starting too early (0.666… for 1/6, correct 0.1666…), digits of numerator and denominator juxtaposed (0.56 for 5/6), reciprocal (1.2 for 5/6).

### 6.3 FDP — Fraction ↔ decimal ↔ percent

Six directions: F→D, F→P, D→F, D→P, P→F, P→D. The prompt names the target form, e.g. "Write 3/8 as a percent."

| Level | Values | Examples |
|---|---|---|
| 1 | Benchmarks: halves, quarters, fifths, tenths | 1/2 = 0.5 = 50%, 3/4, 2/5, 7/10 |
| 2 | Denominators 8, 20, 25, 50, 100; decimals to 3 places | 3/8 = 0.375 = 37.5%, 7/20 = 0.35 |
| 3 | **Mixed numbers and > 100%; < 1%** | 2¼ = 2.25 = 225%; 0.4% = 0.004 = 1/250 |
| 4 | **Repeating results**; bar notation introduced | 1/3 = 0.333… = 33.3…%; 5/6 = 0.8333… = 83.3…%; 1/9, 2/11, 5/12 |
| 5 | Mixed review of 1–4 | |

- **R-FDP-1** Fraction answers MUST be in **lowest terms**.
- **R-FDP-2** When the value is > 1, the prompt specifies the target form: "as a mixed number" or "as an improper fraction". Both appear, split 50/50. The options use only the requested form.
- **R-FDP-3** Repeating percents display like decimals: `33.3…%`, and from level 4 `33.\overline{3}%`. Mixed-number percents such as 33⅓% are **not** used in v1.
- **R-FDP-4** Help teaches: F→D by division; D→P by multiplying by 100 (the decimal point moves 2 places right); P→D by dividing by 100; D→F by writing over a power of ten and simplifying with the gcd; P→F by writing over 100 and simplifying.

**Distractors:**
| Code | Misconception | Example |
|---|---|---|
| FDP-M1 | Decimal point moved the wrong way or the wrong number of places | 0.375 → 3.75% or 375% |
| FDP-M2 | Fraction digits read as a decimal | 3/8 → 0.38 |
| FDP-M3 | Reciprocal | 3/8 → 2.666… |
| FDP-M4 | Percent over 10 instead of 100 | 35% → 7/2 |
| FDP-M5 | Not simplified but *not equal* (wrong gcd division) | 35/100 → 7/25 (wrong; correct 7/20) |
| FDP-M6 | Repeating truncated | 1/3 → 33% or 0.33 |
| FDP-M7 | Whole part dropped (mixed) | 2¼ → 25% |

### 6.4 PC — Percent change (prices)

| Level | Question type | Examples |
|---|---|---|
| 1 | Single change, "nice" percents (10, 20, 25, 50) and whole-dollar prices | $40 up 10% → $44.00; $80 down 25% → $60.00 |
| 2 | Single change, any whole percent 1–90, prices with cents; results exact to the cent (generator guarantees no rounding) | $36.50 up 12% → $40.88 |
| 3 | **Successive changes** (two steps) | $50 up 20% then down 20% → $48.00 |
| 4 | **Reverse: find the original** | "After a 25% discount it costs $60. Original?" → $80.00; "After a 10% increase it costs $66. Original?" → $60.00 |
| 5 | Mixed 1–4 | |

- **R-PC-1** Answers are exact to the cent. The generator MUST guarantee exact results (check with rational arithmetic). No rounding appears in v1.
- **R-PC-2** Help teaches **two methods** and shows both in the walkthrough:
  - *Find the part*: 10% of $40 = $4, so $40 + $4 = $44.
  - *Multiplier*: up 10% → × 1.10, down 25% → × 0.75. For successive changes, multiply the multipliers: 1.20 × 0.80 = 0.96. For the reverse case, divide by the multiplier: $60 ÷ 0.75 = $80.
- **R-PC-3** At level 3, the walkthrough MUST explicitly point out that "up 20% then down 20%" does **not** return to the original, and why: the second 20% is taken of a bigger number.
- **R-PC-4** Currency symbol is `$` *(default; parent setting)*.

**Distractors:**
| Code | Misconception | Example |
|---|---|---|
| PC-M1 | Percent added as dollars | $40 up 10% → $50 |
| PC-M2 | Gave the change, not the new price | → $4.00 |
| PC-M3 | Wrong direction | $40 up 10% → $36 |
| PC-M4 | Successive changes cancel | $50 → $50.00 |
| PC-M5 | Successive percents added | up 20%, down 10% → treated as up 10% |
| PC-M6 | Reverse: applied the percent to the final price | $60 after 25% off → $60 × 1.25 = $75 |
| PC-M7 | Reverse: subtracted the percent of the final price | $66 after +10% → $66 − $6.60 = $59.40 |

---

## 7. EQ — Linear equations in one variable

### 7.1 The method (what the learner must show)

The method follows the parent's description:

1. **(If there are parentheses) Expand.** 3(y − 2) = y + 8 → 3y − 6 = y + 8
2. **(Optional, fraction coefficients) Clear fractions.** x/4 + 1 = 3 → x + 4 = 12
3. **Separate.** Unknowns on one side, knowns on the other: 3a + 3 = a + 23 → 3a − a = 23 − 3
4. **Simplify.** Combine like terms: 2a = 20
5. **Solve.** a = 10

Pedagogy for moving terms (**balance first, then the shortcut**):

- **R-EQ-PED-1** At EQ levels 1–2, every move in the tile builder is animated on a **balance scale**: "subtract *a* from both sides". The result is then shown as the shortcut: "−*a* appears on the left, and the *a* on the right is gone."
- **R-EQ-PED-2** After the learner has done 10 correct sign choices in the tile builder *(default)*, the balance animation shortens to a quick flip of the tile's sign, with the caption "Moving a term across = flips its sign (that's the balance, done in one step)." The parent can re-enable the full animation.
- **R-EQ-PED-3** H1/H2 hints for Separate always refer to both views: "Subtract *a* from both sides, which is the same as moving *a* across and flipping its sign."

### 7.2 Levels

| Level | Input mode | Equation forms | Examples (solution) |
|---|---|---|---|
| 1 | Tiles | `ax + b = c`, a > 1, positive integers, positive integer solution | 3x + 4 = 19 (5) |
| 2 | Tiles | Negatives; variable on both sides; integer solutions | 7 − 3z = 13 (−2); 3a + 3 = a + 23 (10) |
| 3 | Typed | Variable on both sides with negatives; integer solutions | 5n − 7 = 2n + 8 (5); 4 − 2k = 3k − 11 (3) |
| 4 | Typed | **Parentheses** (one side, then both) | 2(x + 4) = 18 (5); 3(y − 2) = y + 8 (7); 2(m − 3) = −(m + 12) (−2) |
| 5 | Typed | **Fraction answers and fraction coefficients** | 3x + 1 = 8 (7/3); x/4 + 1 = 3 (8); 2p/3 − 1 = p/6 + 2 (6) |
| 6 | Typed | Mixed review of 3–5, including negative fraction solutions | 4(w + 1) = 7w + 9 (−5/3) |

Generator invariants (**R-EQ-GEN**):
- 1: The solution is unique. The collected variable coefficient α ≠ 0.
- 2: All coefficients and constants shown have |value| ≤ 30 (levels 1–3) or ≤ 50 (levels 4–6). Solutions have |value| ≤ 20. Fraction solutions have denominator ≤ 9.
- 3: No term has coefficient 0. Coefficient ±1 is displayed as `a` / `−a`, never `1a`.
- 4: Levels 1–2 never contain parentheses. Levels 1–4 never contain fractions.
- 5: A side never has the same term twice as generated (no `3a + 2a` in the prompt).
- 6: Separate must be a meaningful step. The generated equation MUST NOT already be in separated form (e.g. `5x = 20` is never generated).
- 7: Constants must not cancel to make the knowns side trivially empty in a confusing way. If both sides' constants are equal, regenerate.

### 7.3 Input modes

**Tile builder (levels 1–2): R-EQ-TILE**
- 1: The equation is shown as tiles on a two-pan board (left side | = | right side). Each term is one tile: `3a`, `+3`, `a`, `+23`.
- 2: **Separate phase.** Two drop zones are labelled "unknowns" and "knowns". The learner chooses which side is which; the default proposal is unknowns on the left, and they may flip it. They drag each tile that is on the wrong side across the `=`. When a tile crosses, it lands showing **"?"** in place of its sign, and they must tap **+** or **−**. A correct choice locks the tile. A wrong choice triggers the turtle's balance-scale explanation (H2-level) and they choose again.
- 3: Tiles already on the correct side stay put. When all tiles are placed, the equation they have built is shown in text form (`3a − a = 23 − 3`) and read back to them as the recorded Separate step.
- 4: **Simplify phase.** The learner taps the unknowns group and enters the combined coefficient on a small number pad (`2`, so the result is `2a`). Then they do the same for the knowns (`20`). Wrong values: R-HELP-1/2 apply.
- 5: **Solve phase.** The prompt is "2a = 20. Divide both sides by …?" The learner enters the divisor, then the answer `a = 10`.
- 6: Tiles MUST be draggable by touch and mouse, and for keyboard users each tile is focusable, with Enter to pick up, arrow keys to move, and Enter to drop.

**Typed-step keypad (levels 3–6): R-EQ-TYPE**
- 1: The learner writes one equation per line, each a new step. The previous lines stay visible above as a growing worked solution.
- 2: On-screen keypad: digits 0–9, the current variable letter (only that letter), `+ − × ÷ / ( ) =`, fraction key, backspace, clear, **Check step**. On desktop, the physical keyboard also works (`*` → ×, `-` → −).
- 3: The parser accepts implicit multiplication (`3a`, `2(x+4)`, `-(m+12)`), `a/4` and `(2p)/3` as coefficient 1/4 or 2/3, unary minus, and spaces. Exactly one `=` is required.
- 4: Each **Check step** runs the step checker (§7.4) against the previous line. A valid step is appended with a label ("Moved ✔", "Simplified ✔"). An invalid step shows targeted feedback and is not appended.
- 5: When a line is a valid **Solve** (`a = 10`), the question is complete.

### 7.4 Step checker (normative)

Definitions: For an expression, **Lin(E)** = (α, β) is its linear form α·v + β, with α, β ∈ ℚ. For an equation P: L = R, **D(P)** = Lin(L) − Lin(R). **Terms(P)** is the multiset of signed, *uncombined* terms obtained by moving everything to the left: the terms of L, plus the negated terms of R (after expansion, if P has parentheses, expand symbolically for this purpose only). The solution is v* = −β/α.

Given the previous accepted line P and the new line N, classify N as the first step type below whose conditions hold. If none holds, produce the diagnostic.

| Step | Allowed when | Conditions on N |
|---|---|---|
| **EXPAND** | P contains parentheses | N has no parentheses (or fewer, for nested); Lin(N.L) = Lin(P.L) and Lin(N.R) = Lin(P.R) (each side equal on its own) |
| **CLEAR_FRACTIONS** | P has a fractional coefficient or constant | N has integer coefficients and constants, and D(N) = k·D(P) for some integer k ≥ 2 (sign ±) |
| **SEPARATE** | P not yet separated | N is **separated**: one side contains only variable terms (≥ 1), the other only constant terms (≥ 1); and D(N) = ±D(P) |
| **SIMPLIFY** | P is separated but not simplified | N has exactly one term per side, c·v on one side and d on the other, c ≠ 0; and D(N) = ±D(P) |
| **SOLVE** | P is simplified (c·v = d) | N is `v = q` or `q = v`, with q = d/c, **q written in lowest terms** as an integer or improper fraction p/q (q > 1, gcd = 1) |

Additional rules:

- **R-EQ-CHK-1 Orientation is free.** `a − 3a = 3 − 23` is a valid SEPARATE for `3a + 3 = a + 23`, since D(N) = −D(P). Likewise `7 − 13 = 3z` is valid for `7 − 3z = 13`.
- **R-EQ-CHK-2 Partial combining** inside a SEPARATE step is accepted (`3a − a = 20` is separated and D(N) = D(P)), labelled "Moved ✔ (and you started simplifying, nice)".
- **R-EQ-CHK-3 Skipping steps.** If N satisfies SIMPLIFY or SOLVE conditions directly from an unseparated P (e.g. `2a = 20` straight from `3a + 3 = a + 23`), and N is equivalent (D(N) proportional to D(P)), then:
  - if the parent setting `allowSkipping` is **off** (*default*), respond "That's right, but show the moving step first: write the equation with the *a* terms on one side and numbers on the other." Do not append.
  - if it is **on**, accept and append with the label "Moved + simplified ✔".
  - The Solve step can never be skipped at levels 3–4. At levels 5–6, when `allowSkipping` is on, `c·v = d → v = q` can be merged with Simplify.
- **R-EQ-CHK-4 Coefficient ±1.** If SIMPLIFY yields `a = 20` (c = 1), it counts as both SIMPLIFY and SOLVE. If it yields `−a = −20`, a SOLVE step is still required.
- **R-EQ-CHK-5 Not lowest terms.** A SOLVE with the right value but not in lowest terms (`x = 14/6`): "Right value! Can you simplify 14/6?" Not appended.
- **R-EQ-CHK-6 Decimals.** A SOLVE with an inexact decimal (`x = 2.33`) is not accepted: "Keep it exact, use a fraction." An exact terminating decimal (`x = 2.5` for 5/2) is accepted with a note that 5/2 is also fine.

**Diagnostics**, in priority order. The first one that matches is shown:

| Code | Detect | Message (template) |
|---|---|---|
| EQ-D1 | Parse error | "I can't read that line. Check for a missing number or sign." (highlight the position) |
| EQ-D2 | No `=` or more than one | "An equation needs exactly one = sign." |
| EQ-D3 | Wrong variable letter | "This problem uses *a*." |
| EQ-D4 | **Sign error on one transposed term**: separated form holds, and flipping the sign of exactly one term of N makes the multiset equal to ±Terms(P) (after N's own partial combining is undone, where possible) | "Look at the {term}. When it moved across the =, did its sign change?" |
| EQ-D5 | **Term lost or duplicated**: Terms(N) differs from ±Terms(P) by a missing or extra term | "One of the terms went missing. Check that every term from the last line is here." |
| EQ-D6 | **Scaled too early**: D(N) = k·D(P), k ∉ {±1}, at the SEPARATE stage | "You divided (or multiplied) already. First get the unknowns on one side and numbers on the other." |
| EQ-D7 | **Arithmetic error in SIMPLIFY**: form OK, D(N) ≠ ±D(P) | "Check your adding: {unknown side of P} = ?" (points at the side whose value is wrong) |
| EQ-D8 | **Division error in SOLVE** | "Check: {c}·{v} = {d}. What number times {c} is {d}?" |
| EQ-D9 | **Expand error**: one side's Lin changed | "Check the expansion: {k}({inner}) means {k} times *each* term inside." |
| EQ-D11 | **Equivalent but not separated**: D(N) = ±D(P), but a variable or constant term is still on both sides | "Balanced ✔, but there are still {variable} terms (or numbers) on both sides. Get all the {variable} terms on one side." |
| EQ-D10 | Not equivalent, no specific match | "This line isn't balanced with the one above. What did you do to each side?" |

### 7.5 Acceptance examples (the checker MUST pass all of these)

Previous line `3a + 3 = a + 23`:

| N | Result |
|---|---|
| `3a − a = 23 − 3` | SEPARATE ✔ |
| `a − 3a = 3 − 23` | SEPARATE ✔ (orientation) |
| `−a + 3a = −3 + 23` | SEPARATE ✔ (term order irrelevant) |
| `3a − a = 20` | SEPARATE ✔ (partial combine) |
| `3a + a = 23 − 3` | EQ-D4 (sign of *a*) |
| `3a − a = 23 + 3` | EQ-D4 (sign of 3) |
| `2a = 20` | skip rule (R-EQ-CHK-3) |
| `3a = a + 20` | EQ-D11 (equivalent, but not separated) |
| `6a + 6 = 2a + 46` | EQ-D6 (scaled) |

Then from `3a − a = 23 − 3`: `2a = 20` → SIMPLIFY ✔; `2a = 26` → EQ-D7 (right side); `4a = 20` → EQ-D7 (left side).
Then from `2a = 20`: `a = 10` → SOLVE ✔; `10 = a` → SOLVE ✔; `a = 20/2` → R-EQ-CHK-5; `a = 18` → EQ-D8.

Previous `7 − 3z = 13`: `−3z = 13 − 7` ✔; `7 − 13 = 3z` ✔; `3z = 13 − 7` → EQ-D4 (sign of 3z). Then `−3z = 6` ✔ → `z = −2` ✔.

Previous `3(y − 2) = y + 8`: `3y − 6 = y + 8` → EXPAND ✔; `3y − 2 = y + 8` → EQ-D9. Then `3y − y = 8 + 6` ✔ → `2y = 14` ✔ → `y = 7` ✔.

Previous `x/4 + 1 = 3`: `x + 4 = 12` → CLEAR_FRACTIONS ✔; `x/4 = 3 − 1` → SEPARATE ✔; `x/4 = 2` → SIMPLIFY ✔; `x = 8` → SOLVE ✔.

Previous `3x + 1 = 8`: … `3x = 7` ✔ → `x = 7/3` ✔; `x = 2.33` → R-EQ-CHK-6; `x = 14/6` → R-EQ-CHK-5.

### 7.6 EQ hints

For `3a + 3 = a + 23`:

- H1 (Separate): "Which terms have an *a*? Which are just numbers? We want all the *a* terms on one side."
- H2 (Separate): "Move the *a* on the right over to the left. Subtracting *a* from both sides flips it to −*a*. Then move the +3 to the right."
- H1 (Simplify): "Combine the *a* terms, then combine the numbers."
- H2 (Simplify): "3*a* − *a* = ? *a*. And 23 − 3 = ?"
- H1 (Solve): "*a* is being multiplied by 2. How do you undo multiplying?"
- H2 (Solve): "Divide both sides by 2."
- H3: the full walkthrough on the balance scale, one step per tap, ending with a **check**: substitute a = 10 into the original, 3·10 + 3 = 33 and 10 + 23 = 33 ✔. Every EQ walkthrough ends with this substitution check.

EQ uses no multiple choice. Every step is produced by the learner, either through tiles plus a number pad, or by typing.

---

## 8. Rewards (learner-visible, light)

- **R-RWD-1** **Stars per question:** 3 ★ = correct on the first try with no hints; 2 ★ = correct on the second try, or with H1 only; 1 ★ = needed H2 or H3, or more than 2 tries. There are no zero-star outcomes; completing always earns at least 1.
- **R-RWD-2** **Streak:** the number of consecutive days on which the learner completed at least one assigned question set, or finished the active assignment *(default: ≥ 1 assignment question answered on a day that had an active assignment)*. Days with **no active assignment do not break** the streak.
- **R-RWD-3** **Badges** (small, one-time): first question solved; first perfect assignment (all 3 ★); 10 EQ questions without H3; first delayed repeating decimal; first successive-change problem; 7-day streak; 30-day streak; each topic's max level reached.
- **R-RWD-4** **Shell collection**: stars convert into shells (1 ★ = 1 shell), displayed on a beach scene on Home. The turtle and penguin can be given simple accessories (a hat, scarf or sunglasses) bought with shells. This is cosmetic only *(SHOULD; can slip to v1.1)*.
- **R-RWD-5** The penguin celebrates correct answers with short animations (< 1.2 s, skippable, and never blocking input for more than 600 ms). A 3 ★ answer gets a slightly bigger celebration. Streak milestones get a full-screen celebration (skippable).
- **R-RWD-6** No leaderboards, no timers, no speed scoring, no loss of shells.
- **R-RWD-7** **Character naming:** on first run, after the parent sets the PIN, the learner can name the turtle and the penguin (defaults "Shelly" and "Pip"). The names are stored in `Settings.mascotNames` and can be changed later from the parent area.

---

## 9. Parent area

- **R-PAR-1** Access is a small "Parent" link on Home, then a 4-digit PIN (set on first launch; **not** a security boundary, just a child gate). There is a PIN-reset path: answer a simple arithmetic challenge (e.g. 47 × 13) and set a new PIN.
- **R-PAR-2** **Assignments:** create, edit, reorder, delete; see the active one's progress; mark it complete early.
- **R-PAR-3** **Progress dashboard.** For each topic: current level, attempts, clean-solve rate, hint usage by tier, average tries, time spent, and a trend over the last 30 days (small line chart). Plus a **daily activity** strip (minutes per day).
- **R-PAR-4** **Missed-question review:** a list of attempts that needed H2/H3 or two or more wrong tries. Each can be opened to show the question (regenerated from its seed), the learner's answers in order, and for EQ **every line they tried, including rejected lines with their diagnostic codes**. Filter by topic and date.
- **R-PAR-5** **Settings:** PIN; free-practice policy (R-SES-6); question order (R-SES-4); per-topic min/max level (R-ADP-5); `allowSkipping` for EQ (R-EQ-CHK-3); full balance animation on/off (R-EQ-PED-2); natural numbers include 0 (§6.1); sounds on/off; reduce motion (also honours the OS `prefers-reduced-motion`); currency symbol.
- **R-PAR-6** **Data:** export all data to a JSON file; import a JSON file (with a confirmation step and a schema-version check); reset all progress (with a confirmation step).

### 9.1 Data model (Dexie, schema v1)

```ts
type TopicId = 'NC' | 'RD' | 'FDP' | 'PC' | 'EQ';

interface Profile      { id: 'default'; name: string; createdAt: string; }         // single profile in v1, keyed for future multi-profile
interface Settings     { profileId; pinHash: string; freePractice: 'always'|'afterAssignment'|'never';
                         order: 'grouped'|'mixed'; levelBounds: Record<TopicId,{min:number;max:number}>;
                         allowSkipping: boolean; fullBalanceAnim: boolean; naturalIncludesZero: boolean;
                         sound: boolean; reduceMotion: boolean; currency: string;
                         mascotNames: { turtle: string; penguin: string }; }
interface TopicState   { profileId; topic: TopicId; level: number; window: AttemptSummary[]; }   // last-5 window for adaptive
interface Assignment   { id; profileId; title?: string; items: {topic: TopicId; count: number; levelLock?: number}[];
                         status: 'queued'|'active'|'done'; createdAt; dueDate?; completedAt?; position: number; }
interface Attempt      { id; profileId; assignmentId?: string; topic: TopicId; level: number;
                         generatorId: string; seed: number; params: unknown;      // enough to regenerate
                         startedAt; finishedAt; tries: TryRecord[]; maxHint: 0|1|2|3; stars: 1|2|3; clean: boolean; }
interface TryRecord    { at: string; answer: unknown;               // option id(s) or typed line
                         verdict: 'correct'|'wrong'|'stepAccepted'|'stepRejected'; stepType?: string; diagnostic?: string; }
interface Rewards      { profileId; shells: number; streak: number; lastStreakDate?: string; badges: {id:string; at:string}[]; accessories: string[]; }
interface Meta         { key: 'schemaVersion'; value: number; }
```

- **R-DATA-1** Every schema change bumps `schemaVersion` and ships a Dexie upgrade function. Export files include `schemaVersion`. Import migrates older files forward.
- **R-DATA-2** The PIN is stored as a salted SHA-256 hash (Web Crypto). This only avoids storing it in plain text; it is not security.
- **R-DATA-3** No data leaves the device except through a user-initiated export.

---

## 10. Testing and quality

- **R-TEST-1** **Rational arithmetic**: unit tests for normalize, add, sub, mul, div, compare, parse and format, including negatives and zero.
- **R-TEST-2** **Generator properties** (fast-check, ≥ 1000 seeds per level per topic):
  - the stated answer is correct, verified independently (e.g. RD: evaluate the decimal from its digits and compare to the fraction; EQ: substitute the solution);
  - all R-*-GEN invariants hold;
  - 5 distinct options, exactly one correct, and no distractor equal in value to the answer (R-ANS-3);
  - the same seed gives an identical question.
- **R-TEST-3** **Step checker**: every example in §7.5 is a named test case, and every diagnostic EQ-D1…D11 has at least 2 positive and 2 negative tests.
- **R-TEST-4** **Adaptive logic**: table-driven tests for promote/demote and window reset.
- **R-TEST-5** **UI**: Playwright smoke tests for completing one question per topic by mouse, completing the tile builder by touch emulation, completing a typed EQ, the hint ladder reaching H3, and the parent PIN plus assignment creation.
- **R-TEST-6** **Accessibility**: the automated axe check passes on every screen; all interactive targets ≥ 48×48 px; body text contrast ≥ 4.5:1 in both themes.
- **R-TEST-7** **Offline**: a Playwright test loads the app, goes offline, reloads, and completes a question.

---

## 11. Non-functional

- **R-NF-1** Cold load ≤ 2 s on a mid-range tablet over a local network; interactions respond within 100 ms; the step checker returns in < 20 ms.
- **R-NF-2** Bundle ≤ 1 MB gzipped, excluding fonts and illustrations.
- **R-NF-3** Respects `prefers-reduced-motion`: celebrations become static, and the balance animation becomes a two-frame before/after.
- **R-NF-4** All learner-facing text lives in one strings module (`src/ui/strings.ts`) so the tone can be edited in one place. v1 is English only.
- **R-NF-5** The learner is never shown an error stack. Unexpected errors show the turtle saying "Oops, let's try another one" and log to an in-app error list visible in the parent area.

---

## 12. Milestones (build order for Claude Code)

| Milestone | Scope | Done when |
|---|---|---|
| **M0 Scaffold** | Vite + React + TS + PWA plugin, ESLint/Prettier, Vitest, Playwright, Dexie, folder layout of §2.1 | `npm run dev`, `npm test` and `npm run build` all pass; app shell installs offline |
| **M1 Engine + EQ vertical slice** | `rational`, `rng`, EQ parser, linear form, step checker (§7.4–7.5), EQ generators L1–L6, EQ hints; UI: Home → EQ practice with **typed** mode + hint ladder | all §7.5 tests pass; the learner can solve typed equations end to end. **Stop here and let the learner try it.** |
| **M2 Tile builder** | EQ L1–L2 tile mode with balance animation (R-EQ-TILE, R-EQ-PED) | touch + mouse + keyboard drag work; Playwright tile test passes |
| **M3 Number topics** | NC, RD, FDP, PC generators, distractors, hints, walkthroughs; MC and select-all UIs | R-TEST-2 green for all topics |
| **M4 Sessions + adaptive + rewards** | assignments, adaptive levels, stars, streaks, badges, penguin celebrations | R-TEST-4 green; assignment completes with summary |
| **M5 Parent area** | PIN, assignment builder, dashboard, missed-question review, settings, export/import | R-TEST-5 parent flow green |
| **M6 Polish** | shells + accessories (R-RWD-4), animations, a11y pass, offline test, performance budget | R-TEST-6, R-TEST-7, R-NF-1/2 met |

---

## 13. Assumptions and defaults (change any of these freely)

1. App name "Turtle & Penguin Math" is a placeholder.
2. Natural numbers start at 1 (a common school convention). This is a parent setting.
3. Promote at 4 of the last 5 clean; demote at 3 of the last 5 needing a walkthrough.
4. Step skipping in EQ is off by default.
5. Currency is `$`; no rounding problems in v1.
6. Streak counts only days that had an active assignment.
7. Mixed-number percents (33⅓%) are not used; repeating percents use `33.3…%` / bar notation.
8. EQ levels 1–2 use tiles, levels 3–6 use typed steps. The parent can override with `levelLock`.

## 14. Glossary

- **Clean solve**: correct on the first try with no hint above H1.
- **Hint ladder**: H1 nudge → H2 next move → H3 walkthrough.
- **Separated form**: an equation with only variable terms on one side and only constants on the other.
- **Distractor**: a wrong multiple-choice option built from a specific misconception.
