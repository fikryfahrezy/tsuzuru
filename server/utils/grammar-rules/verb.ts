import type { VerbForms } from "../verb-forms";
import { predicateConstructions, appearanceForms } from "./construction";

// Shared with the split する noun + すべき rule in structural-grammar.ts.
export const bekiEndings = [
  "べき",
  "べきだ",
  "べきです",
  "べきだった",
  "べきでした",
  "べきである",
  "べきでしょう",
  "べきではない",
  "べきではありません",
];

export type ConstructionForm =
  | keyof VerbForms
  | "dictionary"
  | "ta"
  | "conditional"
  | "classical"
  | "beki"
  | "honorificStem"
  | "zu"
  | "passive"
  | "compoundStem";
interface Construction {
  form: ConstructionForm;
  endings: string[];
  id: string;
}

const polite = (forms: string[]) =>
  forms.flatMap((form) => [form, `${form}です`]);

// "Is good / all right", plain or polite, stated or tentative: いい,
// よろしいですか, よいでしょうか.
const fine = [
  ...["いい", "よい", "良い"].flatMap((word) =>
    ["", "です", "でしょう", "だろう"].map((tail) => word + tail),
  ),
  ...["", "です", "でしょう"].map((tail) => "よろしい" + tail),
];
const advice = ["ほう", "方"].flatMap((word) =>
  fine.map((ending) => `${word}が${ending}`),
);
// "Doesn't matter": 構わない, かまいません.
const noMatter = ["構", "かま"].flatMap((word) =>
  ["わない", "わないです", "いません"].map((tail) => word + tail),
);
// Prohibition: てはいけない, てはならない, てはダメだ.
const prohibition = [
  "いけない",
  "いけません",
  "いけなかった",
  "ならない",
  "なりません",
  "ならん",
  "ダメ",
  "だめ",
  "駄目",
].map((auxiliary) => "は" + auxiliary);
const intention = ["つもり", "積もり"].flatMap((word) =>
  [
    "",
    "だ",
    "です",
    "だった",
    "でした",
    "ではない",
    "ではありません",
    "はない",
    "はありません",
  ].map((ending) => word + ending),
);

// Obligation is a negative condition followed by "won't do", in any tense or
// politeness: なければならなかった, なくてはいけません, ならん.
const obligationAuxiliaries = [
  "ならない",
  "ならなかった",
  "なりません",
  "なりませんでした",
  "ならん",
  "いけない",
  "いけなかった",
  "いけません",
  "いけませんでした",
];
const obligation = ["ければ", "くては"].flatMap((condition) =>
  obligationAuxiliaries.map((auxiliary) => condition + auxiliary),
);
// Contracted forms, which may also stand alone: 行かなきゃ.
const casualObligation = [
  ...["くちゃ", "くっちゃ", "きゃ"].flatMap((condition) => [
    condition,
    ...obligationAuxiliaries.map((auxiliary) => condition + auxiliary),
  ]),
  ...["いけない", "いけません", "ダメ", "だめ", "駄目"].map(
    (auxiliary) => "いと" + auxiliary,
  ),
];

// Tense and politeness of an ichidan auxiliary after its root: 始め + る,
// かけ + ました.
const ichidanTails = ["る", "ます", "た", "ました", "ない", "ません", "て"];
// An い-adjective auxiliary after its root: やす + い, づら + くなかった.
const adjectiveTails = [
  "い",
  "いです",
  "くない",
  "くないです",
  "かった",
  "かったです",
  "くなかった",
  "くなかったです",
];
const copulaTails = ["だ", "です", "だった", "でした"];

