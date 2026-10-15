import { expect, test } from "bun:test";
import { answerChips, shuffledAnswerChips } from "../server/utils/answer-chips";
import { exercises } from "../server/utils/exercises";
import { compare, Strictness, type Candidate } from "../shared/practice";

test("chips reconstruct accepted Japanese and kana answers throughout the sentence bank", () => {
  for (const candidate of exercises) {
    const chips = answerChips(candidate);
    const japanese = chips.map((chip) => chip.japanese).join("");
    const kana = chips.map((chip) => chip.kana).join("");
    expect(japanese).toBe(candidate.japanese);
    expect(compare(candidate, japanese, Strictness.Exact).matched).toBe(true);
    expect(compare(candidate, kana, Strictness.Kana).matched).toBe(true);
    expect(chips.every((chip) => chip.japanese && chip.kana)).toBe(true);
  }
});

test("shuffling preserves duplicate words and both spellings", () => {
  const candidate = exercises.find((row) => {
    const chips = answerChips(row);
    return new Set(chips.map((chip) => chip.japanese)).size < chips.length;
  })!;
  const original = answerChips(candidate);
  const shuffled = shuffledAnswerChips(candidate);
  expect(shuffled.map((chip) => JSON.stringify(chip)).sort()).toEqual(
    original.map((chip) => JSON.stringify(chip)).sort(),
  );
});

test("a sentence without recorded boundaries still provides a complete answer", () => {
  const candidate: Candidate = {
    ...exercises[0]!,
    japanese: "未知の文。",
    furiganaVariants: ["{未知|みち}の{文|ぶん}。"],
  };
  expect(answerChips(candidate)).toEqual([
    { japanese: "未知の文。", kana: "みちのぶん。" },
  ]);
});
