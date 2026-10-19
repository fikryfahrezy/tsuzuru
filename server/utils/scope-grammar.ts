import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { finite, nominal } from "./grammar-context";
import { negativeQuantifiers, scopeAdverbs } from "./grammar-rules/scope";

const negative = /(?:ない|なかった|ません|ませんでした)(?:です)?$/u;
const adverbs: Record<string, string> = Object.fromEntries(
  scopeAdverbs.flatMap(([id, markers]) =>
    markers.map((marker) => [marker, id]),
  ),
);

export function scopeGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
  verbs: GrammarAnnotation[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const ends = new Set(base.map((entry) => entry.end));
  const matches: GrammarAnnotation[] = [];
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    let id = Object.hasOwn(adverbs, entry.japanese)
      ? adverbs[entry.japanese]
      : undefined;
    let markerEnd = entry.end;
    if (
      !id &&
      text.startsWith("しか", entry.start) &&
      ends.has(entry.start + 2) &&
      previous?.end === entry.start &&
      nominal(previous)
    ) {
      id = "shika-nai";
      markerEnd = entry.start + 2;
    }
    if (!id) {
      const form = negativeQuantifiers.find(
        (word) =>
          text.startsWith(word, entry.start) &&
          ends.has(entry.start + word.length),
      );
      if (form) {
        if (text.startsWith("かも", entry.start + form.length)) continue;
        id = "nani-mo-nai-dare-mo-nai";
        markerEnd = entry.start + form.length;
      }
    }
    if (!id && entry.japanese === "まだ") id = "mada-te-inai";
    if (!id) continue;
    let cursor = markerEnd;
    for (const candidate of base
      .slice(index + 1)
      .filter((word) => word.start >= markerEnd)) {
      // A later negative in another clause cannot license this marker.
      if (
        text.slice(cursor, candidate.start) !== "" ||
        candidate.wordTypes.includes("Conjunction")
      )
        break;
      cursor = candidate.end;
      const isNegative =
        negative.test(candidate.japanese) &&
        (candidate.wordTypes.some((type) =>
          ["Verb", "い-adjective", "Copula"].includes(type),
        ) ||
          /^(?:ない|なかった|ないです|なかったです)$/u.test(
            candidate.japanese,
          ));
      if (!isNegative && !finite(candidate)) continue;
      if (
        isNegative &&
        (id !== "mada-te-inai" ||
          verbs.some(
            (match) =>
              match.grammarIds.includes("te-iru") &&
              match.start >= markerEnd &&
              match.end === candidate.end,
          ))
      )
        matches.push({
          start: entry.start,
          end: candidate.end,
          japanese: text.slice(entry.start, candidate.end),
          grammarIds: [id],
        });
      break;
    }
  }
  return matches;
}
