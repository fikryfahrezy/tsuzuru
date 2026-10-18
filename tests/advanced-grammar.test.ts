import { expect, test } from "bun:test";
import { lessons, type Word } from "./helpers/grammar";
import { exerciseById } from "../server/utils/exercises";
import {
  answerAnnotationRecords,
  sentenceAnswerEntries,
  baseAnswerEntries,
} from "../server/utils/answer-entries";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import reviewed from "../data/grammar-coverage/reviewed-occurrences.json";

test("advanced fixed formations preserve dictionary, past, and classical verb roles", () => {
  for (const [word, lemma, id] of [
    ["行かざるを得ない", "行く", "zaru-o-enai"],
    ["せざるを得なかった", "する", "zaru-o-enai"],
    ["泣かんばかりだった", "泣く", "n-bakari"],
    ["読むべきです", "読む", "beki-da-beki-de-wa-nai"],
    ["すべきではない", "する", "beki-da-beki-de-wa-nai"],
    ["言うまでもない", "言う", "made-mo-nai"],
    ["しかねない", "する", "kanenai"],
    ["増えつつあります", "増える", "tsutsu-aru"],
    ["言いようがない", "言う", "you-ga-nai"],
    ["読むしかありません", "読む", "shika-nai-no-choice"],
    ["読むことなく", "読む", "koto-naku"],
    ["読めば読むほど", "読む", "ba-hodo"],
  ])
    expect(lessons([[word!, ["Verb"], lemma]])).toContainEqual(
      expect.objectContaining({ id }),
    );
  expect(
    lessons([["読んだ", ["Verb"], "読む"], ["しかない"]]).some(
      (g) => g.id === "shika-nai-no-choice",
    ),
  ).toBe(false);
  expect(
    lessons([["行きざるを得ない", ["Verb"], "行く"]]).some(
      (g) => g.id === "zaru-o-enai",
    ),
  ).toBe(false);
});

test("relations distinguish literal actions and larger constructions", () => {
  const positives: [Word[], string][] = [
    [[["事実", ["Noun"]], ["に基づいて"]], "ni-motozuite"],
    [[["川", ["Noun"]], ["に沿って"]], "ni-sotte"],
    [[["彼女", ["Pronoun"]], ["にもかかわらず"]], "ni-mo-kakawarazu"],
    [[["価格", ["Noun"]], ["を除いて"], ["は", ["Particle"]]], "o-nozoite"],
    [[["仕事", ["Noun"]], ["ついでに"]], "tsuide-ni"],
    [
      [["レモン", ["Noun"]], ["の", ["Particle"]], ["よう"], ["な"]],
      "you-na-you-ni-like",
    ],
    [[["私", ["Pronoun"]], ["なりに"]], "nari-ni-nari-no"],
    [
      [
        ["損得なし", [], undefined, "そんとくなし"],
        ["に", ["Particle"]],
      ],
      "nashi-ni-wa",
    ],
    [
      [
        ["何", ["Pronoun"]],
        ["で", ["Particle"]],
        ["あれ", ["Verb"], "ある"],
      ],
      "de-are-de-are-de-are",
    ],
  ];
  for (const [words, id] of positives)
    expect(lessons(words)).toContainEqual(expect.objectContaining({ id }));
  const negatives: [Word[], string][] = [
    [
      [
        ["当て", ["Noun"]],
        ["に", ["Particle"]],
        ["して", ["Verb"], "する"],
        ["は", ["Particle"]],
        ["いけない"],
      ],
      "ni-shite-wa",
    ],
    [
      [
        ["医者", ["Noun"]],
        ["に", ["Particle"]],
        ["して", ["Verb"], "する"],
        ["もらう", ["Verb"]],
      ],
      "ni-shite-mo",
    ],
    [[["手", ["Noun"]], ["を通して"]], "o-tsuujite-o-tooshite"],
    [
      [["苦痛", ["Noun"]], ["を除いて"], ["やった", ["Verb"], "やる"]],
      "o-nozoite",
    ],
    [
      [["私", ["Pronoun"]], ["なり"], ["。"], ["に", ["Particle"]]],
      "nari-ni-nari-no",
    ],
    [
      [["約束した", ["Verb"], "約束する"], ["のであれば"]],
      "de-are-de-are-de-are",
    ],
  ];
  for (const [words, id] of negatives)
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
});

