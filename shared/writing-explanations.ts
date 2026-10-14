import {
  parts,
  validReadings,
  type Candidate,
  type DifferenceDetails,
  Strictness,
  DifferenceKind,
  type WritingExplanation,
} from "./practice";
import { writingDifferences } from "./writing-diff";

export function explainWriting(
  candidate: Candidate,
  answer: string,
  mode: Strictness,
  differences: DifferenceDetails,
): WritingExplanation[] {
  const explanations: WritingExplanation[] = [];
  if (mode === Strictness.Kana && /\p{Script=Han}/u.test(answer)) {
    explanations.push({
      title: "Kanji in kana-only mode",
      detail:
        "Kana-only mode requires hiragana or katakana. Replace kanji with the supplied readings, or choose Kana + kanji to keep them.",
      actual: answer,
      expected: differences.expected.map((part) => part.text).join(""),
    });
  }
  if (
    mode === Strictness.Exact &&
    writingDifferences(candidate, answer, Strictness.Flexible).answer.every(
      (part) => part.kind === DifferenceKind.Same,
    )
  ) {
    return [
      {
        title: "Writing mode mismatch",
        detail:
          "Your spelling is accepted in Kana + kanji mode, but Exact writing requires the reference’s specific kanji and kana. Use the reference spelling, or switch writing modes and check again.",
        actual: answer,
        expected: candidate.japanese,
      },
    ];
  }
  for (const edit of differences.edits ?? []) {
    if (!edit.actual) {
      explanations.push({
        title: "Missing text",
        detail:
          "This text is present in the reference but missing from your answer. Insert it at the position shown in brackets.",
        ...edit,
      });
    } else if (!edit.expected) {
      explanations.push({
        title: "Extra text",
        detail:
          "This text is not present at this position in the reference. Remove it to match this reference.",
        ...edit,
      });
    } else {
      const kanji =
        /\p{Script=Han}/u.test(edit.expected) ||
        /\p{Script=Han}/u.test(edit.actual);
      const word = validReadings(candidate)
        .flatMap(parts)
        .find(
          (part) =>
            part.surface === edit.expected && part.surface !== part.reading,
        );
      explanations.push({
        title: kanji ? "Different kanji or spelling" : "Different spelling",
        detail:
          word && mode === Strictness.Flexible
            ? `The reference uses 「${word.surface}」, with the supplied reading 「${word.reading}」. This mode accepts the reference spelling, its reading, and verified spelling variants recorded for this sentence.`
            : "The reference uses different text at this position. Replace the highlighted text with the expected spelling shown below. This comparison does not determine whether an alternative translation is grammatically valid.",
        ...edit,
      });
    }
  }
  return explanations;
}
