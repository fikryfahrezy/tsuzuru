import { expect, test } from "bun:test";
import { compare, type Candidate } from "../shared/practice";
const sentence: Candidate = {
  id: "water",
  english: "I drink water.",
  japanese: "水を飲みます。",
  furiganaVariants: ["{水|みず}を{飲|の}みます。"],
  englishWordCount: 3,
  targetVocabulary: [],
  sources: [],
};

test("accepted script variants do not get error explanations", () => {
  expect(compare(sentence, "ミズヲノミマス", "flexible").explanations).toEqual(
    [],
  );
});
test("exact mode explains a script mismatch without calling the grammar wrong", () => {
  const explanation = compare(sentence, "みずをのみます", "exact")
    .explanations![0]!;
  expect(explanation.title).toBe("Writing mode mismatch");
  expect(explanation.detail).toContain("accepted in Kana + kanji");
});
test("kana-only explains the restriction on kanji", () => {
  expect(
    compare(sentence, "水を飲みます", "kana").explanations![0]!.title,
  ).toBe("Kanji in kana-only mode");
});
test("missing and extra text get actionable explanations", () => {
  const missing = compare(sentence, "水を飲ます", "flexible").explanations![0]!;
  expect(missing.title).toBe("Missing text");
  expect(missing.actual).toBe("");
  expect(missing.expected).toBe("み");
  expect(missing.context).toContain("飲〔み〕ます");
  const extra = compare(sentence, "水をを飲みます", "flexible")
    .explanations![0]!;
  expect(extra.title).toBe("Extra text");
  expect(extra.actual).toBe("を");
  expect(extra.expected).toBe("");
});
test("consecutive substitutions are explained as one span", () => {
  const explanations = compare(
    sentence,
    "水を飲みもせ",
    "flexible",
  ).explanations!;
  expect(explanations).toHaveLength(1);
  expect(explanations[0]!.actual).toBe("もせ");
  expect(explanations[0]!.expected).toBe("ます");
});
test("kanji explanation uses the supplied word reading", () => {
  const bridge = {
    ...sentence,
    japanese: "橋です",
    furiganaVariants: ["{橋|はし}です"],
  };
  const explanation = compare(bridge, "箸です", "flexible").explanations![0]!;
  expect(explanation.detail).toContain("「橋」");
  expect(explanation.detail).toContain("「はし」");
});
