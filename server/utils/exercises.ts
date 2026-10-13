import raw from "../../data/processed/sentence-candidates.json";
import { validReadings, type Candidate } from "../../shared/practice";

export const exercises = (raw as Candidate[]).filter(
  (row) => validReadings(row).length > 0,
);
export const exerciseById = new Map(exercises.map((row) => [row.id, row]));
