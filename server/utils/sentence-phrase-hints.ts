import bank from "../../data/answer-entries/sentences.json";
import { hiragana } from "../../shared/practice";
import {
  primaryRendering,
  type PhraseHintSpan,
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
// Phrase-hint entries keyed by sentence ID, like the other banks.
export type PhraseHintBank = Record<string, SentencePhraseEntry>;

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

// Compatibility for dictionary tooling. Practice responses use answer entries
// directly; contextual meaning and pronunciation are maintained only once.
export const phraseHintEntries: readonly SentencePhraseEntry[] = (
  bank.version === 1 ? bank.entries : []
).flatMap((entry) => {
  const answers = new Map(
    entry.answerEntries.map((answer) => [answer.id, answer]),
  );
  if (
    entry.hintMappings.some((mapping) =>
      mapping.answerEntryIds.some((id) => !answers.has(id)),
    )
  )
    return [];
  return [
    {
      sentenceId: entry.sentenceId,
      english: entry.english,
      japanese: entry.japanese,
      phrases: entry.hintMappings.map((mapping) => ({
        spans: mapping.spans,
        hints: mapping.answerEntryIds.map((id) => {
          const answer = answers.get(id)!;
          return {
            japanese: answer.japanese,
            reading: answer.reading,
            meaning: answer.meaning,
          };
        }),
      })),
    },
  ];
});

export function phraseHintBank(
  entries: readonly SentencePhraseEntry[],
): PhraseHintBank {
  return Object.fromEntries(entries.map((entry) => [entry.sentenceId, entry]));
}

export enum PhraseHintDropReason {
  StaleEntry = "stale-entry",
  EmptyPhrase = "empty-phrase",
  InvalidSpan = "invalid-span",
  UnverifiedHint = "unverified-hint",
}

// Validates an entry once at load. Any invalid phrase rejects the whole
// entry; `drop` hears the reason.
export function sentencePhraseHints(
  sentence: Pick<Sentence, "id" | "english" | "reference">,
  entry: SentencePhraseEntry | undefined,
  drop: (reason: PhraseHintDropReason) => void = () => {},
): PhraseHintSpan[] {
  if (!entry) return [];
  // Snapshot checks invalidate mappings when either sentence changes.
  if (
    entry.sentenceId !== sentence.id ||
    entry.english !== sentence.english ||
    entry.japanese !== sentence.reference.japanese
  ) {
    drop(PhraseHintDropReason.StaleEntry);
    return [];
  }
  const result: PhraseHintSpan[] = [];
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
      drop(PhraseHintDropReason.EmptyPhrase);
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
        drop(PhraseHintDropReason.InvalidSpan);
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
        drop(PhraseHintDropReason.UnverifiedHint);
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
