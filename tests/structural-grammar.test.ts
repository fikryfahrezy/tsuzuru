import { expect, test } from "bun:test";
import { hasLesson, lessons, type Word } from "./helpers/grammar";

test("purpose, movement, favors, decisions and advice use verified conjugations", () => {
  const cases: [string, string, string][] = [
    ["見に行った", "見る", "ni-iku"],
    ["泳ぎに来ました", "泳ぐ", "ni-iku"],
    ["歩いていきます", "歩く", "te-iku"],
    ["増えてきた", "増える", "te-kuru"],
    ["読んでくださいました", "読む", "te-kudasaru-te-itadaku"],
    ["教えていただきました", "教える", "te-kudasaru-te-itadaku"],
    ["食べなさい", "食べる", "nasai"],
    ["飲んだばかりです", "飲む", "ta-bakari"],
    ["行けばよかった", "行く", "ba-yokatta"],
    ["買わなければよかったです", "買う", "ba-yokatta"],
    ["休んだらどうですか", "休む", "tara-dou"],
    ["休むことにしました", "休む", "koto-ni-suru"],
    ["買わないことにした", "買う", "koto-ni-suru"],
    ["行くことになりました", "行く", "koto-ni-naru"],
    ["食べないことになる", "食べる", "koto-ni-naru"],
    ["遅れることがある", "遅れる", "koto-ga-aru"],
    ["食べないことがあります", "食べる", "koto-ga-aru"],
    ["会う予定です", "会う", "yotei"],
    ["行くでしょう", "行く", "deshou"],
    ["行かないなら", "行く", "nara"],
  ];
  for (const [word, lemma, id] of cases)
    expect(lessons([[word, ["Verb"], lemma]]), word).toContainEqual(
      expect.objectContaining({ id, japanese: word }),
    );
});

test("constructions span split words and suppress component lessons", () => {
  const found = lessons([
    ["読んで", ["Verb"], "読む"],
    ["来ました", ["Verb"], "来る"],
  ]);
  expect(found).toContainEqual(
    expect.objectContaining({
      id: "te-kuru",
      japanese: "読んで来ました",
      start: 0,
      end: 7,
    }),
  );
  expect(found.some((g) => ["te", "mashita"].includes(g.id))).toBe(false);
  const request = lessons([
    ["教えて", ["Verb"], "教える"],
    ["いただけません", ["Verb"], "いただける"],
    ["か", ["Particle"]],
  ]);
  expect(
    request.some((g) => g.id === "te-kuremasen-ka-te-itadakemasen-ka"),
  ).toBe(true);
  expect(request.some((g) => g.id === "te-kudasaru-te-itadaku")).toBe(false);
});

test("demonstratives, adjective links, changes and quantities use their neighboring roles", () => {
  const cases: [Word[], string, string][] = [
    [[["これ", ["Pronoun"]]], "kore-sore-are-dore", "これ"],
    [[["あそこ"]], "koko-soko-asoko-doko", "あそこ"],
    [[["この"], ["本", ["Noun"]]], "kono-sono-ano-dono", "この"],
    [
      [["静か", ["な-adjective"]], ["な"], ["町", ["Noun"]]],
      "na-na-adjective",
      "静かな",
    ],
    [
      [
        ["寒く", ["い-adjective"], "寒い"],
        ["なりました", ["Verb"], "なる"],
      ],
      "ku-naru-ni-naru",
      "寒くなりました",
    ],
    [
      [
        ["医者", ["Noun"]],
        ["に", ["Particle"]],
        ["なる", ["Verb"]],
      ],
      "ku-naru-ni-naru",
      "医者になる",
    ],
    [
      [
        ["安くて", ["い-adjective"], "安い"],
        ["おいしい", ["い-adjective"]],
      ],
      "kute-de",
      "安くて",
    ],
    [[["必要", ["な-adjective"]], ["なら"]], "nara", "なら"],
    [[["寒い", ["い-adjective"]], ["けれども"]], "kedo-keredomo", "けれども"],
    [[["本", ["Noun"]], ["だけ"]], "dake", "だけ"],
    [[["本", ["Noun"]], ["など"]], "nado", "など"],
    [[["３時"], ["ごろ"]], "goro", "３時ごろ"],
    [[["二時間"], ["くらい"]], "kurai-gurai", "二時間くらい"],
    [[["月"], ["に", ["Particle"]], ["二回"]], "ni-frequency", "月に二回"],
    [
      [["一週間"], ["に", ["Particle"]], ["３回"]],
      "ni-frequency",
      "一週間に３回",
    ],
    [
      [
        ["金曜日", ["Noun"]],
        ["まで", ["Particle"]],
        ["に", ["Particle"]],
      ],
      "made-ni",
      "までに",
    ],
    [
      [
        ["行った", ["Verb"], "行く"],
        ["とき", ["Noun"]],
      ],
      "toki",
      "とき",
    ],
  ];
  for (const [words, id, japanese] of cases)
    expect(lessons(words)).toContainEqual(
      expect.objectContaining({ id, japanese }),
    );
});

