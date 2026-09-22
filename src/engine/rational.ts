// Exact rational arithmetic (R-ARCH-2). Always normalized: gcd-reduced, denominator > 0.
// bigint is used because typed input can contain arbitrarily long numbers, and a float
// must never decide whether an answer is correct.

export interface Rational {
  readonly n: bigint;
  readonly d: bigint;
}

const abs = (x: bigint): bigint => (x < 0n ? -x : x);

export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return abs(a * b) / gcd(a, b);
}

function toBig(x: number | bigint): bigint {
  if (typeof x === 'bigint') return x;
  if (!Number.isSafeInteger(x)) throw new RangeError(`not a safe integer: ${x}`);
  return BigInt(x);
}

export function rat(n: number | bigint, d: number | bigint = 1n): Rational {
  let nb = toBig(n);
  let db = toBig(d);
  if (db === 0n) throw new RangeError('zero denominator');
  if (db < 0n) {
    nb = -nb;
    db = -db;
  }
  const g = gcd(nb, db);
  return g > 1n ? { n: nb / g, d: db / g } : { n: nb, d: db };
}

export const ZERO = rat(0);
export const ONE = rat(1);

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational): Rational => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export const neg = (a: Rational): Rational => ({ n: -a.n, d: a.d });

export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0n) throw new RangeError('division by zero');
  return rat(a.n * b.d, a.d * b.n);
}

export const eq = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d;
export const cmp = (a: Rational, b: Rational): -1 | 0 | 1 => {
  const x = a.n * b.d - b.n * a.d;
  return x < 0n ? -1 : x > 0n ? 1 : 0;
};
export const sign = (a: Rational): -1 | 0 | 1 => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export const isZero = (a: Rational): boolean => a.n === 0n;
export const isInteger = (a: Rational): boolean => a.d === 1n;
export const absR = (a: Rational): Rational => ({ n: abs(a.n), d: a.d });

/** Parse "3", "−14/6", "-2.5", "0.125". Returns null for anything else. */
export function parseRational(text: string): Rational | null {
  const s = text.trim().replace(/−/g, '-');
  let m = /^(-?)(\d+)\/(\d+)$/.exec(s);
  if (m) {
    const d = BigInt(m[3]!);
    if (d === 0n) return null;
    const n = BigInt(m[2]!);
    return rat(m[1] ? -n : n, d);
  }
  m = /^(-?)(\d*)(?:\.(\d+))?$/.exec(s);
  if (m && (m[2] || m[3])) {
    const frac = m[3] ?? '';
    const n = BigInt((m[2] || '0') + frac);
    return rat(m[1] ? -n : n, 10n ** BigInt(frac.length));
  }
  return null;
}

/** "p/q" or "p" with a true minus sign (R-DISP-1). */
export function formatRational(a: Rational): string {
  const s = a.n < 0n ? '−' : '';
  const body = a.d === 1n ? `${abs(a.n)}` : `${abs(a.n)}/${a.d}`;
  return s + body;
}

/** Round a rational to `places` decimal places, half away from zero, or truncate. */
export function toFixedPlaces(a: Rational, places: number, mode: 'round' | 'trunc'): Rational {
  const scale = 10n ** BigInt(places);
  const scaled = a.n * scale;
  let q = scaled / a.d; // truncates toward zero
  if (mode === 'round') {
    const r = abs(scaled % a.d) * 2n;
    if (r >= a.d) q += a.n < 0n ? -1n : 1n;
  }
  return rat(q, scale);
}

/** For display only; never use the result to decide correctness. */
export const toNumber = (a: Rational): number => Number(a.n) / Number(a.d);
