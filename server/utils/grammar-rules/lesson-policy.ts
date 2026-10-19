import { clauseScopeMarkers } from "./scope";

interface LessonPolicy {
  retainNestedDerivation?: boolean;
  explainPredicateInflection?: boolean;
  clauseContentAfter?: readonly string[];
}

// These are separate capabilities: retaining a derivation inside a construction
// does not grant its component inflections permission to bypass that construction.
export const lessonPolicies: Record<string, LessonPolicy> = {
  ...Object.fromEntries(
    Object.entries(clauseScopeMarkers).map(([id, markers]) => [
      id,
      { clauseContentAfter: markers },
    ]),
  ),
  au: { retainNestedDerivation: true },
  naosu: { retainNestedDerivation: true },
  "eru-rareru-potential": {
    retainNestedDerivation: true,
    explainPredicateInflection: true,
  },
  "reru-rareru-passive": { explainPredicateInflection: true },
  sonkeigo: { explainPredicateInflection: true },
  "reru-rareru-honorific": { explainPredicateInflection: true },
  kenjougo: { explainPredicateInflection: true },
};
