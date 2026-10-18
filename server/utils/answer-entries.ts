import {
  validGrammarAnnotations,
  withBreakdownGrammar,
} from "./breakdown-grammar";
import bank from "../../data/answer-entries/sentences.json";
import type { SentenceAnswerAnnotations } from "../../shared/answer-entries";
import {
  hiragana,
  normalize,
  type AnswerBreakdownPart,
} from "../../shared/practice";
import {
  primaryReading,
  primaryRendering,
  type Sentence,
} from "../../shared/sentence";
import { answerBreakdown } from "./answer-breakdown";
import { answerChips } from "./answer-chips";
import { referenceReading } from "./sentence-phrase-hints";
import { referenceSpellings } from "./reference-spellings";

export const answerAnnotationRecords: readonly SentenceAnswerAnnotations[] =
  bank.version === 1 ? bank.entries : [];
const annotations = new Map(
  answerAnnotationRecords.map((entry) => [entry.sentenceId, entry]),
);
export interface AnswerEntry extends AnswerBreakdownPart {
  entryId: string;
  start: number;
  end: number;
}
// Raw positioned words, before maintained meanings, grouping, or grammar links.
export function baseAnswerEntries(sentence: Sentence): AnswerEntry[] {
  const chips = answerChips(sentence);
  const dictionary = answerBreakdown(sentence, chips);
  // Preserve source UTF-16 positions while chips omit comparison punctuation.
  const offsets: { start: number; end: number }[] = [];
  let rawOffset = 0;
  for (const character of sentence.reference.japanese) {
    if (normalize(character)) {
      for (let i = 0; i < character.length; i++)
        offsets.push({ start: rawOffset, end: rawOffset + character.length });
    }
    rawOffset += character.length;
  }
  const entries: AnswerEntry[] = [];
  let offset = 0;
  let dictionaryIndex = 0;
  for (const chip of chips) {
    const start = offsets[offset]!.start;
    const end = offsets[offset + chip.japanese.length - 1]!.end;
    offset += chip.japanese.length;
    if (!/[\p{L}\p{N}]/u.test(chip.japanese)) continue;
    const spellings = referenceSpellings(sentence, {
      japanese: chip.japanese,
      reading: chip.kana,
    });
    entries.push({
      ...dictionary[dictionaryIndex++]!,
      ...(spellings.length ? { spellings } : {}),
      entryId: `ja-${start}-${end}`,
      start,
      end,
    });
  }
  return entries;
}
export function sentenceAnswerEntries(
  sentence: Sentence,
  record: SentenceAnswerAnnotations | undefined = annotations.get(sentence.id),
) {
  const base = baseAnswerEntries(sentence);
  const fallback = {
    entries: withBreakdownGrammar(sentence, base, base),
    hintMappings: [],
    validAnnotations: false,
  };
  if (
    !record ||
    record.sentenceId !== sentence.id ||
    record.english !== sentence.english ||
    record.japanese !== sentence.reference.japanese ||
    record.furigana !== primaryReading(sentence.reference).furigana
  )
    return fallback;
  if (!validGrammarAnnotations(sentence, base, record.grammarAnnotations ?? []))
    return fallback;
  const replacements: AnswerEntry[] = [];
  const ids = new Set<string>();
  for (const entry of record.answerEntries) {
    const covered = base.filter(
      (part) => part.start >= entry.start && part.end <= entry.end,
    );
    if (
      !Number.isInteger(entry.start) ||
      !Number.isInteger(entry.end) ||
      entry.start < 0 ||
      entry.start >= entry.end ||
      entry.id !== `ja-${entry.start}-${entry.end}` ||
      ids.has(entry.id) ||
      !entry.meaning.trim() ||
      !entry.reading ||
      (entry.wordTypes !== undefined &&
        !entry.wordTypes.every(
          (type) => typeof type === "string" && type.trim(),
        )) ||
      sentence.reference.japanese.slice(entry.start, entry.end) !==
        entry.japanese ||
      !referenceReading(
        primaryRendering(sentence.reference),
        entry.japanese,
        entry.start,
      ).includes(hiragana(entry.reading)) ||
      covered[0]?.start !== entry.start ||
      covered.at(-1)?.end !== entry.end ||
      covered.map((part) => part.kana).join("") !== hiragana(entry.reading) ||
      replacements.some(
        (part) => part.start < entry.end && part.end > entry.start,
      )
    )
      return fallback;
    ids.add(entry.id);
    const first = covered[0]!;
    const spellings = referenceSpellings(sentence, entry);
    // Context belongs to this occurrence. A phrase can cover several chips.
    replacements.push({
      ...(covered.length === 1 ? first : { wordTypes: [] }),
      entryId: entry.id,
      start: entry.start,
      end: entry.end,
      japanese: entry.japanese,
      kana: hiragana(entry.reading),
      romaji: covered.map((part) => part.romaji).join(""),
      meanings: [entry.meaning],
      ...(entry.wordTypes ? { wordTypes: entry.wordTypes } : {}),
      ...(spellings.length ? { spellings } : {}),
    });
  }
  const words = [
    ...sentence.english.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu),
  ];
  const starts = new Set(words.map((match) => match.index));
  const ends = new Set(words.map((match) => match.index + match[0].length));
  const used: { start: number; end: number }[] = [];
  for (const mapping of record.hintMappings) {
    if (
      !mapping.spans.length ||
      !mapping.answerEntryIds.length ||
      new Set(mapping.answerEntryIds).size !== mapping.answerEntryIds.length ||
      mapping.answerEntryIds.some((id) => !ids.has(id))
    )
      return fallback;
    let previousEnd = -1;
    for (const span of mapping.spans) {
      if (
        !Number.isInteger(span.start) ||
        !Number.isInteger(span.end) ||
        span.start < previousEnd ||
        span.start >= span.end ||
        !starts.has(span.start) ||
        !ends.has(span.end) ||
        sentence.english.slice(span.start, span.end) !== span.text ||
        used.some((other) => other.start < span.end && other.end > span.start)
      )
        return fallback;
      previousEnd = span.end;
      used.push(span);
    }
  }
  return {
    entries: withBreakdownGrammar(
      sentence,
      [
        ...base.filter(
          (part) =>
            !replacements.some(
              (entry) => entry.start <= part.start && entry.end >= part.end,
            ),
        ),
        ...replacements,
      ].sort((a, b) => a.start - b.start),
      base,
      record.grammarAnnotations,
    ),
    hintMappings: record.hintMappings,
    validAnnotations: true,
  };
}
