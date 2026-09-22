// Equation parser → AST (R-EQ-TYPE-3). Accepts implicit multiplication (3a, 2(x+4), -(m+12)),
// a/4 and (2p)/3 as coefficients, unary minus, spaces, and either hyphen or U+2212 for minus.
import { parseRational, type Rational } from '../rational';

export interface Span {
  start: number;
  end: number;
}

export type Expr =
  | ({ kind: 'num'; value: Rational; decimal: boolean; raw: string } & Span)
  | ({ kind: 'var'; name: string } & Span)
  | ({ kind: 'neg'; arg: Expr } & Span)
  | ({ kind: 'add' | 'sub'; left: Expr; right: Expr } & Span)
  | ({ kind: 'mul'; left: Expr; right: Expr; implicit: boolean } & Span)
  | ({ kind: 'div'; left: Expr; right: Expr } & Span)
  | ({ kind: 'paren'; inner: Expr } & Span);

type TokKind = 'num' | 'var' | '+' | '-' | '*' | '/' | '(' | ')' | '=';
interface Token extends Span {
  kind: TokKind;
  text: string;
}

export interface ParseFailure {
  kind: 'syntax' | 'equals' | 'letter';
  span: Span;
  /** For 'letter': the wrong letter that was used. */
  letter?: string;
}

export interface ParsedEquation {
  text: string;
  left: Expr;
  right: Expr;
}

export type ParseResult = { ok: true; eq: ParsedEquation } | { ok: false; error: ParseFailure };

class SyntaxFailure extends Error {
  constructor(readonly span: Span) {
    super('syntax');
  }
}

const OPS: Record<string, TokKind> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '–': '-',
  '*': '*',
  '×': '*',
  '·': '*',
  '⋅': '*',
  '/': '/',
  '÷': '/',
  '(': '(',
  ')': ')',
  '=': '=',
};

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j]!)) j++;
      const raw = text.slice(i, j);
      if ((raw.match(/\./g) ?? []).length > 1 || raw === '.') throw new SyntaxFailure({ start: i, end: j });
      out.push({ kind: 'num', text: raw, start: i, end: j });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      out.push({ kind: 'var', text: ch.toLowerCase(), start: i, end: i + 1 });
      i++;
      continue;
    }
    const op = OPS[ch];
    if (!op) throw new SyntaxFailure({ start: i, end: i + 1 });
    out.push({ kind: op, text: ch, start: i, end: i + 1 });
    i++;
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(
    private readonly toks: Token[],
    private readonly endPos: number,
  ) {}

  parseAll(): Expr {
    if (this.toks.length === 0) throw new SyntaxFailure({ start: this.endPos, end: this.endPos });
    const e = this.expr();
    const t = this.peek();
    if (t) throw new SyntaxFailure(t);
    return e;
  }

  private peek(): Token | undefined {
    return this.toks[this.pos];
  }

  private expr(): Expr {
    let left = this.term();
    for (let t = this.peek(); t && (t.kind === '+' || t.kind === '-'); t = this.peek()) {
      this.pos++;
      const right = this.term();
      left = { kind: t.kind === '+' ? 'add' : 'sub', left, right, start: left.start, end: right.end };
    }
    return left;
  }

  private term(): Expr {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t && (t.kind === '*' || t.kind === '/')) {
        this.pos++;
        const right = this.unary();
        left =
          t.kind === '*'
            ? { kind: 'mul', left, right, implicit: false, start: left.start, end: right.end }
            : { kind: 'div', left, right, start: left.start, end: right.end };
      } else if (t && (t.kind === 'var' || t.kind === '(')) {
        const right = this.primary();
        left = { kind: 'mul', left, right, implicit: true, start: left.start, end: right.end };
      } else {
        return left;
      }
    }
  }

  private unary(): Expr {
    const t = this.peek();
    if (t?.kind === '-') {
      this.pos++;
      const arg = this.unary();
      return { kind: 'neg', arg, start: t.start, end: arg.end };
    }
    if (t?.kind === '+') {
      this.pos++;
      return this.unary();
    }
    return this.primary();
  }

  private primary(): Expr {
    const t = this.peek();
    if (!t) throw new SyntaxFailure({ start: this.endPos, end: this.endPos });
    if (t.kind === 'num') {
      this.pos++;
      const value = parseRational(t.text);
      if (!value) throw new SyntaxFailure(t);
      return { kind: 'num', value, decimal: t.text.includes('.'), raw: t.text, start: t.start, end: t.end };
    }
    if (t.kind === 'var') {
      this.pos++;
      return { kind: 'var', name: t.text, start: t.start, end: t.end };
    }
    if (t.kind === '(') {
      this.pos++;
      const inner = this.expr();
      const close = this.peek();
      if (close?.kind !== ')') throw new SyntaxFailure(close ?? { start: this.endPos, end: this.endPos });
      this.pos++;
      return { kind: 'paren', inner, start: t.start, end: close.end };
    }
    throw new SyntaxFailure(t);
  }
}

function parseSide(toks: Token[], endPos: number): Expr {
  return new Parser(toks, endPos).parseAll();
}

/** Parse one typed line. Failure kinds map to EQ-D1 (syntax), EQ-D2 (equals) and EQ-D3 (letter). */
export function parseEquation(text: string, variable?: string): ParseResult {
  let toks: Token[];
  try {
    toks = tokenize(text);
  } catch (e) {
    if (e instanceof SyntaxFailure) return { ok: false, error: { kind: 'syntax', span: e.span } };
    throw e;
  }
  const eqIdx = toks.flatMap((t, i) => (t.kind === '=' ? [i] : []));
  const parts: { toks: Token[]; end: number }[] = [];
  let from = 0;
  for (const i of [...eqIdx, toks.length]) {
    parts.push({ toks: toks.slice(from, i), end: toks[i]?.start ?? text.length });
    from = i + 1;
  }
  const sides: Expr[] = [];
  try {
    for (const p of parts) sides.push(parseSide(p.toks, p.end));
  } catch (e) {
    if (e instanceof SyntaxFailure) return { ok: false, error: { kind: 'syntax', span: e.span } };
    throw e;
  }
  if (eqIdx.length !== 1) {
    const t = toks[eqIdx[1] ?? 0];
    return { ok: false, error: { kind: 'equals', span: t ?? { start: 0, end: text.length } } };
  }
  if (variable !== undefined) {
    const wrong = toks.find((t) => t.kind === 'var' && t.text !== variable);
    if (wrong) return { ok: false, error: { kind: 'letter', span: wrong, letter: wrong.text } };
  }
  return { ok: true, eq: { text, left: sides[0]!, right: sides[1]! } };
}

/** Parse a single expression (no '='), used by generators and tests. */
export function parseExpression(text: string): Expr {
  return parseSide(tokenize(text), text.length);
}
