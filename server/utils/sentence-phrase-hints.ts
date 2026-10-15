import bank from "../../data/phrase-hints/sentences.json";
import { hiragana, type VocabularyHint } from "../../shared/practice";
import {
  primaryRendering,
  type Rendering,
  type Sentence,
} from "../../shared/sentence";
import { kanaToRomaji } from "../../shared/romaji";

interface Span {
  start: number;
  end: number;
  text: string;
}
interface Phrase {
  spans: Span[];
  hints: { japanese: string; reading: string; meaning: string }[];
}
export interface SentencePhraseEntry {
  sentenceId: string;
  english: string;
  japanese: string;
  phrases: Phrase[];
}
export interface SentencePhraseSpan extends Span {
  phrase: string;
  hints: VocabularyHint[];
}
const entries = new Map(bank.entries.map((entry) => [entry.sentenceId, entry]));

// Read only supplied furigana; never guess a kanji reading or accept a partial annotation.
export function referenceReading(
  rendering: Rendering,
  japanese: string,
  occurrence?: number,
): string[] {
  const readings: string[] = [];
  for (const reading of rendering.readings) {
    for (
      let start = rendering.japanese.indexOf(japanese);
      start !== -1;
      start = rendering.japanese.indexOf(japanese, start + 1)
    ) {
      if (occurrence !== undefined && start !== occurrence) continue;
      const end = start + japanese.length;
      let kana = "";
      let valid = true;
      for (const part of reading.segments) {
        const left = Math.max(start, part.start);
        const right = Math.min(end, part.end);
        if (left < right) {
          if (part.surface === part.reading)
            kana += part.reading.slice(left - part.start, right - part.start);
          else if (left === part.start && right === part.end)
            kana += part.reading;
          else valid = false;
        }
      }
      if (valid) readings.push(hiragana(kana));
    }
  }
  return readings;
}

export const phraseHintEntries: readonly SentencePhraseEntry[] = bank.entries;

export type PhraseHintDropReason =
  | "stale-entry"
  | "empty-phrase"
  | "invalid-span"
  | "unverified-hint";

// Any invalid phrase rejects the whole entry; `drop` hears the reason.
export function sentencePhraseHints(
  sentence: Sentence,
  entry: SentencePhraseEntry | undefined = entries.get(sentence.id),
  drop: (reason: PhraseHintDropReason) => void = () => {},
): SentencePhraseSpan[] {
  if (!entry) return [];
  // Snapshot checks invalidate mappings when either sentence changes.
  if (
    entry.sentenceId !== sentence.id ||
    entry.english !== sentence.english ||
    entry.japanese !== sentence.reference.japanese
  ) {
    drop("stale-entry");
    return [];
  }
  const result: SentencePhraseSpan[] = [];
  const primaryReference = primaryRendering(sentence.reference);
  const wordTokens = [
    ...sentence.english.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu),
  ];
  const starts = new Set(wordTokens.map((token) => token.index));
  const ends = new Set(
    wordTokens.map((token) => token.index + token[0].length),
  );
  for (const phrase of entry.phrases) {
    if (!phrase.spans.length || !phrase.hints.length) {
      drop("empty-phrase");
      return [];
    }
    let previousEnd = -1;
    for (const span of phrase.spans) {
      if (
        !Number.isInteger(span.start) ||
        !Number.isInteger(span.end) ||
        span.start < previousEnd ||
        span.start >= span.end ||
        !starts.has(span.start) ||
        !ends.has(span.end) ||
        sentence.english.slice(span.start, span.end) !== span.text ||
        result.some(
          (existing) => existing.start < span.end && existing.end > span.start,
        )
      ) {
        drop("invalid-span");
        return [];
      }
      previousEnd = span.end;
    }
    for (const hint of phrase.hints) {
      if (
        !hint.japanese ||
        !hint.meaning ||
        !hint.reading ||
        /[\p{Script=Han}{}|]/u.test(hint.reading) ||
        !referenceReading(primaryReference, hint.japanese).includes(
          hiragana(hint.reading),
        )
      ) {
        drop("unverified-hint");
        return [];
      }
    }
    const hints = phrase.hints.map((hint) => ({
      ...hint,
      reading: hiragana(hint.reading),
      romaji: kanaToRomaji(hint.reading),
    }));
    const label = phrase.spans.map((span) => span.text).join(" … ");
    result.push(
      ...phrase.spans.map((span) => ({ ...span, phrase: label, hints })),
    );
  }
  return result.sort((a, b) => a.start - b.start);
}
