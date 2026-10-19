import type { GrammarAnnotation } from "../../shared/answer-entries";
import { lessonPolicies } from "./grammar-rules/lesson-policy";
import { overlaps, sameSpan } from "./grammar-matcher";

export const retainsNestedDerivation = (match: GrammarAnnotation) =>
  match.grammarIds.some((id) => lessonPolicies[id]?.retainNestedDerivation);

const isInflectedPredicate = (match: GrammarAnnotation) =>
  match.grammarIds.every(
    (id) => lessonPolicies[id]?.explainPredicateInflection,
  );

export function allowsPredicateInflection(
  match: GrammarAnnotation,
  contextual: GrammarAnnotation[],
) {
  return (
    isInflectedPredicate(match) &&
    !contextual.some(
      (other) =>
        other !== match &&
        overlaps(other, match) &&
        !(sameSpan(other, match) && isInflectedPredicate(other)),
    )
  );
}