test("lexical lookalikes, destinations, incorrect forms and punctuation do not establish constructions", () => {
  const cases: [Word[], string][] = [
    [[["そこ", ["Noun"], "底"]], "koko-soko-asoko-doko"],
    [[["あれ", ["Noun"], "荒れ"]], "kore-sore-are-dore"],
    [[["食べた", ["Verb"], "食べる"], ["うちに"]], "uchi-ni"],
    [
      [
        ["学校", ["Noun"]],
        ["に", ["Particle"]],
        ["行った", ["Verb"], "行く"],
      ],
      "ni-iku",
    ],
    [
      [
        ["見", ["Verb"], "見る"],
        ["に", ["Particle"]],
        ["。"],
        ["行く", ["Verb"]],
      ],
      "ni-iku",
    ],
    [[["行いてくる", ["Verb"], "行く"]], "te-kuru"],
    [
      [
        ["やけど", ["Noun"]],
        ["した", ["Verb"], "する"],
      ],
      "kedo-keredomo",
    ],
    [
      [
        ["謝らなければ", ["Verb"], "謝る"],
        ["ならない", ["Verb"], "なる"],
      ],
      "nara",
    ],
    [[["いただけます", ["Verb"], "いただける"]], "dake"],
    [[["本", ["Noun"]], ["だけ"], ["に", ["Particle"]]], "dake"],
    [[["３時間"], ["ごろ"]], "goro"],
    [[["驚く", ["Verb"]], ["くらい"]], "kurai-gurai"],
    [
      [["一時間"], ["に", ["Particle"]], ["１０"], ["回転", ["Noun"]]],
      "ni-frequency",
    ],
    [
      [
        ["暑くて", ["い-adjective"], "暑い"],
        ["眠れない", ["Verb"]],
      ],
      "kute-de",
    ],
    [
      [
        ["私", ["Pronoun"]],
        ["の", ["Particle"]],
        ["時代", ["Noun"]],
      ],
      "toki",
    ],
    [[["あの"], ["、"], ["本", ["Noun"]]], "kono-sono-ano-dono"],
    [
      [
        ["食べた", ["Verb"], "食べる"],
        ["予定", ["Noun"]],
      ],
      "yotei",
    ],
  ];
  for (const [words, id] of cases)
    expect(
      lessons(words).some((g) => g.id === id),
      words.map(([word]) => word).join(""),
    ).toBe(false);
});

test("fixed clause constructions distinguish routines, arrangements, expectations and explanations", () => {
  for (const [word, lemma, id] of [
    ["行くことにしている", "行く", "koto-ni-shite-iru"],
    ["行かないことになっています", "行く", "koto-ni-natte-iru"],
    ["来るはずです", "来る", "hazu-da"],
    ["来るはずがない", "来る", "hazu-ga-nai"],
    ["来たわけではない", "来る", "wake-de-wa-nai"],
    ["食べるだけでなく", "食べる", "dake-de-naku"],
    ["食べるんです", "食べる", "n-desu-no-desu"],
    ["食べるんだ", "食べる", "n-desu-no-desu"],
    ["食べるのだろう", "食べる", "n-desu-no-desu"],
    ["食べるんでしょう", "食べる", "n-desu-no-desu"],
    ["食べるのでしょう", "食べる", "n-desu-no-desu"],
    ["食べるんじゃない", "食べる", "n-desu-no-desu"],
    ["食べるんじゃなかった", "食べる", "n-desu-no-desu"],
    ["行くだろう", "行く", "darou"],
    ["来るに違いない", "来る", "ni-chigai-nai"],
    ["開いたとたんに", "開く", "ta-totan-ta-totan-ni"],
    ["訪れるたびに", "訪れる", "tabi-ni"],
  ])
    expect(lessons([[word!, ["Verb"], lemma]])).toContainEqual(
      expect.objectContaining({ id }),
    );
  expect(lessons([["学生", ["Noun"]], ["な"], ["んです"]])).toContainEqual(
    expect.objectContaining({ id: "n-desu-no-desu" }),
  );
  expect(lessons([["学生", ["Noun"]], ["な"], ["んだ"]])).toContainEqual(
    expect.objectContaining({ id: "n-desu-no-desu" }),
  );
  expect(
    lessons([
      ["学生", ["Noun"]],
      ["の", ["Particle"]],
      ["です", ["Copula"]],
    ]).some((g) => g.id === "n-desu-no-desu"),
  ).toBe(false);
  // Possessive の + だ (私のだ, "it's mine") is not explanatory.
  expect(
    lessons([
      ["私", ["Pronoun"]],
      ["の", ["Particle"]],
      ["だ", ["Copula"]],
    ]).some((g) => g.id === "n-desu-no-desu"),
  ).toBe(false);
  // A bare の explains only at the end of a sentence.
  expect(lessons([["行く", ["Verb"], "行く"], ["の"], ["？"]])).toContainEqual(
    expect.objectContaining({ id: "n-desu-no-desu", japanese: "行くの" }),
  );
  // As with のですか, か keeps its own lesson.
  const question = lessons([
    ["行く", ["Verb"], "行く"],
    ["の"],
    ["か", ["Particle"]],
    ["。"],
  ]);
  expect(question).toContainEqual(
    expect.objectContaining({ id: "n-desu-no-desu", japanese: "行くの" }),
  );
  expect(question).toContainEqual(
    expect.objectContaining({ id: "ka-question" }),
  );
  for (const tail of ["が", "か"])
    expect(
      lessons([
        ["行く", ["Verb"], "行く"],
        ["の"],
        [tail, ["Particle"]],
        ["好き", ["な-adjective"]],
      ]).some((g) => g.id === "n-desu-no-desu"),
      `行くの${tail}好き`,
    ).toBe(false);
  // A godan past tense (飲んだ) contains ん but is one word.
  expect(
    lessons([["飲んだ", ["Verb"], "飲む"]]).some(
      (g) => g.id === "n-desu-no-desu",
    ),
  ).toBe(false);
});

