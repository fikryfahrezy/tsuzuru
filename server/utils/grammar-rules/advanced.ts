import type { AnswerEntry } from "../answer-entries";

export interface ConstructionRule {
  id: string;
  forms: string[];
  prefix:
    | "noun"
    | "plain"
    | "adnominal"
    | "action"
    | "finite"
    | "dictionary"
    | "lexical";
}

// These are explicit formations from the lesson library, not an extraction of
// suffixes from its display patterns. Every match still needs word boundaries
// and the specified role of the preceding word.
export const advancedPredicateConstructions: ConstructionRule[] = [
  {
    id: "to-iu-koto-da",
    forms: ["ということだ", "ということです", "という事だ"],
    prefix: "plain",
  },
  { id: "hodo", forms: ["ほど"], prefix: "finite" },
  { id: "kurai-gurai-extent", forms: ["くらい", "ぐらい"], prefix: "finite" },
  { id: "koto-naku", forms: ["ことなく", "事なく"], prefix: "dictionary" },
  { id: "tame-ni", forms: ["ために", "為に"], prefix: "adnominal" },
  { id: "baai-wa", forms: ["場合は", "場合には", "場合"], prefix: "adnominal" },
  {
    id: "wari-ni-wari-ni-wa",
    forms: ["わりに", "わりには", "割に", "割には"],
    prefix: "adnominal",
  },
  { id: "kawari-ni", forms: ["代わりに", "かわりに"], prefix: "adnominal" },
  { id: "nanka-nante", forms: ["なんて"], prefix: "plain" },
  {
    id: "to-sureba-to-shitara",
    forms: ["とすれば", "としたら"],
    prefix: "finite",
  },
  { id: "to-shite-mo", forms: ["としても"], prefix: "finite" },
  { id: "ni-shite-wa", forms: ["にしては"], prefix: "plain" },
  { id: "ni-shite-mo", forms: ["にしても"], prefix: "plain" },
  { id: "to-iu-yori", forms: ["というより", "と言うより"], prefix: "plain" },
  { id: "kuse-ni", forms: ["くせに", "癖に"], prefix: "adnominal" },
  {
    id: "kara-to-itte",
    forms: ["からといって", "からと言って"],
    prefix: "finite",
  },
  {
    id: "toori-ni-doori-ni",
    forms: ["とおりに", "通りに"],
    prefix: "adnominal",
  },
  {
    id: "shika-nai-no-choice",
    forms: [
      "しかない",
      "しかありません",
      "しかなかった",
      "しかありませんでした",
    ],
    prefix: "dictionary",
  },
  {
    id: "ni-suginai",
    forms: ["にすぎない", "に過ぎない", "にすぎません", "に過ぎません"],
    prefix: "plain",
  },
  { id: "dokoro-ka", forms: ["どころか"], prefix: "plain" },
  {
    id: "to-wa-kagiranai",
    forms: ["とは限らない", "とは限りません", "とはかぎらない"],
    prefix: "plain",
  },
  {
    id: "to-iu-mono-da",
    forms: ["というものだ", "というものです", "というものだろう"],
    prefix: "plain",
  },
  { id: "to-itte-mo", forms: ["といっても", "と言っても"], prefix: "plain" },
  {
    id: "osore-ga-aru",
    forms: ["おそれがある", "恐れがある", "おそれがあります", "恐れがあります"],
    prefix: "dictionary",
  },
  { id: "sei-ka", forms: ["せいか", "所為か"], prefix: "adnominal" },
  { id: "bakari-ka", forms: ["ばかりか"], prefix: "adnominal" },
  {
    id: "ni-mo-hodo-ga-aru",
    forms: ["にもほどがある", "にも程がある", "にもほどがあります"],
    prefix: "plain",
  },
];

export const advancedNounConstructions: ConstructionRule[] = [
  { id: "koso", forms: ["こそ"], prefix: "noun" },
  { id: "sae", forms: ["さえ", "でさえ", "にさえ"], prefix: "noun" },
  { id: "nari-ni-nari-no", forms: ["なりに", "なりの"], prefix: "noun" },
  { id: "nanka-nante", forms: ["なんか"], prefix: "noun" },
  { id: "ni-shitagatte", forms: ["に従って", "にしたがって"], prefix: "plain" },
  { id: "to-iu-no-wa", forms: ["というのは"], prefix: "plain" },
  { id: "darake", forms: ["だらけ"], prefix: "noun" },
  {
    id: "ni-motozuite",
    forms: ["に基づいて", "に基づく", "に基づいた", "にもとづいて"],
    prefix: "noun",
  },
  {
    id: "ni-watatte",
    forms: ["にわたって", "にわたる", "にわたった", "に渡って", "に渡る"],
    prefix: "noun",
  },
  { id: "ni-sotte", forms: ["に沿って", "に沿う", "に沿った"], prefix: "noun" },
  { id: "ni-kakete-wa", forms: ["にかけては"], prefix: "noun" },
  {
    id: "ni-sakidatte",
    forms: ["に先立って", "に先立ち", "に先立つ"],
    prefix: "noun",
  },
  {
    id: "ni-mo-kakawarazu",
    forms: ["にもかかわらず", "にも拘わらず", "にも関わらず"],
    prefix: "plain",
  },
  { id: "ni-kakawaru", forms: ["にかかわる", "に関わる"], prefix: "noun" },
  { id: "ni-mukete", forms: ["に向けて", "に向けた"], prefix: "noun" },
  {
    id: "wa-tomokaku",
    forms: ["はともかく", "はともかくとして"],
    prefix: "noun",
  },
  { id: "zukume", forms: ["ずくめ"], prefix: "noun" },
  {
    id: "nashi-ni-wa",
    forms: ["なしに", "なしには", "無しに", "無しには"],
    prefix: "noun",
  },
  { id: "ni-mo-mashite", forms: ["にもまして", "にも増して"], prefix: "noun" },
];

