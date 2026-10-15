import { describe, expect, test } from "bun:test";
import {
  grammarTopics,
  topicsForGrammar,
  furiganaParts,
  searchGrammar,
  type GrammarEntry,
} from "../shared/grammar";
import { Level } from "../shared/practice";
import n5 from "../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n5.json";
import n4 from "../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n4.json";

import n3 from "../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n3.json";
import n2 from "../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n2.json";
import n1 from "../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n1.json";
const entries = [...n5, ...n4] as GrammarEntry[];

describe("grammar lookup", () => {
  test("finds everyday English requests and Japanese patterns", () => {
    for (const [query, id] of [
      ["want to", "tai"],
      ["must", "nakereba-naranai-nakute-wa-ikenai"],
      ["already did", "mou-ta"],
      ["allowed to", "te-mo-ii"],
      ["～たい", "tai"],
      ["ＴＡＩ", "tai"],
    ]) {
      expect(
        searchGrammar(entries, query!, "all").some((entry) => entry.id === id),
      ).toBe(true);
    }
  });

  test("filters levels without preventing an all-level search", () => {
    expect(
      searchGrammar(entries, "ので", Level.N5).every(
        (entry) => entry.level === Level.N5,
      ),
    ).toBe(true);
    expect(
      searchGrammar(entries, "ので", Level.N5).some(
        (entry) => entry.id === "node",
      ),
    ).toBe(false);
    expect(
      searchGrammar(entries, "ので", "all").some(
        (entry) => entry.id === "node",
      ),
    ).toBe(true);
    expect(searchGrammar(entries, "", Level.N5)).toHaveLength(n5.length);
    expect(searchGrammar(entries, "no-such-pattern", "all")).toEqual([]);
  });

  test("preserves sentence punctuation and readings for ruby rendering", () => {
    expect(furiganaParts("{私|わたし}は{学生|がくせい}です。")).toEqual([
      { text: "私", reading: "わたし" },
      { text: "は", reading: undefined },
      { text: "学生", reading: "がくせい" },
      { text: "です。", reading: undefined },
    ]);
  });
});

describe("grammar topics", () => {
  const allEntries = [...n5, ...n4, ...n3, ...n2, ...n1] as GrammarEntry[];
  test("covers every source tag and all 526 entries", () => {
    const mappedTags = new Set<string>(
      grammarTopics.flatMap((group) => [...group.tags]),
    );
    expect(allEntries).toHaveLength(526);
    expect(
      allEntries
        .flatMap((entry) => entry.tags)
        .filter((tag) => !mappedTags.has(tag)),
    ).toEqual([]);
    expect(
      allEntries.every((entry) => topicsForGrammar(entry).length > 0),
    ).toBe(true);
  });
  test("combines topic, level and everyday search phrases", () => {
    expect(
      searchGrammar(entries, "want to", Level.N5, "intention").some(
        (entry) => entry.id === "tai",
      ),
    ).toBe(true);
    expect(searchGrammar(entries, "want to", Level.N5, "giving")).toEqual([]);
    expect(
      searchGrammar(entries, "must", Level.N5, "obligation").some(
        (entry) => entry.id === "nakereba-naranai-nakute-wa-ikenai",
      ),
    ).toBe(true);
    expect(
      searchGrammar(entries, "", Level.N5, "intention").every(
        (entry) => entry.level === Level.N5,
      ),
    ).toBe(true);
    expect(searchGrammar(allEntries, "", "all", "all")).toHaveLength(526);
  });
  test("allows a pattern in several groups without duplicating results", () => {
    const entry = allEntries.find((entry) => entry.id === "ni-saishite")!;
    expect(topicsForGrammar(entry).map((group) => group.id)).toEqual([
      "time",
      "politeness",
    ]);
    for (const group of topicsForGrammar(entry)) {
      expect(
        searchGrammar(allEntries, "", "all", group.id).filter(
          (item) => item === entry,
        ),
      ).toHaveLength(1);
    }
  });
});
