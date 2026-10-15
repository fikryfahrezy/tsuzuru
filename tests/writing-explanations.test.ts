import { expect, test } from "bun:test";
import { compare, Strictness, type Candidate } from "../shared/practice";
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

test("accepted script variants do not get error explanations", () => {
  expect(
    compare(sentence, "ミズヲノミマス", Strictness.Flexible).explanations,
  ).toEqual([]);
});
test("exact mode explains a script mismatch without calling the grammar wrong", () => {
  const explanation = compare(sentence, "みずをのみます", Strictness.Exact)
    .explanations![0]!;
  expect(explanation.title).toBe("Writing mode mismatch");
  expect(explanation.detail).toContain("accepted in Kana + kanji");
});
test("kana-only explains the restriction on kanji", () => {
  expect(
    compare(sentence, "水を飲みます", Strictness.Kana).explanations![0]!.title,
  ).toBe("Kanji in kana-only mode");
});
test("missing and extra text get actionable explanations", () => {
  const missing = compare(sentence, "水を飲ます", Strictness.Flexible)
    .explanations![0]!;
  expect(missing.title).toBe("Missing text");
  expect(missing.actual).toBe("");
  expect(missing.expected).toBe("み");
  expect(missing.context).toContain("飲〔み〕ます");
  const extra = compare(sentence, "水をを飲みます", Strictness.Flexible)
    .explanations![0]!;
  expect(extra.title).toBe("Extra text");
  expect(extra.actual).toBe("を");
  expect(extra.expected).toBe("");
});
test("consecutive substitutions are explained as one span", () => {
  const explanations = compare(
    sentence,
    "水を飲みもせ",
    Strictness.Flexible,
  ).explanations!;
  expect(explanations).toHaveLength(1);
  expect(explanations[0]!.actual).toBe("もせ");
  expect(explanations[0]!.expected).toBe("ます");
});
test("kanji explanation uses the supplied word reading", () => {
  const bridge = load({
    ...record,
    japanese: "橋です",
    furiganaVariants: ["{橋|はし}です"],
  });
  const explanation = compare(bridge, "箸です", Strictness.Flexible)
    .explanations![0]!;
  expect(explanation.detail).toContain("「橋」");
  expect(explanation.detail).toContain("「はし」");
});
