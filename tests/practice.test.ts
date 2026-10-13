import { describe, expect, test } from "bun:test";
import { exercises } from "../server/utils/exercises";
import {
  compare,
  lengthOf,
  validReadings,
  type Candidate,
} from "../shared/practice";

const sentence: Candidate = {
  id: "water",
  english: "I drink water.",
  japanese: "水を飲みます。",
  furiganaVariants: ["{水|みず}を{飲|の}みます。"],
  englishWordCount: 3,
  targetVocabulary: [],
  sources: [{ tatoebaUrl: "https://tatoeba.org/sentences/show/1" }],
};
describe("reference writing comparison", () => {
  test("kana accepts either kana script but rejects kanji", () => {
    expect(compare(sentence, "みずをのみます", "kana").matched).toBe(true);
    expect(compare(sentence, "ミズヲノミマス。", "kana").matched).toBe(true);
    expect(compare(sentence, "水を飲みます", "kana").matched).toBe(false);
  });
  test("flexible accepts mixed writing without changing tense", () => {
    expect(compare(sentence, "水をのみます", "flexible").matched).toBe(true);
    expect(compare(sentence, "ミズを飲みます", "flexible").matched).toBe(true);
    expect(compare(sentence, "水を飲みました", "flexible").matched).toBe(false);
  });
  test("exact preserves spelling with width, space, and punctuation tolerance", () => {
    expect(compare(sentence, " 水を 飲みます！ ", "exact").matched).toBe(true);
    expect(compare(sentence, "みずをのみます", "exact").matched).toBe(false);
  });
  test("homophone kanji cannot pass flexible mode", () => {
    const bridge = {
      ...sentence,
      japanese: "橋です。",
      furiganaVariants: ["{橋|はし}です。"],
    };
    expect(compare(bridge, "箸です", "flexible").matched).toBe(false);
    expect(compare(bridge, "はしです", "flexible").matched).toBe(true);
  });
  test("mismatched annotations and incomplete readings are excluded", () => {
    expect(
      validReadings({
        ...sentence,
        furiganaVariants: ["{水|みず}を飲みます。", "{橋|はし}です。"],
      }),
    ).toEqual([]);
  });
  test("empty or punctuation-only writing never matches", () => {
    for (const mode of ["kana", "flexible", "exact"] as const)
      expect(compare(sentence, " 。！ ", mode).matched).toBe(false);
  });
  test("length buckets include their boundaries", () => {
    expect([7, 8, 12, 13].map(lengthOf)).toEqual([
      "short",
      "medium",
      "medium",
      "long",
    ]);
  });
});

test("the imported bank supports every level and length without missing readings", () => {
  for (const level of ["N5", "N4", "N3", "N2", "N1"]) {
    for (const length of ["short", "medium", "long"]) {
      expect(
        exercises.some(
          (row) =>
            row.targetVocabulary.some((target) => target.level === level) &&
            lengthOf(row.englishWordCount) === length,
        ),
      ).toBe(true);
    }
  }
  for (const row of exercises) {
    const reference = compare(row, row.japanese, "exact");
    if (
      !reference.matched ||
      !compare(row, reference.kana, "kana").matched ||
      !compare(row, row.japanese, "flexible").matched
    ) {
      throw new Error(`Inconsistent reference forms for ${row.id}`);
    }
  }
});
