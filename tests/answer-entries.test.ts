import { expect, test } from "bun:test";
import {
  sentenceAnswerEntries,
  answerAnnotationRecords,
} from "../server/utils/answer-entries";
import { practiceDetails } from "../server/utils/practice-details";
import { candidateById, exerciseById } from "../server/utils/exercises";
import { sentence } from "./sentences";
import type { SentenceAnswerAnnotations } from "../shared/answer-entries";
import {
  answerDetailsVersion,
  currentAnswerBreakdown,
  currentSpellingOptions,
} from "../shared/answer-entries";

const arrival = exerciseById.get("10c2500a48ed97e4312958f9")!;

test("saved journey spellings require current details and valid data", () => {
  const spellingOptions = [
    { japanese: "すこし", kana: "すこし", spellings: ["少し"] },
  ];
  expect(
    currentSpellingOptions(
      JSON.parse(JSON.stringify({ answerDetailsVersion, spellingOptions })),
    ),
  ).toEqual(spellingOptions);
  expect(currentSpellingOptions({ spellingOptions })).toBeUndefined();
  expect(
    currentSpellingOptions({ answerDetailsVersion, spellingOptions: [] }),
  ).toEqual([]);
  for (const invalid of [
    null,
    {},
    [{ japanese: "すこし", kana: "すこし", spellings: [null] }],
  ]) {
    expect(
      currentSpellingOptions({
        answerDetailsVersion,
        spellingOptions: invalid,
      }),
    ).toBeUndefined();
  }
});
const record = answerAnnotationRecords.find(
  (entry) => entry.sentenceId === arrival.id,
)!;

test("invalid or stale annotations publish no hints or contextual meanings", () => {
  const edits: ((entry: SentenceAnswerAnnotations) => void)[] = [
    (entry) => {
      entry.english += "!";
    },
    (entry) => {
      entry.japanese += "!";
    },
    (entry) => {
      entry.furigana += "!";
    },
    (entry) => {
      entry.answerEntries[0]!.reading = "ちがう";
    },
    (entry) => {
      entry.answerEntries[0]!.id = "missing";
    },
    (entry) => {
      entry.answerEntries.push(structuredClone(entry.answerEntries[0]!));
    },
    (entry) => {
      entry.hintMappings[0]!.answerEntryIds = ["missing"];
    },
    (entry) => {
      entry.hintMappings.push(structuredClone(entry.hintMappings[0]!));
    },
    (entry) => {
      entry.hintMappings[0]!.spans[0]!.start++;
    },
    (entry) => {
      entry.hintMappings[0]!.spans[0]!.text = "wrong";
    },
    (entry) => {
      entry.hintMappings[0]!.answerEntryIds = [];
    },
    (entry) => {
      const verb = entry.answerEntries.find(
        (part) => part.japanese === "来ます",
      )!;
      verb.end--;
      verb.id = `ja-${verb.start}-${verb.end}`;
      verb.japanese = "来ま";
      verb.reading = "きま";
    },
  ];
  for (const edit of edits) {
    const invalid = structuredClone(record);
    edit(invalid);
    expect(sentenceAnswerEntries(arrival, invalid).validAnnotations).toBe(
      false,
    );
    const details = practiceDetails(arrival, invalid);
    expect(details.wordHints.every((part) => !part.hints.length)).toBe(true);
    expect(details.answerBreakdown.every((part) => !part.meanings.length)).toBe(
      true,
    );
  }
});

test("repeated words are mapped by occurrence in both English and Japanese", () => {
  const source = sentence({
    ...candidateById.get(arrival.id)!,
    id: "repeated-water",
    english: "water, then water.",
    japanese: "水と水。",
    furiganaVariants: ["{水|みず}と{水|みず}。"],
  });
  source.reference.readings[0].wordBoundaries = [2, 3, 5];
  const annotations: SentenceAnswerAnnotations = {
    sentenceId: source.id,
    english: source.english,
    japanese: source.reference.japanese,
    furigana: source.reference.readings[0].furigana,
    answerEntries: [
      {
        id: "ja-0-1",
        start: 0,
        end: 1,
        japanese: "水",
        reading: "みず",
        meaning: "water (first mention)",
      },
      {
        id: "ja-2-3",
        start: 2,
        end: 3,
        japanese: "水",
        reading: "みず",
        meaning: "water (second mention)",
      },
    ],
    hintMappings: [
      {
        spans: [{ start: 0, end: 5, text: "water" }],
        answerEntryIds: ["ja-0-1"],
      },
      {
        spans: [{ start: 12, end: 17, text: "water" }],
        answerEntryIds: ["ja-2-3"],
      },
    ],
  };
  expect(sentenceAnswerEntries(source, annotations).validAnnotations).toBe(
    true,
  );
  const details = practiceDetails(source, annotations);
  const water = details.wordHints.filter((part) => part.text === "water");
  expect(water.map((part) => part.hints[0]!.answerEntryId)).toEqual([
    "ja-0-1",
    "ja-2-3",
  ]);
  expect(
    details.answerBreakdown
      .filter((part) => part.japanese === "水")
      .map((part) => part.meanings),
  ).toEqual([["water (first mention)"], ["water (second mention)"]]);
});

test("romaji comes from shared entry pronunciation and handles particle は inside phrases", () => {
  const source = exerciseById.get("ca3f69a111c1f8e0bc8e034b")!;
  const details = practiceDetails(source);
  expect(
    details.answerBreakdown.find((part) => part.japanese === "ではない")
      ?.romaji,
  ).toBe("dewanai");
  expect(
    details.wordHints.find((part) => part.text === "is not")?.hints[0]?.romaji,
  ).toBe("dewanai");
});

test("journal breakdowns refresh unless they have the current version and valid details", () => {
  const details = practiceDetails(arrival).answerBreakdown;
  expect(currentAnswerBreakdown({ answerBreakdown: details })).toBeUndefined();
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "old",
      answerBreakdown: details,
    }),
  ).toBeUndefined();
  expect(
    currentAnswerBreakdown({ answerDetailsVersion, answerBreakdown: details }),
  ).toEqual(details);
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion,
      answerBreakdown: [{ ...details[0], dictionaryMeanings: "invalid" }],
    }),
  ).toBeUndefined();
});
