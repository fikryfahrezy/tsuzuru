import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { AnswerEntry } from "./answer-entries";
import { potentialDerivation } from "./potential-forms";
import { allowsPredicateInflection } from "./grammar-policy";
import { overlaps } from "./grammar-matcher";

// Only unambiguous standalone forms belong here. Contextual handlers
// cover specific constructions (e.g. がほしい, てから, and question か).
// Particle handlers use neighboring words, predicate roles, and lexical cues.
// Ambiguous uses still need annotations; spelling alone cannot select a lesson.
const standalone: Record<string, string> = {
  は: "wa",
  を: "o",
  へ: "e",
  も: "mo",
  や: "ya",
  まで: "made",
  ね: "ne",
  よ: "yo",
  です: "desu",
  でした: "deshita",
  だ: "da",
  ではない: "de-wa-arimasen-ja-nai",
  じゃない: "de-wa-arimasen-ja-nai",
  ではありません: "de-wa-arimasen-ja-nai",
};

function formGrammar(entry: AnswerEntry): string[] {
  const id = standalone[entry.japanese];
  if (id) return [id];
  // A suffix alone does not establish grammar (e.g. 頭 is not a past verb).
  const lemma = entry.dictionaryForm ?? potentialDerivation(entry);
  if (!lemma || lemma === entry.japanese) return [];
  if (entry.wordTypes.includes("Verb")) {
    if (entry.japanese.endsWith("なかった")) return ["nai", "ta"];
    for (const [ending, grammarId] of [
      ["ませんでした", "masen-deshita"],
      ["ました", "mashita"],
      ["ません", "masen"],
      ["ます", "masu"],
      ["ましょう", "mashou"],
      ["ない", "nai"],
      ["た", "ta"],
      ["だ", "ta"],
      ["て", "te"],
      ["で", "te"],
    ] as const) {
      if (entry.japanese.endsWith(ending)) return [grammarId];
    }
  }
  if (
    entry.wordTypes.includes("い-adjective") &&
    /(?:くない|かった|くなかった)$/u.test(entry.japanese)
  ) {
    return ["ku-nai-katta-ku-nakatta"];
  }
  return [];
}

export function inflectionGrammar(
  base: AnswerEntry[],
  contextual: GrammarAnnotation[],
): GrammarAnnotation[] {
  // Work on the matched predicate span, which may cross tokenizer words.
  // A containing construction still owns its component inflections.
  const inflections = contextual
    .filter((match) => allowsPredicateInflection(match, contextual))
    .map((match) => {
      const words = base.filter(
        (part) => part.start >= match.start && part.end <= match.end,
      );
      const first = words[0];
      const entry = first
        ? {
            ...first,
            japanese: match.japanese,
            end: match.end,
            wordTypes: ["Verb"],
            dictionaryForm:
              first.dictionaryForm ??
              words.find(
                (part) =>
                  part.wordTypes.includes("Verb") && part.dictionaryForm,
              )?.dictionaryForm,
          }
        : undefined;
      return { ...match, grammarIds: entry ? formGrammar(entry) : [] };
    });
  const automatic = base
    .filter(
      (part) => !contextual.some((annotation) => overlaps(annotation, part)),
    )
    .map((part) => ({ ...part, grammarIds: formGrammar(part) }));
  return [...inflections, ...automatic];
}
