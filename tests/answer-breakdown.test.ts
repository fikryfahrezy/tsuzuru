import { expect, test } from "bun:test";
import { answerBreakdown } from "../server/utils/answer-breakdown";
import { answerChips } from "../server/utils/answer-chips";
import { exerciseById } from "../server/utils/exercises";
import { wordHints } from "../server/utils/word-hints";
import type { Candidate } from "../shared/practice";

const water = exerciseById.get("213aa0ae8044611b00c1ba95")!;

test("breakdown explains the actual inflected answer with meanings, readings, and dictionary forms", () => {
  const breakdown = answerBreakdown(
    water,
    answerChips(water),
    wordHints(water),
  );
  expect(breakdown.find((part) => part.japanese === "飲みます")).toMatchObject({
    kana: "のみます",
    romaji: "nomimasu",
    dictionaryForm: "飲む",
    meanings: ["to drink"],
    wordTypes: ["Verb"],
    note: "Polite non-past form: can describe the present, a habit, or the future.",
  });
  expect(breakdown.find((part) => part.japanese === "水")?.meanings).toContain(
    "water",
  );
  expect(breakdown.find((part) => part.japanese === "は")).toMatchObject({
    romaji: "wa",
    wordTypes: ["Particle"],
  });
  expect(breakdown.find((part) => part.japanese === "を")?.note).toContain(
    "Object marker",
  );
});

test("breakdown follows only the supplied shuffled chip order, preserving repetitions and omitting punctuation", () => {
  const chips = answerChips(water).reverse();
  const breakdown = answerBreakdown(water, chips, wordHints(water));
  expect(breakdown.map((part) => part.japanese)).toEqual(
    chips
      .filter((chip) => /[\p{L}\p{N}]/u.test(chip.japanese))
      .map((chip) => chip.japanese),
  );
  expect(breakdown.filter((part) => part.japanese === "の")).toHaveLength(2);
});

test("unsupported forms keep supplied readings without inventing a meaning", () => {
  const candidate: Candidate = {
    ...water,
    japanese: "架空語",
    furiganaVariants: ["{架空語|かくうご}"],
  };
  expect(
    answerBreakdown(candidate, [{ japanese: "架空語", kana: "かくうご" }], []),
  ).toEqual([
    {
      japanese: "架空語",
      kana: "かくうご",
      romaji: "kakuugo",
      meanings: [],
      wordTypes: [],
    },
  ]);
});