test("ほとんど between the particle and ない / いない is still existence", () => {
  const has = (words: Word[]) => hasLesson(words, "ga-aru-ga-iru");
  for (const [particle, verb] of [
    ["が", "ない"],
    ["は", "ない"],
    ["は", "いない"],
  ])
    expect(
      has([
        ["時間", ["Noun"]],
        [particle!, ["Particle"]],
        ["ほとんど", ["Adverb"]],
        [verb!],
      ]),
      `時間${particle}ほとんど${verb}`,
    ).toBe(true);
  // ほとんど before a verb's negative is not existence.
  expect(
    has([
      ["中国語", ["Noun"]],
      ["を", ["Particle"]],
      ["ほとんど", ["Adverb"]],
      ["話せない", ["Verb"], "話す"],
    ]),
  ).toBe(false);
});

test("subject の + ない before a noun is negated existence", () => {
  const pot = [["手", ["Noun"]], ["の", ["Particle"]], ["ない"]] as Parameters<
    typeof lessons
  >[0];
  expect(hasLesson([...pot, ["ナベ", ["Noun"]]], "ga-aru-ga-iru")).toBe(true);
  // Without a following noun, ない does not form a relative clause here.
  expect(hasLesson([...pot, ["。"]], "ga-aru-ga-iru")).toBe(false);
  expect(
    hasLesson(
      [
        ["見たことのない", ["Verb"], "見る"],
        ["景色", ["Noun"]],
      ],
      "ta-koto-ga-aru",
    ),
  ).toBe(true);
});

test("split い-adjective negatives (よく + ない) are recognized", () => {
  const has = (words: Word[]) => hasLesson(words, "ku-nai-katta-ku-nakatta");
  for (const ending of ["ない", "なかった", "ありません"])
    expect(
      has([["よく", ["い-adjective"], "よい"], [ending]]),
      "よく" + ending,
    ).toBe(true);
  // No word type, but its dictionary form is the same stem.
  expect(has([["芳しく", [], "芳しい"], ["ない"]])).toBe(true);
  // Verb たく + ない (not want to) and the adverb まったく are not adjectives.
  expect(has([["論じたく", ["Verb"], "論ずる"], ["ない"]])).toBe(false);
  expect(has([["まったく", ["Adverb"]], ["ない"]])).toBe(false);
});

test("demonstrative + ような / ように is likeness, even at the start", () => {
  for (const [first, ending] of [
    ["この", "な"],
    ["その", "な"],
    ["どの", "に"],
  ])
    expect(
      lessons([[first!], ["よう"], [ending!], ["問題", ["Noun"]]]),
    ).toContainEqual(
      expect.objectContaining({
        id: "you-na-you-ni-like",
        japanese: first + "よう" + ending,
      }),
    );
  // その + ようだ (a mis-split うそのようだ) is not this pattern.
  expect(
    lessons([["その"], ["よう"], ["だ", ["Copula"]]]).some(
      (g) => g.id === "you-na-you-ni-like",
    ),
  ).toBe(false);
});

test("negated existence takes は and も, but not after こと or before a noun", () => {
  for (const [word, types, particle] of [
    ["時間", ["Noun"], "は"],
    ["時間", ["Noun"], "も"],
    ["必要", ["な-adjective"], "は"],
  ] as const)
    expect(
      hasLesson(
        [[word, [...types]], [particle, ["Particle"]], ["ない"]],
        "ga-aru-ga-iru",
      ),
      word + particle + "ない",
    ).toBe(true);
  // 行くことはない is "no need to go"; 見たことはない is experience.
  expect(
    hasLesson(
      [
        ["行く", ["Verb"], "行く"],
        ["こと", ["Noun"]],
        ["は", ["Particle"]],
        ["ない"],
      ],
      "ga-aru-ga-iru",
    ),
  ).toBe(false);
  expect(
    hasLesson([["見たことはない", ["Verb"], "見る"]], "ta-koto-ga-aru"),
  ).toBe(true);
  // ない modifying a noun after a topic は is not the predicate.
  expect(
    hasLesson(
      [["息子", ["Noun"]], ["は", ["Particle"]], ["ない"], ["もの", ["Noun"]]],
      "ga-aru-ga-iru",
    ),
  ).toBe(false);
  expect(hasLesson([["来るはずはない", ["Verb"], "来る"]], "hazu-ga-nai")).toBe(
    true,
  );
});

