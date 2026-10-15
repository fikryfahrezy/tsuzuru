import {
  normalize,
  isAlternativeMethod,
  type AlternativeProvenance,
  type Candidate,
} from "./practice";
import { isNonEmpty, parseReadings, type Readings } from "./sentence";

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

export enum AlternativeDropReason {
  StaleBank = "stale-bank",
  StaleEntry = "stale-entry",
  InvalidProvenance = "invalid-provenance",
  EmptyJapanese = "empty-japanese",
  Duplicate = "duplicate",
  NoValidReading = "no-valid-reading",
}

// Records failing validation are skipped; `drop` hears each one and why.
export function acceptedAlternatives(
  candidate: Candidate,
  bank: AlternativeBank,
  revision: string,
  drop: (reason: AlternativeDropReason) => void = () => {},
): {
  japanese: string;
  readings: Readings;
  provenance: AlternativeProvenance;
}[] {
  const entry = bank.entries[candidate.id];
  if (!entry) return [];
  const stale =
    bank.license !== "CC-BY-SA-4.0" || bank.sourceRevision !== revision
      ? AlternativeDropReason.StaleBank
      : entry.sourceEnglish !== candidate.english ||
          entry.sourceJapanese !== candidate.japanese
        ? AlternativeDropReason.StaleEntry
        : null;
  if (stale) {
    entry.alternatives.forEach(() => drop(stale));
    return [];
  }
  const seen = new Set([normalize(candidate.japanese)]);
  return entry.alternatives.flatMap((alternative) => {
    const reason: AlternativeDropReason | null =
      !alternative.provenance?.creator.trim() ||
      !alternative.provenance.note.trim() ||
      !isAlternativeMethod(alternative.provenance.method)
        ? AlternativeDropReason.InvalidProvenance
        : !alternative.japanese.trim()
          ? AlternativeDropReason.EmptyJapanese
          : seen.has(normalize(alternative.japanese))
            ? AlternativeDropReason.Duplicate
            : null;
    if (reason) {
      drop(reason);
      return [];
    }
    const readings = parseReadings(
      alternative.japanese,
      alternative.furiganaVariants,
    );
    if (!isNonEmpty(readings)) {
      drop(AlternativeDropReason.NoValidReading);
      return [];
    }
    seen.add(normalize(alternative.japanese));
    return [
      {
        japanese: alternative.japanese,
        readings,
        provenance: alternative.provenance,
      },
    ];
  });
}
