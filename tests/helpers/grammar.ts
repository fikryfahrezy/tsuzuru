import { withBreakdownGrammar } from "../../server/utils/breakdown-grammar";
import type { AnswerEntry } from "../../server/utils/answer-entries";
import { exerciseById } from "../../server/utils/exercises";

export type Word = [
  text: string,
  types?: string[],
  lemma?: string,
  kana?: string,
];
export function lessons(words: Word[], english?: string) {
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const japanese = words.map(([word]) => word).join("");
  const sentence = {
    ...source,
    ...(english === undefined ? {} : { english }),
    reference: { ...source.reference, japanese },
  };
  let offset = 0;
  const base: AnswerEntry[] = words.flatMap(
    ([word, wordTypes = [], dictionaryForm, kana = word]) => {
      const start = offset;
      offset += word.length;
      if (/^[\p{P}\p{S}\s]+$/u.test(word)) return [];
      return [
        {
          japanese: word,
          kana,
          romaji: "",
          meanings: [],
          wordTypes,
          dictionaryForm,
          start,
          end: offset,
          entryId: `ja-${start}-${offset}`,
        },
      ];
    },
  );
  return withBreakdownGrammar(sentence, base, base).flatMap(
    (part) => part.grammar ?? [],
  );
}

export const hasLesson = (words: Word[], id: string) =>
  lessons(words).some((lesson) => lesson.id === id);
