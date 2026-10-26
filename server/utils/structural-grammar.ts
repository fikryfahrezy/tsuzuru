import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";

import { finite, nominal } from "./grammar-context";
import { appearanceForms } from "./grammar-rules/construction";
import { bekiEndings } from "./grammar-rules/verb";
import { verbForms } from "./verb-forms";
import { vocabulary } from "./vocabulary";

const lemma = (word: AnswerEntry) => word.dictionaryForm ?? word.japanese;
// Negative endings after では / じゃ / でも and an い-adjective's く form,
// which the tokenizer splits off (重要 + では + ない, よく + ない). It keeps
// ないでしょう and ないだろう as one word.
const negativeEndings = [
  "ない",
  "ないです",
  "なかった",
  "なかったです",
  "ありません",
  "ありませんでした",
  // ではなく(て): not A but B.
  "なく",
  "なくて",
  "ないでしょう",
  "ないだろう",
  "ないだろ",
];
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

// ぶり after a time span or an action noun (久しぶり, 警戒ぶり), but not
// lexical nouns that merely end in it (どしゃぶり "downpour", 身ぶり).
const lexicalBuri = new Set([
  "ぶり",
  "どしゃぶり",
  "土砂ぶり",
  "身ぶり",
  "手ぶり",
  "大ぶり",
  "小ぶり",
  "素ぶり",
  "そぶり",
  "羽ぶり",
]);
const naAdjectives = new Set(
  vocabulary
    .filter((entry) => entry.pos?.includes("adj-na"))
    .map((entry) => entry.word),
);

// ところを / ところに "just when" needs a predicate that rescues, catches or
// interrupts: 危ないところを助かった, 出かけるところに電話がかかってきた.
const momentPredicates: Record<string, Set<string>> = {
  を: new Set([
    "助かる",
    "助ける",
    "救う",
    "見る",
    "見つかる",
    "見られる",
    "見つける",
    "捕まる",
    "邪魔する",
  ]),
  に: new Set([
    "来る",
    "くる",
    "やって来る",
    "現れる",
    "かかる",
    "帰る",
    "訪ねる",
    "入る",
  ]),
  へ: new Set([
    "来る",
    "くる",
    "やって来る",
    "現れる",
    "かかる",
    "帰る",
    "訪ねる",
    "入る",
  ]),
};

