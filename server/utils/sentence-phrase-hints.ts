import bank from "../../data/phrase-hints/sentences.json";
import {
  hiragana,
  parts,
  validReadings,
  type Candidate,
  type VocabularyHint,
} from "../../shared/practice";
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
function referenceReading(candidate: Candidate, japanese: string): string[] {
  const readings: string[] = [];
  for (const reading of validReadings(candidate)) {
    for (
      let start = candidate.japanese.indexOf(japanese);
      start !== -1;
      start = candidate.japanese.indexOf(japanese, start + 1)
    ) {
      const end = start + japanese.length;
      let offset = 0;
      let kana = "";
      let valid = true;
      for (const part of parts(reading)) {
        const partEnd = offset + part.surface.length;
        const left = Math.max(start, offset);
        const right = Math.min(end, partEnd);
        if (left < right) {
          if (part.surface === part.reading)
            kana += part.reading.slice(left - offset, right - offset);
          else if (left === offset && right === partEnd) kana += part.reading;
          else valid = false;
        }
        offset = partEnd;
      }
      if (valid) readings.push(hiragana(kana));
    }
  }
  return readings;
}

export function sentencePhraseHints(
  candidate: Candidate,
  entry: SentencePhraseEntry | undefined = entries.get(candidate.id),
): SentencePhraseSpan[] {
  // Snapshot checks invalidate mappings when either sentence changes.
  if (
    !entry ||
    entry.sentenceId !== candidate.id ||
    entry.english !== candidate.english ||
    entry.japanese !== candidate.japanese
  )
    return [];
  const result: SentencePhraseSpan[] = [];
  const wordTokens = [
    ...candidate.english.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu),
  ];
  const starts = new Set(wordTokens.map((token) => token.index));
  const ends = new Set(
    wordTokens.map((token) => token.index + token[0].length),
  );
  for (const phrase of entry.phrases) {
    if (!phrase.spans.length || !phrase.hints.length) return [];
    let previousEnd = -1;
    for (const span of phrase.spans) {
      if (
        !Number.isInteger(span.start) ||
        !Number.isInteger(span.end) ||
        span.start < previousEnd ||
        span.start >= span.end ||
        !starts.has(span.start) ||
        !ends.has(span.end) ||
        candidate.english.slice(span.start, span.end) !== span.text ||
        result.some(
          (existing) => existing.start < span.end && existing.end > span.start,
        )
      )
        return [];
      previousEnd = span.end;
    }
    for (const hint of phrase.hints) {
      if (
        !hint.japanese ||
        !hint.meaning ||
        !hint.reading ||
        /[\p{Script=Han}{}|]/u.test(hint.reading) ||
        !referenceReading(candidate, hint.japanese).includes(
          hiragana(hint.reading),
        )
      )
        return [];
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
