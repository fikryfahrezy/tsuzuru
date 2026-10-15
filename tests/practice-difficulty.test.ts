import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, h, type Component } from "vue";
import { renderToString } from "@vue/server-renderer";
import {
  PracticeDifficulty,
  PracticePermission,
  difficultyPermissions,
  hasPracticePermission,
  isPracticeDifficulty,
} from "../shared/practice-difficulty";
import { Strictness, type Comparison, type Question } from "../shared/practice";

const directory = mkdtempSync(join(tmpdir(), "tsuzuru-difficulty-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

// Compile real Vue templates so the policy is also checked at the UI boundaries.
function writeModule(name: string, source: string) {
  const imports: Record<string, string> = {
    vue: import.meta.resolve("vue"),
    "#shared/practice": new URL("../shared/practice.ts", import.meta.url).href,
    "#shared/practice-difficulty": new URL(
      "../shared/practice-difficulty.ts",
      import.meta.url,
    ).href,
    "~/utils/practice": pathToFileURL(join(directory, "practice.ts")).href,
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
beforeAll(async () => {
  const modules = [
    "PracticePrompt",
    "PracticeWritingCard",
    "PracticeFeedback",
    "AnswerBreakdown",
    "PracticeSettings",
  ].map(component);
  [Prompt, Card, Feedback, Breakdown, Settings] = await Promise.all(
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
  expect(after).toContain("むこう → 向こう");
  expect(after).toContain("even when alternative translations are off");
});

test("settings distinguish zero additional translations from available spelling variants", async () => {
  const app = createSSRApp({
    render: () =>
      h(Settings, {
        settingsOpen: true,
        checking: false,
        alternativeCount: 0,
        spellingWordCount: 3,
        level: "N5",
        length: "short",
        mode: Strictness.Flexible,
        difficulty: PracticeDifficulty.Guided,
        acceptAlternatives: false,
      }),
  });
  app.component("NuxtLink", { render: () => null });
  const html = (await renderToString(app))
    .replace(/<!--.*?-->/gu, "")
    .replace(/\s+/gu, " ");
  expect(html).toContain("Alternative translations");
  expect(html).toContain("0 additional translations for this sentence");
  expect(html).toContain("3 words have verified spelling variants");
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
