import { randomInt } from "node:crypto";
import boundaries from "../../data/romaji/word-boundaries.json";
import {
  hiragana,
  parts,
  validReadings,
  type AnswerChip,
  type Candidate,
} from "../../shared/practice";

export function answerChips(candidate: Candidate): AnswerChip[] {
  const reading = validReadings(candidate)[0];
  if (!reading) return [];
  const ends = new Set((boundaries as Record<string, number[]>)[reading] ?? []);
  const chips: AnswerChip[] = [];
  let offset = 0;
  let chip: AnswerChip = { japanese: "", kana: "" };
  for (const part of parts(reading)) {
    // Annotated kanji readings stay intact; literal kana can split at word boundaries.
    const units =
      part.surface === part.reading
        ? Array.from(part.surface, (text) => ({ surface: text, reading: text }))
        : [part];
    for (const unit of units) {
      if (chip.japanese && ends.has(offset)) {
        chips.push(chip);
        chip = { japanese: "", kana: "" };
      }
      chip.japanese += unit.surface;
      chip.kana += hiragana(unit.reading);
      offset += unit.reading.length;
    }
  }
  if (chip.japanese) chips.push(chip);
  return chips;
}

export function shuffledAnswerChips(candidate: Candidate): AnswerChip[] {
  const chips = answerChips(candidate);
  for (let index = chips.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [chips[index], chips[other]] = [chips[other]!, chips[index]!];
  }
  return chips;
}
