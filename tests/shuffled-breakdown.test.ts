import { expect, test } from "bun:test";
import { breakdownForChips } from "../app/utils/answer-breakdown";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import { answerChips } from "../server/utils/answer-chips";

test("the glasses sentence keeps both は occurrences and highlights the one after なくて", () => {
  const sentence = exerciseById.get("f59d6acae2b73b0a0aa0ded9")!;
  const original = practiceDetails(sentence).answerBreakdown;
  const chips = answerChips(sentence).reverse();
  const displayed = breakdownForChips(chips, original);
  expect(
    displayed
      .filter((p) => p.japanese === "は")
      .map((p) => p.start)
      .sort((a, b) => a! - b!),
  ).toEqual([1, 9]);
  expect(displayed.map((p) => p.entryId).sort()).toEqual(
    original.map((p) => p.entryId).sort(),
  );
  const grammar = displayed.find((p) => p.japanese === "なくて")!.grammar![0]!;
  expect(
    displayed
      .filter((p) => p.start! < grammar.end && p.end! > grammar.start)
      .map((p) => p.japanese)
      .sort(),
  ).toEqual(["なくて", "は"]);
  expect(
    original.filter((p) => p.japanese === "は").map((p) => p.start),
  ).toEqual([1, 9]);
});

test("repeated chips consume each distinct occurrence once", () => {
  const parts = [
    {
      japanese: "は",
      kana: "は",
      romaji: "wa",
      meanings: [],
      wordTypes: ["Particle"],
      entryId: "first",
      start: 0,
      end: 1,
    },
    {
      japanese: "は",
      kana: "は",
      romaji: "wa",
      meanings: [],
      wordTypes: ["Particle"],
      entryId: "second",
      start: 5,
      end: 6,
    },
  ];
  expect(
    breakdownForChips(
      [
        { japanese: "は", kana: "は" },
        { japanese: "は", kana: "は" },
        { japanese: "は", kana: "は" },
      ],
      parts,
    ).map((p) => p.entryId),
  ).toEqual(["first", "second"]);
});
