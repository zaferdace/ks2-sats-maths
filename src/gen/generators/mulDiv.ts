import { rat } from '../../math/rational';
import { box, nDigits, num, op, pow, retry, sometimesBoxFirst } from '../build';
import type { Rng } from '../rng';
import type { Generated, Part, QuestionType } from '../types';

const intQ = (parts: Part[], answer: number, showMethod = false): Generated => ({
  parts,
  answer: rat(answer),
  kind: 'int',
  ...(showMethod ? { showMethod } : {}),
});

/** Random integer in [min, max] that does not end in 0. */
const notRound = (rng: Rng, min: number, max: number) =>
  retry(() => {
    const v = rng.int(min, max);
    return v % 10 === 0 ? undefined : v;
  });

export const mulDiv01: QuestionType = {
  id: 'mul-div-0-1',
  label: 'Multiplying and dividing by 0 and 1',
  topic: 'mul-div',
  generate(rng, d) {
    const n = nDigits(rng, d + 2);
    const forms: [Part[], number][] = [
      [[num(n), op('×'), num(1)], n],
      [[num(1), op('×'), num(n)], n],
      [[num(n), op('÷'), num(1)], n],
      [[num(n), op('×'), num(0)], 0],
      [[num(0), op('×'), num(n)], 0],
      [[num(0), op('÷'), num(n)], 0],
      [[num(n), op('÷'), num(n)], 1],
    ];
    const [parts, answer] = rng.pick(forms);
    return intQ(parts, answer);
  },
};

export const mulMental: QuestionType = {
  id: 'mul-mental',
  label: 'Mental multiplication',
  topic: 'mul-div',
  generate(rng, d) {
    if (d === 1) {
      if (rng.chance(0.5)) {
        const a = rng.int(2, 9);
        const b = 10 * rng.int(2, 9);
        return intQ(sometimesBoxFirst(rng, d, [num(a), op('×'), num(b)]), a * b);
      }
      const a = rng.int(1, 9);
      const b = rng.int(11, 30);
      return intQ(sometimesBoxFirst(rng, d, [num(a), op('×'), num(b), op('×'), num(10)]), a * b * 10);
    }
    if (d === 2) {
      const a = 10 * rng.int(2, 9);
      const b = 10 * rng.int(2, 9);
      return intQ(sometimesBoxFirst(rng, d, [num(a), op('×'), num(b)]), a * b);
    }
    switch (rng.int(0, 2)) {
      case 0: {
        const a = 100 * rng.int(2, 9);
        const b = 10 * rng.int(2, 9);
        return intQ([num(a), op('×'), num(b)], a * b);
      }
      case 1: {
        const a = rng.int(2, 9);
        const b = 10 * rng.int(2, 9);
        const c = 10 * rng.int(2, 5);
        return intQ([num(a), op('×'), num(b), op('×'), num(c)], a * b * c);
      }
      default: {
        // 125 × 40 (not 50 × 70, which is the medium level)
        const a = rng.pick([25, 125, 250]);
        const b = 10 * rng.int(2, 8);
        return intQ([num(a), op('×'), num(b)], a * b);
      }
    }
  },
};

export const mulShort: QuestionType = {
  id: 'mul-short',
  label: 'Short multiplication',
  topic: 'mul-div',
  generate(rng, d) {
    const a = notRound(rng, 10 ** d + 2, 10 ** (d + 1) - 1);
    const b = rng.int(3, 9);
    return intQ(sometimesBoxFirst(rng, d, [num(a), op('×'), num(b)]), a * b);
  },
};

export const divShort: QuestionType = {
  id: 'div-short',
  label: 'Short division',
  topic: 'mul-div',
  generate(rng, d) {
    const k = d === 1 ? rng.int(2, 9) : rng.int(3, 9);
    const lo = d === 1 ? Math.max(11 * k, 20) : 10 ** d;
    const hi = 10 ** (d + 1) - 1;
    const q = rng.int(Math.ceil(lo / k), Math.floor(hi / k));
    return intQ(sometimesBoxFirst(rng, d, [num(q * k), op('÷'), num(k)]), q);
  },
};

export const mulLong: QuestionType = {
  id: 'mul-long',
  label: 'Long multiplication',
  topic: 'mul-div',
  generate(rng, d) {
    const a = d === 1 ? rng.int(101, 999) : rng.int(1001, 9999);
    const b = d === 1 ? notRound(rng, 11, 29) : d === 2 ? notRound(rng, 12, 49) : notRound(rng, 31, 99);
    return intQ([num(a), op('×'), num(b)], a * b, true);
  },
};

export const divLong: QuestionType = {
  id: 'div-long',
  label: 'Long division',
  topic: 'mul-div',
  generate(rng, d) {
    const k = d === 1 ? rng.int(11, 19) : d === 2 ? notRound(rng, 12, 25) : notRound(rng, 26, 59);
    const [lo, hi] = d === 1 ? [100, 999] : [1000, 9999];
    const q = rng.int(Math.max(Math.ceil(lo / k), 11), Math.floor(hi / k));
    return intQ([num(q * k), op('÷'), num(k)], q, true);
  },
};

