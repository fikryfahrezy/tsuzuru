import { expect, test } from "bun:test";
import { exerciseById, exercises } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import {
  answerAnnotationRecords,
  sentenceAnswerEntries,
} from "../server/utils/answer-entries";

const get = (id: string) => exerciseById.get(id)!;

test("maintained annotations are valid against current source text, readings, and token boundaries", () => {
  for (const record of answerAnnotationRecords) {
    expect(sentenceAnswerEntries(get(record.sentenceId)).validAnnotations).toBe(
      true,
    );
  }
});

test("the six reported sentences have independently specified contextual meanings", () => {
  for (const [id, text, japanese, romaji, meaning] of [
    [
      "f64a4195d8bfc56056184cfb",
      "good",
      "元気",
      "genki",
      "well; in good health",
    ],
    ["3c9f65f613abd788046e243a", "One", "ある", "aru", "one; a certain"],
    ["3b5ea68ada3ca9cb27ffd02d", "older", "年上", "toshiue", "older"],
    ["10c2500a48ed97e4312958f9", "is coming", "来ます", "kimasu", "is coming"],
    [
      "84f270754d526c50ea15a2c5",
      "got out",
      "降りた",
      "orita",
      "got out of a vehicle",
    ],
    ["ca3f69a111c1f8e0bc8e034b", "That", "それ", "sore", "that"],
  ]) {
    const details = practiceDetails(get(id!));
    const hint = details.wordHints.find((part) => part.text === text)?.hints[0];
    expect(hint).toMatchObject({ japanese, romaji, meaning });
    const answer = details.answerBreakdown.find(
      (part) => part.entryId === hint!.answerEntryId,
    );
    expect(answer).toMatchObject({ japanese, romaji, meanings: [meaning!] });
  }
  const arrival = practiceDetails(get("10c2500a48ed97e4312958f9"));
  expect(arrival.wordHints.some((part) => part.text === "coming to")).toBe(
    false,
  );
  expect(
    arrival.wordHints
      .flatMap((part) => part.hints)
      .some((hint) => /when it comes to/u.test(hint.meaning)),
  ).toBe(false);
  const negative = practiceDetails(get("ca3f69a111c1f8e0bc8e034b"));
  expect(
    negative.wordHints.find((part) => part.text === "is not")?.hints[0],
  ).toMatchObject({
    japanese: "ではない",
    romaji: "dewanai",
    meaning: "is not",
  });
});

test("known phrases share complete contextual answer entries", () => {
  for (const [id, text, japanese, meaning] of [
    ["6fa3eb49e0d88fff83ecc00e", "Let's cross", "渡りましょう", "let’s cross"],
    ["79d603592cd8af6e83fd906f", "every evening", "毎晩", "every evening"],
    [
      "e521c64a17213c9ad387c180",
      "eight-thirty",
      "８時半",
      "eight-thirty (8:30)",
    ],
    ["4236b1cb3617d87daec8104f", "moved", "越して", "moved house"],
    ["47ebde1262026d00009aaa8c", "hang", "かけましょう", "hang"],
    ["16b7cffe6d5cf68cd8ec958d", "trumpet", "トランペット", "trumpet"],
    ["020f9ce7c0415f0544db2ab4", "big", "大きな", "big"],
    ["0758756ce6b11d174759db74", "new", "新しく", "new"],
  ]) {
    const details = practiceDetails(get(id!));
    const hints = details.wordHints.find((part) => part.text === text)?.hints;
    expect(hints).toHaveLength(1);
    expect(hints![0]).toMatchObject({ japanese, meaning });
    expect(
      details.answerBreakdown.find(
        (part) => part.entryId === hints![0]!.answerEntryId,
      )?.meanings,
    ).toEqual([meaning!]);
  }
});

