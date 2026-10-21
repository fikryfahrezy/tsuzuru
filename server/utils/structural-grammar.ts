import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

import { finite, nominal } from "./grammar-context";
import { appearanceForms } from "./grammar-rules/construction";
import { verbForms } from "./verb-forms";
import { vocabulary } from "./vocabulary";

const lemma = (word: AnswerEntry) => word.dictionaryForm ?? word.japanese;
const demonstrativeLemmas = new Set([
  "此れ",
  "是",
  "之",
  "其れ",
  "其",
  "彼れ",
  "彼",
  "何れ",
  "此処",
  "此所",
  "其処",
  "其所",
  "彼処",
  "何処",
]);
const change = [
  "なる",
  "なります",
  "なった",
  "なりました",
  "ならない",
  "なりません",
  "ならなかった",
  "なりませんでした",
  "なって",
];
// お + a verb stem before になる is honorific お〜になる (お出かけになる), even
// when the tokenizer keeps it as one dictionary noun such as お出掛け.
const honorificStems = new Set(
  vocabulary.flatMap((entry) =>
    (entry.pos ?? [])
      .filter((code) => /^v[15k]/u.test(code))
      .flatMap((code) => [
        ...verbForms(entry.word, code),
        ...verbForms(entry.reading, code),
      ])
      .map((forms) => "お" + forms.stem),
  ),
);
const number = "[0-9０-９一二三四五六七八九十百千万半]+";
const amount = new RegExp(
  `^${number}(?:分|時間|日|週間|か月|ヶ月|年|円|人|個|つ|枚|本|冊|杯|台|回|度|キロ|メートル)$`,
  "u",
);
const point = new RegExp(
  `^(?:午前|午後)?${number}(?:時(?:半|${number}分)?|月|日|年)$`,
  "u",
);
const period = new RegExp(
  `^(?:${number})?(?:分|時間|日|週間|週|か月|ヶ月|月|年)$`,
  "u",
);