export const missingMulDiv: QuestionType = {
  id: 'missing-mul-div',
  label: 'Missing numbers (× and ÷)',
  topic: 'mul-div',
  generate(rng, d) {
    let a: number;
    let b: number;
    if (d === 1) {
      a = rng.int(2, 12);
      b = rng.int(2, 12);
    } else if (d === 2) {
      a = rng.int(2, 12);
      b = rng.chance(0.7) ? 10 * rng.int(2, 9) : 100 * rng.int(2, 9);
    } else {
      a = rng.int(2, 9);
      b = rng.chance(0.5) ? 10 * rng.int(11, 99) : rng.int(101, 999);
    }
    const c = a * b;
    switch (rng.int(0, 3)) {
      case 0: // a × □ = c
        return intQ([num(a), op('×'), box(), op('='), num(c)], b);
      case 1: // □ × b = c
        return intQ([box(), op('×'), num(b), op('='), num(c)], a);
      case 2: // c ÷ □ = a
        return intQ([num(c), op('÷'), box(), op('='), num(a)], b);
      default: // □ ÷ b = a
        return intQ([box(), op('÷'), num(b), op('='), num(a)], c);
    }
  },
};

export const orderOps: QuestionType = {
  id: 'order-ops',
  label: 'Order of operations',
  topic: 'order-powers',
  generate(rng, d) {
    const x = num;
    const times = op('×');
    const plus = op('+');
    const minus = op('-');
    const divide = op('÷');
    const open = op('(');
    const close = op(')');
    if (d === 1) {
      const a = rng.int(2, 60);
      const b = rng.int(2, 12);
      const c = rng.int(2, 12);
      switch (rng.int(0, 2)) {
        case 0:
          return intQ([x(a), plus, x(b), times, x(c)], a + b * c);
        case 1:
          return intQ([x(a), plus, x(b * c), divide, x(c)], a + b);
        default:
          return intQ([x(b), times, x(c), plus, x(a)], b * c + a);
      }
    }
    if (d === 2) {
      const b = rng.int(2, 12);
      const c = rng.int(2, 12);
      switch (rng.int(0, 3)) {
        case 0: {
          const a = b * c + rng.int(1, 60);
          return intQ([x(a), minus, x(b), times, x(c)], a - b * c);
        }
        case 1: {
          const a = rng.int(2, 30);
          const e = rng.int(2, 30);
          const m = rng.int(2, 9);
          return intQ([open, x(a), plus, x(e), close, times, x(m)], (a + e) * m);
        }
        case 2: {
          const e = rng.int(1, b * c - 1);
          return intQ([x(b), times, x(c), minus, x(e)], b * c - e);
        }
        default: {
          const a = b + rng.int(1, 60);
          return intQ([x(a), minus, x(b * c), divide, x(c)], a - b);
        }
      }
    }
    switch (rng.int(0, 2)) {
      case 0: {
        // a × (b − c) + e
        const a = rng.int(2, 9);
        const b = rng.int(10, 30);
        const c = rng.int(2, b - 1);
        const e = rng.int(2, 50);
        return intQ([x(a), times, open, x(b), minus, x(c), close, plus, x(e)], a * (b - c) + e);
      }
      case 1: {
        // (a + b) ÷ c × e
        const c = rng.int(2, 9);
        const k = rng.int(2, 9);
        const a = rng.int(1, c * k - 1);
        const e = rng.int(2, 9);
        return intQ([open, x(a), plus, x(c * k - a), close, divide, x(c), times, x(e)], k * e);
      }
      default: {
        // a − (b + c) × e
        const b = rng.int(2, 9);
        const c = rng.int(2, 9);
        const e = rng.int(2, 6);
        const a = (b + c) * e + rng.int(1, 60);
        return intQ([x(a), minus, open, x(b), plus, x(c), close, times, x(e)], a - (b + c) * e);
      }
    }
  },
};

export const squaresCubes: QuestionType = {
  id: 'squares-cubes',
  label: 'Square and cube numbers',
  topic: 'order-powers',
  generate(rng, d) {
    if (d === 1) {
      const n = rng.int(2, 12);
      return intQ([pow(n, 2)], n * n);
    }
    if (d === 2) {
      if (rng.chance(0.75)) {
        const n = rng.int(2, 5);
        return intQ([pow(n, 3)], n ** 3);
      }
      return intQ([pow(10, 3)], 1000);
    }
    switch (rng.int(0, 2)) {
      case 0: {
        const a = rng.int(2, 10);
        const b = rng.int(2, 5);
        return intQ([pow(a, 2), op('+'), pow(b, 3)], a * a + b ** 3);
      }
      case 1: {
        const a = rng.int(3, 5);
        const b = rng.int(2, Math.floor(Math.sqrt(a ** 3 - 1)));
        return intQ([pow(a, 3), op('-'), pow(b, 2)], a ** 3 - b * b);
      }
      default: {
        const a = rng.int(2, 9);
        const b = rng.int(2, 9);
        return intQ([pow(a, 2), op('×'), num(b)], a * a * b);
      }
    }
  },
};
