import {
  hiragana,
  normalize,
  parts,
  type AlternativeProvenance,
  type Level,
  type VocabularyHint,
} from "./practice";
import type { SpellingReference } from "./writing-spellings";

// A furigana segment with its UTF-16 offsets in the rendered Japanese text.
export interface Segment {
  surface: string;
  reading: string;
  start: number;
  end: number;
}

// A dictionary form linked to its complete word in a reference reading.
export interface ReferenceLexeme {
  lemma: string;
  japanese: string;
  reading: string;
}

// Generated per-reading data, keyed by sentence ID like the other banks. An
// entry applies only while its source text and furigana still match.
export type ReadingBank<T> = Record<
  string,
  { sourceJapanese: string; readings: Record<string, T> }
>;
export type WordBoundaryBank = ReadingBank<number[]>;

// Generated grade per sentence: the harder of its vocabulary level and its
// grammar level. See scripts/generate-sentence-levels.py.
export interface SentenceLevelBank {
  version: number;
  sourceRevision: string;
  method: string;
  entries: Record<
    string,
    {
      sourceJapanese: string;
      level: string;
      // A null level marks an unlisted kanji word, graded above every level.
      limitingWords: { surface: string; lemma: string; level: string | null }[];
      limitingGrammar: { pattern: string; level: string }[];
    }
  >;
}
export type ReferenceLexemeBank = ReadingBank<ReferenceLexeme[]>;

// One validated pronunciation of a rendering, parsed once at load.
export interface Reading {
  furigana: string;
  segments: Segment[];
  // Supplied reading in hiragana, keeping punctuation for display.
  kana: string;
  // Generated word-end offsets in the supplied reading, when available.
  wordBoundaries?: number[];
  // Generated conjugated forms in this reading, when available.
  lexemes?: ReferenceLexeme[];
}

// Readings are never guessed, so a loaded rendering always has at least one.
export type Readings = [Reading, ...Reading[]];

export function isNonEmpty<T>(items: T[]): items is [T, ...T[]] {
  return items.length > 0;
}

// A verified spelling record with its precomputed path of accepted options.
export interface VerifiedSpelling extends SpellingReference {
  path: string[][];
}

// A Japanese text that answers the English prompt, with every reading that
// was supplied for it.
export interface Rendering {
  japanese: string;
  readings: Readings;
  spellings: VerifiedSpelling[];
}

export interface Alternative extends Rendering {
  provenance: AlternativeProvenance;
}

// A verified span of the English prompt with its sentence-specific hints.
export interface PhraseHintSpan {
  start: number;
  end: number;
  text: string;
  phrase: string;
  hints: VocabularyHint[];
}

export interface Sentence {
  id: string;
  english: string;
  englishWordCount: number;
  targetVocabulary: { id: string; word: string; level: string }[];
  // Vocabulary grade of the whole sentence; null when no current grade
  // exists, which keeps the sentence out of level-based selection.
  level: Level | null;
  sourceUrl: string | null;
  reference: Rendering;
  alternatives: Alternative[];
  phraseHints: PhraseHintSpan[];
}

export function parseReading(
  japanese: string,
  furigana: string,
): Reading | null {
  let offset = 0;
  const segments = parts(furigana).map((part) => {
    const start = offset;
    offset += part.surface.length;
    return { ...part, start, end: offset };
  });
  const surface = segments.map((part) => part.surface).join("");
  const reading = segments.map((part) => part.reading).join("");
  if (
    normalize(surface) !== normalize(japanese) ||
    // Upstream annotations have named a JMdict entry ({前|#1392580}) instead
    // of a pronunciation, which would then be shown and compared. Readings
    // can otherwise carry digits and punctuation over from the source text.
    /[\p{Script=Han}{}|#＃]/u.test(reading)
  )
    return null;
  return { furigana, segments, kana: hiragana(reading) };
}

export function parseReadings(
  japanese: string,
  furiganaVariants: string[],
): Reading[] {
  return furiganaVariants.flatMap((furigana) => {
    const reading = parseReading(japanese, furigana);
    return reading ? [reading] : [];
  });
}

// The first supplied reading drives hints, chips, and romaji.
export function primaryReading(rendering: Rendering): Reading {
  return rendering.readings[0];
}

export function primaryRendering(rendering: Rendering): Rendering {
  return { ...rendering, readings: [primaryReading(rendering)] };
}
