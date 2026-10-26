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
    id: "sai-ni",
    forms: ["際", "際に", "際は", "際には"],
    prefix: "adnominal",
  },
  // After a verb, only its た form; time nouns (月の末) are excluded in
  // construction-grammar.ts.
  { id: "sue-ni", forms: ["末", "末に"], prefix: "adnominal" },
  {
    id: "kagiri",
    forms: ["限り", "かぎり", "限りは", "限りでは"],
    prefix: "adnominal",
  },
  { id: "hanmen", forms: ["反面", "半面"], prefix: "adnominal" },
  { id: "ue-ni", forms: ["上に", "うえに"], prefix: "finite" },
  { id: "ue-de", forms: ["上で", "うえで"], prefix: "finite" },
  { id: "ijou-wa", forms: ["以上", "以上は"], prefix: "finite" },
  { id: "kara-ni-wa", forms: ["からには"], prefix: "finite" },
  { id: "kara-koso", forms: ["からこそ"], prefix: "plain" },
  { id: "bakari-ni", forms: ["ばかりに"], prefix: "finite" },
  { id: "mono-no", forms: ["ものの"], prefix: "finite" },
  { id: "mono-nara", forms: ["ものなら"], prefix: "finite" },
  // Only at the end of a sentence; see validAdvancedTail.
  { id: "mono-ka", forms: ["ものか", "もんか"], prefix: "finite" },
  { id: "you-de-wa", forms: ["ようでは"], prefix: "finite" },
  {
    id: "kurai-nara-gurai-nara",
    forms: ["くらいなら", "ぐらいなら"],
    prefix: "dictionary",
  },
  {
    id: "hoka-nai",
    forms: ["ほかない", "他ない", "ほかはない", "ほかありません"],
    prefix: "dictionary",
  },
  {
    id: "ka-no-you-da",
    forms: ["かのようだ", "かのようです", "かのように", "かのような"],
    prefix: "plain",
  },
  {
    id: "ka-to-iu-to",
    forms: ["かというと", "かといえば", "かと言うと", "かと言えば"],
    prefix: "plain",
  },
  {
    id: "dokoro-de-wa-nai",
    forms: ["どころ"].flatMap((word) =>
      [
        "ではない",
        "じゃない",
        "ではありません",
        "じゃありません",
        "ではなかった",
      ].map((ending) => word + ending),
    ),
    prefix: "plain",
  },
  {
    id: "to-iu-mono-de-wa-nai",
    forms: ["というもの"].flatMap((word) =>
      ["ではない", "でもない", "じゃない", "ではありません"].map(
        (ending) => word + ending,
      ),
    ),
    prefix: "plain",
  },
  {
    id: "dake-atte-dake-ni",
    forms: ["だけあって", "だけあり"],
    prefix: "plain",
  },
  { id: "dake-atte-dake-ni", forms: ["だけに"], prefix: "finite" },
  {
    id: "dake-no-koto-wa-aru",
    forms: ["だけのことはある", "だけのことはあります", "だけのことはあった"],
    prefix: "finite",
  },
  {
    id: "ni-soui-nai",
    forms: ["に相違ない", "に相違ありません"],
    prefix: "plain",
  },
  {
    id: "ni-koshita-koto-wa-nai",
    forms: ["越した", "こした", "超した"].flatMap((verb) =>
      ["ことはない", "ことはありません"].map((ending) => `に${verb}${ending}`),
    ),
    prefix: "plain",
  },
  {
    id: "ni-hoka-naranai",
    forms: ["ほか", "他"].flatMap((word) =>
      ["ならない", "ならなかった", "なりません"].map(
        (ending) => `に${word}${ending}`,
      ),
    ),
    prefix: "plain",
  },
  {
    id: "ni-saishite",
    forms: ["に際して", "に際し", "に際しての"],
    prefix: "plain",
  },
  {
    id: "ni-tomonatte",
    forms: ["に伴って", "に伴い", "に伴う", "にともなって", "にともない"],
    prefix: "plain",
  },
  {
    id: "ni-kakawarazu",
    forms: ["にかかわらず", "に関わらず", "に拘らず", "に拘わらず"],
    prefix: "plain",
  },
  { id: "ue-wa", forms: ["上は", "うえは"], prefix: "finite" },
  {
    id: "ka-to-omoikiya",
    forms: ["かと思いきや", "かとおもいきや"],
    prefix: "plain",
  },
  { id: "to-iedomo", forms: ["といえども", "と言えども"], prefix: "plain" },
  // とはいえない "can't be called" keeps its plain reading; see
  // validAdvancedTail.
  { id: "to-wa-ie", forms: ["とはいえ", "とは言え"], prefix: "plain" },
  {
    id: "kirai-ga-aru",
    forms: ["きらいがある", "きらいがあります"],
    prefix: "adnominal",
  },
  { id: "koto-tote", forms: ["こととて"], prefix: "adnominal" },
  { id: "to-atte", forms: ["とあって"], prefix: "plain" },
  { id: "to-areba", forms: ["とあれば"], prefix: "plain" },
  {
    id: "to-itta-tokoro-da",
    forms: ["といったところだ", "といったところです", "といった所だ"],
    prefix: "plain",
  },
  {
    id: "to-ittara-nai",
    forms: ["といったらない", "と言ったらない", "といったらありゃしない"],
    prefix: "plain",
  },
  {
    id: "to-shita-tokoro-de-ni-shita-tokoro-de",
    forms: ["としたところで", "にしたところで"],
    prefix: "plain",
  },
  { id: "to-bakari-ni", forms: ["とばかりに"], prefix: "plain" },
  {
    id: "to-mo-naku-to-mo-nashi-ni",
    forms: ["ともなく", "ともなしに"],
    prefix: "dictionary",
  },
  { id: "nara-mada-shimo", forms: ["ならまだしも"], prefix: "plain" },
  {
    id: "nara-iza-shirazu-wa-iza-shirazu",
    forms: ["なら", "は"].flatMap((particle) =>
      ["いざ知らず", "いざしらず"].map((ending) => particle + ending),
    ),
    prefix: "plain",
  },
  {
    id: "ni-wa-ataranai",
    forms: ["には当たらない", "にはあたらない", "には当たりません"],
    prefix: "plain",
  },
  {
    id: "ni-kataku-nai",
    forms: ["に難くない", "にかたくない"],
    prefix: "plain",
  },
  // Kanji only: kana にたえない may be 絶えない "never ceases".
  {
    id: "ni-taeru-ni-taenai",
    forms: ["に堪える", "に堪えない", "に堪えません"],
    prefix: "plain",
  },
  { id: "ni-taru", forms: ["に足る"], prefix: "plain" },
  {
    id: "ni-todomarazu",
    forms: ["にとどまらず", "に止まらず", "に留まらず"],
    prefix: "plain",
  },
  {
    id: "ni-hikikae",
    forms: ["にひきかえ", "に引き換え", "に引きかえ"],
    prefix: "plain",
  },
  { id: "nomi-narazu", forms: ["のみならず"], prefix: "plain" },
  // Only at the end of a sentence; see validAdvancedTail.
  { id: "mono-o", forms: ["ものを"], prefix: "finite" },
  {
    id: "yue-ni",
    forms: ["ゆえ", "ゆえに", "故に", "がゆえに", "がゆえ", "が故に", "ゆえの"],
    prefix: "plain",
  },
  { id: "katawara", forms: ["かたわら", "傍ら"], prefix: "adnominal" },
  // After a finite clause only: 信号の手前 is a place.
  { id: "temae", forms: ["手前"], prefix: "finite" },
  {
    id: "de-wa-aru-mai-shi",
    forms: ["ではあるまいし", "じゃあるまいし"],
    prefix: "plain",
  },
  {
    id: "koto-kono-ue-nai",
    forms: ["ことこの上ない", "ことこのうえない"],
    prefix: "finite",
  },
  {
    id: "kagiri-da",
    forms: ["限り", "かぎり"].flatMap((word) =>
      ["だ", "です"].map((ending) => word + ending),
    ),
    prefix: "adnominal",
  },
  {
    id: "gotoki-gotoku",
    forms: ["ごとく", "ごとき", "如く", "如き", "がごとく", "がごとき"],
    prefix: "adnominal",
  },
  {
    id: "to-mieru-to-miete",
    forms: ["とみえる", "とみえて", "と見える", "と見えて"],
    prefix: "finite",
  },
  // Not at the end, where にしろ is an order (静かにしろ).
  { id: "ni-shiro-ni-seyo", forms: ["にしろ", "にせよ"], prefix: "plain" },
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
  {
    id: "o-megutte",
    forms: ["をめぐ", "を巡"].flatMap((verb) =>
      ["って", "る", "り"].map((ending) => verb + ending),
    ),
    prefix: "noun",
  },
  {
    id: "o-kikkake-ni",
    forms: ["をきっかけに", "をきっかけとして", "をきっかけにして"],
    prefix: "noun",
  },
  {
    id: "ni-oujite",
    forms: ["に応じて", "に応じた"],
    prefix: "noun",
  },
  {
    id: "ni-hanshite",
    forms: ["に反して", "に反し", "に反した"],
    prefix: "noun",
  },
  {
    id: "ni-kotaete",
    forms: ["に応えて", "にこたえて", "に応え", "に応える"],
    prefix: "noun",
  },
  { id: "ni-kagitte", forms: ["に限って"], prefix: "noun" },
  { id: "ni-kagiri", forms: ["に限り", "に限ります"], prefix: "noun" },
  { id: "ni-kagirazu", forms: ["に限らず"], prefix: "noun" },
  {
    id: "o-chuushin-ni",
    forms: [
      "を中心に",
      "を中心として",
      "を中心とする",
      "を中心とした",
      "を中心にして",
    ],
    prefix: "noun",
  },
  {
    id: "o-moto-ni",
    forms: ["をもと", "を基"].flatMap((word) =>
      ["に", "にして", "にした"].map((ending) => word + ending),
    ),
    prefix: "noun",
  },
  { id: "o-towazu", forms: ["を問わず"], prefix: "noun" },
  {
    id: "o-hajime",
    forms: ["をはじめ", "を始め"].flatMap((word) =>
      ["として", "とする"].map((ending) => word + ending),
    ),
    prefix: "noun",
  },
  {
    id: "nuki-de-nuki-ni",
    forms: ["抜き", "ぬき"].flatMap((word) =>
      ["で", "に", "には"].map((ending) => word + ending),
    ),
    prefix: "noun",
  },
  {
    id: "to-ieba-to-iu-to",
    forms: ["といえば", "と言えば", "というと", "と言うと"],
    prefix: "noun",
  },
  { id: "kara-shite", forms: ["からして"], prefix: "noun" },
  {
    id: "kara-suru-to-kara-sureba",
    forms: ["からすると", "からすれば"],
    prefix: "noun",
  },
  {
    id: "kara-iu-to-kara-itte",
    forms: [
      "からいうと",
      "から言うと",
      "からいって",
      "から言って",
      "からいえば",
      "から言えば",
    ],
    prefix: "noun",
  },
  {
    id: "shidai-da-shidai-de",
    forms: ["次第だ", "次第で", "次第です", "次第では"],
    prefix: "noun",
  },
  // Only before a later も; see validAdvancedTail.
  {
    id: "wa-mochiron-wa-motoyori",
    forms: ["はもちろん", "はもとより"],
    prefix: "noun",
  },
  { id: "wa-sateoki", forms: ["はさておき", "はさておいて"], prefix: "noun" },
  { id: "mo-kamawazu", forms: ["もかまわず", "も構わず"], prefix: "noun" },
  { id: "gatera", forms: ["がてら"], prefix: "noun" },
  { id: "katagata", forms: ["かたがた"], prefix: "noun" },
  { id: "sura", forms: ["すら", "ですら", "にすら"], prefix: "noun" },
  {
    id: "to-aimatte",
    forms: ["と", "も"].flatMap((particle) =>
      ["相まって", "あいまって"].map((verb) => particle + verb),
    ),
    prefix: "noun",
  },
  {
    id: "tomo-naru-to-tomo-nareba",
    forms: ["ともなると", "ともなれば"],
    prefix: "noun",
  },
  {
    id: "nara-de-wa",
    forms: ["ならでは", "ならではの", "ならではだ"],
    prefix: "noun",
  },
  {
    id: "o-kinjienai",
    forms: ["を禁じ得ない", "を禁じえない", "を禁じ得なかった"],
    prefix: "noun",
  },
  {
    id: "o-yogi-naku-sareru",
    forms: ["された", "される", "されて", "させる", "させた"].map(
      (ending) => "を余儀なく" + ending,
    ),
    prefix: "noun",
  },
  { id: "atte-no", forms: ["あっての"], prefix: "noun" },
  {
    id: "ikan-de-ikan-ni-yorazu",
    forms: ["", "の"].flatMap((particle) =>
      [
        "いかんで",
        "いかんによって",
        "いかんによらず",
        "いかんにかかわらず",
        "いかんでは",
      ].map((ending) => particle + ending),
    ),
    prefix: "noun",
  },
  { id: "no-kiwami", forms: ["の極み"], prefix: "noun" },
  {
    id: "kiwamaru-kiwamari-nai",
    forms: ["極まる", "極まりない", "極まりありません", "きわまりない"],
    prefix: "plain",
  },
  { id: "no-itari", forms: ["の至り", "の至りです"], prefix: "noun" },
  { id: "tari-tomo", forms: ["たりとも"], prefix: "noun" },
  { id: "nakushite-wa", forms: ["なくして", "なくしては"], prefix: "noun" },
  {
    id: "ni-sokushite",
    forms: ["に即して", "に即した", "に即し"],
    prefix: "noun",
  },
  { id: "wa-oroka", forms: ["はおろか"], prefix: "noun" },
  {
    id: "mamire",
    forms: ["まみれ", "まみれの", "まみれに", "まみれだ"],
    prefix: "noun",
  },
  {
    id: "mo-saru-koto-nagara",
    forms: ["もさることながら"],
    prefix: "noun",
  },
  // Kanji 置いて is "put"; see validAdvancedTail.
  { id: "o-oite", forms: ["をおいて"], prefix: "noun" },
  {
    id: "o-kawakiri-ni",
    forms: ["を皮切りに", "を皮切りとして"],
    prefix: "noun",
  },
  { id: "o-ki-ni", forms: ["を機に", "を機として"], prefix: "noun" },
  { id: "o-kagiri-ni", forms: ["を限りに"], prefix: "noun" },
  // Kana もって is usually 持って; see validAdvancedTail.
  {
    id: "o-motte",
    forms: ["をもって", "を以て", "をもちまして", "をもってすれば"],
    prefix: "noun",
  },
  {
    id: "o-mono-tomo-sezu",
    forms: ["をものともせず", "をものともせずに"],
    prefix: "noun",
  },
  { id: "o-yoso-ni", forms: ["をよそに"], prefix: "noun" },
  { id: "tomo-arou", forms: ["ともあろう"], prefix: "noun" },
  { id: "ni-kakotsukete", forms: ["にかこつけて"], prefix: "noun" },
  {
    id: "ni-iwasereba",
    forms: ["に言わせれば", "に言わせると", "にいわせれば", "にいわせると"],
    prefix: "noun",
  },
  { id: "ni-kamakete", forms: ["にかまけて"], prefix: "noun" },
  { id: "kitte-no", forms: ["きっての"], prefix: "noun" },
  {
    id: "jimiru-jimita",
    forms: ["じみる", "じみた", "じみて"],
    prefix: "noun",
  },
  {
    id: "gurumi",
    forms: ["ぐるみ", "ぐるみで", "ぐるみの"],
    prefix: "noun",
  },
  {
    id: "o-ii-koto-ni",
    forms: ["をいいことに", "をいい事に", "を良いことに"],
    prefix: "noun",
  },
  {
    id: "ni-nottotte",
    forms: ["に則って", "に則った", "にのっとって", "にのっとった"],
    prefix: "noun",
  },
  {
    id: "o-fumaete",
    forms: ["を踏まえて", "を踏まえた", "をふまえて", "をふまえた"],
    prefix: "noun",
  },
  { id: "to-kitara", forms: ["ときたら"], prefix: "noun" },
  {
    id: "majiki",
    forms: ["にあるまじき", "としてあるまじき"],
    prefix: "noun",
  },
  // Kana かわって may also be 変わって "change"; see construction-grammar.ts.
  {
    id: "ni-kawatte",
    forms: ["に代わって", "に代わり", "に代わる"],
    prefix: "noun",
  },
];
