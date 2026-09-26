// Figures are checked from their SVG markup: proportions, captions and what is drawn on top.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Block } from '../gen/types';
import { Figure } from './Figure';

type FigureBlock = Parameters<typeof Figure>[0]['block'];

const svg = (block: Block) => renderToStaticMarkup(createElement(Figure, { block: block as FigureBlock }));

const attrs = (s: string): Record<string, string> => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

function viewBox(markup: string) {
  const [x, y, w, h] = markup.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
  return { x, y, w, h };
}

/** Text elements with their position and (generously estimated) width at 15px. */
function texts(markup: string) {
  return [...markup.matchAll(/<text ([^>]*)>(.*?)<\/text>/g)].map((m) => {
    const a = attrs(m[1]);
    const content = m[2].replace(/<[^>]+>/g, '');
    return { x: Number(a.x), y: Number(a.y), anchor: a['text-anchor'] ?? 'start', content, width: content.length * 15 * 0.62 };
  });
}

/** Every label lies inside the view box. */
function clipped(markup: string): string[] {
  const box = viewBox(markup);
  return texts(markup)
    .filter((t) => {
      const left = t.anchor === 'end' ? t.x - t.width : t.anchor === 'middle' ? t.x - t.width / 2 : t.x;
      return left < box.x || left + t.width > box.x + box.w || t.y < box.y + 8 || t.y > box.y + box.h;
    })
    .map((t) => t.content);
}

function drawnRect(labels: [string, string], square?: boolean) {
  const markup = svg({ b: 'rect', labels, ...(square && { square }) });
  const r = attrs(markup.match(/<rect ([^>]*)>/)![1]);
  return { markup, w: Number(r.width), h: Number(r.height) };
}

describe('rectangles', () => {
  it('are drawn with the longer label on the longer side', () => {
    const tall = drawnRect(['3 cm', '11 cm']); // width 3, height 11
    expect(tall.h).toBeGreaterThan(tall.w);
    const wide = drawnRect(['11 cm', '3 cm']);
    expect(wide.w).toBeGreaterThan(wide.h);
    const nearlySquare = drawnRect(['7 cm', '6 cm']);
    expect(nearlySquare.w).toBeGreaterThan(nearlySquare.h);
  });

  it('draw squares as squares', () => {
    const s = drawnRect(['5 cm', '5 cm'], true);
    expect(s.w).toBe(s.h);
    expect(s.markup).toContain('Square 5 cm by 5 cm');
  });

  it('keep extreme proportions within limits and every label in view', () => {
    for (const labels of [['15 cm', '2 cm'], ['2 cm', '15 cm'], ['3 cm', '12 cm'], ['14 cm', '13 cm']] as [string, string][]) {
      const r = drawnRect(labels);
      expect(Math.max(r.w, r.h) / Math.min(r.w, r.h)).toBeLessThanOrEqual(2.5 + 1e-9);
      expect(clipped(r.markup)).toEqual([]);
    }
  });
});

describe('shapes', () => {
  it('say they are not drawn to scale', () => {
    const blocks: Block[] = [
      { b: 'rect', labels: ['8 cm', '5 cm'] },
      { b: 'lshape', labels: ['', '4 cm', '5 cm', '', '14 cm', '12 cm'] },
      { b: 'cuboid', labels: ['12 cm', '8 cm', '10 cm'] },
    ];
    for (const b of blocks) expect(svg(b)).toContain('Not drawn to scale');
  });

  it('keep the labels of an L-shape and a cuboid in view', () => {
    expect(clipped(svg({ b: 'lshape', labels: ['10 cm', '12 cm', '12 cm', '10 cm', '14 cm', '12 cm'] }))).toEqual([]);
    expect(clipped(svg({ b: 'cuboid', labels: ['12 cm', '8 cm', '10 cm'] }))).toEqual([]);
  });
});

/** Every line element with its end points and class. */
function lines(markup: string) {
  return [...markup.matchAll(/<line ([^>]*)>/g)].map((m) => {
    const a = attrs(m[1]);
    return { x1: Number(a.x1), y1: Number(a.y1), x2: Number(a.x2), y2: Number(a.y2), cls: a.class };
  });
}

