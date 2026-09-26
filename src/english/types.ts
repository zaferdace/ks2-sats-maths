// Content formats for English (KS2 SATs): grammar, punctuation and spelling (GPS) and reading.
// Content lives in JSON files next to this module; `validate.ts` checks every entry.

/** The level a pupil can pick: 1 easy, 2 medium, 3 hard. */
export type Level = 1 | 2 | 3;

/** Token indexes [start, end) inside a sentence. */
export type Span = [number, number];

// ---------------------------------------------------------------------------
// GPS 1: annotated sentences (one sentence serves many question types)
// ---------------------------------------------------------------------------

/**
 * Word class tags in KS2 terms. `other` marks anything a KS2 teacher might argue about
 * (infinitive "to", "not", contractions, interjections); questions never target `other`,
 * `punct` or `aux`.
 */
export const TAGS = ['noun', 'verb', 'aux', 'modal', 'adj', 'adv', 'prep', 'det', 'pron', 'conj-co', 'conj-sub', 'punct', 'other'] as const;
export type Tag = (typeof TAGS)[number];

/**
 * The tenses KS2 names. There is no future tense: the National Curriculum glossary, which the STA
 * follows, says English has no future tense form ("will" is a modal verb). A sentence about the
 * future ("We will visit the zoo.") has no `tense`.
 */
export const TENSES = [
  'simple present',
  'simple past',
  'present progressive',
  'past progressive',
  'present perfect',
  'past perfect',
] as const;
export type Tense = (typeof TENSES)[number];

export interface GrammarSentence {
  id: string; // "gs001"
  level: Level;
  /** Words and punctuation marks in order. Contractions and hyphenated words are one token. */
  tokens: [string, Tag][];
  type: 'statement' | 'question' | 'command' | 'exclamation';
  /** Tense of the main clause's verb, when it is one of TENSES. */
  tense?: Tense;
  voice?: 'active' | 'passive';
  /** Whole subject of the main clause (a noun phrase or pronoun). */
  subject?: Span;
  /** Subordinate (adverbial) clause, starting with its conjunction, without a separating comma. */
  subordinateClause?: Span;
  /** Relative clause, starting with its relative pronoun, without commas. */
  relativeClause?: Span;
  /** Fronted adverbial at the start of the sentence, without the comma after it. */
  frontedAdverbial?: Span;
  /**
   * An expanded noun phrase: a noun with words that add detail. In front of the noun these are
   * adjectives or noun modifiers ("the heavy rain", "the football pitch", "the strict maths
   * teacher"); after it, a prepositional phrase ("the man in the moon"). The determiner is part
   * of the phrase. The noun-phrase question only uses a sentence when no other expanded noun
   * phrase in it has as many words (see `nounPhraseAskable`).
   */
  expandedNounPhrase?: Span;
}

// ---------------------------------------------------------------------------
// GPS 2: ready-made questions
// ---------------------------------------------------------------------------

/**
 * Question types written as ready-made items. Each id is one row in the report.
 * (Types generated from annotated sentences are listed in gps/types.ts.)
 */
export const GPS_ITEM_TYPES = {
  'g-capitals': 'Capital letters',
  'g-end-punctuation': 'Full stops, question and exclamation marks',
  'g-commas': 'Commas (lists, fronted adverbials, clarity)',
  'g-parenthesis': 'Brackets, dashes and commas for parenthesis',
  'g-apostrophes': 'Apostrophes',
  'g-contractions': 'Contractions',
  'g-speech': 'Inverted commas (direct speech)',
  'g-colons-semicolons': 'Colons, semi-colons and dashes',
  'g-hyphens': 'Hyphens',
  'g-verb-forms': 'Verb forms and tenses',
  'g-active-passive': 'Active and passive voice',
  'g-modals': 'Modal verbs',
  'g-subjunctive': 'The subjunctive',
  'g-standard-english': 'Standard English',
  'g-formality': 'Formal and informal language',
  'g-conjunctions': 'Conjunctions',
  'g-relative-pronouns': 'Relative pronouns',
  'g-determiners': 'Determiners',
  'g-pronouns': 'Pronouns',
  'g-prepositions': 'Prepositions',
  'g-adverbials': 'Adverbs and adverbials',
  'g-synonyms': 'Synonyms',
  'g-antonyms': 'Antonyms',
  'g-prefixes': 'Prefixes',
  'g-suffixes': 'Suffixes',
  'g-word-families': 'Word families',
  'g-homophones': 'Homophones and near-homophones',
} as const;
export type GpsItemType = keyof typeof GPS_ITEM_TYPES;

