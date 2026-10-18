import type { GrammarAnnotation } from "../../shared/answer-entries";

// Derivations still explain an action inside advice, wishes, etc. Most nested
// matches are component readings of the outer construction and are suppressed.
const independentDerivations = new Set(["au", "naosu"]);
const overlaps = (left: GrammarAnnotation, right: GrammarAnnotation) =>
  left.start < right.end && left.end > right.start;

export function resolveGrammarMatches(
  detected: GrammarAnnotation[],
  annotations: GrammarAnnotation[],
): GrammarAnnotation[] {
  // Explicit, validated occurrence interpretations replace overlapping guesses
  // before containment is evaluated, so discarded guesses cannot hide a rule.
  const automatic = detected.filter(
    (match) => !annotations.some((annotation) => overlaps(annotation, match)),
  );
  return [
    ...annotations,
    ...automatic.filter(
      (match) =>
        match.grammarIds.some((id) => independentDerivations.has(id)) ||
        !automatic.some(
          (other) =>
            other.start <= match.start &&
            other.end >= match.end &&
            (other.start < match.start || other.end > match.end),
        ),
    ),
  ];
}