/** Angle in degrees (0-180) between two lines through a common point. */
function between(p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) {
  const a = Math.atan2(q.y - p.y, q.x - p.x);
  const b = Math.atan2(r.y - p.y, r.x - p.x);
  const d = Math.abs(((b - a) * 180) / Math.PI) % 360;
  return d > 180 ? 360 - d : d;
}

describe('number lines', () => {
  const line = (ticks: number, labels: [number, string][], arrow: number) =>
    svg({ b: 'numberline', ticks, labels: labels.map(([at, text]) => ({ at, text })), arrow });

  it('have a mark for every step and the arrow exactly at its point', () => {
    const markup = line(10, [[0, '3'], [10, '4']], 7);
    const marks = lines(markup).filter((l) => l.cls === 'fig-mark' && l.x1 === l.x2);
    expect(marks).toHaveLength(11);
    const arrow = lines(markup).find((l) => l.cls === 'fig-arrow')!;
    expect(arrow.x1).toBeCloseTo(marks[7].x1, 6);
    const halfway = lines(line(10, [[0, '3'], [10, '4']], 4.5)).find((l) => l.cls === 'fig-arrow')!;
    expect(halfway.x1).toBeCloseTo((marks[4].x1 + marks[5].x1) / 2, 6);
  });

  it('keep long and negative labels in view', () => {
    expect(clipped(line(8, [[0, '9,000,000'], [4, '9,500,000'], [8, '10,000,000']], 3))).toEqual([]);
    expect(clipped(line(12, [[0, '−2'], [4, '−1'], [8, '0'], [12, '1']], 2))).toEqual([]);
    expect(clipped(line(20, [[0, '12'], [10, '12.5'], [20, '13']], 7))).toEqual([]);
  });
});

describe('measuring jugs and thermometers', () => {
  const jug: Block = { b: 'scale', kind: 'jug', ticks: 20, labels: [5, 10, 15, 20].map((at) => ({ at, text: ['500', '1,000', '1,500', '2,000'][at / 5 - 1] })), level: 8, unit: 'ml' };
  const thermometer: Block = { b: 'scale', kind: 'thermometer', ticks: 10, labels: [0, 2, 4, 6, 8, 10].map((at) => ({ at, text: String(at * 5 - 30).replace('-', '−') })), level: 3, unit: '°C' };

  it('fill the jug exactly to the level', () => {
    const markup = svg(jug);
    const marks = lines(markup).filter((l) => l.cls === 'fig-mark');
    const top = lines(markup).find((l) => l.cls === 'fig-water-top')!;
    expect(marks).toHaveLength(20); // every mark above the bottom
    expect(top.y1).toBeCloseTo(marks[7].y1, 6); // the 8th mark up
    expect(markup).toContain('>ml</text>');
  });

  it('fill the thermometer exactly to the level', () => {
    const markup = svg(thermometer);
    const marks = lines(markup).filter((l) => l.cls === 'fig-mark');
    const red = attrs(markup.match(/<rect ([^>]*class="fig-red"[^>]*)>/)![1]);
    expect(marks).toHaveLength(11);
    expect(Number(red.y)).toBeCloseTo(marks[3].y1, 6);
  });

  it('keep their labels in view', () => {
    expect(clipped(svg(jug))).toEqual([]);
    expect(clipped(svg(thermometer))).toEqual([]);
  });
});

describe('column calculations', () => {
  const column: Block = { b: 'column', op: '−', rows: ['6A1B', '4665'], total: 'C354' };

  it('draw a lettered box for each missing digit, lined up by place value', () => {
    const markup = svg(column);
    expect(markup.match(/fig-digit-box/g)).toHaveLength(3);
    for (const letter of ['A', 'B', 'C']) expect(markup).toMatch(new RegExp(`class="fig-box-letter"[^>]*>${letter}<`));
    // The ones digits of both rows and the answer share one x position.
    const rows = new Map<number, number>();
    for (const t of texts(markup)) rows.set(t.y, Math.max(rows.get(t.y) ?? 0, t.x));
    expect(rows.size).toBe(3);
    expect(new Set(rows.values()).size).toBe(1);
    expect(markup).toContain('>−</text>');
  });

  it('keep every digit in view', () => {
    expect(clipped(svg(column))).toEqual([]);
    expect(clipped(svg({ b: 'column', op: '+', rows: ['892', 'A81'], total: 'B773' }))).toEqual([]);
    expect(clipped(svg({ b: 'column', op: '×', rows: ['4AB', '9'], total: '4C94' }))).toEqual([]);
  });
});

