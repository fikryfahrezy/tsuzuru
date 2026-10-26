import type { GrammarAnnotation } from "../../shared/answer-entries";
import type { Sentence } from "../../shared/sentence";
import type { AnswerEntry } from "./answer-entries";
import { finite, humans, nominal } from "./grammar-context";
import { verbForms } from "./verb-forms";
import { referenceLexemes } from "./reference-lexemes";
import {
  contextualAdvancedRules,
  validAdvancedTail,
} from "./grammar-rules/advanced";
import {
  predicateConstructions,
  nounConstructions,
  explanatoryTail,
} from "./grammar-rules/construction";

const topics = new Set([
  "戦争",
  "平和",
  "問題",
  "事件",
  "事故",
  "計画",
  "結果",
  "意見",
  "文化",
  "歴史",
  "政治",
  "経済",
  "教育",
  "研究",
  "科学",
  "文学",
  "人生",
  "将来",
  "情報",
  "事実",
  "環境",
  "天気",
  "健康",
  "病気",
  "状況",
]);
const places =
  /(?:駅|学校|大学|病院|空港|公園|神社|寺|市|県|町|村|家|店|会社|図書館|ホテル|ここ|そこ|あそこ|どこ)$/u;
const viewpoints = new Set([
  "私",
  "わたし",
  "僕",
  "俺",
  "あなた",
  "君",
  "彼",
  "彼女",
  "私たち",
  "我々",
  "みんな",
  "人々",
  "父",
  "母",
  "子供",
  "子ども",
  "家族",
  "先生",
  "学生",
  "初心者",
  "専門家",
  "日本",
  "世界",
  "社会",
  "会社",
  "企業",
]);
const sources = new Set([
  "新聞",
  "報道",
  "ニュース",
  "天気予報",
  "予報",
  "話",
  "うわさ",
  "噂",
  "情報",
  "説明",
  "調査",
  "研究",
  "統計",
  "計算",
  "記録",
  "報告",
  "発表",
]);

// 月の末 is "the end of the month", not "after a long process".
const periods = new Set([
  "月",
  "年",
  "週",
  "今月",
  "来月",
  "先月",
  "今年",
  "去年",
  "来年",
  "世紀",
  "学期",
  "年度",
]);
// にあたって marks an occasion (出発するにあたって, 開店にあたり); after
// other nouns 当たる is "hit" (雨に当たって).
const occasions = new Set([
  "とき",
  "時",
  "際",
  "開始",
  "開店",
  "開会",
  "出発",
  "卒業",
  "入学",
  "就職",
  "結婚",
  "新年",
  "年頭",
  "契約",
  "実施",
]);
// Feelings that introduce a remark with ことに(は): 残念なことに.
const remarks = new Set([
  "驚く",
  "残念",
  "嬉しい",
  "うれしい",
  "悲しい",
  "困る",
  "不思議",
  "幸い",
  "面白い",
  "意外",
  "感心",
]);

