import { expect, test } from "bun:test";
import { lessons, type Word } from "./helpers/grammar";

// Independent examples spanning godan consonant changes and both tokenizer
// conventions: the original dictionary verb and its derived potential lemma.
const verbs = [
  ["読む", "読める", "読め"],
  ["書く", "書ける", "書け"],
  ["話す", "話せる", "話せ"],
  ["泳ぐ", "泳げる", "泳げ"],
  ["買う", "買える", "買え"],
  ["走る", "走れる", "走れ"],
  ["待つ", "待てる", "待て"],
  ["呼ぶ", "呼べる", "呼べ"],
];
const forms: [string, string[]][] = [
  ["る", []],
  ["ます", ["masu"]],
  ["た", ["ta"]],
  ["ました", ["mashita"]],
  ["ない", ["nai"]],
  ["ません", ["masen"]],
  ["なかった", ["nai", "ta"]],
  ["ませんでした", ["masen-deshita"]],
  ["て", ["te"]],
  ["れば", ["ba"]],
  ["なければ", ["ba"]],
  ["たら", ["tara"]],
  ["なかったら", ["tara"]],
];

for (const [original, potential, stem] of verbs) {
  for (const lemma of [original!, potential!]) {
    for (const [ending, expected] of forms) {
      test(`${stem}${ending} explains potential and its inflection (${lemma})`, () => {
        expect(
          lessons([[stem + ending, ["Verb"], lemma]]).map((g) => g.id),
        ).toEqual(
          expect.arrayContaining(["eru-rareru-potential", ...expected]),
        );
      });
    }
    for (const [ending, tail, construction] of [
      [
        "る",
        [
          ["よう", ["Noun"]],
          ["に", ["Particle"]],
          ["なった", ["Verb"], "なる"],
        ],
        "you-ni-naru",
      ],
      [
        "ない",
        [
          ["よう", ["Noun"]],
          ["に", ["Particle"]],
          ["なった", ["Verb"], "なる"],
        ],
        "you-ni-naru",
      ],
      [
        "て",
        [
          ["も", ["Particle"]],
          ["いい", ["い-adjective"], "いい"],
        ],
        "te-mo-ii",
      ],
    ] as [string, Word[], string][]) {
      test(`${stem}${ending} retains potential inside ${construction} (${lemma})`, () => {
        const ids = lessons([[stem + ending, ["Verb"], lemma], ...tail]).map(
          (g) => g.id,
        );
        expect(ids).toEqual(
          expect.arrayContaining(["eru-rareru-potential", construction]),
        );
        expect(ids).not.toContain("ku-naru-ni-naru");
        expect(ids).not.toContain("te");
      });
    }
  }
}

test("ambiguous lexical and られる forms do not acquire automatic potential readings", () => {
  for (const [word, lemma] of [
    ["切れない", "切れる"],
    ["売れたら", "売れる"],
    ["開ける", "開ける"],
    ["食べられる", "食べる"],
    ["来られない", "来る"],
    ["できた", "できる"],
  ]) {
    expect(lessons([[word!, ["Verb"], lemma]]).map((g) => g.id)).not.toContain(
      "eru-rareru-potential",
    );
  }
});

test("split potential predicates retain negative, past, and polite endings", () => {
  for (const [ending, ids] of [
    ["ない", ["nai"]],
    ["なかった", ["nai", "ta"]],
    ["ません", ["masen"]],
    ["ました", ["mashita"]],
  ] as [string, string[]][]) {
    const grammar = lessons([
      ["読め", ["Verb"], "読める"],
      [ending, ["Auxiliary"]],
    ]);
    expect(grammar.map((g) => g.id)).toEqual(
      expect.arrayContaining(["eru-rareru-potential", ...ids]),
    );
    expect(
      grammar.every((g) => g.start === 0 && g.end === ("読め" + ending).length),
    ).toBe(true);
  }
  expect(lessons([["読めない", ["Verb"]]]).map((g) => g.id)).toEqual([
    "eru-rareru-potential",
    "nai",
  ]);
});

test("an e-row stem alone does not turn commands or godan conditionals into potential verbs", () => {
  for (const [word, lemma, expected] of [
    ["待て", "待つ", "e-ro"],
    ["読めば", "読む", "ba"],
    ["読めば読むほど", "読む", "ba-hodo"],
  ]) {
    const ids = lessons([[word!, ["Verb"], lemma]]).map((g) => g.id);
    expect(ids).toContain(expected!);
    expect(ids).not.toContain("eru-rareru-potential");
  }
});
