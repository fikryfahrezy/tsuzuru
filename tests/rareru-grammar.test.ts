import { expect, test } from "bun:test";
import { lessons, type Word } from "./helpers/grammar";
import { exerciseById } from "../server/utils/exercises";
import { baseAnswerEntries } from "../server/utils/answer-entries";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import { practiceDetails } from "../server/utils/practice-details";

const voiceIds = new Set([
  "eru-rareru-potential",
  "reru-rareru-passive",
  "sonkeigo",
  "reru-rareru-honorific",
]);
const voices = (words: Word[], english: string) =>
  lessons(words, english)
    .filter((g) => voiceIds.has(g.id))
    .map((g) => g.id);

test("aligned English ability and passive cues disambiguate the same られる form", () => {
  const word: Word[] = [["食べられる", ["Verb"], "食べる"]];
  expect(voices(word, "I can eat.")).toEqual(["eru-rareru-potential"]);
  expect(voices(word, "It is eaten.")).toEqual(["reru-rareru-passive"]);
  for (const english of [
    "I eat.",
    "I can swim.",
    "It can be eaten.",
    "I can eat what is eaten.",
    'He said "I can eat."',
    "I can eat. It is eaten.",
  ]) {
    expect(voices(word, english), english).toEqual([]);
  }
});

test("respect requires a Japanese honorific subject and aligned active translation", () => {
  const words: Word[] = [
    ["先生", ["Noun"]],
    ["は", ["Particle"]],
    ["寿司", ["Noun"]],
    ["を", ["Particle"]],
    ["食べられます", ["Verb"], "食べる"],
  ];
  expect(voices(words, "The teacher eats sushi.")).toEqual([
    "reru-rareru-honorific",
  ]);
  expect(voices(words, "The teacher can eat sushi.")).toEqual([
    "eru-rareru-potential",
  ]);
  expect(voices(words, "The teacher is eaten.")).toEqual([]);
  expect(
    voices([["私", ["Pronoun"]], ...words.slice(1)], "I eat sushi."),
  ).toEqual([]);
});

test("contextually resolved potential forms retain negation and full constructions", () => {
  expect(
    lessons([["来られなかった", ["Verb"], "来る"]], "He couldn't come.").map(
      (g) => g.id,
    ),
  ).toEqual(["eru-rareru-potential", "nai", "ta"]);
  expect(
    lessons(
      [
        ["食べられる", ["Verb"], "食べる"],
        ["よう", ["Noun"]],
        ["に", ["Particle"]],
        ["なった", ["Verb"], "なる"],
      ],
      "I became able to eat.",
    ).map((g) => g.id),
  ).toEqual(expect.arrayContaining(["eru-rareru-potential", "you-ni-naru"]));
});

test("uncertain scope, missing morphology, and contradictory Japanese roles abstain", () => {
  expect(voices([["食べられる", ["Noun"], "食べる"]], "I can eat.")).toEqual(
    [],
  );
  expect(voices([["食べられる", ["Verb"]]], "I can eat.")).toEqual([]);
  expect(
    voices(
      [
        ["食べられる", ["Verb"], "食べる"],
        ["。"],
        ["来られる", ["Verb"], "来る"],
      ],
      "I can eat and come.",
    ),
  ).toEqual([]);
  expect(
    voices(
      [
        ["先生", ["Noun"]],
        ["に", ["Particle"]],
        ["食べられた", ["Verb"], "食べる"],
      ],
      "The teacher ate.",
    ),
  ).toEqual([]);
});

test("English infinitive passives do not establish the Japanese voice", () => {
  const words: Word[] = [["見られた", ["Verb"], "見る"]];
  for (const english of [
    "Nothing was to be seen but the sky.",
    "You're not fit to be seen.",
    "It could have been seen.",
  ]) {
    expect(voices(words, english)).toEqual([]);
  }
});

test("the recovery wish's respectful reading is maintained explicitly", () => {
  const parts = practiceDetails(
    exerciseById.get("1d669c742cd2631ef03fdba3")!,
  ).answerBreakdown;
  expect(parts.find((p) => p.japanese === "なられる")!.grammar).toContainEqual(
    expect.objectContaining({
      id: "reru-rareru-honorific",
      japanese: "なられる",
      pattern: "〜れる / 〜られる（尊敬）",
    }),
  );
});

for (const [ending, potential, passive, respectful, inflection] of [
  ["る", "I can eat.", "It is eaten.", "The teacher eats.", undefined],
  ["ます", "I can eat.", "It is eaten.", "The teacher eats.", "masu"],
  ["た", "I could eat.", "It was eaten.", "The teacher ate.", "ta"],
  ["ました", "I could eat.", "It was eaten.", "The teacher ate.", "mashita"],
  [
    "ない",
    "I cannot eat.",
    "It is not eaten.",
    "The teacher doesn't eat.",
    "nai",
  ],
  [
    "ません",
    "I can't eat.",
    "It isn't eaten.",
    "The teacher doesn't eat.",
    "masen",
  ],
  [
    "なかった",
    "I couldn't eat.",
    "It wasn't eaten.",
    "The teacher didn't eat.",
    "nai",
  ],
  [
    "ませんでした",
    "I could not eat.",
    "It was not eaten.",
    "The teacher didn't eat.",
    "masen-deshita",
  ],
] as const) {
  for (const [english, id, prefix] of [
    [potential, "eru-rareru-potential", []],
    [passive, "reru-rareru-passive", []],
    [
      respectful,
      "reru-rareru-honorific",
      [
        ["先生", ["Noun"]],
        ["は", ["Particle"]],
      ],
    ],
  ] as [string, string, Word[]][])
    test(`${id} preserves ${ending} with aligned sentence meaning`, () => {
      const ids = lessons(
        [...prefix, ["食べられ" + ending, ["Verb"], "食べる"]],
        english,
      ).map((g) => g.id);
      expect(ids.filter((value) => voiceIds.has(value))).toEqual([id]);
      if (inflection) expect(ids).toContain(inflection);
    });
}

for (const [id, word, expected] of [
  ["43beadb953c0b997e226c1ae", "来られなかった", "eru-rareru-potential"],
  ["2c15a86ec095c490e0517c67", "曲げられません", "eru-rareru-potential"],
  ["24407a96629a73335cbce783", "見つけられる", "eru-rareru-potential"],
  ["048542cf6ba46704a227607a", "並べられた", "reru-rareru-passive"],
  ["03047c05150c414f0ac252ba", "閉められる", "reru-rareru-passive"],
])
  test(`unannotated corpus resolves ${word} as ${expected}`, () => {
    const sentence = exerciseById.get(id!)!;
    const base = baseAnswerEntries(sentence);
    const grammar = withBreakdownGrammar(sentence, base, base).flatMap(
      (p) => p.grammar ?? [],
    );
    expect(grammar).toContainEqual(
      expect.objectContaining({ id: expected, japanese: word }),
    );
  });