/** How a ready-made GPS item is answered. */
export type ItemInput =
  /** Tick one or more options. answer: correct option indexes. */
  | { kind: 'choice'; options: string[]; pick: number }
  /** Type a word or short phrase. answer: every acceptable answer. */
  | { kind: 'text'; before?: string; after?: string }
  /** Tap word(s) in a sentence. answer: token indexes to select. */
  | { kind: 'words'; tokens: string[]; pick: number }
  /** Tap where a punctuation mark goes. Gap i is just after token i. answer: gap indexes. */
  | { kind: 'gap'; tokens: string[]; mark: string }
  /** True or false for each statement. answer: booleans. */
  | { kind: 'tf'; statements: string[] };

export interface GpsItem {
  id: string; // "gi-commas-001"
  type: GpsItemType;
  level: Level;
  /** Question text. Markup: **bold**, __underline__, \n for a new line. */
  prompt: string;
  input: ItemInput;
  answer: (number | string | boolean)[];
  /** One short sentence shown after marking: why the answer is right. */
  explain?: string;
}

// ---------------------------------------------------------------------------
// Spelling (GPS paper 2)
// ---------------------------------------------------------------------------

export const SPELLING_GROUPS = {
  'y34-list': 'Year 3/4 word list',
  'y56-list': 'Year 5/6 word list',
  'suffix-tion-sion': '-tion, -sion, -ssion, -cian',
  'suffix-cious-tious': '-cious and -tious',
  'suffix-cial-tial': '-cial and -tial',
  'suffix-ant-ent': '-ant/-ance/-ancy and -ent/-ence/-ency',
  'suffix-able-ible': '-able/-ably and -ible/-ibly',
  'suffix-ous': '-ous',
  'suffix-fer': 'Adding suffixes to words ending in -fer',
  'suffix-other': 'Other suffixes (-ly, -ment, -ness, -ful, doubling, y to i)',
  prefixes: 'Prefixes',
  'ei-ie': 'ei after c and ie',
  ough: 'The letters ough',
  'silent-letters': 'Silent letters',
  homophones: 'Homophones and near-homophones',
  hyphens: 'Hyphens (co-, re-)',
  'ture-sure': '-ture and -sure',
  'tricky-sounds': 'Tricky sounds (y as i, ou, ch as sh or k, -gue, -que)',
} as const;
export type SpellingGroup = keyof typeof SPELLING_GROUPS;

export interface SpellingWord {
  word: string; // lower case, UK spelling
  level: Level;
  group: SpellingGroup;
  /** An original sentence that contains the word exactly once, in exactly this form. */
  sentence: string;
  /** Optional reminder shown after marking: "double c, double m". */
  hint?: string;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** KS2 reading content domains. */
export const READING_DOMAINS = {
  '2a': 'Word meanings (vocabulary)',
  '2b': 'Finding information (retrieval)',
  '2c': 'Summarising',
  '2d': 'Inference',
  '2e': 'Prediction',
  '2f': 'How the text is organised',
  '2g': 'Words and phrases chosen by the writer',
  '2h': 'Comparing within the text',
} as const;
export type ReadingDomain = keyof typeof READING_DOMAINS;

interface ReadingQuestionBase {
  id: string; // "q1"
  domain: ReadingDomain;
  marks: 1 | 2 | 3;
  /** Question text. Markup: **bold**, __underline__, \n for a new line. */
  prompt: string;
  /** Paragraph (1-based) the question points to, if any. */
  paragraph?: number;
}

export type ReadingQuestion = ReadingQuestionBase &
  (
    | { kind: 'choice'; options: string[]; pick: number; answer: number[] }
    | { kind: 'tf'; statements: string[]; answer: boolean[] }
    /** Items are listed in a jumbled order; answer lists item indexes in the order they happen. */
    | { kind: 'order'; items: string[]; answer: number[] }
    /** Find-and-copy or a short typed answer; accept lists every acceptable answer. */
    | { kind: 'text'; accept: string[] }
    /** Explanation questions: the pupil compares their answer with the model and marks it. */
    | { kind: 'self'; model: string; points: string[] }
  );

export interface ReadingText {
  id: string; // "rt-fiction-01"
  title: string;
  genre: 'fiction' | 'non-fiction' | 'poetry';
  level: Level;
  /** Numbered on screen. Poetry: one stanza per entry, lines separated by \n. */
  paragraphs: string[];
  questions: ReadingQuestion[];
}
