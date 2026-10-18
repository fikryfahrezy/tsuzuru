import { expect, test } from "bun:test";
import { questionGrammar } from "../server/utils/question-grammar";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import {
  answerAnnotationRecords,
  type AnswerEntry,
} from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import { currentAnswerBreakdown } from "../shared/answer-entries";

type Word = [text: string, types?: string[], lemma?: string];
function fixture(words: Word[], ending = "。") {
  const source = exerciseById.get("8781e50b14468843e9839443")!;
  const japanese = words.map(([text]) => text).join("") + ending;
  const sentence = { ...source, reference: { ...source.reference, japanese } };
  let offset = 0;
  const base: AnswerEntry[] = words.map(([text, types, lemma]) => {
    const start = offset;
    offset += text.length;
    return {
      japanese: text,
      kana: text,
      romaji: "",
      meanings: [],
      wordTypes: types ?? (text === "か" ? ["Particle"] : []),
      ...(lemma ? { dictionaryForm: lemma } : {}),
      start,
      end: offset,
      entryId: `ja-${start}-${offset}`,
    };
  });
  return { sentence, base };
}

test("question か follows predicates with sentence punctuation, quotes, or no punctuation", () => {
  const cases: Word[][] = [
    [["学生", ["Noun"]], ["です", ["Copula"]], ["か"]],
    [["行く", ["Verb"]], ["か"]],
    [["高い", ["い-adjective"]], ["か"]],
    [["いいです", [], "いい"], ["か"]],
    [["もらえます", [], "もらえる"], ["か"]],
    [["行く", ["Verb"]], ["の", ["Particle"]], ["か"]],
    [["行った", ["Verb"], "行く"], ["ん"], ["か"]],
    [["行く", ["Verb"]], ["だろう"], ["か"]],
  ];
  for (const words of cases) {
    for (const ending of [
      "。",
      "？",
      "?",
      "",
      "」と聞いた。",
      "。次の文です。",
    ]) {
      const { sentence, base } = fixture(words, ending);
      const ka = base.at(-1)!;
      expect(
        questionGrammar(sentence, base),
        sentence.reference.japanese,
      ).toEqual([
        {
          start: ka.start,
          end: ka.end,
          japanese: "か",
          grammarIds: ["ka-question"],
        },
      ]);
    }
  }
});

test("indefinites, alternatives, embedded questions, and uncertain fragments stay unclassified", () => {
  const cases: Word[][] = [
    [["何", ["Pronoun"]], ["か"]],
    [["誰", ["Pronoun"]], ["か"]],
    [["どこ", ["Pronoun"]], ["か"]],
    [["紅茶", ["Noun"]], ["か"], ["コーヒー", ["Noun"]]],
    [["行く", ["Verb"]], ["か"], ["どう"], ["か"]],
    [["行く", ["Verb"]], ["か"], ["分からない", ["Verb"], "分かる"]],
    [["洗濯", ["Noun", "Verb"]], ["か"]],
    [["未知です"], ["か"]],
    [["学生", ["Noun"]], ["の", ["Particle"]], ["か"]],
    [["行く", ["Verb"]], ["、"], ["か"]],
    [["行く", ["Verb"]], ["かしら"]],
    [
      ["行く", ["Verb"]],
      ["か", ["Noun"]],
    ],
  ];
  for (const words of cases) {
    for (const ending of ["。", "？"]) {
      const { sentence, base } = fixture(words, ending);
      expect(
        questionGrammar(sentence, base),
        sentence.reference.japanese,
      ).toEqual([]);
    }
  }
});

test("question lessons survive grouping and respect explicit construction annotations", () => {
  const { sentence, base } = fixture([["です", ["Copula"]], ["か"]]);
  const grouped = [
    { ...base[0]!, japanese: "ですか", end: 3, entryId: "ja-0-3" },
  ];
  expect(
    withBreakdownGrammar(sentence, grouped, base)[0]!.grammar,
  ).toContainEqual(
    expect.objectContaining({ id: "ka-question", start: 2, end: 3 }),
  );
  const annotated = withBreakdownGrammar(sentence, base, base, [
    { start: 0, end: 3, japanese: "ですか", grammarIds: ["ka-question"] },
  ]);
  expect(annotated.flatMap((p) => p.grammar ?? [])).toEqual([
    expect.objectContaining({ id: "ka-question", start: 0, end: 3 }),
  ]);
});

test("real questions get lessons while an earlier alternative か does not", () => {
  for (const id of [
    "8781e50b14468843e9839443",
    "0364a0abf8ed1efcc797071b",
    "037ecf536cc433ef401f94da",
    "2f1274f2824a0a9debc270ab",
  ]) {
    const s = exerciseById.get(id)!;
    const parts = practiceDetails(s).answerBreakdown;
    const questions = parts
      .flatMap((p) => p.grammar ?? [])
      .filter((g) => g.id === "ka-question");
    expect(questions).toHaveLength(1);
    expect(questions[0]!.start).toBe(s.reference.japanese.lastIndexOf("か"));
  }
  expect(
    answerAnnotationRecords.some(
      (r) => r.sentenceId === "8781e50b14468843e9839443",
    ),
  ).toBe(false);
  const parts = practiceDetails(
    exerciseById.get("8781e50b14468843e9839443")!,
  ).answerBreakdown;
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v5",
      answerBreakdown: parts,
    }),
  ).toBeUndefined();
});
