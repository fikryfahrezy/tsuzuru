import { expect, test } from "bun:test";
import { comparisonGrammar } from "../server/utils/comparison-grammar";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import {
  sentenceAnswerEntries,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { primaryReading } from "../shared/sentence";

type Word = [text: string, types?: string[], lemma?: string];
function fixture(words: Word[]) {
  const source = exerciseById.get("3b5ea68ada3ca9cb27ffd02d")!;
  const japanese = words.map(([word]) => word).join("");
  const sentence = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.map(([word, types = [], lemma]) => {
    const start = offset;
    offset += word.length;
    return {
      japanese: word,
      kana: word,
      romaji: "",
      meanings: [],
      wordTypes: types,
      ...(lemma ? { dictionaryForm: lemma } : {}),
      start,
      end: offset,
      entryId: `ja-${start}-${offset}`,
    };
  });
  return { sentence, base };
}

test("comparisons recognize adjectives, age, comparative verbs, and unlisted proper names", () => {
  const cases: Word[][] = [
    [
      ["兄", ["Noun"]],
      ["より", ["Particle"]],
      ["年上", ["Noun"]],
      ["です", ["Copula"]],
    ],
    [
      ["彼", ["Pronoun"]],
      ["より", ["Particle"]],
      ["劣って", ["Verb"], "劣る"],
      ["いる", ["Verb"]],
    ],
    [
      ["東京"],
      ["より", ["Particle"]],
      ["温暖", ["な-adjective", "Noun"]],
      ["です", ["Copula"]],
    ],
    [
      ["昨日", ["Noun"]],
      ["より", ["Particle"]],
      ["も", ["Particle"]],
      ["寒い", ["い-adjective"]],
    ],
    [
      ["父", ["Noun"]],
      ["より", ["Particle"]],
      ["背", ["Noun"]],
      ["が", ["Particle"]],
      ["高い", ["い-adjective"]],
    ],
  ];
  for (const words of cases) {
    const { sentence, base } = fixture(words);
    const yori = base.find((entry) => entry.japanese === "より")!;
    const mo = base.find(
      (entry) => entry.japanese === "も" && entry.start === yori.end,
    );
    expect(comparisonGrammar(sentence, base)).toEqual([
      {
        start: yori.start,
        end: mo?.end ?? yori.end,
        japanese: mo ? "よりも" : "より",
        grammarIds: ["yori"],
      },
    ]);
  }
});

test("emphatic よりも is one comparison, not より plus also", () => {
  const { sentence, base } = fixture([
    ["ケン"],
    ["より", ["Particle"]],
    ["も", ["Particle"]],
    ["二つ", ["Number"]],
    ["年上", ["Noun"]],
    ["です", ["Copula"]],
  ]);
  const lessons = withBreakdownGrammar(sentence, base, base);
  expect(lessons.flatMap((entry) => entry.grammar ?? [])).toContainEqual(
    expect.objectContaining({ id: "yori", japanese: "よりも" }),
  );
  expect(
    lessons.flatMap((entry) => entry.grammar ?? []).map((lesson) => lesson.id),
  ).not.toContain("mo");
  expect(lessons.find((entry) => entry.japanese === "も")!.note).toContain(
    "emphasis",
  );
});

test("a clause can be the standard of comparison", () => {
  for (const words of [
    [
      ["降伏", ["Noun", "Verb"]],
      ["する", ["Verb"]],
      ["より", ["Particle"]],
      ["死んだ", ["Verb"], "死ぬ"],
    ],
    [
      ["怖かった", ["い-adjective"], "怖い"],
      ["より", ["Particle"]],
      ["も", ["Particle"]],
      ["びっくり", ["Noun"]],
    ],
    [["ない"], ["より", ["Particle"]], ["は", ["Particle"]], ["よい"]],
  ] as Word[][]) {
    const { sentence, base } = fixture(words);
    expect(
      comparisonGrammar(sentence, base).map((match) => match.grammarIds),
      sentence.reference.japanese,
    ).toEqual([["yori"]]);
  }
});

test("より先に, より他に and 何より are not comparisons of degree", () => {
  for (const words of [
    [
      ["発表", ["Noun", "Verb"]],
      ["する", ["Verb"]],
      ["より", ["Particle"]],
      ["先", ["Noun"]],
      ["に", ["Particle"]],
    ],
    [
      ["する", ["Verb"]],
      ["より", ["Particle"]],
      ["他", ["Noun"]],
      ["に", ["Particle"]],
    ],
    [
      ["何", ["Pronoun"]],
      ["より", ["Particle"]],
      ["も", ["Particle"]],
      ["大切", ["な-adjective"]],
    ],
  ] as Word[][]) {
    const { sentence, base } = fixture(words);
    expect(
      comparisonGrammar(sentence, base),
      sentence.reference.japanese,
    ).toEqual([]);
  }
});

test("a noun before よりも or よりむしろ needs the English to confirm a comparison", () => {
  const words: Word[] = [
    ["先生", ["Noun"]],
    ["より", ["Particle"]],
    ["も", ["Particle"]],
    ["手紙", ["Noun"]],
    ["が", ["Particle"]],
    ["届いた", ["Verb"], "届く"],
  ];
  const { sentence, base } = fixture(words);
  expect(
    comparisonGrammar(
      { ...sentence, english: "A letter also came from the teacher." },
      base,
    ),
  ).toEqual([]);
  expect(
    comparisonGrammar(
      { ...sentence, english: "Prevention is better than cure." },
      base,
    ).map((match) => match.japanese),
  ).toEqual(["よりも"]);
});

test("source より, により, lexical substrings, punctuation, and ambiguous modifiers are not comparisons", () => {
  const cases: Word[][] = [
    [["東京"], ["より", ["Particle"]], ["来ました", ["Verb"], "来る"]],
    [
      ["東京"],
      ["より", ["Particle"]],
      ["新しい", ["い-adjective"]],
      ["商品", ["Noun"]],
      ["が", ["Particle"]],
      ["届いた", ["Verb"], "届く"],
    ],
    [
      ["要望", ["Noun"]],
      ["に", ["Particle"]],
      ["より", ["Verb"], "よる"],
      ["良い", ["い-adjective"]],
    ],
    [
      ["最寄り", ["Noun"]],
      ["の", ["Particle"]],
      ["駅", ["Noun"]],
    ],
    [
      ["より", ["Particle"]],
      ["良い", ["い-adjective"]],
    ],
    [
      ["父", ["Noun"]],
      ["より", ["Particle"]],
      ["。"],
      ["寒い", ["い-adjective"]],
    ],
    [
      ["父", ["Noun"]],
      ["より", ["Particle"]],
      ["来た", ["Verb"], "来る"],
      ["。"],
      ["寒い", ["い-adjective"]],
    ],
  ];
  for (const words of cases) {
    const { sentence, base } = fixture(words);
    expect(
      comparisonGrammar(sentence, base),
      sentence.reference.japanese,
    ).toEqual([]);
  }
});

test("comparison lessons survive grouping and explicit annotations retain priority", () => {
  const { sentence, base } = fixture([
    ["兄", ["Noun"]],
    ["より", ["Particle"]],
    ["年上", ["Noun"]],
  ]);
  const grouped = [
    { ...base[0]!, japanese: "兄より", end: 3, entryId: "ja-0-3" },
    base[2]!,
  ];
  expect(
    withBreakdownGrammar(sentence, grouped, base)[0]!.grammar,
  ).toContainEqual(expect.objectContaining({ id: "yori", start: 1, end: 3 }));
  const result = withBreakdownGrammar(sentence, base, base, [
    { start: 0, end: 3, japanese: "兄より", grammarIds: ["yori"] },
  ]);
  expect(result.flatMap((entry) => entry.grammar ?? [])).toEqual([
    expect.objectContaining({ id: "yori", start: 0, end: 3 }),
  ]);
});

test("real comparison sentences need no maintained grammar annotation", () => {
  for (const id of [
    "3b5ea68ada3ca9cb27ffd02d",
    "0028ff5e1ccfd69a615c5240",
    "1db36fc2d1d3449ee97c7e0e",
  ]) {
    const sentence = exerciseById.get(id)!;
    const { entries } = sentenceAnswerEntries(sentence, {
      sentenceId: id,
      english: sentence.english,
      japanese: sentence.reference.japanese,
      furigana: primaryReading(sentence.reference).furigana,
      answerEntries: [],
      hintMappings: [],
    });
    expect(
      entries.find((entry) => entry.japanese === "より")!.grammar,
    ).toContainEqual(expect.objectContaining({ id: "yori" }));
  }
});
