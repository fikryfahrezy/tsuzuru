import { expect, test } from "bun:test";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import type { AnswerEntry } from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { currentAnswerBreakdown } from "../shared/answer-entries";

type Word = [text: string, types?: string[], lemma?: string, kana?: string];
function fixture(words: Word[]) {
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const japanese = words.map(([word]) => word).join("");
  const sentence = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.flatMap(
    ([word, types = [], lemma, kana = word]) => {
      const start = offset;
      offset += word.length;
      if (/^[\p{P}\p{S}\s]+$/u.test(word)) return [];
      return [
        {
          japanese: word,
          kana,
          romaji: "",
          meanings: [],
          wordTypes: types,
          ...(lemma ? { dictionaryForm: lemma } : {}),
          start,
          end: offset,
          entryId: `ja-${start}-${offset}`,
        },
      ];
    },
  );
  return { sentence, base };
}
function lessons(words: Word[]) {
  const { sentence, base } = fixture(words);
  return withBreakdownGrammar(sentence, base, base).flatMap(
    (part) => part.grammar ?? [],
  );
}

test("likes, skills, and existence link whole predicates including negatives and quantities", () => {
  const cases: [Word[], string, string][] = [
    [
      [
        ["本", ["Noun"]],
        ["が", ["Particle"]],
        ["好き", ["な-adjective"]],
        ["です", ["Copula"]],
      ],
      "ga-suki-ga-kirai",
      "が好きです",
    ],
    [
      [
        ["野菜", ["Noun"]],
        ["が", ["Particle"]],
        ["嫌い", ["な-adjective"]],
        ["ではありません"],
      ],
      "ga-suki-ga-kirai",
      "が嫌いではありません",
    ],
    [
      [
        ["泳ぐ", ["Verb"]],
        ["の", ["Particle"]],
        ["が", ["Particle"]],
        ["大好き", ["な-adjective"]],
      ],
      "ga-suki-ga-kirai",
      "が大好き",
    ],
    [
      [
        ["歌", ["Noun"]],
        ["が", ["Particle"]],
        ["上手", ["な-adjective"], undefined, "じょうず"],
        ["だった", ["Copula"]],
      ],
      "ga-jouzu-ga-heta",
      "が上手だった",
    ],
    [
      [
        ["ペン", ["Noun"]],
        ["が", ["Particle"]],
        ["二本"],
        ["あります", ["Verb"], "ある"],
      ],
      "ga-aru-ga-iru",
      "が二本あります",
    ],
    [
      [
        ["妹", ["Noun"]],
        ["が", ["Particle"]],
        ["一人"],
        ["います", ["Verb"], "いる"],
      ],
      "ga-aru-ga-iru",
      "が一人います",
    ],
    [
      [
        ["本", ["Noun"]],
        ["が", ["Particle"]],
        ["ありません", ["Verb"], "ある"],
      ],
      "ga-aru-ga-iru",
      "がありません",
    ],
  ];
  for (const [words, id, japanese] of cases) {
    const found = lessons(words);
    expect(found).toContainEqual(expect.objectContaining({ id, japanese }));
    expect(found.some((g) => g.id === "ga-subject")).toBe(false);
  }
});

test("whether, possibility, and thing requests preserve word boundaries and optional counters", () => {
  for (const [words, id, japanese] of [
    [
      [
        ["学生", ["Noun"]],
        ["か", ["Particle"]],
        ["どう", ["Adverb"]],
        ["か", ["Particle"]],
      ],
      "ka-dou-ka",
      "かどうか",
    ],
    [
      [
        ["雨", ["Noun"]],
        ["か", ["Particle"]],
        ["も", ["Particle"]],
        ["しれません", ["Verb"], "しれる"],
      ],
      "kamo-shirenai",
      "かもしれません",
    ],
    [
      [
        ["行く", ["Verb"]],
        ["か", ["Particle"]],
        ["も", ["Particle"]],
        ["知れない", ["Verb"], "知れる"],
      ],
      "kamo-shirenai",
      "かも知れない",
    ],
    [
      [
        ["水", ["Noun"]],
        ["を", ["Particle"]],
        ["三杯"],
        ["ください", ["Verb"], "くださる"],
      ],
      "o-kudasai",
      "を三杯ください",
    ],
  ] as [Word[], string, string][]) {
    expect(lessons(words)).toContainEqual(
      expect.objectContaining({ id, japanese }),
    );
  }
});

