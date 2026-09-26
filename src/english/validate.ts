// Structural checks for English content. They cannot tell whether a grammar tag is right, only
// whether an entry is well formed and self-consistent, so content is also read by a person.
import { normText, TEXT_MAX } from '../answer/answer';
import { withArticle } from '../gen/wording';
import { gapPossible, joinTokens } from './tokens';
import {
  GPS_ITEM_TYPES,
  READING_DOMAINS,
  SPELLING_GROUPS,
  TAGS,
  TENSES,
  type GpsItem,
  type GrammarSentence,
  type ReadingDomain,
  type ReadingQuestion,
  type ReadingText,
  type Span,
  type SpellingWord,
} from './types';

const PUNCT = /^[.,!?;:()"'‘’“”—–-]+$/;
const LEVELS = [1, 2, 3];
const RELATIVE_WORDS = ['who', 'whom', 'which', 'that', 'whose', 'where', 'when'];

export const words = (text: string): number => text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

/** The letter keyboard has letters, space, apostrophe and hyphen only, up to 40 characters. */
export const typeable = (answer: string): boolean => {
  const t = normText(answer);
  return t.length <= TEXT_MAX && /^[a-z' -]+$/.test(t);
};


function spanOk(span: Span | undefined, s: GrammarSentence, label: string, out: string[]): void {
  if (!span) return;
  const [a, b] = span;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b > s.tokens.length || a >= b) {
    out.push(`${label}: bad span [${a}, ${b}]`);
    return;
  }
  if (s.tokens[a][1] === 'punct' || s.tokens[b - 1][1] === 'punct') out.push(`${label}: span starts or ends with punctuation`);
}

export function checkSentence(s: GrammarSentence): string[] {
  const out: string[] = [];
  if (!/^gs\d{3,}$/.test(s.id)) out.push('id must look like gs001');
  if (!LEVELS.includes(s.level)) out.push('level must be 1, 2 or 3');
  if (!Array.isArray(s.tokens) || s.tokens.length < 4) return [...out, 'too few tokens'];
  s.tokens.forEach(([word, tag], i) => {
    if (typeof word !== 'string' || !word || /\s/.test(word)) out.push(`token ${i} is empty or has a space`);
    if (!(TAGS as readonly string[]).includes(tag)) out.push(`token ${i} "${word}" has unknown tag "${tag}"`);
    if (PUNCT.test(word) !== (tag === 'punct')) out.push(`token ${i} "${word}": punctuation must be tagged punct and only punctuation`);
  });
  const text = s.tokens.map((t) => t[0]);
  const n = words(joinTokens(text));
  if (n < 5 || n > 24) out.push(`${n} words; keep sentences between 5 and 24 words`);
  if (!/^[A-Z"“‘]/.test(text[0])) out.push('first word needs a capital letter');
  const last = text[text.length - 1];
  const end = { statement: ['.'], question: ['?'], command: ['.', '!'], exclamation: ['!'] }[s.type];
  if (!end) out.push(`unknown type "${s.type}"`);
  else if (!end.includes(last)) out.push(`${withArticle(s.type)} must end with ${end.join(' or ')}`);
  if ((s.tense as string) === 'future') out.push('English has no future tense ("will" is a modal verb): leave tense out');
  else if (s.tense && !(TENSES as readonly string[]).includes(s.tense)) out.push(`unknown tense "${s.tense}"`);
  if (s.voice && s.voice !== 'active' && s.voice !== 'passive') out.push(`unknown voice "${s.voice}"`);
  spanOk(s.subject, s, 'subject', out);
  spanOk(s.subordinateClause, s, 'subordinateClause', out);
  spanOk(s.relativeClause, s, 'relativeClause', out);
  spanOk(s.frontedAdverbial, s, 'frontedAdverbial', out);
  spanOk(s.expandedNounPhrase, s, 'expandedNounPhrase', out);
  if (s.subordinateClause && s.tokens[s.subordinateClause[0]]?.[1] !== 'conj-sub') {
    out.push('subordinateClause must start with a conj-sub token');
  }
  if (s.relativeClause && !RELATIVE_WORDS.includes(s.tokens[s.relativeClause[0]]?.[0].toLowerCase())) {
    out.push('relativeClause must start with who, which, that, whose, where or when');
  }
  if (s.frontedAdverbial) {
    const [a, b] = s.frontedAdverbial;
    if (a !== 0 || s.tokens[b]?.[0] !== ',') out.push('frontedAdverbial must start the sentence and be followed by a comma');
  }
  return out;
}

export function checkGpsItem(item: GpsItem): string[] {
  const out: string[] = [];
  if (!/^gi-[a-z-]+-\d{3,}$/.test(item.id)) out.push('id must look like gi-commas-001');
  if (!(item.type in GPS_ITEM_TYPES)) out.push(`unknown type "${item.type}"`);
  if (!LEVELS.includes(item.level)) out.push('level must be 1, 2 or 3');
  if (!item.prompt?.trim()) out.push('empty prompt');
  const { input, answer } = item;
  const ints = (xs: unknown[]) => xs.every((x) => Number.isInteger(x));
  switch (input?.kind) {
    case 'choice': {
      if (input.options.length < 2 || new Set(input.options).size !== input.options.length) out.push('choice needs 2+ distinct options');
      if (!ints(answer) || answer.length !== input.pick || new Set(answer).size !== answer.length) out.push('choice answer count must equal pick');
      if (answer.some((a) => typeof a !== 'number' || a < 0 || a >= input.options.length)) out.push('choice answer out of range');
      break;
    }
    case 'text':
      if (!answer.length || answer.some((a) => typeof a !== 'string' || !a.trim())) out.push('text needs acceptable answers');
      else if (!(answer as string[]).some(typeable)) out.push('no accepted answer can be typed with letters only');
      break;
    case 'words':
      if (input.tokens.length < 2) out.push('words needs tokens');
      if (!ints(answer) || answer.length !== input.pick) out.push('words answer count must equal pick');
      if (answer.some((a) => typeof a !== 'number' || a < 0 || a >= input.tokens.length)) out.push('words answer out of range');
      break;
    case 'gap':
      if (input.tokens.length < 3 || !input.mark) out.push('gap needs tokens and a mark');
      if (!ints(answer) || !answer.length) out.push('gap needs gap indexes');
      if (answer.some((a) => typeof a !== 'number' || a < 0 || a > input.tokens.length - 2)) out.push('gap index out of range');
      else if (answer.some((a) => !gapPossible(input.tokens, a as number, input.mark))) out.push('an answer gap is one the screen hides');
      break;
    case 'tf':
      if (input.statements.length < 2) out.push('tf needs 2+ statements');
      if (answer.length !== input.statements.length || answer.some((a) => typeof a !== 'boolean')) out.push('tf answer must be one boolean per statement');
      break;
    default:
      out.push('unknown input kind');
  }
  return out;
}

export function checkSpelling(w: SpellingWord): string[] {
  const out: string[] = [];
  if (!/^[a-z]+(['-][a-z]+)*$/.test(w.word)) out.push('word must be lower-case letters (with - or \')');
  if (!LEVELS.includes(w.level)) out.push('level must be 1, 2 or 3');
  if (!(w.group in SPELLING_GROUPS)) out.push(`unknown group "${w.group}"`);
  const escaped = w.word.replace(/[-']/g, (c) => `\\${c}`);
  const hits = w.sentence.match(new RegExp(`(^|[^A-Za-z'-])${escaped}(?![A-Za-z'-])`, 'gi')) ?? [];
  if (hits.length !== 1) out.push(`sentence must contain "${w.word}" exactly once (found ${hits.length})`);
  if (!/[.?!]$/.test(w.sentence.trim())) out.push('sentence must end with . ? or !');
  if (!/^[A-Z"“]/.test(w.sentence.trim())) out.push('sentence must start with a capital letter');
  return out;
}

/**
 * Words only, for comparing copied words with the text: lower case, with punctuation the letter
 * keyboard cannot type (commas, quotation marks, dashes) turned into spaces. Apostrophes and hyphens
 * inside words stay ("Leo's", "sand-eels").
 */
export const wordsOnly = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[^a-z0-9'-]+/g, ' ')
    .replace(/(^| )['-]+|['-]+(?= |$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth'];

/**
 * The paragraphs (1-based, in the order named) a prompt sends the pupil to: "paragraph 3",
 * "paragraphs 5 to 7", "paragraphs 2, 4 and 8", "the first stanza", "the last verse".
 */
export function partsNamed(prompt: string, count: number): number[] {
  const out: number[] = [];
  const text = prompt.replace(/\*\*|__/g, '');
  const pattern = new RegExp(
    `\\b(?:(${ORDINALS.join('|')}|last|final|opening)\\s+(?:paragraph|verse|stanza)s?\\b|(?:paragraphs?|verses?|stanzas?)\\s+(\\d+(?:\\s*(?:,|and|to|–|-)\\s*\\d+)*))`,
    'gi',
  );
  for (const m of text.matchAll(pattern)) {
    if (m[1]) {
      const word = m[1].toLowerCase();
      out.push(word === 'last' || word === 'final' ? count : word === 'opening' ? 1 : ORDINALS.indexOf(word) + 1);
      continue;
    }
    for (const r of m[2].matchAll(/(\d+)(?:\s*(?:to|–|-)\s*(\d+))?/g)) {
      const [a, b] = [Number(r[1]), Number(r[2] ?? r[1])];
      for (let k = a; k <= b; k++) out.push(k);
    }
  }
  return out;
}

/** Marks a reading text carries: one text of the real paper is about a third of its 50 marks. */
export const TEXT_MARKS = { min: 15, max: 18 };
/** Share of a text's marks for written answers (typed words and explanations), as in the real paper. */
export const TEXT_WRITTEN_SHARE = 0.4;
/** Prose at least this long counts as a longer text, which needs a 3-mark question. */
export const LONGER_TEXT_WORDS = 450;
/** Domains every text asks about: word meanings, retrieval and inference. */
const CORE_DOMAINS: ReadingDomain[] = ['2a', '2b', '2d'];

export const isWritten = (q: ReadingQuestion): boolean => q.kind === 'text' || q.kind === 'self';

/** What a pupil can read in a question before answering it, as words (see `wordsOnly`). */
function shownWords(q: ReadingQuestion): string {
  const parts = [q.prompt];
  if (q.kind === 'choice') parts.push(...q.options);
  if (q.kind === 'tf') parts.push(...q.statements);
  if (q.kind === 'order') parts.push(...q.items);
  return ` ${wordsOnly(parts.join('\n'))} `;
}

export function checkReading(t: ReadingText): string[] {
  const out: string[] = [];
  if (!/^rt-(fiction|non-fiction|poetry)-\d{2,}$/.test(t.id)) out.push('id must look like rt-fiction-01');
  if (!t.title?.trim()) out.push('missing title');
  if (!['fiction', 'non-fiction', 'poetry'].includes(t.genre)) out.push('bad genre');
  if (!t.id.includes(t.genre)) out.push('id must contain the genre');
  if (!LEVELS.includes(t.level)) out.push('level must be 1, 2 or 3');
  const minParas = t.genre === 'poetry' ? 2 : 3;
  if (!Array.isArray(t.paragraphs) || t.paragraphs.length < minParas) out.push(`needs at least ${minParas} paragraphs/stanzas`);
  const total = words(t.paragraphs.join(' '));
  const [lo, hi] = t.genre === 'poetry' ? [80, 500] : [250, 900];
  if (total < lo || total > hi) out.push(`${total} words; keep ${t.genre} between ${lo} and ${hi}`);
  if (t.questions.length < 8) out.push('needs at least 8 questions');
  const ids = t.questions.map((q) => q.id);
  if (new Set(ids).size !== ids.length) out.push('question ids must be unique');
  for (const q of t.questions) {
    const where = `question ${q.id}`;
    if (!(q.domain in READING_DOMAINS)) out.push(`${where}: unknown domain`);
    if (!q.prompt?.trim()) out.push(`${where}: empty prompt`);
    if (q.paragraph !== undefined && (q.paragraph < 1 || q.paragraph > t.paragraphs.length)) out.push(`${where}: paragraph out of range`);
    // "Look at paragraphs 9 and 10": the paragraph shown to the pupil is the first one named.
    const named = partsNamed(q.prompt, t.paragraphs.length);
    if (named.some((p) => p < 1 || p > t.paragraphs.length)) out.push(`${where}: the prompt names a paragraph the text does not have`);
    if (named.length && q.paragraph !== named[0]) {
      out.push(`${where}: the prompt starts at paragraph ${named[0]}, but "paragraph" is ${q.paragraph ?? 'missing'}`);
    }
    switch (q.kind) {
      case 'choice':
        if (q.options.length < 3 || new Set(q.options).size !== q.options.length) out.push(`${where}: choice needs 3+ distinct options`);
        if (q.answer.length !== q.pick || q.answer.some((a) => a < 0 || a >= q.options.length)) out.push(`${where}: choice answer`);
        if (q.marks !== 1) out.push(`${where}: choice questions are 1 mark`);
        break;
      case 'tf':
        if (q.statements.length < 3 || q.answer.length !== q.statements.length) out.push(`${where}: tf needs 3+ statements and one answer each`);
        break;
      case 'order':
        if (q.items.length < 3 || new Set(q.items).size !== q.items.length) out.push(`${where}: order needs 3+ distinct items`);
        if ([...q.answer].sort((a, b) => a - b).join() !== q.items.map((_, i) => i).join()) out.push(`${where}: order answer must be a permutation`);
        if (q.answer.every((a, i) => a === i)) out.push(`${where}: order items are already in order; jumble them`);
        break;
      case 'text': {
        if (!q.accept.length || q.accept.some((a) => !a.trim())) out.push(`${where}: text needs acceptable answers`);
        // The letter keyboard types a-z, apostrophes, hyphens and spaces, up to 40 characters.
        for (const a of q.accept) if (!typeable(a)) out.push(`${where}: "${a}" cannot be typed on the letter keyboard`);
        if (new Set(q.accept.map(normText)).size !== q.accept.length) out.push(`${where}: an accepted answer is listed twice`);
        if (/\bcopy\b/i.test(q.prompt)) {
          // Copied words must be the text's own words, in the part the question sends the pupil to.
          const parts = named.length ? named : q.paragraph ? [q.paragraph] : t.paragraphs.map((_, i) => i + 1);
          const scope = ` ${parts.map((p) => wordsOnly(t.paragraphs[p - 1] ?? '')).join(' ')} `;
          for (const a of q.accept) if (!scope.includes(` ${wordsOnly(a)} `)) out.push(`${where}: "${a}" is not in the text it should be copied from`);
        }
        if (q.marks !== 1) out.push(`${where}: typed answers are 1 mark`);
        break;
      }
      case 'self':
        if (!q.model?.trim()) out.push(`${where}: self-marked needs a model answer`);
        if (!Array.isArray(q.points) || q.points.length < q.marks || q.points.some((p) => !p.trim())) {
          out.push(`${where}: self-marked needs marking points, at least one per mark`);
        }
        break;
      default:
        out.push(`${where}: unknown kind`);
    }
  }
  // A typed answer must not be readable in another question of the same text (a tick-box option,
  // an event to put in order, a quotation), or the pupil can copy it from there.
  for (const q of t.questions) {
    if (q.kind !== 'text') continue;
    for (const other of t.questions) {
      if (other === q) continue;
      const shown = shownWords(other);
      const given = q.accept.find((a) => {
        const w = wordsOnly(a).replace(/^(a|an|the) /, '');
        return w.length >= 3 && shown.includes(` ${w} `);
      });
      if (given) out.push(`question ${q.id}: its answer "${given}" can be read in question ${other.id}`);
    }
  }
  // Balance, as in one text of the real paper: written answers carry much of the marks, and a
  // text has questions worth more than one mark.
  const marks = t.questions.reduce((s, q) => s + q.marks, 0);
  if (marks < TEXT_MARKS.min || marks > TEXT_MARKS.max) out.push(`${marks} marks; keep a text between ${TEXT_MARKS.min} and ${TEXT_MARKS.max}`);
  const written = t.questions.filter(isWritten).reduce((s, q) => s + q.marks, 0);
  if (written < TEXT_WRITTEN_SHARE * marks) out.push(`written answers carry ${written} of ${marks} marks; they need at least ${TEXT_WRITTEN_SHARE * 100}%`);
  if (!t.questions.some((q) => q.marks === 2)) out.push('needs a 2-mark question');
  if (t.genre !== 'poetry' && total >= LONGER_TEXT_WORDS && !t.questions.some((q) => q.marks === 3)) out.push('a longer text needs a 3-mark question');
  const domains = new Set(t.questions.map((q) => q.domain));
  for (const d of CORE_DOMAINS) if (!domains.has(d)) out.push(`no ${d} question`);
  if (domains.size < 5) out.push(`asks about ${domains.size} content domains; ask about at least 5`);
  if (!t.questions.some((q) => q.kind === 'text' && /\bcopy\b/i.test(q.prompt))) out.push('needs a find-and-copy question');
  return out;
}
