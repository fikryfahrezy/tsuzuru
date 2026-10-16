import { randomInt } from "node:crypto";
import type { AnswerChip } from "../../shared/practice";
import type { Sentence } from "../../shared/sentence";
import { answerChips } from "../../shared/answer-chips";

export { answerChips };

export function shuffledAnswerChips(sentence: Sentence): AnswerChip[] {
  const chips = answerChips(sentence);
  for (let index = chips.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [chips[index], chips[other]] = [chips[other]!, chips[index]!];
  }
  return chips;
}
