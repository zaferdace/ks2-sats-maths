// Volume by counting cubes, and area by counting squares on a grid.
import { rat } from '../../math/rational';
import { retry } from '../build';
import type { Rng } from '../rng';
import type { Block, ReasoningType } from '../types';
import { draft, NAMES, number, nums, text } from './helpers';

/**
 * Heights of a shape made of stacks of cubes, back row first. Each stack is no taller than the one
 * behind it or to its left, so the top of every stack can be seen in the drawing.
 */
function staircase(rng: Rng, missing: number): number[][] {
  return retry(() => {
    const rows = rng.int(2, 3);
    const cols = rng.int(2, 4);
    const hs: number[][] = [];
    for (let r = 0; r < rows; r++) {
      hs.push([]);
      for (let c = 0; c < cols; c++) {
        const most = Math.min(r ? hs[r - 1][c] : 3, c ? hs[r][c - 1] : 3);
        hs[r].push(r === 0 && c === 0 ? rng.int(2, 3) : rng.int(0, most));
      }
    }
    const total = hs.flat().reduce((s, h) => s + h, 0);
    const cuboid = hs.every((row) => row.every((h) => h === hs[0][0]));
    // Every row and column keeps at least one cube, so the drawing shows the full length and width.
    const full = hs.every((row) => row[0] > 0) && hs[0].every((h) => h > 0);
    // At least `missing` cubes short of the smallest cuboid round it.
    const gap = rows * cols * hs[0][0] - total;
    return !cuboid && full && total >= 7 && total <= 20 && gap >= missing ? hs : undefined;
  });
}

export const cubeVolume: ReasoningType = {
  id: 'r-cubes',
  label: 'Volume by counting cubes',
  topic: 'measurement',
  generate(rng, d) {
    if (d === 1) {
      const [l, w, h] = [rng.int(2, 5), rng.int(2, 3), rng.int(1, 3)];
      const heights = Array.from({ length: w }, () => Array.from({ length: l }, () => h));
      return draft(
        [text('This cuboid is made from centimetre cubes.\nWhat is its volume?'), { b: 'cubes', heights }],
        number({ suffix: 'cm³' }),
        nums(l * w * h),
      );
    }
    const heights = staircase(rng, d === 3 ? 3 : 1);
    const count = heights.flat().reduce((s, h) => s + h, 0);
    const shape: Block = { b: 'cubes', heights };
    if (d === 2) {
      return draft(
        [text('This shape is made from centimetre cubes stacked on a table. There are no gaps.\nWhat is its volume?'), shape],
        number({ suffix: 'cm³' }),
        nums(count),
      );
    }
    const long = heights[0].length;
    const wide = heights.length;
    const high = heights[0][0];
    const name = rng.pick(NAMES);
    return draft(
      [
        text('This shape is made from cubes stacked on a table. There are no gaps.'),
        shape,
        text(`${name} adds more cubes to make a cuboid **${long} cubes long**, **${wide} cubes wide** and **${high} cubes high**.\nHow many more cubes does ${name} need?`),
      ],
      number({ suffix: 'cubes' }),
      nums(long * wide * high - count),
    );
  },
};

/** Twice the area of a polygon with corners on grid points (shoelace formula). */
const twiceArea = (pts: [number, number][]) =>
  Math.abs(pts.reduce((s, [x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length];
    return s + x * ny - nx * y;
  }, 0));

