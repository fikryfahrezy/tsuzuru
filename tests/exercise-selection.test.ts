import { expect, test } from "bun:test";
import { createApp, toWebHandler } from "h3";
import exerciseHandler from "../server/api/exercises.get";
import compareHandler from "../server/api/compare.post";
import {
  HintSource,
  isWithinLevel,
  lengthOf,
  Level,
  levels,
  Strictness,
} from "../shared/practice";
import { spellingOptions } from "../shared/writing-spellings";
import { romajiHint } from "../shared/romaji";
import { practiceDetails } from "../server/utils/practice-details";
import {
  candidateById,
  defaultBanks,
  exerciseById,
  exercises,
  loadSentence,
} from "../server/utils/exercises";
import { answerChips } from "../server/utils/answer-chips";

function api() {
  const app = createApp();
  app.use("/api/exercises", exerciseHandler);
  app.use("/api/compare", compareHandler);
  return toWebHandler(app);
}

test("sentence selection loads a dataset entry regardless of filters or previous ID", async () => {
  const handle = api();
  const selected = exerciseById.get("213aa0ae8044611b00c1ba95")!;
  expect(selected.english).toBe("Most Japanese drink water from the tap.");
  const url = `http://localhost/api/exercises?sentence=${selected.id}`;
  for (const suffix of [
    "",
    `&previous=${selected.id}`,
    "&level=N1&length=long",
  ]) {
    const response = await handle(new Request(url + suffix));
    expect(response.status).toBe(200);
    const question = await response.json();
    expect(question.answerBreakdown).toEqual(
      practiceDetails(selected).answerBreakdown,
    );
    expect(
      question.wordBank.map((chip: unknown) => JSON.stringify(chip)).sort(),
    ).toEqual(
      answerChips(selected)
        .map((chip) => JSON.stringify(chip))
        .sort(),
    );
    expect(question).toMatchObject({
      id: selected.id,
      english: selected.english,
      romaji: romajiHint(selected),
      wordHints: practiceDetails(selected).wordHints,
      wordCount: selected.englishWordCount,
      level: selected.level,
      poolSize: 1,
      spellingOptions: spellingOptions(selected),
    });
  }
  const response = await handle(
    new Request("http://localhost/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        answer: selected.reference.japanese,
        mode: Strictness.Flexible,
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    matched: true,
    reference: selected.reference.japanese,
  });
});

test("invalid IDs fail explicitly and requests without IDs still select from the bank", async () => {
  const handle = api();
  for (const [query, status] of [
    ["sentence=unknown", 404],
    ["sentence=example-water", 404],
    ["sentence=", 400],
    ["sentence=a&sentence=b", 400],
  ] as const) {
    const response = await handle(
      new Request(`http://localhost/api/exercises?${query}`),
    );
    expect(response.status).toBe(status);
  }
  const random = await handle(
    new Request("http://localhost/api/exercises?level=N5&length=short"),
  );
  expect(random.status).toBe(200);
  const question = await random.json();
  const candidate = exerciseById.get(question.id)!;
  expect(candidate).toBeDefined();
  expect(question.spellingOptions).toEqual(spellingOptions(candidate));
  expect(question.answerBreakdown).toEqual(
    practiceDetails(candidate).answerBreakdown,
  );
});

test("sentence API delivers contextual and separated phrase hints", async () => {
  const handle = api();
  const waking = await handle(
    new Request(
      "http://localhost/api/exercises?sentence=45dee2bd33974022d4c206b8",
    ),
  );
  expect(waking.status).toBe(200);
  expect((await waking.json()).wordHints).toContainEqual({
    text: "got up",
    isWord: true,
    phrase: "got up",
    hintSource: HintSource.Sentence,
    hints: [
      {
        answerEntryId: "ja-4-7",
        japanese: "起きた",
        reading: "おきた",
        romaji: "okita",
        meaning: "got up (past)",
      },
    ],
  });
  const separated = await handle(
    new Request(
      "http://localhost/api/exercises?sentence=efa5a7b6a9fe73f45005153f",
    ),
  );
  expect(separated.status).toBe(200);
  const question = await separated.json();
  expect(
    question.wordHints.filter(
      (part: { phrase?: string }) => part.phrase === "turn … on",
    ),
  ).toHaveLength(2);
});

test("random sentences never use vocabulary above the chosen level", async () => {
  const handle = api();
  for (const level of levels) {
    for (let draw = 0; draw < 20; draw++) {
      const response = await handle(
        new Request(
          `http://localhost/api/exercises?level=${level}&length=short`,
        ),
      );
      const sentence = exerciseById.get((await response.json()).id)!;
      expect(sentence.level).not.toBeNull();
      expect(isWithinLevel(sentence.level!, level)).toBe(true);
    }
  }
});

test("levels are cumulative, so each pool contains every easier pool", async () => {
  const handle = api();
  const poolSize = async (level: string) =>
    (
      await (
        await handle(
          new Request(
            `http://localhost/api/exercises?level=${level}&length=short`,
          ),
        )
      ).json()
    ).poolSize;
  const sizes = await Promise.all(levels.map(poolSize));
  expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  expect(sizes.at(-1)).toBe(
    exercises.filter((row) => lengthOf(row.englishWordCount) === "short")
      .length,
  );
});

test("a sentence graded above its vocabulary target leaves the lower pool", () => {
  // 工作 is listed at N1, so this sentence is never offered at N5.
  const handiwork = exerciseById.get("0000978f3525f2d6e60e600b")!;
  expect(handiwork.level).toBe(Level.N1);
  expect(isWithinLevel(handiwork.level!, Level.N5)).toBe(false);
});

test("a stale or missing grade keeps the sentence out of level selection", () => {
  const record = candidateById.get("0000978f3525f2d6e60e600b")!;
  expect(loadSentence(record, defaultBanks)?.level).toBe(Level.N1);
  const bank = structuredClone(defaultBanks.sentenceLevels!);
  bank.entries[record.id]!.sourceJapanese += "！";
  expect(
    loadSentence(record, { ...defaultBanks, sentenceLevels: bank })?.level,
  ).toBeNull();
  expect(loadSentence(record)?.level).toBeNull();
});
