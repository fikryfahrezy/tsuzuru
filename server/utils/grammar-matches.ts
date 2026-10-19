import type { GrammarAnnotation } from "../../shared/answer-entries";

import { retainsNestedDerivation } from "./grammar-policy";
import { overlaps } from "./grammar-matcher";

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
        retainsNestedDerivation(match) ||
        !automatic.some(
          (other) =>
            other.start <= match.start &&
            other.end >= match.end &&
            (other.start < match.start || other.end > match.end),
        ),
    ),
  ];
}