/** Moves a shape to a random place on a cols × rows grid with at least one square around it. */
function place(rng: Rng, pts: [number, number][], cols: number, rows: number): [number, number][] | undefined {
  const w = Math.max(...pts.map(([x]) => x));
  const h = Math.max(...pts.map(([, y]) => y));
  if (w + 2 > cols || h + 2 > rows) return undefined;
  const dx = rng.int(1, cols - 1 - w);
  const dy = rng.int(1, rows - 1 - h);
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

/** Flips a shape left to right, so slopes go both ways. */
const mirror = (pts: [number, number][]): [number, number][] => {
  const w = Math.max(...pts.map(([x]) => x));
  return pts.map(([x, y]) => [w - x, y]);
};

/** Shapes whose sloping sides cut squares exactly in half: triangles, parallelograms, trapeziums, a house. */
function halfSquareShape(rng: Rng): [number, number][] {
  const kind = rng.pick(['right triangle', 'parallelogram', 'trapezium', 'house', 'triangle']);
  if (kind === 'right triangle') {
    const k = rng.int(3, 6);
    return rng.pick([
      [[0, 0], [0, k], [k, k]],
      [[0, k], [k, k], [k, 0]],
      [[0, 0], [k, 0], [0, k]],
      [[0, 0], [k, 0], [k, k]],
    ] as [number, number][][]);
  }
  if (kind === 'parallelogram') {
    const b = rng.int(3, 6);
    const h = rng.int(2, 4);
    return [[0, h], [b, h], [b + h, 0], [h, 0]];
  }
  if (kind === 'trapezium') {
    const h = rng.int(2, 3);
    const top = rng.int(1, 4);
    return rng.chance(0.5) ? [[0, h], [top + 2 * h, h], [top + h, 0], [h, 0]] : [[0, h], [top + h, h], [top + h, 0], [h, 0]];
  }
  if (kind === 'house') {
    const half = rng.int(1, 3);
    const wall = rng.int(2, 4);
    return [[0, half], [half, 0], [2 * half, half], [2 * half, half + wall], [0, half + wall]];
  }
  const k = rng.int(2, 4);
  return [[0, k], [2 * k, k], [k, 0]];
}

/** Triangles and parallelograms with sides at other slopes: area from base × height. */
function formulaShape(rng: Rng): [number, number][] {
  const b = rng.int(3, 8);
  const h = rng.int(3, 6);
  if (rng.chance(0.6)) return [[0, h], [b, h], [rng.int(0, b), 0]]; // the top corner anywhere above the base
  const slant = rng.pick([1, 2].filter((s) => s !== h));
  return [[0, h], [b, h], [b + slant, 0], [slant, 0]];
}

export const areaBySquares: ReasoningType = {
  id: 'r-area-squares',
  label: 'Area by counting squares',
  topic: 'measurement',
  generate(rng, d) {
    const cols = rng.int(9, 10);
    const rows = rng.int(7, 8);
    if (d === 1) {
      // Two rectangles joined into an L, T or plus shape.
      const cells = retry(() => {
        const set = new Set<number>();
        const add = (x: number, y: number, w: number, h: number) => {
          for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set.add((y + j) * cols + x + i);
        };
        const w1 = rng.int(2, 6);
        const h1 = rng.int(1, 3);
        const x1 = rng.int(1, cols - 1 - w1);
        const y1 = rng.int(1, rows - 1 - h1);
        add(x1, y1, w1, h1);
        const w2 = rng.int(1, 3);
        const h2 = rng.int(2, 4);
        const x2 = rng.int(x1 - w2 + 1, x1 + w1 - 1);
        const y2 = rng.pick([y1 - h2 + 1, y1 + h1 - 1, y1]);
        if (x2 < 1 || y2 < 1 || x2 + w2 > cols - 1 || y2 + h2 > rows - 1) return undefined;
        add(x2, y2, w2, h2);
        const xs = [...set].map((i) => i % cols);
        const ys = [...set].map((i) => Math.floor(i / cols));
        const box = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
        return set.size >= 8 && set.size <= 22 && box !== set.size ? [...set].sort((a, b) => a - b) : undefined;
      });
      return draft(
        [text('The shaded shape is drawn on a grid of 1 cm squares.\nWhat is its area?'), { b: 'grid', cols, rows, shaded: cells }],
        number({ suffix: 'cm²' }),
        nums(cells.length),
      );
    }
    const shape = retry(() => {
      const raw = d === 2 ? halfSquareShape(rng) : formulaShape(rng);
      return place(rng, rng.chance(0.5) ? mirror(raw) : raw, cols, rows);
    });
    const grid: Block = { b: 'grid', cols, rows, shaded: [], shape };
    const what = shape.length === 3 ? 'triangle' : 'shape';
    return draft(
      [text(`The shaded ${what} is drawn on a grid of 1 cm squares.\nWhat is its area?`), grid],
      number({ decimal: true, suffix: 'cm²' }),
      nums(rat(twiceArea(shape), 2)),
    );
  },
};
