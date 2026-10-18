import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { GrammarExplanation } from "../../shared/grammar";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { grammarById } from "./grammar-reference";
import { detectGrammar } from "./detect-grammar";
import { resolveGrammarMatches } from "./grammar-matches";

// Only unambiguous standalone forms belong here. Contextual handlers below
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
  if (!entry.dictionaryForm || entry.dictionaryForm === entry.japanese)
    return [];
  if (entry.wordTypes.includes("Verb")) {
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

export function validGrammarAnnotations(
  sentence: Sentence,
  base: AnswerEntry[],
  annotations: GrammarAnnotation[],
): boolean {
  return (
    Array.isArray(annotations) &&
    annotations.every(
      (annotation) =>
        annotation &&
        Number.isInteger(annotation.start) &&
        Number.isInteger(annotation.end) &&
        annotation.start >= 0 &&
        annotation.end > annotation.start &&
        sentence.reference.japanese.slice(annotation.start, annotation.end) ===
          annotation.japanese &&
        base.some((part) => part.start === annotation.start) &&
        base.some((part) => part.end === annotation.end) &&
        Array.isArray(annotation.grammarIds) &&
        annotation.grammarIds.length > 0 &&
        new Set(annotation.grammarIds).size === annotation.grammarIds.length &&
        annotation.grammarIds.every((id) => grammarById.has(id)),
    )
  );
}

export function withBreakdownGrammar(
  sentence: Sentence,
  entries: AnswerEntry[],
  base: AnswerEntry[],
  annotations: GrammarAnnotation[] = [],
): AnswerEntry[] {
  const contextual = resolveGrammarMatches(
    detectGrammar(sentence, base),
    annotations,
  );
  const automatic = base
    .filter(
      (part) =>
        !contextual.some(
          (annotation) =>
            annotation.start < part.end && annotation.end > part.start,
        ),
    )
    .map((part) => ({ ...part, grammarIds: formGrammar(part) }));
  const matches = [...contextual, ...automatic].sort(
    (a, b) => a.start - b.start,
  );
  const assigned = new Map<string, GrammarExplanation[]>();
  for (const match of matches) {
    const owner = entries.find(
      (part) => part.start <= match.start && part.end > match.start,
    );
    if (!owner) continue;
    const explanations = assigned.get(owner.entryId) ?? [];
    for (const id of match.grammarIds) {
      if (
        explanations.some(
          (entry) =>
            entry.id === id &&
            entry.start === match.start &&
            entry.end === match.end,
        )
      )
        continue;
      const lesson = grammarById.get(id)!;
      explanations.push({
        id,
        start: match.start,
        end: match.end,
        japanese: sentence.reference.japanese.slice(match.start, match.end),
        pattern: lesson.pattern,
        meaning: lesson.meaning,
        formation: lesson.formation,
        ...(lesson.notes ? { notes: lesson.notes } : {}),
        ...(lesson.examples[0]
          ? {
              example: { ja: lesson.examples[0].ja, en: lesson.examples[0].en },
            }
          : {}),
      });
    }
    if (explanations.length) assigned.set(owner.entryId, explanations);
  }
  return entries.map((part) => {
    const grammar = assigned.get(part.entryId);
    return { ...part, ...(grammar ? { grammar } : {}) };
  });
}