export function constructionGrammar(
  sentence: Sentence,
  base: AnswerEntry[],
): GrammarAnnotation[] {
  const text = sentence.reference.japanese;
  const lexemes = referenceLexemes(sentence);
  const ends = new Set(base.map((entry) => entry.end));
  const matches: GrammarAnnotation[] = [];
  for (const [index, entry] of base.entries()) {
    const previous = base[index - 1];
    if (!previous || previous.end !== entry.start) continue;
    const owner = base[index - 2];
    const nominalPrevious =
      nominal(previous) ||
      (previous.wordTypes.length === 0 &&
        owner?.japanese === "の" &&
        owner.end === previous.start &&
        nominal(base[index - 3]));
    const linkedNoun =
      previous.japanese === "の" &&
      owner?.end === previous.start &&
      nominal(owner);
    const linkedAdjective =
      previous.japanese === "な" &&
      owner?.end === previous.start &&
      (owner.wordTypes.includes("な-adjective") || nominal(owner));
    const adnominal =
      finite(previous) ||
      linkedNoun ||
      linkedAdjective ||
      (entry.japanese === "代わり" &&
        ["この", "その"].includes(previous.japanese));
    const plain =
      nominalPrevious ||
      finite(previous) ||
      previous.wordTypes.includes("な-adjective");
    const action =
      previous.wordTypes.includes("Verb") &&
      (previous.japanese === (previous.dictionaryForm ?? previous.japanese) ||
        previous.japanese.endsWith("ない")) &&
      finite(previous);
    const dictionary =
      previous.wordTypes.includes("Verb") &&
      previous.japanese === (previous.dictionaryForm ?? previous.japanese);
    const rules = [
      ...nounConstructions,
      ...predicateConstructions,
      ...contextualAdvancedRules(previous),
    ];
    if (linkedNoun)
      rules.push({
        id: "you-na-you-ni-like",
        forms: ["ような", "ように"],
        prefix: "adnominal",
      });
    if (finite(previous))
      rules.push({
        id: "you-na-you-ni-like",
        forms: ["ような"],
        prefix: "finite",
      });
    if (
      nominalPrevious &&
      /いかにも[^。！？?!、,「」『』]*$/u.test(text.slice(0, previous.start))
    )
      rules.push({
        id: "rashii-typical-of",
        forms: ["らしい", "らしいです", "らしかった"],
        prefix: "noun",
      });
    if (
      ["買い物", "買物", "散歩", "外出", "用事", "旅行", "仕事"].includes(
        previous.japanese,
      )
    )
      rules.push({ id: "tsuide-ni", forms: ["ついでに"], prefix: "noun" });
    // Kana かわって is "in place of" only after a person; otherwise it may be
    // 変わって "change into".
    if (humans.has(previous.japanese))
      rules.push({
        id: "ni-kawatte",
        forms: ["にかわって", "にかわり"],
        prefix: "noun",
      });
    // について shares a spelling with arriving / taking a position. Only
    // recognized topics qualify; places and unknown noun readings need review.
    if (dictionary || (occasions.has(previous.japanese) && nominal(previous)))
      rules.push({
        id: "ni-atatte",
        forms: [
          "にあたって",
          "に当たって",
          "にあたり",
          "に当たり",
          "にあたっては",
          "に当たっては",
        ],
        prefix: "lexical",
      });
    if (humans.has(previous.japanese))
      rules.push({
        id: "ni-sureba-ni-shitara",
        forms: ["にすれば", "にしたら", "にしてみれば", "にしてみたら"],
        prefix: "noun",
      });
    // 彼のことだから: knowing what someone is like.
    if (linkedNoun)
      rules.push({
        id: "koto-dakara",
        forms: ["ことだから", "ことですから"],
        prefix: "adnominal",
      });
    if (
      remarks.has(previous.dictionaryForm ?? previous.japanese) ||
      (previous.japanese === "な" &&
        remarks.has(owner?.dictionaryForm ?? owner?.japanese ?? ""))
    )
      rules.push({
        id: "koto-ni-wa",
        forms: ["ことに", "ことには"],
        prefix: "lexical",
      });
    if (topics.has(previous.japanese) && nominal(previous))
      rules.push({
        id: "ni-tsuite",
        forms: ["について", "に就いて"],
        prefix: "noun",
      });
    for (const rule of rules) {
      if (
        ["to-sureba-to-shitara", "to-shite-mo"].includes(rule.id) &&
        previous.wordTypes.includes("Verb") &&
        verbForms(
          previous.dictionaryForm ?? previous.japanese,
          lexemes.find(
            (word) =>
              word.japanese === previous.japanese &&
              word.reading === previous.kana,
          )?.verbClass,
        ).some((form) => form.volitional === previous.japanese)
      )
        continue;
      if (
        !(rule.prefix === "noun"
          ? nominalPrevious
          : rule.prefix === "lexical"
            ? true
            : rule.prefix === "plain"
              ? plain
              : rule.prefix === "action"
                ? action
                : rule.prefix === "dictionary"
                  ? dictionary
                  : rule.prefix === "finite"
                    ? finite(previous)
                    : adnominal)
      )
        continue;
      if (
        rule.id === "sou-da-hearsay" &&
        previous.wordTypes.includes("Verb") &&
        /(?:た|だ)$/u.test(previous.japanese)
      )
        continue;
      if (rule.id === "uchi-ni" && linkedNoun) continue;
      if (
        rule.id === "uchi-ni" &&
        previous.wordTypes.includes("Verb") &&
        /(?:た|だ)$/u.test(previous.japanese) &&
        !["いる", "居る"].includes(previous.dictionaryForm ?? "")
      )
        continue;
      if (
        rule.id === "tabi-ni" &&
        !linkedNoun &&
        !(
          previous.wordTypes.includes("Verb") &&
          previous.japanese === (previous.dictionaryForm ?? previous.japanese)
        )
      )
        continue;
      if (
        rule.id === "saichuu-ni" &&
        !linkedNoun &&
        !(
          previous.wordTypes.includes("Verb") &&
          /(?:いる|いた)$/u.test(previous.japanese)
        )
      )
        continue;
      // ことによると is lexical "perhaps", not an information source.
      if (rule.id === "ni-yoru-to-ni-yoreba" && !sources.has(previous.japanese))
        continue;
      if (
        rule.id === "ni-totte" &&
        !viewpoints.has(previous.japanese) &&
        !/(?:人|者|たち|達)$/u.test(previous.japanese)
      )
        continue;
      if (
        rule.id === "to-shite" &&
        previous.wordTypes.some((type) =>
          ["Adverb", "な-adjective"].includes(type),
        )
      )
        continue;
      // A kana よって can also be a literal stop at a place (寄って).
      if (rule.id === "ni-yotte-ni-yoru" && places.test(previous.japanese))
        continue;
      if (rule.id === "ni-tsurete" && !finite(previous)) continue;
      if (rule.id === "kagiri" && previous.japanese.endsWith("ない")) continue;
      if (
        rule.id === "sue-ni" &&
        ((previous.wordTypes.includes("Verb") &&
          !/[ただ]$/u.test(previous.japanese)) ||
          (linkedNoun && periods.has(owner!.japanese)))
      )
        continue;
      // どちらかというと is the idiom "if anything".
      if (
        rule.id === "ka-to-iu-to" &&
        ["どちら", "どっち"].includes(previous.japanese)
      )
        continue;
      // 身にこたえる: "tell on (one's health)".
      if (rule.id === "ni-kotaete" && previous.japanese === "身") continue;
      // 名所を巡る is touring places.
      if (rule.id === "o-megutte" && places.test(previous.japanese)) continue;
      // Explanatory nouns require な, while expectation uses noun + の.
      if (rule.id === "n-desu-no-desu" && linkedNoun) continue;
      const found = rule.forms
        .filter(
          (form) =>
            text.startsWith(form, entry.start) &&
            validAdvancedTail(rule.id, text.slice(entry.start + form.length)) &&
            explanatoryTail(
              rule.id,
              form,
              text.slice(entry.start + form.length),
            ) &&
            ends.has(entry.start + form.length),
        )
        .sort((a, b) => b.length - a.length)[0];
      if (found)
        matches.push({
          start: entry.start,
          end: entry.start + found.length,
          japanese: found,
          grammarIds: [rule.id],
        });
      if (found && rule.id === "you-da") {
        const cue = base
          .slice(0, index)
          .findLast(
            (part) =>
              part.japanese === "まるで" &&
              !/[。！？?!、,「」『』]/u.test(text.slice(part.end, entry.start)),
          );
        if (cue)
          matches.push({
            start: cue.start,
            end: entry.start + found.length,
            japanese: text.slice(cue.start, entry.start + found.length),
            grammarIds: ["marude-you-da"],
          });
      }
    }
  }
  return matches;
}
