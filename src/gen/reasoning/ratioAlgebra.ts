// Ratio and proportion; algebra.
import { rat } from '../../math/rational';
import { gcd, retry } from '../build';
import type { ReasoningType } from '../types';
import { choices, draft, fmt, moneyBox, NAMES, number, nums, penceAnswer, plural, text, twoNames } from './helpers';

export const recipes: ReasoningType = {
  id: 'r-recipe',
  label: 'Scaling recipes',
  topic: 'ratio',
  generate(rng, d) {
    if (d === 1) {
      // About 15 to 25 g of flour for each pancake.
      const pancakes = rng.pick([6, 8, 10, 12]);
      const k = rng.pick([2, 3]);
      const flour = Math.round((pancakes * rng.int(15, 25)) / 10) * 10;
      return draft(
        [text(`A recipe for **${pancakes}** pancakes uses **${flour} g** of flour.\nHow much flour is needed for **${pancakes * k}** pancakes?`)],
        number({ suffix: 'g' }),
        nums(flour * k),
      );
    }
    if (d === 2) {
      return retry(() => {
        const [from, to] = rng.pick([
          [6, 4],
          [4, 6],
          [6, 9],
          [8, 6],
          [3, 5],
          [5, 8],
        ]);
        // A helping for one person, in grams (a multiple of 5).
        const [food, lo, hi] = rng.pick([
          ['pasta', 70, 100],
          ['rice', 60, 90],
          ['potatoes', 150, 250],
          ['cheese', 20, 50],
        ] as const);
        const amount = rng.int(lo / 5, hi / 5) * 5 * from;
        const answer = (amount * to) / from;
        if (!Number.isInteger(answer) || amount > 1500 || answer > 1500) return undefined;
        return draft(
          [text(`A recipe for **${from}** people uses **${fmt(amount)} g** of ${food}.\nHow many grams of ${food} are needed for **${to}** people?`)],
          number({ suffix: 'g' }),
          nums(answer),
        );
      });
    }
    return retry(() => {
      const biscuits = rng.pick([8, 10, 12, 16]);
      const make = biscuits * rng.pick([1.5, 2.5, 3]);
      const butter = rng.int(6, 15) * 10;
      const sugar = rng.int(3, 9) * 10;
      const flour = rng.int(10, 25) * 10;
      const pick = rng.pick([
        ['butter', butter],
        ['sugar', sugar],
        ['flour', flour],
      ] as const);
      const answer = (pick[1] * make) / biscuits;
      if (!Number.isInteger(answer) || !Number.isInteger(make)) return undefined;
      return draft(
        [
          text(`These ingredients make **${biscuits}** biscuits.`),
          { b: 'table', head: ['Ingredient', 'Amount'], rows: [['Butter', `${butter} g`], ['Sugar', `${sugar} g`], ['Flour', `${flour} g`]] },
          text(`${rng.pick(NAMES)} wants to make **${make}** biscuits. How much **${pick[0]}** is needed?`),
        ],
        number({ suffix: 'g' }),
        nums(answer),
      );
    });
  },
};

export const ratioShare: ReasoningType = {
  id: 'r-ratio-share',
  label: 'Sharing in a ratio',
  topic: 'ratio',
  generate(rng, d) {
    return retry(() => {
      const a = rng.int(1, 5);
      const b = rng.int(2, 7);
      if (a === b || a >= b + 3 || (d === 3 && b <= a)) return undefined; // d3 asks how many more green
      if (gcd(a, b) !== 1) return undefined; // a ratio is given in its simplest form: 2 : 1, never 4 : 2
      const k = rng.int(2, 9);
      if (d === 1) {
        return draft(
          [text(`In a necklace, for every **${plural(a, 'red bead')}** there are **${plural(b, 'blue bead')}**.\nThere are **${a * k}** red beads. How many blue beads are there?`)],
          number({ suffix: 'blue beads' }),
          nums(b * k),
        );
      }
      const [p, q] = twoNames(rng);
      if (d === 2) {
        return draft(
          [text(`${p} and ${q} share **${(a + b) * k}** sweets in the ratio **${a} : ${b}**.\nHow many sweets does ${q} get?`)],
          number({ suffix: 'sweets' }),
          nums(b * k),
        );
      }
      return draft(
        [text(`A box has red and green counters in the ratio **${a} : ${b}**. There are **${(a + b) * k}** counters.\nHow many **more** green counters than red counters are there?`)],
        number({ suffix: 'counters' }),
        nums(Math.abs(b - a) * k),
      );
    });
  },
};

