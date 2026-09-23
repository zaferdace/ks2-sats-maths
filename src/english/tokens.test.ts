import { describe, expect, it } from 'vitest';
import { gapPossible, joinTokens as show, splitAround } from './tokens';

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

describe('gaps shown for a punctuation mark', () => {
  const speech = ['“', 'It', 'is', 'time', 'to', 'go', 'home', '”', 'said', 'Mum', '.'];
  it('never depend on the answer', () => {
    // Inside the closing inverted commas a comma can go, so that gap is always shown.
    expect(gapPossible(speech, 6, ',')).toBe(true);
    // Just inside the opening inverted commas nothing goes.
    expect(gapPossible(speech, 0, ',')).toBe(false);
    // In front of the full stop only a closing mark could go.
    expect(gapPossible(speech, 9, ',')).toBe(false);
    expect(gapPossible(['The', 'cake', '(', 'which', 'Grace', 'baked', 'was', 'lovely', '.'], 7, ')')).toBe(true);
    // No gap after the last token.
    expect(gapPossible(speech, 10, '.')).toBe(false);
  });
});

