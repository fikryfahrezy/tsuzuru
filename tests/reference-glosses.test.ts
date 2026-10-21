import { expect, test } from "bun:test";
import glossBank from "../data/reference-glosses/bank.json";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import { lessons } from "./helpers/grammar";

test("words missing from OpenJLPT show JMdict reference senses", () => {
  const older = practiceDetails(
    exerciseById.get("3b5ea68ada3ca9cb27ffd02d")!,
  ).answerBreakdown;
  expect(older.find((part) => part.japanese === "私")).toMatchObject({
    kana: "わたし",
    meanings: [],
    dictionaryMeanings: ["I", "me"],
    wordTypes: ["Pronoun"],
  });
  // OpenJLPT entries still take precedence over the reference glosses.
  expect(
    older.find((part) => part.japanese === "お兄さん")?.dictionaryMeanings,
  ).toEqual(["(honorable) older brother"]);
});

test("compounds missing from JMdict are explained from their parts", () => {
  const parts = practiceDetails(
    exerciseById.get("46cc23c49187642f1ad5c36c")!,
  ).answerBreakdown;
  expect(parts.find((part) => part.japanese === "料理用")).toMatchObject({
    dictionaryMeanings: [
      "料理 (りょうり · ryouri): cooking, cookery, cuisine",
      "用 (よう · you): for the use of ..., used for ..., made for ...",
    ],
    wordTypes: ["Noun"],
  });
  // A tokenizer join of two words is not explained as a compound.
  expect(
    practiceDetails(
      exerciseById.get("48d2e169c9a94afc5d31dfe8")!,
    ).answerBreakdown.find((part) => part.japanese === "たくさん輪")
      ?.dictionaryMeanings,
  ).toBeUndefined();
});

test("reference glosses are keyed by exact spelling and reading", () => {
  const keys = new Set<string>();
  for (const entry of glossBank.entries) {
    const key = `${entry.japanese}\u0000${entry.kana}`;
    expect(keys.has(key)).toBe(false);
    keys.add(key);
    expect(entry.meanings.length).toBeGreaterThan(0);
    expect(entry.kana).not.toMatch(/\p{Script=Katakana}/u);
    // Nouns that take する are nouns, not verbs.
    if (!entry.japanese.endsWith("する"))
      expect(entry.pos.some((code) => code.startsWith("vs"))).toBe(false);
  }
});

test("adverbial な-adjectives do not become the clause predicate", () => {
  expect(
    lessons([
      ["当地", ["Noun"]],
      ["では", ["Particle"]],
      ["滅多", ["な-adjective", "Noun"]],
      ["に", ["Particle"]],
      ["雪", ["Noun"]],
      ["が", ["Particle"]],
      ["降らない", ["Verb"], "降る"],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "de-wa-context" }));
});

test("的 adjectives can follow な and の inside a noun phrase", () => {
  expect(
    lessons([
      ["重要", ["な-adjective"]],
      ["な", ["Particle"]],
      ["社会的", ["な-adjective"]],
      ["結果", ["Noun"]],
    ]),
  ).toContainEqual(
    expect.objectContaining({ id: "na-na-adjective", japanese: "重要な" }),
  );
  expect(
    lessons([
      ["幾何学", ["Noun"]],
      ["の", ["Particle"]],
      ["理論的", ["な-adjective"]],
      ["原形", ["Noun"]],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "no", japanese: "の" }));
});
