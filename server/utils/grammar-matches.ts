import type { GrammarAnnotation } from "../../shared/answer-entries";

import {
  permitsClauseContent,
  retainsNestedDerivation,
} from "./grammar-policy";
import { overlaps } from "./grammar-matcher";

export function resolveGrammarMatches(
  detected: GrammarAnnotation[],
  annotations: GrammarAnnotation[],
): GrammarAnnotation[] {
  // Explicit, validated occurrence interpretations replace overlapping guesses
  // before containment is evaluated. A clause scope and its contents are
  // complementary, so annotating either one does not erase the other.
  const automatic = detected.filter(
    (match) =>
      !annotations.some(
        (annotation) =>
          overlaps(annotation, match) &&
          !permitsClauseContent(annotation, match) &&
          !permitsClauseContent(match, annotation),
      ),
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
            (other.start < match.start || other.end > match.end) &&
            !permitsClauseContent(other, match),
        ),
    ),
  ];
}
