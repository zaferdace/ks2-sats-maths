import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Part } from '../gen/types';
import { MathText } from './MathText';

/** What the pupil reads, left to right. */
const read = (parts: Part[]): string[] =>
  renderToStaticMarkup(<MathText parts={parts} box={<b>□</b>} />)
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/);

describe('MathText', () => {
  it('shows a leading answer box first, with no second "="', () => {
    const parts: Part[] = [{ t: 'box' }, { t: 'op', v: '=' }, { t: 'num', v: '7000' }, { t: 'op', v: '-' }, { t: 'num', v: '3' }];
    expect(read(parts)).toEqual(['□', '=', '7,000', '−', '3']);
  });

  it('adds "= □" to a calculation without a box', () => {
    const parts: Part[] = [{ t: 'num', v: '6' }, { t: 'op', v: '×' }, { t: 'num', v: '70' }];
    expect(read(parts)).toEqual(['6', '×', '70', '=', '□']);
  });
});
