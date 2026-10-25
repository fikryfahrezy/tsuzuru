import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { numberAlternatives } from "../shared/number-alternatives";
import wordBoundaryBank from "../data/romaji/word-boundaries.json";
import referenceLexemeBank from "../data/romaji/reference-lexemes.json";
import { loadSentence } from "../server/utils/exercises";
import {
  finalPredicate,
  plainAllowed,
  withPolitenessForm,
} from "../server/utils/politeness-forms";
import raw from "../data/processed/sentence-candidates.json";
import manifest from "../data/manifest.json";
import {
  AlternativeMethod,
  normalize,
  Politeness,
  validReadings,
  type Candidate,
} from "../shared/practice";
import type { AlternativeBank } from "../shared/accepted-alternatives";
import type { ReferenceLexemeBank, WordBoundaryBank } from "../shared/sentence";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "data/alternatives");
await mkdir(output, { recursive: true });
const candidates = (raw as Candidate[]).filter(
  (candidate) => validReadings(candidate).length,
);

if (process.argv.includes("--prompts")) {
  const instructions =
    "Propose up to three natural Japanese translations preserving every detail of the English prompt: subject, action, object, negation, tense, time, frequency, location, and quantities. You may vary vocabulary, word order, politeness, and naturally implied subjects. Provide Japanese plus full furigana in {surface|reading} notation for every kanji, matching the Japanese text exactly. Preserve kana endings. Return JSON {sentenceId, alternatives:[{japanese,furiganaVariants:[annotatedText]}]}. Include provenance identifying the generator and the changes made.";
  await writeFile(
    resolve(output, "generation-prompts.jsonl"),
    candidates
      .map((candidate) =>
        JSON.stringify({
          sentenceId: candidate.id,
          sourceRevision: manifest.revision,
          sourceEnglish: candidate.english,
          sourceJapanese: candidate.japanese,
          instructions,
        }),
      )
      .join("\n") + "\n",
  );
  console.log(
    `Exported ${candidates.length} batch-generation tasks. No model was downloaded or invoked.`,
  );
} else {
  let existing: AlternativeBank | undefined;
  try {
    existing = JSON.parse(
      await readFile(resolve(output, "answers.json"), "utf8"),
    ) as AlternativeBank;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const authoredEntries = Object.entries(existing?.entries ?? {})
    .map(
      ([id, entry]) =>
        [
          id,
          {
            ...entry,
            alternatives: entry.alternatives.filter(
              (alternative) =>
                alternative.provenance.method === AlternativeMethod.Authored,
            ),
          },
        ] as const,
    )
    .filter(([, entry]) => entry.alternatives.length);
  const bank: AlternativeBank = {
    license: "CC-BY-SA-4.0",
    sourceRevision: manifest.revision,
    attribution:
      "Based on OpenJLPT, Tatoeba contributors, EDRDG, and Jonathan Waller. See DATA_DISCLOSURE.md and the retained upstream NOTICE.md.",
    changes:
      "Tsuzuru generates alternatives by omitting explicit first-person topics, varying integer spellings, and switching the sentence-final predicate between plain and polite forms, and includes Codex-authored wording. These are additions, not original Tatoeba translations or endorsements; they are not independently checked by native speakers.",
    entries: {},
  };
  for (const candidate of candidates) {
    if (
      !candidate.japanese.startsWith("私は") ||
      !/^I(?:[ '’]|$)/u.test(candidate.english)
    )
      continue;
    const japanese = candidate.japanese.slice(2);
    const furiganaVariants = validReadings(candidate)
      .filter((reading) => /^\{私\|[^{}|]+\}は/u.test(reading))
      .map((reading) => reading.replace(/^\{私\|[^{}|]+\}は/u, ""));
    if (
      !japanese.trim() ||
      !validReadings({ ...candidate, japanese, furiganaVariants }).length
    )
      continue;
    bank.entries[candidate.id] = {
      sourceEnglish: candidate.english,
      sourceJapanese: candidate.japanese,
      alternatives: [
        {
          japanese,
          furiganaVariants,
          provenance: {
            creator: "Tsuzuru generation script",
            method: AlternativeMethod.OmitFirstPersonTopic,
            note: "Generated from the original Japanese reference by removing 私は. The first-person subject is implied by the English prompt; all remaining wording and readings are retained.",
          },
        },
      ],
    };
  }
  if (authoredEntries.length && existing?.sourceRevision !== manifest.revision)
    throw new Error(
      "Authored alternatives refer to a different source revision.",
    );
  for (const [id, entry] of authoredEntries) {
    const candidate = candidates.find((row) => row.id === id);
    if (
      !candidate ||
      candidate.english !== entry.sourceEnglish ||
      candidate.japanese !== entry.sourceJapanese
    )
      throw new Error(`Authored alternative source mismatch: ${id}`);
    for (const alternative of entry.alternatives) {
      if (!validReadings({ ...candidate, ...alternative }).length)
        throw new Error(`Invalid authored reading: ${id}`);
      const target = (bank.entries[id] ??= { ...entry, alternatives: [] });
      if (
        !target.alternatives.some(
          (row) => row.japanese === alternative.japanese,
        )
      )
        target.alternatives.push(alternative);
    }
  }
  // Plain and polite endings say the same thing; keigo is never derived.
  for (const candidate of candidates) {
    const sentence = loadSentence(candidate, {
      wordBoundaries: wordBoundaryBank as WordBoundaryBank,
      referenceLexemes: referenceLexemeBank as ReferenceLexemeBank,
      revision: manifest.revision,
    });
    const predicate = sentence && finalPredicate(sentence);
    if (!predicate) continue;
    const current = predicate.forms.find((form) => form.current)!;
    const after = candidate.japanese.slice(predicate.end);
    const bases = [
      candidate,
      ...(bank.entries[candidate.id]?.alternatives ?? []),
    ];
    for (const form of predicate.forms) {
      if (
        form.current ||
        (form.politeness === Politeness.Plain &&
          current.politeness === Politeness.Polite &&
          !plainAllowed(sentence, predicate))
      )
        continue;
      for (const base of bases) {
        const alternative = withPolitenessForm(base, current, form, after);
        if (
          !alternative ||
          !validReadings({ ...candidate, ...alternative }).length
        )
          continue;
        const target = (bank.entries[candidate.id] ??= {
          sourceEnglish: candidate.english,
          sourceJapanese: candidate.japanese,
          alternatives: [],
        });
        if (
          normalize(alternative.japanese) === normalize(candidate.japanese) ||
          target.alternatives.some(
            (row) =>
              normalize(row.japanese) === normalize(alternative.japanese),
          )
        )
          continue;
        target.alternatives.push({
          ...alternative,
          provenance: {
            creator: "Tsuzuru generation script",
            method: AlternativeMethod.PolitenessForm,
            note: `Generated by changing the sentence-final ${current.japanese} to the ${form.politeness} form ${form.japanese}, with the same tense and negation. Readings are retained.${base.japanese !== candidate.japanese ? " Based on another listed alternative: " + base.japanese : " Based on the original Japanese reference."}`,
          },
        });
      }
    }
  }
  for (const candidate of candidates) {
    const existing = bank.entries[candidate.id]?.alternatives ?? [];
    const bases = [
      candidate,
      ...existing.map((alternative) => ({ ...candidate, ...alternative })),
    ];
    for (const base of bases) {
      for (const alternative of numberAlternatives(base)) {
        const target = (bank.entries[candidate.id] ??= {
          sourceEnglish: candidate.english,
          sourceJapanese: candidate.japanese,
          alternatives: [],
        });
        if (
          normalize(alternative.japanese) === normalize(candidate.japanese) ||
          target.alternatives.some(
            (row) =>
              normalize(row.japanese) === normalize(alternative.japanese),
          )
        )
          continue;
        target.alternatives.push({
          ...alternative,
          provenance: {
            creator: "Tsuzuru generation script",
            method: AlternativeMethod.NumberSpelling,
            note: `Generated by changing integer spelling without changing its value. Supplied readings are retained, including digits where the source has no pronunciation annotation.${base.japanese !== candidate.japanese ? " Based on another listed alternative: " + base.japanese : " Based on the original Japanese reference."}`,
          },
        });
      }
    }
  }
  // Sort by sentence ID so the output depends only on its inputs, not on
  // the order of the previous file that authored entries are read from.
  bank.entries = Object.fromEntries(
    Object.entries(bank.entries).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    ),
  );
  const content = JSON.stringify(bank, null, 2) + "\n";
  const path = resolve(output, "answers.json");
  if (process.argv.includes("--check")) {
    if ((await readFile(path, "utf8").catch(() => "")) !== content) {
      console.error(
        "Alternative answers are stale; run alternatives:generate.",
      );
      process.exit(1);
    }
  } else await writeFile(path, content);
  const count = Object.values(bank.entries).reduce(
    (sum, entry) => sum + entry.alternatives.length,
    0,
  );
  console.log(
    `Generated ${count} active alternatives for ${Object.keys(bank.entries).length} sentences. No model was downloaded or invoked.`,
  );
}
