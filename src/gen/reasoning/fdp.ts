// Fractions, decimals and percentages in context.
import { rat, sub, type Rational } from '../../math/rational';
import { gcd, retry } from '../build';
import type { ReasoningType } from '../types';
import { choices, draft, fmt, money, moneyBox, NAMES, number, nums, ordering, penceAnswer, text } from './helpers';

const frac = (n: number, d: number) => `[[${n}/${d}]]`;

export const shadedFraction: ReasoningType = {
  id: 'r-shaded',
  label: 'Fractions of shapes',
  topic: 'fractions',
  generate(rng, d) {
    const [cols, rows] = d === 2 ? rng.pick([[5, 4], [10, 2], [5, 5], [10, 5]]) : rng.pick([[4, 3], [4, 2], [3, 3], [5, 2], [6, 2], [4, 4]]);
    const cells = cols * rows;
    const shadedCount = retry(() => {
      const k = rng.int(1, cells - 1);
      return d === 2 && (k * 100) % cells !== 0 ? undefined : k;
    });
    const shaded = rng.shuffle(Array.from({ length: cells }, (_, i) => i)).slice(0, shadedCount).sort((a, b) => a - b);
    const grid = { b: 'grid' as const, cols, rows, shaded };
    if (d === 2) {
      return draft(
        [text('What **percentage** of this shape is shaded?'), grid],
        number({ suffix: '%' }),
        nums((shadedCount * 100) / cells),
      );
    }
    if (d === 3) {
      return draft([text('What fraction of this shape is **not** shaded?'), grid], { kind: 'fraction' }, nums(rat(cells - shadedCount, cells)));
    }
    return draft([text('What fraction of this shape is shaded?'), grid], { kind: 'fraction' }, nums(rat(shadedCount, cells)));
  },
};

export const compareFractions: ReasoningType = {
  id: 'r-compare-fractions',
  label: 'Comparing fractions',
  topic: 'fractions',
  generate(rng, d) {
    if (d === 1) {
      return retry(() => {
        const den = rng.pick([3, 4, 5, 6, 8]);
        const num = rng.int(1, den - 1);
        if (gcd(num, den) !== 1) return undefined;
        const k = rng.int(2, 4);
        const right = frac(num * k, den * k);
        const wrong = [frac(num * k + 1, den * k), frac(num + k, den + k), frac(num * k, den * k + k)].filter(
          (w) => w !== right,
        );
        const { input, answer } = choices(rng, [right], wrong);
        return draft([text(`Tick the fraction that is **equivalent** to ${frac(num, den)}.`)], input, answer);
      });
    }
    if (d === 2) {
      return retry(() => {
        const pool: [number, number][] = [];
        for (const den of [5, 6, 7, 8, 9, 10, 12]) for (let n = 1; n < den; n++) if (gcd(n, den) === 1 && 2 * n !== den) pool.push([n, den]);
        const picked = rng.shuffle(pool).slice(0, 5);
        const bigger = picked.filter(([n, den]) => 2 * n > den);
        if (bigger.length !== 2) return undefined;
        const smaller = picked.filter(([n, den]) => 2 * n < den);
        const { input, answer } = choices(
          rng,
          bigger.map(([n, den]) => frac(n, den)),
          smaller.map(([n, den]) => frac(n, den)),
        );
        return draft([text(`Tick the **two** fractions that are **greater than** ${frac(1, 2)}.`)], input, answer);
      });
    }
    return retry(() => {
      const pool: [number, number][] = [];
      for (const den of [3, 4, 5, 6, 8, 10, 12]) for (let n = 1; n < den; n++) if (gcd(n, den) === 1) pool.push([n, den]);
      const picked = rng.shuffle(pool).slice(0, 4);
      const values = picked.map(([n, den]) => Math.round((n / den) * 1_000_000));
      if (new Set(values).size !== 4) return undefined;
      const { input, answer } = ordering(
        rng,
        picked.map(([n, den], i) => ({ text: frac(n, den), value: values[i] })),
      );
      return draft([text('Write these fractions in order, starting with the **smallest**.')], input, answer);
    });
  },
};

export const fdpConvert: ReasoningType = {
  id: 'r-fdp',
  label: 'Fractions, decimals and percentages',
  topic: 'percentages',
  generate(rng, d) {
    if (d === 1) {
      const p = rng.int(1, 19) * 5;
      if (rng.chance(0.5)) {
        return draft([text(`Write **${fmt(rat(p, 100))}** as a percentage.`)], number({ suffix: '%' }), nums(p));
      }
      return draft([text(`Write **${p}%** as a decimal.`)], number({ decimal: true }), nums(rat(p, 100)));
    }
    if (d === 2) {
      const [n, den] = rng.pick([
        [1, 8], [3, 8], [5, 8], [7, 8], [1, 4], [3, 4], [2, 5], [3, 5], [4, 5], [1, 20], [7, 20], [9, 25], [3, 25], [1, 2],
      ]);
      const percent = (n * 100) / den;
      if (Number.isInteger(percent) && rng.chance(0.5)) {
        return draft([text(`Write ${frac(n, den)} as a percentage.`)], number({ suffix: '%' }), nums(percent));
      }
      return draft([text(`Write ${frac(n, den)} as a decimal.`)], number({ decimal: true }), nums(rat(n, den)));
    }
    const p = rng.pick([12, 15, 35, 45, 55, 64, 75, 85, 36, 24]);
    return draft([text(`Write **${p}%** as a fraction.`)], { kind: 'fraction' }, nums(rat(p, 100)));
  },
};

