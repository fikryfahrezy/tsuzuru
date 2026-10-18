import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, h, nextTick, ref } from "vue";
import { PracticeDifficulty } from "../shared/practice-difficulty";
import { Strictness } from "../shared/practice";

const directory = mkdtempSync(join(tmpdir(), "tsuzuru-chip-order-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const sortablePath = join(directory, "sortable.ts");
writeFileSync(
  sortablePath,
  `export default class Sortable {
    static instances: Sortable[] = [];
    constructor(public element: unknown, public options: any) {
      Sortable.instances.push(this);
    }
    destroy() {}
    option() {}
  }`,
);
const imports: Record<string, string> = {
  vue: import.meta.resolve("vue"),
  sortablejs: pathToFileURL(sortablePath).href,
  "~/utils/practice": pathToFileURL(join(directory, "practice.ts")).href,
  "#shared/practice": new URL("../shared/practice.ts", import.meta.url).href,
  "#shared/practice-difficulty": new URL(
    "../shared/practice-difficulty.ts",
    import.meta.url,
  ).href,
};
const { descriptor } = parse(
  readFileSync(
    new URL("../app/components/PracticeWritingCard.vue", import.meta.url),
    "utf8",
  ),
);
const script = compileScript(descriptor, { id: "chip-order-test" });
const componentPath = join(directory, "card.ts");
function resolveImports(source: string) {
  return source.replace(
    /from (["'])([^"']+)\1/gu,
    (original, _quote, specifier: string) =>
      imports[specifier]
        ? `from ${JSON.stringify(imports[specifier])}`
        : original,
  );
}
writeFileSync(
  join(directory, "practice.ts"),
  resolveImports(
    readFileSync(new URL("../app/utils/practice.ts", import.meta.url), "utf8"),
  ),
);
writeFileSync(componentPath, resolveImports(script.content));
const { default: Card } = await import(pathToFileURL(componentPath).href);
const { default: Sortable } = await import(pathToFileURL(sortablePath).href);
// Exercise the real setup and controlled models without rendering the card UI.
Card.render = () => null;
const renderer = createRenderer({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert() {},
  remove() {},
  setText() {},
  setElementText() {},
  parentNode: () => null,
  nextSibling: () => null,
  patchProp() {},
});

for (const mode of [Strictness.Exact, Strictness.Kana]) {
  test(`dragged chip order and submitted answer stay in sync in ${mode} mode`, async () => {
    Sortable.instances.length = 0;
    const selection = ref([2, 0, 1]);
    const answer = ref("");
    const card = ref();
    const question = {
      wordBank: [
        { japanese: "水", kana: "みず" },
        { japanese: "を", kana: "を" },
        { japanese: "飲みます", kana: "のみます" },
      ],
      answerBreakdown: [],
    };
    const app = renderer.createApp({
      setup: () => () =>
        h(Card, {
          ref: card,
          question,
          result: null,
          revealed: false,
          loading: false,
          checking: false,
          error: "",
          mode,
          difficulty: PracticeDifficulty.Guided,
          answer: answer.value,
          "onUpdate:answer": (value: string) => (answer.value = value),
          chipSelection: selection.value,
          "onUpdate:chipSelection": (value: number[]) =>
            (selection.value = value),
          answerInput: "chips",
          showRomaji: false,
          typedDraft: "",
        }),
    });
    app.mount({});
    try {
      const state = card.value.$.setupState;
      let order = [0, 1, 2];
      state.chipField = {
        querySelectorAll: () =>
          order.map((index) => ({ dataset: { chipIndex: String(index) } })),
      };
      state.chipBank = {};
      await nextTick();
      const end = Sortable.instances[0].options.onEnd;
      const drop = (index: number) =>
        end({ item: { dataset: { chipIndex: String(index) } } });

      drop(2);
      expect(selection.value).toEqual([0, 1, 2]);
      expect(answer.value).toBe(
        mode === Strictness.Kana ? "みずをのみます" : "水を飲みます",
      );
      await nextTick();

      // Return a chip to the bank, then drag it back to the answer.
      order = [0, 1];
      drop(2);
      expect(selection.value).toEqual([0, 1]);
      expect(answer.value).toBe(mode === Strictness.Kana ? "みずを" : "水を");
      await nextTick();
      order = [0, 1, 2];
      drop(2);
      expect(answer.value).toBe(
        mode === Strictness.Kana ? "みずをのみます" : "水を飲みます",
      );
      await nextTick();

      state.clearChips();
      expect(selection.value).toEqual([]);
      expect(answer.value).toBe("");
    } finally {
      app.unmount();
    }
  });
}
