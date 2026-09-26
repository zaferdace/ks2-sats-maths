// Shapes and angles; position and direction.
import { retry } from '../build';
import type { Block, ReasoningType } from '../types';
import { article } from '../wording';
import { choices, coordBox, draft, fmt, number, nums, text } from './helpers';

const deg = (n: number) => `${n}°`;
const NOT_TO_SCALE = 'The diagram is **not drawn to scale**.';

export const anglesLinePoint: ReasoningType = {
  id: 'r-angles-line',
  label: 'Angles on a line and around a point',
  topic: 'geometry',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const a = rng.int(25, 155);
        return draft(
          [text(`Two angles are on a straight line. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'line', labels: [deg(a), 'a'] }],
          number({ suffix: '°' }),
          nums(180 - a),
        );
      }
      if (d === 2) {
        if (rng.chance(0.5)) {
          const x = rng.int(20, 80);
          const y = rng.int(20, 80);
          if (x + y > 150) return undefined;
          return draft(
            [text(`Three angles are on a straight line. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'line', labels: [deg(x), 'a', deg(y)] }],
            number({ suffix: '°' }),
            nums(180 - x - y),
          );
        }
        const x = rng.int(60, 150);
        const y = rng.int(50, 140);
        if (360 - x - y < 40) return undefined;
        return draft(
          [text(`Three angles meet at a point. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'point', labels: [deg(x), deg(y), 'a'] }],
          number({ suffix: '°' }),
          nums(360 - x - y),
        );
      }
      // Two equal angles a with two others around a point.
      const x = rng.int(60, 140);
      const y = rng.int(40, 120);
      const rest = 360 - x - y;
      if (rest < 60 || rest % 2) return undefined;
      return draft(
        [text(`Four angles meet at a point. The two angles marked **a** are equal. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'point', labels: [deg(x), 'a', deg(y), 'a'] }],
        number({ suffix: '°' }),
        nums(rest / 2),
      );
    });
  },
};