// Stems whose かける is a lexical compound rather than "half-done": speaking
// or acting toward someone (話しかける, 呼びかける, 微笑みかける), going out
// (出かける), spotting (見かける), setting up (仕掛ける, kana しかける), or
// hanging and leaning (もたせかける).
export const lexicalKakeruStems = new Set([
  "話し",
  "呼び",
  "問い",
  "語り",
  "笑い",
  "微笑み",
  "ほほえみ",
  "働き",
  "投げ",
  "持ち",
  "押し",
  "詰め",
  "追い",
  "追っ",
  "誘い",
  "訴え",
  "見",
  "出",
  "ひっ",
  "引っ",
  "もたせ",
  "立て",
  "振り",
  "仕",
  "し",
  "腰",
]);
// Stems whose 抜く is physical: shooting, pulling or overtaking through
// (撃ち抜く, 引き抜く, 追い抜く), or seeing through (見抜く).
export const lexicalNukuStems = new Set([
  "撃ち",
  "打ち",
  "引き",
  "追い",
  "見",
  "書き",
  "切り",
  "突き",
  "射",
  "刺し",
  "踏み",
  "掘り",
  "くり",
  "繰り",
  "ぶち",
  "引っこ",
]);
// Tense and politeness of a godan く auxiliary after its root: 抜 + いた.
const kuTails = [
  "く",
  "きます",
  "いた",
  "きました",
  "いて",
  "こう",
  "かない",
  "きません",
];

