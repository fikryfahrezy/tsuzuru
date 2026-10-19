import type { AnswerBreakdownPart, AnswerChip } from "../../shared/practice";

// Identical chips still represent separate occurrences in the reference. Use
// each breakdown entry once so its source span and grammar stay distinct.
export function breakdownForChips(
  chips: readonly AnswerChip[],
  breakdown: readonly AnswerBreakdownPart[],
): AnswerBreakdownPart[] {
  const remaining = [...breakdown];
  return chips.flatMap((chip) => {
    const index = remaining.findIndex(
      (part) => part.japanese === chip.japanese && part.kana === chip.kana,
    );
    return index < 0 ? [] : remaining.splice(index, 1);
  });
}
