// Laying out sentences that are split into words and punctuation marks.

export const OPENERS = new Set(['(', '[', '“', '‘']);
export const CLOSERS = /^[.,!?;:)\]”’…]+$/;

/** Whether a space goes before each token of a sentence split into words and punctuation. */
export function spaceBefore(tokens: string[]): boolean[] {
  let inQuote = false;
  let afterOpener = false;
  return tokens.map((t, i) => {
    let space = i > 0 && !afterOpener;
    if (t === '"') {
      if (inQuote) space = false; // closing quote hugs the word before it
      afterOpener = !inQuote;
      inQuote = !inQuote;
      return space;
    }
    if (CLOSERS.test(t) || t === '-') space = false; // a hyphen joins the words either side
    afterOpener = OPENERS.has(t) || t === '-';
    return space;
  });
}

/** Sentence text from tokens: "Sam (my friend) said, “Hi.”" */
export function joinTokens(tokens: string[]): string {
  const space = spaceBefore(tokens);
  return tokens.map((t, i) => (space[i] ? ` ${t}` : t)).join('');
}

/** Splits a dictation sentence around its word: ["The ", " was loud."]. */
export function splitAround(sentence: string, word: string): [string, string] {
  const escaped = word.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const m = new RegExp(`(^|[^A-Za-z])(${escaped})(?![A-Za-z])`, 'i').exec(sentence);
  if (!m) return [`${sentence} `, ''];
  const start = m.index + m[1].length;
  return [sentence.slice(0, start), sentence.slice(start + word.length)];
}