test("contextual entries keep grammatical category and pronunciation appropriate to their use", () => {
  const greeting = practiceDetails(get("f64a4195d8bfc56056184cfb"));
  expect(
    greeting.wordHints.find((part) => part.text === "Hi")?.hints[0],
  ).toMatchObject({
    japanese: "こんにちは",
    romaji: "konnichiwa",
    meaning: "hello",
  });
  const evening = practiceDetails(get("3c9f65f613abd788046e243a"));
  expect(
    evening.answerBreakdown.find((part) => part.japanese === "ある")?.wordTypes,
  ).toEqual(["Prenominal adjective"]);
  expect(
    evening.answerBreakdown.find((part) => part.japanese === "やってきた")
      ?.dictionaryForm,
  ).toBeUndefined();
});

test("separated English phrases reuse one entry while their object keeps its own mapping", () => {
  const details = practiceDetails(get("46f63b67ca227c239354aa62"));
  const brushed = details.wordHints.find((part) => part.text === "brushed")!;
  const off = details.wordHints.find((part) => part.text === "off")!;
  expect(brushed.hints).toEqual(off.hints);
  expect(brushed.hints[0]).toMatchObject({
    japanese: "払った",
    meaning: "brushed off",
  });
  expect(
    details.wordHints.find((part) => part.text === "dust")?.hints[0],
  ).toMatchObject({ japanese: "ほこり", meaning: "dust" });
  const phrase = practiceDetails(get("00121c45c61969376c90e342"));
  const wore = phrase.wordHints.find((part) => part.text === "wore")!.hints[0]!;
  expect(
    phrase.answerBreakdown.find((part) => part.entryId === wore.answerEntryId),
  ).toMatchObject({
    japanese: "はめていた",
    meanings: ["was wearing (a ring)"],
  });
});

test("breakdown context is independent of English hint mappings", () => {
  const sentence = get("10c2500a48ed97e4312958f9");
  const record = structuredClone(
    answerAnnotationRecords.find((row) => row.sentenceId === sentence.id)!,
  );
  const before = practiceDetails(sentence, record);
  record.hintMappings = [];
  const after = practiceDetails(sentence, record);
  expect(after.wordHints.every((part) => part.hints.length === 0)).toBe(true);
  expect(after.answerBreakdown).toEqual(before.answerBreakdown);
  expect(
    after.answerBreakdown.find((part) => part.japanese === "来ます")?.meanings,
  ).toEqual(["is coming"]);
});

test("verified spelling variants are resolved once on the shared entry", () => {
  const details = practiceDetails(get("ed2c1d01698a754816d6a9ed"));
  const hint = details.wordHints.find((part) => part.text === "me")!.hints[0]!;
  const entry = details.answerBreakdown.find(
    (part) => part.entryId === hint.answerEntryId,
  )!;
  expect(hint.spellings).toContain("私");
  expect(hint.spellings).toEqual(entry.spellings);
});

test("unmapped or changed sentences never fall back to dictionary hints", () => {
  const sentence = get("79d603592cd8af6e83fd906f");
  const changed = practiceDetails({
    ...sentence,
    english: "I stay home every evening.",
  });
  expect(changed.wordHints.every((part) => !part.hints.length)).toBe(true);
  expect(changed.answerBreakdown.every((part) => !part.meanings.length)).toBe(
    true,
  );
  expect(
    changed.answerBreakdown.find((part) => part.japanese === "毎晩")
      ?.dictionaryMeanings,
  ).toContain("every night");
});

test("all published hints reference existing answer IDs and preserve prompt text", () => {
  for (const sentence of exercises) {
    const details = practiceDetails(sentence);
    expect(details.wordHints.map((part) => part.text).join("")).toBe(
      sentence.english,
    );
    const entries = new Map(
      details.answerBreakdown.map((part) => [part.entryId, part]),
    );
    for (const hint of details.wordHints.flatMap((part) => part.hints)) {
      expect(hint.answerEntryId).toBeDefined();
      const entry = entries.get(hint.answerEntryId!);
      expect(entry).toBeDefined();
      expect(hint.reading).toBe(entry!.kana);
      expect(hint.meaning).toBe(entry!.meanings[0]);
    }
  }
}, 30000);
