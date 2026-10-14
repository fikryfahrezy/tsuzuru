import { expect, test } from "bun:test";
import { numberAlternatives } from "../shared/number-alternatives";
import {
  compare,
  AlternativeMethod,
  Strictness,
  validReadings,
  type Candidate,
} from "../shared/practice";

function candidate(japanese: string, reading = japanese): Candidate {
  return {
    id: "numbers",
    english: "Number spelling test",
    japanese,
    furiganaVariants: [reading],
    englishWordCount: 3,
    targetVocabulary: [],
    sources: [],
  };
}
function spellings(row: Candidate) {
  return numberAlternatives(row).map((alternative) => alternative.japanese);
}

test("integer alternatives preserve values, including place values, large numbers and zero", () => {
  for (const [original, equivalents] of [
    ["４０キロです。", ["四十キロです。", "四〇キロです。"]],
    ["2024年です。", ["二千二十四年です。", "二〇二四年です。"]],
    ["100000001円です。", ["一億一円です。"]],
    ["０個です。", ["零個です。", "〇個です。"]],
  ] as const) {
    const row = candidate(
      original,
      original
        .replace("年", "{年|ねん}")
        .replace("円", "{円|えん}")
        .replace("個", "{個|こ}"),
    );
    const variants = numberAlternatives(row);
    for (const japanese of equivalents)
      expect(spellings(row)).toContain(japanese);
    const exercise = {
      ...row,
      acceptedAlternatives: variants.map((alternative) => ({
        ...alternative,
        provenance: {
          creator: "Test generator",
          method: AlternativeMethod.NumberSpelling,
          note: "Same quantity",
        },
      })),
    };
    for (const alternative of variants) {
      expect(validReadings({ ...row, ...alternative }).length).toBeGreaterThan(
        0,
      );
      expect(
        compare(exercise, alternative.japanese, Strictness.Exact, true).matched,
      ).toBe(true);
      expect(
        compare(exercise, alternative.japanese, Strictness.Exact, false)
          .matched,
      ).toBe(false);
    }
  }
});

test("supplied counter readings survive kanji-to-digit conversion and annotation boundaries", () => {
  const row = candidate(
    "二十時に二人が来ます。",
    "{二|に}{十|じゅう}{時|じ}に{二人|ふたり}が{来|き}ます。",
  );
  const variants = numberAlternatives(row);
  expect(variants.map((row) => row.japanese)).toContain("20時に2人が来ます。");
  const result = variants.find(
    (row) => row.japanese === "20時に2人が来ます。",
  )!;
  expect(
    compare(
      { ...row, ...result },
      "にじゅうじにふたりがきます。",
      Strictness.Kana,
    ).matched,
  ).toBe(true);
});

test("each combination of multiple integers is available without accepting changed values", () => {
  const row = candidate("６時から９時です。", "６{時|じ}から９{時|じ}です。");
  const variants = numberAlternatives(row);
  for (const japanese of [
    "六時から９時です。",
    "６時から九時です。",
    "六時から九時です。",
  ])
    expect(variants.map((row) => row.japanese)).toContain(japanese);
  const exercise = {
    ...row,
    acceptedAlternatives: variants.map((alternative) => ({
      ...alternative,
      provenance: {
        creator: "Test",
        method: AlternativeMethod.NumberSpelling,
        note: "Preserved value",
      },
    })),
  };
  expect(
    compare(exercise, "六時から八時です。", Strictness.Flexible, true).matched,
  ).toBe(false);
});

test("lexical compounds, formatted numbers, leading zeros and identifiers are not rewritten", () => {
  for (const row of [
    candidate(
      "一緒に千葉に行きます。",
      "{一緒|いっしょ}に{千葉|ちば}に{行|い}きます。",
    ),
    candidate("一時的です。", "{一時的|いちじてき}です。"),
    candidate("第一人称です。", "{第一人称|だいいちにんしょう}です。"),
    candidate("四分五裂です。", "{四分五裂|しぶんごれつ}です。"),
    candidate(
      "三日月と五月雨です。",
      "{三日月|みかづき}と{五月雨|さみだれ}です。",
    ),
    candidate("０．５％です。"),
    candidate("1,000円です。", "1,000{円|えん}です。"),
    candidate("2024/10/01です。"),
    candidate("007です。"),
    candidate("A123です。"),
  ])
    expect(numberAlternatives(row)).toEqual([]);
});
