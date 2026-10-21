import type { AnswerBreakdownPart, AnswerChip } from "../../shared/practice";

// Identical chips still represent separate occurrences in the reference. Use
// each breakdown entry once so its source span and grammar stay distinct.
// A grouped phrase (もって + こいだ) appears at its first chip; its other chips
// have no entry of their own.
export function breakdownForChips(
  chips: readonly AnswerChip[],
  breakdown: readonly AnswerBreakdownPart[],
): AnswerBreakdownPart[] {
  const remaining = [...breakdown];
  return chips.flatMap((chip) => {
    let index = remaining.findIndex(
      (part) => part.japanese === chip.japanese && part.kana === chip.kana,
    );
    if (index < 0)
      index = remaining.findIndex(
        (part) =>
          part.japanese.length > chip.japanese.length &&
          part.japanese.startsWith(chip.japanese) &&
          part.kana.startsWith(chip.kana),
      );
    return index < 0 ? [] : remaining.splice(index, 1);
  });
}