test("fused derivations require dictionary roots and matching supplied readings", () => {
  const positives: [Word[], string][] = [
    [[["高さ", [], undefined, "たかさ"]], "sa"],
    [[["一回目", [], undefined, "いっかいめ"]], "me"],
    [[["一年中", [], undefined, "いちねんじゅう"]], "chuu-juu"],
    [[["脂っぽい", [], undefined, "あぶらっぽい"]], "ppoi"],
    [
      [
        ["科学的", [], undefined, "かがくてき"],
        ["に", ["Particle"]],
      ],
      "teki",
    ],
    [[["矛盾だらけ", [], undefined, "むじゅんだらけ"]], "darake"],
    [[["黒ずくめ", [], undefined, "くろずくめ"]], "zukume"],
    [[["まちがいっこ", [], undefined, "まちがいっこ"], ["ない"]], "kko-nai"],
    [[["嫌がっ", [], undefined, "いやがっ"], ["た"]], "garu"],
  ];
  for (const [words, id] of positives)
    expect(lessons(words)).toContainEqual(expect.objectContaining({ id }));
  for (const [words, id] of [
    [[["高さ", [], undefined, "こうさ"]], "sa"],
    [[["二枚目", [], undefined, "にまいめ"]], "me"],
    [[["心中", [], undefined, "しんじゅう"]], "chuu-juu"],
    [
      [
        ["目的", [], undefined, "もくてき"],
        ["に", ["Particle"]],
      ],
      "teki",
    ],
    [[["ありがたい", ["い-adjective"]]], "gatai"],
    [[["すばらしい", ["い-adjective"]]], "rashii-typical-of"],
  ] as [Word[], string][])
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
});

test("potential and passive voices require independent lexical or participant evidence", () => {
  expect(lessons([["読めません", ["Verb"], "読める"]])).toContainEqual(
    expect.objectContaining({ id: "eru-rareru-potential" }),
  );
  expect(
    lessons([
      ["先生", ["Noun"]],
      ["に", ["Particle"]],
      ["責められた", ["Verb"], "責める"],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "reru-rareru-passive" }));
  for (const [words, id] of [
    [[["切れる", ["Verb"], "切れる"]], "eru-rareru-potential"],
    [
      [
        ["先生", ["Noun"]],
        ["に", ["Particle"]],
        ["教えられる", ["Verb"], "教える"],
      ],
      "reru-rareru-passive",
    ],
    [[["食べられる", ["Verb"], "食べる"]], "eru-rareru-potential"],
    [[["食べられる", ["Verb"], "食べる"]], "reru-rareru-passive"],
    [
      [
        ["先生", ["Noun"]],
        ["に", ["Particle"]],
        ["。"],
        ["褒められた", ["Verb"], "褒める"],
      ],
      "reru-rareru-passive",
    ],
  ] as [Word[], string][])
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
  expect(lessons([["おっしゃいます", ["Verb"], "おっしゃる"]])).toContainEqual(
    expect.objectContaining({ id: "sonkeigo" }),
  );
  expect(lessons([["申します", ["Verb"], "申す"]])).toContainEqual(
    expect.objectContaining({ id: "kenjougo" }),
  );
  expect(lessons([["お送りしました", ["Verb"], "送る"]])).toContainEqual(
    expect.objectContaining({ id: "o-suru" }),
  );
  expect(
    lessons([
      ["お茶", ["Noun"]],
      ["する", ["Verb"]],
    ]).some((g) => g.id === "o-suru"),
  ).toBe(false);
});

