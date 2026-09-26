// Small grammar helpers for generated question text, and the check the tests run over it.

/** Vowel letters with a consonant sound ("a unit", "a one-off"), and the reverse ("an hour"). */
const CONSONANT_SOUND = /^(?:uni(?![mn])|use|usu|uti|eu|ewe|one\b|once\b)/i;
const VOWEL_SOUND = /^(?:hour|honest|honour|heir)/i;

/** "a" or "an", chosen by the sound the next word starts with: an adverb, a unit, an hour. */
export function article(next: string): 'a' | 'an' {
  const word = next.replace(/^[^A-Za-z]+/, '');
  if (VOWEL_SOUND.test(word)) return 'an';
  if (CONSONANT_SOUND.test(word)) return 'a';
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** The phrase with "a" or "an" in front: "an equilateral triangle". */
export const withArticle = (phrase: string): string => `${article(phrase)} ${phrase}`;

/** Units and counted nouns that must be singular after exactly 1 ("1 litre", "1 minute"). */
const PLURALS = [
  'litres', 'millilitres', 'metres', 'centimetres', 'millimetres', 'kilometres', 'grams', 'kilograms', 'miles',
  'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years', 'degrees', 'pounds', 'squares',
  'children', 'people', 'sweets', 'counters', 'beads', 'bottles', 'boxes', 'bags', 'cars', 'pieces', 'tickets',
  'pencils', 'books', 'goals', 'matchsticks', 'biscuits', 'pancakes', 'tables', 'chairs', 'seats', 'rows', 'eggs',
];
const ONE_PLURAL = new RegExp(`(?<![\\d.,£])\\b1 (?:${PLURALS.join('|')})\\b`, 'g');

/**
 * Grammar slips in generated text: "a" before a vowel sound or "an" before a consonant sound
 * ("a equilateral triangle", "an cube"), and a plural after exactly 1 ("1 litres", "1 minutes").
 * A letter in bold (**A**, **a**) is a label or an unknown, not an article, and a capital A
 * only counts at the start of a sentence, so "Bus A arrives" is fine.
 */
export function wordingProblems(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?<![\w'’])(an?|An?) (?:\*\*|__)?([A-Za-z][\w'’-]*)/g)) {
    const [whole, art, next] = m;
    const before = text.slice(0, m.index).replace(/[ \t*_]+$/, '');
    if (art[0] === 'A' && before && !/[.!?:\n]$/.test(before)) continue;
    if (/^[A-Z]$/.test(next)) continue; // "a B": a label, not a word
    if (art.toLowerCase() !== article(next)) out.push(`"${whole}"`);
  }
  for (const m of text.replace(/\*\*|__/g, '').matchAll(ONE_PLURAL)) out.push(`"${m[0]}"`);
  return out;
}
