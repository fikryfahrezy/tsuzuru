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
import lemmatize from "wink-lemmatizer";
import {
  sentencePhraseHints,
  type SentencePhraseSpan,
} from "./sentence-phrase-hints";

interface Entry {
  word: string;
  reading: string;
  meaning: string;
  exact: boolean;
  verb: boolean;
}
const index = new Map<string, Entry[]>();
const phraseIndex = new Map<string, Entry[]>();
let longestPhrase = 1;
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
    const vocabulary = {
      word: entry.word,
      reading: hiragana(entry.reading.normalize("NFKC")),
      meaning,
      exact: terms.length === 1,
      verb: /^to\s+/iu.test(meaning),
    };
    // Only join whitespace-separated words, never clauses or punctuation.
    if (
      terms.length > 1 &&
      terms.join(" ") === clean.toLowerCase().replace(/\s+/gu, " ")
    ) {
      const phrase = terms.join(" ");
      const matches = phraseIndex.get(phrase) ?? [];
      matches.push({ ...vocabulary, exact: true });
      phraseIndex.set(phrase, matches);
      longestPhrase = Math.max(longestPhrase, terms.length);
    }
    for (const term of new Set(terms)) {
      if (functionWords.has(term)) continue;
      const matches = index.get(term) ?? [];
      matches.push(vocabulary);
      index.set(term, matches);
    }
  }
}

function lookup(word: string): Entry[] {
  const term = word.toLowerCase().replaceAll("’", "'");
  const verb = lemmatize.verb(term);
  const noun = lemmatize.noun(term);
  return [
    ...(index.get(term) ?? []),
    ...(verb === term
      ? []
      : (index.get(verb) ?? []).filter((entry) => entry.verb)),
    ...(noun === term
      ? []
      : (index.get(noun) ?? []).filter((entry) => !entry.verb)),
  ];
}

function lookupPhrase(words: string[]): Entry[] {
  const terms = words.map((word) => word.toLowerCase().replaceAll("’", "'"));
  return [
    ...(phraseIndex.get(terms.join(" ")) ?? []),
    ...(
      phraseIndex.get(
        [lemmatize.verb(terms[0]!), ...terms.slice(1)].join(" "),
      ) ?? []
    ).filter((entry) => entry.verb),
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
  const tokens =
    candidate.english.match(
      /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu,
    ) ?? [];
  const grouped: {
    text: string;
    matches: Entry[];
    annotation?: SentencePhraseSpan;
  }[] = [];
  const annotations = sentencePhraseHints(candidate);
  // Character positions keep explicit phrase spans aligned with the original prompt.
  const offsets: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    offsets.push(offset);
    offset += token.length;
  }
  for (let start = 0; start < tokens.length; start++) {
    const annotation = annotations.find(
      (span) => span.start === offsets[start],
    );
    if (annotation) {
      grouped.push({ text: annotation.text, matches: [], annotation });
      while (start + 1 < tokens.length && offsets[start + 1]! < annotation.end)
        start++;
      continue;
    }
    const text = tokens[start]!;
    let end = start;
    let matches = /^[\p{L}\p{N}]/u.test(text) ? lookup(text) : [];
    if (/^[\p{L}\p{N}]/u.test(text)) {
      const words = [text];
      for (
        let cursor = start + 2;
        cursor < tokens.length && words.length < longestPhrase;
        cursor += 2
      ) {
        if (
          !/^\s+$/u.test(tokens[cursor - 1]!) ||
          !/^[\p{L}\p{N}]/u.test(tokens[cursor]!)
        )
          break;
        words.push(tokens[cursor]!);
        if (
          annotations.some(
            (span) =>
              span.start < offsets[cursor]! + tokens[cursor]!.length &&
              span.end > offsets[start]!,
          )
        )
          break;
        const phraseMatches = lookupPhrase(words);
        if (phraseMatches.length) {
          end = cursor;
          matches = phraseMatches;
        }
      }
    }
    grouped.push({ text: tokens.slice(start, end + 1).join(""), matches });
    start = end;
  }
  return grouped.map(({ text, matches, annotation }) => {
    if (annotation)
      return {
        text,
        isWord: true,
        hints: annotation.hints,
        phrase: annotation.phrase,
        hintSource: "sentence" as const,
      };
    const isWord = /^[\p{L}\p{N}]/u.test(text);
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
