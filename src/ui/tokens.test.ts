import { describe, expect, it } from 'vitest';
import { spaceBefore, splitAround } from './tokens';

const show = (tokens: string[]) => {
  const space = spaceBefore(tokens);
  return tokens.map((t, i) => (space[i] ? ` ${t}` : t)).join('');
};

describe('sentences from tokens', () => {
  it('put no space before closing marks or after opening ones', () => {
    expect(show(['Sam', ',', 'my', 'friend', '(', 'aged', 'ten', ')', ',', 'waved', '.'])).toBe('Sam, my friend (aged ten), waved.');
  });
  it('pair straight inverted commas', () => {
    expect(show(['"', 'Stop', '!', '"', 'shouted', 'Mum', '.'])).toBe('"Stop!" shouted Mum.');
    expect(show(['Mum', 'said', ',', '"', 'Come', 'here', '.', '"'])).toBe('Mum said, "Come here."');
  });
});

describe('dictation sentences', () => {
  it('split around the whole word only', () => {
    expect(splitAround('The answer was not the answer we expected.', 'answer')).toEqual(['The ', ' was not the answer we expected.']);
    expect(splitAround('Recommend it to a friend.', 'recommend')).toEqual(['', ' it to a friend.']);
    expect(splitAround('A co-operate test.', 'co-operate')).toEqual(['A ', ' test.']);
    expect(splitAround('They sat there.', 'the')).toEqual(['They sat there. ', '']);
  });
});
