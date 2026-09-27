# Roadmap: Turtle & Penguin Math

Future work only: everything here is still to be done. Each item moves **idea → proposed → approved → scheduled (M-number)**. Once an item is approved, its rules are written into `docs/requirements.md` (new or changed `R-…` IDs) and it gets a milestone; `progress.md` tracks the build. **When it is built, it is deleted from this file.** The history is in `progress.md` and `requirements.md` §15.

Precedence is unchanged: `requirements.md` > `design.md` > mockups. Nothing here overrides them until it is approved and written in.

To build an item, a session reads `CLAUDE.md`, `docs/requirements.md`, `docs/design.md`, `progress.md` and this file, plans the item in plan mode, asks the open questions listed under it, and waits for the parent's approval.

---

## Items

| # | Item | Status | Priority |
|---|---|---|---|
| R1 | Stars by level, and shells = stars | proposed (decisions in progress) | high |
| R2 | Number sets: the smallest set only | proposed | high |
| R3 | Tutorials for each topic | idea | — |
| R4 | Editable shop list (was M7) | deferred by the parent | low |
| R5 | Compact portrait keypad for typed equations; touch-drag check on the Surface Pro | parked | low |
| R6 | Dark-mode switch | idea | low |
| R7 | Run the Playwright specs in CI | idea | low |

---

### R1 Stars by level, and shells = stars

**Problem.** Every question pays 1–3 stars whatever its level, so staying at easy levels pays as well as moving up, and guessing on multiple choice pays.

**Decided by the parent (2026-09-26/27):**
- Stars always equal shells. The per-star shell table in Parent › Rewards goes away.
- Harder levels pay more, on a steep scale. Proposed maximums: level 1 = 1, 2 = 2, 3 = 4, 4 = 6, 5 = 8, EQ 6 = 10.
- The learner's **current level** in a topic, and anything above it, pays full stars. **One level below pays 1 star. Two or more below pay 0.**
- No bonus for 0.999… questions; they are ordinary level 5 questions.
- Shop prices rebalanced to the proposed scale: the drink **200** (was 150), the gift card **2,000** (was 1,500). The parent can change them later. Cosmetic thresholds unchanged.

**Proposed, not yet approved:**
- First try with no hint (or H1 only) = the level's full stars. Second try, or H2 = 1 star. Three or more tries = 0. (Makes blind guessing pay less than honest work at a lower level.)
- Celebrations and the summary show up to 10 stars.

**Open questions:**
1. What is the "current level"? Proposal: the higher of the stored level (moved by assignments) and the highest level adaptive free practice has reached.
2. Does a walkthrough (H3) earn 0 or 1 star?

**Touches:** R-RWD-1, R-RWD-4, R-HELP-6, R-PAR-7, R-SES-7; design.md §5 Celebration; `src/engine/scoring.ts`, `config.ts`.

### R2 Number sets: the smallest set only

**Problem.** The parent wants the learner to name the one smallest set a number belongs to, not tick every set.

**Decided by the parent (2026-09-26/27):**
- One answer: the smallest of Natural, Whole, Integer, Rational, Irrational. Examples: 7 → Natural, 0 → Whole, −3 → Integer, 3/4 → Rational, 0.1010010001… → Irrational, 0.999… → Natural.
- Natural numbers start at 1; 0's smallest set is Whole. The "natural numbers include 0" setting is removed.

**Proposed:** a single choice among the five cards; a wrong card is greyed out like other multiple choice, with a short set-specific line; R-NC-3 (outlined boxes) goes away. The sets map and walkthrough still show the nesting.

**Touches:** §6.1 R-NC-2/3/4, R-PAR-5, design.md §5 SetCheckbox; `src/engine/topics/nc/`, `NcPractice.tsx`, `ncReducer.ts`. Old attempts must still replay in Missed questions.

### R3 Tutorials for each topic

**Idea.** A short tutorial per topic (NC, RD, FDP, PC, EQ) that teaches the method before practice.

**Open questions:** interactive (like the walkthrough) or read-only? Where it is opened (topic tile, Help, first visit)? Does it earn anything? Which examples? (Examples must come from seeded generators and be verified in tests, like all math content.)

### R4 Editable shop list

See `progress.md` §10: add, rename and remove rewards in Parent › Rewards; new items need art or the parent's picture; a rule for removing an item with a pending request.

### R5–R7

See `progress.md` §10.
