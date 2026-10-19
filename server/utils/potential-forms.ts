import type { AnswerEntry } from "./answer-entries";
import { potentialEndings, potentialVerbs } from "./grammar-rules/voice";
import { verbForms } from "./verb-forms";

const reviewed = potentialVerbs.filter(
  ([original]) => verbForms(original).length,
);

// Share the derived lemma between voice detection and construction matching.
// Its ichidan morphology does not require a separate vocabulary-bank entry.
export function potentialDerivation(
  entry: AnswerEntry,
  text = entry.japanese,
): string | undefined {
  if (!entry.wordTypes.includes("Verb")) return;
  for (const [original, derived] of reviewed) {
    if (
      (!entry.dictionaryForm ||
        entry.dictionaryForm === original ||
        entry.dictionaryForm === derived) &&
      entry.japanese.startsWith(derived.slice(0, -1)) &&
      potentialEndings.some((ending) =>
        text.startsWith(derived.slice(0, -1) + ending),
      )
    )
      return derived;
  }
  // Affirmative できる may mean ready/completed. Only inability is reviewed.
  if (["する", "できる", "出来る"].includes(entry.dictionaryForm ?? "")) {
    for (const root of ["でき", "出来"])
      if (
        entry.japanese.startsWith(root + "な") ||
        entry.japanese.startsWith(root + "ませ")
      )
        return root + "る";
  }
}
