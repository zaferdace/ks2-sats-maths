// Exact rational numbers. Every value in this app is small (well under 2^53),
// so numerator and denominator are plain safe integers.

export interface Rational {
  readonly n: number; // numerator, carries the sign
  readonly d: number; // denominator, always > 0
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function checkSafe(v: number): number {
  if (!Number.isSafeInteger(v)) throw new Error(`Unsafe integer in rational arithmetic: ${v}`);
  return v;
}

export function rat(n: number, d = 1): Rational {
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`rat() needs integers, got ${n}/${d}`);
  if (d === 0) throw new Error('Zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: checkSafe(n / g), d: checkSafe(d / g) };
}

export const ZERO = rat(0);
export const ONE = rat(1);

export const add = (a: Rational, b: Rational): Rational => rat(checkSafe(a.n * b.d + b.n * a.d), checkSafe(a.d * b.d));
export const sub = (a: Rational, b: Rational): Rational => rat(checkSafe(a.n * b.d - b.n * a.d), checkSafe(a.d * b.d));
export const mul = (a: Rational, b: Rational): Rational => rat(checkSafe(a.n * b.n), checkSafe(a.d * b.d));
export const div = (a: Rational, b: Rational): Rational => {
  if (b.n === 0) throw new Error('Division by zero');
  return rat(checkSafe(a.n * b.d), checkSafe(a.d * b.n));
};
export const neg = (a: Rational): Rational => rat(-a.n, a.d);
export const pow = (a: Rational, e: number): Rational => {
  let r = ONE;
  for (let i = 0; i < e; i++) r = mul(r, a);
  return r;
};

export const eq = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d;
export const cmp = (a: Rational, b: Rational): number => Math.sign(a.n * b.d - b.n * a.d);
export const isInt = (a: Rational): boolean => a.d === 1;
export const toNumber = (a: Rational): number => a.n / a.d;

/** Number of decimal places needed to write `a` exactly, or null when it does not terminate. */
export function decimalPlaces(a: Rational): number | null {
  let d = a.d;
  let twos = 0;
  let fives = 0;
  while (d % 2 === 0) {
    d /= 2;
    twos++;
  }
  while (d % 5 === 0) {
    d /= 5;
    fives++;
  }
  return d === 1 ? Math.max(twos, fives) : null;
}

/** Plain decimal string ("0.006", "1635", "-2.5") or null when the decimal does not terminate. */
export function toDecimalString(a: Rational): string | null {
  const k = decimalPlaces(a);
  if (k === null) return null;
  const scaled = checkSafe(a.n * (10 ** k / a.d));
  const digits = String(Math.abs(scaled)).padStart(k + 1, '0');
  const intPart = digits.slice(0, digits.length - k);
  const fracPart = k ? digits.slice(digits.length - k).replace(/0+$/, '') : '';
  return (scaled < 0 ? '-' : '') + intPart + (fracPart ? `.${fracPart}` : '');
}

/** Parses "12", "0.06", ".5", "5." (optionally signed). Throws on anything else. */
export function fromDecimalString(s: string): Rational {
  const m = /^(-)?(\d*)(?:\.(\d*))?$/.exec(s.trim());
  if (!m || (!m[2] && !m[3])) throw new Error(`Not a decimal: "${s}"`);
  const fracDigits = m[3] ?? '';
  const r = rat(Number((m[2] || '0') + fracDigits), 10 ** fracDigits.length);
  return m[1] ? neg(r) : r;
}

/** Whole part and proper remainder of a non-negative rational: 9/8 → { w: 1, n: 1, d: 8 }. */
export function toMixed(a: Rational): { w: number; n: number; d: number } {
  if (a.n < 0) throw new Error('toMixed expects a non-negative value');
  return { w: Math.floor(a.n / a.d), n: a.n % a.d, d: a.d };
}

export const ratToString = (a: Rational): string => `${a.n}/${a.d}`;

export function ratFromString(s: string): Rational {
  const m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (!m) throw new Error(`Bad rational string: "${s}"`);
  return rat(Number(m[1]), Number(m[2]));
}
