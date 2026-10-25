import { describe, expect, test } from "bun:test";
import alternativeBank from "../data/alternatives/answers.json";
import spellingBank from "../data/spelling-variants/bank.json";
import {
  AlternativeDropReason,
  type AlternativeBank,
} from "../shared/accepted-alternatives";
import {
  SpellingDropReason,
  type SpellingBank,
} from "../shared/writing-spellings";
import {
  PhraseHintDropReason,
  phraseHintBank,
  phraseHintEntries,
} from "../server/utils/sentence-phrase-hints";
import {
  candidates,
  defaultBanks,
  droppedCount,
  LevelDropReason,
  loadExercises,
  loadReport,
  OrphanReason,
  SentenceDropReason,
  type LoadReport,
} from "../server/utils/exercises";

// Raise a ceiling only when a generator change is meant to drop records;
// lower a floor only when a bank is meant to shrink.
const limits: Record<
  keyof LoadReport,
  { minLoaded: number; maxDropped: number }
> = {
  sentences: { minLoaded: 10312, maxDropped: 2303 },
  alternatives: { minLoaded: 11058, maxDropped: 0 },
  spellings: { minLoaded: 3491, maxDropped: 0 },
  phraseHints: { minLoaded: 20, maxDropped: 0 },
  levels: { minLoaded: 10312, maxDropped: 0 },
};

function violations(report: LoadReport): string[] {
  return (Object.keys(limits) as (keyof LoadReport)[]).flatMap((kind) => {
    const { minLoaded, maxDropped } = limits[kind];
    const tally = report[kind];
    return [
      ...(tally.loaded < minLoaded
        ? [`${kind}: ${tally.loaded} loaded, expected at least ${minLoaded}`]
        : []),
      ...(droppedCount(tally) > maxDropped
        ? [
            `${kind}: ${droppedCount(tally)} dropped, expected at most ${maxDropped} ${JSON.stringify(tally.dropped)}`,
          ]
        : []),
    ];
  });
}

test("bundled banks stay within their drop budgets", () => {
  expect(violations(loadReport)).toEqual([]);
  expect(Object.keys(loadReport.sentences.dropped)).toEqual([
    SentenceDropReason.NoValidReading,
  ]);
});

describe("corrupting one bank record breaks the budget", () => {
  const load = (banks = defaultBanks) =>
    loadExercises(candidates, banks).report;

  test("alternative with an invalid reading", () => {
    const bank = structuredClone(alternativeBank) as AlternativeBank;
    const entry = Object.values(bank.entries)[0]!;
    entry.alternatives[0]!.furiganaVariants = ["{漢|かん}"];
    const report = load({ ...defaultBanks, alternatives: bank });
    expect(report.alternatives.dropped).toEqual({
      [AlternativeDropReason.NoValidReading]: 1,
    });
    expect(violations(report)).not.toEqual([]);
  });

  test("spelling reference that no longer matches its sentence", () => {
    const bank = structuredClone(spellingBank) as SpellingBank;
    const entry = Object.values(bank.entries)[0]!;
    entry.sourceJapanese += "！";
    const report = load({ ...defaultBanks, spellings: bank });
    expect(report.spellings.dropped).toEqual({
      [SpellingDropReason.StaleEntry]: entry.references.length,
    });
    expect(violations(report)).not.toEqual([]);
  });

  test("spelling entry for a sentence that is not in the dataset", () => {
    const bank = structuredClone(spellingBank) as SpellingBank;
    const [id, entry] = Object.entries(bank.entries)[0]!;
    delete bank.entries[id];
    bank.entries["missing"] = entry;
    const report = load({ ...defaultBanks, spellings: bank });
    expect(report.spellings.dropped).toEqual({
      [OrphanReason.UnknownSentence]: entry.references.length,
    });
  });

  test("phrase hint with an unsupplied reading", () => {
    const entries = structuredClone(
      phraseHintEntries,
    ) as typeof phraseHintEntries;
    entries[0]!.phrases[0]!.hints[0]!.reading = "ちがう";
    const report = load({
      ...defaultBanks,
      phraseHints: phraseHintBank(entries),
    });
    expect(report.phraseHints.dropped).toEqual({
      [PhraseHintDropReason.UnverifiedHint]: 1,
    });
    expect(violations(report)).not.toEqual([]);
  });

  test("sentence level whose source text changed", () => {
    const bank = structuredClone(defaultBanks.sentenceLevels!);
    const id = "0000978f3525f2d6e60e600b";
    bank.entries[id]!.sourceJapanese += "！";
    const report = load({ ...defaultBanks, sentenceLevels: bank });
    expect(report.levels.dropped).toEqual({
      [LevelDropReason.StaleEntry]: 1,
    });
    expect(violations(report)).not.toEqual([]);
  });

  test("malformed and duplicate sentence rows", () => {
    const [first, second] = candidates;
    const rows: unknown[] = [
      first,
      { ...first },
      { ...second, furiganaVariants: "not a list" },
      null,
    ];
    const { exercises, report } = loadExercises(rows, defaultBanks);
    expect(exercises.map((sentence) => sentence.id)).toEqual([first!.id]);
    expect(report.sentences.dropped).toEqual({
      [SentenceDropReason.DuplicateId]: 1,
      [SentenceDropReason.Malformed]: 2,
    });
  });
});
