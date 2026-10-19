import { expect, test } from "bun:test";
import { lessons, type Word } from "./helpers/grammar";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import { baseAnswerEntries } from "../server/utils/answer-entries";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";

const nobody = exerciseById.get("3dec770e61de264aa6559126")!;

test("nobody got zero retains the setting, object marker, and negative past", () => {
  const parts = practiceDetails(nobody).answerBreakdown;
  expect(parts.find((p) => p.japanese === "では")!.grammar).toContainEqual(
    expect.objectContaining({ id: "de-wa-context", japanese: "では" }),
  );
  expect(parts.find((p) => p.japanese === "だれ")!.grammar).toContainEqual(
    expect.objectContaining({
      id: "nani-mo-nai-dare-mo-nai",
      japanese: "だれも零点をとらなかった",
    }),
  );
  expect(
    parts.find((p) => p.japanese === "を")!.grammar!.map((g) => g.id),
  ).toEqual(["o"]);
  expect(
    parts.find((p) => p.japanese === "とらなかった")!.grammar!.map((g) => g.id),
  ).toEqual(["nai", "ta"]);
  const mo = parts.find((p) => p.japanese === "も")!;
  expect(mo.grammar).toBeUndefined();
  expect(mo.note).toContain("nobody");
  expect(mo.note).not.toContain("also");
});

test("negative quantifiers and scope adverbs preserve clause contents", () => {
  for (const marker of ["あまり", "全然", "なかなか"]) {
    const ids = lessons([
      [marker, ["Adverb"]],
      ["本", ["Noun"]],
      ["を", ["Particle"]],
      ["読まなかった", ["Verb"], "読む"],
    ]).map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(["o", "nai", "ta"]));
  }
  for (const who of ["誰", "だれ", "何", "なに"]) {
    const ids = lessons([
      [who, ["Pronoun"]],
      ["も", ["Particle"]],
      ["食べなかった", ["Verb"], "食べる"],
    ]).map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining(["nani-mo-nai-dare-mo-nai", "nai", "ta"]),
    );
    expect(ids).not.toContain("mo");
  }
});

test("a whole verb construction inside a scope still suppresses its own components", () => {
  const ids = lessons([
    ["誰", ["Pronoun"]],
    ["も", ["Particle"]],
    ["食べて", ["Verb"], "食べる"],
    ["は", ["Particle"]],
    ["いけない", ["Verb"], "いける"],
  ]).map((g) => g.id);
  expect(ids).toEqual(
    expect.arrayContaining(["nani-mo-nai-dare-mo-nai", "te-wa-ikenai"]),
  );
  for (const component of ["mo", "te", "wa", "nai"])
    expect(ids).not.toContain(component);
});

test("maintained clause scopes preserve their contents without changing the reviewed reading", () => {
  const base = baseAnswerEntries(nobody);
  const parts = withBreakdownGrammar(nobody, base, base, [
    {
      start: 7,
      end: 19,
      japanese: "だれも零点をとらなかった",
      grammarIds: ["nani-mo-nai-dare-mo-nai"],
    },
  ]);
  expect(
    parts.find((p) => p.japanese === "を")!.grammar!.map((g) => g.id),
  ).toEqual(["o"]);
  expect(
    parts.find((p) => p.japanese === "とらなかった")!.grammar!.map((g) => g.id),
  ).toEqual(["nai", "ta"]);
  const reviewedVerb = withBreakdownGrammar(nobody, base, base, [
    { start: 13, end: 19, japanese: "とらなかった", grammarIds: ["nai", "ta"] },
  ]);
  expect(
    reviewedVerb.find((p) => p.japanese === "だれ")!.grammar,
  ).toContainEqual(expect.objectContaining({ id: "nani-mo-nai-dare-mo-nai" }));
});

test("joined and split では explain the setting, while copula negatives do not", () => {
  for (const particles of [
    [["では", ["Particle"]]],
    [
      ["で", ["Particle"]],
      ["は", ["Particle"]],
    ],
  ] as Word[][]) {
    expect(
      lessons([
        ["学校", ["Noun"]],
        ...particles,
        ["勉強する", ["Verb"], "勉強する"],
      ]),
    ).toContainEqual(
      expect.objectContaining({ id: "de-wa-context", japanese: "では" }),
    );
    expect(
      lessons([
        ["先生", ["Noun"]],
        ...particles,
        ["ない", ["い-adjective"], "ない"],
      ]).map((g) => g.id),
    ).not.toContain("de-wa-context");
  }
  expect(
    lessons([
      ["学校", ["Noun"]],
      ["では", ["Particle"]],
      ["。"],
      ["勉強する", ["Verb"], "勉強する"],
    ]).map((g) => g.id),
  ).not.toContain("de-wa-context");
  expect(
    lessons([
      ["先生", ["Noun"]],
      ["では", ["Particle"]],
      ["なくて", [], "ない"],
      ["私", ["Pronoun"]],
      ["が", ["Particle"]],
      ["書いた", ["Verb"], "書く"],
    ]).map((g) => g.id),
  ).not.toContain("de-wa-context");
});
