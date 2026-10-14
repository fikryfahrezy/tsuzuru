import { expect, test } from "bun:test";
import { createApp, toWebHandler } from "h3";
import exerciseHandler from "../server/api/exercises.get";
import compareHandler from "../server/api/compare.post";
import { Strictness } from "../shared/practice";
import { romajiHint } from "../shared/romaji";
import { wordHints } from "../server/utils/word-hints";
import { exerciseById } from "../server/utils/exercises";

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
    expect(await response.json()).toMatchObject({
      id: selected.id,
      english: selected.english,
      romaji: romajiHint(selected),
      wordHints: wordHints(selected),
      wordCount: selected.englishWordCount,
      poolSize: 1,
    });
  }
  const response = await handle(
    new Request("http://localhost/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        answer: selected.japanese,
        mode: Strictness.Flexible,
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    matched: true,
    reference: selected.japanese,
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
  expect(exerciseById.has((await random.json()).id)).toBe(true);
});
