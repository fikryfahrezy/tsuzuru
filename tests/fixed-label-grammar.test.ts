import { expect, test } from "bun:test";
import { sentenceAnswerEntries } from "../server/utils/answer-entries";
import { exercises } from "../server/utils/exercises";
import { primaryReading } from "../shared/sentence";

// The breakdown of a real sentence, after expressions group their words.
function breakdown(japanese: string) {
  const sentence = exercises.find(
    (row) => row.reference.japanese === japanese,
  )!;
  expect(sentence, japanese).toBeDefined();
  return sentenceAnswerEntries(sentence, {
    sentenceId: sentence.id,
    english: sentence.english,
    japanese,
    furigana: primaryReading(sentence.reference).furigana,
    answerEntries: [],
    hintMappings: [],
  }).entries;
}
const lessons = (japanese: string) =>
  breakdown(japanese).flatMap((entry) => entry.grammar ?? []);
const ids = (japanese: string) => lessons(japanese).map((lesson) => lesson.id);

test("sentence-opening conjunctions and set phrases are expressions", () => {
  for (const [japanese, word] of [
    ["だから家の中にいたほうがいいよ。", "だから"],
    ["だってこの世には悪者と偽善者しかいないのよ。", "だって"],
    ["だからといって異議があるわけではない。", "だからといって"],
    ["彼はフランス語を話せる、ましてや英語は無論のことだ。", "ましてや"],
    ["いいや。あいつは水がキライなんだ。", "いいや"],
    ["やだストッキング伝線しちゃってる。", "やだ"],
    ["ご参考までに。", "ご参考までに"],
    [
      "スロットを打っているうちに、あれよあれよと今の時間です。",
      "あれよあれよ",
    ],
  ]) {
    const entry = breakdown(japanese!).find((part) => part.japanese === word);
    expect(entry, japanese).toBeDefined();
    // No lesson from the expression's own words (だ, や, よ, まで) is shown.
    expect(
      lessons(japanese!).filter(
        (lesson) => lesson.start >= entry!.start && lesson.start < entry!.end,
      ),
      japanese,
    ).toEqual([]);
  }
});

test("だから inside a sentence is still copula + から", () => {
  const entries = breakdown("妹はせっかちだからよく忘れ物をする。");
  expect(entries.map((entry) => entry.japanese)).not.toContain("だから");
  expect(ids("妹はせっかちだからよく忘れ物をする。")).toContain("da");
});

test("listing や needs a noun before it", () => {
  for (const japanese of [
    "むかしのような激しい日雇い労働はできやしない。",
    "これはてんで見当がつかないや。",
    "次には、これらのやの上に絹の糸をさらに張り、巣の中央に滑らかで、粘りのない部分を残す。",
  ])
    expect(ids(japanese), japanese).not.toContain("ya");
  expect(ids("むかしのような激しい日雇い労働はできやしない。")).toContain(
    "ya-shinai",
  );
  expect(ids("娘は言語や芸術よりも自然科学が好きです。")).toContain("ya");
});

test("noun + だって and particle + まで mean even", () => {
  for (const japanese of [
    "子供にだってそんな事は分かるよ。",
    "いつだって読書の時間は見つけられる。",
    "それは君だってまちがいっこない。",
  ]) {
    expect(ids(japanese), japanese).toContain("datte-even");
    expect(ids(japanese), japanese).not.toContain("da");
  }
  expect(ids("愛とは夢にまで彼女を見ることだ。")).toContain("made-even");
  expect(ids("愛とは夢にまで彼女を見ることだ。")).not.toContain("made");
});

test("ではないか guesses, ではありませんか asks, のではない denies a reason", () => {
  const cases: [string, string][] = [
    ["遅刻するのではないかと心配した。", "no-de-wa-nai-ka"],
    ["私は彼が嘘つきではないかと思った。", "no-de-wa-nai-ka"],
    ["気持ちのいい朝ではありませんか。", "de-wa-arimasen-ka-confirm"],
    ["それはちょっと極端じゃないですか。", "de-wa-arimasen-ka-confirm"],
    ["幸福は単に富にあるのではない。", "no-de-wa-nai"],
    ["このテーブルを頼んだのではない。", "no-de-wa-nai"],
  ];
  for (const [japanese, id] of cases) {
    expect(ids(japanese), japanese).toContain(id);
    expect(ids(japanese), japanese).not.toContain("de-wa-arimasen-ja-nai");
  }
  // かもしれない after ではない is still "is not" + "might".
  expect(ids("これは本物のダイヤではないかもしれない。")).toContain(
    "de-wa-arimasen-ja-nai",
  );
});

test("とは defines a word, or reacts with surprise", () => {
  for (const japanese of [
    "誕生日とは人が生まれた日のことだ。",
    "「居住外国人」とは、どういう意味ですか。",
    "要するに、独裁とは「黙れ」ということ、民主主義とは「話し続けろ」ということである。",
  ]) {
    expect(ids(japanese), japanese).toContain("to-wa-definition");
    expect(ids(japanese), japanese).not.toContain("wa");
  }
  for (const japanese of [
    "あなたの見解は私とは正反対です。",
    "君と僕とは同い年だ。",
  ])
    expect(ids(japanese), japanese).not.toContain("to-wa-definition");
  expect(ids("まさか彼に会えるとは思わなかった。")).toContain("to-wa");
});

test("た before a noun can be a state, not a past action", () => {
  for (const japanese of [
    "彼は壊れた花瓶の破片をくっつけようとした。",
    "庭に面した部屋に替えてください。",
    "あのピンクの服を着た女性はだれですか。",
    "その老人は堂々とした顔つきをしていた。",
    "彼女はちょっとした資産を持っている。",
  ]) {
    const found = lessons(japanese);
    const state = found.find((lesson) => lesson.id === "ta-state");
    expect(state, japanese).toBeDefined();
    expect(
      found.filter(
        (lesson) => lesson.id === "ta" && lesson.start === state!.start,
      ),
      japanese,
    ).toEqual([]);
  }
  for (const japanese of [
    "兵隊たちは彼らが征服した人々から食物を没収した。",
    "ハイヒールのかかとが折れたとき、ストッキングがほつれた。",
    "この喫茶店でよくおしゃべりしたわね。",
    "この本は子供を対象とした本です。",
  ])
    expect(ids(japanese), japanese).not.toContain("ta-state");
});

test("ない in adjectives, contractions and in case", () => {
  for (const japanese of [
    "このビデオはつまらないよ。",
    "くだらない話はもうたくさんだ。",
    "すまないが今僕、手がいっぱいなのだ。",
  ])
    expect(ids(japanese), japanese).not.toContain("nai");
  for (const japanese of [
    "ガイドブックを過信しちゃいけない。",
    "そんなに授業をさぼっちゃダメよ。",
  ])
    expect(ids(japanese), japanese).toContain("te-wa-ikenai");
  expect(ids("あいつの損を埋めてやらなくちゃならないんだ。")).not.toContain(
    "te-wa-ikenai",
  );
  for (const japanese of [
    "もし眠るといけないので目覚し時計をセットしなさい。",
    "この手紙は紛失するといけないから、書留にするがよい。",
  ]) {
    expect(ids(japanese), japanese).toContain("to-ikenai-in-case");
    expect(ids(japanese), japanese).not.toContain("nai");
  }
  expect(ids("学校の決まりは守らないといけないぞ。")).toContain(
    "nai-to-ikenai-nakucha",
  );
  expect(ids("世界の歴史は偉人の伝記に外ならない。")).toContain(
    "ni-hoka-naranai",
  );
});
