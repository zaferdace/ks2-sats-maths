// Evaluates a prompt as the pupil sees it ("2 − 3/8 = 1 5/8", "35% of 1,480 = 518") with plain
// JavaScript numbers. The property tests use it beside evaluate.ts: it shares nothing with the
// generators or the exact evaluator (no rationals, no parts), so a bug in the rational arithmetic
// or in the rendering cannot pass unnoticed. Only the tests import it.

// Fractions (3/8), numbers with thousands commas and optional decimals (1,480 · 0.006), operators.
// A number of four or more digits without its commas does not match as one token, so it fails.
const TOKEN = /(\d+\/\d+|\d{1,3}(?:,\d{3})*(?:\.\d+)?|of|[()+−×÷=%²³□])/y;
const FRACTION = /^\d+\/\d+$/;
const NUMBER = /^[\d,]+(?:\.\d+)?$/;
const WHOLE = /^[\d,]+$/;

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === ' ') {
      i++;
      continue;
    }
    TOKEN.lastIndex = i;
    const m = TOKEN.exec(text);
    if (!m) throw new Error(`Cannot read "${text.slice(i)}" in "${text}"`);
    tokens.push(m[1]);
    i = TOKEN.lastIndex;
  }
  return tokens;
}

const fractionValue = (t: string): number => {
  const [n, d] = t.split('/').map(Number);
  return n / d;
};

/** Value of an expression without "=": brackets first, then powers and %, then × ÷ "of", then + −. */
export function evaluateText(text: string): number {
  const tokens = tokenize(text);
  let i = 0;
  const peek = (): string | undefined => tokens[i];
  const take = (): string => {
    const t = tokens[i++];
    if (t === undefined) throw new Error(`"${text}" ends too soon`);
    return t;
  };

  function sum(): number {
    let v = product();
    while (peek() === '+' || peek() === '−') v = take() === '+' ? v + product() : v - product();
    return v;
  }

  function product(): number {
    let v = operand();
    while (peek() === '×' || peek() === '÷' || peek() === 'of') v = take() === '÷' ? v / operand() : v * operand();
    return v;
  }

  function operand(): number {
    const t = take();
    if (t === '(') {
      const v = sum();
      if (take() !== ')') throw new Error(`Unclosed bracket in "${text}"`);
      return v;
    }
    if (FRACTION.test(t)) return fractionValue(t);
    if (!NUMBER.test(t)) throw new Error(`Unexpected "${t}" in "${text}"`);
    const v = Number(t.replace(/,/g, ''));
    const after = peek();
    // A whole number followed by a fraction is a mixed number: 2 1/9.
    if (after !== undefined && FRACTION.test(after) && WHOLE.test(t)) return v + fractionValue(take());
    if (after !== '%' && after !== '²' && after !== '³') return v;
    take();
    return after === '%' ? v / 100 : after === '²' ? v ** 2 : v ** 3;
  }

  const v = sum();
  if (i !== tokens.length) throw new Error(`Unexpected "${tokens[i]}" in "${text}"`);
  return v;
}

/** Plain numbers agree to 1e-9, relative to their size. */
export const closeTo = (a: number, b: number): boolean =>
  Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** Whether both sides of a one-"=" statement agree: "□ = 6 × 70" with the box filled in. */
export function textHolds(text: string): boolean {
  const sides = text.split('=');
  if (sides.length !== 2) throw new Error(`Expected one "=" in "${text}"`);
  return closeTo(evaluateText(sides[0]), evaluateText(sides[1]));
}
