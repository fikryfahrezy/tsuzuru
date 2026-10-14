import { expect, test } from "bun:test";
import { wordHints } from "../server/utils/word-hints";
import { exerciseById, exercises } from "../server/utils/exercises";
import type { Candidate } from "../shared/practice";

const water: Candidate = {
  ...exercises[0]!,
  english: "I drink water.",
  japanese: "私は水を飲みます。",
  furiganaVariants: ["{私|わたし}は{水|みず}を{飲|の}みます。"],
};

test("each English word has a clickable hint and punctuation preserves the original prompt", () => {
  const tokens = wordHints(water);
  expect(tokens.map((token) => token.text).join("")).toBe(water.english);
  expect(
    tokens.filter((token) => token.isWord).map((token) => token.text),
  ).toEqual(["I", "drink", "water"]);
  expect(tokens.find((token) => token.text === "I")?.hints[0]?.japanese).toBe(
    "私",
  );
  expect(
    tokens.find((token) => token.text === "drink")?.hints[0]?.japanese,
  ).toBe("飲む");
  expect(
    tokens.find((token) => token.text === "water")?.hints[0]?.japanese,
  ).toBe("水");
  expect(
    tokens.find((token) => token.text === "water")?.hints[0],
  ).toMatchObject({
    japanese: "水",
    reading: "みず",
    romaji: "mizu",
  });
  expect(
    tokens.find((token) => token.text === "drink")?.hints[0],
  ).toMatchObject({
    japanese: "飲む",
    reading: "のむ",
    romaji: "nomu",
  });
  expect(tokens.find((token) => token.text === ".")).toMatchObject({
    isWord: false,
    hints: [],
  });
});

test("dataset vocabulary is prioritized and articles do not acquire misleading dictionary hints", () => {
  const tennis = exerciseById.get("004f3984827963025986b55a")!;
  const tokens = wordHints(tennis);
  expect(tokens.find((token) => token.text === "tennis")?.hints).toEqual([
    {
      japanese: "テニス",
      reading: "てにす",
      romaji: "tenisu",
      meaning: "tennis",
    },
  ]);
  expect(tokens.find((token) => token.text === "the")).toMatchObject({
    isWord: true,
    hints: [],
  });
  expect(
    tokens
      .find((token) => token.text === "year")
      ?.hints.some((hint) => hint.japanese === "年中"),
  ).toBe(true);
});

test("contractions, hyphenated words, whitespace, and unknown words remain intact", () => {
  const english = "I'm drinking  water—it's ice-cold! Zqxv.";
  const tokens = wordHints({ ...water, english });
  expect(tokens.map((token) => token.text).join("")).toBe(english);
  expect(
    tokens.filter((token) => token.isWord).map((token) => token.text),
  ).toEqual(["I'm", "drinking", "water", "it's", "ice-cold", "Zqxv"]);
  expect(
    tokens.find((token) => token.text === "drinking")?.hints[0]?.japanese,
  ).toBe("飲む");
  expect(tokens.find((token) => token.text === "Zqxv")).toMatchObject({
    isWord: true,
    hints: [],
  });
});