test("cause, purpose, and conditional roles reject lexical adverbs and literal places", () => {
  const positives: [Word[], string][] = [
    [
      [
        ["雨", ["Noun"]],
        ["の", ["Particle"]],
        ["ため", ["Noun"]],
        ["に", ["Particle"]],
      ],
      "tame-ni",
    ],
    [
      [
        ["寝る", ["Verb"]],
        ["間", ["Noun"], undefined, "あいだ"],
        ["に", ["Particle"]],
      ],
      "aida-aida-ni",
    ],
    [
      [
        ["読む", ["Verb"]],
        ["の", ["Particle"]],
        ["に", ["Particle"]],
        ["必要", ["な-adjective"]],
      ],
      "noni-purpose",
    ],
    [
      [
        ["雨", ["Noun"]],
        ["が", ["Particle"]],
        ["降る", ["Verb"]],
        ["と", ["Particle"]],
        ["花", ["Noun"]],
        ["が", ["Particle"]],
        ["咲く", ["Verb"]],
      ],
      "to",
    ],
    [
      [["聞いて", ["Verb"], "聞く"], ["、"], ["驚いた", ["Verb"], "驚く"]],
      "te-reason",
    ],
    [
      [
        ["熱くて", ["い-adjective"], "熱い"],
        ["飲めない", ["Verb"], "飲める"],
      ],
      "te-reason",
    ],
    [
      [
        ["風邪", ["Noun"]],
        ["で", ["Particle"]],
        ["休んだ", ["Verb"], "休む"],
      ],
      "te-reason",
    ],
  ];
  for (const [words, id] of positives)
    expect(lessons(words)).toContainEqual(expect.objectContaining({ id }));
  for (const [words, id] of [
    [
      [
        ["ぴたり", ["Adverb", "Verb"]],
        ["と", ["Particle"]],
        ["止まった", ["Verb"], "止まる"],
      ],
      "to",
    ],
    [
      [
        ["読む", ["Verb"]],
        ["と", ["Particle"]],
        ["言った", ["Verb"], "言う"],
      ],
      "to",
    ],
    [
      [
        ["本", ["Noun"]],
        ["の", ["Particle"]],
        ["間", ["Noun"], undefined, "あいだ"],
      ],
      "aida-aida-ni",
    ],
    [
      [
        ["ここ", ["Pronoun"]],
        ["が", ["Particle"]],
        ["生まれた", ["Verb"], "生まれる"],
        ["ところ", ["Noun"]],
        ["です", ["Copula"]],
      ],
      "tokoro-da",
    ],
  ] as [Word[], string][])
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
});

test("complete emphatic and nostalgic constructions override their component lessons", () => {
  const conditional = lessons([
    ["たとえ", ["Adverb"]],
    ["雨", ["Noun"]],
    ["が", ["Particle"]],
    ["降っても", ["Verb"], "降る"],
  ]);
  expect(conditional).toContainEqual(
    expect.objectContaining({
      id: "tatoe-te-mo",
      japanese: "たとえ雨が降っても",
    }),
  );
  expect(conditional.some((g) => g.id === "te-mo-de-mo")).toBe(false);
  const routine = lessons([
    ["彼", ["Pronoun"]],
    ["は", ["Particle"]],
    ["よく", ["Adverb"]],
    ["読んだ", ["Verb"], "読む"],
    ["もの", ["Noun"]],
    ["だ", ["Copula"]],
  ]);
  expect(routine).toContainEqual(expect.objectContaining({ id: "mono-da" }));
  const literal = lessons([
    ["これは", ["Pronoun"]],
    ["読んだ", ["Verb"], "読む"],
    ["もの", ["Noun"]],
    ["だ", ["Copula"]],
  ]);
  expect(literal.some((g) => g.id === "mono-da")).toBe(false);
});

for (const item of reviewed)
  test(`reviewed context selects ${item.lessonId} / ${item.sentenceId}`, () => {
    const sentence = exerciseById.get(item.sentenceId)!;
    const record = answerAnnotationRecords.find(
      (row) => row.sentenceId === item.sentenceId,
    )!;
    const actual = sentenceAnswerEntries(sentence);
    expect(actual.validAnnotations).toBe(true);
    expect(actual.entries.flatMap((part) => part.grammar ?? [])).toContainEqual(
      expect.objectContaining({ id: item.lessonId, japanese: item.japanese }),
    );
    expect(
      sentenceAnswerEntries(sentence, {
        ...record,
        english: record.english + " stale",
      }).validAnnotations,
    ).toBe(false);
    const base = baseAnswerEntries(sentence);
    const automatic = withBreakdownGrammar(sentence, base, base).flatMap(
      (part) => part.grammar ?? [],
    );
    expect(
      automatic.some(
        (g) => g.id === item.lessonId && g.japanese === item.japanese,
      ),
    ).toBe(false);
  });

test("redo grammar remains visible inside advice", () => {
  const sentence = exerciseById.get("3281d6d47784cfb098c422d1")!;
  const base = baseAnswerEntries(sentence);
  const grammar = withBreakdownGrammar(sentence, base, base).flatMap(
    (part) => part.grammar ?? [],
  );
  expect(grammar).toContainEqual(
    expect.objectContaining({ id: "naosu", japanese: "書き直した" }),
  );
  expect(grammar).toContainEqual(
    expect.objectContaining({
      id: "hou-ga-ii",
      japanese: "書き直したほうがいい",
    }),
  );
});
