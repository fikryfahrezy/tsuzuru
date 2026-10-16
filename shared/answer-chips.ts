import { hiragana, normalize, type AnswerChip } from "./practice";
import { primaryReading, type Sentence } from "./sentence";

export function answerChips(sentence: Sentence): AnswerChip[] {
  const { segments, wordBoundaries } = primaryReading(sentence.reference);
  const ends = new Set(wordBoundaries ?? []);
  const chips: AnswerChip[] = [];
  let offset = 0;
  let chip: AnswerChip = { japanese: "", kana: "" };
  for (const part of segments) {
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
  // Remove precisely the characters ignored by comparison, preserving original spelling.
  const withoutIgnored = (text: string) =>
    Array.from(text)
      .filter((character) => normalize(character))
      .join("");
  return chips
    .map((chip) => ({
      japanese: withoutIgnored(chip.japanese),
      kana: withoutIgnored(chip.kana),
    }))
    .filter((chip) => chip.japanese && chip.kana);
}
