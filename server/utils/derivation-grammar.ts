import { grammarMatcher } from "./grammar-matcher";
import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { vocabulary } from "./vocabulary";
import { verbForms } from "./verb-forms";
import { hiragana } from "../../shared/practice";

const stems = new Map<string, Set<string>>();
const nouns = new Map<string, Set<string>>();
const adjectiveNouns = new Map<string, Set<string>>();
const adjectiveStems = new Map<string, Set<string>>();
const activities = new Set<string>();
function record(map: Map<string, Set<string>>, text: string, reading: string) {
  const values = map.get(text) ?? new Set<string>();
  values.add(reading);
  map.set(text, values);
}
for (const word of vocabulary) {
  const reading = hiragana(word.reading);
  const code = word.pos?.find((pos) => /^v(?:1|5|k|s)/u.test(pos));
  const kanaForms = verbForms(reading, code);
  for (const [index, forms] of verbForms(word.word, code).entries()) {
    const kana = kanaForms[index]?.stem;
    if (kana) {
      record(stems, forms.stem, kana);
      record(stems, kana, kana);
    }
  }
  if (word.pos?.some((pos) => /^(?:n|pn)(?:-|$)/u.test(pos))) {
    record(nouns, word.word, reading);
    record(nouns, reading, reading);
  }
  if (word.pos?.some((pos) => pos.startsWith("vs"))) {
    activities.add(word.word);
    activities.add(reading);
  }
  if (
    word.pos?.includes("adj-i") &&
    word.word.endsWith("い") &&
    reading.endsWith("い")
  ) {
    const surface = word.word === "いい" ? "よ" : word.word.slice(0, -1);
    const kana = reading === "いい" ? "よ" : reading.slice(0, -1);
    record(adjectiveStems, surface, kana);
    record(adjectiveStems, kana, kana);
    record(adjectiveNouns, surface + "さ", kana + "さ");
    record(adjectiveNouns, kana + "さ", kana + "さ");
  }
}