test("では / じゃ also take なくて and ないでしょう", () => {
  for (const [first, ending] of [
    ["じゃ", "なくて"],
    ["では", "ないでしょう"],
  ])
    expect(
      lessons([["仕事", ["Noun"]], [first!, ["Particle"]], [ending!]]),
    ).toContainEqual(
      expect.objectContaining({
        id: "de-wa-arimasen-ja-nai",
        japanese: first! + ending,
      }),
    );
});

test("split すべき, ではなく, かい / だい, 同じくらい and でしかない", () => {
  // 利用 + すべきだ: the tokenizer's lemma is する, and だ is not past.
  const should = lessons([
    ["利用", ["Noun"]],
    ["すべきだ", [], "する"],
  ]);
  expect(should).toContainEqual(
    expect.objectContaining({
      id: "beki-da-beki-de-wa-nai",
      japanese: "すべきだ",
    }),
  );
  expect(should.some((g) => g.id === "ta")).toBe(false);
  expect(
    hasLesson(
      [
        ["人造", ["Noun"]],
        ["では", ["Particle"]],
        ["なく"],
        ["本物", ["Noun"]],
      ],
      "de-wa-arimasen-ja-nai",
    ),
  ).toBe(true);
  for (const [first, types] of [
    ["か", ["Particle"]],
    ["だ", ["Copula"]],
  ] as const)
    expect(
      lessons([["本気", ["Noun"]], [first, [...types]], ["い"], ["。"]]),
    ).toContainEqual(
      expect.objectContaining({ id: "ka-question", japanese: first + "い" }),
    );
  expect(
    hasLesson(
      [["同じ", ["な-adjective"]], ["くらい"], ["だ", ["Copula"]]],
      "kurai-gurai",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [
        ["未成年", ["Noun"]],
        ["で", ["Particle"]],
        ["しか", ["Particle"]],
        ["ない"],
      ],
      "shika-nai",
    ),
  ).toBe(true);
});

test("written でない negates the copula, and でなければならない is must-be", () => {
  expect(
    hasLesson(
      [["自由", ["な-adjective"]], ["で", ["Particle"]], ["ない"]],
      "de-wa-arimasen-ja-nai",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [
        ["公平", ["な-adjective"]],
        ["で", ["Particle"]],
        ["なければ"],
        ["ならない", ["Verb"], "なる"],
      ],
      "nakereba-naranai-nakute-wa-ikenai",
    ),
  ).toBe(true);
  // で (on) + 泣いて written ないて is not the copula.
  expect(
    hasLesson(
      [
        ["上", ["Noun"]],
        ["で", ["Particle"]],
        ["ないて"],
        ["いた", ["Verb"], "いる"],
      ],
      "de-wa-arimasen-ja-nai",
    ),
  ).toBe(false);
  // 出ない is the verb 出る.
  expect(
    hasLesson(
      [
        ["乳", ["Noun"]],
        ["が", ["Particle"]],
        ["出ない", ["Verb"], "出る"],
      ],
      "de-wa-arimasen-ja-nai",
    ),
  ).toBe(false);
});

test("formal よう without に and はずない without が", () => {
  expect(
    hasLesson(
      [
        ["入れない", ["Verb"], "入れる"],
        ["よう"],
        ["窓", ["Noun"]],
        ["を", ["Particle"]],
        ["閉めた", ["Verb"], "閉める"],
      ],
      "you-ni",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [["入る", ["Verb"], "入る"], ["よう"], ["頼んだ", ["Verb"], "頼む"]],
      "you-ni-iu-you-ni-tanomu",
    ),
  ).toBe(true);
  // ようだ is appearance, not a bare purpose よう.
  expect(
    hasLesson(
      [
        ["酔って", ["Verb"], "酔う"],
        ["いる", ["Verb"], "いる"],
        ["よう"],
        ["だ", ["Copula"]],
      ],
      "you-ni",
    ),
  ).toBe(false);
  expect(hasLesson([["来るはずない", ["Verb"], "来る"]], "hazu-ga-nai")).toBe(
    true,
  );
});

