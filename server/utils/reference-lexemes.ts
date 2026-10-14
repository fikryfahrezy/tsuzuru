import bank from "../../data/romaji/reference-lexemes.json";
import { hiragana, validReadings, type Candidate } from "../../shared/practice";
import { referenceReading } from "./sentence-phrase-hints";

export interface ReferenceLexeme {
  lemma: string;
  japanese: string;
  reading: string;
}

export function referenceLexemes(candidate: Candidate): ReferenceLexeme[] {
  const furigana = validReadings(candidate)[0];
  if (!furigana) return [];
  const rows = (bank as Record<string, ReferenceLexeme[]>)[furigana] ?? [];
  const primaryReference = { ...candidate, furiganaVariants: [furigana] };
  return rows
    .filter((row) =>
      referenceReading(primaryReference, row.japanese).includes(
        hiragana(row.reading),
      ),
    )
    .map((row) => ({ ...row, reading: hiragana(row.reading) }));
}
