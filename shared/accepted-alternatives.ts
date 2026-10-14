import {
  normalize,
  isAlternativeMethod,
  validReadings,
  type AlternativeProvenance,
  type Candidate,
} from "./practice";

export interface AlternativeRecord {
  japanese: string;
  furiganaVariants: string[];
  provenance: AlternativeProvenance;
}
export interface AlternativeBank {
  license: "CC-BY-SA-4.0";
  sourceRevision: string;
  attribution: string;
  changes: string;
  entries: Record<
    string,
    {
      sourceEnglish: string;
      sourceJapanese: string;
      alternatives: AlternativeRecord[];
    }
  >;
}

export function acceptedAlternatives(
  candidate: Candidate,
  bank: AlternativeBank,
  revision: string,
) {
  if (bank.license !== "CC-BY-SA-4.0" || bank.sourceRevision !== revision)
    return [];
  const entry = bank.entries[candidate.id];
  if (
    !entry ||
    entry.sourceEnglish !== candidate.english ||
    entry.sourceJapanese !== candidate.japanese
  )
    return [];
  const seen = new Set([normalize(candidate.japanese)]);
  return entry.alternatives.flatMap((alternative) => {
    if (
      !alternative.provenance?.creator.trim() ||
      !alternative.provenance.note.trim() ||
      !isAlternativeMethod(alternative.provenance.method) ||
      !alternative.japanese.trim() ||
      seen.has(normalize(alternative.japanese))
    )
      return [];
    const readings = validReadings({ ...candidate, ...alternative });
    if (!readings.length) return [];
    seen.add(normalize(alternative.japanese));
    return [
      {
        japanese: alternative.japanese,
        furiganaVariants: readings,
        provenance: alternative.provenance,
      },
    ];
  });
}
