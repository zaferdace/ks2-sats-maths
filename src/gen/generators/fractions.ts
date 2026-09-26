import { add, cmp, div, isInt, mul, rat, sub, ZERO, type Rational } from '../../math/rational';
import { frac, fracValue, gcd, lcm, num, op, retry } from '../build';
import type { Rng } from '../rng';
import type { Generated, Part, QuestionType } from '../types';

const DENOMINATORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];

interface F {
  n: number;
  d: number;
  w: number;
}

const value = (f: F): Rational => fracValue(f.n, f.d, f.w);
const part = (f: F): Part => frac(f.n, f.d, f.w);
const fracQ = (parts: Part[], answer: Rational): Generated => ({ parts, answer, kind: 'frac' });

/** Proper fraction n/d with 1 ≤ n < d, optionally in lowest terms. */
function proper(rng: Rng, d: number, lowest = true): F {
  return retry(() => {
    const n = rng.int(1, d - 1);
    return lowest && gcd(n, d) !== 1 ? undefined : { n, d, w: 0 };
  });
}

/** Two denominators where one is a multiple of the other: 4 and 8, 3 and 12. */
function relatedPair(rng: Rng, maxDen = 24): [number, number] {
  return retry(() => {
    const small = rng.pick([2, 3, 4, 5, 6]);
    const big = small * rng.pick([2, 3, 4]);
    if (big > maxDen) return undefined;
    return rng.chance(0.5) ? [small, big] : [big, small];
  });
}

/** Two denominators with neither a multiple of the other and a small common multiple. */
function unrelatedPair(rng: Rng): [number, number] {
  return retry(() => {
    const a = rng.pick(DENOMINATORS);
    const b = rng.pick(DENOMINATORS);
    if (a === b || a % b === 0 || b % a === 0 || lcm(a, b) > 60) return undefined;
    return [a, b];
  });
}

export const fracAddSame: QuestionType = {
  id: 'frac-add-same',
  label: 'Adding fractions (same denominator)',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      const den = rng.int(3, 12);
      if (d === 1) {
        const a = rng.int(1, den - 2);
        const b = rng.int(1, den - 1 - a);
        return fracQ([frac(a, den), op('+'), frac(b, den)], rat(a + b, den));
      }
      if (d === 2) {
        const a = rng.int(2, den - 1);
        const b = rng.int(2, den - 1);
        if (a + b <= den) return undefined;
        return fracQ([frac(a, den), op('+'), frac(b, den)], rat(a + b, den));
      }
      if (rng.chance(0.5)) {
        const [a, b, c] = [rng.int(1, den - 1), rng.int(1, den - 1), rng.int(1, den - 1)];
        return fracQ([frac(a, den), op('+'), frac(b, den), op('+'), frac(c, den)], rat(a + b + c, den));
      }
      const w = rng.int(1, 4);
      const a = rng.int(1, den - 1);
      const b = rng.int(1, den - 1);
      return fracQ([frac(a, den, w), op('+'), frac(b, den)], add(fracValue(a, den, w), rat(b, den)));
    });
  },
};

export const fracSubSame: QuestionType = {
  id: 'frac-sub-same',
  label: 'Subtracting fractions (same denominator)',
  topic: 'fractions',
  generate(rng, d) {
    const den = rng.int(3, 12);
    if (d === 1) {
      const a = rng.int(2, den - 1);
      const b = rng.int(1, a - 1);
      return fracQ([frac(a, den), op('-'), frac(b, den)], rat(a - b, den));
    }
    if (d === 2) {
      const w = rng.int(1, 2);
      const a = rng.int(1, den - 1);
      return fracQ([num(w), op('-'), frac(a, den)], sub(rat(w), rat(a, den)));
    }
    const w = rng.int(3, 5);
    const v = rng.int(1, w - 1);
    const b = rng.int(1, den - 1);
    return fracQ([num(w), op('-'), frac(b, den, v)], sub(rat(w), fracValue(b, den, v)));
  },
};

function addOrSubDiff(rng: Rng, pair: [number, number], subtract: boolean, minSum?: Rational): Generated {
  return retry(() => {
    const a = proper(rng, pair[0]);
    const b = proper(rng, pair[1]);
    const result = subtract ? sub(value(a), value(b)) : add(value(a), value(b));
    if (cmp(result, ZERO) <= 0) return undefined;
    if (minSum && cmp(result, minSum) <= 0) return undefined;
    if (!subtract && !minSum && cmp(result, rat(1)) >= 0) return undefined;
    return fracQ([part(a), op(subtract ? '-' : '+'), part(b)], result);
  });
}

export const fracAddDiff: QuestionType = {
  id: 'frac-add-diff',
  label: 'Adding fractions (different denominators)',
  topic: 'fractions',
  generate(rng, d) {
    if (d === 1) return addOrSubDiff(rng, relatedPair(rng), false);
    if (d === 2) return addOrSubDiff(rng, relatedPair(rng), false, rat(1));
    return retry(() => {
      const pair = unrelatedPair(rng);
      const a = proper(rng, pair[0]);
      const b = proper(rng, pair[1]);
      return fracQ([part(a), op('+'), part(b)], add(value(a), value(b)));
    });
  },
};

export const fracSubDiff: QuestionType = {
  id: 'frac-sub-diff',
  label: 'Subtracting fractions (different denominators)',
  topic: 'fractions',
  generate(rng, d) {
    if (d === 1) return addOrSubDiff(rng, relatedPair(rng, 12), true);
    if (d === 2) return addOrSubDiff(rng, relatedPair(rng, 24), true);
    return addOrSubDiff(rng, unrelatedPair(rng), true);
  },
};

