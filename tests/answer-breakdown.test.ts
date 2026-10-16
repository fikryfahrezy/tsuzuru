import { expect, test } from "bun:test";
import { answerBreakdown } from "../server/utils/answer-breakdown";
import { answerChips } from "../server/utils/answer-chips";
import { candidateById, exerciseById } from "../server/utils/exercises";
import { sentence } from "./sentences";
import { wordHints } from "../server/utils/word-hints";
import { isAnswerBreakdownPart } from "../shared/practice";
import { practiceDetails } from "../server/utils/practice-details";

const water = exerciseById.get("213aa0ae8044611b00c1ba95")!;

test("unannotated breakdown words include their verified spelling alternatives", () => {
  const cake = exerciseById.get("551307def08bb8669ec2aced")!;
  const parts = practiceDetails(cake).answerBreakdown;
  expect(parts.find((part) => part.japanese === "すこし")).toMatchObject({
    kana: "すこし",
    spellings: ["少し"],
  });
  expect(
    parts.find((part) => part.japanese === "を")?.spellings,
  ).toBeUndefined();
});

test("kana pronouns retain contextual meanings and supplied readings in breakdowns", () => {
  const candidate = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  const hints = wordHints(candidate);
  const pronoun = practiceDetails(candidate).answerBreakdown.find(
    (part) => part.japanese === "わたし",
  );
  expect(pronoun).toMatchObject({
    dictionaryForm: "私",
    kana: "わたし",
    romaji: "watashi",
    wordTypes: ["Pronoun"],
  });
  expect(pronoun?.meanings).toEqual(["me"]);
  expect(hints.find((part) => part.text === "me")?.hints[0]).toMatchObject({
    japanese: "わたし",
    reading: "わたし",
    romaji: "watashi",
  });
});

test("journal breakdowns survive storage with sentence order and reject malformed saved details", () => {
  const parts = practiceDetails(water).answerBreakdown;
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
  const breakdown = answerBreakdown(water, answerChips(water));
  expect(breakdown.find((part) => part.japanese === "飲みます")).toMatchObject({
    kana: "のみます",
    romaji: "nomimasu",
    dictionaryForm: "飲む",
    meanings: [],
    dictionaryMeanings: ["to drink"],
    wordTypes: ["Verb"],
    note: "Polite non-past form: can describe the present, a habit, or the future.",
  });
  expect(
    breakdown.find((part) => part.japanese === "水")?.dictionaryMeanings,
  ).toContain("water");
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
  const breakdown = answerBreakdown(water, chips);
  expect(breakdown.map((part) => part.japanese)).toEqual(
    chips
      .filter((chip) => /[\p{L}\p{N}]/u.test(chip.japanese))
      .map((chip) => chip.japanese),
  );
  expect(breakdown.filter((part) => part.japanese === "の")).toHaveLength(2);
});

test("unsupported forms keep supplied readings without inventing a meaning", () => {
  const candidate = sentence({
    ...candidateById.get(water.id)!,
    japanese: "架空語",
    furiganaVariants: ["{架空語|かくうご}"],
  });
  expect(
    answerBreakdown(candidate, [{ japanese: "架空語", kana: "かくうご" }]),
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
