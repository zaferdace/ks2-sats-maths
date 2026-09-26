import { describe, expect, it } from 'vitest';
import { daysToSats } from '../gen/exam';
import { generatePaper } from '../gen/paper';
import { generateReasoningPaper } from '../gen/reasoning/paper';
import { ratFromString, toDecimalString } from '../math/rational';
import { createAttempt, setAnswer, submitSession, type Attempt } from '../store/model';
import { readiness, recentShare } from './readiness';

/** A finished full paper with the first `right` arithmetic questions answered correctly. */
function arithmetic(id: string, right: number, at: number): Attempt {
  let a = createAttempt('p', 'full', 'READY1', generatePaper('READY1'), at, id);
  for (let i = 0; i < right; i++) {
    const r = ratFromString(a.questions[i].answer);
    const decimal = toDecimalString(r);
    a = setAnswer(a, i, decimal !== null ? { whole: decimal, num: '', den: '' } : { whole: '', num: String(r.n), den: String(r.d) });
  }
  return submitSession(a, at + 1);
}

describe('SATs estimate', () => {
  it('uses the most recent finished papers', () => {
    const old = arithmetic('old', 0, 100);
    const recent = [arithmetic('a', 10, 200), arithmetic('b', 10, 300), arithmetic('c', 10, 400)];
    const share = recentShare([old, ...recent], 'arithmetic');
    expect(share?.papers).toBe(3);
    expect(share!.share).toBeGreaterThan(0.2);
    expect(recentShare([], 'arithmetic')).toBeNull();
  });

  it('needs every paper of a test before it estimates it', () => {
    const rows = readiness([arithmetic('a', 40, 100)]);
    const maths = rows.find((r) => r.id === 'maths')!;
    expect(maths.raw).toBeNull();
    expect(maths.missing).toEqual(['a reasoning paper']);
    const reasoning = submitSession(createAttempt('p', 'full', 'READY2', generateReasoningPaper('READY2'), 150, 'r'), 160);
    const both = readiness([arithmetic('a', 40, 100), reasoning]).find((r) => r.id === 'maths')!;
    // All of Paper 1 right (40 of 40 scaled) and nothing in Papers 2 and 3.
    expect(both.raw).toBe(40);
    expect(both.expected).toBe(58);
    expect(both.max).toBe(110);
  });

  it('counts the days to the first test day', () => {
    expect(daysToSats(new Date(2027, 4, 10, 9).getTime())).toBe(0);
    expect(daysToSats(new Date(2027, 4, 9, 23).getTime())).toBe(1);
    expect(daysToSats(new Date(2026, 8, 26, 12).getTime())).toBe(226);
  });
});
