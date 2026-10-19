import type { GrammarAnnotation } from "../../shared/answer-entries";
import { lessonPolicies } from "./grammar-rules/lesson-policy";
import { overlaps, sameSpan } from "./grammar-matcher";

export const retainsNestedDerivation = (match: GrammarAnnotation) =>
  match.grammarIds.some((id) => lessonPolicies[id]?.retainNestedDerivation);

const isInflectedPredicate = (match: GrammarAnnotation) =>
  match.grammarIds.every(
    (id) => lessonPolicies[id]?.explainPredicateInflection,
  );

function clauseMarkerEnd(match: GrammarAnnotation, id: string) {
  const prefix = lessonPolicies[id]?.clauseContentAfter?.find((marker) =>
    match.japanese.startsWith(marker),
  );
  return prefix === undefined ? undefined : match.start + prefix.length;
}

export function permitsClauseContent(
  outer: GrammarAnnotation,
  inner: { start: number; end: number },
) {
  return outer.grammarIds.every((id) => {
    const markerEnd = clauseMarkerEnd(outer, id);
    return (
      markerEnd !== undefined &&
      inner.start >= markerEnd &&
      inner.end <= outer.end
    );
  });
}

export function contextualParticleNote(
  part: { japanese: string; start: number; end: number },
  contextual: GrammarAnnotation[],
) {
  if (part.japanese !== "も") return;
  const scope = contextual.find(
    (match) =>
      match.grammarIds.includes("nani-mo-nai-dare-mo-nai") &&
      part.start >= match.start &&
      part.end <=
        (clauseMarkerEnd(match, "nani-mo-nai-dare-mo-nai") ?? match.start),
  );
  if (scope)
    return "With だれ/誰 or なに/何 and a negative predicate, も forms ‘nobody’ or ‘nothing’.";
}

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
        !permitsClauseContent(other, match) &&
        !(sameSpan(other, match) && isInflectedPredicate(other)),
    )
  );
}
