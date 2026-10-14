import raw from "../../data/processed/sentence-candidates.json";
import bank from "../../data/alternatives/answers.json";
import manifest from "../../data/manifest.json";
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
  }));
export const exerciseById = new Map(exercises.map((row) => [row.id, row]));
