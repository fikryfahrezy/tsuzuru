import { grammarForBreakdown, searchGrammar } from "../shared/grammar";
import { expect, test } from "bun:test";
import {
  answerAnnotationRecords,
  sentenceAnswerEntries,
} from "../server/utils/answer-entries";
import { grammarEntries, grammarById } from "../server/utils/grammar-reference";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import {
  answerDetailsVersion,
  currentAnswerBreakdown,
} from "../shared/answer-entries";
import { isAnswerBreakdownPart } from "../shared/practice";

const comparison = exerciseById.get("3b5ea68ada3ca9cb27ffd02d")!;
const record = answerAnnotationRecords.find(
  (entry) => entry.sentenceId === comparison.id,
)!;

test("comparison より explains the standard of comparison and how to form it", () => {
  const entry = practiceDetails(comparison).answerBreakdown.find(
    (part) => part.japanese === "より",
  )!;
  expect(entry.meanings).toEqual(["than"]);
  expect(entry.grammar).toHaveLength(1);
  expect(entry.grammar![0]).toMatchObject({
    id: "yori",
    japanese: "より",
    start: 10,
    end: 12,
    formation: grammarById.get("yori")!.formation,
    example: { ja: expect.any(String), en: expect.any(String) },
  });
  expect(entry.grammar![0]!.meaning).toContain("comparison");
});

test("multiword constructions explain the whole span once and suppress component guesses", () => {
  const request = exerciseById.get("efa5a7b6a9fe73f45005153f")!;
  const parts = practiceDetails(request).answerBreakdown;
  const grammar = parts.flatMap((part) => part.grammar ?? []);
  const construction = grammar.filter(
    (entry) => entry.id === "te-kuremasen-ka-te-itadakemasen-ka",
  );
  expect(construction).toHaveLength(1);
  expect(construction[0]!.japanese).toBe("つけていただけませんか");
  expect(
    grammar.filter((entry) =>
      ["te", "masen", "ka-question"].includes(entry.id),
    ),
  ).toEqual([]);
  expect(parts.find((part) => part.japanese === "つけて")!.grammar).toEqual(
    construction,
  );
});

test("laundry permission links the whole てもいい construction beneath やっても", () => {
  const laundry = exerciseById.get("8781e50b14468843e9839443")!;
  const parts = practiceDetails(laundry).answerBreakdown;
  const entry = parts.find((part) => part.japanese === "やっても")!;
  expect(entry.romaji).toBe("yattemo");
  expect(entry.grammar).toHaveLength(1);
  expect(entry.grammar![0]).toMatchObject({
    id: "te-mo-ii",
    japanese: "やってもいいです",
    start: 5,
    end: 13,
    pattern: "〜てもいい",
    meaning: "may; it's okay to",
    formation: "Verb-te + もいい",
    example: { ja: expect.any(String), en: expect.any(String) },
  });
  const lessons = grammarForBreakdown(grammarEntries, parts);
  expect(lessons.map((lesson) => lesson.id)).toEqual([
    "wa",
    "te-mo-ii",
    "ka-question",
  ]);
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v3",
      answerBreakdown: parts,
    }),
  ).toBeUndefined();
});

test("grammar survives phrase grouping and distinguishes nominalization from possession", () => {
  const rotation = exerciseById.get("b4b2a4b94ba7e0d81cf2f913")!;
  const parts = practiceDetails(rotation).answerBreakdown;
  expect(
    parts
      .find((part) => part.japanese === "自転している")!
      .grammar!.map((entry) => entry.id),
  ).toEqual(["te-iru"]);
  expect(
    parts
      .find((part) => part.japanese === "の")!
      .grammar!.map((entry) => entry.id),
  ).toEqual(["no-koto-nominalizer"]);
  expect(
    practiceDetails(comparison).answerBreakdown.find(
      (part) => part.japanese === "あなたの",
    )!.grammar![0]!.id,
  ).toBe("no");
});

test("verified conjugations get lessons even without a maintained grammar annotation", () => {
  const water = exerciseById.get("213aa0ae8044611b00c1ba95")!;
  const parts = practiceDetails(water).answerBreakdown;
  expect(
    parts.find((part) => part.japanese === "飲みます")!.grammar![0]!.id,
  ).toBe("masu");
  const past = practiceDetails(
    exerciseById.get("84f270754d526c50ea15a2c5")!,
  ).answerBreakdown;
  expect(past.find((part) => part.japanese === "降りた")!.grammar![0]!.id).toBe(
    "ta",
  );
  expect(parts.find((part) => part.japanese === "水")!.grammar).toBeUndefined();
});

