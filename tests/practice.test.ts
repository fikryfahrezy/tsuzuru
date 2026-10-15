import { describe, expect, test } from "bun:test";
import { exercises } from "../server/utils/exercises";
import {
  compare,
  Strictness,
  isWithinLevel,
  Length,
  lengthOf,
  levels,
  validReadings,
  type Candidate,
} from "../shared/practice";
import { sentence as load } from "./sentences";

const record: Candidate = {
  id: "water",
  english: "I drink water.",
  japanese: "水を飲みます。",
  furiganaVariants: ["{水|みず}を{飲|の}みます。"],
  englishWordCount: 3,
  targetVocabulary: [],
  sources: [{ tatoebaUrl: "https://tatoeba.org/sentences/show/1" }],
};
const sentence = load(record);
describe("reference writing comparison", () => {
  test("kana accepts either kana script but rejects kanji", () => {
    expect(compare(sentence, "みずをのみます", Strictness.Kana).matched).toBe(
      true,
    );
    expect(compare(sentence, "ミズヲノミマス。", Strictness.Kana).matched).toBe(
      true,
    );
    expect(compare(sentence, "水を飲みます", Strictness.Kana).matched).toBe(
      false,
    );
  });
  test("flexible accepts mixed writing without changing tense", () => {
    expect(compare(sentence, "水をのみます", Strictness.Flexible).matched).toBe(
      true,
    );
    expect(
      compare(sentence, "ミズを飲みます", Strictness.Flexible).matched,
    ).toBe(true);
    expect(
      compare(sentence, "水を飲みました", Strictness.Flexible).matched,
    ).toBe(false);
  });
  test("exact preserves spelling with width, space, and punctuation tolerance", () => {
    expect(
      compare(sentence, " 水を 飲みます！ ", Strictness.Exact).matched,
    ).toBe(true);
    expect(compare(sentence, "みずをのみます", Strictness.Exact).matched).toBe(
      false,
    );
  });
  test("homophone kanji cannot pass flexible mode", () => {
    const bridge = load({
      ...record,
      japanese: "橋です。",
      furiganaVariants: ["{橋|はし}です。"],
    });
    expect(compare(bridge, "箸です", Strictness.Flexible).matched).toBe(false);
    expect(compare(bridge, "はしです", Strictness.Flexible).matched).toBe(true);
  });
  test("mismatched annotations and incomplete readings are excluded", () => {
    expect(
      validReadings({
        ...record,
        furiganaVariants: ["{水|みず}を飲みます。", "{橋|はし}です。"],
      }),
    ).toEqual([]);
  });
  test("empty or punctuation-only writing never matches", () => {
    for (const mode of [
      Strictness.Kana,
      Strictness.Flexible,
      Strictness.Exact,
    ] as const)
      expect(compare(sentence, " 。！ ", mode).matched).toBe(false);
  });
  test("length buckets include their boundaries", () => {
    expect([7, 8, 12, 13].map(lengthOf)).toEqual([
      Length.Short,
      Length.Medium,
      Length.Medium,
      Length.Long,
    ]);
  });
});

test("the imported bank supports every level and length without missing readings", () => {
  for (const level of levels) {
    for (const length of ["short", "medium", "long"]) {
      expect(
        exercises.some(
          (row) =>
            row.level !== null &&
            isWithinLevel(row.level, level) &&
            lengthOf(row.englishWordCount) === length,
        ),
      ).toBe(true);
    }
  }
  for (const row of exercises) {
    const { japanese } = row.reference;
    const reference = compare(row, japanese, Strictness.Exact);
    if (
      !reference.matched ||
      !compare(row, reference.kana, Strictness.Kana).matched ||
      !compare(row, japanese, Strictness.Flexible).matched
    ) {
      throw new Error(`Inconsistent reference forms for ${row.id}`);
    }
  }
});