export const scale: ReasoningType = {
  id: 'r-scale',
  label: 'Scale and scale factors',
  topic: 'ratio',
  generate(rng, d) {
    if (d === 1) {
      const w = rng.int(2, 6);
      const l = rng.int(w + 1, 9);
      const f = rng.int(2, 4);
      return draft(
        [text(`A rectangle is **${w} cm** wide and **${l} cm** long. It is enlarged by a **scale factor of ${f}**.\nHow long is the **longer** side of the new rectangle?`)],
        number({ suffix: 'cm' }),
        nums(l * f),
      );
    }
    if (d === 2) {
      const km = rng.pick([2, 5, 10, 20]);
      const cm = rng.int(3, 12);
      const half = rng.chance(0.4);
      const mapCm = half ? rat(cm * 2 + 1, 2) : rat(cm);
      return draft(
        [text(`On a map, **1 cm** stands for **${km} km**. Two towns are **${fmt(mapCm)} cm** apart on the map.\nHow far apart are they in real life?`)],
        number({ decimal: true, suffix: 'km' }),
        nums(rat(mapCm.n * km, mapCm.d)),
      );
    }
    // Real lengths: a car is about 3.5 to 5 m long, a bus about 10 to 12 m.
    const [what, lo, hi] = rng.pick([
      ['car', 350, 500],
      ['car', 350, 500],
      ['bus', 1000, 1200],
    ] as const);
    const ratioTo = rng.pick(what === 'car' ? [10, 20, 25, 50] : [50, 100]);
    const modelCm = rng.int(Math.ceil(lo / ratioTo), Math.floor(hi / ratioTo));
    const realCm = modelCm * ratioTo;
    return draft(
      [text(`A model ${what} is made to a scale of **1 : ${ratioTo}**. The model is **${modelCm} cm** long.\nHow long is the real ${what} in **metres**?`)],
      number({ decimal: true, suffix: 'm' }),
      nums(rat(realCm, 100)),
    );
  },
};

export const formulae: ReasoningType = {
  id: 'r-formula',
  label: 'Using formulae',
  topic: 'algebra',
  generate(rng, d) {
    if (d === 1) {
      const fixed = rng.int(2, 8);
      const perHour = rng.int(2, 6);
      const hours = rng.int(2, 7);
      return draft(
        [text(`Hiring a bike costs **£${fixed}** plus **£${perHour}** for each hour.\nHow much does it cost to hire a bike for **${hours} hours**?`)],
        moneyBox(),
        penceAnswer((fixed + perHour * hours) * 100),
      );
    }
    if (d === 2) {
      const m = rng.int(2, 6);
      const c = rng.int(1, 9);
      const t = rng.int(5, 15);
      return draft(
        [text(`This formula gives the number of chairs, **c**, needed for **t** tables:\n**c = ${m}t + ${c}**\nHow many chairs are needed for **${t}** tables?`)],
        number({ suffix: 'chairs' }),
        nums(m * t + c),
      );
    }
    const start = rng.int(2, 6);
    const perMile = rng.int(2, 4);
    const miles = rng.int(4, 18);
    return draft(
      [text(`A taxi charges **£${start}** plus **£${perMile}** for each mile. A journey costs **£${start + perMile * miles}**.\nHow many miles long was the journey?`)],
      number({ suffix: 'miles' }),
      nums(miles),
    );
  },
};

export const equations: ReasoningType = {
  id: 'r-equation',
  label: 'Solving equations',
  topic: 'algebra',
  generate(rng, d) {
    if (d === 1) {
      const x = rng.int(4, 25);
      const c = rng.int(3, 20);
      return draft(
        [text(`▲ stands for a number.\n**▲ + ▲ + ${c} = ${2 * x + c}**\nWhat number is ▲?`)],
        number({ label: '▲' }),
        nums(x),
      );
    }
    if (d === 2) {
      const a = rng.int(3, 9);
      const b = rng.int(2, 30);
      const n = rng.int(3, 15);
      return draft([text(`**${a}n + ${b} = ${a * n + b}**\nWhat is the value of **n**?`)], number({ label: 'n' }), nums(n));
    }
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    const p = rng.int(2, 6);
    const q = rng.int(2, 5);
    const value = p * a - q * b;
    return draft(
      [text(`**a = ${a}** and **b = ${b}**\nWhat is the value of **${p}a − ${q}b**?`)],
      number({ negative: true }),
      nums(value),
    );
  },
};

