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
    [["寝なくては", "なりません"], "寝る", "nakereba-naranai-nakute-wa-ikenai"],
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
    [
      ["払わなければ", "ならなかった"],
      "払う",
      "nakereba-naranai-nakute-wa-ikenai",
    ],
    [["しなくては", "ならん"], "する", "nakereba-naranai-nakute-wa-ikenai"],
    [["刈らねば", "ならない"], "刈る", "nakereba-naranai-nakute-wa-ikenai"],
    [["せねば", "ならない"], "する", "nakereba-naranai-nakute-wa-ikenai"],
    [["あらねば", "ならない"], "ある", "nakereba-naranai-nakute-wa-ikenai"],
    [
      ["させなければ", "ならなかった"],
      "する",
      "nakereba-naranai-nakute-wa-ikenai",
    ],
    [["されなければ", "ならない"], "する", "nakereba-naranai-nakute-wa-ikenai"],
    [["されねば", "ならない"], "する", "nakereba-naranai-nakute-wa-ikenai"],
    [["いなきゃ", "いけない"], "いる", "nai-to-ikenai-nakucha"],
    [["しなきゃ", "ならない"], "する", "nai-to-ikenai-nakucha"],
    [["しまわなきゃ"], "しまう", "nai-to-ikenai-nakucha"],
    [["しないと", "ダメ"], "する", "nai-to-ikenai-nakucha"],
    [["使っては", "ならない"], "使う", "te-wa-ikenai"],
    [["忘れては", "なりません"], "忘れる", "te-wa-ikenai"],
    [["させては", "ダメ"], "する", "te-wa-ikenai"],
    [["借りても", "よろしいです"], "借りる", "te-mo-ii"],
    [["食べても", "よいでしょう"], "食べる", "te-mo-ii"],
    [["通さなくても", "構わない"], "通す", "nakute-mo-ii"],
    [["せざる", "を", "えなかった"], "する", "zaru-o-enai"],
    [["せざる", "を", "得なく", "なる"], "する", "zaru-o-enai"],
    [["したほうが", "よいだろう"], "する", "hou-ga-ii"],
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
    // A bare なきゃ followed by more of the clause is a condition.
    [["しなきゃ", "大丈夫です"], "する"],
    [["ならなきゃ", "いいけどね"], "なる"],
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

