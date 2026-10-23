import { expect, test } from "bun:test";
import { breakdownForChips } from "../app/utils/answer-breakdown";
import {
  baseAnswerEntries,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { answerChips } from "../server/utils/answer-chips";
import { exerciseById } from "../server/utils/exercises";
import { expressions, withExpressions } from "../server/utils/expressions";
import { practiceDetails } from "../server/utils/practice-details";
import { hiragana } from "../shared/practice";

const apples = exerciseById.get("46cc23c49187642f1ad5c36c")!;

test("kana lemmas use the verified spelling's dictionary entry", () => {
  const base = baseAnswerEntries(apples);
  expect(base.find((part) => part.japanese === "もって")).toMatchObject({
    dictionaryForm: "もつ",
    dictionaryMeanings: ["to hold"],
    spellings: ["持って"],
    wordTypes: ["Verb"],
  });
  // こい has no verified spelling (来い, 濃い, 恋), but its くる verb class
  // leaves only 来る among common verbs.
  expect(
    base.find((part) => part.japanese === "こいだ")?.dictionaryMeanings,
  ).toContain("to come (spatially or temporally)");
});

test("a fixed expression groups its words and drops their own forms", () => {
  const parts = practiceDetails(apples).answerBreakdown;
  expect(parts.map((part) => part.japanese)).toEqual([
    "これら",
    "の",
    "りんご",
    "は",
    "料理用",
    "に",
    "もってこいだ",
  ]);
  const phrase = parts.at(-1)!;
  expect(phrase).toMatchObject({
    kana: "もってこいだ",
    romaji: "mottekoida",
    dictionaryForm: "もってこい",
    meanings: [],
    dictionaryMeanings: ["ideal", "perfect (for)", "just right"],
    wordTypes: ["Expression"],
  });
  // Neither the て of もって nor a past tense of こいだ applies here.
  expect(phrase.grammar).toBeUndefined();

  const song = practiceDetails(
    exerciseById.get("098170abd41876c2dcda7653")!,
  ).answerBreakdown;
  const despite = song.find((part) => part.japanese === "どうしても")!;
  expect(despite.dictionaryMeanings?.[0]).toBe("no matter what");
  expect(despite.grammar).toBeUndefined();
});

test("どのくらい and its variants are one expression, not どれ + くらい", () => {
  for (const [id, japanese] of [
    ["14f62def417e1b5ec8f5b3ea", "どれくらい"],
    ["3329a3df1445c2f1b3ec96b5", "どれぐらい"],
    ["22dce4371905668c16de9dbf", "どのぐらい"],
  ] as const) {
    const part = practiceDetails(exerciseById.get(id)!).answerBreakdown.find(
      (entry) => entry.japanese === japanese,
    );
    expect(part?.dictionaryMeanings).toContain("how much");
    // どれ here is not "which one".
    expect(part?.grammar).toBeUndefined();
  }
  // あなたぐらい is "about your age", not a question.
  expect(
    practiceDetails(
      exerciseById.get("715432df5de08f66fc290d69")!,
    ).answerBreakdown.some(
      (part) =>
        part.japanese.endsWith("ぐらい") &&
        part.dictionaryMeanings?.includes("how much"),
    ),
  ).toBe(false);
});

test("申し訳ない and もったいない are expressions, not their parts", () => {
  const find = (id: string, japanese: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown.find(
      (part) => part.japanese === japanese,
    );
  expect(
    find("d08f44f65e4dca9d3ce9f824", "申し訳ない")?.dictionaryMeanings,
  ).toContain("I'm sorry");
  const polite = find("3e4a3854f7cb08e195b909e5", "申し訳ありません");
  expect(polite).toMatchObject({ dictionaryForm: "申し訳ない" });
  // The later 在庫がありません is a separate, ordinary ありません.
  expect(
    practiceDetails(
      exerciseById.get("3e4a3854f7cb08e195b909e5")!,
    ).answerBreakdown.filter((part) => part.japanese === "ありません"),
  ).toHaveLength(1);
  // もったい alone would read as "superior airs".
  expect(
    find("e6c0fbd87ecd230adb923c55", "もったいない")?.dictionaryMeanings,
  ).toContain("too good (for someone)");
});

test("split adverbs and kana words are grouped only in their own use", () => {
  const parts = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown;
  const find = (id: string, japanese: string) =>
    parts(id).find((part) => part.japanese === japanese);
  // 必ず + しも and ま + も + なく are one adverb each.
  expect(
    find("04d90be8469fe56a79f98e01", "必ずしも")?.dictionaryMeanings,
  ).toContain("not always");
  expect(find("a45a06a7214a38e5b33d7c61", "まもなく")).toMatchObject({
    dictionaryForm: "間もなく",
  });
  // いま is "now", but います is not いま + す.
  expect(
    find("57967874d8ab82dad4b0b27b", "いま")?.dictionaryMeanings,
  ).toContain("now");
  expect(
    parts("57967874d8ab82dad4b0b27b").find((part) => part.japanese === "います")
      ?.dictionaryForm,
  ).not.toBe("今");
  // まして is not まし.
  expect(
    parts("b4856191b538f788f326a3d7").some(
      (part) => part.dictionaryForm === "まし",
    ),
  ).toBe(false);
  // Exclamatory なんて needs an adjective and cannot follow a verb.
  expect(
    find("4b015ec09f26fe85d2faff33", "なんて")?.dictionaryMeanings,
  ).toContain("what a …!");
  expect(
    find("29d9f8e14661c9ddf281adfc", "なんて")?.dictionaryMeanings,
  ).toBeUndefined();
  // いやだ is 嫌 (unpleasant); a bare いや is "no"; いやらしい is neither.
  expect(find("3a5ca8b958068b6fc42b2df1", "いやだ")).toMatchObject({
    dictionaryForm: "嫌",
  });
  expect(
    find("62af13fe2873667d5935960c", "いや")?.dictionaryMeanings,
  ).toContain("no");
  expect(
    parts("63a9be24cd3f201763beba09").some(
      (part) =>
        ["嫌", "いや"].includes(part.dictionaryForm ?? part.japanese) &&
        part.wordTypes.includes("Expression"),
    ),
  ).toBe(false);
});

test("long-tail phrases are grouped only in their own use", () => {
  const parts = (id: string) =>
    practiceDetails(exerciseById.get(id)!).answerBreakdown;
  const meaning = (id: string, japanese: string) =>
    parts(id).find((part) => part.japanese === japanese)?.dictionaryMeanings;
  // Interjection よし, but not 止す in よしなさい.
  expect(meaning("4e164173dab0da005394a999", "よし")).toContain("all right!");
  expect(
    parts("6e01fc4d1d5a7788c774eafc").some(
      (part) => part.dictionaryForm === "よし",
    ),
  ).toBe(false);
  // なしでは is "without"; なしに keeps its own grammar lesson; なし (梨) is a pear.
  expect(meaning("1bab1b7b6b64ace56273ee67", "なしでは")).toContain("without");
  expect(
    parts("8324c43b1e275a6b96a690a8")
      .flatMap((part) => part.grammar ?? [])
      .some((entry) => entry.id === "nashi-ni-wa"),
  ).toBe(true);
  expect(
    parts("157dd7193d990eae36aa4a2f").some(
      (part) => part.dictionaryForm === "なしで",
    ),
  ).toBe(false);
  // Split phrases: やむ + を + えなかった, ぐっ + と.
  expect(meaning("6652987bc86f9f54949704d3", "やむをえなかった")).toContain(
    "unavoidable",
  );
  expect(meaning("416cf59519c61cb6803b9ba1", "ぐっと")).toContain("much more");
});

test("verb expressions keep the inflections that follow them", () => {
  const parts = practiceDetails(
    exerciseById.get("eb4d2d83a441a2ac60889cec")!,
  ).answerBreakdown;
  const careful = parts.find((part) => part.japanese === "気をつけなければ")!;
  expect(careful).toMatchObject({
    dictionaryForm: "気をつける",
    wordTypes: ["Expression", "Verb"],
  });
  expect(careful.grammar?.map((entry) => entry.japanese)).toContain(
    "つけなければならない",
  );
});

test("expressions only start at a word boundary", () => {
  // 電気をつけない: 気をつけ appears inside 電気, which is not the expression.
  const parts = practiceDetails(
    exerciseById.get("480d38280d83246005b90c6d")!,
  ).answerBreakdown;
  expect(parts.map((part) => part.japanese)).toContain("電気");
  expect(parts.some((part) => part.dictionaryForm === "気をつける")).toBe(
    false,
  );
});

test("maintained context and punctuation stop an expression", () => {
  const word = (
    japanese: string,
    start: number,
    meanings: string[] = [],
  ): AnswerEntry => ({
    entryId: `ja-${start}-${start + japanese.length}`,
    start,
    end: start + japanese.length,
    japanese,
    kana: japanese,
    romaji: "",
    meanings,
    wordTypes: [],
  });
  const grouped = (entries: AnswerEntry[]) =>
    withExpressions(apples, entries).entries.map((part) => part.japanese);
  expect(grouped([word("どう", 0), word("しても", 2)])).toEqual(["どうしても"]);
  expect(grouped([word("どう", 0, ["how"]), word("しても", 2)])).toEqual([
    "どう",
    "しても",
  ]);
  expect(grouped([word("どう", 0), word("しても", 3)])).toEqual([
    "どう",
    "しても",
  ]);
});

test("the shuffled breakdown shows each grouped phrase once", () => {
  const original = practiceDetails(apples).answerBreakdown;
  const displayed = breakdownForChips(answerChips(apples).reverse(), original);
  expect(displayed.map((part) => part.entryId).sort()).toEqual(
    original.map((part) => part.entryId).sort(),
  );
  expect(displayed[0]!.japanese).toBe("もってこいだ");
});

test("listed expressions are well formed", () => {
  const forms = new Set<string>();
  for (const expression of expressions) {
    expect(expression.reading).toBe(hiragana(expression.reading));
    expect(expression.forms.length).toBeGreaterThan(0);
    expect(expression.meanings.length).toBeGreaterThan(0);
    expect(expression.wordTypes.length).toBeGreaterThan(0);
    for (const form of expression.forms) {
      // A kana form starts with its reading (いやだ, read いや).
      if (/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(form))
        expect(hiragana(form).startsWith(expression.reading)).toBe(true);
      expect(forms.has(form)).toBe(false);
      forms.add(form);
    }
  }
});
