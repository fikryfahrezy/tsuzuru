import { hiragana } from "../../shared/practice";
import {
  primaryReading,
  primaryRendering,
  type ReferenceLexeme,
  type Sentence,
} from "../../shared/sentence";
import { referenceReading } from "./sentence-phrase-hints";

export type { ReferenceLexeme };

export function referenceLexemes(sentence: Sentence): ReferenceLexeme[] {
  const rows = primaryReading(sentence.reference).lexemes ?? [];
  const primaryReference = primaryRendering(sentence.reference);
  return rows
    .filter((row) =>
      referenceReading(primaryReference, row.japanese).includes(
        hiragana(row.reading),
      ),
    )
    .map((row) => ({ ...row, reading: hiragana(row.reading) }));
}
