import { writingDifferences } from "./writing-diff";
import { explainWriting } from "./writing-explanations";

export enum Level {
  N5 = "N5",
  N4 = "N4",
  N3 = "N3",
  N2 = "N2",
  N1 = "N1",
}

export enum Length {
  Short = "short",
  Medium = "medium",
  Long = "long",
}

export enum Strictness {
  Kana = "kana",
  Flexible = "flexible",
  Exact = "exact",
}

export enum DifferenceKind {
  Same = "same",
  Changed = "changed",
  Extra = "extra",
  Missing = "missing",
}

export const levels = Object.values(Level);
export interface Candidate {
  id: string;
  english: string;
  japanese: string;
  furiganaVariants: string[];
  englishWordCount: number;
  targetVocabulary: { id: string; word: string; level: string }[];
  sources: { tatoebaUrl: string | null }[];
}
export interface Question {
  id: string;
  english: string;
  romaji: string;
  wordHints: PromptPart[];
  wordCount: number;
  poolSize: number;
}
export interface VocabularyHint {
  japanese: string;
  reading: string;
  romaji: string;
  meaning: string;
}
export interface PromptPart {
  text: string;
  isWord: boolean;
  hints: VocabularyHint[];
}
export interface DifferencePart {
  text: string;
  kind: DifferenceKind;
  expected?: string;
}
export interface Comparison {
  matched: boolean;
  reference: string;
  kana: string;
  sourceUrl: string | null;
  differences: DifferenceDetails | null;
  explanations?: WritingExplanation[];
}
export interface WritingEdit {
  actual: string;
  expected: string;
  context: string;
}
export interface DifferenceDetails {
  answer: DifferencePart[];
  expected: DifferencePart[];
  edits?: WritingEdit[];
}
export interface WritingExplanation {
  title: string;
  detail: string;
  actual: string;
  expected: string;
  context?: string;
}

// Deliberately ignore only spacing and common sentence punctuation.
export function normalize(text: string): string {
  return text.normalize("NFKC").replace(/[\s。、，．！？,.!?]/gu, "");
}

export function hiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/gu, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

export function parts(
  furigana: string,
): { surface: string; reading: string }[] {
  const result: { surface: string; reading: string }[] = [];
  let cursor = 0;
  for (const match of furigana.matchAll(/\{([^{}|]+)\|([^{}|]+)\}/gu)) {
    const literal = furigana.slice(cursor, match.index);
    result.push({ surface: literal, reading: literal });
    result.push({ surface: match[1]!, reading: match[2]! });
    cursor = match.index + match[0].length;
  }
  const literal = furigana.slice(cursor);
  result.push({ surface: literal, reading: literal });
  return result;
}

export function validReadings(candidate: Candidate): string[] {
  return candidate.furiganaVariants.filter((variant) => {
    const segments = parts(variant);
    return (
      normalize(segments.map((p) => p.surface).join("")) ===
        normalize(candidate.japanese) &&
      !/[\p{Script=Han}{}|]/u.test(segments.map((p) => p.reading).join(""))
    );
  });
}

function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compare(
  candidate: Candidate,
  answer: string,
  mode: Strictness,
): Comparison {
  const normalized = normalize(answer);
  const readings = validReadings(candidate);
  let matched = false;
  if (normalized) {
    if (mode === Strictness.Exact)
      matched = normalized === normalize(candidate.japanese);
    else if (mode === Strictness.Kana) {
      matched =
        !/\p{Script=Han}/u.test(normalized) &&
        readings.some(
          (reading) =>
            hiragana(normalized) ===
            hiragana(
              normalize(
                parts(reading)
                  .map((p) => p.reading)
                  .join(""),
              ),
            ),
        );
    } else {
      // Each annotated word may use its original kanji or its supplied reading.
      // Converting arbitrary input kanji to sounds would accept homophone errors.
      matched = readings.some((reading) => {
        const pattern = parts(reading)
          .map((part) => {
            const surface = escapePattern(hiragana(normalize(part.surface)));
            const kana = escapePattern(hiragana(normalize(part.reading)));
            return `(?:${surface}|${kana})`;
          })
          .join("");
        return new RegExp(`^${pattern}$`, "u").test(hiragana(normalized));
      });
    }
  }
  const differences = matched
    ? null
    : writingDifferences(candidate, answer, mode);
  return {
    matched,
    differences,
    explanations: differences
      ? explainWriting(candidate, answer, mode, differences)
      : [],
    reference: candidate.japanese,
    kana: readings[0]
      ? hiragana(
          parts(readings[0])
            .map((p) => p.reading)
            .join(""),
        )
      : "",
    sourceUrl:
      candidate.sources.find((source) => source.tatoebaUrl)?.tatoebaUrl ?? null,
  };
}

export function lengthOf(count: number): Length {
  return count <= 7 ? Length.Short : count <= 12 ? Length.Medium : Length.Long;
}

export function isLevel(value: unknown): value is Level {
  return Object.values(Level).some((item) => item === value);
}

export function isLength(value: unknown): value is Length {
  return Object.values(Length).some((item) => item === value);
}

export function isStrictness(value: unknown): value is Strictness {
  return Object.values(Strictness).some((item) => item === value);
}

export function isDifferenceKind(value: unknown): value is DifferenceKind {
  return Object.values(DifferenceKind).some((item) => item === value);
}