// These rules require positioned words and neighboring grammatical roles.
// They never search across punctuation or infer a word from an internal suffix.
export function structuralGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const { text, matches, add, longest } = grammarMatcher(sentence, base);
  for (const [index, word] of base.entries()) {
    const previous = base[index - 1];
    const next = base[index + 1];
    const adjacent = previous?.end === word.start;
    const following = next?.start === word.end;
    const demonstrative =
      !word.dictionaryForm ||
      word.dictionaryForm === word.japanese ||
      demonstrativeLemmas.has(word.dictionaryForm);
    const interval = text
      .slice(word.start)
      .match(
        new RegExp(`^${number}(?:分|時間|日|週間|か月|ヶ月|年)おきに`, "u"),
      )?.[0];
    if (interval) add(word.start, interval, "oki-ni");
    const each = text
      .slice(word.start)
      .match(
        new RegExp(
          `^(?:[\\p{Script=Han}\\p{Script=Katakana}ー]+|${number}(?:分|時間|日|週間|月|年))ごとに`,
          "u",
        ),
      )?.[0];
    if (each) add(word.start, each, "goto-ni");
    if (
      ["これ", "それ", "あれ", "どれ"].includes(word.japanese) &&
      demonstrative &&
      !word.wordTypes.includes("Verb")
    )
      add(word.start, word.japanese, "kore-sore-are-dore");
    if (
      demonstrative &&
      ["ここ", "そこ", "あそこ", "どこ"].includes(word.japanese)
    )
      add(word.start, word.japanese, "koko-soko-asoko-doko");
    if (
      ["この", "その", "あの", "どの"].includes(word.japanese) &&
      following &&
      nominal(next)
    )
      add(word.start, word.japanese, "kono-sono-ano-dono");
    if (word.wordTypes.includes("な-adjective") && next && following) {
      const after = base[index + 2];
      // A 的 adjective can sit between な and its noun (重要な社会的結果).
      if (
        next.japanese === "な" &&
        after?.start === next.end &&
        (nominal(after) || after.japanese.endsWith("的"))
      )
        add(word.start, word.japanese + "な", "na-na-adjective");
    }
    if (word.wordTypes.includes("な-adjective"))
      longest(
        word.start,
        appearanceForms.map((ending) => lemma(word) + ending),
        "sou-da-appearance",
      );
    if (word.wordTypes.includes("な-adjective")) {
      longest(
        word.start,
        ["しかたがない", "仕方がない", "しょうがない", "しかたがなかった"].map(
          (ending) => word.japanese + "で" + ending,
        ),
        "te-shou-ga-nai-te-shikata-ga-nai",
      );
      longest(
        word.start,
        ["たまらない", "たまらなかった", "たまりません"].map(
          (ending) => word.japanese + "で" + ending,
        ),
        "te-tamaranai",
      );
    }
    if (nominal(word) || word.wordTypes.includes("な-adjective"))
      longest(
        word.start,
        ["だそうだ", "だそうです"].map((ending) => word.japanese + ending),
        "sou-da-hearsay",
      );
    if (word.wordTypes.includes("い-adjective") && lemma(word).endsWith("い")) {
      const root =
        lemma(word) === "いい" ||
        (lemma(word) === "良い" && word.japanese.startsWith("よ"))
          ? "よ"
          : lemma(word).slice(0, -1);
      longest(
        word.start,
        ["たまらない", "たまらなかった", "たまりません"].map(
          (ending) => root + "くて" + ending,
        ),
        "te-tamaranai",
      );
      longest(
        word.start,
        ["しかたがない", "仕方がない", "しょうがない", "しかたがなかった"].map(
          (ending) => root + "くて" + ending,
        ),
        "te-shou-ga-nai-te-shikata-ga-nai",
      );
      const appearanceRoot = ["いい", "良い"].includes(lemma(word))
        ? root + "さ"
        : lemma(word) === "ない"
          ? "なさ"
          : root;
      longest(
        word.start,
        appearanceForms.map((ending) => appearanceRoot + ending),
        "sou-da-appearance",
      );
      longest(
        word.start,
        ["そうだ", "そうです"].map((ending) => lemma(word) + ending),
        "sou-da-hearsay",
      );
      longest(
        word.start,
        [
          "すぎる",
          "すぎます",
          "すぎた",
          "すぎました",
          "すぎて",
          "過ぎる",
          "過ぎた",
          "過ぎて",
        ].map((ending) => (lemma(word) === "ない" ? "なさ" : root) + ending),
        "sugiru",
      );
      longest(
        word.start,
        change.map((ending) => root + "く" + ending),
        "ku-naru-ni-naru",
      );
      // An adjective's conjunctive form may be one chip or adjective + て.
      const conjunctiveEnd = word.start + root.length + 2;
      const followingQuality = base.find(
        (part) => part.start >= conjunctiveEnd,
      );
      if (
        followingQuality &&
        /^[、,\s]*$/u.test(
          text.slice(conjunctiveEnd, followingQuality.start),
        ) &&
        followingQuality.wordTypes.some((type) =>
          ["い-adjective", "な-adjective"].includes(type),
        )
      )
        add(word.start, root + "くて", "kute-de");
      longest(
        word.start,
        ["でしょう", "でしょうね"].map((ending) => lemma(word) + ending),
        "deshou",
      );
    }
    if (!previous || !adjacent) continue;
    if (
      word.japanese === "ずつ" &&
      (amount.test(previous.japanese) ||
        ["少し", "すこし"].includes(previous.japanese))
    )
      add(previous.start, previous.japanese + word.japanese, "zutsu");
    if (
      word.japanese === "おき" &&
      period.test(previous.japanese) &&
      /[0-9０-９一二三四五六七八九十]/u.test(previous.japanese)
    )
      add(previous.start, previous.japanese + "おきに", "oki-ni");
    if (
      word.japanese === "に" &&
      (nominal(previous) || previous.wordTypes.includes("な-adjective"))
    )
      longest(
        previous.start,
        change.map((ending) => previous.japanese + "に" + ending),
        honorificStems.has(previous.japanese) ? "o-ni-naru" : "ku-naru-ni-naru",
      );
    if (
      word.japanese === "なら" &&
      (nominal(previous) ||
        finite(previous) ||
        previous.wordTypes.includes("な-adjective"))
    )
      add(word.start, word.japanese, "nara");
    if (
      ["けど", "けれど", "けれども"].includes(word.japanese) &&
      finite(previous)
    )
      add(word.start, word.japanese, "kedo-keredomo");
    if (
      word.japanese === "でしょう" &&
      (nominal(previous) ||
        finite(previous) ||
        previous.wordTypes.includes("な-adjective"))
    )
      add(word.start, word.japanese, "deshou");
    if (
      word.japanese === "だけ" &&
      (nominal(previous) || finite(previous)) &&
      !/^(?:あって|に|でなく|ではなく)/u.test(text.slice(word.end))
    )
      add(word.start, word.japanese, "dake");
    if (word.japanese === "など" && nominal(previous))
      add(word.start, word.japanese, "nado");
    if (["ごろ", "頃"].includes(word.japanese) && point.test(previous.japanese))
      add(previous.start, previous.japanese + word.japanese, "goro");
    if (
      ["くらい", "ぐらい"].includes(word.japanese) &&
      amount.test(previous.japanese)
    )
      add(previous.start, previous.japanese + word.japanese, "kurai-gurai");
    if (word.japanese === "に" && period.test(previous.japanese)) {
      const count = text
        .slice(word.end)
        .match(new RegExp(`^${number}(?:回|度)`, "u"))?.[0];
      if (count)
        add(previous.start, previous.japanese + "に" + count, "ni-frequency");
    }
    // (ご)参考までに is "for reference", not a deadline.
    if (
      word.japanese === "まで" &&
      !previous.japanese.endsWith("参考") &&
      (nominal(previous) || finite(previous) || point.test(previous.japanese))
    )
      add(word.start, "までに", "made-ni");
    if (["とき", "時"].includes(word.japanese)) {
      const owner = base[index - 2];
      if (
        finite(previous) ||
        ((previous.japanese === "の" || previous.japanese === "な") &&
          owner?.end === previous.start &&
          (nominal(owner) || owner.wordTypes.includes("な-adjective")))
      )
        add(word.start, word.japanese, "toki");
    }
  }
  return matches;
}
