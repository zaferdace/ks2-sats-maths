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
