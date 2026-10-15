import raw from "../../data/processed/sentence-candidates.json";
import alternativeBank from "../../data/alternatives/answers.json";
import manifest from "../../data/manifest.json";
import spellingBank from "../../data/spelling-variants/bank.json";
import wordBoundaryBank from "../../data/romaji/word-boundaries.json";
import referenceLexemeBank from "../../data/romaji/reference-lexemes.json";
import sentenceLevelBank from "../../data/sentence-levels/bank.json";
import {
  verifiedSpellings,
  type SpellingBank,
  type SpellingDropReason,
} from "../../shared/writing-spellings";
import {
  acceptedAlternatives,
  type AlternativeBank,
  type AlternativeDropReason,
} from "../../shared/accepted-alternatives";
import { isLevel, type Candidate, type Level } from "../../shared/practice";
import {
  isNonEmpty,
  parseReadings,
  type ReadingBank,
  type ReferenceLexemeBank,
  type Sentence,
  type SentenceLevelBank,
  type WordBoundaryBank,
} from "../../shared/sentence";
import {
  phraseHintBank,
  phraseHintEntries,
  sentencePhraseHints,
  type PhraseHintBank,
  type PhraseHintDropReason,
} from "./sentence-phrase-hints";

export interface Banks {
  alternatives?: AlternativeBank;
  spellings?: SpellingBank;
  wordBoundaries?: WordBoundaryBank;
  referenceLexemes?: ReferenceLexemeBank;
  phraseHints?: PhraseHintBank;
  sentenceLevels?: SentenceLevelBank;
  revision?: string;
}

export const defaultBanks: Banks = {
  alternatives: alternativeBank as AlternativeBank,
  spellings: spellingBank as SpellingBank,
  wordBoundaries: wordBoundaryBank as WordBoundaryBank,
  referenceLexemes: referenceLexemeBank as ReferenceLexemeBank,
  phraseHints: phraseHintBank(phraseHintEntries),
  sentenceLevels: sentenceLevelBank as SentenceLevelBank,
  revision: manifest.revision,
};

// Generated data for one reading, only while the sentence ID, its source
// text, and the supplied furigana all still match.
function generated<T>(
  row: Candidate,
  furigana: string,
  bank: ReadingBank<T> | undefined,
): T | undefined {
  const entry = bank?.[row.id];
  if (!entry || entry.sourceJapanese !== row.japanese) return undefined;
  return Object.hasOwn(entry.readings, furigana)
    ? entry.readings[furigana]
    : undefined;
}

type LevelDropReason =
  | "stale-bank"
  | "stale-entry"
  | "invalid-level"
  | "missing";

// A sentence's level applies only while its source text still matches.
function sentenceLevel(
  row: Candidate,
  bank: SentenceLevelBank | undefined,
  revision: string,
  drop: (reason: LevelDropReason) => void,
): Level | null {
  if (!bank) return null;
  const entry = bank.entries[row.id];
  const reason: LevelDropReason | null =
    bank.version !== 1 || bank.sourceRevision !== revision
      ? "stale-bank"
      : !entry
        ? "missing"
        : entry.sourceJapanese !== row.japanese
          ? "stale-entry"
          : null;
  if (reason || !entry) {
    drop(reason ?? "missing");
    return null;
  }
  if (!isLevel(entry.level)) {
    drop("invalid-level");
    return null;
  }
  return entry.level;
}

// Bank records whose sentence did not load are never validated.
type OrphanReason = "sentence-dropped" | "unknown-sentence";

export interface LoadTally<Reason extends string> {
  loaded: number;
  dropped: Partial<Record<Reason, number>>;
}

// What validation kept and dropped: sentences and alternative records,
// spelling references, and phrase-hint entries.
export interface LoadReport {
  sentences: LoadTally<"no-valid-reading">;
  alternatives: LoadTally<AlternativeDropReason | OrphanReason>;
  spellings: LoadTally<SpellingDropReason | OrphanReason>;
  phraseHints: LoadTally<PhraseHintDropReason | OrphanReason>;
  levels: LoadTally<LevelDropReason>;
}

export function emptyLoadReport(): LoadReport {
  return {
    sentences: { loaded: 0, dropped: {} },
    alternatives: { loaded: 0, dropped: {} },
    spellings: { loaded: 0, dropped: {} },
    phraseHints: { loaded: 0, dropped: {} },
    levels: { loaded: 0, dropped: {} },
  };
}

function dropInto<Reason extends string>(tally: LoadTally<Reason>) {
  return (reason: Reason) => {
    tally.dropped[reason] = (tally.dropped[reason] ?? 0) + 1;
  };
}

export function droppedCount(tally: LoadTally<string>): number {
  return Object.values(tally.dropped).reduce<number>(
    (sum, count) => sum + (count ?? 0),
    0,
  );
}

