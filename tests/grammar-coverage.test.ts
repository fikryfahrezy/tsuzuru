import { expect, test } from "bun:test";
import { checkRegression } from "../scripts/audit-grammar";
import regressions from "../data/grammar-coverage/regressions.json";
import report from "../data/grammar-coverage/report.json";
import { grammarEntries } from "../server/utils/grammar-reference";
import { baseAnswerEntries } from "../server/utils/answer-entries";
import { withBreakdownGrammar } from "../server/utils/breakdown-grammar";
import { exerciseById } from "../server/utils/exercises";

for (const regression of regressions) {
  test(`reviewed corpus ${regression.expect}: ${regression.lessonId} / ${regression.sentenceId}`, () => {
    const sentence = exerciseById.get(regression.sentenceId)!;
    const base = baseAnswerEntries(sentence);
    const explanations = withBreakdownGrammar(sentence, base, base).flatMap(
      (part) => part.grammar ?? [],
    );
    expect(checkRegression(regression, explanations), regression.note).toBe(
      true,
    );
  });
}

test("inventory covers each library lesson exactly once and keeps rule presence separate from observations", () => {
  expect(report.entries.map((entry) => entry.id).sort()).toEqual(
    grammarEntries.map((entry) => entry.id).sort(),
  );
  expect(new Set(report.entries.map((entry) => entry.id)).size).toBe(
    grammarEntries.length,
  );
  for (const entry of report.entries) {
    if (entry.automatic.occurrences) {
      expect(entry.ruleReferences.length, entry.id).toBeGreaterThan(0);
      expect(entry.status, entry.id).toBe("automatic");
    }
    if (entry.status === "annotation-only") {
      expect(entry.ruleReferences, entry.id).toEqual([]);
      expect(entry.annotations.occurrences, entry.id).toBeGreaterThan(0);
    }
    if (entry.status === "unsupported") {
      expect(entry.ruleReferences, entry.id).toEqual([]);
      expect(entry.annotations.occurrences, entry.id).toBe(0);
    }
  }
});

test("corpus checks reject stale snapshots and matches at the wrong occurrence", () => {
  const regression = regressions[0]!;
  expect(() =>
    checkRegression({ ...regression, japanese: "not this sentence" }, []),
  ).toThrow("snapshot");
  const sentence = exerciseById.get(regression.sentenceId)!;
  const base = baseAnswerEntries(sentence);
  const explanation = withBreakdownGrammar(sentence, base, base)
    .flatMap((part) => part.grammar ?? [])
    .find((g) => g.id === regression.lessonId)!;
  expect(explanation).toBeDefined();
  const end = sentence.reference.japanese.length;
  expect(
    checkRegression(regression, [{ ...explanation, start: end, end: end + 1 }]),
  ).toBe(false);
});