test("verb + ように follows its predicate: request, effort or likeness", () => {
  const you = [["よう"], ["に", ["Particle"]]] as const;
  // Reported requests, including split する verbs (命令 + した).
  expect(
    hasLesson(
      [["する", ["Verb"], "する"], ...you, ["頼んだ", ["Verb"], "頼む"]],
      "you-ni-iu-you-ni-tanomu",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [
        ["集合", ["Noun"]],
        ["する", ["Verb"], "する"],
        ...you,
        ["命令", ["Noun"]],
        ["した", ["Verb"], "する"],
      ],
      "you-ni-iu-you-ni-tanomu",
    ),
  ).toBe(true);
  // A past verb before ように is "as", not a request.
  expect(
    hasLesson(
      [["言った", ["Verb"], "言う"], ...you, ["頼んだ", ["Verb"], "頼む"]],
      "you-ni-iu-you-ni-tanomu",
    ),
  ).toBe(false);
  // Effort (気 + を + つける) and the goal of any action after an
  // uncontrollable verb, across a comma.
  expect(
    hasLesson(
      [
        ["転ばない", ["Verb"], "転ぶ"],
        ...you,
        ["気", ["Noun"]],
        ["を", ["Particle"]],
        ["つけ", ["Verb"], "つける"],
      ],
      "you-ni",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [
        ["通れる", ["Verb"], "通れる"],
        ...you,
        ["、"],
        ["退いた", ["Verb"], "退く"],
      ],
      "you-ni",
    ),
  ).toBe(true);
  expect(
    hasLesson(
      [
        ["疲れて", ["Verb"], "疲れる"],
        ["いる", ["Verb"], "いる"],
        ...you,
        ["見える", ["Verb"], "見える"],
      ],
      "you-na-you-ni-like",
    ),
  ).toBe(true);
});

test("split copula negatives (では + ない) are recognized", () => {
  for (const [first, second, japanese] of [
    ["では", "ない", "ではない"],
    ["じゃ", "ない", "じゃない"],
    ["では", "ありません", "ではありません"],
    ["では", "なかった", "ではなかった"],
  ])
    expect(
      lessons([["重要", ["な-adjective"]], [first!, ["Particle"]], [second!]]),
    ).toContainEqual(
      expect.objectContaining({ id: "de-wa-arimasen-ja-nai", japanese }),
    );
  // でもない is the same negative with も (善でも悪でもない: neither ... nor).
  expect(
    lessons([["善", ["Noun"]], ["でも", ["Particle"]], ["ない"]]),
  ).toContainEqual(
    expect.objectContaining({
      id: "de-wa-arimasen-ja-nai",
      japanese: "でもない",
    }),
  );
  // After どんな, でも is "any": どんなベッドでもないよりはよい.
  expect(
    lessons([
      ["どんな"],
      ["ベッド", ["Noun"]],
      ["でも", ["Particle"]],
      ["ない"],
    ]).some((g) => g.id === "de-wa-arimasen-ja-nai"),
  ).toBe(false);
  // では after a verb is not a copula (行っては).
  expect(
    lessons([
      ["行って", ["Verb"], "行く"],
      ["は", ["Particle"]],
      ["ない"],
    ]).some((g) => g.id === "de-wa-arimasen-ja-nai"),
  ).toBe(false);
});

test("noun relations require appropriate topics, sources and viewpoints", () => {
  const cases: [string, string, string][] = [
    ["戦争", "について", "ni-tsuite"],
    ["摩擦", "によって", "ni-yotte-ni-yoru"],
    ["新聞", "によると", "ni-yoru-to-ni-yoreba"],
    ["協力者", "に対して", "ni-taishite"],
    ["初心者", "にとって", "ni-totte"],
    ["文学", "に関する", "ni-kanshite-ni-kansuru"],
    ["教師", "として", "to-shite"],
    ["太陽", "とともに", "to-tomo-ni"],
  ];
  expect(lessons([["四半期ごと"], ["に", ["Particle"]]])).toContainEqual(
    expect.objectContaining({ id: "goto-ni", japanese: "四半期ごとに" }),
  );
  expect(lessons([["４時間おき"], ["に", ["Particle"]]])).toContainEqual(
    expect.objectContaining({ id: "oki-ni", japanese: "４時間おきに" }),
  );
  for (const [noun, construction, id] of cases)
    expect(lessons([[noun, ["Noun"]], [construction]])).toContainEqual(
      expect.objectContaining({ id, japanese: construction }),
    );
  for (const [noun, construction, id] of [
    ["手", "にとって", "ni-totte"],
    ["駅", "によって", "ni-yotte-ni-yoru"],
    ["こと", "によると", "ni-yoru-to-ni-yoreba"],
    ["仕事", "について", "ni-tsuite"],
  ])
    expect(
      lessons([[noun!, ["Noun"]], [construction!]]).some((g) => g.id === id),
    ).toBe(false);
});