export const twoUnknowns: ReasoningType = {
  id: 'r-two-unknowns',
  label: 'Two unknowns',
  topic: 'algebra',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const x = rng.int(6, 25);
        const y = rng.int(2, x - 1);
        return draft(
          [text(`□ and △ stand for two numbers.\n**□ + △ = ${x + y}**\n**□ − △ = ${x - y}**\nWhat are the two numbers?`)],
          { kind: 'number', boxes: [{ label: '□' }, { label: '△' }] },
          nums(x, y),
        );
      }
      if (d === 2) {
        const k = rng.int(2, 5);
        const b = rng.int(3, 12);
        return draft(
          [text(`**a = ${k}b**\n**a + b = ${(k + 1) * b}**\nWhat are the values of **a** and **b**?`)],
          { kind: 'number', boxes: [{ label: 'a' }, { label: 'b' }] },
          nums(k * b, b),
        );
      }
      const big = rng.int(20, 60);
      const small = rng.int(5, big - 3);
      return draft(
        [text(`Two numbers add up to **${big + small}**. The difference between them is **${big - small}**.\nWhat are the two numbers?`)],
        { kind: 'number', boxes: [{ label: 'Larger' }, { label: 'Smaller' }] },
        nums(big, small),
      );
    });
  },
};

export const sequences: ReasoningType = {
  id: 'r-sequence',
  label: 'Number sequences',
  topic: 'algebra',
  generate(rng, d) {
    const intro = 'The numbers in this sequence go up or down by the same amount each time.\nWrite the missing numbers.';
    if (d === 3) {
      const start = rng.int(1, 30); // tenths
      const step = rng.int(2, 9) * 5; // hundredths
      const terms = Array.from({ length: 5 }, (_, i) => rat(start * 10 + step * i, 100));
      const hidden = [1, 3];
      return draft(
        [text(intro)],
        {
          kind: 'number',
          layout: 'sequence',
          boxes: [{ decimal: true }, { decimal: true }],
          tokens: terms.map((t, i) => (hidden.includes(i) ? null : fmt(t))),
        },
        nums(...hidden.map((i) => terms[i])),
      );
    }
    const down = d === 2;
    const step = down ? -rng.int(3, 9) : rng.int(6, 25);
    const start = down ? rng.int(5, 20) : rng.int(3, 40);
    const terms = Array.from({ length: 5 }, (_, i) => start + step * i);
    const hidden = down ? [2, 4] : [1, 2];
    return draft(
      [text(intro)],
      {
        kind: 'number',
        layout: 'sequence',
        boxes: hidden.map(() => ({ negative: down })),
        tokens: terms.map((t, i) => (hidden.includes(i) ? null : fmt(t))),
      },
      nums(...hidden.map((i) => terms[i])),
    );
  },
};

export const patterns: ReasoningType = {
  id: 'r-pattern',
  label: 'Patterns and rules',
  topic: 'algebra',
  generate(rng, d) {
    if (d === 1) {
      const first = rng.int(3, 6);
      const add = rng.int(2, 5);
      const n = rng.int(6, 12);
      return draft(
        [text(`Pattern 1 uses **${first}** matchsticks. Each new pattern uses **${add}** more matchsticks than the pattern before.\nHow many matchsticks are in **pattern ${n}**?`)],
        number({ suffix: 'matchsticks' }),
        nums(first + (n - 1) * add),
      );
    }
    if (d === 2) {
      const start = rng.int(2, 15);
      const add = rng.int(3, 9);
      const n = rng.int(8, 15);
      return draft(
        [text(`A sequence starts at **${start}** and goes up by **${add}** each time.\nWhat is the **${n}th** number in the sequence?`)],
        number(),
        nums(start + (n - 1) * add),
      );
    }
    return retry(() => {
      const start = rng.int(1, 9);
      const add = rng.int(3, 7);
      const k = rng.int(12, 25);
      const inSeq = start + add * k;
      const wrong = [inSeq + 1, inSeq + 2, inSeq - 1].filter((x) => (x - start) % add !== 0);
      if (wrong.length < 3) return undefined;
      const { input, answer } = choices(rng, [fmt(inSeq)], wrong.map((x) => fmt(x)));
      const shown = Array.from({ length: 4 }, (_, i) => fmt(start + add * i)).join(', ');
      return draft([text(`Here is the start of a sequence: **${shown}, …**\nWhich of these numbers is in the sequence? Tick one.`)], input, answer);
    });
  },
};
