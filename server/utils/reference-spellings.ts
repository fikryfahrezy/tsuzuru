import type { VocabularyHint } from "../../shared/practice";
import {
  primaryReading,
  primaryRendering,
  type Sentence,
} from "../../shared/sentence";
import { referenceReading } from "./sentence-phrase-hints";

export function referenceSpellings(
  sentence: Sentence,
  hint: Pick<VocabularyHint, "japanese" | "reading">,
): string[] {
  const { reference } = sentence;
  const primary = primaryReading(reference).furigana;
  const primaryReference = primaryRendering(reference);
  const variants = new Set<string>();
  for (const spelling of reference.spellings) {
    if (spelling.furigana !== primary) continue;
    for (
      let start = reference.japanese.indexOf(hint.japanese);
      start !== -1;
      start = reference.japanese.indexOf(hint.japanese, start + 1)
    ) {
      if (
        !referenceReading(primaryReference, hint.japanese, start).includes(
          hint.reading,
        )
      )
        continue;
      const end = start + hint.japanese.length;
      for (const span of spelling.spans) {
        if (span.start < start || span.end > end) continue;
        for (const spelling of span.spellings) {
          const word =
            hint.japanese.slice(0, span.start - start) +
            spelling +
            hint.japanese.slice(span.end - start);
          if (word !== hint.japanese) variants.add(word);
        }
      }
    }
  }
  return [...variants].slice(0, 3);
}