describe('cubes', () => {
  const faces = (heights: number[][]) => {
    const markup = svg({ b: 'cubes', heights });
    return { markup, top: (markup.match(/fig-cube-top/g) ?? []).length, all: (markup.match(/<polygon /g) ?? []).length };
  };

  it('show every face of a cuboid that can be seen, and no more', () => {
    const { top, all, markup } = faces([
      [3, 3, 3, 3],
      [3, 3, 3, 3],
    ]);
    expect(top).toBe(8); // 4 × 2 on top
    expect(all).toBe(8 + 4 * 3 + 2 * 3); // top, front and side
    expect(markup).toContain('made of 24 cubes');
  });

  it('show the top of every stack in a stepped shape', () => {
    const heights = [
      [3, 2, 1],
      [2, 1, 0],
    ];
    expect(faces(heights).top).toBe(5);
  });

  it('fit inside the picture', () => {
    const { markup } = faces([
      [3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3],
    ]);
    const box = viewBox(markup);
    for (const [, pts] of markup.matchAll(/points="([^"]+)"/g)) {
      for (const p of pts.split(' ')) {
        const [x, y] = p.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(box.w);
        expect(y).toBeLessThanOrEqual(box.h);
      }
    }
  });
});

describe('regular polygons', () => {
  const corners = (markup: string) =>
    markup
      .match(/<polygon points="([^"]+)"/)![1]
      .split(' ')
      .map((p) => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });

  it('are regular: equal sides and equal angles', () => {
    for (const sides of [5, 6, 8, 9, 10]) {
      const v = corners(svg({ b: 'polygon', sides, mark: 'interior', label: 'a' }));
      expect(v).toHaveLength(sides);
      const lengths = v.map((p, i) => Math.hypot(v[(i + 1) % sides].x - p.x, v[(i + 1) % sides].y - p.y));
      for (const l of lengths) expect(l).toBeCloseTo(lengths[0], 6);
      const inside = between(v[0], v[1], v[sides - 1]);
      expect(inside).toBeCloseTo(((sides - 2) * 180) / sides, 6);
    }
  });

  it('extend a side into a straight line, or draw a diagonal, from the marked corner', () => {
    const exterior = svg({ b: 'polygon', sides: 6, mark: 'exterior', label: 'a' });
    const extension = lines(exterior)[0];
    expect(extension.y1).toBeCloseTo(extension.y2, 6); // along the bottom side
    const v = corners(exterior);
    expect(between(v[0], v[1], { x: extension.x2, y: extension.y2 })).toBeCloseTo(60, 6);
    const diagonal = lines(svg({ b: 'polygon', sides: 5, mark: 'diagonal', label: 'a' }));
    expect(diagonal).toHaveLength(1);
    const spokes = lines(svg({ b: 'polygon', sides: 8, mark: 'centre', label: 'a' }));
    expect(spokes).toHaveLength(8);
  });

  it('keep the label in view', () => {
    for (const mark of ['interior', 'exterior', 'diagonal', 'centre', 'spoke'] as const) {
      for (const sides of [5, 10]) expect(clipped(svg({ b: 'polygon', sides, mark, label: 'a' })), `${mark} ${sides}`).toEqual([]);
    }
    expect(clipped(svg({ b: 'polygon', sides: 6, mark: 'interior', label: '120°' }))).toEqual([]);
  });
});

