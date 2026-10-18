import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

export function emphaticGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
  detected: GrammarAnnotation[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const matches: GrammarAnnotation[] = [];
  for (const cue of base.filter((word) => word.japanese === "たとえ"))
    for (const condition of detected.filter((match) =>
      match.grammarIds.includes("te-mo-de-mo"),
    )) {
      if (
        condition.start <= cue.end ||
        /[。！？?!「」『』]/u.test(text.slice(cue.end, condition.start))
      )
        continue;
      matches.push({
        start: cue.start,
        end: condition.end,
        japanese: text.slice(cue.start, condition.end),
        grammarIds: ["tatoe-te-mo"],
      });
    }
  return matches;
}
