# M7 report: stars by level; the smallest number set

Built 2026-09-27 from roadmap items RM-1 and RM-2 (now removed from `docs/roadmap.md`). The parent's decisions are in `progress.md` §4; `requirements.md` and `design.md` were updated first (requirements §15).

## 1. What was built

- **R-RWD-1 stars by level.** Full stars by level: 1, 2, 4, 6, 8, 10 (`config.stars.fullByLevel`). First try with no hint or H1 only = full; second try or H2 = 1; three or more tries or the walkthrough = 0 (`answerQuality`, `starsFor` in `engine/scoring.ts`).
- **Below the current level:** one level below pays at most 1, two or more pay 0. The current level is the higher of the stored level and the highest level adaptive free practice promoted to (`TopicState.freeBest`, optional field, no schema bump). A parent's level lock pays normally. Fixed-level links show stars without this rule and earn no shells.
- **Stars are computed in `finishAttempt`**, where the learner's level is known; the practice reducers no longer set them.
- **R-RWD-4 shells = stars.** The per-star shell table in Parent › Rewards is gone; the page explains the rule instead. Shop defaults 200 and 2,000; devices still holding the old defaults (150, 1,500) get the new ones, prices the parent chose stay.
- **Celebrations** show up to 10 stars (rows of five), "n stars! Brilliant!", "1 star. Nice work!", or a 0-star "You finished it!" line; a below-level answer says "A harder level earns stars/more". The walkthrough note reads "no stars this time". The summary shows stars and questions per topic.
- **R-RWD-3** "perfect assignment" = every answer clean (no longer "all 3 ★").
- **R-NC-2…4 the smallest set.** One answer among the five cards, chosen like multiple choice (radio, 1–5 keys, Enter checks). A card that isn't it is greyed out with "It is in that set, but there's a smaller one." or "It isn't in that set." (`checkSmallest`, codes `NC-CONTAINS` / `NC-NOT-IN`). The walkthrough still shows the nesting and ends "So the smallest set is …". H2 hints for integers and 0 were reworded so they don't give the answer.
- **Natural numbers start at 1**, with no setting: 0 → Whole. The Settings toggle is gone.
- **Fix found on the way:** the top bar's counter gave its icon and number the same React key, which could leave a second star icon showing after a change (visible once 10 stars arrived at once).

## 2. Tests

618 unit/property tests (was 599), 120 e2e on desktop and tablet (+12 on-demand skipped, unchanged), lint clean, engine 97.4 % lines, 247.1 KB gz JS. New: every R-RWD-1 case (quality × level, below-level, lock, links, the guessing bound), stars and `freeBest` in `finishAttempt`, repricing, NC single answer on 1000 seeds per level with both feedback codes, 0 → Whole.

## 3. Assumptions

1. Only adaptive free-practice **promotions** raise the current level (starting at level 3 doesn't).
2. `freeBest` is capped by the parent's max level; it never goes down.
3. Older attempts keep the stars they had (1–3); summaries add them as stored.
4. A device whose stored price equals an old default is treated as never changed.
5. The 0-star and below-level headlines are new copy in `strings.ts` (design.md §5 Celebration).
6. Old NC attempts (every set ticked) still replay in Missed questions; the answer line shows the smallest set.

## 4. Conflicts

None open. `design.md` §1 principle 4 ("every answer earns at least one star") was reworded with the parent's change.

## 5. Deviations

None.

## 6. Commands

```powershell
npm test; npm run lint; npm run build; npm run e2e
```

Pushed to `main`, which deploys to https://kristopherhuber-commits.github.io/math-app/.

## 7. Next

`docs/roadmap.md`: RM-3 tutorials (open questions listed), RM-4 editable shop list, RM-5 Surface Pro checks, RM-6 dark-mode switch, RM-7 e2e in CI.