export const fracMixed: QuestionType = {
  id: 'frac-mixed',
  label: 'Mixed numbers (add and subtract)',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      let a: F;
      let b: F;
      let subtract = rng.chance(0.5);
      if (d === 1) {
        const den = rng.int(3, 12);
        const x = rng.int(1, den - 1);
        const y = rng.int(1, den - 1);
        // No exchange: sum of fraction parts stays below 1, or the first part is bigger.
        if (subtract ? x <= y : x + y >= den) return undefined;
        a = { n: x, d: den, w: rng.int(2, 6) };
        b = { n: y, d: den, w: rng.int(1, 4) };
      } else if (d === 2) {
        if (rng.chance(0.6)) {
          const den = rng.int(3, 12);
          const x = rng.int(1, den - 2);
          const y = rng.int(x + 1, den - 1);
          a = { n: x, d: den, w: rng.int(2, 6) }; // exchange needed: x < y
          b = { n: y, d: den, w: rng.int(1, 4) };
          subtract = true;
        } else {
          const [p, q] = relatedPair(rng, 12);
          a = { ...proper(rng, p), w: rng.int(1, 5) };
          b = { ...proper(rng, q), w: rng.int(1, 4) };
          subtract = false;
        }
      } else {
        const [p, q] = rng.chance(0.5) ? relatedPair(rng, 12) : unrelatedPair(rng);
        a = { ...proper(rng, p), w: rng.int(2, 6) };
        b = { ...proper(rng, q), w: rng.int(1, 4) };
      }
      const result = subtract ? sub(value(a), value(b)) : add(value(a), value(b));
      if (cmp(result, ZERO) <= 0 || isInt(result)) return undefined;
      return fracQ([part(a), op(subtract ? '-' : '+'), part(b)], result);
    });
  },
};

export const fracMulFrac: QuestionType = {
  id: 'frac-mul-frac',
  label: 'Multiplying fractions',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const a = rng.int(2, 10);
        const b = rng.int(2, 10);
        return fracQ([frac(1, a), op('×'), frac(1, b)], rat(1, a * b));
      }
      const a = proper(rng, rng.int(3, 10));
      const b = proper(rng, rng.int(3, 10));
      if (a.n === 1 && b.n === 1) return undefined;
      const cancels = gcd(a.n, b.d) > 1 || gcd(b.n, a.d) > 1;
      if (d === 3 && !cancels) return undefined;
      return fracQ([part(a), op('×'), part(b)], mul(value(a), value(b)));
    });
  },
};

export const fracMulWhole: QuestionType = {
  id: 'frac-mul-whole',
  label: 'Multiplying a fraction by a whole number',
  topic: 'fractions',
  generate(rng, d) {
    // A third of the medium level has a whole-number answer, as real papers do: 3/4 × 16 = 12.
    const whole = d === 2 && rng.chance(1 / 3);
    return retry(() => {
      let f: F;
      let k: number;
      if (d === 1) {
        f = { n: 1, d: rng.int(2, 10), w: 0 };
        k = rng.int(2, 12);
      } else if (d === 2) {
        f = proper(rng, rng.int(3, 10));
        if (f.n === 1) return undefined;
        k = whole ? f.d * rng.int(2, 6) : rng.int(2, 9);
      } else {
        f = { ...proper(rng, rng.int(2, 8)), w: rng.int(1, 4) };
        k = rng.int(2, 6);
      }
      const answer = mul(value(f), rat(k));
      if (d > 1 && isInt(answer) !== whole) return undefined;
      const parts = rng.chance(0.5) ? [part(f), op('×'), num(k)] : [num(k), op('×'), part(f)];
      return fracQ(parts, answer);
    });
  },
};

export const fracDivWhole: QuestionType = {
  id: 'frac-div-whole',
  label: 'Dividing a fraction by a whole number',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      const k = rng.int(2, 6);
      let f: F;
      if (d === 1) {
        f = { n: 1, d: rng.int(2, 10), w: 0 };
      } else if (d === 2) {
        f = proper(rng, rng.int(3, 10));
        if (f.n === 1 || f.n % k === 0) return undefined;
      } else if (rng.chance(0.5)) {
        // Numerator divisible by the divisor: 6/7 ÷ 3.
        const m = rng.int(1, 3);
        if (k * m >= 12) return undefined;
        const den = rng.int(k * m + 1, 12);
        if (gcd(k * m, den) !== 1) return undefined;
        f = { n: k * m, d: den, w: 0 };
      } else {
        f = { ...proper(rng, rng.int(2, 8)), w: rng.int(1, 3) };
      }
      return fracQ([part(f), op('÷'), num(k)], div(value(f), rat(k)));
    });
  },
};

export const fracOf: QuestionType = {
  id: 'frac-of',
  label: 'Fractions of amounts',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      let f: F;
      let m: number;
      if (d === 1) {
        f = { n: 1, d: rng.int(2, 10), w: 0 };
        m = rng.int(2, 12);
      } else if (d === 2) {
        f = proper(rng, rng.int(3, 10));
        if (f.n === 1) return undefined;
        m = rng.int(3, 60);
      } else {
        f = proper(rng, rng.pick([8, 9, 12, 15, 16, 20, 25]));
        if (f.n === 1) return undefined;
        m = rng.int(10, 200);
      }
      const amount = f.d * m;
      if (amount > 5000) return undefined;
      return { parts: [part(f), op('of'), num(amount)], answer: rat(f.n * m), kind: 'int' };
    });
  },
};