test("appearance and hearsay use different formations and preserve ambiguous past-desire forms", () => {
  const cases: [Word, string][] = [
    [["降りそうです", ["Verb"], "降る"], "sou-da-appearance"],
    [["降るそうです", ["Verb"], "降る"], "sou-da-hearsay"],
    [["おいしそうだ", ["い-adjective"], "おいしい"], "sou-da-appearance"],
    [["おいしいそうだ", ["い-adjective"], "おいしい"], "sou-da-hearsay"],
    [["よさそうだ", ["い-adjective"], "いい"], "sou-da-appearance"],
    [["元気そうだ", ["な-adjective"], "元気"], "sou-da-appearance"],
    [["行きそうもない", ["Verb"], "行く"], "sou-ni-nai-sou-mo-nai"],
    [["いるらしい", ["Verb"], "いる"], "rashii"],
    [["いるようだ", ["Verb"], "いる"], "you-da"],
    [["あるみたいだ", ["Verb"], "ある"], "mitai"],
  ];
  for (const [word, id] of cases)
    expect(lessons([word])).toContainEqual(expect.objectContaining({ id }));
  const ambiguous = lessons([["食べた", ["Verb"], "食べる"], ["そうだ"]]);
  expect(
    ambiguous.some((g) =>
      ["sou-da-hearsay", "sou-da-appearance"].includes(g.id),
    ),
  ).toBe(false);
  expect(
    lessons([["男", ["Noun"]], ["らしい"]]).some((g) => g.id === "rashii"),
  ).toBe(false);
});

test("negative markers stop at the first predicate and at clause boundaries", () => {
  const cases: [Word[], string][] = [
    [
      [
        ["あまり", ["Adverb"]],
        ["食べない", ["Verb"], "食べる"],
      ],
      "amari-nai",
    ],
    [[["全然"], ["ない"]], "zenzen-nai"],
    [[["なかなか"], ["終わらない", ["Verb"], "終わる"]], "nakanaka-nai"],
    [[["本", ["Noun"]], ["しか"], ["読まない", ["Verb"], "読む"]], "shika-nai"],
    [
      [
        ["君", ["Pronoun"]],
        ["し"],
        ["か", ["Particle"]],
        ["見えない", ["Verb"], "見える"],
      ],
      "shika-nai",
    ],
    [
      [
        ["誰", ["Pronoun"]],
        ["も", ["Particle"]],
        ["いない", ["Verb"], "いる"],
      ],
      "nani-mo-nai-dare-mo-nai",
    ],
    [
      [["まだ"], ["読んで", ["Verb"], "読む"], ["いません", ["Verb"], "いる"]],
      "mada-te-inai",
    ],
  ];
  for (const [words, id] of cases)
    expect(lessons(words)).toContainEqual(expect.objectContaining({ id }));
  for (const [words, id] of [
    [
      [
        ["あまり"],
        ["食べる", ["Verb"], "食べる"],
        ["本", ["Noun"]],
        ["は", ["Particle"]],
        ["ない"],
      ],
      "amari-nai",
    ],
    [
      [["全然"], ["平気", ["な-adjective"]], ["です", ["Copula"]]],
      "zenzen-nai",
    ],
    [[["全然"], ["。"], ["ない"]], "zenzen-nai"],
    [
      [["本", ["Noun"]], ["しか"], ["、"], ["読まない", ["Verb"], "読む"]],
      "shika-nai",
    ],
    [[["まだ"], ["知らない", ["Verb"], "知る"]], "mada-te-inai"],
    [
      [["何も"], ["かも"], ["知らない", ["Verb"], "知る"]],
      "nani-mo-nai-dare-mo-nai",
    ],
  ] as [Word[], string][])
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
});

test("recipient roles require the first predicate to be an active transfer", () => {
  const recipient: Word[] = [
    ["母", ["Noun"]],
    ["に", ["Particle"]],
    ["本", ["Noun"]],
    ["を", ["Particle"]],
    ["渡した", ["Verb"], "渡す"],
  ];
  expect(lessons(recipient)).toContainEqual(
    expect.objectContaining({ id: "ni-indirect-object", japanese: "に" }),
  );
  recipient[4] = ["渡された", ["Verb"], "渡す"];
  expect(lessons(recipient).some((g) => g.id === "ni-indirect-object")).toBe(
    false,
  );
  const passive: Word[] = [
    ["彼女", ["Pronoun"]],
    ["に", ["Particle"]],
    ["だまされて", ["Verb"], "だます"],
    ["金", ["Noun"]],
    ["を", ["Particle"]],
    ["渡した", ["Verb"], "渡す"],
  ];
  expect(lessons(passive).some((g) => g.id === "ni-indirect-object")).toBe(
    false,
  );
});