export const percentContext: ReasoningType = {
  id: 'r-percent-context',
  label: 'Percentages in context',
  topic: 'percentages',
  generate(rng, d) {
    if (d === 1) {
      const p = rng.pick([10, 20, 25, 30, 40, 50, 60, 75]);
      const total = retry(() => {
        const t = rng.int(4, 40) * 20;
        return (t * p) % 100 === 0 ? t : undefined;
      });
      return draft(
        [text(`There are **${fmt(total)}** children in a school. **${p}%** of them walk to school.\nHow many children walk to school?`)],
        number({ suffix: 'children' }),
        nums((total * p) / 100),
      );
    }
    if (d === 2) {
      const p = rng.pick([10, 15, 20, 25, 30, 40]);
      const cost = retry(() => {
        const c = rng.int(4, 60) * 20; // whole pounds
        return (c * p) % 100 === 0 ? c : undefined;
      });
      const item = rng.pick(['bike', 'coat', 'scooter', 'tent', 'guitar']);
      return draft(
        [text(`A ${item} costs **£${fmt(cost)}**. In a sale, the price is reduced by **${p}%**.\nWhat is the sale price?`)],
        moneyBox(),
        penceAnswer(cost * (100 - p)), // £cost × (100 − p)% in pence
      );
    }
    const outOf = rng.pick([20, 25, 50]);
    const score = rng.int(Math.ceil(outOf / 2), outOf - 1);
    const name = rng.pick(NAMES);
    return draft(
      [text(`${name} scores **${score}** out of **${outOf}** in a test.\nWhat percentage is that?`)],
      number({ suffix: '%' }),
      nums((score * 100) / outOf),
    );
  },
};

export const fractionContext: ReasoningType = {
  id: 'r-fraction-context',
  label: 'Fractions of amounts in context',
  topic: 'fractions',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const den = rng.pick([3, 4, 5, 6, 8]);
        const num = rng.int(1, den - 1);
        if (gcd(num, den) !== 1) return undefined;
        const total = den * rng.int(3, 8);
        const pet = rng.pick(['a dog', 'a cat', 'a bike', 'a brother']);
        return draft(
          [text(`There are **${total}** children in a class. ${frac(num, den)} of them have ${pet}.\nHow many children have ${pet}?`)],
          number({ suffix: 'children' }),
          nums((total * num) / den),
        );
      }
      if (d === 2) {
        const den = rng.pick([3, 4, 5, 8, 10]);
        const num = rng.int(1, den - 1);
        if (gcd(num, den) !== 1) return undefined;
        const pounds = den * rng.int(2, 12);
        const name = rng.pick(NAMES);
        return draft(
          [text(`${name} has **£${pounds}**. ${name} spends ${frac(num, den)} of it.\nHow much money does ${name} have left?`)],
          moneyBox(),
          penceAnswer(((pounds * (den - num)) / den) * 100),
        );
      }
      const [a, b] = rng.pick([
        [4, 3],
        [5, 4],
        [3, 6],
        [4, 6],
        [5, 10],
        [4, 8],
      ]);
      const total = (a * b) / gcd(a, b) * rng.int(2, 6);
      const red = total / a;
      const green = total / b;
      if (red + green >= total) return undefined;
      return draft(
        [text(`A bag has **${total}** sweets. ${frac(1, a)} of them are red and ${frac(1, b)} are green. The rest are yellow.\nHow many sweets are yellow?`)],
        number({ suffix: 'sweets' }),
        nums(total - red - green),
      );
    });
  },
};

export const decimalContext: ReasoningType = {
  id: 'r-decimal-context',
  label: 'Decimals in context',
  topic: 'decimals',
  generate(rng, d) {
    if (d === 1) {
      const jug = rng.pick([1, 1.5, 2, 2.5]) * 1000;
      const pour = rng.int(5, Math.floor(jug / 50) - 2) * 50 - rng.pick([0, 20, 30]);
      const left: Rational = sub(rat(jug, 1000), rat(pour, 1000));
      return draft(
        [text(`A jug holds **${fmt(rat(jug, 1000))} litres** of juice. ${rng.pick(NAMES)} pours out **${fmt(rat(pour, 1000))} litres**.\nHow much juice is left in the jug?`)],
        number({ decimal: true, suffix: 'litres' }),
        nums(left),
      );
    }
    if (d === 2) {
      const a = rng.int(105, 495);
      const b = rng.int(15, 95) * 10;
      return draft(
        [text(`One parcel weighs **${fmt(rat(a, 100))} kg**. Another parcel weighs **${fmt(rat(b, 100))} kg**.\nWhat is their total mass?`)],
        number({ decimal: true, suffix: 'kg' }),
        nums(rat(a + b, 100)),
      );
    }
    const perMetre = rng.int(9, 39) * 5; // pence
    const metres = rng.int(4, 15);
    return draft(
      [text(`Ribbon costs **${money(perMetre)}** per metre.\nHow much do **${metres} metres** of ribbon cost?`)],
      moneyBox(),
      penceAnswer(perMetre * metres),
    );
  },
};
