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

test("kana words listed under their kana spelling keep meanings when the lemma is kanji", () => {
  // The lemma is 貴方, but OpenJLPT lists the word as あなた.
  const bag = exerciseById.get("ca212b105c63187766702690")!;
  const pronoun = practiceDetails(bag).answerBreakdown.find(
    (part) => part.japanese === "あなた",
  );
  expect(pronoun).toMatchObject({
    dictionaryForm: "貴方",
    kana: "あなた",
    wordTypes: ["Pronoun"],
  });
  expect(pronoun?.dictionaryMeanings).toContain("you");
});

test("dictionary forms show する for すべき and hide katakana words' hiragana lemmas", () => {
  const should = practiceDetails(
    exerciseById.get("27707eb1d276cc101d712014")!,
  ).answerBreakdown.find((part) => part.japanese === "すべきだ");
  expect(should?.dictionaryForm).toBe("する");
  const rose = practiceDetails(
    exerciseById.get("0b26934519393bd19b6b3785")!,
  ).answerBreakdown.find((part) => part.japanese === "バラ");
  expect(rose).toBeDefined();
  expect(rose?.dictionaryForm).toBeUndefined();
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

test("なくてはなりません is read as obligation with contextual meanings", () => {
  const bed = exerciseById.get("5578e84c4f5263a7148c814d")!;
  const parts = practiceDetails(bed).answerBreakdown;
  const verb = parts.find((part) => part.japanese === "つかなくて");
  expect(verb?.meanings).toEqual([
    "not go to (bed); 就く in the negative te-form",
  ]);
  expect(verb?.grammar?.map((g) => [g.id, g.start, g.end])).toEqual([
    ["nakereba-naranai-nakute-wa-ikenai", 6, 17],
  ]);
  expect(
    parts.find((part) => part.japanese === "なりません")?.meanings,
  ).toEqual(["won't do"]);
});

test("words inside an obligation explain the pattern instead of their usual senses", () => {
  const parts = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown;
  const bed = parts("5578e84c4f5263a7148c814d");
  const wa = bed.find((part) => part.japanese === "は");
  expect(wa?.note).toStartWith("Part of 〜なくては");
  const auxiliary = bed.find((part) => part.japanese === "なりません");
  expect(auxiliary?.note).toStartWith("Part of the obligation pattern");
  expect(auxiliary?.dictionaryMeanings).toBeUndefined();
  const lamp = parts("6ee9540c31fbcc7225c62480");
  const [withNew, ifNot] = lamp.filter((part) => part.japanese === "と");
  expect(withNew?.note).toStartWith("Can mean");
  expect(ifNot?.note).toStartWith("Part of 〜ないと");
  // は outside the pattern keeps the topic note.
  expect(
    parts("5566699fea2b063edfee26ce").find((part) => part.japanese === "は"),
  ).toBeUndefined();
  expect(
    parts("19204cee60046af3d4df30c9").find((part) => part.japanese === "は")
      ?.note,
  ).toStartWith("Topic marker");
});

test("prohibition words explain the pattern instead of their usual senses", () => {
  const parts = practiceDetails(
    exerciseById.get("e39ae7e19e32e487ac696ff3")!,
  ).answerBreakdown;
  expect(
    parts.find((part) => part.japanese === "侵して")?.grammar?.[0]?.id,
  ).toBe("te-wa-ikenai");
  expect(parts.find((part) => part.japanese === "は")?.note).toStartWith(
    "Part of 〜ては",
  );
  const auxiliary = parts.find((part) => part.japanese === "ならない");
  expect(auxiliary?.note).toStartWith("Part of the prohibition pattern");
  expect(auxiliary?.dictionaryMeanings).toBeUndefined();
});

test("な never shows the prohibition sense outside a prohibition", () => {
  const parts = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown;
  const explanatory = parts("0948c4137b203ab74b5dba62").find(
    (part) => part.japanese === "な",
  );
  expect(explanatory?.note).toStartWith("Links a noun or な-adjective to の");
  expect(explanatory?.dictionaryMeanings).toBeUndefined();
  const attributive = parts("036c684479363bffc2c0d107").find(
    (part) => part.japanese === "な" && part.start === 6,
  );
  expect(attributive?.note).toStartWith("Part of 〜な（na-adjective）");
  expect(attributive?.dictionaryMeanings).toBeUndefined();
});

test("grammatical words inside a lesson explain the lesson, not their dictionary sense", () => {
  const word = (id: string, japanese: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown.find(
      (part) => part.japanese === japanese,
    );
  for (const [id, japanese, pattern] of [
    ["008b8bb4762af4f907615633", "きた", "〜てくる"],
    ["024de7875c8e422cf555b4c3", "しれない", "〜かもしれない"],
    ["060943254d1ccc134a4ed8c4", "方", "〜ほうがいい"],
  ] as const) {
    const part = word(id, japanese);
    expect(part?.note, japanese).toStartWith(`Part of ${pattern}`);
    expect(part?.dictionaryMeanings, japanese).toBeUndefined();
  }
  // The word that starts the lesson keeps its own sense: 切って is "cut".
  expect(word("060943254d1ccc134a4ed8c4", "髪")?.note).toBeUndefined();
  // Literal senses that are accurate remain: なる in 〜くなる is "to become".
  expect(
    word("008b8bb4762af4f907615633", "なって")?.dictionaryMeanings,
  ).toContain("to become");
});

test("な outside a detected lesson is explained by its context", () => {
  const na = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown.findLast(
      (part) => part.japanese === "な",
    )?.note;
  expect(na("17a8e837bc8614ad90d8ca8d")).toStartWith(
    "Links a な-adjective to the noun",
  );
  expect(na("d85ae0ece1db86dd375094c5")).toStartWith(
    "After a verb's dictionary form",
  );
  expect(na("47f547312b749bfda73e4fe9")).toStartWith("With か");
  expect(na("0112661dedba7a69e85b98fc")).toStartWith("Sentence-ending");
  expect(na("1d0e729d2bb4576a3ab7494d")).toStartWith("After a verb's stem");
});

test("a lesson may end inside a word that only adds だろう", () => {
  const grammar = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown.flatMap(
      (part) => part.grammar ?? [],
    );
  const tar = grammar("1157847d3ece6f310895fa47");
  expect(tar.find((g) => g.id === "nai-to-ikenai-nakucha")?.japanese).toBe(
    "出さなきゃならない",
  );
  expect(tar.some((g) => g.id === "darou")).toBe(true);
  const queue = grammar("c8126eecc32c54066222ac23").map((g) => g.id);
  expect(queue).toContain("te-iru");
  expect(queue).toContain("darou");
  expect(queue).not.toContain("te");
});

test("the condition inside an obligation explains its ‘if’", () => {
  const word = (id: string, japanese: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown.find(
      (part) => part.japanese === japanese,
    );
  for (const [id, japanese, form] of [
    ["1157847d3ece6f310895fa47", "出さなきゃ", "なきゃ"],
    ["0942a880256cc47f4ad11088", "気をつけなければ", "なければ"],
    ["c51c696d9f7ab8f5b72880ea", "乗らねば", "ねば"],
    ["0319a850bc9266132158d86f", "なければ", "なければ"],
  ] as const) {
    expect(word(id, japanese)?.note, japanese).toStartWith(`${form} is `);
    expect(word(id, japanese)?.note, japanese).toContain("‘if (you) don’t …’");
  }
  // The verb keeps its own sense; only the condition is explained.
  expect(
    word("0942a880256cc47f4ad11088", "気をつけなければ")?.dictionaryMeanings,
  ).toContain("to be careful");
  expect(word("0319a850bc9266132158d86f", "で")?.note).toContain("‘must be’");
  expect(word("4487ab110a31c3f62a42fd0f", "ちゃ")?.note).toStartWith(
    "Part of 〜なくちゃ",
  );
  // で outside the pattern keeps its usual note.
  expect(word("4487ab110a31c3f62a42fd0f", "で")?.note).toStartWith(
    "Can mark where",
  );
});