// Validate and parse a stored record once; request handlers trust the result.
// Returns null when the reference has no usable reading.
export function loadSentence(
  row: Candidate,
  banks: Banks = {},
  report: LoadReport = emptyLoadReport(),
): Sentence | null {
  const readings = parseReadings(row.japanese, row.furiganaVariants).map(
    (reading) => {
      const wordBoundaries = generated(
        row,
        reading.furigana,
        banks.wordBoundaries,
      );
      const lexemes = generated(row, reading.furigana, banks.referenceLexemes);
      return {
        ...reading,
        ...(wordBoundaries && { wordBoundaries }),
        ...(lexemes && { lexemes }),
      };
    },
  );
  if (!isNonEmpty(readings)) {
    dropInto(report.sentences)("no-valid-reading");
    return null;
  }
  report.sentences.loaded++;
  const revision = banks.revision ?? manifest.revision;
  const level = sentenceLevel(
    row,
    banks.sentenceLevels,
    revision,
    dropInto(report.levels),
  );
  if (level) report.levels.loaded++;
  const alternatives = banks.alternatives
    ? acceptedAlternatives(
        row,
        banks.alternatives,
        revision,
        dropInto(report.alternatives),
      )
    : [];
  report.alternatives.loaded += alternatives.length;
  const renderings = [{ japanese: row.japanese, readings }, ...alternatives];
  const spellings = banks.spellings
    ? verifiedSpellings(
        row,
        renderings,
        banks.spellings,
        revision,
        dropInto(report.spellings),
      )
    : [];
  report.spellings.loaded += spellings.length;
  const spellingsFor = (japanese: string) =>
    spellings.filter((spelling) => spelling.japanese === japanese);
  const reference = {
    japanese: row.japanese,
    readings,
    spellings: spellingsFor(row.japanese),
  };
  const phraseEntry = banks.phraseHints?.[row.id];
  let phraseDropped = false;
  const phraseHints = sentencePhraseHints(
    { id: row.id, english: row.english, reference },
    phraseEntry,
    (reason) => {
      phraseDropped = true;
      dropInto(report.phraseHints)(reason);
    },
  );
  if (phraseEntry && !phraseDropped) report.phraseHints.loaded++;
  return {
    id: row.id,
    english: row.english,
    englishWordCount: row.englishWordCount,
    targetVocabulary: row.targetVocabulary,
    level,
    sourceUrl:
      row.sources.find((source) => source.tatoebaUrl)?.tatoebaUrl ?? null,
    reference,
    alternatives: alternatives.map((alternative) => ({
      ...alternative,
      spellings: spellingsFor(alternative.japanese),
    })),
    phraseHints,
  };
}

// Load every record and account for each one that validation dropped.
export function loadExercises(
  rows: Candidate[],
  banks: Banks = {},
): { exercises: Sentence[]; report: LoadReport } {
  const report = emptyLoadReport();
  const exercises = rows.flatMap((row) => {
    const sentence = loadSentence(row, banks, report);
    return sentence ? [sentence] : [];
  });
  const rowIds = new Set(rows.map((row) => row.id));
  const loaded = new Map(exercises.map((sentence) => [sentence.id, sentence]));
  const orphan = (id: string): OrphanReason | null =>
    loaded.has(id)
      ? null
      : rowIds.has(id)
        ? "sentence-dropped"
        : "unknown-sentence";
  for (const [id, entry] of Object.entries(banks.alternatives?.entries ?? {})) {
    const reason = orphan(id);
    if (reason)
      entry.alternatives.forEach(() => dropInto(report.alternatives)(reason));
  }
  for (const [id, entry] of Object.entries(banks.spellings?.entries ?? {})) {
    const reason = orphan(id);
    if (reason)
      entry.references.forEach(() => dropInto(report.spellings)(reason));
  }
  for (const id of Object.keys(banks.phraseHints ?? {})) {
    const reason = orphan(id);
    if (reason) dropInto(report.phraseHints)(reason);
  }
  return { exercises, report };
}

export function summarizeLoadReport(report: LoadReport): string {
  return (Object.keys(report) as (keyof LoadReport)[])
    .map((kind) => {
      const tally: LoadTally<string> = report[kind];
      const reasons = Object.entries(tally.dropped)
        .map(([reason, count]) => `${reason} ${count}`)
        .join(", ");
      return `${kind} ${tally.loaded} loaded, ${droppedCount(tally)} dropped${reasons ? ` (${reasons})` : ""}`;
    })
    .join("; ");
}

export const candidates = raw as Candidate[];
export const candidateById = new Map(candidates.map((row) => [row.id, row]));
const loaded = loadExercises(candidates, defaultBanks);
export const exercises = loaded.exercises;
export const loadReport = loaded.report;
export const exerciseById = new Map(exercises.map((row) => [row.id, row]));
