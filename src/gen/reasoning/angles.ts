// More angles: where straight lines cross, types of angle, and angles in regular polygons.
import { rat } from '../../math/rational';
import { retry } from '../build';
import type { InputSpec, ReasoningType } from '../types';
import { choices, draft, fmt, NAMES, number, nums, text } from './helpers';

const deg = (n: number) => `${n}°`;
const NOT_TO_SCALE = 'The diagram is **not drawn to scale**.';

export const anglesCross: ReasoningType = {
  id: 'r-angles-cross',
  label: 'Vertically opposite angles',
  topic: 'geometry',
  generate(rng, d) {
    return retry(() => {
      if (d < 3) {
        // Two lines: the angles go x, 180 − x, x, 180 − x round the point.
        const x = rng.int(35, 145);
        if (Math.abs(x - 90) < 12) return undefined; // clearly not a right angle
        const at = rng.int(0, 3);
        const labels = ['', '', '', ''];
        labels[at] = deg(x);
        if (d === 1) {
          const step = rng.int(1, 3); // 2: vertically opposite; 1 or 3: on a straight line with x
          labels[(at + step) % 4] = 'a';
          return draft(
            [text(`Two straight lines cross. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'cross', labels }],
            number({ suffix: '°' }),
            nums(step === 2 ? x : 180 - x),
          );
        }
        const next = (at + rng.pick([1, 3])) % 4;
        const opposite = (at + 2) % 4;
        const aNext = rng.chance(0.5);
        labels[aNext ? next : opposite] = 'a';
        labels[aNext ? opposite : next] = 'b';
        return draft(
          [text(`Two straight lines cross. Calculate angles **a** and **b**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'cross', labels }],
          { kind: 'number', boxes: [{ label: 'a', suffix: '°' }, { label: 'b', suffix: '°' }] },
          nums(aNext ? 180 - x : x, aNext ? x : 180 - x),
        );
      }
      // Three lines through one point: p, q, r, p, q, r round the point, with p + q + r = 180.
      const p = rng.int(30, 100);
      const q = rng.int(30, 100);
      const r = 180 - p - q;
      if (r < 30) return undefined;
      const labels = ['', '', '', '', '', ''];
      labels[rng.pick([0, 3])] = deg(p);
      labels[rng.pick([1, 4])] = deg(q);
      labels[rng.pick([2, 5])] = 'a';
      const shift = rng.int(0, 5);
      return draft(
        [
          text(`Three straight lines cross at a point. Calculate angle **a**. ${NOT_TO_SCALE}`),
          { b: 'angles', shape: 'cross', labels: labels.map((_, i) => labels[(i + shift) % 6]) },
        ],
        number({ suffix: '°' }),
        nums(r),
      );
    });
  },
};

type AngleType = 'acute' | 'right angle' | 'obtuse' | 'reflex';

const typeOfAngle = (a: number): AngleType | null =>
  a > 0 && a < 90 ? 'acute' : a === 90 ? 'right angle' : a > 90 && a < 180 ? 'obtuse' : a > 180 && a < 360 ? 'reflex' : null;

const TYPES: AngleType[] = ['acute', 'right angle', 'obtuse', 'reflex'];

/** Sizes that are clearly of one type when drawn: nothing close to a right angle or a straight line. */
const CLEAR: Record<Exclude<AngleType, 'right angle'>, number[]> = {
  acute: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
  obtuse: [110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160],
  reflex: [200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330],
};

/** A question answered by ticking one of the four types, in this order. */
const typeChoice = (answer: AngleType): { input: InputSpec; answer: string } => ({
  input: { kind: 'choice', options: [...TYPES], pick: 1 },
  answer: String(TYPES.indexOf(answer)),
});

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export const angleTypes: ReasoningType = {
  id: 'r-angle-types',
  label: 'Acute, obtuse and reflex angles',
  topic: 'geometry',
  generate(rng, d) {
    return retry(() => {
      const target = rng.pick(['acute', 'obtuse', 'reflex'] as const);
      const count = rng.int(1, 2);
      const ask = count === 1 ? `Which angle is **${target}**? Tick one.` : `Tick the **two** ${target} angles.`;
      if (d === 1) {
        // Drawn angles lettered A to E.
        const n = rng.int(4, 5);
        const others = (['acute', 'obtuse', 'reflex'] as const).filter((t) => t !== target);
        const pool = [...others.flatMap((t) => CLEAR[t]), 90];
        const angles = rng.shuffle([...rng.shuffle(CLEAR[target]).slice(0, count), ...rng.shuffle(pool).slice(0, n - count)]);
        if (new Set(angles).size !== n) return undefined;
        const letters = angles.map((_, i) => String.fromCharCode(65 + i));
        const answer = angles.flatMap((a, i) => (typeOfAngle(a) === target ? [i] : [])).join(',');
        return draft([text(`Here are ${n} angles.\n${ask}`), { b: 'angleset', angles }], { kind: 'choice', options: letters, pick: count }, answer);
      }
      if (d === 2) {
        // Sizes near the edges of each type: 95°, 175°, 185°, 90°, 180°.
        const near: Record<string, number[]> = {
          acute: [15, 45, 75, 85, 89],
          obtuse: [95, 100, 135, 170, 175],
          reflex: [185, 190, 225, 270, 350],
        };
        const right = rng.shuffle(near[target]).slice(0, count);
        const wrong = rng.shuffle([...Object.entries(near).filter(([t]) => t !== target).flatMap(([, v]) => v), 90, 180]).slice(0, 5 - count);
        const { input, answer } = choices(rng, right.map(deg), wrong.map(deg));
        return draft([text(count === 1 ? `Which of these angles is **${target}**? Tick one.` : `Tick the **two** angles that are **${target}**.`)], input, answer);
      }
      if (rng.chance(0.5)) {
        // The smaller angle between the hands of a clock at an o'clock time.
        const hour = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
        const angle = Math.min(30 * hour, 360 - 30 * hour);
        const { input, answer } = typeChoice(typeOfAngle(angle)!);
        return draft([text(`A clock shows **${hour} o'clock**.\nWhat type of angle is the **smaller** angle between the hands? Tick one.`)], input, answer);
      }
      // A turn clockwise between two compass points (never a half turn).
      const from = rng.int(0, 7);
      const steps = rng.pick([1, 2, 3, 5, 6, 7]);
      const to = (from + steps) % 8;
      const { input, answer } = typeChoice(typeOfAngle(steps * 45)!);
      const name = rng.pick(NAMES);
      return draft(
        [text(`${name} is facing **${COMPASS[from]}**. ${name} turns **clockwise** until facing **${COMPASS[to]}**.\nWhat type of angle has ${name} turned through? Tick one.`)],
        input,
        answer,
      );
    });
  },
};

const POLYGONS: [string, number][] = [
  ['pentagon', 5],
  ['hexagon', 6],
  ['octagon', 8],
  ['nonagon', 9],
  ['decagon', 10],
];

export const regularPolygons: ReasoningType = {
  id: 'r-regular-polygon',
  label: 'Angles in regular polygons',
  topic: 'geometry',
  generate(rng, d) {
    const [name, n] = rng.pick(POLYGONS);
    const sum = (n - 2) * 180;
    const inside = sum / n;
    const given = `The angles inside a regular ${name} add up to **${fmt(sum)}°**.`;
    const spokes = 'Straight lines join each corner to the centre.';
    if (d === 1) {
      if (rng.chance(0.5)) {
        return draft(
          [text(`This shape is a regular **${name}**. Each angle inside it is **${inside}°**.\nWhat do all the angles inside the ${name} add up to?`), { b: 'polygon', sides: n, mark: 'interior', label: `${inside}°` }],
          number({ suffix: '°' }),
          nums(sum),
        );
      }
      return draft(
        [text(`This shape is a regular **${name}**. ${given}\nCalculate angle **a**.`), { b: 'polygon', sides: n, mark: 'interior', label: 'a' }],
        number({ suffix: '°' }),
        nums(inside),
      );
    }
    if (d === 2) {
      if (rng.chance(0.5)) {
        // Equal angles all the way round the centre.
        return draft(
          [text(`This shape is a regular **${name}**. ${spokes}\nCalculate angle **a**.`), { b: 'polygon', sides: n, mark: 'centre', label: 'a' }],
          number({ suffix: '°' }),
          nums(360 / n),
        );
      }
      return draft(
        [text(`This shape is a regular **${name}**. One side has been extended to make a straight line. ${given}\nCalculate angle **a**.`), { b: 'polygon', sides: n, mark: 'exterior', label: 'a' }],
        number({ suffix: '°' }),
        nums(180 - inside),
      );
    }
    if (rng.chance(0.5)) {
      // An isosceles triangle from the centre: 360 ÷ n at the top, the rest shared by the two equal angles.
      return draft(
        [text(`This shape is a regular **${name}**. ${spokes}\nCalculate angle **a**.`), { b: 'polygon', sides: n, mark: 'spoke', label: 'a' }],
        number({ suffix: '°', decimal: true }),
        nums(rat(180 - 360 / n, 2)),
      );
    }
    return draft(
      [text(`This shape is a regular **${name}**. A straight line joins two of its corners. ${given}\nCalculate angle **a**.`), { b: 'polygon', sides: n, mark: 'diagonal', label: 'a' }],
      number({ suffix: '°', decimal: true }),
      nums(rat(180 - inside, 2)),
    );
  },
};
