// Structural checks for English content. They cannot tell whether a grammar tag is right, only
// whether an entry is well formed and self-consistent, so content is also read by a person.
import { normText, TEXT_MAX } from '../answer/answer';
import { joinTokens } from './tokens';
import {
  GPS_ITEM_TYPES,
  READING_DOMAINS,
  SPELLING_GROUPS,
  TAGS,
  TENSES,
  type GpsItem,
  type GrammarSentence,
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
  else if (!end.includes(last)) out.push(`a ${s.type} must end with ${end.join(' or ')}`);
  if (s.tense && !(TENSES as readonly string[]).includes(s.tense)) out.push(`unknown tense "${s.tense}"`);
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

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

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
        else if (!q.accept.some(typeable)) out.push(`${where}: no accepted answer can be typed with letters only`);
        if (/copy/i.test(q.prompt)) {
          const scope = norm(q.paragraph ? t.paragraphs[q.paragraph - 1] : t.paragraphs.join('\n'));
          for (const a of q.accept) if (!scope.includes(norm(a))) out.push(`${where}: "${a}" is not in the text it should be copied from`);
        }
        if (q.marks !== 1) out.push(`${where}: typed answers are 1 mark`);
        break;
      }
      case 'self':
        if (!q.model.trim() || q.points.length < q.marks || q.marks < 2) out.push(`${where}: self-marked needs 2-3 marks, a model answer and a point per mark`);
        break;
      default:
        out.push(`${where}: unknown kind`);
    }
  }
  return out;
}
