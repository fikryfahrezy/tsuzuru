import { expect, test } from "bun:test";
import { createApp, toWebHandler } from "h3";
import { compare, Strictness } from "../shared/practice";
import {
  acceptedAlternatives,
  type AlternativeBank,
} from "../shared/accepted-alternatives";
import bank from "../data/alternatives/answers.json";
import manifest from "../data/manifest.json";
import { exerciseById } from "../server/utils/exercises";
import compareHandler from "../server/api/compare.post";

const tennis = exerciseById.get("004f3984827963025986b55a")!;

test("results include every alternative regardless of matching or the toggle", () => {
  for (const accept of [false, true]) {
    for (const answer of [
      tennis.japanese,
      "wrong answer",
      "__reveal__",
      "１年中テニスをします。",
    ]) {
      const result = compare(tennis, answer, Strictness.Flexible, accept);
      expect(result.alternatives).toHaveLength(5);
      expect(result.alternatives?.[0]?.kana).toBe(
        "１ねんじゅうてにすをします。",
      );
      expect(
        result.alternatives?.map((alternative) => alternative.provenance),
      ).toEqual(
        tennis.acceptedAlternatives!.map(
          (alternative) => alternative.provenance,
        ),
      );
    }
  }
  const cephas = exerciseById.get("1d2b4c9edb416bf9f39e95af")!;
  expect(
    compare(cephas, "__reveal__", Strictness.Flexible).alternatives,
  ).toEqual([]);
});

test("pre-generated alternatives are opt-in and preserve the original reference and attribution", () => {
  expect(tennis.acceptedAlternatives?.length).toBe(5);
  expect(
    compare(tennis, "１年中テニスをします。", Strictness.Flexible).matched,
  ).toBe(false);
  for (const alternative of tennis.acceptedAlternatives!) {
    const result = compare(
      tennis,
      alternative.japanese,
      Strictness.Flexible,
      true,
    );
    expect(result.matched).toBe(true);
    expect(result.differences).toBeNull();
    expect(result.reference).toBe(tennis.japanese);
    expect(result.sourceUrl).toBe(
      compare(tennis, tennis.japanese, Strictness.Exact).sourceUrl,
    );
    expect(result.acceptedAlternative?.japanese).toBe(alternative.japanese);
    expect(result.acceptedAlternative?.provenance).toEqual(
      alternative.provenance,
    );
  }
  expect(
    compare(tennis, tennis.japanese, Strictness.Exact, true)
      .acceptedAlternative,
  ).toBeUndefined();
});

test("alternatives follow each writing mode and do not accept meaning changes or malformed endings", () => {
  expect(
    compare(
      tennis,
      "私はいちねんじゅうテニスをやります。",
      Strictness.Flexible,
      true,
    ).matched,
  ).toBe(true);
  expect(
    compare(
      tennis,
      "わたしはいちねんじゅうテニスをやります。",
      Strictness.Kana,
      true,
    ).matched,
  ).toBe(true);
  expect(
    compare(tennis, "私は一年中テニスをやります。", Strictness.Kana, true)
      .matched,
  ).toBe(false);
  expect(
    compare(tennis, "私は一年中テニスをやります。", Strictness.Exact, true)
      .matched,
  ).toBe(true);
  expect(
    compare(
      tennis,
      "私はいちねんじゅうテニスをやります。",
      Strictness.Exact,
      true,
    ).matched,
  ).toBe(false);
  for (const answer of [
    "私は一年中テニスをやりません。",
    "私は一年中テニスをやりました。",
    "私は一年中テニスをするます。",
    "彼は一年中テニスをします。",
    "私はテニスをします。",
    "私は一年中サッカーをします。",
  ])
    expect(compare(tennis, answer, Strictness.Flexible, true).matched).toBe(
      false,
    );
});

test("stale sources, missing provenance, and incomplete readings are ignored", () => {
  const copy = () => structuredClone(bank) as AlternativeBank;
  let changed = copy();
  changed.sourceRevision = "outdated";
  expect(acceptedAlternatives(tennis, changed, manifest.revision)).toEqual([]);
  changed = copy();
  changed.entries[tennis.id]!.sourceEnglish = "Different prompt.";
  expect(acceptedAlternatives(tennis, changed, manifest.revision)).toEqual([]);
  changed = copy();
  changed.entries[tennis.id]!.alternatives.forEach((alternative) => {
    alternative.provenance.creator = "";
  });
  expect(acceptedAlternatives(tennis, changed, manifest.revision)).toEqual([]);
  changed = copy();
  changed.entries[tennis.id]!.alternatives.forEach((alternative) => {
    alternative.furiganaVariants = [alternative.japanese];
  });
  expect(acceptedAlternatives(tennis, changed, manifest.revision)).toEqual([]);
});

test("the comparison API validates the toggle and only activates listed alternatives", async () => {
  const app = createApp();
  app.use("/api/compare", compareHandler);
  const handle = toWebHandler(app);
  const request = (acceptAlternatives: unknown) =>
    handle(
      new Request("http://localhost/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tennis.id,
          answer: "１年中テニスをします。",
          mode: Strictness.Flexible,
          acceptAlternatives,
        }),
      }),
    );
  expect((await (await request(false)).json()).matched).toBe(false);
  expect(
    (await (await request(true)).json()).acceptedAlternative.japanese,
  ).toBe("１年中テニスをします。");
  expect((await request("true")).status).toBe(400);
});

test("all generated answers are active with source provenance", () => {
  expect(Object.keys(bank.entries)).toHaveLength(948);
  let count = 0;
  for (const [id, entry] of Object.entries(bank.entries)) {
    const candidate = exerciseById.get(id)!;
    expect(candidate.english).toBe(entry.sourceEnglish);
    expect(candidate.japanese).toBe(entry.sourceJapanese);
    expect(candidate.acceptedAlternatives).toHaveLength(
      entry.alternatives.length,
    );
    for (const alternative of candidate.acceptedAlternatives!) {
      expect(
        compare(candidate, alternative.japanese, Strictness.Exact, true)
          .acceptedAlternative?.provenance,
      ).toEqual(alternative.provenance);
      count++;
    }
  }
  expect(count).toBe(1334);
});

test("listed number spellings preserve quantity, readings, and the alternatives toggle", () => {
  for (const japanese of [
    "私は一年中テニスをします。",
    "一年中テニスをします。",
  ]) {
    expect(compare(tennis, japanese, Strictness.Flexible).matched).toBe(false);
    for (const mode of [Strictness.Flexible, Strictness.Exact]) {
      const result = compare(tennis, japanese, mode, true);
      expect(result.matched).toBe(true);
      expect(result.acceptedAlternative?.japanese).toBe(japanese);
      expect(result.acceptedAlternative?.kana).toContain("いちねんじゅう");
      expect(result.acceptedAlternative?.provenance.creator).toBe("Codex");
    }
  }
  expect(
    compare(
      tennis,
      "わたしはいちねんじゅうテニスをします。",
      Strictness.Kana,
      true,
    ).matched,
  ).toBe(true);
  for (const japanese of [
    "私は二年中テニスをします。",
    "私は２年中テニスをします。",
    "私は一年中テニスをしません。",
  ])
    expect(compare(tennis, japanese, Strictness.Flexible, true).matched).toBe(
      false,
    );
});
