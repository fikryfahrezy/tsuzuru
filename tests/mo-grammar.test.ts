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
const lessonIds = (japanese: string) =>
  breakdown(japanese).flatMap((entry) =>
    (entry.grammar ?? []).map((lesson) => lesson.id),
  );

test("fixed words that contain も are expressions, not also", () => {
  for (const [japanese, word] of [
    ["手伝ってくれてどうもありがとう。", "どうも"],
    ["本の山は今にも崩れそうに見える。", "今にも"],
    ["そのような行ないはいかにもメグらしい。", "いかにも"],
    ["あれはバスですか、それとも車ですか。", "それとも"],
    ["私はいつまでもあなたを忘れません。", "いつまでも"],
    ["何とも言いようがないなあ。", "何とも"],
    ["もしも私が生まれ変わるなら、鳥になりたい。", "もしも"],
    ["困難に対してあくまでも抵抗した。", "あくまでも"],
    ["繁華街を当てもなくウロウロした。", "当てもなく"],
    ["六月は来る日も来る日も雨が降る。", "来る日も来る日も"],
    ["この保険は何もかもカバーする。", "何もかも"],
    ["よくもまあ私にそんな口がきけるね。", "よくも"],
    ["何事も最初が肝心だよな。", "何事も"],
    ["私は何事にも彼の指導を仰ぐ。", "何事にも"],
  ]) {
    const entries = breakdown(japanese!);
    expect(
      entries.map((entry) => entry.japanese),
      japanese,
    ).toContain(word);
    expect(lessonIds(japanese!), japanese).not.toContain("mo");
  }
});

test("a word that only starts like an expression keeps its own reading", () => {
  // よく + もった (持った) and もしもし are not よくも or もしも.
  expect(
    breakdown("その上着はよくもったね。").map((entry) => entry.japanese),
  ).not.toContain("よくも");
  expect(
    breakdown("「もしもし、ブラウンさんですか」「はい、そうです」").map(
      (entry) => entry.japanese,
    ),
  ).not.toContain("もしも");
});

test("an amount + も is as many as, not also", () => {
  for (const japanese of [
    "その王様は何年もその国を支配した。",
    "弁護士たちはその事件を何時間も弁論した。",
    "キャンセル料３割もとられるんだって。",
    "４０％もの生徒が大学に進学する。",
    "彼は私には一言も答えなかった。",
  ]) {
    const ids = lessonIds(japanese);
    expect(ids, japanese).toContain("mo-emphasis");
    expect(ids, japanese).not.toContain("mo");
  }
});

test("かもしれない after explanatory の or a bare ない", () => {
  for (const japanese of [
    "列車に乗り遅れたのかもしれない。",
    "煙は彼の心臓によくないかもしれない。",
  ]) {
    const ids = lessonIds(japanese);
    expect(ids, japanese).toContain("kamo-shirenai");
    expect(ids, japanese).not.toContain("mo");
  }
});

test("少しも / ちっとも with a negative is not at all", () => {
  for (const japanese of [
    "私は少しもお金を持っていません。",
    "最近エリザベスにちっともあってない。",
  ]) {
    const ids = lessonIds(japanese);
    expect(ids, japanese).toContain("sukoshi-mo-nai");
    expect(ids, japanese).not.toContain("mo");
  }
  const mo = breakdown("私は少しもお金を持っていません。").find(
    (entry) => entry.japanese === "も",
  );
  expect(mo?.note).toContain("not at all");
  expect(lessonIds("水を少しもってきてくれ——急いで。")).not.toContain(
    "sukoshi-mo-nai",
  );
});

test("a verb that modifies こと or よう stays inside the 何も scope", () => {
  expect(
    lessonIds("何も私にそれをあきらめるように強制することができない。"),
  ).toContain("nani-mo-nai-dare-mo-nai");
});