export const constructions: Construction[] = [
  {
    form: "stem",
    endings: [
      "出す",
      "出した",
      "出しました",
      "出します",
      "出して",
      "だす",
      "だした",
      "だしました",
      "だして",
    ],
    id: "dasu",
  },
  { form: "conditional", endings: ["ば"], id: "ba-hodo" },
  {
    form: "classical",
    endings: ["得", "え"].flatMap((verb) =>
      [
        "ない",
        "なかった",
        "ません",
        "ませんでした",
        "なくなる",
        "なくなった",
        "ないだろう",
        "ないでしょう",
      ].map((tail) => `ざるを${verb}${tail}`),
    ),
    id: "zaru-o-enai",
  },
  {
    form: "classical",
    endings: ["んばかり", "んばかりだ", "んばかりだった", "んばかりの"],
    id: "n-bakari",
  },
  { form: "beki", endings: bekiEndings, id: "beki-da-beki-de-wa-nai" },
  {
    form: "dictionary",
    endings: ["までもない", "までもありません"],
    id: "made-mo-nai",
  },
  {
    form: "stem",
    endings: ["かねない", "かねません", "かねなかった"],
    id: "kanenai",
  },
  { form: "stem", endings: ["さえすれば"], id: "sae-ba" },
  { form: "stem", endings: ["がち", "がちだ", "がちです"], id: "gachi" },
  { form: "te", endings: ["初めて", "はじめて"], id: "te-hajimete" },
  { form: "te", endings: ["さえいれば"], id: "sae-ba" },
  {
    form: "stem",
    endings: ["得る", "得ない", "得なかった", "える", "えない", "えなかった"],
    id: "uru-enai",
  },
  {
    form: "stem",
    endings: ["かねる", "かねます", "かねた", "かねました", "かねて"],
    id: "kaneru",
  },
  {
    form: "stem",
    endings: ["つつある", "つつあります", "つつあった", "つつありました"],
    id: "tsutsu-aru",
  },
  {
    form: "stem",
    endings: ["っぱなし", "っぱなしだ", "っぱなしです", "っぱなしに"],
    id: "ppanashi",
  },
  {
    form: "stem",
    endings: ["ようがない", "ようがありません", "ようもない"],
    id: "you-ga-nai",
  },
  { form: "stem", endings: ["っこない", "っこありません"], id: "kko-nai" },
  {
    form: "stem",
    endings: [
      "切れない",
      "切れません",
      "きれない",
      "きれません",
      "切った",
      "切る",
    ],
    id: "kiru-kirenai",
  },
  {
    form: "te",
    endings: ["ばかりいる", "ばかりいます", "ばかりいた", "ばかりいました"],
    id: "te-bakari-iru",
  },
  {
    form: "conditional",
    endings: [
      "ばいい",
      "ばいいです",
      "ばいいでしょう",
      "ばいいでしょうか",
      "ばよい",
    ],
    id: "ba-ii",
  },
  {
    form: "te",
    endings: ["しかるべきだ", "しかるべきです"],
    id: "te-shikaru-beki-da",
  },
  {
    form: "honorificStem",
    endings: ["になる", "になります", "になった", "になりました"],
    id: "o-ni-naru",
  },
  {
    form: "honorificStem",
    endings: [
      "する",
      "します",
      "した",
      "しました",
      "いたします",
      "いたしました",
    ],
    id: "o-suru",
  },
  { form: "stem", endings: ["ませんか"], id: "masen-ka" },
  { form: "volitional", endings: [""], id: "ou-you" },
  {
    form: "volitional",
    endings: [
      "と思う",
      "と思います",
      "と思った",
      "と思いました",
      "と思っている",
      "と思っています",
    ],
    id: "you-to-omou",
  },
  {
    form: "volitional",
    endings: [
      "とする",
      "とします",
      "とした",
      "としている",
      "としていた",
      "としていたら",
      "としたら",
      "とすれば",
      "としても",
    ],
    id: "you-to-suru",
  },
  { form: "imperative", endings: [""], id: "e-ro" },
  {
    form: "causative",
    endings: ["る", "ます", "た", "ました", "ない", "ません", "て"],
    id: "seru-saseru",
  },
  {
    form: "causative",
    endings: ["てください", "て下さい"],
    id: "sasete-kudasai",
  },
  { form: "dictionary", endings: ["な"], id: "na-prohibition" },
  { form: "stem", endings: ["方", "かた"], id: "kata" },
  {
    form: "stem",
    endings: [
      "たがる",
      "たがります",
      "たがった",
      "たがりました",
      "たがらない",
      "たがりません",
      "たがって",
    ],
    id: "tagaru",
  },
  {
    form: "dictionary",
    endings: [
      "ようにする",
      "ようにします",
      "ようにした",
      "ようにしました",
      "ようにしている",
      "ようにしています",
      "ようにしなさい",
      "ようにしてください",
    ],
    id: "you-ni-suru",
  },
  {
    form: "negative",
    endings: [
      "いようにする",
      "いようにします",
      "いようにした",
      "いようにしています",
    ],
    id: "you-ni-suru",
  },
  {
    form: "dictionary",
    endings: [
      "ようになる",
      "ようになります",
      "ようになった",
      "ようになりました",
      "ようになっている",
      "ようになるだろう",
      "ようになるでしょう",
    ],
    id: "you-ni-naru",
  },
  {
    form: "negative",
    endings: ["いようになる", "いようになった", "いようになりました"],
    id: "you-ni-naru",
  },
  {
    form: "zu",
    endings: ["に", "には"].flatMap((prefix) =>
      [
        "いられない",
        "いられません",
        "いられなかった",
        "いられませんでした",
      ].map((ending) => prefix + ending),
    ),
    id: "zu-ni-wa-irarenai",
  },
  {
    form: "negative",
    endings: ["いではいられない", "いではいられません", "いではいられなかった"],
    id: "zu-ni-wa-irarenai",
  },
  {
    form: "zu",
    endings: [
      "に済む",
      "にすむ",
      "に済みます",
      "にすみます",
      "に済んだ",
      "にすんだ",
      "に済みました",
    ],
    id: "zu-ni-sumu-naide-sumu",
  },
  {
    form: "negative",
    endings: [
      "いで済む",
      "いですむ",
      "いで済みます",
      "いで済んだ",
      "いですんだ",
    ],
    id: "zu-ni-sumu-naide-sumu",
  },
  { form: "stem", endings: appearanceForms, id: "sou-da-appearance" },
  {
    form: "stem",
    endings: [
      "そうにない",
      "そうもない",
      "そうにありません",
      "そうもありません",
    ],
    id: "sou-ni-nai-sou-mo-nai",
  },
  {
    form: "ta",
    endings: ["とたん", "とたんに", "途端", "途端に"],
    id: "ta-totan-ta-totan-ni",
  },
  { form: "zu", endings: ["に"], id: "zu-ni" },
  { form: "negative", endings: ["いで"], id: "naide" },
  {
    form: "stem",
    endings: [
      "すぎる",
      "すぎます",
      "すぎた",
      "すぎました",
      "すぎない",
      "すぎません",
      "すぎて",
      "過ぎる",
      "過ぎます",
      "過ぎた",
      "過ぎました",
      "過ぎて",
    ],
    id: "sugiru",
  },
  {
    form: "stem",
    endings: ["始め", "はじめ", "続け", "つづけ"]
      .flatMap((root) => ichidanTails.map((ending) => root + ending))
      .concat([
        "終わる",
        "終わります",
        "終わった",
        "終わりました",
        "終わらない",
        "終わりません",
        "終わって",
        "おわる",
        "おわった",
        "おわります",
      ]),
    id: "hajimeru-owaru-tsuzukeru",
  },
  ...predicateConstructions.flatMap((rule): Construction[] =>
    (["dictionary", "negative", "ta"] as const)
      .filter((form) => rule.prefix !== "action" || form !== "ta")
      .filter((form) => rule.prefix !== "dictionary" || form === "dictionary")
      .filter((form) => rule.id !== "sou-da-hearsay" || form !== "ta")
      .filter((form) => rule.id !== "uchi-ni" || form !== "ta")
      // ない限り is its own lesson; 末 follows only a た form.
      .filter((form) => rule.id !== "kagiri" || form !== "negative")
      .filter((form) => rule.id !== "sue-ni" || form === "ta")
      .filter(
        (form) =>
          !["tabi-ni", "saichuu-ni"].includes(rule.id) ||
          (rule.id === "tabi-ni" && form === "dictionary"),
      )
      .map((form) => ({
        form,
        endings: rule.forms.map(
          (ending) => (form === "negative" ? "い" : "") + ending,
        ),
        id: rule.id,
      })),
  ),
  { form: "dictionary", endings: ["でしょう"], id: "deshou" },
  { form: "negative", endings: ["いでしょう"], id: "deshou" },
  { form: "dictionary", endings: ["なら"], id: "nara" },
  { form: "negative", endings: ["いなら"], id: "nara" },
  {
    form: "stem",
    endings: [
      "行く",
      "行きます",
      "行った",
      "行きました",
      "行かない",
      "行きません",
      "いく",
      "いきます",
      "いった",
      "いきました",
      "来る",
      "来ます",
      "来た",
      "来ました",
      "くる",
      "きます",
      "きた",
      "きました",
      "帰る",
      "帰ります",
      "帰った",
      "帰りました",
    ].map((ending) => "に" + ending),
    id: "ni-iku",
  },
  {
    form: "te",
    endings: [
      "いく",
      "行く",
      "いきます",
      "行きます",
      "いった",
      "行った",
      "いきました",
      "行きました",
      "いかない",
      "行かない",
      "いきません",
      "行きません",
      "いこう",
      "行こう",
    ],
    id: "te-iku",
  },
  {
    form: "te",
    endings: [
      "くる",
      "来る",
      "きます",
      "来ます",
      "きた",
      "来た",
      "きました",
      "来ました",
      "こない",
      "来ない",
      "きません",
      "来ません",
      "こよう",
      "来よう",
    ],
    id: "te-kuru",
  },
  {
    form: "te",
    endings: [
      "くださる",
      "下さる",
      "くださいます",
      "下さいました",
      "くださいました",
      "くださった",
      "くださって",
      "いただく",
      "頂く",
      "いただきます",
      "頂きます",
      "いただいた",
      "頂いた",
      "いただきました",
      "頂きました",
      "いただいて",
      "頂いて",
    ],
    id: "te-kudasaru-te-itadaku",
  },
  { form: "stem", endings: ["なさい"], id: "nasai" },
  {
    form: "ta",
    endings: [
      "ばかり",
      "ばかりだ",
      "ばかりです",
      "ばかりだった",
      "ばかりでした",
    ],
    id: "ta-bakari",
  },
  {
    form: "conditional",
    endings: ["ばよかった", "ばよかったです", "ば良かった", "ば良かったです"],
    id: "ba-yokatta",
  },
  {
    form: "negative",
    endings: [
      "ければよかった",
      "ければよかったです",
      "ければ良かった",
      "ければ良かったです",
    ],
    id: "ba-yokatta",
  },
  {
    form: "ta",
    endings: [
      "らどう",
      "らどうですか",
      "らどうだろう",
      "らどうだ",
      "らいかがですか",
    ],
    id: "tara-dou",
  },
  ...(["dictionary", "negative"] as const).flatMap((form): Construction[] => {
    const prefix = form === "negative" ? "い" : "";
    return [
      {
        form,
        endings: [
          "する",
          "します",
          "した",
          "しました",
          "しない",
          "しません",
          "しよう",
        ].map((ending) => prefix + "ことに" + ending),
        id: "koto-ni-suru",
      },
      {
        form,
        endings: [
          "なる",
          "なります",
          "なった",
          "なりました",
          "ならない",
          "なりません",
        ].map((ending) => prefix + "ことに" + ending),
        id: "koto-ni-naru",
      },
      {
        form,
        endings: ["ある", "あります", "あった", "ありました"].map(
          (ending) => prefix + "ことが" + ending,
        ),
        id: "koto-ga-aru",
      },
      {
        form,
        endings: ["わけ", "訳"].flatMap((word) =>
          ["いかない", "いきません", "いかなかった", "いきませんでした"].map(
            (ending) => `${prefix}${word}には${ending}`,
          ),
        ),
        id: "wake-ni-wa-ikanai",
      },
    ];
  }),
  {
    form: "dictionary",
    endings: ["予定", "予定だ", "予定です", "予定だった", "予定でした"],
    id: "yotei",
  },
  {
    form: "stem",
    endings: ["やす", "にく"].flatMap((root) =>
      adjectiveTails.map((ending) => root + ending),
    ),
    id: "yasui-nikui",
  },
  {
    form: "stem",
    endings: adjectiveTails.map((ending) => "づら" + ending),
    id: "zurai",
  },
  // Half-done or about to happen: 終わりかけていた, おぼれかけた,
  // 読みかけの本. ている stays inside, as in 開きかけている.
  {
    form: "compoundStem",
    endings: [
      ...ichidanTails,
      "ている",
      "ています",
      "ていた",
      "ていました",
      "の",
    ].map((ending) => "かけ" + ending),
    id: "kakeru",
  },
  {
    form: "dictionary",
    endings: copulaTails.map((ending) => "一方" + ending),
    id: "ippou-da",
  },
  // Concession: 遅れたって, 行かなくたって "even if".
  { form: "ta", endings: ["って"], id: "tatte-datte" },
  { form: "negative", endings: ["くたって"], id: "tatte-datte" },
  // A rule or instruction that ends the sentence: 放置しないこと。
  { form: "dictionary", endings: ["こと"], id: "koto-instruction" },
  { form: "negative", endings: ["いこと"], id: "koto-instruction" },
  {
    form: "negative",
    endings: ["は", "も"].flatMap((particle) =>
      ["ない", "ありません"].map((ending) => `いこと${particle}${ending}`),
    ),
    id: "nai-koto-wa-nai",
  },
  { form: "stem", endings: ["次第"], id: "shidai" },
  { form: "stem", endings: ["つつ", "つつも"], id: "tsutsu-tsutsu-mo" },
  // Doing to the very end: 戦い抜こう, やり抜いた.
  {
    form: "compoundStem",
    endings: ["抜", "ぬ"].flatMap((root) =>
      kuTails.map((ending) => root + ending),
    ),
    id: "nuku",
  },
  {
    form: "stem",
    endings: adjectiveTails.map((ending) => "がた" + ending),
    id: "gatai",
  },
  // Negative resolve or conjecture: 行くまい, 勉強すまい.
  { form: "dictionary", endings: ["まい"], id: "mai" },
  { form: "beki", endings: ["まい"], id: "mai" },
  {
    form: "dictionary",
    endings: copulaTails.map((ending) => "ばかり" + ending),
    id: "bakari-da",
  },
  {
    form: "te",
    endings: ["はいられない", "はいられません", "はいられなかった"],
    id: "te-wa-irarenai",
  },
  // Can't help feeling: 気になってならない.
  {
    form: "te",
    endings: ["ならない", "なりません", "ならなかった"],
    id: "te-naranai",
  },
  { form: "te", endings: ["こそ"], id: "te-koso" },
  {
    form: "te",
    endings: ["からでないと", "からでなければ", "からじゃないと"],
    id: "te-kara-de-nai-to",
  },
  { form: "te", endings: ["以来"], id: "te-irai" },
  {
    form: "ta",
    endings: ["かと思ったら", "かと思うと", "かと思えば"],
    id: "ka-to-omottara-ka-to-omou-to",
  },
  // Only before a comma: たところだ "have just done" is a different lesson.
  { form: "ta", endings: ["ところ"], id: "ta-tokoro" },
  { form: "ta", endings: ["きり", "っきり"], id: "kiri" },
  {
    form: "ta",
    endings: ["あげく", "挙句", "挙げ句"].flatMap((word) => [
      word,
      word + "に",
    ]),
    id: "ageku",
  },
  { form: "negative", endings: ["い限り", "いかぎり"], id: "nai-kagiri" },
  { form: "negative", endings: ["いことには"], id: "nai-koto-ni-wa" },
  {
    form: "volitional",
    endings: ["では", "じゃ"].flatMap((word) =>
      ["ないか", "ありませんか"].map((ending) => word + ending),
    ),
    id: "you-de-wa-nai-ka",
  },
  { form: "stem", endings: ["ようによっては"], id: "you-ni-yotte-wa" },
  { form: "stem", endings: ["がてら"], id: "gatera" },
  {
    form: "dictionary",
    endings: ["が早いか", "がはやいか"],
    id: "ga-hayai-ka",
  },
  { form: "ta", endings: ["ら最後", "が最後"], id: "tara-saigo-ga-saigo" },
  { form: "te", endings: ["からというもの"], id: "te-kara-to-iu-mono" },
  {
    form: "te",
    endings: ["やまない", "やみません", "止まない"],
    id: "te-yamanai",
  },
  {
    form: "dictionary",
    endings: ["ともなると", "ともなれば"],
    id: "tomo-naru-to-tomo-nareba",
  },
  { form: "volitional", endings: ["ものなら"], id: "you-mono-nara" },
  {
    form: "dictionary",
    endings: ["ことなしに", "ことなしには"],
    id: "koto-nashi-ni",
  },
  {
    form: "dictionary",
    endings: ["始末", "しまつ"].flatMap((word) =>
      ["だ", "です", "だった"].map((ending) => word + ending),
    ),
    id: "shimatsu-da",
  },
  {
    form: "zu",
    endings: ["じまい", "じまいだ", "じまいだった", "じまいでした"],
    id: "zu-jimai",
  },
  {
    form: "zu",
    endings: ["にはおかない", "にはおかなかった"],
    id: "zu-ni-wa-okanai-nai-de-wa-okanai",
  },
  {
    form: "negative",
    endings: ["いではおかない"],
    id: "zu-ni-wa-okanai-nai-de-wa-okanai",
  },
  {
    form: "zu",
    endings: ["にはすまない", "には済まない", "にはすまされない"],
    id: "zu-ni-wa-sumanai-nai-de-wa-sumanai",
  },
  {
    form: "negative",
    endings: ["いではすまない", "いでは済まない"],
    id: "zu-ni-wa-sumanai-nai-de-wa-sumanai",
  },
  { form: "dictionary", endings: ["そばから"], id: "soba-kara" },
  { form: "ta", endings: ["そばから"], id: "soba-kara" },
  // 考えるだに "just thinking of it".
  { form: "dictionary", endings: ["だに"], id: "dani" },
  {
    form: "te",
    endings: ["さしつかえ", "差し支え"].flatMap((word) =>
      ["ない", "ありません"].map((ending) => `も${word}${ending}`),
    ),
    id: "te-mo-sashitsukae-nai",
  },
  { form: "negative", endings: ["いまでも"], id: "nai-made-mo" },
  {
    form: "negative",
    endings: ["いものでもない"],
    id: "nai-mono-de-mo-nai",
  },
  {
    form: "dictionary",
    endings: ["に難くない", "にかたくない"],
    id: "ni-kataku-nai",
  },
  { form: "conditional", endings: ["ばこそ"], id: "ba-koso" },
  { form: "negative", endings: ["ければこそ"], id: "ba-koso" },
  {
    form: "conditional",
    endings: ["ばそれまでだ", "ばそれまでです"],
    id: "ba-sore-made-da",
  },
  {
    form: "negative",
    endings: ["ければそれまでだ"],
    id: "ba-sore-made-da",
  },
  {
    form: "beki",
    endings: ["べからず", "べからざる"],
    id: "bekarazu-bekarazaru",
  },
  {
    form: "beki",
    endings: ["べくもない", "べくもありません"],
    id: "beku-mo-nai",
  },
  { form: "beki", endings: ["べくして"], id: "beku-shite" },
  { form: "beki", endings: ["べく"], id: "beku" },
  { form: "dictionary", endings: ["まじき"], id: "majiki" },
  {
    form: "dictionary",
    endings: ["までだ", "までです", "までのことだ"],
    id: "made-da-made-no-koto-da",
  },
  {
    form: "ta",
    endings: ["までだ", "までです", "までのことだ"],
    id: "made-da-made-no-koto-da",
  },
  // As soon as: 見るなり. それなり / 彼らなりの are a different lesson.
  { form: "dictionary", endings: ["なり"], id: "nari" },
  { form: "dictionary", endings: ["やいなや", "や否や"], id: "ya-ina-ya" },
  {
    form: "classical",
    endings: ["んがため", "んがために"],
    id: "n-ga-tame-ni",
  },
  {
    form: "te",
    endings: ["はばからない", "憚らない"],
    id: "te-habakaranai",
  },
  { form: "zu", endings: ["とも"], id: "zu-tomo" },
  {
    form: "ta",
    endings: ["かいもなく", "甲斐もなく", "かいもなかった"],
    id: "kai-mo-naku",
  },
  {
    form: "negative",
    endings: ["いとも限らない", "いともかぎらない"],
    id: "nai-to-mo-kagiranai",
  },
  {
    form: "te",
    endings: [
      "ある",
      "あります",
      "あった",
      "ありました",
      "ありません",
      "ありませんでした",
    ],
    id: "te-aru",
  },
  {
    form: "te",
    endings: ["くれませんか", "いただけませんか", "頂けませんか"],
    id: "te-kuremasen-ka-te-itadakemasen-ka",
  },
  {
    form: "dictionary",
    endings: ["前に", "まえに"],
    id: "mae-ni",
  },
  { form: "ta", endings: ["後で", "あとで"], id: "ato-de" },
  { form: "conditional", endings: ["ば"], id: "ba" },
  { form: "negative", endings: ["ければ"], id: "ba" },
  {
    form: "negative",
    endings: casualObligation,
    id: "nai-to-ikenai-nakucha",
  },
  {
    form: "te",
    endings: ["ほしい", "欲しい"].flatMap((word) => [
      word,
      `${word}です`,
      `${word.slice(0, -1)}くない`,
      `${word.slice(0, -1)}くないです`,
      `${word.slice(0, -1)}かった`,
      `${word.slice(0, -1)}かったです`,
    ]),
    id: "te-hoshii",
  },
  {
    form: "te",
    endings: [
      "くれる",
      "くれます",
      "くれた",
      "くれました",
      "くれない",
      "くれません",
      "くれなかった",
      "くれませんでした",
      "くれて",
    ],
    id: "te-kureru",
  },
  { form: "stem", endings: ["ましょうか"], id: "mashou-ka" },
  { form: "ta", endings: ["ら"], id: "tara" },
  { form: "negative", endings: ["かったら"], id: "tara" },
  { form: "stem", endings: ["ましたら", "ませんでしたら"], id: "tara" },
  { form: "ta", endings: ["り"], id: "tari-tari-suru" },
  {
    form: "ta",
    endings: ["こと", "事"].flatMap((word) =>
      [
        "ある",
        "あります",
        "あった",
        "ありました",
        "ない",
        "ありません",
        "なかった",
        "ありませんでした",
      ].flatMap((ending) =>
        // 見たことはない / 見たこともない / 見たことのない景色 are the same
        // experience.
        ["が", "は", "も", "の"].map((particle) => word + particle + ending),
      ),
    ),
    id: "ta-koto-ga-aru",
  },
  {
    form: "dictionary",
    endings: ["こと", "事"].flatMap((word) =>
      [
        "できる",
        "できます",
        "できない",
        "できません",
        "できた",
        "できました",
        "できるだろう",
        "できるでしょう",
        "できなかった",
        "できませんでした",
        "出来る",
        "出来ます",
        "出来ない",
        "出来ません",
        "出来た",
        "出来ました",
      ].map((ending) => `${word}が${ending}`),
    ),
    id: "koto-ga-dekiru",
  },
  { form: "ta", endings: advice, id: "hou-ga-ii" },
  {
    form: "negative",
    endings: advice.map((ending) => `い${ending}`),
    id: "hou-ga-ii",
  },
  { form: "dictionary", endings: intention, id: "tsumori" },
  {
    form: "negative",
    endings: intention.map((ending) => `い${ending}`),
    id: "tsumori",
  },
  {
    form: "te",
    endings: [
      "もらう",
      "もらいます",
      "もらった",
      "もらいました",
      "もらわない",
      "もらいません",
      "もらわなかった",
      "もらいませんでした",
      "もらって",
      "もらおう",
    ],
    id: "te-morau",
  },
  {
    form: "te",
    endings: [
      "あげる",
      "あげます",
      "あげた",
      "あげました",
      "あげない",
      "あげません",
      "あげなかった",
      "あげませんでした",
      "あげて",
      "あげよう",
    ],
    id: "te-ageru",
  },
  {
    form: "negative",
    endings: [...fine, ...noMatter].map((ending) => "くても" + ending),
    id: "nakute-mo-ii",
  },
  {
    form: "negative",
    endings: [
      "いでください",
      "いで下さい",
      "いでおいてください",
      "いでおいて下さい",
    ],
    id: "naide-kudasai",
  },
  {
    form: "negative",
    endings: obligation,
    id: "nakereba-naranai-nakute-wa-ikenai",
  },
  // Causative obligation: 脱退させなければならなかった.
  {
    form: "causative",
    endings: [...obligation, ...casualObligation].map(
      (ending) => "な" + ending,
    ),
    id: "nakereba-naranai-nakute-wa-ikenai",
  },
  // Passive obligation: 提出されなければならない, 尊重されねばならない.
  {
    form: "passive",
    endings: [
      ...[...obligation, ...casualObligation].map((ending) => "な" + ending),
      ...obligationAuxiliaries.map((auxiliary) => "ねば" + auxiliary),
    ],
    id: "nakereba-naranai-nakute-wa-ikenai",
  },
  // Literary ねばならない shares the lesson's meaning.
  {
    form: "classical",
    endings: obligationAuxiliaries.map((auxiliary) => "ねば" + auxiliary),
    id: "nakereba-naranai-nakute-wa-ikenai",
  },
  {
    form: "te",
    endings: fine.map((ending) => "も" + ending),
    id: "te-mo-ii",
  },
  {
    form: "te",
    endings: noMatter.map((ending) => "も" + ending),
    id: "te-mo-kamawanai",
  },
  {
    form: "te",
    endings: [...prohibition, "はいけないです"],
    id: "te-wa-ikenai",
  },
  // Causative prohibition: わがままさせてはいけない.
  {
    form: "causative",
    endings: prohibition.map((ending) => "て" + ending),
    id: "te-wa-ikenai",
  },
  { form: "te", endings: ["ください", "下さい"], id: "te-kudasai" },
  {
    form: "te",
    endings: [
      "いる",
      "います",
      "いた",
      "いました",
      "いない",
      "いません",
      "いなかった",
      "いませんでした",
      // Casual speech drops the initial い of いる after the te-form.
      "る",
      "た",
      "ない",
      "なかった",
      "ます",
      "ました",
      "ません",
      "ませんでした",
    ],
    id: "te-iru",
  },
  {
    form: "te",
    endings: [
      "みる",
      "みます",
      "みた",
      "みました",
      "みない",
      "みません",
      "みよう",
      "みたい",
      "みたいです",
      "みて",
      "みたら",
    ],
    id: "te-miru",
  },
  {
    form: "te",
    endings: [
      "おく",
      "おきます",
      "おいた",
      "おきました",
      "おかない",
      "おきません",
      "おこう",
      "おいて",
    ],
    id: "te-oku",
  },
  {
    form: "te",
    endings: [
      "しまう",
      "しまいます",
      "しまった",
      "しまいました",
      "しまわない",
      "しまいません",
      "しまおう",
      "しまって",
    ],
    id: "te-shimau-chau",
  },
  { form: "te", endings: ["から"], id: "te-kara" },
  { form: "te", endings: ["も"], id: "te-mo-de-mo" },
  {
    form: "stem",
    endings: polite(["たい", "たくない", "たかった", "たくなかった"]),
    id: "tai",
  },
  { form: "stem", endings: ["ながら"], id: "nagara" },
];
