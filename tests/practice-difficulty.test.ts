import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, h, type Component } from "vue";
import { renderToString } from "@vue/server-renderer";
import { exerciseById } from "../server/utils/exercises";
import { practiceDetails } from "../server/utils/practice-details";
import { spellingOptions } from "../shared/writing-spellings";
import { answerDetailsVersion } from "../shared/answer-entries";
import {
  PracticeDifficulty,
  PracticePermission,
  difficultyPermissions,
  hasPracticePermission,
  isPracticeDifficulty,
} from "../shared/practice-difficulty";
import {
  Length,
  Level,
  Strictness,
  type Comparison,
  type Question,
} from "../shared/practice";

const directory = mkdtempSync(join(tmpdir(), "tsuzuru-difficulty-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

// Compile real Vue templates so the policy is also checked at the UI boundaries.
function writeModule(name: string, source: string) {
  const imports: Record<string, string> = {
    vue: import.meta.resolve("vue"),
    sortablejs: import.meta.resolve("sortablejs"),
    ofetch: import.meta.resolve("ofetch"),
    "#shared/answer-entries": new URL(
      "../shared/answer-entries.ts",
      import.meta.url,
    ).href,
    "#shared/practice": new URL("../shared/practice.ts", import.meta.url).href,
    "#shared/practice-difficulty": new URL(
      "../shared/practice-difficulty.ts",
      import.meta.url,
    ).href,
    "~/utils/practice": pathToFileURL(join(directory, "practice.ts")).href,
    "~/utils/answer-breakdown": new URL(
      "../app/utils/answer-breakdown.ts",
      import.meta.url,
    ).href,
  };
  const rewritten = source.replace(
    /from (["'])([^"']+)\1/gu,
    (original, _quote, specifier: string) =>
      imports[specifier]
        ? `from ${JSON.stringify(imports[specifier])}`
        : original,
  );
  const file = join(directory, `${name}.ts`);
  writeFileSync(file, rewritten);
  return pathToFileURL(file).href;
}

writeModule(
  "practice",
  readFileSync(new URL("../app/utils/practice.ts", import.meta.url), "utf8"),
);
function component(name: string) {
  const source = readFileSync(
    new URL(`../app/components/${name}.vue`, import.meta.url),
    "utf8",
  );
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: name, inlineTemplate: true });
  return writeModule(name, script.content);
}
let Prompt: Component;
let Card: Component;
let Feedback: Component;
let Breakdown: Component;
let Settings: Component;
let Spellings: Component;
let JournalEntry: Component;
let AttemptOutcome: Component;

beforeAll(async () => {
  const modules = [
    "PracticePrompt",
    "PracticeWritingCard",
    "PracticeFeedback",
    "AnswerBreakdown",
    "PracticeSettings",
    "AcceptedSpellings",
    "PracticeJournalEntry",
    "PracticeAttemptOutcome",
  ].map(component);
  [
    Prompt,
    Card,
    Feedback,
    Breakdown,
    Settings,
    Spellings,
    JournalEntry,
    AttemptOutcome,
  ] = await Promise.all(
    modules.map(async (url) => (await import(url)).default),
  );
});

const question: Question = {
  id: "water",
  english: "Water",
  romaji: "mizu",
  wordHints: [
    {
      text: "Water",
      isWord: true,
      hints: [
        { japanese: "水", reading: "みず", romaji: "mizu", meaning: "water" },
      ],
    },
  ],
  wordCount: 1,
  level: null,
  poolSize: 1,
  alternativeCount: 0,
  spellingOptions: [],
  wordBank: [{ japanese: "水", kana: "みず" }],
  answerBreakdown: [
    {
      japanese: "水",
      kana: "みず",
      romaji: "mizu",
      meanings: ["water"],
      wordTypes: ["Noun"],
    },
  ],
};
async function renderPractice(
  difficulty: PracticeDifficulty,
  result: Comparison | null = null,
  practiceQuestion: Question = question,
) {
  const app = createSSRApp({
    render: () =>
      h(Card, {
        question: practiceQuestion,
        difficulty,
        result,
        revealed: false,
        loading: false,
        checking: false,
        error: "",
        mode: Strictness.Flexible,
        answer: "水",
        showRomaji: true,
        answerInput: "type",
        chipSelection: [],
        typedDraft: "",
        grammarOpen: true,
      }),
  });
  app.component("PracticePrompt", Prompt);
  app.component("PracticeFeedback", Feedback);
  app.component("AnswerBreakdown", Breakdown);
  app.component("AcceptedSpellings", Spellings);
  app.component("PracticeAttemptOutcome", AttemptOutcome);
  app.component("WritingExplanations", { render: () => null });
  app.component("AlternativeAnswers", { render: () => null });
  return renderToString(app);
}

test("Guided grants all four practice aids while Challenge denies them", () => {
  for (const permission of Object.values(PracticePermission)) {
    expect(hasPracticePermission(PracticeDifficulty.Guided, permission)).toBe(
      true,
    );
    expect(
      hasPracticePermission(PracticeDifficulty.Challenge, permission),
    ).toBe(false);
  }
  expect(isPracticeDifficulty("guided")).toBe(true);
  expect(isPracticeDifficulty("challenge")).toBe(true);
  expect(isPracticeDifficulty(undefined)).toBe(false);
  expect(isPracticeDifficulty("unknown")).toBe(false);
});

test("accepted spellings appear after checking without revealing Challenge answers early", async () => {
  const withSpellings: Question = {
    ...question,
    spellingOptions: [
      { japanese: "むこう", kana: "むこう", spellings: ["向こう"] },
    ],
  };
  const before = await renderPractice(
    PracticeDifficulty.Challenge,
    null,
    withSpellings,
  );
  expect(before).not.toContain("Accepted spelling variants");
  expect(before).not.toContain("向こう");
  const after = await renderPractice(
    PracticeDifficulty.Challenge,
    {
      matched: true,
      reference: "水",
      kana: "みず",
      sourceUrl: null,
      differences: null,
    },
    withSpellings,
  );
  expect(after).toContain("Accepted spelling variants (1 word)");
  expect(after).toContain(
    "Includes kana readings and verified kanji spellings.",
  );
  expect(after).toContain("むこう → 向こう");
  expect(after).toContain("even when alternative translations are off");
});

test("cake feedback lists all three words with accepted kana and kanji choices", async () => {
  const cake = exerciseById.get("551307def08bb8669ec2aced")!;
  const html = await renderPractice(
    PracticeDifficulty.Guided,
    {
      matched: true,
      reference: cake.reference.japanese,
      kana: cake.reference.readings[0].kana,
      sourceUrl: null,
      differences: null,
    },
    { ...question, spellingOptions: spellingOptions(cake) },
  );
  expect(html).toContain("Accepted spelling variants (3 words)");
  expect(html).toContain("すこし → 少し");
  expect(html).toContain("お菓子 → おかし");
  expect(html).toContain("食べません → たべません");
});

test("sentence notes sit above Show reference and leave settings", async () => {
  const withSpellings: Question = {
    ...question,
    alternativeCount: 0,
    spellingOptions: [
      { japanese: "むこう", kana: "むこう", spellings: ["向こう"] },
      { japanese: "わたし", kana: "わたし", spellings: ["私"] },
      { japanese: "ください", kana: "ください", spellings: ["下さい"] },
    ],
  };
  const before = (
    await renderPractice(PracticeDifficulty.Guided, null, withSpellings)
  ).replace(/\s+/gu, " ");
  expect(before).toContain("0 additional translations for this sentence");
  expect(before).toContain("3 words have accepted spelling variants");
  expect(before.indexOf("additional translations")).toBeLessThan(
    before.indexOf("Show reference"),
  );
  const after = await renderPractice(
    PracticeDifficulty.Guided,
    {
      matched: true,
      reference: "水",
      kana: "みず",
      sourceUrl: null,
      differences: null,
    },
    withSpellings,
  );
  expect(after).not.toContain("additional translations for this sentence");
  const app = createSSRApp({
    render: () =>
      h(Settings, {
        settingsOpen: true,
        checking: false,
        level: "N5",
        length: "short",
        mode: Strictness.Flexible,
        difficulty: PracticeDifficulty.Guided,
        acceptAlternatives: false,
      }),
  });
  app.component("NuxtLink", { render: () => null });
  const settings = (await renderToString(app)).replace(/\s+/gu, " ");
  expect(settings).toContain("Alternative translations");
  expect(settings).not.toContain("additional translations for this sentence");
  expect(settings).not.toContain("accepted spelling variants");
});

test("Challenge renders plain English and removes every practice aid even with saved hints open", async () => {
  const guided = await renderPractice(PracticeDifficulty.Guided);
  expect(guided).toContain('aria-controls="practice-grammar-reference"');
  expect(guided).toContain("Answer breakdown");
  expect(guided).toContain('id="romaji-hint"');
  expect(guided).toContain('class="prompt-word');

  const challenge = await renderPractice(PracticeDifficulty.Challenge);
  expect(challenge).toContain("Water");
  expect(challenge).toContain("Word chips");
  expect(challenge).not.toContain("Grammar reference");
  expect(challenge).not.toContain("practice-grammar-reference");
  expect(challenge).not.toContain("Answer breakdown");
  expect(challenge).not.toContain("romaji-hint");
  expect(challenge).not.toContain("prompt-word");
});

test("breakdown renders verified spelling alternatives for the cake sentence", async () => {
  const cake = exerciseById.get("551307def08bb8669ec2aced")!;
  const parts = practiceDetails(cake).answerBreakdown;
  const html = await renderToString(
    createSSRApp(Breakdown, { parts, shuffled: false }),
  );
  expect(html).toContain("Accepted spellings:");
  expect(html).toContain('<span lang="ja">少し</span>');
  expect(html).toContain("すこし");
});

test("Challenge retains the ordered reference breakdown after checking", async () => {
  const html = await renderPractice(PracticeDifficulty.Challenge, {
    matched: true,
    reference: "水",
    kana: "みず",
    sourceUrl: null,
    differences: null,
  });
  expect(html).toContain("<summary>Answer breakdown</summary>");
  expect(html).toContain("sentence order");
  expect(html).toContain("water");
});

test("practice aids can be granted independently through the permissions map", async () => {
  const previous = difficultyPermissions[PracticeDifficulty.Challenge];
  try {
    difficultyPermissions[PracticeDifficulty.Challenge] = [
      PracticePermission.GrammarReference,
    ];
    const html = await renderPractice(PracticeDifficulty.Challenge);
    expect(html).toContain('aria-controls="practice-grammar-reference"');
    expect(html).not.toContain("Answer breakdown");
    expect(html).not.toContain("romaji-hint");
    expect(html).not.toContain("prompt-word");
  } finally {
    difficultyPermissions[PracticeDifficulty.Challenge] = previous;
  }
});

test("the prompt explains when a small pool includes harder vocabulary", async () => {
  const note =
    "Few N5 long sentences are available, so this set also includes N3 vocabulary.";
  expect(
    await renderPractice(PracticeDifficulty.Guided, null, {
      ...question,
      widened: { level: Level.N5, length: Length.Long, to: Level.N3 },
    }),
  ).toContain(note);
  expect(await renderPractice(PracticeDifficulty.Guided)).not.toContain(
    "Few N5",
  );
});

test("journey entries show the saved spelling list after a storage round trip", async () => {
  const cake = exerciseById.get("551307def08bb8669ec2aced")!;
  const entry = JSON.parse(
    JSON.stringify({
      id: `${cake.id}-123`,
      sentenceId: cake.id,
      english: cake.english,
      reference: cake.reference.japanese,
      answer: cake.reference.japanese,
      outcome: "matched",
      date: "2026-10-16T00:00:00Z",
      level: Level.N5,
      answerDetailsVersion,
      answerBreakdown: practiceDetails(cake).answerBreakdown,
      spellingOptions: spellingOptions(cake),
    }),
  );
  const render = async () => {
    const app = createSSRApp(JournalEntry, { entry });
    app.component("AnswerBreakdown", Breakdown);
    app.component("AcceptedSpellings", Spellings);
    app.component("PracticeAttemptOutcome", AttemptOutcome);
    app.component("AlternativeAnswers", { render: () => null });
    app.component("WritingExplanations", { render: () => null });
    return renderToString(app);
  };
  const html = await render();
  expect(html).toContain("Accepted spelling variants (3 words)");
  expect(html).toContain("すこし → 少し");
  expect(html).toContain("お菓子 → おかし");
  expect(html).toContain("食べません → たべません");
  delete entry.spellingOptions;
  const legacy = await render();
  expect(legacy).toContain("Accepted spelling variants");
  expect(legacy).not.toContain("Accepted spelling variants (0 words)");
});

test("the journal keeps the latest attempt for each sentence regardless of outcome", async () => {
  const { latestJournalEntries, JournalOutcome } = await import(
    pathToFileURL(join(directory, "practice.ts")).href
  );
  const entry = {
    id: "water-1",
    sentenceId: "water",
    english: "Water",
    reference: "水",
    answer: "水",
    outcome: JournalOutcome.Matched,
    date: "2026-10-16T00:00:00Z",
    level: Level.N5,
  };
  const other = { ...entry, id: "tea-1", sentenceId: "tea", english: "Tea" };
  for (const outcome of Object.values(JournalOutcome)) {
    const latest = {
      ...entry,
      id: "water-2",
      answer: "latest answer",
      outcome,
      date: "2026-10-17T00:00:00Z",
    };
    // Restoring existing duplicates and saving a repeat both keep the newest row.
    expect(latestJournalEntries([entry, other, latest])).toEqual([
      latest,
      other,
    ]);
    expect(latestJournalEntries([latest, other, entry])).toEqual([
      latest,
      other,
    ]);
  }
  expect(
    latestJournalEntries([
      { ...entry, sentenceId: undefined },
      {
        ...entry,
        sentenceId: undefined,
        id: "water-older",
        date: "2026-10-15",
      },
    ]),
  ).toHaveLength(0);
  expect(
    latestJournalEntries([
      entry,
      { ...entry, id: "different", sentenceId: "different" },
    ]),
  ).toHaveLength(2);
  const many = Array.from({ length: 105 }, (_, index) => ({
    ...entry,
    id: `entry-${index}`,
    sentenceId: `sentence-${index}`,
  }));
  expect(latestJournalEntries([entry, entry, ...many])).toHaveLength(106);
});

test("every journal outcome offers a retry action", async () => {
  for (const outcome of ["matched", "unmatched", "revealed"]) {
    const app = createSSRApp(JournalEntry, {
      entry: {
        id: "water-123",
        sentenceId: "water",
        english: "Water",
        reference: "水",
        answer: "水",
        outcome,
        date: "2026-10-17T00:00:00Z",
        level: Level.N5,
        answerDetailsVersion,
        answerBreakdown: question.answerBreakdown,
        spellingOptions: [],
      },
    });
    app.component("AnswerBreakdown", Breakdown);
    app.component("AcceptedSpellings", Spellings);
    app.component("PracticeAttemptOutcome", AttemptOutcome);
    app.component("AlternativeAnswers", { render: () => null });
    app.component("WritingExplanations", { render: () => null });
    const html = await renderToString(app);
    expect(html).toContain('aria-label="Retry: Water"');
    expect(html).toContain("Retry ↻");
  }
});
