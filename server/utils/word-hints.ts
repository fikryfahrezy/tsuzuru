import n5 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n5.json";
import n4 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n4.json";
import n3 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n3.json";
import n2 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n2.json";
import n1 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/vocab/n1.json";
import glossary from "../../data/hint-glossary/bank.json";
import {
  HintSource,
  hiragana,
  type PromptPart,
  type VocabularyHint,
} from "../../shared/practice";
import { kanaToRomaji } from "../../shared/romaji";
import {
  primaryReading,
  primaryRendering,
  type Sentence,
} from "../../shared/sentence";
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
  referenceOnly?: boolean;
  pronoun?: boolean;
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

const extraSenses: Record<
  string,
  { word: string; reading: string; meanings: string[] }
> = glossary.entries;

for (const entry of vocabulary) {
  const extra = extraSenses[entry.id];
  const meanings = [
    ...entry.meanings.map((meaning) => ({ meaning, referenceOnly: false })),
    ...(extra?.word === entry.word && extra.reading === entry.reading
      ? extra.meanings.map((meaning) => ({ meaning, referenceOnly: true }))
      : []),
  ];
  for (const { meaning, referenceOnly } of meanings) {
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
      referenceOnly,
      pronoun: entry.pos?.includes("pn"),
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
      // Extra senses must match a complete gloss, not incidental words in a
      // definition such as "I think" in a quotation particle's explanation.
      if (referenceOnly && !vocabulary.exact) continue;
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
  const subjectPronoun = (
    { me: "i", him: "he", her: "she", us: "we", them: "they" } as Record<
      string,
      string
    >
  )[term];
  return [
    ...(index.get(term) ?? []),
    ...(verb === term
      ? []
      : (index.get(verb) ?? []).filter((entry) => entry.verb)),
    ...(noun === term
      ? []
      : (index.get(noun) ?? []).filter((entry) => !entry.verb)),
    // Japanese pronouns retain their lexical form in object position. Require
    // a pronoun entry and reference support rather than guessing from English.
    ...(subjectPronoun
      ? (index.get(subjectPronoun) ?? [])
          .filter((entry) => entry.pronoun)
          .map((entry) => ({ ...entry, referenceOnly: true }))
      : []),
    // English spatial prepositions can correspond to Japanese nouns. These
    // dictionary paraphrases apply across sentences, only with reference support.
    ...(term === "across"
      ? ["other side", "opposite side"].flatMap((phrase) =>
          (phraseIndex.get(phrase) ?? []).map((entry) => ({
            ...entry,
            referenceOnly: true,
          })),
        )
      : []),
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

function hintSpellings(sentence: Sentence, hint: VocabularyHint): string[] {
  const { reference } = sentence;
  const primary = primaryReading(reference).furigana;
  const primaryReference = primaryRendering(reference);
  const variants = new Set<string>();
  for (const spelling of reference.spellings) {
    if (spelling.furigana !== primary) continue;
    for (
      let start = reference.japanese.indexOf(hint.japanese);
      start !== -1;
      start = reference.japanese.indexOf(hint.japanese, start + 1)
    ) {
      if (
        !referenceReading(primaryReference, hint.japanese, start).includes(
          hint.reading,
        )
      )
        continue;
      const end = start + hint.japanese.length;
      for (const span of spelling.spans) {
        if (span.start < start || span.end > end) continue;
        for (const spelling of span.spellings) {
          const word =
            hint.japanese.slice(0, span.start - start) +
            spelling +
            hint.japanese.slice(span.end - start);
          if (word !== hint.japanese) variants.add(word);
        }
      }
    }
  }
  return [...variants].slice(0, 3);
}

export function wordHints(sentence: Sentence): PromptPart[] {
  const lexemes = referenceLexemes(sentence);
  const forms = new Map<string, { japanese: string; reading: string }[]>();
  const primaryReference = primaryRendering(sentence.reference);
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
    sentence.english.match(
      /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu,
    ) ?? [];
  const grouped: {
    text: string;
    matches: Entry[];
    annotation?: SentencePhraseSpan;
  }[] = [];
  const annotations = sentencePhraseHints(sentence);
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
          if (
            !phraseInReference &&
            phraseMatches.every((entry) => entry.referenceOnly)
          )
            continue;
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
  const prompt: PromptPart[] = grouped.map(({ text, matches, annotation }) => {
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
      sentenceMatched
        ? contextual
        : matches.filter((entry) => entry.exact && !entry.referenceOnly)
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
  return prompt.map((part) => ({
    ...part,
    hints: part.hints.map((hint) => {
      // Only expose spellings already verified for the primary reference and
      // its supplied pronunciation; dictionary fallback hints stay unchanged.
      const spellings = part.hintSource ? hintSpellings(sentence, hint) : [];
      return spellings.length ? { ...hint, spellings } : hint;
    }),
  }));
}
