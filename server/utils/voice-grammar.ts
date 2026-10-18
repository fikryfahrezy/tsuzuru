import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { verbForms } from "./verb-forms";
import { finite, humans } from "./grammar-context";
import { referenceLexemes } from "./reference-lexemes";

const eRow: Record<string, string> = {
  う: "え",
  く: "け",
  ぐ: "げ",
  す: "せ",
  つ: "て",
  ぬ: "ね",
  ぶ: "べ",
  む: "め",
  る: "れ",
};
// Restrict potential readings to verbs without a competing lexical intransitive
// sense. 切れる / 折れる / 売れる / 解ける / 開ける need more context.
const potentialVerbs = [
  "読む",
  "書く",
  "話す",
  "泳ぐ",
  "飲む",
  "走る",
  "買う",
  "待つ",
  "使う",
  "会う",
  "聞く",
  "持つ",
  "呼ぶ",
  "遊ぶ",
  "渡る",
  "戻る",
  "通る",
];
const passiveVerbs = new Set([
  "褒める",
  "ほめる",
  "叱る",
  "しかる",
  "責める",
  "殴る",
  "叩く",
  "殺す",
  "追う",
  "追いかける",
  "捕まえる",
  "捕える",
  "嫌う",
  "傷つける",
  "だます",
  "騙す",
  "裏切る",
]);
const endings = [
  "る",
  "ます",
  "た",
  "ました",
  "ない",
  "ません",
  "なかった",
  "ませんでした",
  "て",
];
const honorific = new Map([
  ["いらっしゃる", "sonkeigo"],
  ["おっしゃる", "sonkeigo"],
  ["なさる", "sonkeigo"],
  ["召し上がる", "sonkeigo"],
  ["伺う", "kenjougo"],
  ["申す", "kenjougo"],
  ["申し上げる", "kenjougo"],
]);

export function voiceGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const lexemes = referenceLexemes(sentence);
  const { matches, longest } = grammarMatcher(sentence, base);
  for (const [index, entry] of base.entries()) {
    for (const original of potentialVerbs) {
      if (!verbForms(original).length) continue;
      const root = original.slice(0, -1) + eRow[original.at(-1)!];
      const derived = root + "る";
      if (
        entry.wordTypes.includes("Verb") &&
        (!entry.dictionaryForm ||
          [original, derived].includes(entry.dictionaryForm))
      )
        longest(
          entry.start,
          endings.map((ending) => root + ending),
          "eru-rareru-potential",
        );
    }
    const lemma = entry.dictionaryForm ?? entry.japanese;
    const lesson = honorific.get(lemma);
    if (lesson && entry.wordTypes.includes("Verb"))
      for (const forms of verbForms(lemma))
        longest(
          entry.start,
          [
            lemma,
            forms.te,
            forms.te.replace(/て$/u, "た").replace(/で$/u, "だ"),
            forms.stem + "ます",
            forms.stem + "ました",
            forms.stem + "ません",
            forms.negative + "い",
          ],
          lesson,
        );
    if (entry.japanese === "拝見")
      longest(
        entry.start,
        ["拝見する", "拝見します", "拝見した", "拝見しました", "拝見して"],
        "kenjougo",
      );
    if (
      entry.japanese !== "に" ||
      !humans.has(base[index - 1]?.japanese ?? "") ||
      base[index - 1]?.end !== entry.start
    )
      continue;
    let cursor = entry.end;
    for (const predicate of base.slice(index + 1)) {
      if (text.slice(cursor, predicate.start)) break;
      cursor = predicate.end;
      if (
        !predicate.wordTypes.includes("Verb") ||
        predicate.wordTypes.includes("Noun")
      ) {
        if (finite(predicate)) break;
        continue;
      }
      const original = predicate.dictionaryForm ?? predicate.japanese;
      if (passiveVerbs.has(original))
        for (const forms of verbForms(
          original,
          lexemes.find(
            (word) =>
              word.japanese === predicate.japanese &&
              word.reading === predicate.kana,
          )?.verbClass,
        )) {
          const root =
            forms.stem === original.slice(0, -1)
              ? forms.stem + "られ"
              : forms.negative.slice(0, -1) + "れ";
          longest(
            predicate.start,
            endings.map((ending) => root + ending),
            "reru-rareru-passive",
          );
        }
      break;
    }
  }
  return matches;
}
