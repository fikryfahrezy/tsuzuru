import { expect, test } from "bun:test";
import { lessons, type Word } from "./helpers/grammar";

const subject: Word[] = [
  ["メガネ", ["Noun"]],
  ["が", ["Particle"]],
  ["なくて", [], "ない"],
];

test("existential negative conditions need は and a following negative predicate", () => {
  const found = lessons([
    ...subject,
    ["は", ["Particle"]],
    ["読めない", ["Verb"], "読める"],
  ]);
  expect(found.map((g) => g.id)).toEqual([
    "ga-subject",
    "nakute-wa-condition",
    "eru-rareru-potential",
    "nai",
  ]);
  for (const following of [
    [
      ["は", ["Particle"]],
      ["困る", ["Verb"], "困る"],
    ],
    [
      ["は", ["Particle"]],
      ["いけない", ["Verb"], "いける"],
    ],
    [
      ["は", ["Particle"]],
      ["ならない", ["Verb"], "なる"],
    ],
    [
      ["は", ["Particle"]],
      ["いけなかった", ["Verb"], "いける"],
    ],
    [["読めない", ["Verb"], "読める"]],
    [["。"], ["は", ["Particle"]], ["読めない", ["Verb"], "読める"]],
  ] as Word[][]) {
    expect(lessons([...subject, ...following]).map((g) => g.id)).not.toContain(
      "nakute-wa-condition",
    );
  }
});

test("potential negation stays distinct from affirmative and lexical verbs", () => {
  expect(lessons([["読める", ["Verb"], "読める"]]).map((g) => g.id)).toEqual([
    "eru-rareru-potential",
  ]);
  const lexical = lessons([["切れない", ["Verb"], "切れる"]]).map((g) => g.id);
  expect(lexical).toContain("nai");
  expect(lexical).not.toContain("eru-rareru-potential");
});

test("potential predicates retain their negative, tense, and polite endings", () => {
  for (const [word, ids] of [
    ["読めない", ["nai"]],
    ["読めません", ["masen"]],
    ["読めなかった", ["nai", "ta"]],
    ["読めませんでした", ["masen-deshita"]],
    ["読めます", ["masu"]],
    ["読めました", ["mashita"]],
    ["読めた", ["ta"]],
    ["読めて", ["te"]],
  ] as [string, string[]][]) {
    expect(lessons([[word, ["Verb"], "読める"]]).map((g) => g.id)).toEqual([
      "eru-rareru-potential",
      ...ids,
    ]);
  }
  expect(
    lessons([["食べなかった", ["Verb"], "食べる"]]).map((g) => g.id),
  ).toEqual(["nai", "ta"]);
  expect(lessons([["できない", ["Verb"], "できる"]]).map((g) => g.id)).toEqual([
    "eru-rareru-potential",
    "nai",
  ]);
});

test("a comma after なくては preserves its condition but a sentence break does not", () => {
  for (const [punctuation, expected] of [
    ["、", true],
    [",", true],
    ["。", false],
    ["！", false],
  ] as const) {
    const grammar = lessons([
      ...subject,
      ["は", ["Particle"]],
      [punctuation],
      ["読めない", ["Verb"], "読める"],
    ]);
    expect(grammar.some((g) => g.id === "nakute-wa-condition")).toBe(expected);
    expect(grammar.some((g) => g.id === "wa")).toBe(!expected);
  }
});

test("layering does not add components beneath a whole construction", () => {
  const grammar = lessons([
    ["読んで", ["Verb"], "読む"],
    ["も", ["Particle"]],
    ["いい", ["い-adjective"], "いい"],
  ]).map((g) => g.id);
  expect(grammar).toContain("te-mo-ii");
  expect(grammar).not.toContain("te");
  expect(grammar).not.toContain("eru-rareru-potential");
});

test("passive and honorific predicates retain their inflections too", () => {
  expect(
    lessons([
      ["先生", ["Noun"]],
      ["に", ["Particle"]],
      ["責められなかった", ["Verb"], "責める"],
    ])
      .filter((g) => g.japanese === "責められなかった")
      .map((g) => g.id),
  ).toEqual(["reru-rareru-passive", "nai", "ta"]);
  expect(
    lessons([["おっしゃいました", ["Verb"], "おっしゃる"]]).map((g) => g.id),
  ).toEqual(["sonkeigo", "mashita"]);
  expect(
    lessons([["できた", ["Verb"], "できる"]]).map((g) => g.id),
  ).not.toContain("eru-rareru-potential");
});
