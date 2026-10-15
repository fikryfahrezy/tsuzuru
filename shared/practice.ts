import { writingDifferences } from "./writing-diff";
import { explainWriting } from "./writing-explanations";
import { writingPaths } from "./writing-spellings";
import { parseReadings, type Rendering, type Sentence } from "./sentence";

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

export enum HintSource {
  Sentence = "sentence",
  Reference = "reference",
}

export enum AlternativeMethod {
  OmitFirstPersonTopic = "omit-first-person-topic",
  NumberSpelling = "number-spelling",
  Authored = "authored",
}

export interface AlternativeProvenance {
  creator: string;
  method: AlternativeMethod;
  note: string;
}

export const levels = Object.values(Level);
// A sentence record as stored in sentence-candidates.json, before validation.
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
  alternativeCount: number;
  spellingOptions: SpellingOption[];
  wordBank: AnswerChip[];
  answerBreakdown: AnswerBreakdownPart[];
}

export interface SpellingOption extends AnswerChip {
  spellings: string[];
}

export interface AnswerBreakdownPart extends AnswerChip {
  romaji: string;
  meanings: string[];
  dictionaryForm?: string;
  wordTypes: string[];
  note?: string;
}

export function isAnswerBreakdownPart(
  value: unknown,
): value is AnswerBreakdownPart {
  if (!value || typeof value !== "object") return false;
  const part = value as AnswerBreakdownPart;
  return (
    typeof part.japanese === "string" &&
    typeof part.kana === "string" &&
    typeof part.romaji === "string" &&
    Array.isArray(part.meanings) &&
    part.meanings.every((meaning) => typeof meaning === "string") &&
    Array.isArray(part.wordTypes) &&
    part.wordTypes.every((type) => typeof type === "string") &&
    (part.dictionaryForm === undefined ||
      typeof part.dictionaryForm === "string") &&
    (part.note === undefined || typeof part.note === "string")
  );
}

export interface AnswerChip {
  japanese: string;
  kana: string;
}

export interface VocabularyHint {
  japanese: string;
  reading: string;
  romaji: string;
  meaning: string;
  spellings?: string[];
}

export interface PromptPart {
  text: string;
  isWord: boolean;
  hints: VocabularyHint[];
  phrase?: string;
  hintSource?: HintSource;
}

export interface DifferencePart {
  text: string;
  kind: DifferenceKind;
  expected?: string;
}

export interface AlternativeAnswer {
  japanese: string;
  kana: string;
  provenance: AlternativeProvenance;
}

export interface Comparison {
  matched: boolean;
  reference: string;
  kana: string;
  sourceUrl: string | null;
  differences: DifferenceDetails | null;
  explanations?: WritingExplanation[];
  acceptedAlternative?: AlternativeAnswer;
  alternatives?: AlternativeAnswer[];
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

export function validReadings(
  candidate: Pick<Candidate, "japanese" | "furiganaVariants">,
): string[] {
  return parseReadings(candidate.japanese, candidate.furiganaVariants).map(
    (reading) => reading.furigana,
  );
}

function escapePattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matches(rendering: Rendering, answer: string, mode: Strictness) {
  const normalized = normalize(answer);
  if (!normalized) return false;
  if (mode === Strictness.Exact)
    return normalized === normalize(rendering.japanese);
  if (mode === Strictness.Kana)
    return (
      !/\p{Script=Han}/u.test(normalized) &&
      rendering.readings.some(
        (reading) =>
          hiragana(normalized) ===
          hiragana(normalize(reading.segments.map((p) => p.reading).join(""))),
      )
    );
  // Only recorded spellings are allowed; arbitrary kanji-to-kana conversion
  // would also accept words with different meanings but the same reading.
  return writingPaths(rendering, mode).some((path) => {
    const pattern = path
      .map(
        (options) =>
          `(?:${options.map((option) => escapePattern(hiragana(normalize(option)))).join("|")})`,
      )
      .join("");
    return new RegExp(`^${pattern}$`, "u").test(hiragana(normalized));
  });
}

function alternativeAnswers(sentence: Sentence): AlternativeAnswer[] {
  return sentence.alternatives.map((alternative) => ({
    japanese: alternative.japanese,
    kana: alternative.readings[0]!.kana,
    provenance: alternative.provenance,
  }));
}

export function compare(
  sentence: Sentence,
  answer: string,
  mode: Strictness,
  acceptAlternatives = false,
): Comparison {
  const { reference } = sentence;
  const matched = matches(reference, answer, mode);
  const differences = matched
    ? null
    : writingDifferences(reference, answer, mode);
  const result: Comparison = {
    matched,
    differences,
    explanations: differences
      ? explainWriting(reference, answer, mode, differences)
      : [],
    reference: reference.japanese,
    kana: reference.readings[0]!.kana,
    sourceUrl: sentence.sourceUrl,
    alternatives: alternativeAnswers(sentence),
  };
  if (matched || !acceptAlternatives) return result;
  const index = sentence.alternatives.findIndex((alternative) =>
    matches(alternative, answer, mode),
  );
  if (index === -1) return result;
  return {
    ...result,
    matched: true,
    differences: null,
    explanations: [],
    acceptedAlternative: result.alternatives![index],
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

export function isAlternativeMethod(
  value: unknown,
): value is AlternativeMethod {
  return Object.values(AlternativeMethod).some((item) => item === value);
}
