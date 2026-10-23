import {
  isAnswerBreakdownPart,
  type AnswerBreakdownPart,
  type SpellingOption,
} from "./practice";

export interface EnglishSpan {
  start: number;
  end: number;
  text: string;
}

export interface AnswerAnnotation {
  id: string;
  start: number;
  end: number;
  japanese: string;
  reading: string;
  meaning: string;
  wordTypes?: string[];
}

export interface HintMapping {
  spans: EnglishSpan[];
  answerEntryIds: string[];
}

export interface GrammarAnnotation {
  start: number;
  end: number;
  japanese: string;
  grammarIds: string[];
}

export interface SentenceAnswerAnnotations {
  sentenceId: string;
  english: string;
  japanese: string;
  furigana: string;
  answerEntries: AnswerAnnotation[];
  grammarAnnotations?: GrammarAnnotation[];
  hintMappings: HintMapping[];
}

export interface AnswerAnnotationBank {
  version: number;
  entries: SentenceAnswerAnnotations[];
}

// Bump when contextual annotations or their interpretation change, so journal
// entries refresh their saved breakdown on demand.
export const answerDetailsVersion = "answer-entries-v25";

export function currentSpellingOptions(entry: {
  answerDetailsVersion?: unknown;
  spellingOptions?: unknown;
}): SpellingOption[] | undefined {
  return entry.answerDetailsVersion === answerDetailsVersion &&
    Array.isArray(entry.spellingOptions) &&
    entry.spellingOptions.every(
      (option) =>
        option &&
        typeof option.japanese === "string" &&
        typeof option.kana === "string" &&
        Array.isArray(option.spellings) &&
        option.spellings.every(
          (spelling: unknown) => typeof spelling === "string",
        ),
    )
    ? entry.spellingOptions
    : undefined;
}

export function currentAnswerBreakdown(entry: {
  answerDetailsVersion?: unknown;
  answerBreakdown?: unknown;
}): AnswerBreakdownPart[] | undefined {
  return entry.answerDetailsVersion === answerDetailsVersion &&
    Array.isArray(entry.answerBreakdown) &&
    entry.answerBreakdown.every(isAnswerBreakdownPart) &&
    entry.answerBreakdown.every(
      (part) =>
        typeof part.start === "number" &&
        typeof part.end === "number" &&
        part.end > part.start &&
        part.entryId === `ja-${part.start}-${part.end}`,
    )
    ? entry.answerBreakdown
    : undefined;
}
