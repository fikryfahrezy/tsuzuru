import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRenderer, createSSRApp, nextTick } from "vue";
import { IDBFactory } from "fake-indexeddb";
import { clearJournal, readJournal } from "../app/utils/journal-storage";
import { renderToString } from "@vue/server-renderer";
import { Level, Strictness, type Question } from "../shared/practice";

const directory = mkdtempSync(join(tmpdir(), "tsuzuru-retry-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const imports: Record<string, string> = {
  vue: import.meta.resolve("vue"),
  "~/utils/journal-storage": new URL(
    "../app/utils/journal-storage.ts",
    import.meta.url,
  ).href,
  "#imports": pathToFileURL(join(directory, "route.ts")).href,
  ofetch: pathToFileURL(join(directory, "fetch.ts")).href,
  "~/utils/practice": pathToFileURL(join(directory, "practice.ts")).href,
};
for (const name of ["practice", "practice-difficulty", "answer-entries"])
  imports[`#shared/${name}`] = new URL(
    `../shared/${name}.ts`,
    import.meta.url,
  ).href;
function module(name: string, source: string) {
  writeFileSync(
    join(directory, `${name}.ts`),
    source.replace(
      /from (["'])([^"']+)\1/gu,
      (original, _quote, specifier: string) =>
        imports[specifier]
          ? `from ${JSON.stringify(imports[specifier])}`
          : original,
    ),
  );
  return pathToFileURL(join(directory, `${name}.ts`)).href;
}
module(
  "route",
  'export const useRoute = () => ({ query: { sentence: "linked-sentence" } });',
);
const fetchUrl = module(
  "fetch",
  `
  export const calls: any[] = [];
  export let fail = false;
  export function setFail(value: boolean) { fail = value; }
  export async function $fetch(url: string, options: any) {
    calls.push({ url, ...options });
    if (fail) throw new Error("Unavailable");
    if (url === "/api/compare") return { matched: true, reference: "水", differences: null, explanations: [] };
    return { id: options.query.sentence ?? "random", english: "Water", answerBreakdown: [], spellingOptions: [], wordBank: [] };
  }
`,
);
module(
  "practice",
  readFileSync(new URL("../app/utils/practice.ts", import.meta.url), "utf8"),
);
const sessionUrl = module(
  "session",
  readFileSync(
    new URL("../app/composables/usePracticeSession.ts", import.meta.url),
    "utf8",
  ),
);
const { usePracticeSession } = await import(sessionUrl);
const { calls, setFail } = await import(fetchUrl);

async function session() {
  let value!: ReturnType<typeof usePracticeSession>;
  await renderToString(
    createSSRApp({
      setup() {
        value = usePracticeSession();
        return () => null;
      },
    }),
  );
  calls.length = 0;
  setFail(false);
  return value;
}
function entry(outcome: string) {
  return {
    id: "water-123",
    sentenceId: "water",
    english: "Water",
    answer: "水",
    reference: "水",
    outcome,
    date: "2026-10-17T00:00:00Z",
    level: Level.N3,
    mode: Strictness.Kana,
  };
}

test("retry opens the same sentence with an empty answer for every journal outcome", async () => {
  for (const outcome of ["matched", "unmatched", "revealed"]) {
    const state = await session();
    const saved = entry(outcome);
    state.journal.value = [saved];
    state.answer.value = "previous answer";
    state.typedDraft.value = "draft";
    state.chipSelection.value = [1];
    state.result.value = { matched: true };
    state.revealed.value = true;
    state.settingsOpen.value = true;
    let focused = false;
    state.writingCard.value = {
      focusAnswer: () => {
        focused = true;
      },
    };
    await state.retryJournalEntry(saved);
    expect(calls[0].query.sentence).toBe("water");
    expect(state.tab.value).toBe("practice");
    expect(state.settingsOpen.value).toBe(false);
    expect(state.question.value?.id).toBe("water");
    expect(state.answer.value).toBe("");
    expect(state.typedDraft.value).toBe("");
    expect(state.chipSelection.value).toEqual([]);
    expect(state.result.value).toBeNull();
    expect(state.revealed.value).toBe(false);
    expect(state.journal.value).toEqual([saved]);
    expect(state.previousAttempt.value).toEqual(saved);
    expect(focused).toBe(true);
    state.answer.value = "水";
    await state.submit();
    expect(state.previousAttempt.value).toEqual(saved);
    expect(state.journal.value).toHaveLength(1);
    expect(state.journal.value[0]).toMatchObject({
      sentenceId: "water",
      level: Level.N3,
      answer: "水",
      outcome: "matched",
    });
    await state.nextSentence();
    expect(state.previousAttempt.value).toBeNull();
    expect(calls.at(-1).query.sentence).toBe("linked-sentence");
  }
});

test("legacy entries retry by their saved ID and failed retries can load again", async () => {
  const state = await session();
  const saved = { ...entry("unmatched"), sentenceId: undefined };
  setFail(true);
  await state.retryJournalEntry(saved);
  expect(calls.at(-1).query.sentence).toBe("water");
  expect(state.error.value).toContain("journal sentence");
  expect(state.loading.value).toBe(false);
  expect(state.question.value).toBeNull();
  setFail(false);
  await state.loadQuestion();
  expect(state.question.value?.id).toBe("water");
  expect(state.error.value).toBe("");
});

test("retry waits for an answer comparison to finish", async () => {
  const state = await session();
  state.checking.value = true;
  state.question.value = { id: "current" } as Question;
  await state.retryJournalEntry(entry("matched"));
  await nextTick();
  expect(calls).toHaveLength(0);
  expect(state.question.value?.id).toBe("current");
});

test("a fresh IndexedDB journal discards old history, preserves settings, and survives reopening", async () => {
  const previousIDB = globalThis.indexedDB;
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const values = new Map<string, string>([
    [
      "tsuzuru.practice.v1",
      JSON.stringify({ level: Level.N3, journal: [entry("matched")] }),
    ],
  ]);
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    writable: true,
    value: new IDBFactory(),
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { addEventListener() {}, removeEventListener() {} },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const renderer = createRenderer<object, object>({
    patchProp() {},
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    parentNode: () => null,
    nextSibling: () => null,
  });
  async function mount() {
    let state!: ReturnType<typeof usePracticeSession>;
    const app = renderer.createApp({
      setup() {
        state = usePracticeSession();
        return () => null;
      },
    });
    app.mount({});
    for (let attempts = 0; attempts < 100 && !state.question.value; attempts++)
      await new Promise((resolve) => setTimeout(resolve, 1));
    expect(state.question.value).not.toBeNull();
    return { app, state };
  }
  let unmount = () => {};
  try {
    const first = await mount();
    unmount = () => first.app.unmount();
    expect(first.state.level.value).toBe(Level.N3);
    expect(first.state.journal.value).toEqual([]);
    expect(
      JSON.parse(values.get("tsuzuru.practice.v1")!).journal,
    ).toBeUndefined();
    first.state.answer.value = "水";
    await first.state.submit();
    expect(await readJournal()).toHaveLength(1);
    unmount();
    const second = await mount();
    unmount = () => second.app.unmount();
    expect(second.state.journal.value).toHaveLength(1);
    expect(second.state.journal.value[0].answer).toBe("水");
    second.state.saveJournalBreakdown(second.state.journal.value[0].id, [], []);
    expect((await readJournal())[0].answerDetailsVersion).toBeDefined();
    second.state.resetJournal();
    expect(await readJournal()).toEqual([]);
    expect(second.state.journal.value).toEqual([]);
  } finally {
    unmount();
    await clearJournal();
    const deletion = globalThis.indexedDB.deleteDatabase("tsuzuru.journal");
    await new Promise<void>((resolve, reject) => {
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
    });
    globalThis.indexedDB = previousIDB;
    globalThis.window = previousWindow;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      writable: true,
      value: previousStorage,
    });
  }
});
