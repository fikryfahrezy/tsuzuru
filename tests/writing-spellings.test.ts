import { expect, test } from "bun:test";
import { compare, Strictness, DifferenceKind } from "../shared/practice";
import { writingDifferences } from "../shared/writing-diff";
import {
  verifiedSpellings,
  spellingOptions,
  type SpellingBank,
} from "../shared/writing-spellings";
import {
  candidateById,
  defaultBanks,
  exerciseById,
  exercises,
} from "../server/utils/exercises";
import { sentence } from "./sentences";
import bank from "../data/spelling-variants/bank.json";
import manifest from "../data/manifest.json";
import { createApp, toWebHandler } from "h3";
import compareHandler from "../server/api/compare.post";

const removal = exerciseById.get("6f089ad7d7e1f1da1398e9c9")!;
const removalRecord = candidateById.get(removal.id)!;

test("displayed spelling options show approved words separately from alternative translations", () => {
  const river = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  expect(spellingOptions(river)).toEqual([
    { japanese: "わたし", kana: "わたし", spellings: ["私"] },
    { japanese: "むこう", kana: "むこう", spellings: ["向こう"] },
    { japanese: "ください", kana: "ください", spellings: ["下さい"] },
  ]);
  expect(river.alternatives).toHaveLength(0);
  const changed = sentence(
    {
      ...candidateById.get(river.id)!,
      japanese: "別の文。",
      furiganaVariants: ["{別|べつ}の{文|ぶん}。"],
    },
    defaultBanks,
  );
  expect(spellingOptions(changed)).toEqual([]);
});

test("reviewed mukou spelling accepts the spatial word and rejects homophones", () => {
  const river = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  const kanji = "わたしを川の向こうに渡してください。";
  for (const alternatives of [false, true]) {
    expect(
      compare(river, kanji, Strictness.Flexible, alternatives).matched,
    ).toBe(true);
    expect(compare(river, kanji, Strictness.Exact, alternatives).matched).toBe(
      false,
    );
  }
  expect(compare(river, kanji, Strictness.Kana).matched).toBe(false);
  expect(
    compare(river, "わたしを川の無効に渡してください。", Strictness.Flexible)
      .matched,
  ).toBe(false);
  expect(river.alternatives).toHaveLength(0);
});

test("pronoun spellings combine with other verified words while preserving pronunciation", () => {
  const river = exerciseById.get("ed2c1d01698a754816d6a9ed")!;
  for (const answer of [
    "私を川のむこうに渡してください。",
    "わたしを川のむこうに渡して下さい。",
    "私を川の向こうに渡して下さい。",
  ]) {
    const result = compare(river, answer, Strictness.Flexible, false);
    expect(result.matched).toBe(true);
    expect(result.differences).toBeNull();
    expect(compare(river, answer, Strictness.Exact).matched).toBe(false);
  }
  expect(
    compare(river, "渡しを川の向こうに渡して下さい。", Strictness.Flexible)
      .matched,
  ).toBe(false);
  const span = river.reference.spellings
    .flatMap((reference) => reference.spans)
    .find((part) => part.surface === "わたし");
  expect(span).toMatchObject({ reading: "わたし", spellings: ["私"] });
});

test("the comparison API accepts recorded spellings with alternatives off and rejects wrong homophones", async () => {
  const app = createApp();
  app.use("/api/compare", compareHandler);
  const handle = toWebHandler(app);
  for (const [answer, mode, matched] of [
    ["あなたの名前はリストから外された。", "flexible", true],
    ["あなたの名前はリストから筈された。", "flexible", false],
    ["あなたの名前はリストから外された。", "exact", false],
  ] as const) {
    const response = await handle(
      new Request("http://localhost/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: removal.id,
          answer,
          mode,
          acceptAlternatives: false,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ matched });
  }
});

test("verified spelling variants work independently of alternative translations and vocabulary level", () => {
  for (const alternatives of [false, true]) {
    const result = compare(
      removal,
      "あなたの 名前 は リスト から 外された",
      Strictness.Flexible,
      alternatives,
    );
    expect(result.matched).toBe(true);
    expect(result.acceptedAlternative).toBeUndefined();
    expect(result.differences).toBeNull();
    expect(result.reference).toBe(removal.reference.japanese);
  }
  const collar = exerciseById.get("06fb6cfc1da1b7e3a2191581")!;
  expect(
    compare(collar, "犬はやすやすと首輪を外した。", Strictness.Flexible)
      .matched,
  ).toBe(true);
  const unsure = exerciseById.get("05cc8b160dd943ea79213a94")!;
  expect(
    compare(unsure, "今ははっきりとは分かりません。", Strictness.Flexible)
      .matched,
  ).toBe(true);
});

test("spelling variations preserve tense, negation, particles, and word identity", () => {
  for (const answer of [
    "あなたの名前はリストから外される。",
    "あなたの名前はリストから外されなかった。",
    "あなたの名前はリストに外された。",
    "あなたの名前はリストから筈された。",
  ])
    expect(compare(removal, answer, Strictness.Flexible).matched).toBe(false);
  expect(
    compare(removal, "あなたの名前はリストから外された。", Strictness.Exact)
      .matched,
  ).toBe(false);
  expect(
    compare(removal, "あなたの名前はリストから外された。", Strictness.Kana)
      .matched,
  ).toBe(false);
  expect(
    compare(removal, "あなたのなまえはりすとからはずされた。", Strictness.Kana)
      .matched,
  ).toBe(true);
});

