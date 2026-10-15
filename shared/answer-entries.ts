import { isAnswerBreakdownPart, type AnswerBreakdownPart } from "./practice";

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

export interface SentenceAnswerAnnotations {
  sentenceId: string;
  english: string;
  japanese: string;
  furigana: string;
  answerEntries: AnswerAnnotation[];
  hintMappings: HintMapping[];
}

export interface AnswerAnnotationBank {
  version: number;
  entries: SentenceAnswerAnnotations[];
}

// Bump when contextual annotations or their interpretation change, so journal
// entries refresh their saved breakdown on demand.
export const answerDetailsVersion = "answer-entries-v1";

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