test("easy and hard actions conjugate, and deliberate states require a transitive reading", () => {
  for (const [word, lemma, kana, id] of [
    ["書きやすかったです", "書く", "かきやすかったです", "yasui-nikui"],
    ["食べにくくない", "食べる", "たべにくくない", "yasui-nikui"],
    ["置いてあります", "置く", "おいてあります", "te-aru"],
    ["開いてある", "開く", "ひらいてある", "te-aru"],
  ]) {
    expect(lessons([[word!, ["Verb"], lemma, kana]])).toContainEqual(
      expect.objectContaining({ id, japanese: word }),
    );
  }
  // 開く has both あく (intransitive) and ひらく (transitive) readings.
  expect(
    lessons([["開いてある", ["Verb"], "開く", "あいてある"]]).some(
      (g) => g.id === "te-aru",
    ),
  ).toBe(false);
  const contracted = lessons([["読んでない", ["Verb"], "読む", "よんでない"]]);
  expect(contracted.some((g) => g.id === "te-iru")).toBe(true);
  expect(contracted.some((g) => g.id === "te-aru")).toBe(false);
});

test("lexical lookalikes, stage readings, bare stems, action requests, and copulas stay separate", () => {
  const cases: [Word[], string][] = [
    [
      [
        ["彼", ["Pronoun"]],
        ["が", ["Particle"]],
        ["好き勝手", ["Noun"]],
      ],
      "ga-suki-ga-kirai",
    ],
    [
      [
        ["舞台", ["Noun"]],
        ["が", ["Particle"]],
        ["上手", ["Noun"], undefined, "かみて"],
      ],
      "ga-jouzu-ga-heta",
    ],
    [
      [["書き", ["Verb"], "書く"], ["か", ["Particle"]], ["どうか"]],
      "ka-dou-ka",
    ],
    [
      [
        ["暑く", ["い-adjective"], "暑い"],
        ["か", ["Particle"]],
        ["もしれない"],
      ],
      "kamo-shirenai",
    ],
    [
      [
        ["本", ["Noun"]],
        ["を", ["Particle"]],
        ["三回"],
        ["ください", ["Verb"], "くださる"],
      ],
      "o-kudasai",
    ],
    [
      [
        ["水", ["Noun"]],
        ["を", ["Particle"]],
        ["飲んで", ["Verb"], "飲む"],
        ["ください", ["Verb"], "くださる"],
      ],
      "o-kudasai",
    ],
    [
      [
        ["買う", ["Verb"]],
        ["と", ["Particle"]],
        ["やすい", ["い-adjective"]],
      ],
      "yasui-nikui",
    ],
    [
      [
        ["学生", ["Noun"]],
        ["で", ["Particle"]],
        ["ある", ["Verb"]],
      ],
      "te-aru",
    ],
    [[["歩いてある", ["Verb"], "歩く", "あるいてある"]], "te-aru"],
    [
      [["本", ["Noun"]], ["が", ["Particle"]], ["。"], ["ある", ["Verb"]]],
      "ga-aru-ga-iru",
    ],
    [
      [["水", ["Noun"]], ["を", ["Particle"]], ["くださいませ"], ["ん"]],
      "o-kudasai",
    ],
  ];
  for (const [words, forbidden] of cases)
    expect(
      lessons(words).some((g) => g.id === forbidden),
      words.map(([w]) => w).join(""),
    ).toBe(false);
});

test("explicit annotations retain priority and older saved breakdowns refresh", () => {
  const { sentence, base } = fixture([
    ["本", ["Noun"]],
    ["が", ["Particle"]],
    ["ある", ["Verb"]],
  ]);
  const result = withBreakdownGrammar(sentence, base, base, [
    { start: 1, end: 4, japanese: "がある", grammarIds: ["ga-aru-ga-iru"] },
  ]);
  expect(
    result
      .flatMap((p) => p.grammar ?? [])
      .filter((g) => g.id === "ga-aru-ga-iru"),
  ).toHaveLength(1);
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v10",
      answerBreakdown: result,
    }),
  ).toBeUndefined();
});
