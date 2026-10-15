import { expect, test } from "bun:test";
import { answerBreakdown } from "../server/utils/answer-breakdown";
import { answerChips } from "../server/utils/answer-chips";
import { exerciseById } from "../server/utils/exercises";
import { wordHints } from "../server/utils/word-hints";
import { isAnswerBreakdownPart, type Candidate } from "../shared/practice";

const water = exerciseById.get("213aa0ae8044611b00c1ba95")!;

test("kana pronouns retain dictionary meanings and supplied readings in breakdowns", () => {
  const candidate = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  const hints = wordHints(candidate);
  const pronoun = answerBreakdown(
    candidate,
    answerChips(candidate),
    hints,
  ).find((part) => part.japanese === "わたし");
  expect(pronoun).toMatchObject({
    dictionaryForm: "私",
    kana: "わたし",
    romaji: "watashi",
    wordTypes: ["Pronoun"],
  });
  expect(pronoun?.meanings).toContain("(humble) I");
  expect(hints.find((part) => part.text === "me")?.hints[0]).toMatchObject({
    japanese: "わたし",
    reading: "わたし",
    romaji: "watashi",
  });
});

test("journal breakdowns survive storage with sentence order and reject malformed saved details", () => {
  const parts = answerBreakdown(water, answerChips(water), wordHints(water));
  const saved = JSON.parse(JSON.stringify(parts));
  expect(saved.every(isAnswerBreakdownPart)).toBe(true);
  expect(saved).toEqual(parts);
  expect(isAnswerBreakdownPart({ ...parts[0], meanings: "broken" })).toBe(
    false,
  );
  expect(isAnswerBreakdownPart({ ...parts[0], wordTypes: [null] })).toBe(false);
  expect(isAnswerBreakdownPart(null)).toBe(false);
});

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
