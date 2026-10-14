import raw from "../../data/processed/sentence-candidates.json";
import bank from "../../data/alternatives/answers.json";
import manifest from "../../data/manifest.json";
import spellingBank from "../../data/spelling-variants/bank.json";
import {
  verifiedSpellings,
  type SpellingBank,
} from "../../shared/writing-spellings";
import {
  acceptedAlternatives,
  type AlternativeBank,
} from "../../shared/accepted-alternatives";
import { validReadings, type Candidate } from "../../shared/practice";

export const exercises = (raw as Candidate[])
  .filter((row) => validReadings(row).length > 0)
  .map((row) => ({
    ...row,
    acceptedAlternatives: acceptedAlternatives(
      row,
      bank as AlternativeBank,
      manifest.revision,
    ),
  }))
  .map((row) => ({
    ...row,
    spellingVariants: verifiedSpellings(
      row,
      spellingBank as SpellingBank,
      manifest.revision,
    ),
  }));
export const exerciseById = new Map(exercises.map((row) => [row.id, row]));
