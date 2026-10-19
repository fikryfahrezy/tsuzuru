import type { AnswerEntry } from "./answer-entries";
import { rareruActions } from "./grammar-rules/voice";
import { verbForms } from "./verb-forms";

// Morphology establishes the candidate, never its potential/passive/respect role.
export function rareruForm(entry: AnswerEntry, verbClass?: string) {
  if (!entry.wordTypes.includes("Verb") || !entry.dictionaryForm) return;
  const original = entry.dictionaryForm;
  const action = rareruActions[original];
  if (!action) return;
  for (const forms of verbForms(original, verbClass)) {
    const roots = ["来る", "くる"].includes(original)
      ? ["来られ", "こられ"]
      : forms.stem === original.slice(0, -1)
        ? [forms.stem + "られ"]
        : [];
    for (const root of roots)
      if (entry.japanese.startsWith(root))
        return { root, lemma: root + "る", action };
  }
}