test("N3 verb endings: half-done, hard to, ever more, even if, rules and no choice", () => {
  const cases: [string[], string, string][] = [
    [["忘れ", "かけた"], "忘れる", "kakeru"],
    [["死に", "かけて", "いる"], "死ぬ", "kakeru"],
    [["読み", "づらい"], "読む", "zurai"],
    [["読み", "づらかったです"], "読む", "zurai"],
    [["増える", "一方だ"], "増える", "ippou-da"],
    [["行く", "わけにはいかない"], "行く", "wake-ni-wa-ikanai"],
    [["言わない", "わけにはいきません"], "言う", "wake-ni-wa-ikanai"],
    [["しない", "こと"], "する", "koto-instruction"],
    [["煮る", "こと"], "煮る", "koto-instruction"],
    [["分からない", "ことはない"], "分かる", "nai-koto-wa-nai"],
    [["行かない", "こともない"], "行く", "nai-koto-wa-nai"],
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
  // Concessive たって needs a following clause.
  for (const [words, lemma, span] of [
    [["遅れた", "って", "大丈夫だ"], "遅れる", "遅れたって"],
    [["行かなくたって", "いい"], "行く", "行かなくたって"],
  ] as [string[], string, string][]) {
    const { reference, base } = fixture(words, lemma);
    expect(verbGrammar(reference, base), words.join(" / ")).toContainEqual(
      expect.objectContaining({ japanese: span, grammarIds: ["tatte-datte"] }),
    );
  }
});

test("N3 verb endings reject lexical compounds, quotations and nominalizers", () => {
  const cases: [string[], string][] = [
    // 話しかける "speak to", 見かける "spot", 仕掛ける "set up".
    [["話し", "かけた"], "話す"],
    [["見", "かけた"], "見る"],
    [["し", "かけた"], "する"],
    [["遅れた", "って", "言った"], "遅れる"],
    [["遅れた", "って"], "遅れる"],
    [["する", "こと", "が", "ある程度"], "する"],
  ];
  for (const [words, lemma] of cases) {
    const { reference, base } = fixture(words, lemma);
    expect(
      verbGrammar(reference, base).flatMap((match) => match.grammarIds),
      words.join(" / "),
    ).not.toContainAnyValues(["kakeru", "tatte-datte", "koto-instruction"]);
  }
});

test("たら before a past main clause also links the discovery lesson", () => {
  const cases: [string[], string, string[]][] = [
    [["見たら", "おもしろかった"], "見る", ["tara", "tara-ta"]],
    [["洗ったら", "色が", "落ちた"], "洗う", ["tara", "tara-ta"]],
    [["見たら", "おもしろい"], "見る", ["tara"]],
    [["行ったら", "よかった"], "行く", ["tara"]],
    [["行ったら", "いいと", "思った"], "行く", ["tara"]],
    [["行ったら", "いなかった", "？"], "行く", ["tara"]],
  ];
  for (const [words, lemma, ids] of cases) {
    const { reference, base } = fixture(words, lemma);
    const tara = verbGrammar(reference, base).find((match) =>
      match.grammarIds.includes("tara"),
    );
    expect(tara?.grammarIds, words.join(" / ")).toEqual(ids);
  }
});

test("N3 lessons link real sentences without annotations", () => {
  for (const [id, word, lesson, span] of [
    ["29749dab94f18303df6e509c", "終わりかけて", "kakeru", "終わりかけていた"],
    ["4e66fc8e9e6a890e70ee4464", "おぼれ", "kakeru", "おぼれかけた"],
    ["14da789a84bf30d431edf928", "遅れた", "tatte-datte", "遅れたって"],
    ["5aeff6b05761358adc2c35d3", "しない", "koto-instruction", "しないこと"],
    ["18089290c7d128cf76683ba9", "見たら", "tara-ta", "見たら"],
    ["c4d971b02e7b8a649af0bc86", "あった", "wake-da", "あったわけです"],
    ["2987c5885ae87dab7245068f", "も", "mo-ba-mo", "もあれば"],
    ["3e3db8de311e7dfcf0f0ce61", "も", "mo-ba-mo", "もなければ"],
    ["03f65dfbd86fb73b8fa38ef1", "って", "tte", "って"],
    ["9e02e887f7d608baeaf37085", "って", "tte", "って"],
    [
      "d6107541b1240da691d666a1",
      "ところ",
      "tokoro-ni-tokoro-e-tokoro-o",
      "ところを",
    ],
    ["dd26dc04bbf9efce4e2447bc", "に", "ni-kurabete", "に比べると"],
    ["6502884d235e435677628715", "警戒ぶり", "buri", "警戒ぶり"],
    ["75960f436595106b71adaccb", "久しぶり", "buri", "久しぶり"],
  ]) {
    const s = exerciseById.get(id!)!;
    const { entries } = sentenceAnswerEntries(s, {
      sentenceId: s.id,
      english: s.english,
      japanese: s.reference.japanese,
      furigana: primaryReading(s.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(
      entries.find((p) => p.japanese === word && p.grammar?.length)?.grammar,
      s.reference.japanese,
    ).toContainEqual(expect.objectContaining({ id: lesson, japanese: span }));
  }
  // Lexical かける compounds and places are not these lessons.
  for (const [id, lesson] of [
    ["3749c6ee115b00bc4676590a", "kakeru"],
    ["7eb4b95e8d9fec01631e6d28", "kakeru"],
    ["40a2963f2ce1e5e8d8beabad", "kakeru"],
    ["1319493902f269504ce3cc71", "tokoro-ni-tokoro-e-tokoro-o"],
    ["3424f096dcddd52e0d6c7eb1", "ki-ga-suru"],
    ["c170341800d1ff31582b9230", "tatte-datte"],
  ]) {
    const s = exerciseById.get(id!)!;
    const { entries } = sentenceAnswerEntries(s, {
      sentenceId: s.id,
      english: s.english,
      japanese: s.reference.japanese,
      furigana: primaryReading(s.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(
      entries.flatMap((p) => p.grammar ?? []).map((g) => g.id),
      s.reference.japanese,
    ).not.toContain(lesson);
  }
});

test("N2 verb endings: as soon as, while, to the end, resolve and since", () => {
  const cases: [string[], string, string][] = [
    [["着き", "次第"], "着く", "shidai"],
    [["歩き", "つつ"], "歩く", "tsutsu-tsutsu-mo"],
    [["戦い", "抜いた"], "戦う", "nuku"],
    [["信じ", "がたい"], "信じる", "gatai"],
    [["行く", "まい"], "行く", "mai"],
    [["増える", "ばかりだ"], "増える", "bakari-da"],
    [["待って", "はいられない"], "待つ", "te-wa-irarenai"],
    [["なって", "ならない"], "なる", "te-naranai"],
    [["見て", "こそ"], "見る", "te-koso"],
    [["食べて", "からでないと"], "食べる", "te-kara-de-nai-to"],
    [["来て", "以来"], "来る", "te-irai"],
    [["降った", "かと思ったら"], "降る", "ka-to-omottara-ka-to-omou-to"],
    [["出かけた", "きり"], "出かける", "kiri"],
    [["考えた", "あげく"], "考える", "ageku"],
    [["謝らない", "限り"], "謝る", "nai-kagiri"],
    [["見ない", "ことには"], "見る", "nai-koto-ni-wa"],
    [["始めよう", "ではないか"], "始める", "you-de-wa-nai-ka"],
    [["考え", "ようによっては"], "考える", "you-ni-yotte-wa"],
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
  const { reference, base } = fixture(["聞いた", "ところ", "、"], "聞く");
  expect(verbGrammar(reference, base)).toContainEqual(
    expect.objectContaining({
      japanese: "聞いたところ",
      grammarIds: ["ta-tokoro"],
    }),
  );
  for (const [words, lemma, id] of [
    // 撃ち抜く "shoot through", ありがたい "grateful", たところだ "just did".
    [["撃ち", "抜いた"], "撃つ", "nuku"],
    [["あり", "がたい"], "ある", "gatai"],
    [["帰った", "ところ", "だ"], "帰る", "ta-tokoro"],
  ] as [string[], string, string][]) {
    const { reference, base } = fixture(words, lemma);
    expect(
      verbGrammar(reference, base).flatMap((match) => match.grammarIds),
      words.join(" / "),
    ).not.toContain(id);
  }
});

test("N2 lessons link real sentences without annotations", () => {
  for (const [id, word, lesson, span] of [
    ["0a7b200b", "仕事上", "jou", "仕事上"],
    ["4e7d4340", "にくらしげ", "ge", "にくらしげ"],
    ["ce43e14a", "得意げ", "ge", "得意げ"],
    ["a8f1b58c", "それ", "kiri", "それっきり"],
    ["8bcda627", "着き", "shidai", "着き次第"],
    ["ed38cbe1", "すまい", "mai", "すまい"],
    ["cb64367a", "考えた", "sue-ni", "考えた末"],
    ["81817be3", "する", "sai-ni", "する際には"],
    ["0ad0aff0", "ある", "kagiri", "ある限り"],
    ["80b9e613", "しない", "nai-kagiri", "しない限り"],
    ["0fb22c54", "に", "ni-kagitte", "に限って"],
    ["dee60d0c", "やら", "yara-yara", "やら雨やら"],
    ["e64deb89", "と", "to-ieba-to-iu-to", "といえば"],
    ["282df75c", "どころ", "dokoro-de-wa-nai", "どころじゃない"],
    ["bb1f5e44", "に", "ni-hoka-naranai", "に他ならなかった"],
    ["0368c980", "を", "o-chuushin-ni", "を中心とする"],
    ["4d8c33da", "に", "ni-atatte", "に当たり"],
    ["35371816", "に", "ni-oujite", "に応じた"],
    ["9fef77c0", "戦い", "nuku", "戦い抜こう"],
  ]) {
    const s = [...exerciseById.values()].find((row) => row.id.startsWith(id!))!;
    const { entries } = sentenceAnswerEntries(s, {
      sentenceId: s.id,
      english: s.english,
      japanese: s.reference.japanese,
      furigana: primaryReading(s.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(
      entries.flatMap((p) => (p.japanese === word ? (p.grammar ?? []) : [])),
      s.reference.japanese,
    ).toContainEqual(expect.objectContaining({ id: lesson, japanese: span }));
  }
  // Places, possessive の, limits and hitting are not these lessons.
  for (const [id, lesson] of [
    ["f2c20ab0", "jou"],
    ["63d19bd7", "jou"],
    ["00d25494", "kiri"],
    ["6d6c19b9", "mono-no"],
    ["de926a27", "ni-atatte"],
    ["83cbeb73", "ni-oujite"],
    ["e6ce484e", "nuku"],
    ["33908aea", "ka-to-iu-to"],
    ["642a650f", "sue-ni"],
  ]) {
    const s = [...exerciseById.values()].find((row) => row.id.startsWith(id!))!;
    const { entries } = sentenceAnswerEntries(s, {
      sentenceId: s.id,
      english: s.english,
      japanese: s.reference.japanese,
      furigana: primaryReading(s.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(
      entries.flatMap((p) => p.grammar ?? []).map((g) => g.id),
      s.reference.japanese,
    ).not.toContain(lesson);
  }
});
