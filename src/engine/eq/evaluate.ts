// Direct evaluation of an expression at a value of the variable. This is the independent route
// used to verify generated answers (R-TEST-2): it never goes through the linear form.
import { add, div, mul, neg, sub, type Rational } from '../rational';
import type { Expr } from './parse';

export function evaluate(e: Expr, value: Rational): Rational {
  switch (e.kind) {
    case 'num':
      return e.value;
    case 'var':
      return value;
    case 'paren':
      return evaluate(e.inner, value);
    case 'neg':
      return neg(evaluate(e.arg, value));
    case 'add':
      return add(evaluate(e.left, value), evaluate(e.right, value));
    case 'sub':
      return sub(evaluate(e.left, value), evaluate(e.right, value));
    case 'mul':
      return mul(evaluate(e.left, value), evaluate(e.right, value));
    case 'div':
      return div(evaluate(e.left, value), evaluate(e.right, value));
  }
}
