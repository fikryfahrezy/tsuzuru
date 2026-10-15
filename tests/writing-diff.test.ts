import { describe, expect, test } from "bun:test";
import {
  compare,
  DifferenceKind,
  Strictness,
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
  sources: [],
};
const sentence = load(record);
describe("character differences", () => {
  test("a valid writing variant has no differences", () => {
    expect(
      compare(sentence, "ミズを飲みます！", Strictness.Flexible).differences,
    ).toBeNull();
  });
  test("marks only a wrong character while accepting mixed spelling", () => {
    const diff = compare(
      sentence,
      "みずを飲みまし",
      Strictness.Flexible,
    ).differences!;
    expect(
      diff.answer.filter((part) => part.kind !== DifferenceKind.Same),
    ).toEqual([{ text: "し", kind: DifferenceKind.Changed }]);
    expect(
      diff.expected.filter((part) => part.kind !== DifferenceKind.Same),
    ).toEqual([{ text: "す", kind: DifferenceKind.Changed }]);
  });
  test("marks missing characters at their insertion position", () => {
    const diff = compare(sentence, "水を飲ます", Strictness.Exact).differences!;
    expect(diff.answer[3]).toEqual({
      text: "□",
      kind: DifferenceKind.Missing,
      expected: "み",
    });
    expect(diff.expected.map((part) => part.text).join("")).toBe(
      "水を飲みます",
    );
  });
  test("marks extra characters without shifting subsequent letters", () => {
    const diff = compare(
      sentence,
      "水をを飲みます",
      Strictness.Flexible,
    ).differences!;
    expect(
      diff.answer.filter((part) => part.kind === DifferenceKind.Extra),
    ).toEqual([{ text: "を", kind: DifferenceKind.Extra }]);
    expect(
      diff.answer.filter((part) => part.kind === DifferenceKind.Changed),
    ).toEqual([]);
  });
  test("places missing final letters before ignored punctuation", () => {
    const diff = compare(
      sentence,
      "水を飲みま。 ",
      Strictness.Exact,
    ).differences!;
    expect(diff.answer.map((part) => part.text).join("")).toBe(
      "水を飲みま□。 ",
    );
  });
  test("preserves original halfwidth kana, spaces, and punctuation", () => {
    const answer = " ﾐｽﾞｦﾉﾐﾏｼ！ ";
    const diff = compare(sentence, answer, Strictness.Kana).differences!;
    expect(
      diff.answer
        .filter((part) => part.kind !== DifferenceKind.Missing)
        .map((part) => part.text)
        .join(""),
    ).toBe(answer);
    expect(
      diff.answer.filter((part) => part.kind === DifferenceKind.Changed),
    ).toEqual([{ text: "ｼ", kind: DifferenceKind.Changed }]);
  });
  test("does not split a supplementary character or emoji", () => {
    const diff = compare(
      sentence,
      "水を飲みます😀",
      Strictness.Exact,
    ).differences!;
    expect(diff.answer.at(-1)).toEqual({
      text: "😀",
      kind: DifferenceKind.Extra,
    });
  });
  test("uses the closest approved reading", () => {
    const tomorrow = load({
      ...record,
      japanese: "明日です。",
      furiganaVariants: ["{明日|あす}です。", "{明日|あした}です。"],
    });
    const diff = compare(tomorrow, "あしだです", Strictness.Kana).differences!;
    expect(diff.expected.map((part) => part.text).join("")).toBe("あしたです");
    expect(
      diff.answer.filter((part) => part.kind !== DifferenceKind.Same),
    ).toEqual([{ text: "だ", kind: DifferenceKind.Changed }]);
  });
  test("handles many mixed alternatives without enumerating combinations", () => {
    const repeated = load({
      ...record,
      japanese: "水".repeat(24) + "です",
      furiganaVariants: ["{水|みず}".repeat(24) + "です"],
    });
    const diff = compare(
      repeated,
      "水みず".repeat(12) + "でし",
      Strictness.Flexible,
    ).differences!;
    expect(
      diff.answer.filter((part) => part.kind !== DifferenceKind.Same),
    ).toEqual([{ text: "し", kind: DifferenceKind.Changed }]);
  });
  test("incorrect homophone kanji is highlighted", () => {
    const bridge = load({
      ...record,
      japanese: "橋です",
      furiganaVariants: ["{橋|はし}です"],
    });
    expect(
      compare(bridge, "箸です", Strictness.Flexible).differences!.answer[0],
    ).toEqual({ text: "箸", kind: DifferenceKind.Changed });
  });
});