const fields = new Set([
  "実験",
  "人生",
  "現代",
  "社会",
  "時代",
  "歴史",
  "世界",
  "教育",
  "政治",
  "経済",
  "研究",
  "科学",
  "分野",
  "点",
  "場合",
  "過程",
  "職場",
  "会議",
  "会合",
]);
const situations = new Set([
  "時代",
  "危機",
  "非常時",
  "現代",
  "逆境",
  "困難",
  "状況",
  "事態",
  "戦時",
  "平時",
  "不況",
  "核時代",
]);
const supervision = new Set([
  "監督",
  "指導",
  "支配",
  "保護",
  "管理",
  "統治",
  "条件",
  "法律",
  "法",
  "制度",
  "方針",
  "規則",
  "合意",
  "契約",
  "脅迫",
]);
const feelings = new Set([
  "憎しみ",
  "愛",
  "愛情",
  "感謝",
  "真心",
  "心",
  "願い",
  "祈り",
  "思い",
  "想い",
  "気持ち",
  "怒り",
  "敬意",
  "友情",
]);
const media = new Set([
  "インターネット",
  "電話",
  "友人",
  "友達",
  "先生",
  "家族",
  "新聞",
  "テレビ",
  "メディア",
  "書物",
  "経験",
  "体験",
  "活動",
  "制度",
  "銀行制度",
  "代理人",
]);

export function contextualAdvancedRules(
  previous: AnswerEntry,
): ConstructionRule[] {
  const rules: ConstructionRule[] = [];
  if (
    [
      "滅び",
      "死",
      "破滅",
      "結論",
      "段階",
      "状況",
      "結果",
      "境地",
      "事態",
      "解消",
      "閉鎖",
      "廃止",
    ].includes(previous.japanese)
  )
    rules.push({
      id: "ni-itaru-ni-itatte-ni-itatte-wa",
      forms: ["に至る", "に至った", "に至って", "に至っては"],
      prefix: "lexical",
    });
  if (fields.has(previous.japanese))
    rules.push({
      id: "ni-oite-ni-okeru",
      forms: ["において", "における"],
      prefix: "noun",
    });
  if (situations.has(previous.japanese))
    rules.push({
      id: "ni-atte",
      forms: ["にあって", "にあっては", "にあっても"],
      prefix: "noun",
    });
  if (supervision.has(previous.japanese))
    rules.push({
      id: "no-moto-de-no-moto-ni",
      forms: ["のもとで", "のもとに", "の下で", "の下に"],
      prefix: "noun",
    });
  if (feelings.has(previous.japanese))
    rules.push({
      id: "o-komete",
      forms: ["をこめて", "を込めて", "をこめた", "を込めた"],
      prefix: "noun",
    });
  // 通す can mean putting an object through something (糸を通す). Only
  // reviewed communication/experience media receive the "through" lesson.
  if (media.has(previous.japanese))
    rules.push({
      id: "o-tsuujite-o-tooshite",
      forms: ["を通じて", "を通して", "をつうじて", "をとおして"],
      prefix: "noun",
    });
  return rules;
}

export function validAdvancedTail(id: string, tail: string): boolean {
  const sentenceEnd = /^(?:[。！？?!」』]|[よね]|$)/u.test(tail);
  if (id === "mono-ka" && !sentenceEnd) return false;
  if (id === "mono-o" && !sentenceEnd) return false;
  // をおいて(ほかに)〜ない; otherwise おいて is 置いて "put".
  if (
    id === "o-oite" &&
    !/^(?:ほか|他)|^[^。！？?!、]*(?:いない|はない|はいない)/u.test(tail)
  )
    return false;
  // おろかにも "foolishly".
  if (id === "wa-oroka" && /^[になだで]/u.test(tail)) return false;
  // とはいえない "can't be called"; とはいえ "even so" opens a contrast.
  if (id === "to-wa-ie" && /^(?:な|ま)/u.test(tail)) return false;
  // をもっている / をもってくる are 持つ "have, bring".
  if (
    id === "o-motte" &&
    /^(?:い|お|き|く|こ|ま|行|来|帰|出|歩|走)/u.test(tail)
  )
    return false;
  // Concessive ものの opens a contrast; というもののよさ is possessive.
  if (id === "mono-no" && !/^[、,]/u.test(tail)) return false;
  // 困ることになる is a decision or outcome, not a remark.
  if (id === "koto-ni-wa" && !/^(?:[、,]|は)/u.test(tail)) return false;
  if (id === "ni-shiro-ni-seyo" && sentenceEnd) return false;
  // ようではない "doesn't seem" is the appearance lesson.
  if (id === "you-de-wa" && /^(?:ない|ありません)/u.test(tail)) return false;
  // AはもちろんBも: without a later も, もちろん is "of course".
  if (id === "wa-mochiron-wa-motoyori" && !/^[^。！？?!]*も/u.test(tail))
    return false;
  if (id === "ni-shite-wa" && /^(?:いけ|なら|困)/u.test(tail)) return false;
  if (id === "ni-shite-mo" && /^(?:ら|いい|よい|良い|構わ|かまわ)/u.test(tail))
    return false;
  return true;
}
