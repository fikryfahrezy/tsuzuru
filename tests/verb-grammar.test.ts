import { expect, test } from "bun:test";
import { verbGrammar } from "../server/utils/verb-grammar";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import {
  sentenceAnswerEntries,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { grammarForBreakdown } from "../shared/grammar";
import { grammarEntries } from "../server/utils/grammar-reference";
import { primaryReading } from "../shared/sentence";
import { currentAnswerBreakdown } from "../shared/answer-entries";

function fixture(words: string[], lemma: string, wordTypes = ["Verb"]) {
  const japanese = words.join("");
  // These unit fixtures supply positioned dictionary words directly; reading
  // validation is covered by the real-sentence integration test below.
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const reference = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.map((word, i) => {
    const start = offset;
    offset += word.length;
    return {
      japanese: word,
      kana: word,
      romaji: "",
      meanings: [],
      wordTypes: i === 0 ? wordTypes : [],
      ...(i === 0 ? { dictionaryForm: lemma } : {}),
      start,
      end: offset,
      entryId: `ja-${start}-${offset}`,
    };
  });
  return { reference, base };
}

test("shared constructions recognize different conjugation classes and token splits", () => {
  const cases: [string[], string, string][] = [
    [["やっても", "いいです"], "やる", "te-mo-ii"],
    [["見て", "も", "いい"], "見る", "te-mo-ii"],
    [["飲んで", "も", "いいです"], "飲む", "te-mo-ii"],
    [["泳いでもいい"], "泳ぐ", "te-mo-ii"],
    [["行って", "ください"], "行く", "te-kudasai"],
    [["来て", "下さい"], "来る", "te-kudasai"],
    [["して", "ください"], "する", "te-kudasai"],
    [["話して", "から"], "話す", "te-kara"],
    [["待って", "も"], "待つ", "te-mo-de-mo"],
    [["死んで", "も"], "死ぬ", "te-mo-de-mo"],
    [["遊んで", "も構いません"], "遊ぶ", "te-mo-kamawanai"],
    [["読んでは", "いけない"], "読む", "te-wa-ikenai"],
    [["食べて", "いました"], "食べる", "te-iru"],
    [["書いて", "おきます"], "書く", "te-oku"],
    [["食べて", "みたいです"], "食べる", "te-miru"],
    [["買って", "しまった"], "買う", "te-shimau-chau"],
    [["しなくても", "いいです"], "する", "nakute-mo-ii"],
    [["急がなくても", "いい"], "急ぐ", "nakute-mo-ii"],
    [["渡らないで", "ください"], "渡る", "naide-kudasai"],
    [["来なければ", "なりません"], "来る", "nakereba-naranai-nakute-wa-ikenai"],
    [
      ["食べなくては", "いけません"],
      "食べる",
      "nakereba-naranai-nakute-wa-ikenai",
    ],
    [["飲みたいです"], "飲む", "tai"],
    [["食べたくなかった"], "食べる", "tai"],
    [["歩き", "ながら"], "歩く", "nagara"],
    [["見ても", "らう"], "見る", "te-morau"],
    [["食べて", "もらいます"], "食べる", "te-morau"],
    [["手伝って", "あげました"], "手伝う", "te-ageru"],
    [["見た", "こと", "が", "あります"], "見る", "ta-koto-ga-aru"],
    [["飲んだ", "ことがありません"], "飲む", "ta-koto-ga-aru"],
    [["来た", "事がある"], "来る", "ta-koto-ga-aru"],
    [["行った", "ことがある"], "行く", "ta-koto-ga-aru"],
    [["弾く", "こと", "が", "できます"], "弾く", "koto-ga-dekiru"],
    [["食べる", "事が出来ません"], "食べる", "koto-ga-dekiru"],
    [["始めた", "方がいいです"], "始める", "hou-ga-ii"],
    [["飲まない", "ほうがいい"], "飲む", "hou-ga-ii"],
    [["招く", "つもり", "だ"], "招く", "tsumori"],
    [["しない", "つもりです"], "する", "tsumori"],
    [
      ["磨いて", "いただけません", "か"],
      "磨く",
      "te-kuremasen-ka-te-itadakemasen-ka",
    ],
    [
      ["閉めて", "くれませんか"],
      "閉める",
      "te-kuremasen-ka-te-itadakemasen-ka",
    ],
    [["食べる", "前", "に"], "食べる", "mae-ni"],
    [["飲んだ", "あとで"], "飲む", "ato-de"],
    [["行けば"], "行く", "ba"],
    [["来れば"], "来る", "ba"],
    [["すれば"], "する", "ba"],
    [["読まなければ"], "読む", "ba"],
    [["食べて", "ほしいです"], "食べる", "te-hoshii"],
    [["来て", "欲しくない"], "来る", "te-hoshii"],
    [["守らないと", "いけない"], "守る", "nai-to-ikenai-nakucha"],
    [["行かなくちゃ"], "行く", "nai-to-ikenai-nakucha"],
  ];
  for (const [words, lemma, id] of cases) {
    const { reference, base } = fixture(words, lemma);
    expect(verbGrammar(reference, base), words.join(" / ")).toEqual([
      {
        start: 0,
        end: words.join("").length,
        japanese: words.join(""),
        grammarIds: [id],
      },
    ]);
  }
});

test("word boundaries, dictionary conjugations, and grammatical categories prevent suffix guesses", () => {
  const cases: [string[], string, string[]?][] = [
    [["頭", "も", "いい"], "頭", ["Noun"]],
    [["見てもいい加減"], "見る"],
    [["見て、", "ください"], "見る"],
    [["見て ", "ください"], "見る"],
    [["行いて", "ください"], "行く"],
    [["食べって", "ください"], "食べる"],
    [["されて", "いる"], "する"],
    [["しかし", "ながら"], "しかし", ["Conjunction"]],
    [["未知って", "いる"], "未知る"],
    [["見た", "こと", "が", "起きた"], "見る"],
    [["飲む", "ことがある程度"], "飲む"],
    [["見た", "ことができる"], "見る"],
    [["見た", "つもりです"], "見る"],
    [["先生", "の", "つもり"], "先生", ["Noun"]],
    [["飲んだ、", "ことがある"], "飲む"],
    [["飲んだ", "ことがある程度"], "飲む"],
    [["見て", "あげますます"], "見る"],
    [["食べた", "前に"], "食べる"],
    [["飲む", "後で"], "飲む"],
    [["食べて", "欲望"], "食べる"],
    [["見ればかり"], "見る"],
  ];
  for (const [words, lemma, types] of cases) {
    const { reference, base } = fixture(words, lemma, types);
    expect(verbGrammar(reference, base), words.join(" / ")).toEqual([]);
  }
});

test("automatic constructions survive phrase grouping and explicit annotations take priority", () => {
  const { reference, base } = fixture(["飲んで", "も", "いいです"], "飲む");
  const grouped = [
    { ...base[0]!, japanese: "飲んでもいいです", end: 8, entryId: "ja-0-8" },
  ];
  const parts = withBreakdownGrammar(reference, grouped, base);
  expect(parts[0]!.grammar!.map((g) => g.id)).toEqual(["te-mo-ii"]);
  expect(parts[0]!.grammar![0]!.japanese).toBe("飲んでもいいです");
  const override = withBreakdownGrammar(reference, base, base, [
    { start: 0, end: 4, japanese: "飲んでも", grammarIds: ["te-mo-de-mo"] },
  ]);
  expect(override.flatMap((p) => p.grammar ?? []).map((g) => g.id)).toEqual([
    "te-mo-de-mo",
  ]);
});

test("dictionary-form verbs can start ability and intention constructions without an inflection lexeme", () => {
  for (const [words, lemma, id] of [
    [["弾く", "ことができます"], "弾く", "koto-ga-dekiru"],
    [["招く", "つもりです"], "招く", "tsumori"],
  ] as [string[], string, string][]) {
    const { reference, base } = fixture(words, lemma);
    delete base[0]!.dictionaryForm;
    expect(verbGrammar(reference, base)[0]!.grammarIds).toEqual([id]);
  }
});

test("composed favors and advice retain both lessons and saved older breakdowns refresh", () => {
  const s = exerciseById.get("060943254d1ccc134a4ed8c4")!;
  const { entries } = sentenceAnswerEntries(s);
  const lessons = entries.flatMap((entry) => entry.grammar ?? []);
  expect(lessons).toContainEqual(
    expect.objectContaining({
      id: "te-morau",
      japanese: "切ってもらった",
    }),
  );
  expect(lessons).toContainEqual(
    expect.objectContaining({
      id: "hou-ga-ii",
      japanese: "もらった方がいい",
    }),
  );
  expect(lessons.some((lesson) => ["te", "ta"].includes(lesson.id))).toBe(
    false,
  );
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v6",
      answerBreakdown: entries,
    }),
  ).toBeUndefined();
});

