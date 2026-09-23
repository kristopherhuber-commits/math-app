// EQ hints (§7.6, R-HELP-5): built from this problem's numbers, letter and terms.
import { describe, expect, it } from 'vitest';
import { eqHint, eqWalkthrough, walkOpText } from '../../src/engine/topics/eq/hints';

const M = '−';

describe('§7.6 hints for 3a + 3 = a + 23', () => {
  const P = '3a + 3 = a + 23';
  it('H1 (Separate) names the variable', () => {
    expect(eqHint(P, 'a', 1)).toEqual({ id: 'eq.separate.h1', params: { variable: 'a' } });
  });
  it('H2 (Separate) moves the a from the right, flipping it to −a, then the +3', () => {
    const h = eqHint(P, 'a', 2);
    expect(h.id).toBe('eq.separate.h2.two');
    expect(h.params).toMatchObject({
      term: 'a',
      from: 'right',
      to: 'left',
      op: 'subtract',
      amount: 'a',
      flipped: `${M}a`,
      term2: '+3',
      to2: 'right',
    });
  });
  it('H1/H2 (Simplify)', () => {
    const line = `3a ${M} a = 23 ${M} 3`;
    expect(eqHint(line, 'a', 1).id).toBe('eq.simplify.h1');
    expect(eqHint(line, 'a', 2)).toEqual({
      id: 'eq.simplify.h2.both',
      params: { variable: 'a', varSide: `3a ${M} a`, constSide: `23 ${M} 3` },
    });
  });
  it('H1/H2 (Solve)', () => {
    expect(eqHint('2a = 20', 'a', 1)).toEqual({ id: 'eq.solve.h1', params: { variable: 'a', c: '2' } });
    expect(eqHint('2a = 20', 'a', 2)).toEqual({ id: 'eq.solve.h2.divide', params: { c: '2', d: '20' } });
  });
  it('H3 ends with the substitution check 3·10 + 3 = 33 and 10 + 23 = 33', () => {
    const steps = eqWalkthrough(P, 'a');
    expect(steps.map((s) => s.line)).toEqual([`3a ${M} a = 23 ${M} 3`, '2a = 20', 'a = 10', P]);
    expect(steps.at(-1)!.explain.params).toMatchObject({
      left: '3·10 + 3',
      leftValue: '33',
      right: '10 + 23',
      rightValue: '33',
    });
  });
});

describe('H3 on the balance scale (R-EQ-PED-1)', () => {
  const P = '3a + 3 = a + 23';
  it('Separate takes 3 and a from both sides; Solve divides both sides by 2', () => {
    const steps = eqWalkthrough(P, 'a');
    expect(steps.map((s) => s.before)).toEqual([P, `3a ${M} a = 23 ${M} 3`, '2a = 20', P]);
    expect(walkOpText(steps[0]!.op!, 'a')).toBe(`${M} 3 ${M} a`);
    expect(steps[1]!.op).toBeNull();
    expect(walkOpText(steps[2]!.op!, 'a')).toBe('÷ 2');
    expect(steps[3]!.op).toBeNull();
  });
  it('a negative divisor is bracketed: ÷ (−3)', () => {
    const steps = eqWalkthrough(`7 ${M} 3z = 13`, 'z');
    expect(walkOpText(steps.find((s) => s.kind === 'SOLVE')!.op!, 'z')).toBe(`÷ (${M}3)`);
  });
  it('clearing fractions multiplies both sides', () => {
    const steps = eqWalkthrough('x/4 + 1 = 3', 'x');
    expect(steps[0]!.kind).toBe('CLEAR_FRACTIONS');
    expect(walkOpText(steps[0]!.op!, 'x')).toBe('× 4');
  });
  it('starts from the learner’s last line and checks against the original', () => {
    const steps = eqWalkthrough(`3a ${M} a = 23 ${M} 3`, 'a', P);
    expect(steps.map((s) => s.kind)).toEqual(['SIMPLIFY', 'SOLVE', 'CHECK']);
    expect(steps.at(-1)!.line).toBe(P);
    expect(steps.at(-1)!.explain.params).toMatchObject({ left: '3·10 + 3', rightValue: '33' });
  });
  it('keeps the unknown on the right when the learner put it there', () => {
    const steps = eqWalkthrough(`3 ${M} 23 = a ${M} 3a`, 'a', P);
    expect(steps.map((s) => s.line)).toEqual([`${M}20 = ${M}2a`, '10 = a', P]);
  });
});

describe('other stages', () => {
  it('Expand names the multiplier and both inner terms', () => {
    const line = `3(y ${M} 2) = y + 8`;
    expect(eqHint(line, 'y', 1)).toEqual({ id: 'eq.expand.h1', params: { k: '3', inner: `y ${M} 2` } });
    expect(eqHint(line, 'y', 2).params).toMatchObject({ k: '3', first: 'y', second: `${M}2` });
  });
  it('Clear fractions uses the lcm of the denominators', () => {
    expect(eqHint(`2p/3 ${M} 1 = p/6 + 2`, 'p', 2)).toEqual({ id: 'eq.clear.h2', params: { m: '6' } });
  });
  it('Solve with a fraction coefficient multiplies by the reciprocal', () => {
    expect(eqHint('x/4 = 2', 'x', 2)).toEqual({ id: 'eq.solve.h2.multiply', params: { m: '4' } });
  });
  it('Separate for 7 − 3z = 13 moves the 7 by subtracting', () => {
    expect(eqHint(`7 ${M} 3z = 13`, 'z', 2).params).toMatchObject({
      term: '+7',
      op: 'subtract',
      flipped: `${M}7`,
    });
  });
  it('walkthrough for a negative fraction answer checks with parentheses', () => {
    const steps = eqWalkthrough('4(w + 1) = 7w + 9', 'w');
    expect(steps.at(-2)!.line).toBe(`w = ${M}5/3`);
    expect(steps.at(-1)!.explain.params.left).toBe(`4·((${M}5/3) + 1)`);
    expect(steps.at(-1)!.explain.params.leftValue).toBe(`${M}8/3`);
  });
});
