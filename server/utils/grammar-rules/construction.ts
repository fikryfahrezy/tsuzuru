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
    forms: ["はずがない", "はずがありません", "筈がない", "筈がありません"],
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
    id: "dake-de-naku",
    forms: ["だけでなく", "だけではなく", "だけじゃなく"],
    prefix: "adnominal",
  },
  {
    id: "n-desu-no-desu",
    forms: ["んです", "のです", "んでした", "のでした"],
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
];