// These rules require positioned words and neighboring grammatical roles.
// They never search across punctuation or infer a word from an internal suffix.
export function structuralGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const { text, matches, span, add, longest } = grammarMatcher(sentence, base);
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
    // The tokenizer often splits an い-adjective's negative (よく + ない). A
    // verb's たく + ない is "not want to", and まったく is an adverb.
    if (
      word.japanese.endsWith("く") &&
      !word.wordTypes.includes("Verb") &&
      (word.wordTypes.includes("い-adjective") ||
        word.dictionaryForm?.slice(0, -1) + "く" === word.japanese) &&
      following
    )
      longest(
        word.start,
        negativeEndings.map((ending) => word.japanese + ending),
        "ku-nai-katta-ku-nakatta",
      );
    // このような / どのように: "like this", "in what way". うそのようだ is
    // 嘘 + のようだ split as う + その, so only ような / ように qualify.
    if (
      ["この", "その", "あの", "どの"].includes(word.japanese) &&
      next?.japanese === "よう" &&
      following
    )
      longest(
        word.start,
        ["ような", "ように"].map((ending) => word.japanese + ending),
        "you-na-you-ni-like",
      );
    // The tokenizer keeps すべき / するべき apart from a する noun
    // (利用 + すべきだ), and gives the classical す as the lemma, so the verb
    // rule never sees these.
    if (
      word.dictionaryForm === "する" &&
      /^(?:す|する)べき/u.test(word.japanese)
    )
      longest(
        word.start,
        ["す", "する"].flatMap((stem) =>
          bekiEndings.map((ending) => stem + ending),
        ),
        "beki-da-beki-de-wa-nai",
      );
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
    // The tokenizer splits では + ない, so the standalone ではない form never
    // appears as one word. の covers explanatory のではない.
    if (
      ["では", "じゃ"].includes(word.japanese) &&
      previous &&
      (nominal(previous) ||
        previous.wordTypes.includes("な-adjective") ||
        previous.japanese === "の")
    )
      longest(
        word.start,
        negativeEndings.map((ending) => word.japanese + ending),
        "de-wa-arimasen-ja-nai",
      );
    // Written Japanese also negates the copula as でない (遊びばかりでない,
    // 自由でない時代), and requires a state with でなければならない. The
    // form must end at a word boundary, so で + 泣いて (木の上でないていた)
    // and 出ない never match.
    if (
      word.japanese === "で" &&
      word.wordTypes.includes("Particle") &&
      (nominal(previous) ||
        previous.wordTypes.includes("な-adjective") ||
        previous.japanese === "ばかり")
    ) {
      longest(
        word.start,
        ["でない", "でなかった", "でなく"],
        "de-wa-arimasen-ja-nai",
      );
      longest(
        word.start,
        [
          "でなければならない",
          "でなければいけない",
          "でなくてはならない",
          "でなくてはいけない",
        ],
        "nakereba-naranai-nakute-wa-ikenai",
      );
    }
    // でもない is the same copula negative with も: 善でも悪でもない
    // (neither ... nor), そうでもない. After どんな, でも means "any"
    // (どんなベッドでもないよりはよい: any bed is better than none).
    if (
      word.japanese === "でも" &&
      (nominal(previous) || previous.wordTypes.includes("な-adjective")) &&
      !/どんな[^、。！？!?]*$/u.test(text.slice(0, word.start))
    )
      longest(
        word.start,
        negativeEndings.map((ending) => word.japanese + ending),
        "de-wa-arimasen-ja-nai",
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
      // 同じくらい: about the same.
      (amount.test(previous.japanese) || previous.japanese === "同じ")
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
    // A range in time or space: 夏から秋にかけて. にかけては "when it comes
    // to" is a different lesson.
    if (
      word.japanese === "に" &&
      nominal(previous) &&
      following &&
      next.japanese === "かけて" &&
      !text.startsWith("は", next.end)
    ) {
      const clause = text
        .slice(0, previous.start)
        .match(/[^。！？?!、,]*$/u)![0];
      const from = base.findLast(
        (part) =>
          part.japanese === "から" &&
          part.wordTypes.includes("Particle") &&
          part.start >= previous.start - clause.length &&
          nominal(base[base.indexOf(part) - 1]),
      );
      if (from) add(word.start, "にかけて", "kara-ni-kakete");
    }
    // A slight tendency: 風邪気味. 気味が悪い "creepy" has no noun before it.
    if (
      word.japanese === "気味" &&
      (nominal(previous) || previous.wordTypes.includes("Verb"))
    )
      add(previous.start, previous.japanese + "気味", "gimi");
    // Casual って: hearsay after んだ / のだ (とられるんだって), a quotation
    // before a verb of saying or thinking, or a topic after a noun
    // (あなたって素直じゃない). After a past verb it may instead be
    // concessive 〜たって, which the verb rules handle.
    if (word.japanese === "って" && word.wordTypes.includes("Particle")) {
      const after = text.slice(word.end);
      const hearsay =
        previous.japanese === "だ" &&
        ["ん", "の"].includes(base[index - 2]?.japanese ?? "") &&
        /^(?:[。！？?!」』]|[ねよ]|$)/u.test(after);
      const quotation =
        following &&
        next.wordTypes.includes("Verb") &&
        /^(?:言|い[うっいわ]|聞|思|書)/u.test(next.japanese);
      const topic =
        nominal(previous) &&
        following &&
        !next.wordTypes.includes("Verb") &&
        !after.startsWith("ば");
      if (hearsay || quotation || topic) add(word.start, "って", "tte");
    }
    if (word.japanese === "ぶり" && period.test(previous.japanese))
      add(previous.start, previous.japanese + "ぶり", "buri");
    // 〜も〜ば〜も: AもあればBもある, AもなければBもない.
    if (
      word.japanese === "も" &&
      word.wordTypes.includes("Particle") &&
      following &&
      ["あれば", "有れば", "いれば", "なければ"].includes(next.japanese)
    ) {
      const clause = text.slice(next.end).match(/^[^。！？?!]*/u)![0];
      if (
        base.some(
          (part) =>
            part.japanese === "も" &&
            part.wordTypes.includes("Particle") &&
            part.start > next.end &&
            part.end <= next.end + clause.length,
        )
      )
        add(word.start, "も" + next.japanese, "mo-ba-mo");
    }
    if (
      ["ところ", "所"].includes(word.japanese) &&
      finite(previous) &&
      following &&
      Object.hasOwn(momentPredicates, next.japanese)
    ) {
      const clause = text.slice(next.end).match(/^[^。！？?!]*/u)![0];
      const predicate = base.find(
        (part) =>
          part.start >= next.end &&
          part.end <= next.end + clause.length &&
          part.wordTypes.includes("Verb"),
      );
      if (predicate && momentPredicates[next.japanese]!.has(lemma(predicate)))
        add(
          word.start,
          word.japanese + next.japanese,
          "tokoro-ni-tokoro-e-tokoro-o",
        );
    }
  }
  for (const [index, word] of base.entries()) {
    const previous = base[index - 1];
    if (
      word.wordTypes.includes("Noun") &&
      word.japanese.endsWith("ぶり") &&
      !lexicalBuri.has(word.japanese)
    )
      add(word.start, word.japanese, "buri");
    // Noun + 上 "in terms of" (仕事上の, 法律上), not a lexical word
    // (以上, 年上).
    if (
      word.wordTypes.includes("Noun") &&
      word.japanese.length >= 3 &&
      word.japanese.endsWith("上") &&
      word.kana.endsWith("じょう") &&
      // Before a place particle it is "on" a surface (地球上に, 路上で).
      !/^[にでをへ]/u.test(text.slice(word.end))
    )
      add(word.start, word.japanese, "jou");
    // Seeming: 得意げ, にくらしげ.
    if (
      word.japanese.endsWith("げ") &&
      ((word.wordTypes.includes("い-adjective") &&
        lemma(word).slice(0, -1) + "げ" === word.japanese) ||
        (word.wordTypes.includes("な-adjective") &&
          naAdjectives.has(word.japanese.slice(0, -1))))
    )
      add(word.start, word.japanese, "ge");
    // それっきり, 二人きり.
    if (
      ["きり", "っきり"].includes(word.japanese) &&
      word.wordTypes.includes("Particle") &&
      previous?.end === word.start &&
      nominal(previous) &&
      !previous.wordTypes.includes("Adverb") &&
      // きりがない "endless" is the noun "limit".
      !/^[がはも]/u.test(text.slice(word.end))
    )
      add(previous.start, previous.japanese + word.japanese, "kiri");
    // すまい is the classical negative will of する (勉強すまい).
    if (word.japanese === "すまい" && word.dictionaryForm === "する")
      add(word.start, word.japanese, "mai");
    // 〜やら〜やら: 風やら雨やら.
    if (
      word.japanese === "やら" &&
      word.wordTypes.includes("Particle") &&
      previous?.end === word.start &&
      (nominal(previous) || finite(previous))
    ) {
      const second = base.find(
        (part) =>
          part.start > word.end &&
          part.japanese === "やら" &&
          part.wordTypes.includes("Particle") &&
          !/[。！？?!]/u.test(text.slice(word.end, part.start)),
      );
      // A list of three starts at the first やら only.
      const earlier = base.some(
        (part) =>
          part.end < word.start &&
          part.japanese === "やら" &&
          part.wordTypes.includes("Particle") &&
          !/[。！？?!]/u.test(text.slice(part.end, word.start)),
      );
      if (second && !earlier) span(word.start, second.end, "yara-yara");
    }
  }
  // っけ after a past or copula form at the end: 何だっけ, 言ったっけ.
  for (const found of text.matchAll(
    /(?<=[ただ])っけ(?=[。？?！!」』]|[ねな]|$)/gu,
  ))
    add(found.index, "っけ", "kke");
  return matches;
}
