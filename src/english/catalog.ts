// English question types as report rows: GPS (generated and ready-made), spelling groups and
// reading domains.
import type { PaperKind, TopicId, TypeInfo } from '../gen/types';
import { GPS_ITEM_TYPES, READING_DOMAINS, SPELLING_GROUPS, type GpsItemType, type ReadingDomain } from './types';

/** GPS types built from annotated sentences. */
export const GPS_GENERATED_TYPES = {
  'g-word-class': 'Word classes',
  'g-find-word': 'Finding a word class in a sentence',
  'g-sentence-type': 'Types of sentence',
  'g-clauses': 'Subordinate and relative clauses',
  'g-main-clause': 'The main clause',
  'g-subject': 'The subject of a sentence',
  'g-fronted': 'Fronted adverbials',
  'g-noun-phrase': 'Expanded noun phrases',
  'g-tense': 'Recognising tenses',
  'g-voice': 'Spotting the passive voice',
} as const;

const GENERATED_TOPICS: Record<keyof typeof GPS_GENERATED_TYPES, TopicId> = {
  'g-word-class': 'word-classes',
  'g-find-word': 'word-classes',
  'g-sentence-type': 'sentence-structure',
  'g-clauses': 'sentence-structure',
  'g-main-clause': 'sentence-structure',
  'g-subject': 'sentence-structure',
  'g-fronted': 'sentence-structure',
  'g-noun-phrase': 'sentence-structure',
  'g-tense': 'verb-forms',
  'g-voice': 'verb-forms',
};

const ITEM_TOPICS: Record<GpsItemType, TopicId> = {
  'g-capitals': 'punctuation',
  'g-end-punctuation': 'punctuation',
  'g-commas': 'punctuation',
  'g-parenthesis': 'punctuation',
  'g-apostrophes': 'punctuation',
  'g-contractions': 'punctuation',
  'g-speech': 'punctuation',
  'g-colons-semicolons': 'punctuation',
  'g-hyphens': 'punctuation',
  'g-ellipsis': 'punctuation',
  'g-bullet-points': 'punctuation',
  'g-verb-forms': 'verb-forms',
  'g-active-passive': 'verb-forms',
  'g-modals': 'verb-forms',
  'g-subjunctive': 'verb-forms',
  'g-standard-english': 'standard-english',
  'g-formality': 'standard-english',
  'g-conjunctions': 'sentence-structure',
  'g-relative-pronouns': 'sentence-structure',
  'g-object': 'sentence-structure',
  'g-adverbials': 'sentence-structure',
  'g-determiners': 'word-classes',
  'g-pronouns': 'word-classes',
  'g-prepositions': 'word-classes',
  'g-synonyms': 'vocabulary',
  'g-antonyms': 'vocabulary',
  'g-prefixes': 'vocabulary',
  'g-suffixes': 'vocabulary',
  'g-word-families': 'vocabulary',
  'g-homophones': 'vocabulary',
};

const DOMAIN_TOPICS: Record<ReadingDomain, TopicId> = {
  '2a': 'reading-words',
  '2b': 'reading-retrieval',
  '2c': 'reading-structure',
  '2d': 'reading-inference',
  '2e': 'reading-inference',
  '2f': 'reading-structure',
  '2g': 'reading-structure',
  '2h': 'reading-structure',
};

const info = (id: string, label: string, topic: TopicId, paper: PaperKind): TypeInfo => ({ id, label, topic, paper });

export const spellingTypeId = (group: string) => `s-${group}`;
export const readingTypeId = (domain: string) => `rd-${domain}`;

export const ENGLISH_TYPES: readonly TypeInfo[] = [
  ...Object.entries(GPS_GENERATED_TYPES).map(([id, label]) =>
    info(id, label, GENERATED_TOPICS[id as keyof typeof GPS_GENERATED_TYPES], 'gps'),
  ),
  ...Object.entries(GPS_ITEM_TYPES).map(([id, label]) => info(id, label, ITEM_TOPICS[id as GpsItemType], 'gps')),
  ...Object.entries(SPELLING_GROUPS).map(([group, label]) => info(spellingTypeId(group), label, 'spelling', 'spelling')),
  ...Object.entries(READING_DOMAINS).map(([domain, label]) =>
    info(readingTypeId(domain), label, DOMAIN_TOPICS[domain as ReadingDomain], 'reading'),
  ),
];
