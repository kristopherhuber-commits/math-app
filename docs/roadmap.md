# Roadmap: Turtle & Penguin Math

Future work only: everything here is still to be done. Each item moves **idea → proposed → approved → scheduled (M-number)**. Once an item is approved, its rules are written into `docs/requirements.md` (new or changed `R-…` IDs) and it gets a milestone; `progress.md` tracks the build. **When it is built, it is deleted from this file.** The history is in `progress.md` and `requirements.md` §15.

Precedence is unchanged: `requirements.md` > `design.md` > mockups. Nothing here overrides them until it is approved and written in.

To build an item, a session reads `docs/requirements.md`, `docs/design.md`, `progress.md` and this file, plans the item in plan mode, asks the open questions listed under it, and waits for the parent's approval.

---

## Items

| # | Item | Status | Priority |
|---|---|---|---|
| RM-3 | Tutorials for each topic | idea | — |
| RM-4 | Editable shop list | deferred by the parent | low |
| RM-5 | Compact portrait keypad for typed equations; touch-drag check on the Surface Pro | parked | low |
| RM-6 | Dark-mode switch | idea | low |
| RM-7 | Run the Playwright specs in CI | idea | low |

---

### RM-3 Tutorials for each topic

**Idea.** A short tutorial per topic (NC, RD, FDP, PC, EQ) that teaches the method before practice.

**Open questions:** interactive (like the walkthrough) or read-only? Where it is opened (topic tile, Help, first visit)? Does it earn anything? Which examples? (Examples must come from seeded generators and be verified in tests, like all math content.)

### RM-4 Editable shop list

See `progress.md` §10: add, rename and remove rewards in Parent › Rewards; new items need art or the parent's picture; a rule for removing an item with a pending request.

### RM-5 to RM-7

See `progress.md` §10.