test("every maintained annotation resolves against the shared library and actual word boundaries", () => {
  expect(grammarEntries).toHaveLength(526);
  expect(grammarById.size).toBe(grammarEntries.length);
  for (const record of answerAnnotationRecords) {
    const sentence = exerciseById.get(record.sentenceId)!;
    expect(sentence, record.sentenceId).toBeDefined();
    const details = sentenceAnswerEntries(sentence);
    expect(details.validAnnotations, record.sentenceId).toBe(true);
    const grammar = details.entries.flatMap((entry) => entry.grammar ?? []);
    for (const annotation of record.grammarAnnotations ?? []) {
      for (const id of annotation.grammarIds) {
        expect(
          grammar.some(
            (entry) =>
              entry.id === id &&
              entry.start === annotation.start &&
              entry.end === annotation.end,
          ),
          `${record.sentenceId}: ${id}`,
        ).toBe(true);
      }
    }
  }
});

test("invalid annotations discard contextual meanings and grammar while retaining automatic lessons", () => {
  for (const mutate of [
    (copy: typeof record) => {
      copy.grammarAnnotations![0]!.grammarIds = ["unknown"];
    },
    (copy: typeof record) => {
      copy.grammarAnnotations![0]!.start++;
    },
    (copy: typeof record) => {
      copy.grammarAnnotations![0]!.japanese = "other";
    },
    (copy: typeof record) => {
      copy.japanese += "！";
    },
  ]) {
    const copy = structuredClone(record);
    mutate(copy);
    const details = sentenceAnswerEntries(comparison, copy);
    expect(details.validAnnotations).toBe(false);
    expect(details.hintMappings).toEqual([]);
    expect(
      details.entries
        .flatMap((entry) => entry.grammar ?? [])
        .some((entry) => entry.id === "no"),
    ).toBe(true);
    expect(details.entries.every((entry) => entry.meanings.length === 0)).toBe(
      true,
    );
    expect(
      details.entries
        .flatMap((entry) => entry.grammar ?? [])
        .some((entry) => entry.id === "yori"),
    ).toBe(true);
  }
});

test("journal grammar round-trips and malformed nested lessons trigger a refresh", () => {
  const answerBreakdown = JSON.parse(
    JSON.stringify(practiceDetails(comparison).answerBreakdown),
  );
  expect(
    currentAnswerBreakdown({ answerDetailsVersion, answerBreakdown }),
  ).toEqual(answerBreakdown);
  const entry = answerBreakdown.find(
    (part: { japanese: string }) => part.japanese === "より",
  );
  for (const invalid of [
    null,
    {},
    { ...entry.grammar[0], formation: 5 },
    { ...entry.grammar[0], example: { ja: null, en: "" } },
  ]) {
    expect(isAnswerBreakdownPart({ ...entry, grammar: [invalid] })).toBe(false);
  }
  entry.grammar[0].start = -1;
  expect(
    currentAnswerBreakdown({ answerDetailsVersion, answerBreakdown }),
  ).toBeUndefined();
  expect(
    currentAnswerBreakdown({
      answerDetailsVersion: "answer-entries-v2",
      answerBreakdown,
    }),
  ).toBeUndefined();
});

test("practice grammar includes only linked lessons, deduplicates repeats, and follows the active sentence", () => {
  const parts = practiceDetails(comparison).answerBreakdown;
  const lessons = grammarForBreakdown(grammarEntries, parts);
  expect(lessons.map((entry) => entry.id)).toEqual([
    "wa",
    "no",
    "yori",
    "desu",
  ]);
  expect(grammarForBreakdown(grammarEntries, [...parts, ...parts])).toEqual(
    lessons,
  );
  expect(
    searchGrammar(lessons, "comparison", "all").map((entry) => entry.id),
  ).toEqual(["yori"]);

  const request = exerciseById.get("efa5a7b6a9fe73f45005153f")!;
  const next = grammarForBreakdown(
    grammarEntries,
    practiceDetails(request).answerBreakdown,
  );
  expect(
    next.some((entry) => entry.id === "te-kuremasen-ka-te-itadakemasen-ka"),
  ).toBe(true);
  expect(next.some((entry) => entry.id === "yori")).toBe(false);
  expect(grammarForBreakdown(grammarEntries, [])).toEqual([]);
  expect(grammarForBreakdown([], parts)).toEqual([]);
});
