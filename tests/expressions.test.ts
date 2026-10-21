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
  // こい has no verified spelling (来い, 濃い, 恋), so no sense is guessed.
  expect(
    base.find((part) => part.japanese === "こいだ")?.dictionaryMeanings,
  ).toBeUndefined();
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
      // A kana form is its own reading.
      if (/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(form))
        expect(hiragana(form)).toBe(expression.reading);
      expect(forms.has(form)).toBe(false);
      forms.add(form);
    }
  }
});
