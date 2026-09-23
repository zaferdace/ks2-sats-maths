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

/** Whether each straight " opens a quotation (the first of a pair) or closes one. */
function opensQuote(tokens: string[], i: number): boolean {
  return tokens.slice(0, i + 1).filter((t) => t === '"').length % 2 === 1;
}

/**
 * Whether `mark` could go in the gap just after token i, judged from the sentence alone (never
 * from the answer, so which gaps are shown gives nothing away). Nothing goes just inside an
 * opening bracket or inverted comma; in front of a full stop or comma only a closing bracket or
 * inverted comma can go; in front of a closing bracket only . ! or ?.
 */
export function gapPossible(tokens: string[], i: number, mark: string): boolean {
  const before = tokens[i];
  const after = tokens[i + 1];
  if (after === undefined) return false;
  if (OPENERS.has(before) || (before === '"' && opensQuote(tokens, i))) return false;
  if (after === '"' || after === '”' || after === '’') return true;
  if (after === ')') return ['.', '!', '?'].includes(mark);
  if (CLOSERS.test(after)) return [')', '”', '"'].includes(mark);
  return true;
}