test("without-doing, excessive actions, and action phases reject lexical lookalikes", () => {
  for (const [word, lemma, id] of [
    ["食べすぎた", "食べる", "sugiru"],
    ["書き始めた", "書く", "hajimeru-owaru-tsuzukeru"],
    ["読み続けます", "読む", "hajimeru-owaru-tsuzukeru"],
    ["読み終わった", "読む", "hajimeru-owaru-tsuzukeru"],
    ["忘れずに", "忘れる", "zu-ni"],
    ["せずに", "する", "zu-ni"],
  ])
    expect(lessons([[word!, ["Verb"], lemma]])).toContainEqual(
      expect.objectContaining({ id }),
    );
  expect(
    lessons([
      ["食べないで", ["Verb"], "食べる"],
      ["行った", ["Verb"], "行く"],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "naide" }));
  expect(
    lessons([["見ないで", ["Verb"], "見る"]]).some((g) => g.id === "naide"),
  ).toBe(false);
  expect(
    lessons([
      ["つないで", ["Verb"], "つなぐ"],
      ["行った", ["Verb"], "行く"],
    ]).some((g) => g.id === "naide"),
  ).toBe(false);
  expect(
    lessons([
      ["飾り", ["Noun"]],
      ["に", ["Particle"]],
      ["すぎない", ["Verb"], "すぎる"],
    ]).some((g) => g.id === "sugiru"),
  ).toBe(false);
  expect(
    lessons([
      ["貿易", ["Noun"]],
      ["を", ["Particle"]],
      ["始めた", ["Verb"], "始める"],
    ]).some((g) => g.id === "hajimeru-owaru-tsuzukeru"),
  ).toBe(false);
});

test("volitional, command and causative forms preserve irregular and godan conjugations", () => {
  for (const [word, lemma, id] of [
    ["書こう", "書く", "ou-you"],
    ["食べよう", "食べる", "ou-you"],
    ["来よう", "来る", "ou-you"],
    ["しよう", "する", "ou-you"],
    ["泳ごうと思います", "泳ぐ", "you-to-omou"],
    ["帰ろうとしている", "帰る", "you-to-suru"],
    ["待て", "待つ", "e-ro"],
    ["食べろ", "食べる", "e-ro"],
    ["来い", "来る", "e-ro"],
    ["しろ", "する", "e-ro"],
    ["書かせた", "書く", "seru-saseru"],
    ["食べさせます", "食べる", "seru-saseru"],
    ["来させる", "来る", "seru-saseru"],
    ["させる", "する", "seru-saseru"],
    ["話させてください", "話す", "sasete-kudasai"],
    ["見るな", "見る", "na-prohibition"],
    ["読み方", "読む", "kata"],
    ["食べたがって", "食べる", "tagaru"],
    ["読むようにしています", "読む", "you-ni-suru"],
    ["読まないようにする", "読む", "you-ni-suru"],
    ["話すようになった", "話す", "you-ni-naru"],
    ["笑わずにいられなかった", "笑う", "zu-ni-wa-irarenai"],
    ["払わずに済んだ", "払う", "zu-ni-sumu-naide-sumu"],
  ])
    expect(lessons([[word!, ["Verb"], lemma]])).toContainEqual(
      expect.objectContaining({ id, japanese: word }),
    );
  expect(
    lessons([["ください", ["Verb"], "くださる"]]).some((g) => g.id === "e-ro"),
  ).toBe(false);
  expect(
    lessons([["見る", ["Verb"], "見る"], ["な"], ["り"]]).some(
      (g) => g.id === "na-prohibition",
    ),
  ).toBe(false);
  expect(
    lessons([
      ["読む", ["Verb"], "読む"],
      ["方", ["Noun"], undefined, "ほう"],
    ]).some((g) => g.id === "kata"),
  ).toBe(false);
});

