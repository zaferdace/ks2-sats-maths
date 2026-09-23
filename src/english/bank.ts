// Loads every English content file that is bundled with the app.
import type { GpsItem, GrammarSentence, ReadingText, SpellingWord } from './types';

const files = import.meta.glob<{ default: unknown }>('./content/**/*.json', { eager: true });

const collect = <T>(pattern: RegExp): T[] =>
  Object.entries(files)
    .filter(([file]) => pattern.test(file))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => mod.default as T);

export const SENTENCES: readonly GrammarSentence[] = collect<GrammarSentence[]>(/grammar-sentences.*\.json$/).flat();
export const GPS_ITEMS: readonly GpsItem[] = collect<GpsItem[]>(/gps-items.*\.json$/).flat();
export const SPELLING_WORDS: readonly SpellingWord[] = collect<SpellingWord[]>(/spelling.*\.json$/).flat();
export const READING_TEXTS: readonly ReadingText[] = collect<ReadingText>(/reading\/.*\.json$/);

const TEXT_BY_ID = new Map(READING_TEXTS.map((t) => [t.id, t]));
export const readingText = (id: string): ReadingText | undefined => TEXT_BY_ID.get(id);
