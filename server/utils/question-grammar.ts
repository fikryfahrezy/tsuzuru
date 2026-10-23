import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

function isPredicate(entry: AnswerEntry): boolean {
  if (entry.wordTypes.includes("Copula")) return true;
  if (entry.wordTypes.includes("い-adjective")) return true;
  // Dictionary suru nouns such as 洗濯 also carry the Verb label. They
  // cannot establish a predicate on their own.
  if (entry.wordTypes.includes("Verb") && !entry.wordTypes.includes("Noun"))
    return true;
  if (
    ["です", "でした", "だった", "でしょう", "だろう"].includes(entry.japanese)
  )
    return true;
  // Some supplied inflections (いいです, もらえます) have a verified lemma
  // but no vocabulary category. Keep that lemma requirement for suffixes.
  return (
    !!entry.dictionaryForm &&
    /(?:です|ます|ました|ません|ませんでした)$/u.test(entry.japanese)
  );
}

export function questionGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const clauseEnd = (end: number) =>
    /^\s*(?:$|[。？！?!」』”"）)])/u.test(text.slice(end));
  return base.flatMap((entry, index) => {
    // Casual questions end in い: 本気かい, どうだい. い alone marks the
    // question, so no predicate is needed before it.
    const next = base[index + 1];
    const casual =
      next?.japanese === "い" &&
      next.start === entry.end &&
      clauseEnd(next.end) &&
      ((entry.japanese === "か" && entry.wordTypes.includes("Particle")) ||
        (entry.japanese === "だ" && entry.wordTypes.includes("Copula")));
    if (casual)
      return [
        {
          start: entry.start,
          end: next.end,
          japanese: entry.japanese + "い",
          grammarIds: ["ka-question"],
        },
      ];
    if (entry.japanese !== "か" || !entry.wordTypes.includes("Particle"))
      return [];
    // Only clause-ending questions. Internal choices, indefinite forms, and
    // embedded questions (かどうか, か分からない) need other handlers.
    if (!clauseEnd(entry.end)) return [];
    let previous = base[index - 1];
    if (!previous || previous.end !== entry.start) return [];
    // Explanatory のか / んか still requires a predicate before の / ん.
    if (["の", "ん"].includes(previous.japanese)) {
      const predicate = base[index - 2];
      if (!predicate || predicate.end !== previous.start) return [];
      previous = predicate;
    }
    if (!isPredicate(previous)) return [];
    return [
      {
        start: entry.start,
        end: entry.end,
        japanese: entry.japanese,
        grammarIds: ["ka-question"],
      },
    ];
  });
}