test("explicit alternatives, naming, selection and senses use noun roles", () => {
  const cases: [Word[], string][] = [
    [
      [
        ["水", ["Noun"]],
        ["か", ["Particle"]],
        ["お茶", ["Noun"]],
        ["を", ["Particle"]],
      ],
      "ka-or",
    ],
    [
      [
        ["誰", ["Pronoun"]],
        ["か", ["Particle"]],
        ["が", ["Particle"]],
      ],
      "nani-ka-dare-ka-doko-ka",
    ],
    [
      [
        ["どこ", ["Pronoun"]],
        ["か", ["Particle"]],
        ["へ", ["Particle"]],
      ],
      "nani-ka-dare-ka-doko-ka",
    ],
    [[["もう"], ["読んだ", ["Verb"], "読む"]], "mou-ta"],
    [
      [
        ["さくら", ["Noun"]],
        ["と", ["Particle"]],
        ["いう", ["Verb"]],
        ["店", ["Noun"]],
      ],
      "to-iu-named",
    ],
    [
      [
        ["コーヒー", ["Noun"]],
        ["に", ["Particle"]],
        ["します", ["Verb"], "する"],
      ],
      "ni-suru",
    ],
    [
      [
        ["音", ["Noun"]],
        ["が", ["Particle"]],
        ["した", ["Verb"], "する"],
      ],
      "ga-suru",
    ],
    [
      [["学生", ["Noun"]], ["で", ["Particle"]], ["ございます"]],
      "de-gozaimasu",
    ],
    [
      [["学生", ["Noun"]], ["な"], ["の", ["Particle"]], ["に", ["Particle"]]],
      "noni-although",
    ],
    [
      [
        ["安い", ["い-adjective"]],
        ["し", ["Particle"]],
        ["おいしい", ["い-adjective"]],
      ],
      "shi",
    ],
    [[["来る", ["Verb"]], ["か", ["Particle"]], ["な"]], "kana-kashira"],
    [
      [
        ["部屋", ["Noun"]],
        ["を", ["Particle"]],
        ["静か", ["な-adjective"]],
        ["に", ["Particle"]],
        ["する", ["Verb"]],
      ],
      "ku-suru-ni-suru",
    ],
    [
      [
        ["安く", ["い-adjective"], "安い"],
        ["した", ["Verb"], "する"],
      ],
      "ku-suru-ni-suru",
    ],
  ];
  for (const [words, id] of cases)
    expect(lessons(words)).toContainEqual(expect.objectContaining({ id }));
  for (const [words, id] of [
    [
      [
        ["何", ["Pronoun"]],
        ["か", ["Particle"]],
        ["本", ["Noun"]],
        ["を", ["Particle"]],
      ],
      "ka-or",
    ],
    [
      [
        ["何", ["Pronoun"]],
        ["か", ["Particle"]],
        ["を", ["Particle"]],
        ["知る", ["Verb"]],
      ],
      "nani-ka-dare-ka-doko-ka",
    ],
    [[["もう"], ["一冊"], ["読んだ", ["Verb"], "読む"]], "mou-ta"],
    [[["もう"], ["読まなかった", ["Verb"], "読む"]], "mou-ta"],
    [[["行く", ["Verb"]], ["という"], ["人", ["Noun"]]], "to-iu-named"],
    [
      [
        ["水", ["Noun"]],
        ["を", ["Particle"]],
        ["コーヒー", ["Noun"]],
        ["に", ["Particle"]],
        ["する", ["Verb"]],
      ],
      "ni-suru",
    ],
  ] as [Word[], string][])
    expect(lessons(words).some((g) => g.id === id)).toBe(false);
});

test("comparison constructions use both markers and the supplied 方 and 中 readings", () => {
  const first: Word[] = [
    ["犬", ["Noun"]],
    ["の", ["Particle"]],
    ["方", ["Noun"], undefined, "ほう"],
    ["が", ["Particle"]],
    ["猫", ["Noun"]],
    ["より", ["Particle"]],
    ["好き", ["な-adjective"]],
  ];
  expect(lessons(first)).toContainEqual(
    expect.objectContaining({ id: "no-hou-ga-yori", japanese: "の方が猫より" }),
  );
  first[2] = ["方", ["Noun"], undefined, "かた"];
  expect(lessons(first).some((g) => g.id === "no-hou-ga-yori")).toBe(false);
  expect(
    lessons([
      ["電車", ["Noun"]],
      ["と", ["Particle"]],
      ["バス", ["Noun"]],
      ["と", ["Particle"]],
      ["どちら"],
      ["が", ["Particle"]],
      ["安い", ["い-adjective"]],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "to-to-dochira-ga" }));
  expect(
    lessons([
      ["果物", ["Noun"]],
      ["の", ["Particle"]],
      ["中", ["Noun"], undefined, "なか"],
      ["で", ["Particle"]],
      ["りんご", ["Noun"]],
      ["が", ["Particle"]],
      ["一番", ["Adverb"]],
      ["好き", ["な-adjective"]],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "no-naka-de-ga-ichiban" }));
});

test("invitations require a shared action cue, distinct from negative questions and favor requests", () => {
  expect(
    lessons([
      ["私", ["Pronoun"]],
      ["と", ["Particle"]],
      ["一緒", ["Noun"]],
      ["に", ["Particle"]],
      ["行きません", ["Verb"], "行く"],
      ["か", ["Particle"]],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "masen-ka" }));
  expect(
    lessons([
      ["時計", ["Noun"]],
      ["は", ["Particle"]],
      ["狂いません", ["Verb"], "狂う"],
      ["か", ["Particle"]],
    ]).some((g) => g.id === "masen-ka"),
  ).toBe(false);
});

test("お + verb stem before になる is honorific, not a change of state", () => {
  const honorific = lessons([
    ["お出かけ", ["Noun"]],
    ["に", ["Particle"]],
    ["なります", ["Verb"], "なる"],
  ]);
  expect(honorific).toContainEqual(
    expect.objectContaining({
      id: "o-ni-naru",
      japanese: "お出かけになります",
    }),
  );
  expect(honorific.some((g) => g.id === "ku-naru-ni-naru")).toBe(false);
  expect(
    lessons([
      ["お金", ["Noun"]],
      ["に", ["Particle"]],
      ["なる", ["Verb"], "なる"],
    ]),
  ).toContainEqual(expect.objectContaining({ id: "ku-naru-ni-naru" }));
});

test("参考までに is a set phrase, not a deadline", () => {
  expect(
    lessons([
      ["ご参考", ["Noun"]],
      ["まで", ["Particle"]],
      ["に", ["Particle"]],
    ]).some((g) => g.id === "made-ni"),
  ).toBe(false);
});