// Fused tokenizer chips can lack their original lemma. Only recover a
// derivation when both its dictionary stem and supplied reading agree.
export function derivationGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const { text, matches, span: add, reading } = grammarMatcher(sentence, base);
  for (const word of base) {
    // Audience/suitability compounds exclude directional 後ろ向き and lexical
    // 暮らし向き. Keep the audience category explicit when segmentation is fused.
    const audience = word.japanese.match(/^(.+?)(向き|向け)$/u);
    if (
      audience &&
      [
        "新入生",
        "中小企業",
        "子供",
        "子ども",
        "若者",
        "産業",
        "青少年",
        "読者",
        "初心者",
      ].includes(audience[1]!) &&
      /む[きけ]$/u.test(word.kana)
    )
      add(word.start, word.end, "muki-muke");
    // These roots have the reciprocal/repeated-action readings in this bank;
    // compounds such as 似合う and 見直す (reassess someone's worth) need context.
    for (const [root, suffix, id] of [
      ["愛し", "合", "au"],
      ["語り", "合", "au"],
      ["話し", "合", "au"],
      ["交わし", "合", "au"],
      ["通じ", "合", "au"],
      ["書き", "直", "naosu"],
      ["出", "直", "naosu"],
    ] as const) {
      const pattern =
        suffix === "合"
          ? /^(?:う|い(?:ます|ました|たい)?|った|って|わない|いましょう)$/u
          : /^(?:す|し(?:ます|ました|ましょう)?|した|して|さない)$/u;
      if (
        word.wordTypes.includes("Verb") &&
        word.japanese.startsWith(root + suffix) &&
        pattern.test(word.japanese.slice(root.length + suffix.length))
      )
        add(word.start, word.end, id);
    }
    // Some continuative chips (洗い, 掃き) have no tokenizer lemma.
    if (stems.get(word.japanese)?.has(word.kana)) {
      const form = word.japanese + "さえすれば";
      if (text.startsWith(form, word.start))
        add(word.start, word.start + form.length, "sae-ba");
      for (const tail of [
        "かねる",
        "かねます",
        "かねた",
        "かねました",
        "かねて",
      ]) {
        const end = word.end + tail.length;
        if (
          text.startsWith(tail, word.end) &&
          reading(word.start, end) === word.kana + tail
        )
          add(word.start, end, "kaneru");
      }
    }
    if (
      word.japanese.endsWith("なり") &&
      !["かなり", "身なり", "鈴なり", "山なり", "言いなり"].includes(
        word.japanese,
      )
    ) {
      const head = word.japanese.slice(0, -2);
      const pronouns: Record<string, string> = {
        彼ら: "かれら",
        私: "わたし",
        彼: "かれ",
        彼女: "かのじょ",
        自分: "じぶん",
        それ: "それ",
        あなた: "あなた",
      };
      const roots = [
        ...(nouns.get(head) ?? []),
        ...(pronouns[head] ? [pronouns[head]!] : []),
      ];
      for (const particle of ["の", "に"]) {
        const end = word.end + 1;
        if (
          text[word.end] === particle &&
          roots.some(
            (kana) => reading(word.start, end) === kana + "なり" + particle,
          )
        )
          add(word.start, end, "nari-ni-nari-no");
      }
    }
    const headRashii = word.japanese.match(/^(.+?)らしい(?:です)?$/u)?.[1];
    if (headRashii) {
      const typicalCue = /いかにも[^。！？?!、,「」『』]*$/u.test(
        text.slice(0, word.start),
      );
      const qualityAttribute = base.some(
        (part) =>
          part.start === word.end &&
          ["ところ", "態度", "行動", "振る舞い", "感じ"].includes(
            part.japanese,
          ),
      );
      if (
        (typicalCue &&
          /^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(headRashii)) ||
        (qualityAttribute &&
          [...(nouns.get(headRashii) ?? [])].some((kana) =>
            word.kana.startsWith(kana + "らしい"),
          ))
      )
        add(word.start, word.end, "rashii-typical-of");
    }
    if (adjectiveNouns.get(word.japanese)?.has(word.kana))
      add(word.start, word.end, "sa");
    if (
      word.japanese.endsWith("なし") &&
      !["台なし", "形なし", "底なし"].includes(word.japanese)
    ) {
      const head = word.japanese.slice(0, -2);
      const form = word.japanese + "に";
      const end = word.start + form.length;
      if (
        text.startsWith(form, word.start) &&
        [...(nouns.get(head) ?? [])].some(
          (kana) => reading(word.start, end) === kana + "なしに",
        )
      )
        add(word.start, end, "nashi-ni-wa");
    }
    for (const suffix of ["どおり", "通り"])
      if (word.japanese.endsWith(suffix)) {
        const head = word.japanese.slice(0, -suffix.length);
        const end = word.end + 1;
        if (
          text[word.end] === "に" &&
          [...(nouns.get(head) ?? [])].some(
            (kana) => reading(word.start, end) === kana + "どおりに",
          )
        )
          add(word.start, end, "toori-ni-doori-ni");
      }
    const headSource = text.slice(word.start);
    const ordinalSource = headSource.match(
      /^[0-9０-９一二三四五六七八九十百千]+(?:回|度|人|個|枚|本|冊|杯|台|日|週|月|年|番)目/u,
    )?.[0];
    if (
      ordinalSource &&
      !/^[二三23]枚目$/u.test(ordinalSource.normalize("NFKC"))
    ) {
      const end = word.start + ordinalSource.length;
      if (reading(word.start, end).endsWith("め")) add(word.start, end, "me");
    }
    const method = word.japanese.indexOf("方");
    if (
      method > 0 &&
      word.japanese.endsWith("方") &&
      [...(stems.get(word.japanese.slice(0, method)) ?? [])].some(
        (kana) => word.kana === kana + "かた",
      )
    )
      add(word.start, word.end, "kata");
    if (word.japanese.endsWith("中")) {
      const head = word.japanese.slice(0, -1);
      const during = activities.has(head) && word.kana.endsWith("ちゅう");
      const throughout =
        word.kana.endsWith("じゅう") &&
        (/^(?:[0-9０-９一二三四五六七八九十]+)?(?:年|日|月|晩|週|夏|冬|春|秋)$/u.test(
          head,
        ) ||
          ["世界", "日本", "国", "町", "街", "家", "部屋", "学校"].includes(
            head,
          ));
      if (
        during ||
        throughout ||
        (["午前", "午後"].includes(head) && word.kana.endsWith("ちゅう"))
      )
        add(word.start, word.end, "chuu-juu");
    }
    const ppoi = headSource.match(
      /^(.+?)っぽ(?:い|くない|かった|くなかった)(?:です)?/u,
    );
    const teki = headSource.match(/^(.+?)的(?:な|に)/u);
    if (teki && !["目", "標", "射"].includes(teki[1]!)) {
      const end = word.start + teki[0].length;
      const suffix = teki[0].at(-1)!;
      if (
        [...(nouns.get(teki[1]!) ?? [])].some(
          (kana) => reading(word.start, end) === kana + "てき" + suffix,
        )
      )
        add(word.start, end, "teki");
    }
    if (ppoi) {
      const head = ppoi[1]!;
      const end = word.start + ppoi[0].length;
      const suffix = ppoi[0].slice(head.length);
      if (
        [...(nouns.get(head) ?? []), ...(adjectiveStems.get(head) ?? [])].some(
          (kana) => reading(word.start, end) === kana + suffix,
        )
      )
        add(word.start, end, "ppoi");
    }
    const emotions = [
      "嫌",
      "怖",
      "恐",
      "痛",
      "悲し",
      "寂し",
      "さびし",
      "恥ずかし",
      "嬉し",
      "うれし",
      "面白",
      "おもしろ",
      "不思議",
    ];
    for (const root of emotions)
      for (const ending of [
        "がる",
        "がります",
        "がった",
        "がりました",
        "がらない",
        "がりません",
        "がって",
      ]) {
        const form = root + ending;
        if (headSource.startsWith(form))
          add(word.start, word.start + form.length, "garu");
      }
    for (const [suffix, id] of [
      ["だらけ", "darake"],
      ["ずくめ", "zukume"],
    ] as const) {
      const offset = word.japanese.indexOf(suffix);
      if (offset <= 0) continue;
      const head = word.japanese.slice(0, offset);
      const headKana = word.kana.slice(0, -suffix.length);
      if (
        (nouns.get(head)?.has(headKana) ||
          /^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(head)) &&
        word.japanese.endsWith(suffix)
      )
        add(word.start, word.end, id);
    }
    const marker = word.japanese.indexOf("っこ");
    if (marker > 0) {
      const head = word.japanese.slice(0, marker);
      for (const ending of ["っこない", "っこありません"]) {
        const end = word.start + head.length + ending.length;
        if (
          text.startsWith(head + ending, word.start) &&
          [...(stems.get(head) ?? [])].some(
            (kana) => reading(word.start, end) === kana + ending,
          )
        )
          add(word.start, end, "kko-nai");
      }
    }
  }
  return matches;
}
