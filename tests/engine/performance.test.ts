// R-NF-1: the step checker returns in < 20 ms. Every step of real walkthroughs, at every EQ level, plus
// a wrong line per step, is checked and timed; the slowest must stay under the budget.
import { describe, expect, it } from 'vitest';
import { config } from '../../src/engine/config';
import { checkStep } from '../../src/engine/eq/stepChecker';
import { generateEq } from '../../src/engine/topics/eq/generator';
import { eqWalkthrough } from '../../src/engine/topics/eq/hints';

describe('step checker budget (R-NF-1)', () => {
  it(`every check under ${config.stepCheckerBudgetMs} ms`, () => {
    const cases: [string, string, string, number][] = [];
    for (let level = 1; level <= config.levels.EQ; level++)
      for (let seed = 1; seed <= 25; seed++) {
        const q = generateEq(level, seed);
        let prev = q.text;
        for (const step of eqWalkthrough(q.text, q.variable).filter((w) => w.kind !== 'CHECK')) {
          cases.push([prev, step.line, q.variable, level]);
          cases.push([prev, `${step.line} + 1`, q.variable, level]);
          prev = step.line;
        }
      }
    // Warm up the JIT, then time each check on its own.
    for (const [p, n, v, level] of cases.slice(0, 50))
      checkStep(p, n, { variable: v, level, allowSkipping: false });
    let slowest = 0;
    for (const [p, n, v, level] of cases) {
      const t = performance.now();
      checkStep(p, n, { variable: v, level, allowSkipping: false });
      slowest = Math.max(slowest, performance.now() - t);
    }
    expect(cases.length).toBeGreaterThan(500);
    expect(slowest).toBeLessThan(config.stepCheckerBudgetMs);
  });
});
