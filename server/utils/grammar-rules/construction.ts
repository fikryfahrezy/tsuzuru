import {
  advancedPredicateConstructions,
  advancedNounConstructions,
  type ConstructionRule as Rule,
} from "./advanced";

const copulas = [
  "だ",
  "です",
  "だった",
  "でした",
  "ではない",
  "ではありません",
];
export const appearanceForms = [
  "そうだ",
  "そうです",
  "そうだった",
  "そうでした",
  "そうではない",
  "そうではありません",
  "そうな",
];
// Fixed constructions still require the formation recorded by the lesson.
// A surface substring alone cannot establish a noun role or a finite clause.
// A bare の explains only at the end of a sentence, optionally before a
// question か (行くの？, 暮らしていたのか。). Inside one, の nominalizes
// (行くのが好き) or embeds a question (何をしたのか分からない). As with のですか,
// か keeps its own lesson. `matched` is the matched text.
export function explanatoryTail(id: string, matched: string, tail: string) {
  if (id !== "n-desu-no-desu" || !matched.endsWith("の")) return true;
  return /^(?:よね|よ|ね|かな|かしら|か)?(?:[。．？?！!」』）)]|$)/u.test(tail);
}

export const predicateConstructions: Rule[] = [
  ...advancedPredicateConstructions,
  { id: "sou-da-hearsay", forms: ["そうだ", "そうです"], prefix: "finite" },
  {
    id: "rashii",
    forms: ["らしい", "らしいです", "らしかった", "らしくない"],
    prefix: "finite",
  },
  {
    id: "you-da",
    forms: ["ようだ", "ようです", "ようだった", "ようでした"],
    prefix: "adnominal",
  },
  {
    id: "mitai",
    forms: ["みたい", "みたいだ", "みたいです", "みたいだった"],
    prefix: "finite",
  },
  { id: "uchi-ni", forms: ["うちに", "内に"], prefix: "adnominal" },
  { id: "tabi-ni", forms: ["たびに", "度に"], prefix: "adnominal" },
  { id: "okage-de", forms: ["おかげで", "お陰で"], prefix: "adnominal" },
  { id: "sei-de", forms: ["せいで", "所為で"], prefix: "adnominal" },
  { id: "saichuu-ni", forms: ["最中に", "さいちゅうに"], prefix: "adnominal" },
  { id: "darou", forms: ["だろう"], prefix: "plain" },
  {
    id: "ni-chigai-nai",
    forms: [
      "に違いない",
      "に違いありません",
      "にちがいない",
      "にちがいありません",
    ],
    prefix: "plain",
  },
  {
    id: "hazu-da",
    forms: ["はず", "筈"].flatMap((word) =>
      copulas.map((ending) => word + ending),
    ),
    prefix: "adnominal",
  },
  {
    id: "hazu-ga-nai",
    forms: ["はず", "筈"].flatMap((word) =>
      // はずない drops the particle in speech.
      [
        "がない",
        "がありません",
        "はない",
        "はありません",
        "ない",
        "ありません",
      ].map((ending) => word + ending),
    ),
    prefix: "adnominal",
  },
  {
    id: "wake-de-wa-nai",
    forms: ["わけ", "訳"].flatMap((word) =>
      ["ではない", "ではありません", "じゃない", "じゃありません"].map(
        (ending) => word + ending,
      ),
    ),
    prefix: "adnominal",
  },
  {
    id: "wake-da",
    forms: ["わけ", "訳"].flatMap((word) =>
      ["だ", "です", "だった", "でした"].map((ending) => word + ending),
    ),
    prefix: "adnominal",
  },
  {
    id: "wake-ga-nai",
    forms: ["わけ", "訳"].flatMap((word) =>
      ["がない", "がありません", "はない", "はありません"].map(
        (ending) => word + ending,
      ),
    ),
    prefix: "adnominal",
  },
  {
    id: "ni-kimatte-iru",
    forms: ["に決まって", "にきまって"].flatMap((word) =>
      ["いる", "います", "る", "いた"].map((ending) => word + ending),
    ),
    prefix: "plain",
  },
  {
    id: "bakari-de-naku",
    forms: ["ばかりでなく", "ばかりではなく", "ばかりじゃなく"],
    prefix: "plain",
  },
  {
    id: "ki-ga-suru",
    forms: ["する", "します", "した", "しました", "している", "しています"].map(
      (ending) => "気が" + ending,
    ),
    prefix: "finite",
  },
  {
    id: "furi-o-suru",
    forms: ["ふり", "振り"].flatMap((word) =>
      [
        "をする",
        "をします",
        "をした",
        "をしました",
        "をしている",
        "をしていた",
        "をして",
      ].map((ending) => word + ending),
    ),
    prefix: "adnominal",
  },
  { id: "ippou-de", forms: ["一方で"], prefix: "adnominal" },
  {
    id: "dake-de-naku",
    forms: ["だけでなく", "だけではなく", "だけじゃなく"],
    prefix: "adnominal",
  },
  {
    id: "n-desu-no-desu",
    // Plain forms (生きているんだ) explain just like the polite ones.
    forms: [
      "んです",
      "のです",
      "んでした",
      "のでした",
      "んだ",
      "のだ",
      "んだろう",
      "のだろう",
      "んでしょう",
      "のでしょう",
      // いいんじゃない (isn't it?), 食べるんじゃなかった (shouldn't have).
      "んじゃない",
      "んじゃなかった",
      // Only at the end of a sentence; see explanatoryTail.
      "の",
    ],
    prefix: "adnominal",
  },
  {
    id: "koto-ni-shite-iru",
    forms: [
      "ことにしている",
      "ことにしています",
      "ことにしていた",
      "ことにしていました",
    ],
    prefix: "action",
  },
  {
    id: "koto-ni-natte-iru",
    forms: [
      "ことになっている",
      "ことになっています",
      "ことになっていた",
      "ことになっていました",
    ],
    prefix: "action",
  },
];
export const nounConstructions: Rule[] = [
  ...advancedNounConstructions,
  { id: "goto-ni", forms: ["ごとに", "毎に"], prefix: "noun" },
  {
    id: "ni-yotte-ni-yoru",
    forms: ["によって", "により", "による"],
    prefix: "noun",
  },
  {
    id: "ni-yoru-to-ni-yoreba",
    forms: ["によると", "によれば"],
    prefix: "noun",
  },
  {
    id: "ni-taishite",
    forms: ["に対して", "に対する", "にたいして", "にたいする"],
    prefix: "noun",
  },
  { id: "ni-totte", forms: ["にとって"], prefix: "noun" },
  {
    id: "ni-kanshite-ni-kansuru",
    forms: ["に関して", "に関する"],
    prefix: "noun",
  },
  { id: "to-tomo-ni", forms: ["とともに", "と共に"], prefix: "plain" },
  { id: "ni-tsurete", forms: ["につれて"], prefix: "plain" },
  { id: "to-shite", forms: ["として"], prefix: "noun" },
  {
    id: "ni-kurabete",
    forms: ["に", "と"].flatMap((particle) =>
      ["比べ", "くらべ"].flatMap((verb) =>
        ["て", "", "ると", "れば"].map((ending) => particle + verb + ending),
      ),
    ),
    prefix: "noun",
  },
  // Kana かわって may also be 変わって "change"; see construction-grammar.ts.
  {
    id: "ni-kawatte",
    forms: ["に代わって", "に代わり", "に代わる"],
    prefix: "noun",
  },
];