test("accepted kanji are not highlighted when another part of the answer is wrong", () => {
  const differences = writingDifferences(
    removal.reference,
    "あなたの名前はリストから外される。",
    Strictness.Flexible,
  );
  expect(differences.answer.find((part) => part.text === "外")?.kind).toBe(
    DifferenceKind.Same,
  );
  expect(differences.edits?.every((edit) => !edit.actual.includes("外"))).toBe(
    true,
  );
  const matching = writingDifferences(
    removal.reference,
    "あなたの名前はリストから外された。",
    Strictness.Flexible,
  );
  expect(
    matching.answer.every((part) => part.kind === DifferenceKind.Same),
  ).toBe(true);
  const exact = compare(
    removal,
    "あなたの名前はリストから外された。",
    Strictness.Exact,
  );
  expect(exact.explanations?.[0]?.title).toBe("Writing mode mismatch");
});

test("unrecorded homophones remain rejected even when the reference is entirely kana", () => {
  const bridgeRecord = {
    ...removalRecord,
    id: "ambiguous-bridge",
    japanese: "はしをわたる。",
    furiganaVariants: ["はしをわたる。"],
  };
  const bridge = sentence(bridgeRecord);
  expect(compare(bridge, "橋をわたる。", Strictness.Flexible).matched).toBe(
    false,
  );
  expect(compare(bridge, "箸をわたる。", Strictness.Flexible).matched).toBe(
    false,
  );
  const kanjiBridge = sentence({
    ...bridgeRecord,
    japanese: "橋をわたる。",
    furiganaVariants: ["{橋|はし}をわたる。"],
  });
  expect(
    compare(kanjiBridge, "箸をわたる。", Strictness.Flexible).matched,
  ).toBe(false);
  expect(
    compare(kanjiBridge, "はしをわたる。", Strictness.Flexible).matched,
  ).toBe(true);
});

test("stale, malformed, overlapping, and unsupported spelling records are ignored", () => {
  const copy = () => structuredClone(bank) as SpellingBank;
  const renderings = [removal.reference, ...removal.alternatives];
  const verify = (
    row: { id: string; english: string; japanese: string },
    changed: SpellingBank,
    revision = manifest.revision,
  ) => verifiedSpellings(row, renderings, changed, revision);
  expect(verify(removalRecord, copy())).not.toEqual([]);
  expect(
    verify({ ...removalRecord, english: "Changed prompt" }, copy()),
  ).toEqual([]);
  expect(verify({ ...removalRecord, japanese: "違う。" }, copy())).toEqual([]);
  expect(verify(removalRecord, copy(), "outdated")).toEqual([]);
  for (const mutate of [
    (
      span: SpellingBank["entries"][string]["references"][number]["spans"][number],
    ) => {
      span.reading = "ねむ";
    },
    (
      span: SpellingBank["entries"][string]["references"][number]["spans"][number],
    ) => {
      span.end = 200;
    },
    (
      span: SpellingBank["entries"][string]["references"][number]["spans"][number],
    ) => {
      span.spellings = ["外さ。"];
    },
    (
      span: SpellingBank["entries"][string]["references"][number]["spans"][number],
    ) => {
      span.method = "reviewed-context";
    },
  ]) {
    const changed = copy();
    mutate(changed.entries[removal.id]!.references[0]!.spans[0]!);
    expect(verify(removalRecord, changed)).toEqual([]);
  }
  const overlap = copy();
  const reference = overlap.entries[removal.id]!.references[0]!;
  reference.spans.push(reference.spans[0]!);
  expect(verify(removalRecord, overlap)).toEqual([]);
  // Spelling paths from an original reference must not leak into other translations.
  expect(
    compare(
      sentence(
        {
          ...removalRecord,
          japanese: "名前がない。",
          furiganaVariants: ["{名前|なまえ}がない。"],
        },
        defaultBanks,
      ),
      "あなたの名前はリストから外された。",
      Strictness.Flexible,
    ).matched,
  ).toBe(false);
});

test("every generated span loads and matches its recorded reference with consistent highlighting", () => {
  expect(Object.keys(bank.entries).length).toBeGreaterThan(1000);
  for (const [id, entry] of Object.entries(bank.entries)) {
    const candidate = exerciseById.get(id)!;
    const renderings = [candidate.reference, ...candidate.alternatives];
    expect(renderings.flatMap((rendering) => rendering.spellings)).toHaveLength(
      entry.references.length,
    );
    for (const reference of renderings.flatMap((item) => item.spellings)) {
      const rendering = renderings.find(
        (item) => item.japanese === reference.japanese,
      )!;
      // Compare against this rendering alone, restricted to the recorded reading.
      const source = {
        ...candidate,
        reference: {
          japanese: rendering.japanese,
          readings: [
            rendering.readings.find(
              (reading) => reading.furigana === reference.furigana,
            )!,
          ],
          spellings: [reference],
        },
        alternatives: [],
      };
      // Combine each span's first variant; the graph must avoid exponential enumeration.
      let answer = reference.japanese;
      for (const span of [...reference.spans].reverse())
        answer =
          answer.slice(0, span.start) +
          span.spellings[0]! +
          answer.slice(span.end);
      expect(compare(source, answer, Strictness.Flexible).matched).toBe(true);
      expect(
        writingDifferences(
          source.reference,
          answer,
          Strictness.Flexible,
        ).answer.every((part) => part.kind === DifferenceKind.Same),
      ).toBe(true);
      for (const span of reference.spans) {
        for (const spelling of span.spellings) {
          const single =
            reference.japanese.slice(0, span.start) +
            spelling +
            reference.japanese.slice(span.end);
          expect(compare(source, single, Strictness.Flexible).matched).toBe(
            true,
          );
        }
      }
    }
  }
  expect(
    exercises.filter((candidate) =>
      [candidate.reference, ...candidate.alternatives].some(
        (rendering) => rendering.spellings.length,
      ),
    ).length,
  ).toBe(Object.keys(bank.entries).length);
});