export const anglesTriangle: ReasoningType = {
  id: 'r-angles-triangle',
  label: 'Angles in triangles',
  topic: 'geometry',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const x = rng.int(30, 100);
        const y = rng.int(25, 100);
        if (180 - x - y < 20) return undefined;
        return draft(
          [text(`Calculate angle **a** in this triangle. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'triangle', labels: [deg(x), deg(y), 'a'] }],
          number({ suffix: '°' }),
          nums(180 - x - y),
        );
      }
      if (d === 2) {
        if (rng.chance(0.5)) {
          const x = rng.int(20, 70);
          return draft(
            [text(`This is a right-angled triangle. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'triangle', labels: ['90°', deg(x), 'a'] }],
            number({ suffix: '°' }),
            nums(90 - x),
          );
        }
        const top = rng.int(10, 70) * 2; // even, so the base angles are whole
        return draft(
          [text(`This triangle is **isosceles**. The two base angles are equal. Calculate angle **a**. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'triangle', labels: ['a', 'a', deg(top)] }],
          number({ suffix: '°' }),
          nums((180 - top) / 2),
        );
      }
      // No diagram: an obtuse angle in an isosceles triangle must be the odd one out.
      const apex = rng.int(50, 70) * 2;
      return draft(
        [text(`In an **isosceles** triangle, one angle is **${apex}°**. The other two angles are equal.\nWhat is the size of each of the other two angles?`)],
        number({ suffix: '°' }),
        nums((180 - apex) / 2),
      );
    });
  },
};

const REGULAR: [string, number][] = [
  ['equilateral triangle', 60],
  ['square', 90],
  ['regular pentagon', 108],
  ['regular hexagon', 120],
  ['regular octagon', 135],
  ['regular decagon', 144],
];

export const anglesPolygon: ReasoningType = {
  id: 'r-angles-polygon',
  label: 'Angles in quadrilaterals and polygons',
  topic: 'geometry',
  generate(rng, d) {
    return retry(() => {
      if (d === 1) {
        const a = rng.int(60, 130);
        const b = rng.int(60, 130);
        const c = rng.int(50, 130);
        const x = 360 - a - b - c;
        if (x < 40 || x > 160) return undefined;
        return draft(
          [text(`Calculate angle **a** in this quadrilateral. ${NOT_TO_SCALE}`), { b: 'angles', shape: 'quad', labels: [deg(a), deg(b), deg(c), 'a'] }],
          number({ suffix: '°' }),
          nums(x),
        );
      }
      if (d === 2) {
        const [name, angle] = rng.pick(REGULAR);
        return draft([text(`What is the size of **each** angle inside ${article(name)} **${name}**?`)], number({ suffix: '°' }), nums(angle));
      }
      const small = rng.int(35, 85);
      return draft(
        [text(`One angle in a **parallelogram** is **${small}°**.\nWhat is the size of the **largest** angle in the parallelogram?`)],
        number({ suffix: '°' }),
        nums(180 - small),
      );
    });
  },
};

const SOLIDS: [string, number, number, number][] = [
  // name, faces, edges, vertices
  ['cube', 6, 12, 8],
  ['cuboid', 6, 12, 8],
  ['triangular prism', 5, 9, 6],
  ['square-based pyramid', 5, 8, 5],
  ['triangular-based pyramid', 4, 6, 4],
  ['pentagonal prism', 7, 15, 10],
];

const QUADS: { name: string; parallelPairs: number; equalSides: boolean; rightAngles: boolean }[] = [
  { name: 'square', parallelPairs: 2, equalSides: true, rightAngles: true },
  { name: 'rectangle', parallelPairs: 2, equalSides: false, rightAngles: true },
  { name: 'rhombus', parallelPairs: 2, equalSides: true, rightAngles: false },
  { name: 'parallelogram', parallelPairs: 2, equalSides: false, rightAngles: false },
  { name: 'trapezium', parallelPairs: 1, equalSides: false, rightAngles: false },
  { name: 'kite', parallelPairs: 0, equalSides: false, rightAngles: false },
];

export const shapeProperties: ReasoningType = {
  id: 'r-shapes',
  label: 'Properties of shapes',
  topic: 'geometry',
  generate(rng, d) {
    if (d === 1) {
      const target = QUADS.find((q) => q.parallelPairs === 1)!;
      const others = rng.shuffle(QUADS.filter((q) => q.parallelPairs !== 1)).slice(0, 3);
      const { input, answer } = choices(rng, [target.name], others.map((q) => q.name));
      return draft([text('Which shape has **exactly one** pair of parallel sides? Tick one.')], input, answer);
    }
    if (d === 2) {
      if (rng.chance(0.5)) {
        const r = rng.int(3, 25);
        const askDiameter = rng.chance(0.5);
        return draft(
          [text(askDiameter ? `The **radius** of a circle is **${r} cm**.\nWhat is its **diameter**?` : `The **diameter** of a circle is **${2 * r} cm**.\nWhat is its **radius**?`)],
          number({ suffix: 'cm' }),
          nums(askDiameter ? 2 * r : r),
        );
      }
      const [name, faces, edges, vertices] = rng.pick(SOLIDS);
      const [what, value] = rng.pick([
        ['faces', faces],
        ['edges', edges],
        ['vertices', vertices],
      ] as const);
      return draft([text(`How many **${what}** does ${article(name)} **${name}** have?`)], number(), nums(value));
    }
    const right = QUADS.filter((q) => q.equalSides).map((q) => q.name);
    const wrong = rng.shuffle(QUADS.filter((q) => !q.equalSides)).slice(0, 3).map((q) => q.name);
    const { input, answer } = choices(rng, right, wrong);
    return draft([text('Tick the **two** shapes that always have **four equal sides**.')], input, answer);
  },
};

const grid = (min: number, max: number, points: { label: string; x: number; y: number }[], join: boolean): Block => ({
  b: 'coords',
  min,
  max,
  points,
  join,
});

export const coordinates: ReasoningType = {
  id: 'r-coordinates',
  label: 'Coordinates',
  topic: 'position',
  generate(rng, d) {
    return retry(() => {
      const [min, max] = d === 1 ? [0, 10] : [-6, 6];
      const x1 = rng.int(min, max - 2);
      const y1 = rng.int(min, max - 2);
      const w = rng.int(2, max - x1);
      const h = rng.int(2, max - y1);
      if (d > 1 && (x1 >= 0 || y1 >= 0 || x1 + w <= 0)) return undefined; // spread over the quadrants
      if (d === 3 && rng.chance(0.5)) {
        // Parallelogram ABCD, corners in order, so D is opposite B: D = A + C − B. ("Three
        // corners of a parallelogram" alone would also allow B + C − A and A + B − C.)
        const shift = rng.int(1, 3);
        const A = { x: x1, y: y1 };
        const B = { x: x1 + w, y: y1 };
        const C = { x: x1 + w + shift, y: y1 + h };
        const D = { x: x1 + shift, y: y1 + h };
        if (C.x > max) return undefined;
        return draft(
          [
            text('**ABCD** is a parallelogram. The corners **A**, **B** and **C** are marked.\nWhat are the coordinates of the fourth corner, **D**?'),
            grid(min, max, [
              { label: 'A', ...A },
              { label: 'B', ...B },
              { label: 'C', ...C },
            ], true),
          ],
          coordBox(),
          nums(D.x, D.y),
        );
      }
      const corners = [
        { label: 'A', x: x1, y: y1 },
        { label: 'B', x: x1 + w, y: y1 },
        { label: 'C', x: x1 + w, y: y1 + h },
        { label: 'D', x: x1, y: y1 + h },
      ];
      const missing = rng.int(0, 3);
      const shown = corners.filter((_, i) => i !== missing);
      const ask = corners[missing];
      return draft(
        [
          text(`Three corners of a rectangle are marked. What are the coordinates of the fourth corner, **${ask.label}**?`),
          grid(min, max, shown, false),
        ],
        coordBox(),
        nums(ask.x, ask.y),
      );
    });
  },
};

export const transformations: ReasoningType = {
  id: 'r-transform',
  label: 'Translation and reflection',
  topic: 'position',
  generate(rng, d) {
    return retry(() => {
      if (d < 3) {
        const [min, max] = d === 1 ? [0, 10] : [-6, 6];
        const x = rng.int(min, max);
        const y = rng.int(min, max);
        const dx = rng.int(-5, 5);
        const dy = rng.int(-5, 5);
        const nx = x + dx;
        const ny = y + dy;
        if (!dx || !dy || nx < min || nx > max || ny < min || ny > max) return undefined;
        if (d === 2 && Math.sign(nx) === Math.sign(x) && Math.sign(ny) === Math.sign(y)) return undefined; // cross an axis
        const move = `${Math.abs(dx)} square${Math.abs(dx) > 1 ? 's' : ''} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} square${Math.abs(dy) > 1 ? 's' : ''} ${dy > 0 ? 'up' : 'down'}`;
        return draft(
          [text(`Point **P** is at **(${fmt(x)}, ${fmt(y)})**. It is translated **${move}**.\nWhat are the new coordinates of P?`), grid(min, max, [{ label: 'P', x, y }], false)],
          coordBox(),
          nums(nx, ny),
        );
      }
      const x = rng.int(-6, 6);
      const y = rng.int(-6, 6);
      if (!x || !y) return undefined;
      const inX = rng.chance(0.5);
      return draft(
        [
          text(`Point **P** is at **(${fmt(x)}, ${fmt(y)})**. It is reflected in the **${inX ? 'x-axis' : 'y-axis'}**.\nWhat are the coordinates of the reflected point?`),
          grid(-6, 6, [{ label: 'P', x, y }], false),
        ],
        coordBox(),
        nums(inX ? x : -x, inX ? -y : y),
      );
    });
  },
};
