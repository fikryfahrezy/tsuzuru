import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

function noun(entry: AnswerEntry | undefined): entry is AnswerEntry {
  return (
    !!entry &&
    (entry.wordTypes.some((type) => ["Noun", "Pronoun"].includes(type)) ||
      (entry.wordTypes.length === 0 &&
        /^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(entry.japanese)))
  );
}
function predicate(entry: AnswerEntry) {
  if (entry.wordTypes.some((type) => ["Copula", "な-adjective"].includes(type)))
    return true;
  if (entry.wordTypes.includes("い-adjective"))
    return /(?:い|かった|です)$/u.test(entry.japanese);
  return (
    entry.wordTypes.includes("Verb") &&
    (entry.japanese === entry.dictionaryForm ||
      /(?:う|く|ぐ|す|つ|ぬ|ぶ|む|る|た|だ|ない|ます|ました|ません)$/u.test(
        entry.japanese,
      ))
  );
}
function quantity(entry: AnswerEntry | undefined): entry is AnswerEntry {
  return (
    !!entry &&
    /^[0-9一二三四五六七八九十百千]+(?:人|個|つ|枚|まい|本|冊|杯|台|匹|羽|件|通)$/u.test(
      entry.japanese.normalize("NFKC"),
    )
  );
}
const copulas = [
  "",
  "だ",
  "です",
  "だった",
  "でした",
  "じゃない",
  "じゃないです",
  "ではない",
  "ではありません",
  "じゃなかった",
  "ではなかった",
];
const existence = [
  "ある",
  "あります",
  "あった",
  "ありました",
  "ありません",
  "ありませんでした",
  "ない",
  "ないです",
  "なかった",
  "なかったです",
  "いる",
  "います",
  "いた",
  "いました",
  "いません",
  "いませんでした",
  "いない",
  "いないです",
  "いなかった",
  "いなかったです",
];

export function predicateGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const { matches, longest: matchLongest } = grammarMatcher(sentence, base);
  const longest = (entry: AnswerEntry, forms: string[], id: string) =>
    matchLongest(entry.start, forms, id);
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    const next = base[index + 1];
    if (!previous || previous.end !== entry.start) continue;
    if (entry.japanese === "が" && entry.wordTypes.includes("Particle")) {
      const verb = base[index - 2];
      const nominalized =
        ["の", "こと", "事"].includes(previous.japanese) &&
        verb?.end === previous.start &&
        predicate(verb);
      if (!noun(previous) && !nominalized) continue;
      if (
        !text.startsWith("が好き勝手", entry.start) &&
        !text.startsWith("が好き好んで", entry.start)
      )
        longest(
          entry,
          ["好き", "嫌い", "大好き", "大嫌い"].flatMap((root) =>
            copulas.map((ending) => "が" + root + ending),
          ),
          "ga-suki-ga-kirai",
        );
      // The same kanji also has stage-direction readings かみて / しもて.
      if (next && !/^(?:かみて|しもて)/u.test(next.kana))
        longest(
          entry,
          ["上手", "下手", "じょうず", "へた"].flatMap((root) =>
            copulas.map((ending) => "が" + root + ending),
          ),
          "ga-jouzu-ga-heta",
        );
      const counters =
        next?.start === entry.end && quantity(next)
          ? ["", next.japanese]
          : [""];
      longest(
        entry,
        counters.flatMap((counter) =>
          existence.map((ending) => "が" + counter + ending),
        ),
        "ga-aru-ga-iru",
      );
    } else if (
      entry.japanese === "を" &&
      entry.wordTypes.includes("Particle") &&
      noun(previous)
    ) {
      const counters =
        next?.start === entry.end && quantity(next)
          ? ["", next.japanese]
          : [""];
      longest(
        entry,
        counters.flatMap((counter) => [
          "を" + counter + "ください",
          "を" + counter + "下さい",
        ]),
        "o-kudasai",
      );
    } else if (
      entry.japanese === "か" &&
      entry.wordTypes.includes("Particle") &&
      (noun(previous) || predicate(previous))
    ) {
      longest(entry, ["かどうか"], "ka-dou-ka");
      longest(
        entry,
        [
          "かもしれない",
          "かもしれません",
          "かも知れない",
          "かも知れません",
          "かもしれないです",
        ],
        "kamo-shirenai",
      );
    }
  }
  return matches;
}
