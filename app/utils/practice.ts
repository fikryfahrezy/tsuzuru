import { Level, Length, Strictness, type Comparison } from "#shared/practice";

export enum JournalOutcome {
  Matched = "matched",
  Unmatched = "unmatched",
  Revealed = "revealed",
}

export enum PracticeTab {
  Practice = "practice",
  Journal = "journal",
}

export enum AnswerInput {
  Type = "type",
  Chips = "chips",
}

export type JournalEntry = {
  id: string;
  english: string;
  answer: string;
  reference: string;
  outcome: JournalOutcome;
  date: string;
  level: Level;
  mode?: Strictness;
  comparison?: Comparison | null;
};
export const lengthOptions = [
  { value: Length.Short, label: "Short", note: "1–7 words" },
  { value: Length.Medium, label: "Medium", note: "8–12 words" },
  { value: Length.Long, label: "Long", note: "13+ words" },
] as const;
export const modes = [
  { value: Strictness.Kana, label: "Kana only", mark: "あ" },
  { value: Strictness.Flexible, label: "Kana + kanji", mark: "あ漢" },
  { value: Strictness.Exact, label: "Exact writing", mark: "漢" },
] as const;
