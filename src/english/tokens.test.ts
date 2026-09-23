import { describe, expect, it } from 'vitest';
import { joinTokens as show, splitAround } from './tokens';

describe('sentences from tokens', () => {
  it('put no space before closing marks or after opening ones', () => {
    expect(show(['Sam', ',', 'my', 'friend', '(', 'aged', 'ten', ')', ',', 'waved', '.'])).toBe('Sam, my friend (aged ten), waved.');
  });
  it('join hyphens and space dashes', () => {
    expect(show(['a', 'bad', '-', 'tempered', 'parrot', '.'])).toBe('a bad-tempered parrot.');
    expect(show(['The', 'fox', '–', 'hungry', 'and', 'tired', '–', 'crept', 'away', '.'])).toBe('The fox – hungry and tired – crept away.');
    expect(show(['Mr', 'Hughes', 'said', ',', '“', 'Tidy', 'up', ',', 'please', '.', '”'])).toBe('Mr Hughes said, “Tidy up, please.”');
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
