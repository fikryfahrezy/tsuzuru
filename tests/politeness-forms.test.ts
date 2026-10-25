import { expect, test } from "bun:test";
import {
  AlternativeMethod,
  compare,
  Politeness,
  Strictness,
} from "../shared/practice";
import { exerciseById } from "../server/utils/exercises";
import {
  finalPredicate,
  plainAllowed,
  withPolitenessForm,
} from "../server/utils/politeness-forms";
import { practiceDetails } from "../server/utils/practice-details";

const forms = (id: string) =>
  finalPredicate(exerciseById.get(id)!)?.forms.map((form) => [
    form.japanese,
    form.politeness,
    form.current ?? false,
  ]);

test("a copula negative lists its plain and polite spellings", () => {
  // それはあなたのナイフではない。
  expect(forms("ca3f69a111c1f8e0bc8e034b")).toEqual([
    ["ではない", Politeness.Plain, true],
    ["じゃない", Politeness.Plain, false],
    ["ではありません", Politeness.Polite, false],
    ["じゃありません", Politeness.Polite, false],
    ["ではないです", Politeness.Polite, false],
    ["じゃないです", Politeness.Polite, false],
  ]);
});

test("verbs keep tense and take readings from their lemma", () => {
  // 電気シェーバーから火が出ました。
  const predicate = finalPredicate(
    exerciseById.get("0528aa39033070edb8cc9858")!,
  )!;
  expect(
    predicate.forms.map((form) => [form.japanese, form.kana, form.politeness]),
  ).toEqual([
    ["出た", "でた", Politeness.Plain],
    ["出ました", "でました", Politeness.Polite],
  ]);
});

test("adjectives add or drop です", () => {
  // 彼は工作がうまい。
  expect(forms("0000978f3525f2d6e60e600b")).toEqual([
    ["うまい", Politeness.Plain, true],
    ["うまいです", Politeness.Polite, false],
  ]);
  // このテープレコーダーは新しくない。
  expect(forms("0758756ce6b11d174759db74")).toEqual([
    ["新しくない", Politeness.Plain, true],
    ["新しくありません", Politeness.Polite, false],
    ["新しくないです", Politeness.Polite, false],
  ]);
});

test("keigo, rhetorical じゃない, である, and several sentences are left alone", () => {
  for (const id of [
    "5a3e1421464ed87a592164fe", // アンドレアと申します。
    "5916c8667afa3d5f57e35a8d", // 少し戻ってみたらいいんじゃない。
    "ccd5bf3b8f85be22848d793b", // 彼らは平和を愛する国民である。
    "008b8bb4762af4f907615633", // 明るくなってきた。もうすぐ朝だ。
  ])
    expect(finalPredicate(exerciseById.get(id)!)).toBeNull();
});

test("an earlier polite clause keeps the ending polite", () => {
  // しかし回収時間が早すぎるため、ゴミの日に出すことが難しいです。
  const sentence = exerciseById.get("02489648bb4a8f65a51e3084")!;
  const predicate = finalPredicate(sentence)!;
  expect(plainAllowed(sentence, predicate)).toBe(true);
  expect(
    plainAllowed(
      {
        ...sentence,
        reference: { ...sentence.reference, japanese: "雨ですが、行きます。" },
      },
      { ...predicate, start: 6 },
    ),
  ).toBe(false);
});

test("only kana endings are swapped, in every furigana variant", () => {
  const current = {
    japanese: "出ました",
    kana: "でました",
    politeness: Politeness.Polite,
  };
  expect(
    withPolitenessForm(
      {
        japanese: "火が出ましたよ。",
        furiganaVariants: ["{火|ひ}が{出|で}ましたよ。"],
      },
      current,
      { japanese: "出た", kana: "でた", politeness: Politeness.Plain },
      "よ。",
    ),
  ).toEqual({
    japanese: "火が出たよ。",
    furiganaVariants: ["{火|ひ}が{出|で}たよ。"],
  });
  // 来ます → 来ない also changes 来's reading (き → こ).
  expect(
    withPolitenessForm(
      { japanese: "来ます。", furiganaVariants: ["{来|き}ます。"] },
      { japanese: "来ます", kana: "きます", politeness: Politeness.Polite },
      { japanese: "来ない", kana: "こない", politeness: Politeness.Plain },
      "。",
    ),
  ).toBeNull();
});

test("the breakdown shows the forms on the predicate's last word", () => {
  const sentence = exerciseById.get("ca3f69a111c1f8e0bc8e034b")!;
  const parts = practiceDetails(sentence).answerBreakdown;
  const marked = parts.filter((part) => part.politenessForms);
  expect(marked).toHaveLength(1);
  expect(marked[0]!.end).toBe(sentence.reference.japanese.length - 1);
});

test("other politeness forms are accepted alternatives", () => {
  const sentence = exerciseById.get("ca3f69a111c1f8e0bc8e034b")!;
  for (const answer of [
    "それはあなたのナイフじゃない。",
    "それはあなたのナイフではありません。",
  ]) {
    const result = compare(sentence, answer, Strictness.Flexible, true);
    expect(result.matched).toBe(true);
    expect(result.acceptedAlternative?.provenance.method).toBe(
      AlternativeMethod.PolitenessForm,
    );
  }
});