describe('angles to sort by type', () => {
  it('are drawn exactly, with the reflex angles marked the long way round', () => {
    const angles = [35, 90, 130, 250, 310];
    const markup = svg({ b: 'angleset', angles });
    const arms = lines(markup);
    expect(arms).toHaveLength(10);
    angles.forEach((a, i) => {
      const [p, q] = [arms[2 * i], arms[2 * i + 1]];
      const drawn = between({ x: p.x1, y: p.y1 }, { x: p.x2, y: p.y2 }, { x: q.x2, y: q.y2 });
      expect(drawn).toBeCloseTo(a > 180 ? 360 - a : a, 6);
    });
    const arcs = [...markup.matchAll(/class="fig-arc"/g)];
    expect(arcs).toHaveLength(4); // the right angle has a square mark instead
    expect(markup.match(/A17,17 0 1 0/g)).toHaveLength(2); // two reflex arcs
    expect(markup).toContain('fig-right');
    for (const letter of ['A', 'B', 'C', 'D', 'E']) expect(markup).toContain(`>${letter}</text>`);
    expect(clipped(markup)).toEqual([]);
  });
});

describe('crossing lines', () => {
  it('draw straight lines through one point, with the angles in proportion', () => {
    const markup = svg({ b: 'angles', shape: 'cross', labels: ['40°', '', 'a', '', '60°', ''] });
    const drawn = lines(markup);
    expect(drawn).toHaveLength(3);
    const centre = { x: 210, y: 130 };
    for (const l of drawn) expect((l.x1 + l.x2) / 2).toBeCloseTo(centre.x, 6); // each line passes through the centre
    const angle = between(centre, { x: drawn[0].x1, y: drawn[0].y1 }, { x: drawn[1].x1, y: drawn[1].y1 });
    expect(angle).toBeCloseTo(40, 6);
    expect(markup).toMatch(/class="fig-unknown"[^>]*>a</);
    expect(clipped(markup)).toEqual([]);
  });
});

describe('shapes on a square grid', () => {
  it('draw the shaded shape through grid points', () => {
    const markup = svg({ b: 'grid', cols: 9, rows: 7, shaded: [], shape: [[1, 4], [8, 4], [6, 2], [3, 2]] });
    const cell = attrs(markup.match(/<rect ([^>]*)>/)![1]);
    const size = Number(cell.width);
    const pts = markup.match(/<polygon points="([^"]+)" class="fig-area"/)![1].split(' ');
    expect(pts[1]).toBe(`${1 + 8 * size},${1 + 4 * size}`);
    expect(markup).toContain('Shaded shape on a grid');
  });
});

describe('conversion graphs', () => {
  it('name both axes and draw a plain straight line', () => {
    const markup = svg({
      b: 'line',
      title: 'Miles and kilometres',
      labels: Array.from({ length: 11 }, (_, i) => String(i * 5)),
      values: Array.from({ length: 11 }, (_, i) => i * 8),
      axis: 'Kilometres',
      min: 0,
      max: 80,
      step: 8,
      xAxis: 'Miles',
      dots: false,
    });
    expect(markup).toContain('>Miles</text>');
    expect(markup).not.toContain('fig-dot');
    expect(clipped(markup)).toEqual([]);
  });
});

describe('pie charts', () => {
  const pie: Block = {
    b: 'pie',
    title: 'Favourite sport',
    slices: [
      { label: 'Swimming 135°', turn: 3 / 8 },
      { label: 'Tennis 45°', turn: 1 / 8 },
      { label: 'Dance', turn: 1 / 4 },
      { label: 'Football', turn: 1 / 4 },
    ],
  };

  it('draw every label after every sector, so no sector covers a label', () => {
    const markup = svg(pie);
    const lastSector = markup.lastIndexOf('fig-slice');
    const firstLabel = markup.indexOf('<text');
    expect(lastSector).toBeGreaterThan(0);
    expect(firstLabel).toBeGreaterThan(lastSector);
  });

  it('put a sector name and its angle on two lines', () => {
    const markup = svg(pie);
    expect(markup).toMatch(/<tspan[^>]*>Tennis<\/tspan><tspan[^>]*>45°<\/tspan>/);
    expect(markup).toMatch(/<text[^>]*>Dance<\/text>/);
  });
});
