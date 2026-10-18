import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { finite, nominal } from "./grammar-context";
import { verbForms } from "./verb-forms";

const names = new Set([
  "人",
  "男",
  "女",
  "少年",
  "少女",
  "町",
  "市",
  "村",
  "国",
  "店",
  "会社",
  "学校",
  "大学",
  "山",
  "川",
  "湖",
  "料理",
  "食べ物",
  "花",
  "本",
  "映画",
  "小説",
  "歌",
  "曲",
  "言葉",
  "単語",
  "名前",
]);
const senses = new Set([
  "音",
  "声",
  "におい",
  "匂い",
  "臭い",
  "香り",
  "味",
  "感じ",
]);
const doForms = [
  "する",
  "します",
  "した",
  "しました",
  "しない",
  "しません",
  "して",
];
const choices = new Set([
  "コーヒー",
  "紅茶",
  "お茶",
  "水",
  "ビール",
  "ジュース",
  "牛乳",
  "寿司",
  "すし",
  "カレー",
  "ラーメン",
  "うどん",
  "そば",
  "定食",
  "日替わり定食",
]);
const resultingQualities = new Set([
  "静か",
  "きれい",
  "綺麗",
  "清潔",
  "自由",
  "簡単",
  "便利",
  "複雑",
  "安全",
  "明確",
  "丈夫",
  "楽",
]);

export function nominalGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const { text, ends, matches, add, longest } = grammarMatcher(sentence, base);
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    const next = base[index + 1];
    const after = base[index + 2];
    const adjacent = previous?.end === entry.start;
    const following = next?.start === entry.end;
    for (const form of ["何か", "なにか", "誰か", "だれか", "どこか"]) {
      const end = entry.start + form.length;
      const particle = base.find((part) => part.start === end);
      if (
        ends.has(end) &&
        particle &&
        (particle.japanese === "が" ||
          (form === "どこか" && ["へ", "に"].includes(particle.japanese)))
      )
        add(entry.start, form, "nani-ka-dare-ka-doko-ka");
    }
    // Direct もう + verified affirmative past avoids "another", "soon",
    // negative "any more", and quantities whose intended scope is ambiguous.
    if (
      entry.japanese === "もう" &&
      next &&
      following &&
      next.wordTypes.includes("Verb") &&
      verbForms(next.dictionaryForm ?? next.japanese).some(
        (form) =>
          form.te.replace(/て$/u, "た").replace(/で$/u, "だ") === next.japanese,
      )
    )
      add(entry.start, entry.japanese + next.japanese, "mou-ta");
    if (entry.wordTypes.includes("い-adjective")) {
      const lemma = entry.dictionaryForm ?? entry.japanese;
      if (
        lemma.endsWith("い") &&
        !["おとなしい", "大人しい", "楽しい", "親しい", "仲良い"].includes(
          lemma,
        )
      )
        longest(
          entry.start,
          doForms.map(
            (ending) =>
              (lemma === "いい" ? "よ" : lemma.slice(0, -1)) + "く" + ending,
          ),
          "ku-suru-ni-suru",
        );
    }
    if (
      entry.wordTypes.includes("な-adjective") &&
      resultingQualities.has(entry.japanese) &&
      /を[^。？！?!、,「」『』]*$/u.test(text.slice(0, entry.start))
    )
      longest(
        entry.start,
        doForms.map((ending) => entry.japanese + "に" + ending),
        "ku-suru-ni-suru",
      );
    if (!previous) continue;
    if (
      (adjacent || /^[」』]$/u.test(text.slice(previous.end, entry.start))) &&
      nominal(previous) &&
      text.startsWith("という", entry.start)
    ) {
      const named = base.find((part) => part.start === entry.start + 3);
      if (named && names.has(named.japanese))
        add(entry.start, "という", "to-iu-named");
    }
    if (!adjacent) continue;
    if (
      entry.japanese === "に" &&
      choices.has(previous.japanese) &&
      !/を[^。？！?!、,「」『』]*$/u.test(text.slice(0, previous.start))
    )
      longest(
        entry.start,
        ["にする", "にします", "にした", "にしました", "にしませんか"],
        "ni-suru",
      );
    if (
      entry.japanese === "か" &&
      entry.wordTypes.includes("Particle") &&
      nominal(previous) &&
      next &&
      following &&
      nominal(next) &&
      after?.start === next.end &&
      ["を", "も"].includes(after.japanese) &&
      !["何", "誰", "どこ", "どれ", "いつ"].includes(previous.japanese)
    )
      add(entry.start, entry.japanese, "ka-or");
    if (entry.japanese === "が" && senses.has(previous.japanese))
      longest(
        previous.start,
        doForms.map((ending) => previous.japanese + "が" + ending),
        "ga-suru",
      );
    if (nominal(previous) || previous.wordTypes.includes("な-adjective")) {
      longest(
        entry.start,
        [
          "でございます",
          "でございました",
          "でございません",
          "でございませんでした",
        ],
        "de-gozaimasu",
      );
      if (entry.japanese === "な") add(entry.start, "なのに", "noni-although");
    }
    if (
      (nominal(previous) || finite(previous)) &&
      /^(?:かな|かしら)/u.test(text.slice(entry.start))
    ) {
      for (const form of ["かな", "かしら"])
        if (/^[。？！?!」』\s]*$/u.test(text.slice(entry.start + form.length)))
          add(entry.start, form, "kana-kashira");
    }
    if (
      entry.japanese === "し" &&
      !entry.wordTypes.includes("Verb") &&
      finite(previous)
    )
      add(entry.start, entry.japanese, "shi");
  }
  return matches;
}
