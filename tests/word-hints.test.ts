import { expect, test } from "bun:test";
import { wordHints } from "../server/utils/word-hints";
import { exerciseById, exercises } from "../server/utils/exercises";
import type { Candidate } from "../shared/practice";
import phraseBank from "../data/phrase-hints/sentences.json";
import { sentencePhraseHints } from "../server/utils/sentence-phrase-hints";

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

test("dictionary phrases form one hint across regular and irregular verb forms", () => {
  for (const [phrase, japanese] of [
    ["get up", "起きる"],
    ["got up", "起きる"],
    ["getting up", "起きる"],
    ["woke up", "覚める"],
    ["looked for", "探す"],
    ["looking for", "探す"],
    ["turned on", "つける"],
    ["gave up", "諦める"],
  ]) {
    const english = `I ${phrase}.`;
    const tokens = wordHints({
      ...water,
      english,
      japanese: "",
      furiganaVariants: [],
    });
    expect(tokens.map((token) => token.text).join("")).toBe(english);
    expect(tokens.find((token) => token.text === phrase)).toMatchObject({
      isWord: true,
      hints: expect.arrayContaining([expect.objectContaining({ japanese })]),
    });
  }
});

test("phrase hints keep dictionary readings and prioritize reference vocabulary", () => {
  const tokens = wordHints({
    ...water,
    english: "I gave up.",
    japanese: "諦めた。",
    furiganaVariants: ["{諦|あきら}めた。"],
  });
  expect(
    tokens.find((token) => token.text === "gave up")?.hints[0],
  ).toMatchObject({
    japanese: "諦める",
    reading: "あきらめる",
    romaji: "akirameru",
  });
  const gotUp = wordHints({ ...water, english: "I got up." });
  expect(
    gotUp.find((token) => token.text === "got up")?.hints[0],
  ).toMatchObject({
    japanese: "起きる",
    reading: "おきる",
    romaji: "okiru",
  });
});

test("longer phrases and original whitespace are preserved without crossing punctuation", () => {
  const english = "I'm looking\tforward to it. I got  up. Get, up!";
  const tokens = wordHints({ ...water, english });
  expect(tokens.map((token) => token.text).join("")).toBe(english);
  expect(
    tokens.find((token) => token.text === "looking\tforward to")?.hints.length,
  ).toBeGreaterThan(0);
  expect(
    tokens.find((token) => token.text === "got  up")?.hints[0]?.japanese,
  ).toBe("起きる");
  expect(tokens.some((token) => token.text === "Get, up")).toBe(false);
});

test("lemmatization covers irregular verbs beyond the former list without corrupting nouns", () => {
  for (const [word, japanese] of [
    ["swam", "泳ぐ"],
    ["ate", "食べる"],
    ["slept", "眠る"],
    ["goes", "行く"],
  ]) {
    const tokens = wordHints({
      ...water,
      english: word!,
      japanese: "",
      furiganaVariants: [],
    });
    expect(tokens[0]?.hints.some((hint) => hint.japanese === japanese)).toBe(
      true,
    );
  }
  const tennis = wordHints({
    ...water,
    english: "tennis",
    japanese: "",
    furiganaVariants: [],
  });
  expect(tennis[0]?.hints.some((hint) => hint.japanese === "十")).toBe(false);
});

test("sentence mappings distinguish waking up from dressing up and use supplied conjugated readings", () => {
  const waking = wordHints(exerciseById.get("45dee2bd33974022d4c206b8")!);
  const dressing = wordHints(exerciseById.get("509e3885d6a95a1d8130ec56")!);
  expect(waking.find((token) => token.text === "got up")).toMatchObject({
    hintSource: "sentence",
    hints: [{ japanese: "起きた", reading: "おきた", romaji: "okita" }],
  });
  expect(dressing.find((token) => token.text === "got up")).toMatchObject({
    hintSource: "sentence",
    hints: [{ japanese: "着飾っていた", reading: "きかざっていた" }],
  });
});

test("separated phrases share a hint while their object keeps its own hint", () => {
  const candidate = exerciseById.get("efa5a7b6a9fe73f45005153f")!;
  const tokens = wordHints(candidate);
  const turn = tokens.find((token) => token.text === "turn")!;
  const on = tokens.find((token) => token.text === "on")!;
  expect(turn).toMatchObject({ phrase: "turn … on", hintSource: "sentence" });
  expect(on.hints).toEqual(turn.hints);
  expect(turn.hints[0]).toMatchObject({
    japanese: "つけて",
    reading: "つけて",
  });
  expect(tokens.find((token) => token.text === "light")?.isWord).toBe(true);
  expect(
    tokens.find((token) => token.text === "light")?.hints.length,
  ).toBeGreaterThan(0);
  expect(tokens.map((token) => token.text).join("")).toBe(candidate.english);

  const unrelated = wordHints(exerciseById.get("3fa72f5a628c1e7da7191956")!);
  expect(unrelated.some((token) => token.phrase === "turn … on")).toBe(false);
  const rotating = wordHints(exerciseById.get("b4b2a4b94ba7e0d81cf2f913")!);
  expect(
    rotating.find((token) => token.text === "turns on")?.hints[0]?.japanese,
  ).toBe("自転している");
});

test("idioms absent from the glossary can use sentence-specific hints", () => {
  const tokens = wordHints(exerciseById.get("bc3183eb19754387b26be05c")!);
  expect(tokens.find((token) => token.text === "fed up with")).toMatchObject({
    hintSource: "sentence",
    hints: [{ japanese: "辟易している", reading: "へきえきしている" }],
  });
});

test("every maintained phrase mapping remains aligned with its source and reading", () => {
  for (const entry of phraseBank.entries) {
    const candidate = exerciseById.get(entry.sentenceId)!;
    expect(candidate).toBeDefined();
    expect(sentencePhraseHints(candidate)).toHaveLength(
      entry.phrases.reduce((count, phrase) => count + phrase.spans.length, 0),
    );
    const tokens = wordHints(candidate);
    expect(tokens.map((token) => token.text).join("")).toBe(candidate.english);
    expect(
      tokens.filter((token) => token.hintSource === "sentence"),
    ).toHaveLength(sentencePhraseHints(candidate).length);
  }
});

test("stale snapshots, partial words, overlaps, and unsupported Japanese readings invalidate mappings", () => {
  const entry = phraseBank.entries[0]!;
  const candidate = exerciseById.get(entry.sentenceId)!;
  expect(
    sentencePhraseHints({ ...candidate, english: candidate.english + "!" }),
  ).toEqual([]);
  expect(sentencePhraseHints({ ...candidate, japanese: "違う。" })).toEqual([]);
  expect(sentencePhraseHints({ ...candidate, furiganaVariants: [] })).toEqual(
    [],
  );
  const partial = structuredClone(entry);
  partial.phrases[0]!.spans[0]!.start++;
  partial.phrases[0]!.spans[0]!.text = "ot up";
  expect(sentencePhraseHints(candidate, partial)).toEqual([]);
  const overlap = structuredClone(entry);
  overlap.phrases.push(overlap.phrases[0]!);
  expect(sentencePhraseHints(candidate, overlap)).toEqual([]);
  const wrongReading = structuredClone(entry);
  wrongReading.phrases[0]!.hints[0]!.reading = "ねた";
  expect(sentencePhraseHints(candidate, wrongReading)).toEqual([]);
  const missingSurface = structuredClone(entry);
  missingSurface.phrases[0]!.hints[0]!.japanese = "寝た";
  expect(sentencePhraseHints(candidate, missingSurface)).toEqual([]);
});
