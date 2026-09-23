// Calculation in context: money, remainders, multi-step problems, inverse operations.
import { retry } from '../build';
import type { ReasoningType } from '../types';
import { draft, fmt, money, moneyBox, NAMES, number, nums, penceAnswer, text } from './helpers';

const ITEMS = [
  { one: 'pencil', many: 'pencils', lo: 25, hi: 95 },
  { one: 'notebook', many: 'notebooks', lo: 95, hi: 250 },
  { one: 'ruler', many: 'rulers', lo: 45, hi: 150 },
  { one: 'drink', many: 'drinks', lo: 65, hi: 180 },
  { one: 'sandwich', many: 'sandwiches', lo: 150, hi: 350 },
  { one: 'comic', many: 'comics', lo: 120, hi: 399 },
];

/** A price in pence that ends in 0 or 5, like real shop prices. */
const price = (lo: number, hi: number, pick: (a: number, b: number) => number) => pick(Math.ceil(lo / 5), Math.floor(hi / 5)) * 5;

export const moneyProblems: ReasoningType = {
  id: 'r-money',
  label: 'Money problems',
  topic: 'add-sub',
  generate(rng, d) {
    const name = rng.pick(NAMES);
    const [a, b] = rng.shuffle(ITEMS);
    const pa = price(a.lo, a.hi, rng.int);
    const pb = price(b.lo, b.hi, rng.int);
    if (d === 1) {
      return draft(
        [text(`A ${a.one} costs **${money(pa)}** and a ${b.one} costs **${money(pb)}**.\n${name} buys one of each. How much does ${name} spend?`)],
        moneyBox(),
        penceAnswer(pa + pb),
      );
    }
    if (d === 2) {
      return retry(() => {
        const n = rng.int(2, 5);
        const note = [500, 1000, 2000].find((x) => x > n * pa) ?? 0;
        if (!note) return undefined;
        return draft(
          [text(`${name} buys **${n}** ${a.many}. Each ${a.one} costs **${money(pa)}**.\n${name} pays with a **£${note / 100}** note. How much change does ${name} get?`)],
          moneyBox(),
          penceAnswer(note - n * pa),
        );
      });
    }
    const adult = rng.int(16, 30) * 50; // £8.00-£15.00 in 50p steps
    const child = retry(() => {
      const c = rng.int(9, 29) * 25;
      return c < adult ? c : undefined;
    });
    const na = rng.int(2, 3);
    const nc = rng.int(2, 4);
    return draft(
      [
        text('Tickets for a museum cost:'),
        { b: 'table', head: ['Ticket', 'Price'], rows: [['Adult', money(adult)], ['Child', money(child)]] },
        text(`How much do **${na} adult** and **${nc} child** tickets cost altogether?`),
      ],
      moneyBox(),
      penceAnswer(na * adult + nc * child),
    );
  },
};

export const remainders: ReasoningType = {
  id: 'r-remainders',
  label: 'Division with remainders',
  topic: 'mul-div',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const size = rng.int(4, 9);
        const people = rng.int(3, 12) * size + rng.int(1, size - 1);
        return draft(
          [text(`**${people}** children are going on a trip. Each car can take **${size}** children.\nHow many cars are needed?`)],
          number({ suffix: 'cars' }),
          nums(Math.ceil(people / size)),
        );
      }
      if (d === 2) {
        const size = rng.pick([6, 8, 12, 15]);
        const total = rng.int(8, 30) * size + rng.int(1, size - 1);
        return draft(
          [text(`Eggs are packed in boxes of **${size}**. A farmer has **${fmt(total)}** eggs.\nHow many **full** boxes can the farmer fill?`)],
          number({ suffix: 'boxes' }),
          nums(Math.floor(total / size)),
        );
      }
      const piece = rng.int(12, 35);
      const length = rng.int(5, 20) * piece + rng.int(1, piece - 1);
      if (length > 500) return undefined;
      return draft(
        [text(`A ribbon is **${length} cm** long. It is cut into as many pieces **${piece} cm** long as possible.\nHow much ribbon is left over?`)],
        number({ suffix: 'cm' }),
        nums(length % piece),
      );
    });
  },
};

export const multiStep: ReasoningType = {
  id: 'r-multistep',
  label: 'Multi-step problems',
  topic: 'mul-div',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const boxes = rng.int(4, 9);
        const per = rng.int(12, 30);
        const given = rng.int(20, boxes * per - 10);
        return draft(
          [text(`A school buys **${boxes}** boxes of pencils. Each box holds **${per}** pencils.\nThe school gives out **${given}** pencils. How many pencils are left?`)],
          number({ suffix: 'pencils' }),
          nums(boxes * per - given),
        );
      }
      if (d === 2) {
        const rows = rng.int(12, 28);
        const seats = rng.int(14, 32);
        const taken = rng.int(Math.floor(rows * seats * 0.5), rows * seats - 20);
        return draft(
          [text(`A cinema has **${rows}** rows with **${seats}** seats in each row.\n**${fmt(taken)}** seats are taken. How many seats are empty?`)],
          number({ suffix: 'seats' }),
          nums(rows * seats - taken),
        );
      }
      const perBag = rng.pick([4, 5, 6, 8]);
      const bagsPerBox = rng.pick([6, 8, 10, 12]);
      const boxes = rng.int(12, 40);
      const rolls = perBag * bagsPerBox * boxes;
      return draft(
        [text(`A bakery makes **${fmt(rolls)}** bread rolls. It packs **${perBag}** rolls in a bag and **${bagsPerBox}** bags in a box.\nHow many boxes can it fill?`)],
        number({ suffix: 'boxes' }),
        nums(boxes),
      );
    });
  },
};

export const inverse: ReasoningType = {
  id: 'r-inverse',
  label: 'Working backwards',
  topic: 'mul-div',
  generate(rng, d) {
    const name = rng.pick(NAMES);
    if (d === 1) {
      const k = rng.int(3, 9);
      const n = rng.int(12, 48);
      return draft(
        [text(`${name} thinks of a number and multiplies it by **${k}**. The answer is **${fmt(n * k)}**.\nWhat number did ${name} think of?`)],
        number(),
        nums(n),
      );
    }
    if (d === 2) {
      const k = rng.int(3, 9);
      const add = rng.int(5, 40);
      const n = rng.int(6, 25);
      return draft(
        [text(`${name} thinks of a number. ${name} multiplies it by **${k}** and then adds **${add}**. The answer is **${fmt(n * k + add)}**.\nWhat number did ${name} think of?`)],
        number(),
        nums(n),
      );
    }
    const sub = rng.int(4, 20);
    const result = rng.int(6, 40);
    const n = (result + sub) * 2;
    return draft(
      [text(`${name} thinks of a number. ${name} halves it and then subtracts **${sub}**. The answer is **${result}**.\nWhat number did ${name} think of?`)],
      number(),
      nums(n),
    );
  },
};
