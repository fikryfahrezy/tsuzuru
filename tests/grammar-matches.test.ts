import { expect, test } from "bun:test";
import { resolveGrammarMatches } from "../server/utils/grammar-matches";
import { grammarMatcher } from "../server/utils/grammar-matcher";
import { baseAnswerEntries } from "../server/utils/answer-entries";
import { exerciseById } from "../server/utils/exercises";
import type { GrammarAnnotation } from "../shared/answer-entries";

const match = (start: number, end: number, id: string): GrammarAnnotation => ({
  start,
  end,
  japanese: "fixture",
  grammarIds: [id],
});

test("explicit interpretations override guesses before nested matches are resolved", () => {
  const outer = match(0, 10, "hou-ga-ii");
  const inner = match(0, 4, "te");
  const explicit = match(8, 10, "sou-da-hearsay");
  expect(resolveGrammarMatches([outer, inner], [explicit])).toEqual([
    explicit,
    inner,
  ]);
  expect(
    resolveGrammarMatches([match(0, 4, "naosu")], [match(0, 4, "ta")]),
  ).toEqual([match(0, 4, "ta")]);
});

test("whole constructions suppress components while retaining independent derivations", () => {
  const outer = match(0, 10, "hou-ga-ii");
  const component = match(0, 4, "ta");
  const derivation = match(0, 4, "naosu");
  expect(resolveGrammarMatches([component, derivation, outer], [])).toEqual([
    derivation,
    outer,
  ]);
});

test("partial overlaps and equal spans can express distinct grammar readings", () => {
  const matches = [
    match(0, 4, "yori"),
    match(2, 6, "no-hou-ga-yori"),
    match(0, 4, "au"),
  ];
  expect(resolveGrammarMatches(matches, [])).toEqual(matches);
});

test("fixed formations stop at positioned word boundaries and preserve punctuation", () => {
  const sentence = exerciseById.get("8781e50b14468843e9839443")!;
  const base = baseAnswerEntries(sentence);
  const { add, longest, reading, matches } = grammarMatcher(sentence, base);
  const word = base.find((part) => part.japanese.startsWith("やって"))!;
  expect(word).toBeDefined();
  // A partial tokenizer word and a phrase that skips a character cannot match.
  add(word.start, word.japanese.slice(0, -1), "te");
  add(word.start, "やっていい", "te-mo-ii");
  expect(matches).toEqual([]);
  longest(
    word.start,
    ["やっても", "やってもいい", "やってもいいです"],
    "te-mo-ii",
  );
  expect(matches).toEqual([
    {
      start: word.start,
      end: word.start + "やってもいいです".length,
      japanese: "やってもいいです",
      grammarIds: ["te-mo-ii"],
    },
  ]);
  expect(reading(word.start, word.end)).toBe(word.kana);
});
