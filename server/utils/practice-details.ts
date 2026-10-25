import type { SentenceAnswerAnnotations } from "../../shared/answer-entries";
import { HintSource, type PromptPart } from "../../shared/practice";
import type { Sentence } from "../../shared/sentence";
import { sentenceAnswerEntries } from "./answer-entries";
import { finalPredicate } from "./politeness-forms";

export function practiceDetails(
  sentence: Sentence,
  annotations?: SentenceAnswerAnnotations,
) {
  const { entries, hintMappings } = sentenceAnswerEntries(
    sentence,
    annotations,
  );
  const byId = new Map(entries.map((entry) => [entry.entryId, entry]));
  const spans = hintMappings
    .flatMap((mapping) =>
      mapping.spans.map((span) => ({
        ...span,
        phrase: mapping.spans.map((part) => part.text).join(" … "),
        hints: mapping.answerEntryIds.map((id) => {
          const entry = byId.get(id)!;
          return {
            answerEntryId: id,
            japanese: entry.japanese,
            reading: entry.kana,
            romaji: entry.romaji,
            meaning: entry.meanings[0]!,
            ...(entry.spellings ? { spellings: entry.spellings } : {}),
          };
        }),
      })),
    )
    .sort((a, b) => a.start - b.start);
  const hints: PromptPart[] = [];
  const unmapped = (text: string) => {
    for (const token of text.match(
      /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu,
    ) ?? []) {
      hints.push({
        text: token,
        isWord: /^[\p{L}\p{N}]/u.test(token),
        hints: [],
      });
    }
  };
  let offset = 0;
  for (const span of spans) {
    unmapped(sentence.english.slice(offset, span.start));
    hints.push({
      text: span.text,
      isWord: true,
      hints: span.hints,
      phrase: span.phrase,
      hintSource: HintSource.Sentence,
    });
    offset = span.end;
  }
  unmapped(sentence.english.slice(offset));
  // The forms belong to the word that ends the predicate (ない in では + ない).
  const predicate = finalPredicate(sentence);
  const answerBreakdown = predicate
    ? entries.map((entry) =>
        entry.start < predicate.end && entry.end >= predicate.end
          ? { ...entry, politenessForms: predicate.forms }
          : entry,
      )
    : entries;
  return { wordHints: hints, answerBreakdown };
}
