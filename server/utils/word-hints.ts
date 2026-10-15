import n5 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n5.json";
import n4 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n4.json";
import n3 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n3.json";
import n2 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n2.json";
import n1 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n1.json";
import {
  HintSource,
  hiragana,
  validReadings,
  type Candidate,
  type PromptPart,
} from "../../shared/practice";
import { kanaToRomaji } from "../../shared/romaji";
import lemmatize from "wink-lemmatizer";
import { referenceLexemes } from "./reference-lexemes";
import {
  sentencePhraseHints,
  referenceReading,
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

export const vocabulary = [...n5, ...n4, ...n3, ...n2, ...n1];

for (const entry of vocabulary) {
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
  const lexemes = referenceLexemes(candidate);
  const forms = new Map<string, { japanese: string; reading: string }[]>();
  const primaryReference = {
    ...candidate,
    furiganaVariants: validReadings(candidate).slice(0, 1),
  };
  const referenceForms = (entry: Entry) => {
    if (!forms.has(entry.word)) {
      const inflected = lexemes.filter((lexeme) => lexeme.lemma === entry.word);
      const readings = referenceReading(primaryReference, entry.word);
      forms.set(entry.word, [
        ...inflected,
        ...readings.map((reading) => ({ japanese: entry.word, reading })),
      ]);
    }
    return forms.get(entry.word)!;
  };
  const inReference = (entry: Entry) => referenceForms(entry).length > 0;
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
          const phraseInReference = phraseMatches.some(inReference);
          const individualInReference = words.some((word) =>
            lookup(word).some(inReference),
          );
          // A generic phrase must not hide words supplied by this sentence.
          if (
            !phraseInReference &&
            (matches.some(inReference) || individualInReference)
          )
            continue;
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
        hintSource: HintSource.Sentence,
      };
    const isWord = /^[\p{L}\p{N}]/u.test(text);
    const contextual = matches.filter(inReference);
    const sentenceMatched = contextual.length > 0;
    const sorted = (
      sentenceMatched ? contextual : matches.filter((entry) => entry.exact)
    ).sort(
      (a, b) =>
        Number(inReference(b)) - Number(inReference(a)) ||
        Number(b.exact) - Number(a.exact),
    );
    const seen = new Set<string>();
    const hints = sorted
      .flatMap((entry) => {
        const supplied = referenceForms(entry);
        const choices = supplied.length
          ? supplied
          : [{ japanese: entry.word, reading: entry.reading }];
        return choices.map((form) => ({
          japanese: form.japanese,
          reading: form.reading,
          romaji: kanaToRomaji(form.reading),
          meaning: entry.meaning,
        }));
      })
      .filter((hint) => {
        const key = `${hint.japanese}\0${hint.reading}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
    return {
      text,
      isWord,
      hints,
      // Presence in the reference validates the wording and pronunciation,
      // but does not establish the English meaning or occurrence alignment.
      ...(sentenceMatched ? { hintSource: HintSource.Reference } : {}),
    };
  });
}
