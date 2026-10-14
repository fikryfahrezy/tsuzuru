import n5 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n5.json";
import n4 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n4.json";
import n3 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n3.json";
import n2 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n2.json";
import n1 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n1.json";
import {
  hiragana,
  parts,
  validReadings,
  type Candidate,
  type PromptPart,
} from "../../shared/practice";
import { kanaToRomaji } from "../../shared/romaji";

interface Entry {
  word: string;
  reading: string;
  meaning: string;
  exact: boolean;
}
const index = new Map<string, Entry[]>();
// These gloss words usually describe grammar, rather than a standalone translation.
const functionWords = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "at",
  "by",
  "with",
  "for",
  "from",
  "as",
]);
function englishWords(text: string): string[] {
  return (
    text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  );
}
for (const entry of [...n5, ...n4, ...n3, ...n2, ...n1]) {
  for (const meaning of entry.meanings) {
    const clean = meaning
      .replace(/\([^)]*\)/gu, "")
      .replace(/^to\s+/iu, "")
      .trim();
    const terms = englishWords(clean);
    for (const term of new Set(terms)) {
      if (functionWords.has(term)) continue;
      const matches = index.get(term) ?? [];
      matches.push({
        word: entry.word,
        reading: hiragana(entry.reading.normalize("NFKC")),
        meaning,
        exact: terms.length === 1,
      });
      index.set(term, matches);
    }
  }
}

function lookup(word: string): Entry[] {
  const term = word.toLowerCase().replaceAll("’", "'");
  // Fall back only to dictionary-backed base forms, preserving the displayed word.
  const bases = term.endsWith("ies")
    ? [term.slice(0, -3) + "y"]
    : term.endsWith("ing")
      ? [term.slice(0, -3), term.slice(0, -3) + "e"]
      : term.endsWith("ed")
        ? [term.slice(0, -2), term.slice(0, -1)]
        : term.endsWith("s")
          ? [term.slice(0, -1), term.slice(0, -2)]
          : [];
  return [
    ...(index.get(term) ?? []),
    ...bases.flatMap((base) => index.get(base) ?? []),
  ];
}

export function wordHints(candidate: Candidate): PromptPart[] {
  const annotatedWords = new Set(
    validReadings(candidate).flatMap((reading) =>
      parts(reading)
        .filter((part) => part.surface !== part.reading)
        .map((part) => part.surface),
    ),
  );
  return (
    candidate.english.match(
      /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu,
    ) ?? []
  ).map((text) => {
    const isWord = /^[\p{L}\p{N}]/u.test(text);
    const matches = isWord ? lookup(text) : [];
    const inReference = (entry: Entry) =>
      annotatedWords.has(entry.word) || candidate.japanese.includes(entry.word);
    const sorted = matches
      .filter((entry) => entry.exact || inReference(entry))
      .sort(
        (a, b) =>
          Number(inReference(b)) - Number(inReference(a)) ||
          Number(b.exact) - Number(a.exact),
      );
    const seen = new Set<string>();
    const hints = sorted
      .filter((entry) => {
        if (seen.has(entry.word)) return false;
        seen.add(entry.word);
        return true;
      })
      .slice(0, 3)
      .map((entry) => ({
        japanese: entry.word,
        reading: entry.reading,
        romaji: kanaToRomaji(entry.reading),
        meaning: entry.meaning,
      }));
    return { text, isWord, hints };
  });
}
