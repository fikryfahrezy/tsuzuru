import { expect, test } from "bun:test";
import { particleGrammar } from "../server/utils/particle-grammar";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import {
  sentenceAnswerEntries,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { primaryReading } from "../shared/sentence";
import { grammarEntries } from "../server/utils/grammar-reference";
import { grammarForBreakdown } from "../shared/grammar";
import { currentAnswerBreakdown } from "../shared/answer-entries";

type Word = [text: string, types?: string[], lemma?: string];
function fixture(words: Word[]) {
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const japanese = words.map(([word]) => word).join("");
  const sentence = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.flatMap(([word, types = [], lemma]) => {
    const start = offset;
    offset += word.length;
    if (/^[\p{P}\p{S}\s]+$/u.test(word)) return [];
    return [
      {
        japanese: word,
        kana: word,
        romaji: "",
        meanings: [],
        wordTypes: types,
        ...(lemma ? { dictionaryForm: lemma } : {}),
        start,
        end: offset,
        entryId: `ja-${start}-${offset}`,
      },
    ];
  });
  return { sentence, base };
}

test("particle roles use neighboring nouns, lexical cues, and governing predicates", () => {
  const cases: [Word[], string][] = [
    [[["私"], ["の", ["Particle"]], ["本", ["Noun"]]], "no"],
    [
      [
        ["犬", ["Noun"]],
        ["が", ["Particle"]],
        ["走る", ["Verb"]],
      ],
      "ga-subject",
    ],
    [
      [
        ["高い", ["い-adjective"]],
        ["が", ["Particle"]],
        ["安全", ["な-adjective"]],
        ["です", ["Copula"]],
      ],
      "ga-but",
    ],
    [
      [
        ["学校", ["Noun"]],
        ["に", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      "ni-destination",
    ],
    [
      [
        ["図書館", ["Noun"]],
        ["に", ["Particle"]],
        ["本", ["Noun"]],
        ["が", ["Particle"]],
        ["あります", ["Verb"], "ある"],
      ],
      "ni-location",
    ],
    [[["３時"], ["に", ["Particle"]], ["会う", ["Verb"]]], "ni-time"],
    [[["午前１０時"], ["に", ["Particle"]], ["会う", ["Verb"]]], "ni-time"],
    [
      [
        ["公園", ["Noun"]],
        ["で", ["Particle"]],
        ["遊ぶ", ["Verb"]],
      ],
      "de-place",
    ],
    [
      [
        ["電車", ["Noun"]],
        ["で", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      "de-means",
    ],
    [
      [
        ["日本語", ["Noun"]],
        ["で", ["Particle"]],
        ["話す", ["Verb"]],
      ],
      "de-means",
    ],
    [
      [
        ["ペン", ["Noun"]],
        ["で", ["Particle"]],
        ["書く", ["Verb"]],
      ],
      "de-means",
    ],
    [
      [
        ["友達", ["Noun"]],
        ["と", ["Particle"]],
        ["話す", ["Verb"]],
      ],
      "to-with",
    ],
    [
      [
        ["友達", ["Noun"]],
        ["と", ["Particle"]],
        ["一緒", ["Noun"]],
        ["に", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      "to-with",
    ],
    [
      [
        ["りんご", ["Noun"]],
        ["と", ["Particle"]],
        ["みかん", ["Noun"]],
        ["を", ["Particle"]],
        ["買う", ["Verb"]],
      ],
      "to-and",
    ],
    [
      [
        ["行く", ["Verb"]],
        ["と", ["Particle"]],
        ["思います", ["Verb"], "思う"],
      ],
      "to-omou",
    ],
    [
      [
        ["「"],
        ["はい"],
        ["」"],
        ["と", ["Particle"]],
        ["言った", ["Verb"], "言う"],
      ],
      "to-iu-say",
    ],
    [[["東京"], ["から", ["Particle"]], ["帰る", ["Verb"]]], "kara-from"],
    [
      [
        ["今", ["Noun", "Adverb"]],
        ["から", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      "kara-from",
    ],
    [
      [
        ["寒い", ["い-adjective"]],
        ["から", ["Particle"]],
        ["帰る", ["Verb"]],
      ],
      "kara-reason",
    ],
  ];
  for (const [words, expected] of cases) {
    const { sentence, base } = fixture(words);
    const matches = particleGrammar(sentence, base);
    expect(
      matches.flatMap((match) => match.grammarIds),
      sentence.reference.japanese,
    ).toContain(expected);
    const parts = withBreakdownGrammar(sentence, base, base);
    expect(
      grammarForBreakdown(grammarEntries, parts).some(
        (lesson) => lesson.id === expected,
      ),
    ).toBe(true);
  }
});

test("particles retain different roles inside the same sentence", () => {
  const { sentence, base } = fixture([
    ["私"],
    ["の", ["Particle"]],
    ["本", ["Noun"]],
    ["が", ["Particle"]],
    ["図書館", ["Noun"]],
    ["に", ["Particle"]],
    ["あります", ["Verb"], "ある"],
  ]);
  expect(
    particleGrammar(sentence, base).map((match) => match.grammarIds[0]),
  ).toEqual(["no", "ga-subject", "ni-location"]);
});

test("ambiguous, nominalized, conditional, temporal, and lexical uses are not assigned conflicting lessons", () => {
  const cases: [Word[], string[]][] = [
    [
      [
        ["泳ぐ", ["Verb"]],
        ["の", ["Particle"]],
        ["が", ["Particle"]],
        ["好き", ["な-adjective"]],
      ],
      ["no", "ga-subject"],
    ],
    [
      [["学生", ["Noun"]], ["です", ["Copula"]], ["が", ["Particle"]], ["。"]],
      ["ga-but"],
    ],
    [
      [["学校", ["Noun"]], ["に", ["Particle"]], ["。"], ["行く", ["Verb"]]],
      ["ni-destination"],
    ],
    [
      [
        ["買い", ["Verb"], "買う"],
        ["に", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      ["ni-destination"],
    ],
    [
      [
        ["授業", ["Noun"]],
        ["の", ["Particle"]],
        ["前", ["Noun"]],
        ["に", ["Particle"]],
        ["行く", ["Verb"]],
      ],
      ["ni-destination", "ni-location"],
    ],
    [
      [["三日"], ["に", ["Particle"]], ["一回"], ["走る", ["Verb"]]],
      ["ni-time"],
    ],
    [
      [
        ["学校", ["Noun"]],
        ["で", ["Particle"]],
        ["ある", ["Verb"]],
      ],
      ["de-place", "de-means"],
    ],
    [
      [
        ["電車", ["Noun"]],
        ["で", ["Particle"]],
        ["待つ", ["Verb"]],
      ],
      ["de-means"],
    ],
    [
      [
        ["友達", ["Noun"]],
        ["と", ["Particle"]],
        ["本", ["Noun"]],
        ["を", ["Particle"]],
        ["読む", ["Verb"]],
      ],
      ["to-and", "to-with"],
    ],
    [
      [
        ["本", ["Noun"]],
        ["と", ["Particle"]],
        ["いう", ["Verb"]],
        ["名前", ["Noun"]],
      ],
      ["to-iu-say", "to-and"],
    ],
    [
      [
        ["行った", ["Verb"], "行く"],
        ["と", ["Particle"]],
        ["いう", ["Verb"]],
        ["知らせ", ["Noun"]],
      ],
      ["to-iu-say"],
    ],
    [
      [
        ["春", ["Noun"]],
        ["に", ["Particle"]],
        ["なる", ["Verb"]],
        ["と", ["Particle"]],
        ["花", ["Noun"]],
        ["が", ["Particle"]],
        ["咲く", ["Verb"]],
      ],
      ["to-and", "to-with", "to-iu-say"],
    ],
    [
      [
        ["食べて", ["Verb"], "食べる"],
        ["から", ["Particle"]],
        ["帰る", ["Verb"]],
      ],
      ["kara-reason", "kara-from"],
    ],
    [
      [
        ["いない", ["Verb"], "いる"],
        ["うち", ["Noun"]],
        ["から", ["Particle"]],
        ["文句", ["Noun"]],
      ],
      ["kara-from"],
    ],
    [
      [["東京"], ["から", ["Particle"]], ["すると", ["Verb"], "する"]],
      ["kara-from", "kara-reason"],
    ],
  ];
  for (const [words, forbidden] of cases) {
    const { sentence, base } = fixture(words);
    const ids = particleGrammar(sentence, base).flatMap(
      (match) => match.grammarIds,
    );
    for (const id of forbidden)
      expect(ids, sentence.reference.japanese).not.toContain(id);
  }
});

test("particle lessons survive grouping while explicit annotations override the selected role", () => {
  const { sentence, base } = fixture([
    ["私"],
    ["の", ["Particle"]],
    ["本", ["Noun"]],
  ]);
  const grouped = [
    { ...base[0]!, japanese: "私の", entryId: "ja-0-2", end: 2 },
    base[2]!,
  ];
  expect(
    withBreakdownGrammar(sentence, grouped, base)[0]!.grammar,
  ).toContainEqual(
    expect.objectContaining({ id: "no", japanese: "の", start: 1, end: 2 }),
  );
  const override = withBreakdownGrammar(sentence, base, base, [
    { start: 0, end: 2, japanese: "私の", grammarIds: ["no"] },
  ]);
  expect(override.flatMap((part) => part.grammar ?? [])).toEqual([
    expect.objectContaining({ id: "no", start: 0, end: 2 }),
  ]);
});

test("real sentence particle roles are linked without sentence-specific grammar annotations", () => {
  for (const [id, lesson] of [
    ["154a876961aed72e4b7b86d2", "no"],
    ["0019e7d40b07e997977344ef", "ga-subject"],
    ["065360e4f598bee4d77edd98", "ga-but"],
    ["012d28ba5b91ae50a22f993e", "ni-destination"],
    ["012d28ba5b91ae50a22f993e", "ni-time"],
    ["3a8e935b555ada0c6e2a076f", "ni-location"],
    ["0ac27453a933b655e97ee162", "de-place"],
    ["094b38d904d5ab61ffda32c7", "de-means"],
    ["000459094742195f226bab0e", "to-omou"],
    ["29a65d1b934a33e9017a5f03", "to-iu-say"],
    ["0b70e1146d72d3a69cecd207", "to-and"],
    ["40f7a1a40fcc4755442ae3f3", "to-with"],
    ["1544fbf6664dde6a74bc263c", "kara-from"],
    ["0731df9acbba8f2ce78cb506", "kara-reason"],
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
    expect(
      entries
        .flatMap((part) => part.grammar ?? [])
        .some((grammar) => grammar.id === lesson),
      id,
    ).toBe(true);
    expect(
      currentAnswerBreakdown({
        answerDetailsVersion: "answer-entries-v8",
        answerBreakdown: entries,
      }),
    ).toBeUndefined();
  }
});