test("real sentence breakdowns link constructions without sentence-specific annotations", () => {
  for (const [id, word, lesson, span] of [
    ["8781e50b14468843e9839443", "やっても", "te-mo-ii", "やってもいいです"],
    ["0364a0abf8ed1efcc797071b", "見ても", "te-mo-ii", "見てもいいです"],
    ["1c249dd864fe63caab2a084f", "しても", "te-mo-ii", "してもいいです"],
    [
      "134d7fe922cc50c08fc0b3ff",
      "しなくても",
      "nakute-mo-ii",
      "しなくてもいいです",
    ],
    [
      "051649b8f62ddf86245d4d62",
      "渡らないで",
      "naide-kudasai",
      "渡らないでください",
    ],
    ["0028ff5e1ccfd69a615c5240", "劣って", "te-iru", "劣っている"],
    ["20760f0025a7d76d3d04d31c", "歩き", "nagara", "歩きながら"],
    [
      "119c48157ac30ac578dd0491",
      "見た",
      "ta-koto-ga-aru",
      "見たことがあります",
    ],
    ["02e738b615d0acebee2fcce2", "得る", "koto-ga-dekiru", "得ることができる"],
    ["2861dcb0f37b1e30243810ed", "始めた", "hou-ga-ii", "始めた方がいい"],
    ["02915b8e0e2a47e65648e4a1", "刈って", "te-morau", "刈ってもらった"],
    ["ef991073f2fa80b88291fb6c", "して", "te-ageru", "してあげた"],
    ["0740b2555fbbbe5e1342cdc8", "招く", "tsumori", "招くつもりだ"],
  ]) {
    const s = exerciseById.get(id!)!;
    const { entries, validAnnotations } = sentenceAnswerEntries(s, {
      sentenceId: s.id,
      english: s.english,
      japanese: s.reference.japanese,
      furigana: primaryReading(s.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(validAnnotations).toBe(true);
    expect(entries.find((p) => p.japanese === word)!.grammar).toContainEqual(
      expect.objectContaining({ id: lesson, japanese: span }),
    );
    expect(
      grammarForBreakdown(grammarEntries, entries).some((g) => g.id === lesson),
    ).toBe(true);
  }
});
