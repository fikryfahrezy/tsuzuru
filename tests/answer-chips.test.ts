import { expect, test } from "bun:test";
import { answerChips, shuffledAnswerChips } from "../server/utils/answer-chips";
import { candidates, exercises } from "../server/utils/exercises";
import { sentence } from "./sentences";
import { compare, normalize, Strictness } from "../shared/practice";

test("chips reconstruct accepted Japanese and kana answers throughout the sentence bank", () => {
  for (const candidate of exercises) {
    const chips = answerChips(candidate);
    const japanese = chips.map((chip) => chip.japanese).join("");
    const kana = chips.map((chip) => chip.kana).join("");
    expect(normalize(japanese)).toBe(normalize(candidate.reference.japanese));
    expect(compare(candidate, japanese, Strictness.Exact).matched).toBe(true);
    expect(compare(candidate, kana, Strictness.Kana).matched).toBe(true);
    expect(chips.every((chip) => chip.japanese && chip.kana)).toBe(true);
    expect(
      chips.every((chip) =>
        Array.from(chip.japanese + chip.kana).every(
          (character) => !!normalize(character),
        ),
      ),
    ).toBe(true);
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
  const candidate = sentence({
    ...candidates[0]!,
    japanese: "未知の文。",
    furiganaVariants: ["{未知|みち}の{文|ぶん}。"],
  });
  expect(answerChips(candidate)).toEqual([
    { japanese: "未知の文", kana: "みちのぶん" },
  ]);
});

test("chips remove ignored punctuation and spacing while retaining significant symbols and spelling", () => {
  const text = "「ﾐｽﾞ」、。,.!?！？，． \t\n：；・ー";
  const candidate = sentence({
    ...candidates[0]!,
    japanese: text,
    furiganaVariants: [text],
  });
  expect(answerChips(candidate)).toEqual([
    { japanese: "「ﾐｽﾞ」：；・ー", kana: "「ﾐｽﾞ」：；・ー" },
  ]);
});
