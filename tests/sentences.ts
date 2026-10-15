import manifest from "../data/manifest.json";
import type { AlternativeRecord } from "../shared/accepted-alternatives";
import type { Candidate } from "../shared/practice";
import type { Sentence } from "../shared/sentence";
import { loadSentence, type Banks } from "../server/utils/exercises";

const blank: Candidate = {
  id: "test",
  english: "",
  japanese: "",
  furiganaVariants: [],
  englishWordCount: 0,
  targetVocabulary: [],
  sources: [],
};

// Load a test record through the same validation as the dataset.
export function sentence(row: Partial<Candidate>, banks: Banks = {}): Sentence {
  const loaded = loadSentence({ ...blank, ...row }, banks);
  if (!loaded) throw new Error(`Test sentence has no valid reading: ${row.id}`);
  return loaded;
}

// Attach alternatives through an alternatives bank, as the dataset does.
export function withAlternatives(
  row: Candidate,
  alternatives: AlternativeRecord[],
): Sentence {
  return sentence(row, {
    revision: manifest.revision,
    alternatives: {
      license: "CC-BY-SA-4.0",
      sourceRevision: manifest.revision,
      attribution: "",
      changes: "",
      entries: {
        [row.id]: {
          sourceEnglish: row.english,
          sourceJapanese: row.japanese,
          alternatives,
        },
      },
    },
  });
}
