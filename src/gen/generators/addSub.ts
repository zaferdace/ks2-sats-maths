import { rat } from '../../math/rational';
import { box, carries, digitsOf, exchanges, nDigits, num, op, retry } from '../build';
import type { Generated, QuestionType } from '../types';

const intAnswer = (v: number) => rat(v);

export const addColumn: QuestionType = {
  id: 'add-column',
  label: 'Addition',
  topic: 'add-sub',
  generate(rng, d) {
    return retry<Generated>(() => {
      const a = nDigits(rng, d === 1 ? 3 : d === 2 ? 4 : 5);
      const b = nDigits(rng, d === 1 ? 3 : d === 2 ? 4 : rng.pick([4, 5]));
      if (carries(a, b) < d - 1) return undefined;
      return { parts: [num(a), op('+'), num(b)], answer: intAnswer(a + b), kind: 'int' };
    });
  },
};

export const addThree: QuestionType = {
  id: 'add-three',
  label: 'Adding three numbers',
  topic: 'add-sub',
  generate(rng, d) {
    let ns: number[];
    if (d === 1) {
      ns = [rng.int(11, 99), rng.int(11, 99), rng.int(11, 99)];
    } else if (d === 2) {
      // Sometimes the 5,555 + 555 + 55 pattern.
      const r = rng.int(2, 9);
      ns = rng.chance(0.25) ? [r * 1111, r * 111, r * 11] : [nDigits(rng, 4), nDigits(rng, 3), nDigits(rng, 2)];
    } else {
      ns = [nDigits(rng, 5), nDigits(rng, 4), nDigits(rng, 3)];
    }
    return {
      parts: [num(ns[0]), op('+'), num(ns[1]), op('+'), num(ns[2])],
      answer: intAnswer(ns[0] + ns[1] + ns[2]),
      kind: 'int',
    };
  },
};

export const subColumn: QuestionType = {
  id: 'sub-column',
  label: 'Subtraction',
  topic: 'add-sub',
  generate(rng, d) {
    return retry<Generated>(() => {
      let a: number;
      let b: number;
      if (d === 1) {
        a = rng.chance(0.5) ? nDigits(rng, 2) : nDigits(rng, 3);
        b = nDigits(rng, 2);
      } else if (d === 2) {
        a = nDigits(rng, 4);
        b = nDigits(rng, 4);
        if (exchanges(a, b) < 1) return undefined;
      } else {
        // Zeros in the middle of the larger number: 40,003 − 12,478.
        const ds = digitsOf(nDigits(rng, 5));
        for (let i = 1; i <= 3; i++) if (rng.chance(0.5)) ds[i] = 0;
        a = Number(ds.join(''));
        b = nDigits(rng, rng.pick([4, 5]));
        if (!ds.slice(1, 4).includes(0) || exchanges(a, b) < 2) return undefined;
      }
      if (b >= a) return undefined;
      return { parts: [num(a), op('-'), num(b)], answer: intAnswer(a - b), kind: 'int' };
    });
  },
};

export const subRound: QuestionType = {
  id: 'sub-round',
  label: 'Subtracting from a round number',
  topic: 'add-sub',
  generate(rng, d) {
    let a: number;
    let b: number;
    if (d === 1) {
      a = 1000;
      b = rng.chance(0.5) ? 100 * rng.int(1, 9) : 10 * rng.int(11, 99);
    } else if (d === 2) {
      a = 1000 * rng.int(2, 9);
      b = rng.chance(0.3) ? 100 * rng.int(1, 9) : rng.int(101, 999);
    } else {
      a = rng.pick([10000, 100000]);
      b = a === 10000 ? rng.int(1001, 9999) : rng.int(10001, 99999);
    }
    return { parts: [num(a), op('-'), num(b)], answer: intAnswer(a - b), kind: 'int' };
  },
};

export const missingAddSub: QuestionType = {
  id: 'missing-add-sub',
  label: 'Missing numbers (+ and −)',
  topic: 'add-sub',
  generate(rng, d) {
    const [lo, hi] = d === 1 ? [10, 999] : d === 2 ? [100, 9999] : [1000, 99999];
    return retry<Generated>(() => {
      const a = rng.int(lo, hi);
      const b = d >= 2 && rng.chance(0.3) ? rng.pick([10, 100, 1000]) : rng.int(lo, hi);
      switch (rng.int(0, 3)) {
        case 0: // □ + b = c
          return { parts: [box(), op('+'), num(b), op('='), num(a + b)], answer: intAnswer(a), kind: 'int' };
        case 1: // a + □ = c
          return { parts: [num(a), op('+'), box(), op('='), num(a + b)], answer: intAnswer(b), kind: 'int' };
        case 2: // □ − b = c
          return { parts: [box(), op('-'), num(b), op('='), num(a)], answer: intAnswer(a + b), kind: 'int' };
        default: {
          // a − □ = c
          if (a === b) return undefined;
          const big = Math.max(a, b);
          const small = Math.min(a, b);
          return { parts: [num(big), op('-'), box(), op('='), num(small)], answer: intAnswer(big - small), kind: 'int' };
        }
      }
    });
  },
};
